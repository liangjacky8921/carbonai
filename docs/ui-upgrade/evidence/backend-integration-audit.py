"""Local full-stack smoke audit using the isolated .integration-test.db database."""

from __future__ import annotations

import json
import sqlite3
import urllib.request
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
BASE = "http://127.0.0.1:8000/api"
DB = ROOT / "backend" / ".integration-test.db"
FIXTURE = ROOT / "docs" / "ui-upgrade" / "evidence" / "sample-upload.csv"
REPORT = ROOT / "docs" / "ui-upgrade" / "evidence" / "backend-test-report.pdf"


def request_json(path: str, data=None, headers=None):
    body = None if data is None else json.dumps(data).encode("utf-8")
    req_headers = {"Content-Type": "application/json", **(headers or {})}
    with urllib.request.urlopen(
        urllib.request.Request(f"{BASE}{path}", data=body, headers=req_headers), timeout=10
    ) as response:
        return response.status, json.load(response)


def upload_csv():
    boundary = f"----CarbonAIAudit{uuid.uuid4().hex}"
    content = FIXTURE.read_bytes()
    body = (
        f"--{boundary}\r\n"
        'Content-Disposition: form-data; name="file"; filename="sample-upload.csv"\r\n'
        "Content-Type: text/csv\r\n\r\n"
    ).encode() + content + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(
        f"{BASE}/emissions/upload",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
    )
    with urllib.request.urlopen(req, timeout=10) as response:
        return response.status, json.load(response)


health_status, health = request_json("/health")
sample_status, samples = request_json("/sample/list")
factor_status, factors = request_json("/factors")

suffix = uuid.uuid4().hex[:8]
username = f"audit_{suffix}"
email = f"audit_{suffix}@example.test"
password = "CarbonAudit2026"

send_status, sent = request_json("/auth/send-code", {"email": email})
with sqlite3.connect(DB) as connection:
    code = connection.execute(
        "SELECT code FROM email_codes WHERE email = ? ORDER BY id DESC LIMIT 1", (email,)
    ).fetchone()[0]

register_status, registered = request_json(
    "/auth/register",
    {"username": username, "email": email, "password": password, "code": code},
)
login_status, logged_in = request_json(
    "/auth/login", {"username": username, "password": password}
)
token = logged_in["data"]["token"]
user_status, user_info = request_json(
    "/auth/user-info", headers={"Authorization": f"Bearer {token}"}
)

upload_status, uploaded = upload_csv()
report_body = json.dumps(
    {
        "standard": "ISO 14064-1",
        "year": 2026,
        "format": "pdf",
        "records": uploaded["data"],
    }
).encode("utf-8")
report_request = urllib.request.Request(
    f"{BASE}/reports/generate",
    data=report_body,
    headers={"Content-Type": "application/json"},
)
with urllib.request.urlopen(report_request, timeout=15) as response:
    report_bytes = response.read()
    REPORT.write_bytes(report_bytes)
    report_status = response.status
    report_type = response.headers.get_content_type()

print(
    json.dumps(
        {
            "health": {"http": health_status, "status": health["status"], "version": health["version"]},
            "samples": {"http": sample_status, "count": len(samples["data"])},
            "factors": {"http": factor_status, "count": len(factors["data"])},
            "auth": {
                "send_code": [send_status, sent["code"]],
                "register": [register_status, registered["code"]],
                "login": [login_status, logged_in["code"]],
                "user_info": [user_status, user_info["code"]],
            },
            "upload": {"http": upload_status, "records": len(uploaded["data"])},
            "report": {"http": report_status, "type": report_type, "bytes": len(report_bytes)},
        },
        ensure_ascii=False,
    )
)
