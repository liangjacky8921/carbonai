# CarbonAI V6.0 · 监测数据接口规范

> 本文档定义碳源实时监测模块的前后端数据契约。**模拟服务与真实设备共用同一规范**，禁止偏离。所有字段值类型、时间戳格式、单位必须严格遵守。

---

## 一、点位 ID 编码规则

### 1.1 格式
```
{region}_{facility}_{sourceType}_{index}
```

### 1.2 字段说明
| 字段 | 取值范围 | 示例 |
|---|---|---|
| `region` | 4 位行政区编码（GB/T 2260） | `4403` = 广东深圳 |
| `facility` | 6 位企业/设施代码（自分配，建议用 CEA 配额编号后 6 位） | `001234` |
| `sourceType` | 2 字符缩写：`BL`(锅炉) `EL`(电力) `PR`(工艺) `WW`(废水) `DG`(柴油) `NT`(天然气) | `BL` |
| `index` | 2 位序号（同类型多源场景） | `01` |

### 1.3 完整示例
```
4403_001234_BL_01   # 深圳·1234号设施·1号锅炉
4403_001234_EL_02   # 深圳·1234号设施·2号配电室
```

### 1.4 CONFIG 可调
```yaml
# 点位 ID 前缀（生产环境可改为企业私有前缀）
POINT_ID_PREFIX: "carbonai_v6_"

# 点位 ID 编码规则版本（字段顺序/分隔符变化时升级）
POINT_ID_SCHEMA_VERSION: "v1"
```

---

## 二、监测指标清单

### 2.1 核心排放指标（每条 payload 必带）
| 字段 | 类型 | 单位 | 含义 |
|---|---|---|---|
| `co2_rate` | float | kg/h | CO₂ 排放速率 |
| `ch4_rate` | float | kg/h | CH₄ 排放速率 |
| `n2o_rate` | float | kg/h | N₂O 排放速率 |
| `co2e_rate` | float | kg/h | CO₂ 当量总排放速率 = co2 + ch4×28 + n2o×265 |

### 2.2 辅助指标（可选，sourceType 依赖）
| 字段 | 类型 | 单位 | 适用源 |
|---|---|---|---|
| `energy_input` | float | kWh/h | BL/EL/DG/NT |
| `temperature` | float | ℃ | BL（锅炉出口温度） |
| `flow_rate` | float | m³/h | WW（废水流量）/ NT（天然气流量） |
| `operating_status` | enum | - | `running` / `idle` / `fault` |

### 2.3 所有 payload 必带元数据
| 字段 | 类型 | 含义 |
|---|---|---|
| `point_id` | string | 一、点位 ID |
| `timestamp` | string | ISO 8601 +08:00 时区（见三） |
| `data_source` | enum | `simulated` / `device` |
| `schema_version` | string | `"v1"` |

---

## 三、时间戳格式

### 3.1 标准
```
YYYY-MM-DDTHH:mm:ss+08:00
```

### 3.2 示例
```
2026-08-15T14:32:07+08:00
2026-08-15T00:00:00+08:00   # 跨天必须用当地时区午夜，禁止 UTC
```

### 3.3 规则
- **强制东八区**（中国业务），禁止 UTC 或其他时区
- 精度到秒，禁止毫秒（实时 5s 推送不需要更高精度）
- 日期字段禁止用缩写（`2026-8-15` 是非法的，必须 `2026-08-15`）

---

## 四、阈值体系

### 4.1 默认值
| 级别 | 阈值 | 触发条件 | 冷却机制 |
|---|---|---|---|
| **warning**（黄色） | **50 kg/h** | `co2e_rate > 50` | 触发后 5 分钟内不重复告警（冷却窗） |
| **critical**（红色） | **80 kg/h** | `co2e_rate > 80` | 触发后 10 分钟内不重复告警 |
| **recovery**（恢复） | — | `co2e_rate` 连续 3 次 < warning 阈值 | 自动清除告警状态 |

### 4.2 CONFIG 可调（禁止硬编码）
```yaml
# 默认阈值（kg/h，按 co2e_rate 判断）
warning_threshold_kg_per_h: 50
critical_threshold_kg_per_h: 80

# 冷却窗口（秒）
warning_cooldown_seconds: 300
critical_cooldown_seconds: 600

# 恢复判定（连续 N 次低于 warning）
recovery_required_count: 3
```

### 4.3 示例 payload（超阈值）
```json
{
  "point_id": "4403_001234_BL_01",
  "timestamp": "2026-08-15T14:32:07+08:00",
  "co2_rate": 65.2,
  "ch4_rate": 0.8,
  "n2o_rate": 0.05,
  "co2e_rate": 85.3,
  "energy_input": 1250.0,
  "temperature": 85.3,
  "operating_status": "running",
  "data_source": "simulated",
  "schema_version": "v1",
  "alert_level": "critical",
  "alert_reason": "co2e_rate=85.3 > critical=80.0 kg/h"
}
```

---

## 五、WebSocket 推送协议（T9 server.py 使用）

### 5.1 连接
```
ws://{host}:{port}/ws/monitoring
```

### 5.2 心跳
客户端每 30s 发送 `ping`，服务端回复 `pong`。超时 90s 断开连接。

### 5.3 推送频率
- 默认 **每 5 秒** 推送一次
- CONFIG 可调：
```yaml
push_interval_seconds: 5
```

### 5.4 断线重连
- 客户端断线后指数退避重连（1s → 2s → 4s → 8s，上限 60s）
- 重连后拉取最近 100 条历史（`GET /api/monitoring/history?limit=100`）补齐断点

---

## 六、HTTP REST 接口

| 方法 | 路径 | 用途 |
|---|---|---|
| GET | `/api/monitoring/latest` | 所有点位最新一条数据 |
| GET | `/api/monitoring/point/{id}/latest` | 单点位最新一条 |
| GET | `/api/monitoring/history?point_id={id}&start={iso}&end={iso}` | 历史数据查询 |
| GET | `/api/monitoring/alerts?active_only=true` | 当前活跃告警列表 |

### 6.1 响应格式
```json
{
  "code": 0,
  "data": [...],
  "data_source": "simulated",
  "server_time": "2026-08-15T14:32:07+08:00"
}
```

---

## 七、CONFIG 汇总（4 项可调参数）

| CONFIG 键 | 默认值 | 说明 |
|---|---|---|
| `POINT_ID_PREFIX` | `carbonai_v6_` | 点位 ID 前缀 |
| `warning_threshold_kg_per_h` | `50` | 黄色告警阈值（kg/h） |
| `critical_threshold_kg_per_h` | `80` | 红色告警阈值（kg/h） |
| `boss_aggregation_interval_minutes` | `10` | 老板视图聚合粒度 |
| `business_show_savings_tip` | `true` | 是否附加节能建议字段 |
| `push_interval_seconds` | `5` | WebSocket 推送间隔 |

---

## 八、合规检查清单（联调前必须全部通过）

- [ ] 所有 payload 都带 `data_source` 字段（`simulated` 或 `device`）
- [ ] 时间戳全部为 ISO 8601 +08:00 格式
- [ ] 点位 ID 符合 `{region}_{facility}_{sourceType}_{index}` 规则
- [ ] 阈值全部从 CONFIG 读取，无硬编码值
- [ ] CO₂e 当量系数 GWP 值（CH₄=28, N₂O=265）从 CONFIG 读取
- [ ] WebSocket 推送频率可通过 CONFIG 调整
