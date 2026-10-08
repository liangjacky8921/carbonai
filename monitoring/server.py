#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CarbonAI V6.0 · 模拟实时监测数据服务（零依赖 Python 标准库）
每 5 秒推送一条模拟监测数据，严格按 docs/monitoring-api-spec.md 规范。

启动：python server.py
访问：http://localhost:8765/  → demo.html
      http://localhost:8765/stream → SSE 实时流
      http://localhost:8765/latest → 最新一条
"""

import json
import math
import random
import time
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, timedelta, timezone

# ============================================================
# CONFIG 可调参数（对应 monitoring-api-spec.md 第七节）
# ============================================================
PUSH_INTERVAL_SECONDS = 5
WARNING_THRESHOLD = 50.0        # kg/h
CRITICAL_THRESHOLD = 80.0       # kg/h
POINT_ID = "4403_001234_BL_01"
SCHEMA_VERSION = "v1"
GWP_CH4 = 28.0
GWP_N2O = 265.0
# ============================================================

TZ_CN = timezone(timedelta(hours=8))

# 最新一条数据 + 当前告警（线程安全）
_latest = None
_active_alerts = {}             # point_id -> {level, since, reason}
_lock = threading.Lock()


def make_timestamp() -> str:
    """ISO 8601 +08:00 时区"""
    return datetime.now(TZ_CN).strftime("%Y-%m-%dT%H:%M:%S+08:00")


def generate_point() -> dict:
    """生成一条模拟监测数据（严格按 T8 规范）"""
    # 模拟真实排放波动：基线 35 kg/h + 随机扰动 + 周期波动
    base = 35.0 + 15.0 * math.sin(time.time() / 120.0)  # 2 分钟周期
    noise = random.uniform(-10, 25)
    co2e_rate = max(5.0, base + noise)

    co2_rate = co2e_rate * 0.92                         # CO₂ 占 ~92%
    ch4_rate = max(0.01, co2e_rate * 0.002)
    n2o_rate = max(0.01, co2e_rate * 0.001)

    point = {
        "point_id": POINT_ID,
        "timestamp": make_timestamp(),
        "co2_rate": round(co2_rate, 2),
        "ch4_rate": round(ch4_rate, 4),
        "n2o_rate": round(n2o_rate, 4),
        "co2e_rate": round(co2e_rate, 2),
        "energy_input": round(1200 + random.uniform(-100, 150), 1),
        "temperature": round(80 + random.uniform(-5, 10), 1),
        "operating_status": random.choice(["running", "running", "running", "idle"]),
        "data_source": "simulated",
        "schema_version": SCHEMA_VERSION,
    }

    # 阈值检查
    now = time.time()
    with _lock:
        if co2e_rate >= CRITICAL_THRESHOLD:
            point["alert_level"] = "critical"
            point["alert_reason"] = f"co2e_rate={co2e_rate:.1f} > critical={CRITICAL_THRESHOLD}"
            if POINT_ID not in _active_alerts or _active_alerts[POINT_ID]["level"] != "critical":
                _active_alerts[POINT_ID] = {"level": "critical", "since": now,
                                             "reason": point["alert_reason"]}
        elif co2e_rate >= WARNING_THRESHOLD:
            point["alert_level"] = "warning"
            point["alert_reason"] = f"co2e_rate={co2e_rate:.1f} > warning={WARNING_THRESHOLD}"
            if POINT_ID not in _active_alerts or _active_alerts[POINT_ID]["level"] == "normal":
                _active_alerts[POINT_ID] = {"level": "warning", "since": now,
                                             "reason": point["alert_reason"]}
        else:
            # 低于阈值：冷却窗口 + 恢复判定
            prev = _active_alerts.get(POINT_ID)
            if prev and prev["level"] in ("warning", "critical"):
                _active_alerts[POINT_ID] = {"level": "recovery", "since": now,
                                             "reason": f"co2e_rate={co2e_rate:.1f} 回落阈值内"}

    return point


def stream_loop(sse_handler):
    """SSE 推流循环（每次 HTTP 连接一个独立循环）"""
    sse_handler.send_sse({"type": "connected", "config": {
        "push_interval": PUSH_INTERVAL_SECONDS,
        "warning": WARNING_THRESHOLD,
        "critical": CRITICAL_THRESHOLD,
        "point_id": POINT_ID,
    }})
    consecutive_below = 0
    while True:
        try:
            point = generate_point()
            sse_handler.send_sse(point)
            with _lock:
                global _latest
                _latest = point
            # 恢复判定连续低于阈值 3 次才清除
            if point["co2e_rate"] < WARNING_THRESHOLD:
                consecutive_below += 1
            else:
                consecutive_below = 0
            if consecutive_below >= 3:
                with _lock:
                    _active_alerts.pop(POINT_ID, None)
            time.sleep(PUSH_INTERVAL_SECONDS)
        except (BrokenPipeError, ConnectionResetError, OSError):
            break


class SSEWriter:
    """轻量 SSE 写入器"""
    def __init__(self, handler):
        self.h = handler

    def send_sse(self, obj: dict):
        data = json.dumps(obj, ensure_ascii=False)
        payload = f"data: {data}\n\n".encode("utf-8")
        self.h.wfile.write(payload)
        self.h.wfile.flush()


HANDLER_DOC = r"""<!DOCTYPE html>
<html lang="zh-CN" class="dark">
<head>
<meta charset="UTF-8"><title>CarbonAI 模拟实时监测</title>
<style>
body{margin:0;background:#070d0b;color:#e8f5ef;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;padding:24px}
h1{font-size:18px;margin:0 0 16px;color:#e8f5ef}
.status{display:flex;gap:12px;margin-bottom:20px;font-size:13px}
.status span{padding:4px 10px;border-radius:12px;background:#16261f;border:1px solid #24413a}
.status .live{color:#10b981;border-color:rgba(16,185,129,0.4)}
.status .sim{color:#0ea5e9;border-color:rgba(14,165,233,0.4)}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px}
.kpi{background:#0d1714;border:1px solid #1c2f27;border-radius:10px;padding:16px}
.kpi .num{font-family:'JetBrains Mono',monospace;font-size:28px;font-weight:600;margin-bottom:4px}
.kpi .lbl{font-size:11px;color:#5f7a6f}
.row{font-family:'JetBrains Mono',monospace;font-size:12px;color:#9db8ae;padding:6px 0;border-bottom:1px solid #1c2f27}
.row .field{color:#5f7a6f}
.row .val{color:#e8f5ef}
.alert{background:rgba(239,68,68,0.12);border:1px solid rgba(239,68,68,0.4);border-radius:8px;padding:12px;margin-top:12px;color:#fca5a5}
.alert.warn{background:rgba(245,158,11,0.12);border-color:rgba(245,158,11,0.4);color:#fcd34d}
.box{background:#0d1714;border:1px solid #1c2f27;border-radius:10px;padding:16px;margin-bottom:12px}
</style>
</head>
<body>
<h1>🔬 CarbonAI V6.0 · 模拟实时监测数据服务</h1>
<div class="status">
  <span class="live" id="conn-status">● 连接中...</span>
  <span class="sim">● data_source: simulated</span>
  <span id="pt-id">point_id: 4403_001234_BL_01</span>
  <span id="thr">阈值: warning=50 / critical=80 kg/h</span>
</div>
<div class="kpis">
  <div class="kpi"><div class="num" id="co2e" style="color:#10b981">—</div><div class="lbl">CO₂e 排放速率 (kg/h)</div></div>
  <div class="kpi"><div class="num" id="co2" style="color:#0ea5e9">—</div><div class="lbl">CO₂ 排放速率 (kg/h)</div></div>
  <div class="kpi"><div class="num" id="energy" style="color:#8b5cf6">—</div><div class="lbl">能耗 (kWh/h)</div></div>
  <div class="kpi"><div class="num" id="alert" style="color:#5f7a6f">正常</div><div class="lbl">告警状态</div></div>
</div>
<div class="box"><h3 style="margin:0 0 12px;font-size:13px;color:#9db8ae">📦 最新 payload（严格按 monitoring-api-spec.md）</h3>
<pre id="payload" style="margin:0;font-size:11px;color:#c4d8cf;white-space:pre-wrap;word-break:break-all">{等待首条数据...}</pre></div>
<div class="box"><h3 style="margin:0 0 12px;font-size:13px;color:#9db8ae">📝 原始数据字段</h3>
<div id="fields"></div></div>
<script>
const es = new EventSource('/stream');
const conn = document.getElementById('conn-status');
conn.textContent = '● 已连接（每 5s 一条）';
conn.style.color = '#10b981';
let last;
es.onmessage = (e) => {
  try {
    const d = JSON.parse(e.data);
    if (d.type === 'connected') return;
    last = d;
    document.getElementById('co2e').textContent = d.co2e_rate;
    document.getElementById('co2').textContent = d.co2_rate;
    document.getElementById('energy').textContent = d.energy_input;
    document.getElementById('payload').textContent = JSON.stringify(d, null, 2);
    const f = document.getElementById('fields');
    f.innerHTML = Object.entries(d).map(([k,v]) =>
      `<div class="row"><span class="field">${k}</span> = <span class="val">${JSON.stringify(v)}</span></div>`
    ).join('');
    const a = d.alert_level;
    const alertEl = document.getElementById('alert');
    if (a === 'critical') { alertEl.textContent = '🔴 critical'; alertEl.style.color = '#ef4444'; }
    else if (a === 'warning') { alertEl.textContent = '🟡 warning'; alertEl.style.color = '#f59e0b'; }
    else { alertEl.textContent = '正常'; alertEl.style.color = '#5f7a6f'; }
  } catch(err){ console.warn('parse:', e.data, err); }
};
es.onerror = () => {
  conn.textContent = '● 断线重连中...';
  conn.style.color = '#ef4444';
};
</script>
</body></html>
"""


class MonitorHandler(BaseHTTPRequestHandler):
    server_version = "CarbonAI-Monitor-v6"

    def log_message(self, fmt, *args):
        pass  # 静默（避免控制台刷屏）

    def do_GET(self):
        path = self.path.split("?")[0]

        if path == "/":
            self._send_html(HANDLER_DOC)
        elif path == "/demo":
            self._send_html(HANDLER_DOC)
        elif path == "/stream":
            self._do_sse()
        elif path == "/latest":
            self._send_json(_latest if _latest else {"status": "waiting", "message": "首条数据尚未生成"})
        elif path == "/alerts":
            with _lock:
                alerts = list(_active_alerts.values())
            self._send_json({"active_alerts": alerts, "count": len(alerts)})
        elif path == "/config":
            self._send_json({
                "push_interval_seconds": PUSH_INTERVAL_SECONDS,
                "warning_threshold_kg_per_h": WARNING_THRESHOLD,
                "critical_threshold_kg_per_h": CRITICAL_THRESHOLD,
                "point_id": POINT_ID,
                "schema_version": SCHEMA_VERSION,
                "timezone": "+08:00 (Asia/Shanghai)",
            })
        else:
            self._send_json({"error": "not_found", "path": path}, status=404)

    def _do_sse(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream; charset=utf-8")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        sse = SSEWriter(self)
        stream_loop(sse)

    def _send_json(self, obj, status=200):
        body = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _send_html(self, html):
        body = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def main():
    host, port = "127.0.0.1", 8765
    server = HTTPServer((host, port), MonitorHandler)
    print(f"[CarbonAI] 模拟监测服务启动 → http://{host}:{port}/")
    print(f"  • SSE 流: http://{host}:{port}/stream")
    print(f"  • 最新值: http://{host}:{port}/latest")
    print(f"  • 配置:   http://{host}:{port}/config")
    print(f"  • 阈值:   warning={WARNING_THRESHOLD} / critical={CRITICAL_THRESHOLD} kg/h")
    print(f"  • 推送:   每 {PUSH_INTERVAL_SECONDS} 秒一条")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[CarbonAI] 服务已停止")
        server.server_close()


if __name__ == "__main__":
    main()
