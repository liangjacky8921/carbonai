#!/usr/bin/env bash
set -euo pipefail

# 1) 生成会话签名密钥并写入环境变量文件（SMTP/AI 密钥预留空，待用户提供后填入）
mkdir -p /etc/carbonai
SECRET=$(openssl rand -hex 32)
cat > /etc/carbonai/carbonai.env <<EOF
APP_ENV=production
ALLOW_ORIGINS=https://carbontool.cn,https://www.carbontool.cn
AUTH_SECRET_KEY=${SECRET}
TOKEN_TTL_SECONDS=86400
DATABASE_URL=sqlite:////opt/carbonai/backend/carbonai.db
SMTP_HOST=
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
AI_API_BASE=https://api.deepseek.com/v1/chat/completions
AI_API_KEY=
AI_MODEL=deepseek-chat
AI_TIMEOUT=60
EOF
chmod 600 /etc/carbonai/carbonai.env
echo "env written"

# 2) systemd 服务接入环境变量文件
cat > /etc/systemd/system/carbonai-api.service <<'SVC'
[Unit]
Description=CarbonAI FastAPI Backend
After=network.target

[Service]
User=root
WorkingDirectory=/opt/carbonai/backend
EnvironmentFile=/etc/carbonai/carbonai.env
ExecStart=/opt/carbonai/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SVC
echo "service written"

# 3) 建数据库表（用户 / 邮箱验证码）
cd /opt/carbonai/backend
.venv/bin/python -m app.db
echo "db initialized"

# 4) 重载并重启后端
systemctl daemon-reload
systemctl restart carbonai-api
echo "backend restarted"