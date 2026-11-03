"""Private collection records. Explicit local initialization; no production migration on import."""
import os
from datetime import datetime, timezone
from pathlib import Path
from sqlalchemy import Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
from sqlalchemy.orm import declarative_base

CollectionBase = declarative_base()

class SourceArchive(CollectionBase):
    __tablename__ = 'collection_sources'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    name = Column(String(160), nullable=False)
    origin = Column(Text, nullable=False)
    authorization = Column(Text, nullable=False)
    is_sample = Column(Boolean, nullable=False, default=False)
    status = Column(String(20), nullable=False, default='pending')
    verification_note = Column(Text, nullable=False, default='')
    updated_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

class CollectionRecord(CollectionBase):
    __tablename__ = 'collection_records'
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, nullable=False, index=True)
    code = Column(String(48), nullable=False, unique=True)
    source_id = Column(Integer, ForeignKey('collection_sources.id'), nullable=False, index=True)
    kind = Column(String(24), nullable=False)
    captured_at = Column(DateTime(timezone=True), nullable=False)
    longitude = Column(Float)
    latitude = Column(Float)
    nature = Column(String(24), nullable=False)
    note = Column(Text, nullable=False, default='')
    photo_name = Column(String(160))
    photo_key = Column(String(128))
    photo_mime = Column(String(40))
    photo_sha256 = Column(String(64))
    created_at = Column(DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc))

def storage_root():
    return Path(os.getenv('COLLECTION_STORAGE_DIR', str(Path(__file__).resolve().parents[1] / 'var' / 'collection'))).resolve()

if __name__ == '__main__':
    # No import-time schema changes; production requires a separately reviewed migration.
    if os.getenv('APP_ENV', '') not in {'development', 'test'}:
        raise SystemExit('Production initialization is not permitted by this local helper.')
    from app.db import engine
    CollectionBase.metadata.create_all(engine)
    print('Collection tables initialized in the configured local database; no data seeded.')
