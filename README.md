<p align="center">
  <h1 align="center">🛰️ SignalOps</h1>
  <p align="center">
    Hệ thống giám sát chất lượng mạng viễn thông theo thời gian thực
    <br />
    <a href="docs/ARCHITECTURE.md"><strong>Kiến trúc</strong></a> •
    <a href="docs/API.md"><strong>API</strong></a> •
    <a href="docs/DEPLOYMENT.md"><strong>Triển khai</strong></a> •
    <a href="docs/OPERATIONS.md"><strong>Vận hành</strong></a> •
    <a href="docs/CONTRIBUTING.md"><strong>Đóng góp</strong></a> •
    <a href="docs/PERFORMANCE_TESTING.md"><strong>Performance Test</strong></a>
  </p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/node-%3E%3D18-brightgreen" alt="Node">
  <img src="https://img.shields.io/badge/nestjs-10-red" alt="NestJS">
  <img src="https://img.shields.io/badge/typescript-5-blue" alt="TypeScript">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License">
  <img src="https://img.shields.io/badge/status-production--ready-brightgreen" alt="Status">
</p>

---

## 🎯 Giới thiệu

**SignalOps** giám sát chất lượng mạng viễn thông thời gian thực: thu thập telemetry từ thiết bị (latency, packet loss, signal strength) → phát hiện bất thường tự động → cảnh báo realtime → hiển thị trên dashboard interaktif.

**Vấn đề giải quyết**: 
- 📡 Biết ngay trạm nào **phản hồi chậm** / **mất gói** / **tín hiệu yếu**
- 🗺️ Visualize vị trí sự cố trên **bản đồ tương tác**
- 👥 Xác định **rõ người xử lý** & ghi chú **cách khắc phục**
- 📊 Track **lịch sử cảnh báo** & tạo **báo cáo hàng ngày**

---

## ⚡ Quick Start (Local)

```bash
# 1. Clone & setup
git clone <your-repo> && cd signalops
cp .env.example .env

# 2. Cài đặt & build
npm install && npm run build

# 3. Khởi động stack (Docker required)
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d

# 4. Mở browser
# API: http://localhost:3000/api/health
# Dashboard: http://localhost:3001
# Swagger: http://localhost:3000/api/docs
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3000/grafana (admin:admin123)

# 5. Kiểm thử
npm run test:integration           # Unit + integration tests
PERF_TEST_CLIENTS=10 npm run perf:websocket  # WebSocket test
```

Dừng stack:
```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml down
```

---

## 📚 Tài Liệu Chi Tiết

| Tài liệu | Nội dung | Khi nào cần |
|---------|---------|-----------|
| [**ARCHITECTURE.md**](docs/ARCHITECTURE.md) | Thiết kế hệ thống, các component, luồng xử lý, khả năng mở rộng | Hiểu architecture & design decisions |
| [**API.md**](docs/API.md) | Tất cả REST endpoints, WebSocket events, schema request/response | Viết client hoặc integrate API |
| [**DEPLOYMENT.md**](docs/DEPLOYMENT.md) | Setup local, production checklist, Docker config, CI/CD pipeline | Triển khai environment bất kỳ |
| [**OPERATIONS.md**](docs/OPERATIONS.md) | Quy trình xử lý cảnh báo, cách khắc phục từng loại sự cố, DLQ handling | Vận hành hàng ngày |
| [**CONTRIBUTING.md**](docs/CONTRIBUTING.md) | Hướng dẫn dev, code style, test requirements, pull request flow | Đóng góp code |
| [**PERFORMANCE_TESTING.md**](docs/PERFORMANCE_TESTING.md) | Load test, soak test, WebSocket broadcast test, CI/CD integration | Verify hiệu năng trước deploy |

---

## 🏗️ Kiến Trúc Nhanh

```
Event Source (thiết bị/simulator)
         ↓
   API Gateway (port 3000)
   - Validate x-api-key
   - Enqueue → Redis queue
   - Return 202 Accepted
         ↓
   Worker Service (BullMQ consumer)
   - Fetch từ queue
   - Detect anomaly → Create Alert
   - Save → MongoDB
   - Emit → WebSocket
         ↓
   Dashboard (Next.js, port 3001)
   - Map visualization
   - Alert table + metrics
   - Real-time update via WebSocket
         ↓
   Monitoring (Prometheus + Grafana)
   - Metrics collection
   - Health & performance dashboard
```

**Công nghệ stack**: NestJS 10 | Express | Next.js 14 | React | MongoDB 5 | Redis 5 | BullMQ 4 | Socket.io 4 | TypeScript 5

---

## ✅ Tính Năng

- ✅ **Event Ingestion** — API endpoint với API Key auth & rate limiting
- ✅ **Threshold Detection** — Phát hiện latency >200ms, packet loss >5%, signal <-90dBm
- ✅ **Real-time Alerts** — WebSocket broadcast <500ms từ event tới dashboard
- ✅ **Interactive Dashboard** — Bản đồ, bảng cảnh báo, metrics chart, dark mode
- ✅ **Alert Management** — Xác nhận, xử lý, lưu ghi chú & người thực hiện
- ✅ **Monitoring Stack** — Prometheus + Grafana + Node Exporter
- ✅ **Performance Test** — Load, soak, WebSocket broadcast harness sẵn dùng
- ✅ **Production-Ready** — Health checks, graceful shutdown, structured logging, correlation ID tracing
- ✅ **100% Tiếng Việt** — UI & docs toàn bộ tiếng Việt

---

## 📊 Test Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| API Gateway | 91.44% | ✅ Pass |
| Worker Service | 96.96% | ✅ Pass |
| Integration Tests | E2E flow verified | ✅ Pass |
| Build & Lint | 0 errors, 0 warnings | ✅ Pass |
| Performance (probe) | 5 requests @ 46req/s, 2 WebSocket clients @ 100% delivery | ✅ Pass |

---

## 🚀 Deployment

### Local Development
```bash
npm run build
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d
```

### Staging / Production
Xem [DEPLOYMENT.md](docs/DEPLOYMENT.md) → **Triển khai Production** section:
- Health checks, graceful shutdown
- Environment validation on startup
- MongoDB authentication, CORS control
- API Key security, rate limiting
- Docker resource limits

### CI/CD (Jenkins)
- Jenkinsfile định nghĩa pipeline: checkout → build → test → docker build → docker push → health verify
- Performance harness ready: `npm run perf:load`, `npm run perf:websocket`
- Xem [PERFORMANCE_TESTING.md](docs/PERFORMANCE_TESTING.md) để chạy automation

---

## 📝 Cấu Hình

Copy `.env.example` → `.env` và điều chỉnh:

```env
# App
NODE_ENV=development
API_KEY=your-secret-key                    # Event ingestion auth
CORS_ORIGIN=http://localhost:3001          # Dashboard origin

# Database
MONGODB_URI=mongodb://user:pass@mongodb:27017/signalops
MONGODB_PASSWORD=mongo123

# Cache & Queue
REDIS_URL=redis://redis:6379

# Server ports
API_GATEWAY_PORT=3000
DASHBOARD_PORT=3001

# Monitoring
PROMETHEUS_PORT=9090
GRAFANA_PORT=3000
GRAFANA_ADMIN_PASSWORD=admin12345
```

---

## 📞 Hỗ Trợ

- **Bug report**: GitHub Issues
- **Feature request**: GitHub Discussions
- **Questions**: See [OPERATIONS.md](docs/OPERATIONS.md) troubleshooting section

---

## 📄 Thông Tin Dự Án

- **Status**: ✅ Production-ready (Milestone 1-8 complete)
- **Last updated**: 04/05/2026
- **License**: MIT
- **Team**: 2-3 developers (Milestones 1-8)
- **Next phase**: M9 (P0: reliability hardening, P1: observability improvements)
  A[Alert mới] --> B[Acknowledge]
  B --> C[Điều tra]
  C --> D{OK?}
  D -- Chưa --> C
  D -- Rồi --> E[Resolve]
  E --> F[Realtime]
```

### Project hỗ trợ người xử lý như thế nào?

- Hiển thị chi tiết cảnh báo: thiết bị, vị trí, mức độ, thời gian tạo, người xác nhận, người xử lý
- Cho phép operator nhập tên khi `acknowledge` và khi `resolve`
- Lưu lại `acknowledgedBy`, `acknowledgedAt`, `resolvedBy`, `resolvedAt`, `resolutionNote`
- Chặn sai luồng trạng thái, ví dụ cảnh báo đã `resolved` thì không acknowledge lại được
- Đồng bộ realtime qua WebSocket để các màn hình khác thấy thay đổi ngay
- DLQ trong Settings giúp theo dõi các job lỗi nếu quá trình xử lý gặp vấn đề

---

## Các dịch vụ

| Dịch vụ | Vai trò | Cổng |
|---------|---------|------|
| **API Gateway** | Cổng tiếp nhận REST API, Swagger docs, WebSocket server | `:3000` |
| **Worker Service** | Xử lý nền, phát hiện bất thường, tạo cảnh báo | — |
| **Simulator** | Tạo dữ liệu telemetry mô phỏng từ thiết bị ảo | — |
| **Dashboard** | Giao diện Next.js: bản đồ, cảnh báo, biểu đồ | `:3001` |
| **MongoDB** | Lưu trữ events và alerts | `:27017` |
| **Redis** | Hàng đợi BullMQ + cache | `:6379` |
| **Nginx** | Reverse proxy (tùy chọn) | `:8080` |

---

## Công nghệ

**Backend:** NestJS · TypeScript · BullMQ · Socket.io · Winston  
**Dữ liệu:** MongoDB 7.0 · Redis 7.2  
**Frontend:** Next.js · React · Tailwind CSS · Leaflet · Recharts · Zustand  
**Hạ tầng:** Docker Compose · Jenkins · Nginx

## Phạm vi bản phát hành

**Trong phạm vi hiện tại:**
- Event ingestion pipeline: API Gateway → Redis queue → Worker
- Threshold-based alert generation và realtime dashboard
- REST API cho events, alerts, health, stats, devices
- Local orchestration bằng Docker Compose

**Ngoài phạm vi hiện tại:**
- IAM/multi-tenant auth production
- ML anomaly detection
- CI/CD hardening đầy đủ cho production rollout

**Tiêu chí thành công chính:**
- Service khởi động ổn định trong compose
- Event được nhận và xử lý bất đồng bộ
- Alert sinh ra đúng ngưỡng
- API truy vấn được dữ liệu events/alerts
- Realtime client nhận cập nhật ngay

---

## Bắt đầu nhanh

**Yêu cầu:** Node.js ≥ 18, Docker Desktop, npm

```bash
# Clone dự án
git clone https://github.com/lethien999/SignalOps.git
cd SignalOps

# Cài đặt dependencies
npm install

# Cấu hình môi trường
cp .env.example .env

# Chạy toàn bộ hệ thống
npm run docker:build
npm run docker:up
```

Kiểm tra hoạt động:

```bash
curl http://localhost:3000/api/health
# → { "status": "ok", "mongo": "connected", "redis": "connected" }
```

| Dịch vụ | URL |
|---------|-----|
| API Gateway | `http://localhost:3000` |
| Swagger UI | `http://localhost:3000/api/docs` |
| Dashboard | `http://localhost:3001` |
| Nginx proxy | `http://localhost:8080` |

---

## Giao diện Dashboard

Dashboard gồm 5 trang chính:

| Trang | Chức năng |
|-------|-----------|
| **Tổng quan** | Thẻ metric, bảng cảnh báo gần đây, sự kiện mới nhất, biểu đồ xu hướng |
| **Bản đồ** | Bản đồ Leaflet hiển thị vị trí thiết bị, tìm kiếm, chi tiết từng thiết bị |
| **Cảnh báo** | Quản lý toàn bộ cảnh báo: lọc, xác nhận, xử lý, **nhóm theo vị trí** |
| **Chỉ số** | Biểu đồ Latency, Packet Loss, Signal Strength, hiệu suất Worker |
| **Cài đặt** | Trạng thái kết nối, ngưỡng cảnh báo, thông tin hệ thống, gửi event thử |

**Tính năng mới:**
- 🌙 **Dark Mode** — Chuyển đổi sáng/tối với nút toggle trên header
- 📝 **Nhập tên operator** khi xác nhận/xử lý cảnh báo
- 📊 **Nhóm theo vị trí** — Xem cảnh báo gộp theo khu vực với badge đếm

---

## Ngưỡng cảnh báo

| Chỉ số | Điều kiện | Mức độ | Ý nghĩa |
|--------|-----------|--------|---------|
| Latency | > 200ms | 🔴 HIGH | Phản hồi chậm, ảnh hưởng trải nghiệm |
| Packet Loss | > 5% | 🔴 HIGH | Mất dữ liệu, cuộc gọi bị đứt |
| Signal Strength | < −90 dBm | 🟡 MEDIUM | Tín hiệu yếu, vùng phủ sóng kém |

Tất cả ngưỡng có thể cấu hình qua biến môi trường trong `.env`.

---

## API

```
POST   /api/events           Tạo sự kiện mới (trả 202 Accepted)
GET    /api/events            Danh sách sự kiện (phân trang, lọc theo deviceId, ngày)
GET    /api/events/:id        Chi tiết sự kiện

GET    /api/alerts            Danh sách cảnh báo (lọc theo severity, status)
GET    /api/alerts/:id        Chi tiết cảnh báo
GET    /api/alerts/history    Lịch sử cảnh báo theo ngày (?days=7)
PATCH  /api/alerts/:id        Cập nhật trạng thái (open → acknowledged → resolved)
POST   /api/alerts/batch      Batch xác nhận/xử lý nhiều cảnh báo

GET    /api/devices           Danh sách thiết bị (derive từ events)

GET    /api/health            Kiểm tra sức khỏe hệ thống (version, memory, deps)
GET    /api/stats             Thống kê tổng hợp
```

Tham khảo đầy đủ: [docs/API.md](docs/API.md)

## Tích hợp dữ liệu thực tế

Thiết bị hoặc hệ thống NMS chỉ cần gửi `HTTP POST /api/events` với JSON gồm `deviceId`, `location`, `metrics`.

Ví dụ tối giản:

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "deviceId": "bts-hcm-01",
    "location": { "lat": 10.77, "lng": 106.70, "name": "Trạm Q1 HCM" },
    "metrics": { "latency": 250, "packetLoss": 8, "signalStrength": -95 }
  }'
```

Xem chi tiết format và adapter mẫu tại [docs/API.md](docs/API.md).

---

## WebSocket (Realtime)

Kết nối tới `ws://localhost:3000` bằng Socket.io client.

| Event | Mô tả |
|-------|-------|
| `alert:new` | Cảnh báo mới được tạo |
| `alert:acknowledged` | Cảnh báo đã được xác nhận |
| `alert:resolved` | Cảnh báo đã được xử lý |
| `event:processed` | Sự kiện xử lý xong |
| `device:status:changed` | Thiết bị thay đổi trạng thái |
| `queue:depth` | Độ sâu hàng đợi (định kỳ) |
| `worker:stats` | Thống kê hiệu suất Worker |

---

## Cấu trúc dự án

```
SignalOps/
├── apps/
│   ├── api-gateway/         # Cổng HTTP + WebSocket
│   ├── worker-service/      # Xử lý nền + phát hiện bất thường
│   ├── simulator/           # Tạo dữ liệu telemetry mô phỏng
│   └── dashboard/           # Giao diện Next.js
├── libs/
│   ├── common/              # Tiện ích dùng chung, logger, constants
│   └── models/              # Schemas, DTOs, interfaces
├── infrastructure/
│   ├── docker-compose.yml   # Cấu hình production
│   ├── docker-compose.dev.yml # Cấu hình dev (hot reload)
│   ├── Dockerfile.*         # Dockerfile cho từng service
│   ├── nginx/               # Cấu hình reverse proxy
│   └── monitoring/          # Prometheus + Grafana config
├── scripts/                 # Backup, công cụ dev, xác minh API/WebSocket
├── Jenkinsfile              # CI/CD pipeline
└── docs/                    # Tài liệu kiến trúc, API, triển khai
```

## Quy ước Git

- Quy ước chi tiết: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)
- Tóm tắt: mỗi feature/fix/hotfix phải có branch riêng, branch mới tách từ nhánh ổn định, và không commit trực tiếp lên `main`
- Commit cần rõ nghĩa theo kiểu `type(scope): summary`, tránh message chung chung

---

## Lệnh Docker

```bash
# Production (cần build lại khi sửa code)
npm run docker:build     # Build tất cả images
npm run docker:up        # Khởi động hệ thống
npm run docker:logs      # Xem logs
npm run docker:down      # Dừng hệ thống
```

---

## CI/CD (Jenkins)

[`Jenkinsfile`](Jenkinsfile) định nghĩa pipeline đầy đủ:

**Checkout → Install → Build → Lint → Test → Xác minh API → Kiểm tra logs → Docker Build & Tag**

- Chạy unit tests với yêu cầu coverage
- Khởi động hệ thống và xác minh API endpoints qua smoke tests
- Quét logs container tìm lỗi nghiêm trọng (FATAL, OOM, unhandled rejections)
- Tag Docker images với commit SHA trên nhánh `main`

---

## Giám sát (Monitoring)

```bash
# Khởi động Prometheus + Grafana + Node Exporter
docker compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d
```

| Dịch vụ | URL |
|---------|-----|
| Prometheus | `http://localhost:9090` |
| Grafana | `http://localhost:3003` (admin/signalops2026) |
| Node Exporter | `http://localhost:9100` |

---

## Bảo mật

- **API Key**: Đặt biến `API_KEY` trong `.env` → mọi request POST cần header `x-api-key`
- **Rate Limiting**: Giới hạn 100 req/phút/IP (cấu hình qua `RATE_LIMIT_MAX`)
- **Correlation ID**: Mỗi request được gán UUID duy nhất trong header `x-correlation-id`
- **Env Validation**: Kiểm tra biến môi trường bắt buộc khi khởi động

---

## Kiểm thử

```bash
# Unit tests
npm test

# Xác minh API endpoints
npm run verify:api

# Xác minh WebSocket
npm run verify:websocket
```

Kiểm tra thủ công:

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "deviceId": "device-01",
    "location": { "lat": 10.77, "lng": 106.70, "name": "HCM-Tower-1" },
    "latency": 250,
    "packetLoss": 8,
    "signalStrength": -95
  }'
```

---

## Tài liệu

| Tài liệu | Nội dung |
|-----------|----------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Thiết kế hệ thống và luồng dữ liệu |
| [API.md](docs/API.md) | Tham khảo REST API & WebSocket |
| [OPERATIONS.md](docs/OPERATIONS.md) | Quy trình vận hành và xử lý cảnh báo |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Hướng dẫn triển khai & rollback |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Quy trình phát triển & quy tắc |

---

## Giấy phép

[MIT](LICENSE) © 2026 Lê Anh Thiện
