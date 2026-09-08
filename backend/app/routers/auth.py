"""认证占位路由（Mock 实现）
契约与前端 src/api/client.ts + src/mock/server.ts 完全一致：
  POST /api/auth/register   {username, email, password, code}  → {code, message, data: UserInfo}
  POST /api/auth/login      {username, password}               → {code, message, data: {token, user}}
  POST /api/auth/logout     {}                                 → {code, message, data: null}
  POST /api/auth/send-code  {email}                            → {code, message, data: {expires_in}}
  GET  /api/auth/user-info  (Bearer token)                     → {code, message, data: UserInfo}

说明：当前为内存 Mock（重启丢失）。数据库接入后替换 _USERS 为 SQLAlchemy 查询（见 app/db.py）。
"""
import hashlib
import random
import re
import time
from typing import Dict
from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.schemas import ok, err, validate_password

router = APIRouter(prefix="/api/auth", tags=["auth"])

# ---------- 内存存储（Mock） ----------
_USERS: Dict[int, dict] = {}
_CODES: Dict[str, tuple] = {}  # email → (code, expire_ts)
_SEED = [0]


def _hash(pwd: str) -> str:
    return hashlib.sha256(("carbonai-salt:" + pwd).encode()).hexdigest()


def _token(uid: int) -> str:
    return f"mock-jwt-{uid}-{int(time.time() * 1000)}"


def _parse_token(token: str) -> int | None:
    try:
        return int(token.split("-")[2])
    except Exception:
        return None


class RegisterBody(BaseModel):
    username: str
    email: str
    password: str
    code: str


class LoginBody(BaseModel):
    username: str
    password: str


class SendCodeBody(BaseModel):
    email: str


@router.post("/register")
def register(body: RegisterBody):
    if len(body.username) < 2:
        return err("请输入至少2位的账号名")
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", body.email):
        return err("邮箱格式不正确")
    pwd_err = validate_password(body.password)
    if pwd_err:
        return err(pwd_err)
    if any(u["username"] == body.username for u in _USERS.values()):
        return err("该账号已被注册")
    if any(u["email"] == body.email for u in _USERS.values()):
        return err("该邮箱已被注册")
    rec = _CODES.get(body.email)
    if not rec:
        return err("请先获取邮箱验证码")
    code, expire_ts = rec
    if time.time() > expire_ts:
        return err("验证码已过期，请重新获取")
    if code != body.code:
        return err("验证码不正确")

    _SEED[0] += 1
    uid = _SEED[0]
    from datetime import datetime
    _USERS[uid] = {
        "id": uid, "username": body.username, "email": body.email,
        "password_hash": _hash(body.password),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    user = {k: v for k, v in _USERS[uid].items() if k != "password_hash"}
    return ok(user, "注册成功")


@router.post("/send-code")
def send_code(body: SendCodeBody):
    """邮箱验证码占位接口：真实邮件发送由用户后续接入 SMTP / 邮件服务商后启用。
    Mock 行为：生成 6 位验证码，5 分钟有效，打印到服务端控制台。"""
    if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", body.email):
        return err("邮箱格式不正确")
    code = str(random.randint(100000, 999999))
    _CODES[body.email] = (code, time.time() + 300)
    print(f"[CarbonAI][Mock] 邮箱验证码 {body.email} → {code}（5分钟内有效）")
    return ok({"expires_in": 300}, "验证码已发送（演示模式：验证码打印在服务端控制台）")


@router.post("/login")
def login(body: LoginBody):
    for u in _USERS.values():
        if u["username"] == body.username or u["email"] == body.username:
            if u["password_hash"] == _hash(body.password):
                user = {k: v for k, v in u.items() if k != "password_hash"}
                return ok({"token": _token(u["id"]), "user": user}, "登录成功")
    return err("账号或密码错误")


@router.post("/logout")
def logout():
    return ok(None, "已退出登录")


@router.get("/user-info")
def user_info(authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "").strip()
    uid = _parse_token(token)
    if uid is None or uid not in _USERS:
        return err("无效凭证", 401)
    user = {k: v for k, v in _USERS[uid].items() if k != "password_hash"}
    return ok(user)
