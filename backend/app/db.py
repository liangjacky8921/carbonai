"""SQLAlchemy 数据库骨架 — 用户后续接入真实数据库时启用。

当前阶段（V5.2 前端先行）：认证走内存 Mock（见 routers/auth.py）。
接入步骤：
  1. pip install sqlalchemy（已含）
  2. 设置环境变量 DATABASE_URL，如 sqlite:///./carbonai.db 或 postgresql://user:pwd@host/db
  3. 取消下方模型注释，执行 `python -m app.db` 建表
  4. 在 routers/auth.py 中将 USERS 内存表替换为 ORM 查询
"""
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker
import os

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./carbonai.db")
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {})
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    """用户表（预留）"""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class EmailCode(Base):
    """邮箱验证码表（预留）"""
    __tablename__ = "email_codes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(128), index=True, nullable=False)
    code = Column(String(8), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print(f"[CarbonAI] 数据库已初始化: {DATABASE_URL}")
