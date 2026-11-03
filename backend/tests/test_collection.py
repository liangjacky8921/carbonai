"""Synthetic, private collection persistence tests; no real accounts, photos or network."""
import os
import unittest
if os.getenv('CARBONAI_ISOLATED_TESTS') != '1':
    raise unittest.SkipTest('Use the isolated test runner')
import asyncio
import hashlib
import io
import json
import tempfile
from pathlib import Path
from unittest.mock import patch
from fastapi import FastAPI
from PIL import Image
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.db import Base, User
from app.collection import CollectionBase, CollectionRecord
from app.routers import auth, collection

class CollectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='carbonai-collection-test-')
        self.addCleanup(self.temp.cleanup)
        self.engine = create_engine('sqlite:///' + (Path(self.temp.name)/'test.sqlite').as_posix(), connect_args={'check_same_thread':False})
        self.addCleanup(self.engine.dispose)
        Base.metadata.create_all(self.engine); CollectionBase.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine)
        with self.factory() as db:
            for uid in [1,2]: db.add(User(id=uid, username=f'collection{uid}', email=f'collection{uid}@example.invalid', password_hash='not-a-login-password'))
            db.commit()
        for module in [auth,collection]:
            patcher=patch.object(module,'SessionLocal',self.factory);patcher.start();self.addCleanup(patcher.stop)
        patcher=patch.dict(os.environ,{'COLLECTION_STORAGE_DIR':str(Path(self.temp.name)/'photos')});patcher.start();self.addCleanup(patcher.stop)
        self.app=FastAPI();self.app.include_router(collection.router);self.app.add_middleware(collection.CollectionBodyLimit)
        self.tokens={u:auth._issue_token(u) for u in [1,2,999]}

    def call(self,path,method='GET',payload=None,uid=1,raw=None,content_type='application/json'):
        data=json.dumps(payload or {}).encode() if raw is None else raw
        async def run():
            sent=[]; consumed=False
            async def receive():
                nonlocal consumed
                if not consumed: consumed=True; return {'type':'http.request','body':data,'more_body':False}
                return {'type':'http.disconnect'}
            async def send(item):sent.append(item)
            headers=[(b'content-type',content_type.encode())]
            if uid is not None:headers.append((b'authorization',('Bearer '+self.tokens[uid]).encode()))
            base,_,query=path.partition('?')
            await self.app({'type':'http','asgi':{'version':'3.0'},'http_version':'1.1','method':method,'scheme':'http','path':base,'raw_path':base.encode(),'query_string':query.encode(),'root_path':'','headers':headers,'client':('127.0.0.1',1),'server':('test.local',80)},receive,send)
            start=next(x for x in sent if x['type']=='http.response.start')
            body=b''.join(x.get('body',b'') for x in sent if x['type']=='http.response.body')
            return start['status'],body,dict(start['headers'])
        return asyncio.run(run())

    def source(self,sample=False):
        status,raw,_=self.call('/api/collection/sources','POST',{'name':'Synthetic archive','origin':'Locally generated test image','authorization':'Synthetic test only','is_sample':sample})
        self.assertEqual(status,201,raw);return json.loads(raw)['id']

    def upload(self,source,content=None,mime='image/png',**overrides):
        fields={'source_id':source,'kind':'photo','captured_at':'2026-11-03T08:00:00+00:00','nature':'field_declared','longitude':'113.3','latitude':'23.1','photo_name':'Synthetic only','note':'No field collection took place',**overrides}
        boundary='carbonai-test-boundary';chunks=[]
        for key,value in fields.items():
            chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="{key}"\r\n\r\n{value}\r\n'.encode())
        if content is not None:chunks.append(f'--{boundary}\r\nContent-Disposition: form-data; name="photo"; filename="../../synthetic.png"\r\nContent-Type: {mime}\r\n\r\n'.encode()+content+b'\r\n')
        chunks.append(f'--{boundary}--\r\n'.encode())
        return self.call('/api/collection/records','POST',raw=b''.join(chunks),content_type='multipart/form-data; boundary='+boundary)

    def image(self,format='PNG'):
        output=io.BytesIO();Image.new('RGB',(32,24),(20,100,60)).save(output,format=format);return output.getvalue()

    def test_auth_and_owner_boundaries(self):
        for uid in [None,999]:self.assertEqual(self.call('/api/collection/records',uid=uid)[0],401)
        sid=self.source();self.assertEqual(json.loads(self.call('/api/collection/sources',uid=2)[1])['items'],[])
        self.assertEqual(self.call(f'/api/collection/sources/{sid}','PATCH',{'status':'verified','note':'test'},uid=2)[0],404)
        self.assertEqual(self.call('/api/collection/records/1/photo',uid=2)[0],404)

    def test_png_jpeg_persistence_private_hash_and_readback(self):
        sid=self.source()
        for fmt,mime in [('PNG','image/png'),('JPEG','image/jpeg')]:
            content=self.image(fmt);status,raw,_=self.upload(sid,content,mime)
            self.assertEqual(status,201,raw);rid=json.loads(raw)['id']
            with self.factory() as db:
                row=db.get(CollectionRecord,rid);self.assertEqual(row.photo_sha256,hashlib.sha256(content).hexdigest())
                self.assertTrue((Path(self.temp.name)/'photos'/row.photo_key).is_file());self.assertNotIn('..',row.photo_key)
            status,data,headers=self.call(f'/api/collection/records/{rid}/photo')
            self.assertEqual((status,data),(200,content));self.assertEqual(headers[b'cache-control'],b'no-store')
            self.assertEqual(self.call(f'/api/collection/records/{rid}/photo',uid=2)[0],404)
        listing=json.loads(self.call('/api/collection/records')[1]);self.assertEqual(listing['total'],2)
        self.assertTrue(listing['items'][0]['captured_at'].endswith('+00:00'))

    def test_sample_archive_forces_sample_and_review_is_recorded(self):
        sid=self.source(True);self.assertEqual(self.upload(sid,self.image())[0],201)
        self.assertEqual(json.loads(self.call('/api/collection/records')[1])['items'][0]['nature'],'sample')
        status,raw,_=self.call(f'/api/collection/sources/{sid}','PATCH',{'status':'verified','note':'Synthetic review declaration'})
        self.assertEqual(status,200);self.assertEqual(json.loads(raw)['status'],'verified')
        self.assertEqual(self.call(f'/api/collection/sources/{sid}','PATCH',{'status':'verified','note':' '})[0],422)

    def test_invalid_file_mime_size_do_not_persist(self):
        sid=self.source()
        for content,mime,status in [(b'<html>not an image</html>','image/png',422),(self.image(),'image/jpeg',422),(b'x'*(8*1024*1024+1),'image/png',413)]:
            self.assertEqual(self.upload(sid,content,mime)[0],status)
        self.assertEqual(json.loads(self.call('/api/collection/records')[1])['total'],0)
        self.assertFalse((Path(self.temp.name)/'photos').exists())

    def test_invalid_location_time_and_missing_photo(self):
        sid=self.source()
        for fields in [{'longitude':'181'},{'latitude':'nan'},{'longitude':'inf'},{'captured_at':'not-date'},{'captured_at':'2026-11-03T08:00:00'},{'kind':'invalid'},{'nature':'real-certified'}]:
            with self.subTest(fields=fields):self.assertEqual(self.upload(sid,self.image(),**fields)[0],422)
        self.assertEqual(self.upload(sid)[0],422)
        self.assertEqual(self.upload(sid,kind='location')[0],201)

    def test_empty_state_pagination_and_blank_source(self):
        listing=json.loads(self.call('/api/collection/records')[1]);self.assertEqual((listing['items'],listing['total']),([],0))
        self.assertEqual(self.call('/api/collection/records?limit=101')[0],422)
        self.assertEqual(self.call('/api/collection/sources','POST',{'name':' ','origin':'a','authorization':'b'})[0],422)

    def test_failed_commit_removes_new_photo(self):
        sid=self.source()
        from sqlalchemy.exc import OperationalError
        from sqlalchemy.orm import Session
        with patch.object(Session,'commit',side_effect=OperationalError('synthetic',{},Exception('mock'))):
            self.assertEqual(self.upload(sid,self.image())[0],503)
        self.assertEqual(list((Path(self.temp.name)/'photos').rglob('*.png')),[])

    def test_streaming_request_limit(self):
        status,raw,_=self.call('/api/collection/records','POST',raw=b'x'*(9*1024*1024+1),content_type='multipart/form-data; boundary=synthetic')
        self.assertEqual(status,413,raw)
        self.assertEqual(self.call('/api/collection/sources','POST',raw=b'x'*(64*1024+1))[0],413)
