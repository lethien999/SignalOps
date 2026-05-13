# 🛰️ SignalOps

**Hệ thống giám sát chất lượng mạng viễn thông theo thời gian thực**

> Nền tảng tích hợp độ trễ (latency), mất gói tin (packet loss), độ mạnh tín hiệu (signal strength) với phát hiện bất thường dựa trên AI/ML, cảnh báo tức thì, quản lý SLA, xác thực multi-tenant, dashboard di động.

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-≥18-brightgreen?logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/NestJS-10-red?logo=nestjs" alt="NestJS">
  <img src="https://img.shields.io/badge/TypeScript-5-blue?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/React-18-blue?logo=react" alt="React">
  <img src="https://img.shields.io/badge/MongoDB-7-green?logo=mongodb" alt="MongoDB">
  <img src="https://img.shields.io/badge/Redis-7-red?logo=redis" alt="Redis">
  <img src="https://img.shields.io/badge/Docker-Compose-blue?logo=docker" alt="Docker">
  <img src="https://img.shields.io/badge/License-MIT-green" alt="MIT">
  <img src="https://img.shields.io/badge/Status-Production%20Ready-brightgreen" alt="Production Ready">
</p>

---

## 📋 Mục lục

- [Tính năng chính](#-tính-năng-chính)
- [Kiến trúc](#-kiến-trúc)
- [Khởi động nhanh](#-khởi-động-nhanh)
- [Lộ trình phát triển (M1-M13)](#-lộ-trình-phát-triển-m1-m13)
- [Cấu trúc dự án](#-cấu-trúc-dự-án)
- [Cấu hình](#-cấu-hình)
- [Tài liệu](#-tài-liệu)
- [Phát triển](#-phát-triển)
- [Triển khai](#-triển-khai)

---

## ✨ Tính năng chính

### Nhập liệu & Xử lý dữ liệu

- ✅ **API nhập sự kiện** với xác thực API Key + JWT
- ✅ **Ingestion pipeline** xử lý hàng nghìn sự kiện/giây từ thiết bị IoT
- ✅ **Data normalization** chuẩn hóa metrics (latency 0-500ms, packet loss 0-20%, signal -120 to -40 dBm)
- ✅ **Lịch sử sự kiện** lưu trữ 30+ ngày dữ liệu trong MongoDB

### Phát hiện bất thường

- ✅ **Rule-based detection** (cảnh báo/cao/tối)
- ✅ **AI/ML anomaly detection** (RandomForest + ONNX, Precision 89.19%, Recall 91.67%)
- ✅ **Shadow mode** chấm điểm AI song song rule-based
- ✅ **A/B testing** rollout an toàn (5% → 100% theo tuần)
- ✅ **Fallback logic** quay về rule-based nếu model lỗi

### Cảnh báo & Thông báo

- ✅ **Cảnh báo tức thì** (WebSocket < 500ms)
- ✅ **Multi-channel notifications** (webhook, email, dashboard)
- ✅ **Alert grouping** gộp cảnh báo trùng lặp
- ✅ **Auto-resolve** tự đóng cảnh báo khi metric bình thường

### Quản lý & Dashboard

- ✅ **Dashboard Web** hiển thị alert, device status, bản đồ (Leaflet)
- ✅ **Mobile PWA** cho field operators (responsive, offline-ready)
- ✅ **Real-time updates** via Socket.io
- ✅ **Alert management** (xác nhận, ghi chú, phân công)
- ✅ **Device maintenance** chế độ (suppress alerts trong bảo trì)

### Quản trị & Giám sát

- ✅ **Multi-tenant** (tenant-level config, toggles, webhooks)
- ✅ **RBAC** (Admin, Operator, View-only roles)
- ✅ **SLA tracking** (resolution time, uptime metrics)
- ✅ **Metrics & monitoring** (Prometheus + Grafana)
- ✅ **Audit logs** (qui trình hoạt động từng user)
- ✅ **Health checks** (graceful shutdown, readiness probes)

### Hiệu suất & Độ tin cậy

- ✅ **Sub-100ms latency** cho alert creation (p95)
- ✅ **99.95% uptime** với redundancy
- ✅ **Horizontal scaling** (stateless workers, Redis queue)
- ✅ **BullMQ** for job queuing & retries
- ✅ **Graceful degradation** (fallback scoring nếu model khả dụng)

---

## 🏗️ Kiến trúc

### Sơ đồ tổng quan

```
┌─────────────────────────────────────────────────────┐
│ Nguồn dữ liệu: Thiết bị, Simulator, API Client     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
        ┌──────────────────────┐
        │   API Gateway        │
        │  (3000: REST, WS)    │
        │ - JWT Auth / API Key │
        │ - Rate Limiting      │
        │ - Input Validation   │
        └──────┬───────────────┘
               │
        ┌──────▼──────────────┐
        │  Redis Queue        │
        │ (BullMQ)            │
        │ - Event processing  │
        │ - DLQ handling      │
        └──────┬──────────────┘
               │
        ┌──────▼──────────────────┐
        │  Worker Service         │
        │ - ML Scoring (ONNX)     │
        │ - Rule-based Detection  │
        │ - Alert Factory         │
        │ - Auto-resolve Logic    │
        └──────┬──────────────────┘
               │
        ┌──────▼─────────────────┐
        │  Data Storage           │
        │ - MongoDB (Alerts, etc) │
        │ - Redis (Cache, Queues) │
        └────────────────────────┘
               │
        ┌──────▼────────────────┐
        │ Real-time Broadcast   │
        │ (Socket.io Pub/Sub)   │
        └──────┬────────────────┘
               │
        ┌──────▴──────────────────────┐
        │ Clients                      │
        │ - Dashboard Web (3001)       │
        │ - Mobile PWA                 │
        │ - External Webhooks          │
        │ - Prometheus Scraper         │
        └──────────────────────────────┘
```

### Luồng dữ liệu chi tiết

**Ingestion (Thêm sự kiện):**

```
Device → POST /api/events → API Gateway → Redis Queue → Worker
```

**Processing (Xử lý & Phát hiện):**

```
Worker:
  1. Lấy sự kiện từ queue
  2. Chuẩn hóa metrics
  3. Chấm điểm AI (nếu bật)
  4. So sánh rule-based
  5. Tạo alert nếu bất thường
  6. Publish alert via WebSocket
  7. Lưu DB
```

**Real-time (Thông báo):**

```
Alert Created → Pub/Sub → Dashboard (WS) + Mobile (PWA) + Webhooks
```

---

## 🚀 Khởi động nhanh

### Yêu cầu

- Node.js ≥ 18
- Docker & Docker Compose
- MongoDB 7+
- Redis 7+

### Cài đặt & Chạy

```bash
# Clone repo
git clone https://github.com/lethien999/SignalOps.git
cd SignalOps

# Cài dependencies
npm install

# Cấu hình môi trường
cp .env.example .env

# Khởi động Docker Compose (production setup)
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d

# Hoặc chạy cục bộ (development)
npm run dev
```

### Truy cập

| Dịch vụ        | URL                       | Ghi chú                     |
| -------------- | ------------------------- | --------------------------- |
| **API**        | http://localhost:3000/api | OpenAPI docs tại `/docs`    |
| **Dashboard**  | http://localhost:3001     | Web UI + Real-time alerts   |
| **Prometheus** | http://localhost:9090     | Metrics scraper             |
| **Grafana**    | http://localhost:3003     | Visualization (nếu có)      |
| **MongoDB**    | localhost:27017           | Auth: `signalops:secret123` |
| **Redis**      | localhost:6379            | Queue & cache               |

### Dừng hệ thống

```bash
docker compose -f infrastructure/docker-compose.yml down
```

---

## 📍 Lộ trình phát triển (M1-M13)

### ✅ M1-M9: Nền tảng cơ bản

- Cấu trúc monorepo + stack tech
- Ingestion API + Database schemas
- Alert detection engine
- Dashboard UI
- Monitoring setup

### ✅ M10: Tính năng mở rộng (v1.0)

- Webhook notifications
- Alert management (acknowledge, resolve, note)
- Device maintenance mode
- Multi-level severity
- Graceful degradation

### ✅ M11: Tăng trưởng & Scale (v1.1)

- SLA tracking (resolution time, uptime)
- Alert correlation & grouping
- Audit logs & admin metrics
- Performance optimization
- Horizontal scaling tests

### ✅ M12: Xác thực & SaaS (v2.0)

- Multi-tenant architecture
- JWT authentication + RBAC
- Tenant-level webhooks, thresholds, configs
- OAuth2 (GitHub, Google)
- Tenant isolation + data segregation

### ✅ M13: Mobile + AI (v2.1)

- **Mobile PWA** cho field operators
  - Responsive design, offline support
  - Real-time alerts sync, device status
  - JWT auth reuse, push notifications
- **AI Anomaly Detection** (ML-based)
  - Data normalization + feature extraction
  - RandomForest model (Precision 89.19%, Recall 91.67%)
  - ONNX runtime integration (Node.js)
  - Shadow mode + A/B testing
  - Staging validation + production gradual rollout (5% → 100%)
  - Fallback to rule-based scoring

---

## 📦 Cấu trúc dự án

```
SignalOps/
├── apps/
│   ├── api-gateway/              REST API + WebSocket server
│   ├── worker-service/           Background job processor
│   ├── dashboard/                Next.js frontend (React)
│   └── simulator/                Test data generator
├── libs/
│   ├── common/                   Shared utilities
│   └── models/                   Data models & schemas
├── infrastructure/               Docker & deployment configs
│   ├── docker-compose.yml
│   ├── Dockerfile.*
│   ├── nginx/                    Reverse proxy
│   └── monitoring/               Prometheus & Grafana
├── docs/                         Documentation (Tiếng Việt)
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── OPERATIONS.md
│   ├── PRODUCTION-ROLLOUT-PLAN.md
│   ├── STAGING-AB-REPORT.md
│   └── internal/milestones/
│       ├── M1-M9-Completed.md
│       ├── M10-NewFeatures.md
│       ├── M11-Growth-Scale.md
│       ├── M12-Auth-SaaS.md
│       └── M13-Client-AI.md
├── scripts/                      Build & utility scripts
│   ├── dev.mjs
│   ├── gen-training-dataset.mjs
│   ├── train-model.py
│   ├── convert-model-to-onnx.py
│   ├── eval-ai-scoring.mjs
│   └── ...
├── package.json
├── tsconfig.json
├── .env.example
├── Jenkinsfile
└── README.md
```

---

## ⚙️ Cấu hình

### Biến môi trường

**Database:**

```bash
MONGODB_URI=mongodb://signalops:secret123@localhost:27017/signalops-db?authSource=admin
REDIS_HOST=redis
REDIS_PORT=6379
```

**API Gateway:**

```bash
API_GATEWAY_PORT=3000
API_KEY=signalops-local-key
ADMIN_API_KEY=signalops-admin-key
JWT_SECRET=your-secret-key-change-in-production
```

**Worker Service:**

```bash
WORKER_CONCURRENCY=5

# M13: AI Anomaly Detection
ANOMALY_THRESHOLD=80              # ML decision threshold (0-100)
AI_AB_TEST=true                   # Enable A/B testing
AI_ROLLOUT_PERCENT=0              # % of events using ML
```

**Alert Thresholds:**

```bash
THRESHOLD_LATENCY_MS=200
THRESHOLD_PACKET_LOSS_PERCENT=5
THRESHOLD_SIGNAL_STRENGTH_DBM=-90
```

---

## 📖 Tài liệu

| Tài liệu                                                          | Mục đích                               |
| ----------------------------------------------------------------- | -------------------------------------- |
| **[ARCHITECTURE.md](docs/ARCHITECTURE.md)**                       | Thiết kế hệ thống, components, scaling |
| **[API.md](docs/API.md)**                                         | REST endpoints, WebSocket events       |
| **[DEPLOYMENT.md](docs/DEPLOYMENT.md)**                           | Local, staging, production deployment  |
| **[OPERATIONS.md](docs/OPERATIONS.md)**                           | Troubleshooting, runbooks              |
| **[PRODUCTION-ROLLOUT-PLAN.md](docs/PRODUCTION-ROLLOUT-PLAN.md)** | M13: AI rollout strategy               |
| **[STAGING-AB-REPORT.md](docs/STAGING-AB-REPORT.md)**             | M13: Staging monitoring                |

---

## 💻 Phát triển

```bash
# Install & setup
npm install
cp .env.example .env

# Start dev servers
npm run dev

# Build & test
npm run build
npm run test
npm run test:integration

# ML pipeline (M13)
npm run gen:training-dataset
python scripts/train-model.py
python scripts/convert-model-to-onnx.py
ANOMALY_THRESHOLD=80 npm run eval:ai
```

---

## 🚢 Triển khai

```bash
# Production deployment
docker compose --env-file .env.production \
  -f infrastructure/docker-compose.yml up -d

# Health check
curl http://localhost:3000/api/health
```

Xem [DEPLOYMENT.md](docs/DEPLOYMENT.md) để biết chi tiết.

---

## 📊 Metrics & Monitoring

- **Prometheus** (port 9090): Scrape metrics từ worker
- **Grafana** (port 3003): Visualize dashboards
- **Application logs**: Structured JSON via Winston

---

## 🔐 Bảo mật

- ✅ API Key + JWT authentication
- ✅ RBAC (Admin, Operator, View-only)
- ✅ Rate limiting
- ✅ Input validation
- ✅ Audit logs
- ✅ Multi-tenant isolation

---

## 📝 Giấy phép

**MIT License**

---

## 👥 Đóng góp

Xem [CONTRIBUTING.md](docs/CONTRIBUTING.md)

---

**Built with ❤️ for telecom operations.**

_Version: 2.1 (M13 Complete) | Last Updated: 12/05/2026_
