# Kiến trúc SignalOps

## 1. Tổng quan

SignalOps sử dụng kiến trúc hướng sự kiện (event-driven). Việc tiếp nhận request được tách biệt khỏi xử lý nặng thông qua hàng đợi Redis, giúp tăng khả năng phản hồi và mở rộng.

---

## 2. Các thành phần chính

| Thành phần | Công nghệ | Vai trò | Vấn đề giải quyết |
|-----------|-----------|--------|------------------|
| **API Gateway** | NestJS 10 + Express | Nhận request từ thiết bị, validate, enqueue job | Tách riêng I/O từ xử lý CPU-heavy để trả về 202 nhanh (không blocking) |
| **Worker Service** | NestJS 10 + BullMQ | Lấy job từ queue, phát hiện ngưỡng, lưu DB | Xử lý bất đồng bộ & retry tự động khi xảy ra lỗi tạm thời |
| **MongoDB** | MongoDB 5.0+ | Lưu trữ chính cho events, alerts, devices | Persist dữ liệu, query nhanh với indexes theo deviceId + timestamp |
| **Redis + BullMQ** | Redis 5.3+ + BullMQ 4.10+ | Message queue & cache | Decouple producer (API) từ consumer (Worker) để scale ngang |
| **WebSocket (Socket.io)** | Socket.io 4.7 | Real-time broadcast | Thay thế polling → update dashboard ngay lập tức khi có alert mới |
| **Dashboard** | Next.js 14 + React | UI giám sát & xử lý cảnh báo | Visualization alerts trên map, table, metrics chart |
| **Prometheus + Grafana** | Prometheus 2.51 + Grafana 10.4 | Monitoring hệ thống | Collect & visualize metrics (CPU, memory, latency) để detect performance issue |
| **Nginx** (tuỳ chọn) | Nginx | Reverse proxy | Rate limit, HTTPS termination, load balance |

---

## 3. Luồng xử lý sự kiện

```
┌──────────────────┐
│  Thiết bị / API  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│  API Gateway (Port 3000)                         │
│  1. Validate x-api-key header (F1)               │
│  2. Validate event schema (deviceId, metrics)    │
│  3. Rate limit by IP (E4)                        │
│  4. Enqueue job vào Redis                        │
│  5. Trả về 202 Accepted ngay                     │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Redis Queue (BullMQ)                            │
│  - Đợi Worker consume                            │
│  - Retry tự động (exponential backoff)           │
│  - Failed jobs → Dead Letter Queue (DLQ)         │
└────────┬─────────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────────┐
│  Worker Service                                  │
│  1. Fetch job từ queue                           │
│  2. Save event vào MongoDB.events                │
│  3. Detect anomaly (ThresholdDetector):          │
│     - latency > 200ms → type: latency, HIGH      │
│     - packetLoss > 5% → type: packet_loss, HIGH  │
│     - signalStrength < -90 dBm → type: signal, MEDIUM │
│  4. Nếu anomaly: create Alert → MongoDB.alerts   │
│  5. Emit `alert:new` qua WebSocket               │
└────────┬─────────────────────────────────────────┘
         │
         ├────────────────────────┬────────────────┤
         │                        │                │
         ▼                        ▼                ▼
    ┌─────────┐            ┌──────────┐     ┌──────────┐
    │MongoDB  │            │WebSocket │     │Prometheus│
    │.events  │            │.alerts   │     │/metrics  │
    │.alerts  │            │(realtime)│     │(scrape)  │
    └─────────┘            └──────────┘     └──────────┘
                                  │
                                  ▼
                        ┌────────────────────┐
                        │ Dashboard (Nextjs) │
                        │ - Map visualization│
                        │ - Alert table      │
                        │ - Metrics charts   │
                        └────────────────────┘
```

---

## 4. Luồng Real-time (WebSocket)

- **EventsGateway** broadcast `alert:new`, `alert:acknowledged`, `alert:resolved` tới `/alerts` namespace
- **AlertsGateway** broadcast `event:processed`, `device:status:changed` tới `/events` namespace  
- **Periodic emissions**: `queue:depth`, `worker:stats` gửi mỗi 10s để client update monitoring UI
- **Vấn đề giải quyết**: Không cần polling → latency < 500ms từ khi alert tạo đến khi display lên dashboard

---

## 5. Tầng dữ liệu (MongoDB)

| Collection | TTL | Mục đích | Query chính |
|-----------|-----|---------|-------------|
| `events` | 30 ngày | Raw telemetry | `find({deviceId, createdAt})` + `findRecent()` |
| `alerts` | Vô hạn | Alert history | `find({status, severity, createdAt})` + `alertHistory()` |
| `devices` | Derived | Device list | `distinct(deviceId)` từ events |
| `api_keys` | Vô hạn | Auth secrets | `findOne({key})` |

**Indexes được tạo**:
```javascript
// events
db.events.createIndex({ deviceId: 1, timestamp: -1 })
db.events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 60*60*24*30 }) // TTL

// alerts  
db.alerts.createIndex({ status: 1, severity: 1, createdAt: -1 })
db.alerts.createIndex({ createdAt: -1 })
```

---

## 6. Khả năng mở rộng (Scalability)

| Chiều | Cách scaling | Chi tiết |
|------|------------|---------|
| **Ingest API** | Horizontal (add replicas) | BullMQ queue là bottleneck, không phải API |
| **Processing** | Horizontal (add Worker pods) | Worker consume độc lập từ queue |
| **Database** | Vertical (bigger MongoDB) + sharding | Shard theo `deviceId` nếu >100M docs/month |
| **Cache** | Redis Cluster | Backup Redis nếu queue là SPoF |
| **WebSocket** | Redis adapter (socket.io) | Broadcast qua Redis Channel để sync tất cả instances |

---

## 7. Độ tin cậy (Reliability)

| Cơ chế | Cách triển khai | Vấn đề giải quyết |
|-------|-----------------|------------------|
| **Retry tự động** | BullMQ exponential backoff | Xử lý timeout/network blip (1-3 lần) |
| **Dead Letter Queue** | Failed jobs → `dlq_*` queue | Track sự cố xử lý để manual replay sau |
| **Health checks** | Liveness + readiness probes | Kubernetes/Docker orchestration know when to restart |
| **Graceful shutdown** | SIGTERM handler | Drain in-flight jobs trước khi kill process |
| **Rate limiting** | Redis-backed sliding window | Chống DDoS & sử dụng quá mức (E4) |
| **Correlation ID** | Propagate qua all logs (F4) | Trace request xuyên suốt để debug production |

---

## 8. Bảo mật

| Lớp | Cơ chế | Vấn đề giải quyết |
|---|----|------|
| **Authentication** | x-api-key header (F1) | Chỉ có thiết bị được phép mới enqueue events |
| **CORS** | Env-controlled origin (M8 Medium 7) | Dashboard chỉ access từ domain được phép |
| **Database Auth** | MongoDB username/password (M8 Critical 2) | Chỉ API/Worker credential mới connect tới DB |
| **Port binding** | Prod compose không expose 27017/6379 | MongoDB/Redis chỉ accessible từ bên trong network |
| **Environment secrets** | .env file (không commit) | Credentials không lộ trong git |
| **Logging** | Structured JSON (no passwords) | Logs safe để review & debug |

---

## 9. Monitoring & Observability

### Prometheus Metrics (prom-client)

- `nodejs_process_cpu_seconds_total` — CPU time
- `nodejs_heap_used_bytes` — Memory usage
- `http_requests_duration_ms` — API latency histogram
- `queue_job_processing_duration_ms` — Worker processing time

### Grafana Dashboards

- System health (CPU, Memory, Disk)
- API latency (avg, P95, P99)
- Queue depth (events in backlog)
- Alert rate (alerts created/min)

### Logs

- Structured JSON format (timestamp, level, message, context)
- Fields: `correlationId`, `userId`, `deviceId` để cross-reference
- Rotation & retention theo môi trường

---

## 10. Topology Triển Khai

### Local Development
```
[Docker Compose]
├── api-gateway:3000
├── dashboard:3001
├── worker-service
├── simulator
├── mongodb:27017 (exposed for testing)
├── redis:6379 (exposed for testing)
├── prometheus:9090
├── grafana:3000/grafana
└── node-exporter:9100
```

### Production
```
[Kubernetes / Docker Swarm]
├── api-gateway (2-3 replicas)
├── worker-service (2-4 replicas)
├── dashboard (1 replica)
├── mongodb (replica set, not exposed)
├── redis (sentinel/cluster, not exposed)
├── nginx (ingress + TLS termination)
├── prometheus (1 replica, internal)
└── grafana (1 replica, internal)
```

---

**Cập nhật**: 04/05/2026  
**Status**: ✅ Production-ready (Milestone 8 complete)
