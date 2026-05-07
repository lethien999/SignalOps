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

## Tổng quan

**SignalOps** là nền tảng giám sát chất lượng mạng theo thời gian thực cho cơ sở hạ tầng viễn thông. Hệ thống liên tục thu thập dữ liệu telemetry (độ trễ, mất gói tin, độ mạnh tín hiệu), phát hiện bất thường so với ngưỡng cấu hình, và gửi cảnh báo tức thì qua dashboard tương tác với trực quan hóa bản đồ.

---

## Khởi động nhanh

```bash
git clone https://github.com/lethien999/SignalOps.git
cd SignalOps

npm install
cp .env.example .env

docker compose --env-file .env -f infrastructure/docker-compose.yml up -d
```

**Truy cập:**
- API: http://localhost:3000/api/docs
- Dashboard: http://localhost:3001
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3003

Dừng hệ thống:
```bash
docker compose --env-file .env -f infrastructure/docker-compose.yml down
```

---

## Tài liệu

| Tài liệu | Mục đích |
|----------|---------|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Thiết kế hệ thống, các thành phần, luồng dữ liệu, khả năng mở rộng |
| [API.md](docs/API.md) | REST endpoints, WebSocket events, schemas |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md) | Cấu hình cục bộ, checklist production, CI/CD |
| [OPERATIONS.md](docs/OPERATIONS.md) | Xử lý cảnh báo, khắc phục sự cố, runbooks |
| [CONTRIBUTING.md](docs/CONTRIBUTING.md) | Hướng dẫn phát triển, chuẩn mã hóa |
| [PERFORMANCE_TESTING.md](docs/PERFORMANCE_TESTING.md) | Load testing, benchmark |

---

## Kiến trúc

```
Thiết bị/Simulator → API Gateway (cổng 3000)
                   ↓
               Redis Queue
                   ↓
            Worker Service
                   ↓
      MongoDB + WebSocket
                   ↓
Dashboard (cổng 3001) + Monitoring (Prometheus/Grafana)
```

---

## Tech Stack

**Backend:** NestJS · TypeScript · BullMQ · Socket.io  
**Frontend:** Next.js · React · Tailwind CSS · Leaflet · Zustand  
**Dữ liệu:** MongoDB · Redis  
**Hạ tầng:** Docker Compose · Nginx · Jenkins

---

## Tính năng

- ✅ API nhập liệu sự kiện với xác thực API Key
- ✅ Phát hiện bất thường dựa trên ngưỡng
- ✅ Cảnh báo realtime qua WebSocket (<500ms)
- ✅ Dashboard tương tác với bản đồ & chỉ số
- ✅ Quản lý cảnh báo (xác nhận, xử lý, ghi chú)
- ✅ Multi-level severity (cảnh báo/cao/tối)
- ✅ Giám sát stack (Prometheus + Grafana)
- ✅ Production-ready (health checks, graceful shutdown, structured logging)

---

## Cấu trúc dự án

```
apps/
  ├── api-gateway/          REST API, WebSocket server, nhập liệu sự kiện
  ├── worker-service/       Xử lý nền, phát hiện bất thường, tạo cảnh báo
  ├── simulator/            Tạo telemetry giả để test
  └── dashboard/            Giao diện Next.js
libs/
  ├── common/               Tiện ích chung, hằng số, logger
  └── models/               Schemas dữ liệu, TypeScript interfaces
infrastructure/
  ├── docker-compose.yml    Cấu hình production
  ├── Dockerfile.*          Docker images của các dịch vụ
  ├── nginx/                Cấu hình reverse proxy
  └── monitoring/           Cấu hình Prometheus & Grafana
docs/                       Tài liệu đầy đủ
```

---

## Cấu hình

Copy `.env.example` thành `.env`:

```env
NODE_ENV=production
API_KEY=your-secret-key
MONGODB_URI=mongodb://user:pass@mongodb:27017/signalops
REDIS_URL=redis://redis:6379
API_GATEWAY_PORT=3000
DASHBOARD_PORT=3001
```

---

## Cảnh báo

| Chỉ số | Ngưỡng | Mức độ |
|--------|--------|--------|
| Độ trễ | > 200ms | Cao |
| Mất gói tin | > 5% | Cao |
| Độ mạnh tín hiệu | < -90 dBm | Trung bình |

---

## Kiểm thử

```bash
npm run build
npm run test:integration
npm run perf:websocket
```

---

## Triển khai

**Phát triển:**
```bash
npm run build
docker compose -f infrastructure/docker-compose.dev.yml up
```

**Production:** Xem [DEPLOYMENT.md](docs/DEPLOYMENT.md)

---

## Hỗ trợ

- **Báo cáo lỗi:** [GitHub Issues](https://github.com/lethien999/SignalOps/issues)
- **Đề xuất tính năng:** [GitHub Discussions](https://github.com/lethien999/SignalOps/discussions)
- **Khắc phục sự cố:** [OPERATIONS.md](docs/OPERATIONS.md)

---

## Giấy phép

MIT
