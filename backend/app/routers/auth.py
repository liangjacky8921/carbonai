"""认证与用户会话接口。

提供注册、登录、登出、验证码发送与用户信息查询。用户与验证码写入数据库，
口令以 PBKDF2-HMAC-SHA256 加盐存储，会话令牌为 HMAC 签名的自包含 token，
注册验证码经 SMTP 邮件发送。

环境变量：
  AUTH_SECRET_KEY   会话签名密钥（部署时生成，如 openssl rand -hex 32）
  TOKEN_TTL_SECONDS 令牌有效期秒数，默认 86400
  SMTP_HOST         邮件服务器地址（如 smtp.qq.com / smtpdm.aliyun.com）
  SMTP_PORT         端口，默认 465（SSL）
  SMTP_USER         发件账号
  SMTP_PASS         发件密码或授权码
  SMTP_FROM         发件人地址，缺省同 SMTP_USER
依赖：口令、签名、邮件均使用 Python 标准库。
"""
import base64
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import smtplib
import ssl
import threading
import time
from datetime import datetime, timedelta
from email.header import Header
from email.mime.text import MIMEText
from email.utils import formataddr

from fastapi import APIRouter, Header
from pydantic import BaseModel

from app.db import SessionLocal, User, EmailCode
from app.schemas import ok, err, validate_password

logger = logging.getLogger("carbonai.auth")

router = APIRouter(prefix="/api/auth", tags=["auth"])

SECRET_KEY = os.getenv("AUTH_SECRET_KEY", "CHANGE_ME_IN_PRODUCTION")
TOKEN_TTL = int(os.getenv("TOKEN_TTL_SECONDS", "86400"))
PBKDF2_ROUNDS = 200_000

# 基础频率限制：内存计数（多实例部署可换成 Redis）
_RATE: dict = {}


def _rate_ok(key: str, limit: int, window: int) -> bool:
    now = time.time()
    bucket = [t for t in _RATE.get(key, []) if now - t < window]
    if len(bucket) >= limit:
        _RATE[key] = bucket
        return False
    bucket.append(now)
    _RATE[key] = bucket
    return True


# ---------- 口令 ----------
def _hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, PBKDF2_ROUNDS)
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt.hex()}${dk.hex()}"


def _verify_password(password: str, stored: str) -> bool:
    try:
        algo, rounds, salt_hex, hash_hex = stored.split("$")
        dk = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt_hex), int(rounds))
        return hmac.compare_digest(dk.hex(), hash_hex)
    except Exception:
        return False


# ---------- 令牌 ----------
def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode().rstrip("=")


def _unb64(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _sign(payload: dict) -> str:
    body = _b64(json.dumps(payload, separators=(",", ":")).encode())
    sig = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
    return f"{body}.{_b64(sig)}"


def _issue_token(uid: int) -> str:
    return _sign({"uid": uid, "exp": int(time.time()) + TOKEN_TTL})


def _parse_token(token: str):
    try:
        body, sig = token.split(".")
        expected = hmac.new(SECRET_KEY.encode(), body.encode(), hashlib.sha256).digest()
        if not hmac.compare_digest(_unb64(sig), expected):
            return None
        payload = json.loads(_unb64(body))
        if payload.get("exp", 0) < time.time():
            return None
        return payload.get("uid")
    except Exception:
        return None


EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ---------- 邮件验证码发送 ----------
def _smtp_conf() -> dict | None:
    host = os.getenv("SMTP_HOST", "").strip()
    user = os.getenv("SMTP_USER", "").strip()
    password = os.getenv("SMTP_PASS", "").strip()
    if not (host and user and password):
        return None
    return {
        "host": host,
        "port": int(os.getenv("SMTP_PORT", "465")),
        "user": user,
        "password": password,
        "from": os.getenv("SMTP_FROM", user).strip(),
    }


def _deliver_code_email(to_email: str, code: str):
    conf = _smtp_conf()
    if conf is None:
        logger.warning("SMTP 未配置，验证码仅记录到日志：%s → %s", to_email, code)
        print(f"[CarbonAI][DEV] 邮箱验证码 {to_email} → {code}（5分钟内有效，生产环境请配置 SMTP_* 环境变量）")
        return
    body = (
        f"您正在注册 CarbonAI 时空智能碳管理平台账号。\n\n"
        f"验证码：{code}\n\n"
        f"5 分钟内有效。若非本人操作，请忽略本邮件。"
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = Header(f"CarbonAI 注册验证码：{code}", "utf-8")
    msg["From"] = formataddr((str(Header("CarbonAI 平台", "utf-8")), conf["from"]))
    msg["To"] = to_email
    try:
        if conf["port"] == 465:
            server = smtplib.SMTP_SSL(conf["host"], conf["port"], timeout=15,
                                      context=ssl.create_default_context())
        else:
            server = smtplib.SMTP(conf["host"], conf["port"], timeout=15)
            server.starttls(context=ssl.create_default_context())
        with server:
            server.login(conf["user"], conf["password"])
            server.sendmail(conf["from"], [to_email], msg.as_string())
        logger.info("验证码邮件已发送：%s", to_email)
    except Exception as e:
        # 发送失败时降级记录，验证码仍可从日志侧人工核对
        logger.error("验证码邮件发送失败（%s）：%s", to_email, e)
        print(f"[CarbonAI][MAIL-FAIL] 邮箱验证码 {to_email} → {code}（发送失败已降级打印）")


def _send_code_email_async(to_email: str, code: str):
    threading.Thread(target=_deliver_code_email, args=(to_email, code), daemon=True).start()


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


def _user_dict(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "email": u.email,
        "created_at": u.created_at.strftime("%Y-%m-%d %H:%M:%S") if u.created_at else "",
    }


@router.post("/register")
def register(body: RegisterBody):
    if len(body.username) < 2:
        return err("请输入至少2位的账号名")
    if not EMAIL_RE.match(body.email):
        return err("邮箱格式不正确")
    pwd_err = validate_password(body.password)
    if pwd_err:
        return err(pwd_err)

    db = SessionLocal()
    try:
        if db.query(User).filter(User.username == body.username).first():
            return err("该账号已被注册")
        if db.query(User).filter(User.email == body.email).first():
            return err("该邮箱已被注册")

        rec = (
            db.query(EmailCode)
            .filter(EmailCode.email == body.email, EmailCode.used == 0)
            .order_by(EmailCode.id.desc())
            .first()
        )
        if not rec:
            return err("请先获取邮箱验证码")
        if rec.expires_at < datetime.now():
            return err("验证码已过期，请重新获取")
        if rec.code != body.code:
            return err("验证码不正确")
        rec.used = 1

        user = User(
            username=body.username,
            email=body.email,
            password_hash=_hash_password(body.password),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return ok(_user_dict(user), "注册成功")
    finally:
        db.close()


@router.post("/send-code")
def send_code(body: SendCodeBody):
    if not EMAIL_RE.match(body.email):
        return err("邮箱格式不正确")
    if not _rate_ok(f"code:{body.email}", limit=5, window=600):
        return err("验证码请求过于频繁，请稍后再试")

    code = str(secrets.randbelow(900000) + 100000)
    db = SessionLocal()
    try:
        db.add(
            EmailCode(
                email=body.email,
                code=code,
                expires_at=datetime.now() + timedelta(minutes=5),
                used=0,
            )
        )
        db.commit()
    finally:
        db.close()

    _send_code_email_async(body.email, code)
    if _smtp_conf() is None:
        return ok({"expires_in": 300, "channel": "log"}, "验证码已发送（开发模式：请查看服务端日志或配置 SMTP）")
    return ok({"expires_in": 300, "channel": "email"}, "验证码已发送至您的邮箱，请查收（注意垃圾邮件箱）")


@router.post("/login")
def login(body: LoginBody):
    if not _rate_ok(f"login:{body.username}", limit=10, window=600):
        return err("登录尝试过于频繁，请稍后再试")

    db = SessionLocal()
    try:
        u = (
            db.query(User)
            .filter((User.username == body.username) | (User.email == body.username))
            .first()
        )
        if not u or not _verify_password(body.password, u.password_hash):
            return err("账号或密码错误")
        return ok({"token": _issue_token(u.id), "user": _user_dict(u)}, "登录成功")
    finally:
        db.close()


@router.post("/logout")
def logout():
    return ok(None, "已退出登录")


@router.get("/user-info")
def user_info(authorization: str = Header(default="")):
    token = authorization.replace("Bearer ", "").strip()
    uid = _parse_token(token)
    if uid is None:
        return err("无效凭证", 401)
    db = SessionLocal()
    try:
        u = db.query(User).filter(User.id == uid).first()
        if not u:
            return err("无效凭证", 401)
        return ok(_user_dict(u))
    finally:
        db.close()
