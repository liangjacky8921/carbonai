"""统一响应模型：{ code: 200, message: "success", data: {...} }"""
from typing import Any, Optional
from pydantic import BaseModel


class ApiResponse(BaseModel):
    code: int = 200
    message: str = "success"
    data: Any = None


def ok(data: Any = None, message: str = "success") -> dict:
    return {"code": 200, "message": message, "data": data}


def err(message: str, code: int = 400) -> dict:
    return {"code": code, "message": message, "data": None}


def validate_password(pwd: str) -> Optional[str]:
    """密码至少 8 位且含大小写字母和数字"""
    if not pwd or len(pwd) < 8:
        return "密码长度至少 8 位"
    if not any(c.islower() for c in pwd):
        return "密码需包含小写字母"
    if not any(c.isupper() for c in pwd):
        return "密码需包含大写字母"
    if not any(c.isdigit() for c in pwd):
        return "密码需包含数字"
    return None
