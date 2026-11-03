"""Authenticated, owner-scoped sources, records and private JPG/PNG uploads."""
import hashlib
import io
import math
import os
import uuid
import warnings
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from PIL import Image, UnidentifiedImageError
from sqlalchemy.exc import SQLAlchemyError
from app.db import SessionLocal
from app.collection import SourceArchive, CollectionRecord, storage_root
from app.routers.auth import require_current_user_id

router = APIRouter(prefix='/api/collection', tags=['collection'])
MAX_PHOTO_BYTES = 8 * 1024 * 1024

class CollectionBodyLimit:
    """Bound collection input while receiving; unrelated APIs keep their existing behavior."""
    def __init__(self, app): self.app = app
    async def __call__(self, scope, receive, send):
        if scope['type'] != 'http' or not scope.get('path', '').startswith('/api/collection/') or scope.get('method') not in {'POST', 'PATCH'}:
            return await self.app(scope, receive, send)
        from starlette.responses import JSONResponse
        maximum = 9 * 1024 * 1024 if scope['path'] == '/api/collection/records' else 64 * 1024
        declared = dict(scope.get('headers', [])).get(b'content-length')
        if declared is not None:
            try: size = int(declared)
            except ValueError: size = -1
            if size < 0 or size > maximum:
                return await JSONResponse({'detail':'采集请求过大或长度无效'}, status_code=413)(scope, receive, send)
        count = 0
        async def bounded_receive():
            nonlocal count
            message = await receive()
            count += len(message.get('body', b''))
            if count > maximum: raise HTTPException(413, '采集请求超过大小限制')
            return message
        await self.app(scope, bounded_receive, send)

def database():
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError:
        db.rollback()
        raise HTTPException(503, '采集存储未就绪，请联系管理员完成独立建表配置') from None
    finally:
        db.close()

class SourceInput(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    origin: str = Field(min_length=1, max_length=2000)
    authorization: str = Field(min_length=1, max_length=2000)
    is_sample: bool = False

class ReviewInput(BaseModel):
    status: str = Field(pattern='^(pending|verified)$')
    note: str = Field(min_length=1, max_length=2000)

def serialize_source(row):
    return {key: getattr(row, key) for key in ['id', 'name', 'origin', 'authorization', 'is_sample', 'status', 'verification_note']}

def owned(db, cls, identifier, uid):
    row = db.query(cls).filter(cls.id == identifier, cls.user_id == uid).first()
    if row is None:
        raise HTTPException(404, '记录不存在或无权访问')
    return row

@router.get('/sources')
def sources(uid: int = Depends(require_current_user_id), db=Depends(database)):
    return {'items': [serialize_source(x) for x in db.query(SourceArchive).filter_by(user_id=uid).order_by(SourceArchive.id.desc()).limit(500)]}

@router.post('/sources', status_code=201)
def create_source(body: SourceInput, uid: int = Depends(require_current_user_id), db=Depends(database)):
    if any(not value.strip() for value in [body.name, body.origin, body.authorization]):
        raise HTTPException(422, '来源名称、原始来源和授权说明不能为空')
    row = SourceArchive(user_id=uid, **body.model_dump())
    db.add(row); db.commit(); db.refresh(row)
    return serialize_source(row)

@router.patch('/sources/{identifier}')
def review_source(identifier: int, body: ReviewInput, uid: int = Depends(require_current_user_id), db=Depends(database)):
    if not body.note.strip():
        raise HTTPException(422, '请填写核验说明')
    row = owned(db, SourceArchive, identifier, uid)
    row.status = body.status; row.verification_note = body.note.strip(); row.updated_at = datetime.now(timezone.utc)
    db.commit()
    return serialize_source(row)

@router.get('/records')
def records(offset: int = 0, limit: int = 20, uid: int = Depends(require_current_user_id), db=Depends(database)):
    if offset < 0 or not 1 <= limit <= 100:
        raise HTTPException(422, '分页参数无效')
    query = db.query(CollectionRecord).filter_by(user_id=uid)
    items = []
    for row in query.order_by(CollectionRecord.id.desc()).offset(offset).limit(limit):
        item = {key: getattr(row, key) for key in ['id', 'code', 'kind', 'source_id', 'nature', 'longitude', 'latitude', 'note', 'photo_name', 'photo_sha256']}
        item['captured_at'] = row.captured_at.replace(tzinfo=timezone.utc).isoformat() if row.captured_at.tzinfo is None else row.captured_at.isoformat()
        item['photo_url'] = f'/api/collection/records/{row.id}/photo' if row.photo_key else None
        items.append(item)
    return {'items': items, 'total': query.count(), 'offset': offset, 'limit': limit}

@router.post('/records', status_code=201)
async def create_record(source_id: int = Form(...), kind: str = Form(...), captured_at: str = Form(...),
                        nature: str = Form('user_upload'), longitude: Optional[float] = Form(None),
                        latitude: Optional[float] = Form(None), note: str = Form(''), photo_name: str = Form(''),
                        photo: Optional[UploadFile] = File(None), uid: int = Depends(require_current_user_id), db=Depends(database)):
    source = owned(db, SourceArchive, source_id, uid)
    if kind not in {'photo', 'location', 'document'} or nature not in {'sample', 'user_upload', 'field_declared'}:
        raise HTTPException(422, '采集类型或数据性质无效')
    if len(note) > 2000 or len(photo_name) > 160:
        raise HTTPException(422, '说明或照片名称过长')
    if (longitude is None) != (latitude is None) or (longitude is not None and
       (not math.isfinite(longitude) or not math.isfinite(latitude) or abs(longitude) > 180 or abs(latitude) > 90)):
        raise HTTPException(422, '经纬度必须成对填写且在有效范围内')
    if kind == 'location' and longitude is None:
        raise HTTPException(422, '位置记录需要经纬度')
    try:
        date = datetime.fromisoformat(captured_at.replace('Z', '+00:00'))
        if date.tzinfo is None: raise ValueError()
        date = date.astimezone(timezone.utc)
    except (ValueError, TypeError):
        raise HTTPException(422, '采集时间须为带时区的有效日期') from None
    if kind == 'photo' and photo is None:
        raise HTTPException(422, '照片采集需要上传JPG或PNG')
    content = None; mime = None; suffix = None
    if photo is not None:
        content = await photo.read(MAX_PHOTO_BYTES + 1)
        if not content or len(content) > MAX_PHOTO_BYTES:
            raise HTTPException(413, '照片为空或超过8MB')
        try:
            with warnings.catch_warnings():
                warnings.simplefilter('error', Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(content)) as image:
                    if image.format not in {'JPEG', 'PNG'} or image.width * image.height > 20000000:
                        raise ValueError()
                    suffix = 'jpg' if image.format == 'JPEG' else 'png'
                    mime = 'image/jpeg' if suffix == 'jpg' else 'image/png'
                    image.verify()
            if photo.content_type != mime:
                raise ValueError()
        except (ValueError, OSError, UnidentifiedImageError, Image.DecompressionBombWarning, Image.DecompressionBombError):
            raise HTTPException(422, '文件须为有效的JPG/PNG图片，且不超过2000万像素') from None
    row = CollectionRecord(user_id=uid, source_id=source_id, kind=kind, captured_at=date, nature='sample' if source.is_sample else nature,
                           longitude=longitude, latitude=latitude, note=note, code='COL-' + uuid.uuid4().hex[:20])
    path = None
    try:
        if content is not None:
            folder = storage_root() / str(uid); folder.mkdir(parents=True, exist_ok=True, mode=0o700)
            key = str(uid) + '/' + uuid.uuid4().hex + '.' + suffix
            path = storage_root() / key
            with path.open('xb') as handle: handle.write(content)
            os.chmod(path, 0o600)
            row.photo_key = key; row.photo_name = photo_name.strip() or '上传照片.' + suffix
            row.photo_mime = mime; row.photo_sha256 = hashlib.sha256(content).hexdigest()
        db.add(row); db.commit(); db.refresh(row)
    except Exception:
        db.rollback()
        if path is not None: path.unlink(missing_ok=True)
        raise
    return {'id': row.id, 'code': row.code}

@router.get('/records/{identifier}/photo')
def read_photo(identifier: int, uid: int = Depends(require_current_user_id), db=Depends(database)):
    row = owned(db, CollectionRecord, identifier, uid)
    if not row.photo_key: raise HTTPException(404, '记录无照片')
    root = storage_root(); path = (root / row.photo_key).resolve()
    if root not in path.parents or not path.is_file(): raise HTTPException(404, '照片文件不可用')
    return FileResponse(path, media_type=row.photo_mime, headers={'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Disposition':'inline'})
