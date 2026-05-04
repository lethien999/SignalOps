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

**SignalOps** giám sát chất lượng mạng viễn thông **thời gian thực** (trong vài mili giây):
1. Thu thập **telemetry** (dữ liệu đo đạc) từ thiết bị:
   - **Latency** = thời gian phản hồi (ms) — nếu > 200ms thì **chậm**
   - **Packet Loss** = % gói dữ liệu bị mất — nếu > 5% thì **có lỗi truyền**
   - **Signal Strength** = độ mạnh tín hiệu (dBm) — nếu < −90 dBm thì **tín hiệu yếu**
2. **Phát hiện bất thường** tự động (so sánh với ngưỡng)
3. **Cảnh báo realtime** (gửi ngay tức thì, không chờ)
4. Hiển thị trên **dashboard interaktif** (bản đồ, bảng, biểu đồ)

**Vấn đề giải quyết**: 
- 📡 Biết **ngay** trạm nào có sự cố (không phải chờ report thủ công hay gọi điện)
- 🗺️ **Nhìn trực quan** trên bản đồ — vị trí sự cố ở đâu, mức độ thế nào
- 👥 **Ghi rõ** ai xác nhận, ai xử lý, ghi chú cách khắc phục — tránh lỗi quên
- 📊 **Lưu lịch sử** tất cả cảnh báo — giúp phân tích xu hướng & xuất báo cáo

---

## ⚡ Quick Start (Local)

```bash
# 1. Clone & setup
git clone <your-repo> && cd signalops
cp .env.example .env

# 2. Cài đặt & build (npm = package manager cho JavaScript)
npm install && npm run build

# 3. Khởi động stack (Docker = container — gói ứng dụng + môi trường, chạy cô lập)
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d
# docker compose = công cụ khởi động nhiều container cùng lúc (API, DB, Cache, etc.)

# 4. Mở browser
# API: http://localhost:3000/api/health (kiểm tra hệ thống hoạt động bình thường không)
# Dashboard: http://localhost:3001 (giao diện chính — xem cảnh báo, bản đồ, quản lý)
# Swagger: http://localhost:3000/api/docs (tài liệu API + test endpoint)
# Prometheus: http://localhost:9090 (lưu trữ metrics — CPU, memory, request count, etc.)
# Grafana: http://localhost:3000/grafana (vẽ biểu đồ đẹp từ Prometheus metrics + cấu hình alert)

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
Thiết bị / Simulator (gửi dữ liệu)
         ↓
   API Gateway (port 3000) — Cổng tiếp nhận
   ├─ Validate x-api-key (xác thực ai gửi)
   ├─ Enqueue → Redis queue (đẩy vào hàng chờ)
   └─ Return 202 Accepted (trả lời "nhận được, xử lý sau")
         ↓
   Worker Service (BullMQ consumer) — Công nhân xử lý
   ├─ Fetch từ queue (lấy công việc từ hàng chờ)
   ├─ Detect anomaly → Create Alert (so sánh với ngưỡng, phát hiện lỗi)
   ├─ Save → MongoDB (lưu vào database)
   └─ Emit → WebSocket (gửi realtime tới dashboard)
         ↓
   Dashboard (Next.js, port 3001) — Giao diện người dùng
   ├─ Map visualization (bản đồ Leaflet)
   ├─ Alert table + metrics (bảng cảnh báo + biểu đồ)
   └─ Real-time update via WebSocket (cập nhật tức thì, không cần F5)
         ↓
   Monitoring (Prometheus + Grafana) — Giám sát hệ thống
   ├─ Metrics collection (lưu CPU, memory, request count, etc.)
   └─ Health & performance dashboard (vẽ biểu đồ + cấu hình alert)
```

**Công nghệ stack**:
- **Backend**: NestJS 10 (framework), Express (HTTP server) — viết bằng TypeScript (safer than JavaScript)
- **Frontend**: Next.js 14 (web framework), React (UI library) — xây dựng giao diện
- **Database**: MongoDB 5 (lưu events, alerts) — NoSQL database (linh hoạt hơn SQL)
- **Cache/Queue**: Redis 5 (lưu bộ nhớ) + BullMQ 4 (quản lý hàng chờ) — xử lý bất đồng bộ
- **Realtime**: Socket.io 4 (WebSocket server) — gửi dữ liệu ngay tức thì tới client
- **Language**: TypeScript 5 — JavaScript có type checking (bắt lỗi sớm)

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

| Dịch vụ | Vai trò | Cổng | Giải thích chi tiết |
|---------|---------|------|------------------|
| **API Gateway** | Cổng tiếp nhận REST API, Swagger docs, WebSocket server | `:3000` | **Cửa chính** hệ thống — thiết bị gửi dữ liệu vào đây, Swagger docs để test API, WebSocket để gửi realtime |
| **Worker Service** | Xử lý nền, phát hiện bất thường, tạo cảnh báo | — | **Công nhân nền** — lấy công việc từ queue, so sánh dữ liệu với ngưỡng, phát hiện lỗi, tạo cảnh báo |
| **Simulator** | Tạo dữ liệu telemetry mô phỏng từ thiết bị ảo | — | **Thiết bị giả lập** — khi không có thiết bị thực, dùng cái này để test hệ thống |
| **Dashboard** | Giao diện Next.js: bản đồ, cảnh báo, biểu đồ | `:3001` | **Giao diện chính** — bạn dùng cái này để xem cảnh báo, quản lý, xác nhận, xử lý |
| **MongoDB** | Lưu trữ events và alerts | `:27017` | **Kho lưu trữ** — database lưu tất cả dữ liệu vĩnh viễn (events, alerts, users, etc.) |
| **Redis** | Hàng đợi BullMQ + cache | `:6379` | **Bộ nhớ nhanh** — lưu hàng chờ công việc + cache dữ liệu hay dùng (để truy cập nhanh hơn) |
| **Nginx** | Reverse proxy (tùy chọn) | `:8080` | **Lối vào thứ 2** (production) — người ngoài truy cập vào cổng 8080, Nginx chuyển tiếp tới API/Dashboard |
| **Prometheus** | Lưu trữ metrics (CPU, memory, requests) | `:9090` | **Kho dữ liệu hiệu năng** — ghi lại CPU, memory, số request, queue depth theo thời gian |
| **Grafana** | Vẽ biểu đồ đẹp từ Prometheus metrics | `:3003` | **Bảng điều khiển hiệu năng** — xem biểu đồ CPU, memory, alert trends, cấu hình alert rules |

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

| Chỉ số | Ngưỡng cảnh báo | Mức độ | Ý nghĩa (người không tech) |
|--------|-----------|--------|----------|
| **Latency** (ms) | > 200ms | 🔴 HIGH | **Phản hồi > 0.2 giây** — cảm nhận bằng cách nhấn nút rồi chờ kết quả chậm, hoặc cuộc gọi VoIP bị hư |
| **Packet Loss** (%) | > 5% | 🔴 HIGH | **Mất > 5% gói dữ liệu** — 1 trong 20 gói không tới được → cuộc gọi bị đứt, video bị lag |
| **Signal Strength** (dBm) | < −90 dBm | 🟡 MEDIUM | **Tín hiệu yếu** — di chuyển quá xa trạm, hoặc bị tòa nhà che chắn → mất signal hoặc mạng 2G |

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

Ví dụ tối giản (giải thích từng dòng):

```bash
curl -X POST http://localhost:3000/api/events \    # Gửi dữ liệu mới (POST) tới cổng 3000
  -H "Content-Type: application/json" \             # Định dạng dữ liệu = JSON
  -H "x-api-key: <your-api-key>" \                 # Xác thực (như mật khẩu) — hệ thống biết bạn là ai
  -d '{                                              # Dữ liệu gửi đi
    "deviceId": "bts-hcm-01",                       # Tên thiết bị (trạm base station)
    "location": {                                    # Vị trí địa lý
      "lat": 10.77,                                 # Latitude (vĩ độ)
      "lng": 106.70,                                # Longitude (kinh độ)
      "name": "Trạm Q1 HCM"                         # Tên địa điểm (để người xem dễ nhận diện)
    },
    "metrics": {                                     # Các chỉ số đo đạc
      "latency": 250,                               # Thời gian phản hồi = 250 mili giây (cảnh báo vì > 200ms)
      "packetLoss": 8,                              # Mất 8% gói dữ liệu (cảnh báo vì > 5%)
      "signalStrength": -95                         # Tín hiệu = -95 dBm (cảnh báo vì < -90 dBm)
    }
  }'
```

Xem chi tiết format và adapter mẫu tại [docs/API.md](docs/API.md).

---

## WebSocket (Realtime — cập nhật tức thì)

**WebSocket** = kết nối hai chiều giữa client (browser) và server, dữ liệu đẩy ngay mà không cần client hỏi lại (khác với HTTP thông thường)

Kết nối tới `ws://localhost:3000` bằng Socket.io client.

**Các sự kiện realtime** (tức thì, <= 500ms):

| Sự kiện | Ý nghĩa | Ví dụ |
|--------|--------|-------|
| `alert:new` | **Cảnh báo mới** được phát hiện | Trạm BTS HCM-01 latency 250ms → cảnh báo mới, dashboard tự cập nhật |
| `alert:acknowledged` | Operator **xác nhận** sẽ xử lý | Anh Minh nhấn "Đã nhận" → lập tức thông báo cho team khác |
| `alert:resolved` | Cảnh báo **đã sửa xong** | Anh Minh sửa xong, nhấn "Resolve" → dashboard tự gỡ cảnh báo |
| `event:processed` | Sự kiện đã **xử lý xong** | Worker hoàn tất xử lý event từ simulator |
| `device:status:changed` | Trạm **thay đổi trạng thái** | Từ "online" → "offline" (mất signal) |
| `queue:depth` | **Số công việc** đang đợi (định kỳ) | Queue có 150 job đang chờ → cảnh báo nếu quá lâu |
| `worker:stats` | **Hiệu suất Worker** (định kỳ) | Xử lý 1000 event/phút, CPU 45%, memory 512MB |

---

## CẤU TRÚC DỰ ÁN

```
SignalOps/
├── apps/                           # Tùa ứng dụng (mỗi cái độc lập)
│   ├── api-gateway/                # API Gateway — cổng tiếp nhận event
│   ├── worker-service/             # Worker — xử lý bất thường, tạo alert
│   ├── simulator/                  # Simulator — tạo telemetry giả (test)
│   └── dashboard/                  # Dashboard — giao diện Web (Next.js)
├── libs/                           # Thư viện chung (dùng lại nhiều chỗ)
│   ├── common/                     # Utilities: logger, constants, etc.
│   └── models/                     # Schemas & interfaces (cấu trúc dữ liệu)
├── infrastructure/                 # Cấu hình chạy (Docker, Nginx, monitoring)
│   ├── docker-compose.yml          # Cấu hình production (chạy bao nhiêu container)
│   ├── docker-compose.dev.yml      # Cấu hình dev (chế độ hot reload)
│   ├── Dockerfile.*                # Dockerfile của từng dịch vụ (cách đóng gói)
│   ├── nginx/                      # Cấu hình reverse proxy (lối vào thứ 2)
│   └── monitoring/                 # Prometheus + Grafana config (giám sát hiệu năng)
├── scripts/                        # Công cụ helper (backup, kiểm tra)
│   ├── backup-mongodb.sh           # Sao lưu MongoDB
│   ├── verify-api.mjs              # Kiểm tra API hoạt động
│   └── verify-websocket.mjs        # Kiểm tra WebSocket hoạt động
├── Jenkinsfile                     # Pipeline tự động (build, test, deploy)
└── docs/                           # Tài liệu (kiến trúc, API, triển khai)
```

**Ý nghĩa cấu trúc**:
- **apps/**: Mỗi folder là một dịch vụ độc lập — có thể build, test, deploy riêng
- **libs/**: Code dùng chung — vì không muốn copy-paste, nên tách ra file chung
- **infrastructure/**: Cấu hình môi trường — "cách chạy" hệ thống
- **scripts/**: Các công cụ hỗ trợ — backup, kiểm tra, etc.

## QUY ƯỚC GIT

**Chi tiết chi tiết**: [docs/CONTRIBUTING.md](docs/CONTRIBUTING.md)

**Tóm tắt chi tiết**: 
- Mỗi feature/fix/hotfix phải có **branch riêng** (không commit trực tiếp lên `main`)
  - Ví dụ: `git checkout -b feature/new-alert-type` (tạo branch mới)
- **Commit message rõ** theo kiểu `type(scope): summary` (để những người khác hiểu bạn chỗ làm gì)
  - 👍 Ví dụ tốt: `fix(alert): add validation for packet loss > 100%`
  - ❌ Tệ: `fix`, `updated`, `oops`
- **Review**: Mỗi PR cần có thành viên khác review ưu tiên (để bắt lỗi sớm)

---

## LỆNH DOCKER

```bash
# Production (đòi cần build lại khi sửa code — Docker image = gói công nhân đóng sẵn để chạy)
npm run docker:build     # Build tất cả Docker images từ code tương ứng
npm run docker:up        # Khởi động từng container (API, DB, cache, etc.) đồng thời
npm run docker:logs      # Xem logs của từng container (để debug lỗi)
npm run docker:down      # Dừng tất cả hệ thống (xóa container nhưng giữ dữ liệu)
```

**Giải thích**: Docker giống như máy ảo nhỏ — mở cái này bản mã, cái này SQL, etc. để chạy cùng lúc mà không ảnh hưởng đến máy

---

## CI/CD (JENKINS — Tự Động Hóa Quy Trình)

[`Jenkinsfile`](Jenkinsfile) định nghĩa pipeline tự động (**CI/CD** = Continuous Integration/Deployment = tự động build, test, deploy khi có code mới):

```
Checkout code (lấy code mới từ GitHub)
         ↓
Install dependencies (cài đặt thư viện)
         ↓
Build (dịch TypeScript → JavaScript)
         ↓
Lint (đối ngặt code, tập chí code style)
         ↓
Unit Tests (Đối chắc không có bug từ code thay đổi)
         ↓
API Verification (kiểm tra API có chạy được không)
         ↓
Log Scanning (tìm ERROR trong logs)
         ↓
Docker Build & Tag (đóng gói code đã build thành Docker image)
         ↓
Docker Push (đẩy lên registry để deploy)
```

**Giải thích**: Jenkins là **máy đọ** — khi bạn push code lên GitHub, nó tự động build, test, và đẩy lên production, không cần người chạy lệnh bằng tay

---

## GIÁM SÁT (MONITORING) — Xuất Bảng Điều Khiển

```bash
# Khởi động Prometheus + Grafana + Node Exporter
# (Nài là cấu hình giám sát — theo dõi CPU, memory, requests)
docker compose -f infrastructure/monitoring/docker-compose.monitoring.yml up -d
```

**Có ba thằng:**
1. **Prometheus** (`http://localhost:9090`): Lưu trữ dữ liệu metric thời gian thực (CPU %, memory MB, request count, queue depth, etc.)
2. **Node Exporter** (`http://localhost:9100`): Đội giám sát — lấy metric với CPU, memory từ hệ thống
3. **Grafana** (`http://localhost:3003` / admin/signalops2026): Vẽ biểu đồ đẹp từ Prometheus data + cấu hình alert rules (đẩy cảnh báo khi CPU vượt 80%)

| Dịch vụ | URL | Dùng để gì |
|---------|-----|------------|
| **Prometheus** | `http://localhost:9090` | Lưu/truy vấn raw metrics (dữ liệu thô) |
| **Grafana** | `http://localhost:3003` | Vẽ biểu đồ đẹp + alert rules (dashboard đẹp) |
| **Node Exporter** | `http://localhost:9100` | Thu thập metrics từ máy (CPU, memory, disk) |

---

## Bảo mật

- **API Key**: Đặt biến `API_KEY` trong `.env` → mọi request POST cần header `x-api-key` (giống như mật khẩu để xác thực "ai gửi dữ liệu")
- **Rate Limiting**: Giới hạn 100 request/phút/IP (để tránh tấn công brute-force — gửi quá nhiều request cùng lúc)
- **Correlation ID**: Mỗi request được gán UUID duy nhất trong header `x-correlation-id` (để debug và theo dõi request khi gửi qua nhiều service)
- **Env Validation**: Kiểm tra biến môi trường bắt buộc khi khởi động (VD: không có API_KEY thì hệ thống không chạy)

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
