"""SQLAlchemy 数据库骨架（整改版）

相对原文件的改动：
1. 生产环境连接池参数（pool_pre_ping / pool_recycle）从环境变量读取，适配阿里云 RDS。
2. 明确 DATABASE_URL 示例：MySQL（RDS）/ PostgreSQL / SQLite（本地开发）。
3. 保留 User / EmailCode 模型，供认证路由使用。

依赖：使用 MySQL 需安装驱动 pymysql（见 backend/requirements.txt）。
"""
import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, func
from sqlalchemy.orm import declarative_base, sessionmaker

# 本地开发默认 SQLite；生产改为阿里云 RDS，例如：
#   DATABASE_URL=mysql+pymysql://user:password@rm-xxxx.mysql.rds.aliyuncs.com:3306/carbonai?charset=utf8mb4
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./carbonai.db")
IS_SQLITE = DATABASE_URL.startswith("sqlite")

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if IS_SQLITE else {},
    pool_pre_ping=True,          # 断线自动重连（RDS 长连接场景）
    pool_recycle=1800,           # 30 分钟回收，避免被云数据库断开
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


class User(Base):
    """用户表"""
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class EmailCode(Base):
    """邮箱验证码表"""
    __tablename__ = "email_codes"
    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String(128), index=True, nullable=False)
    code = Column(String(8), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    used = Column(Integer, default=0)


if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print(f"[CarbonAI] 数据库已初始化: {DATABASE_URL}")
