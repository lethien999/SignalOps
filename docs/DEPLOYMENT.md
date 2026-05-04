# Hướng dẫn triển khai SignalOps

## Tổng quan

SignalOps được thiết kế để chạy local với Docker Compose hoặc trong luồng CI/CD Jenkins. Lưu ý kiến trúc hiện tại: không triển khai service `event-broker` độc lập; logic broker được tích hợp trong `api-gateway` (`EventBrokerService`).

---

## Yêu cầu

| Công cụ | Phiên bản | Mục đích | Vấn đề giải quyết |
|--------|---------|---------|------------------|
| Node.js | 18.x LTS | Runtime cho NestJS & Next.js | Đảm bảo tính tương thích với async/await, modern JS |
| npm/pnpm | 9.x+ | Package manager | Workspace monorepo support |
| Docker Desktop | 4.0+ | Container platform | Isolated environment, consistent across dev/staging/prod |
| Docker Compose | v2.0+ | Orchestration | Spin up multi-service stack trong 1 command |
| Git | Bất kỳ | Version control | Track changes, CI/CD trigger |

---

## Triển khai Local

### Bước 1: Chuẩn bị môi trường

```bash
# Clone repository
git clone <your-repo> signalops
cd signalops

# Copy .env.example → .env
cp .env.example .env

# Kiểm tra các biến cần thiết:
# - API_KEY (bất kỳ string, dùng cho auth)
# - MONGODB_URI (mặc định mongodb://user:pass@mongodb:27017/signalops)
# - REDIS_URL (mặc định redis://redis:6379)
# - NODE_ENV=development
```

**Vấn đề giải quyết**: Env validation ở startup (`env-validator.ts`) sẽ fail nếu thiếu biến bắt buộc → phát hiện config issue sớm.

### Bước 2: Cài đặt dependencies

```bash
npm install
```

**Vấn đề giải quyết**: Workspace lockfile (`package-lock.json`) đảm bảo reproducible builds → tránh "works on my machine" syndrome.

### Bước 3: Build & verify code

```bash
npm run build      # TypeScript compile + Next.js build
npm run lint       # ESLint check (0 errors, 0 warnings)
npm test           # Unit tests (coverage > 70%)
```

**Vấn đề giải quyết**: Compile/lint/test local trước deploy → fail fast, không phát hiện vấn đề ở prod.

### Bước 4: Khởi động Docker stack

```bash
# Dev mode (with hot reload, exposed ports for testing)
docker compose --env-file .env -f infrastructure/docker-compose.yml up -d

# Monitor services
docker compose ps

# Xem logs
docker compose logs -f api-gateway
```

**Vấn đề giải quyết**: Docker network isolate services & data → không conflict với port/process khác trên host.

### Bước 5: Kiểm tra sức khỏe

```bash
# Health check API
curl http://localhost:3000/api/health

# Dashboard
open http://localhost:3001

# Prometheus
open http://localhost:9090

# Grafana  
open http://localhost:3000/grafana (admin:admin123)
```

**Vấn đề giải quyết**: Health endpoint báo MongoDB/Redis status → không trial-and-error khi debug connection issue.

---

## Triển khai Monitoring Stack

```bash
# Riêng biệt stack để Prometheus scrape metrics
$env:GRAFANA_ADMIN_PASSWORD='your-secure-password'
docker compose --env-file .env -f infrastructure/monitoring/docker-compose.monitoring.yml up -d
```

**Vấn đề giải quyết**: Separate monitoring stack → không occupy app resources, có thể restart independently.

---

## Triển khai Production (không expose DB/Redis)

### Sử dụng docker-compose.prod.yml

```bash
# Production mode (no exposed DB/Redis ports)
docker compose --env-file .env \
  -f infrastructure/docker-compose.yml \
  -f infrastructure/docker-compose.prod.yml \
  up -d

# Verify: port 27017 & 6379 không bind ra host
docker compose ps | grep -E 'mongodb|redis'
# Should show: [no ports mapping]
```

**Vấn đề giải quyết**: Internal Docker network only → MongoDB/Redis không accessible từ bên ngoài → bảo vệ data (M8 Medium 5).

### Cấu hình CORS cho domain riêng

```bash
# .env
CORS_ORIGIN=https://yourdomain.com,https://www.yourdomain.com
NODE_ENV=production
```

**Vấn đề giải quyết**: Browser CORS policy chỉ allow request từ domain trong list → chống CSRF attacks.

### Cấu hình bí mật an toàn

```bash
# .env (hoặc lưu trong secrets manager)
MONGODB_PASSWORD=<use-random-generated>
API_KEY=<use-random-UUID>
GRAFANA_ADMIN_PASSWORD=<use-random-generated>
JWT_SECRET=<use-random-generated>
```

**Vấn đề giải quyết**: Secrets không hard-code → tránh bị leak khi git push hoặc container image bị public.

---

## Docker Images

| Dockerfile | Service | Base Image | Size |
|-----------|---------|-----------|------|
| `Dockerfile.api` | API Gateway | `node:18-alpine` | ~300MB |
| `Dockerfile.worker` | Worker Service | `node:18-alpine` | ~300MB |
| `Dockerfile.simulator` | Simulator | `node:18-alpine` | ~280MB |
| `Dockerfile.dashboard` | Dashboard | `node:18-alpine` multi-stage | ~150MB |

**Vấn đề giải quyết**: Alpine base → minimal image size, security patches cho OS packages, image pull nhanh.

---

## Cấu hình Docker Registry cho CI/CD

### 1. Setup Docker Registry Credentials (Jenkins)

```groovy
// Jenkinsfile environment
environment {
    REGISTRY = 'ghcr.io/your-org'  // Thay đổi theo registry của bạn
    REGISTRY_CRED = 'docker-registry'  // Jenkins credentials ID
}

// Docker login
docker login -u ${REGISTRY_USERNAME} -p ${REGISTRY_TOKEN} ${REGISTRY}
```

**Vấn đề giải quyết**: Registry credentials trong Jenkins secrets → không expose token trong Jenkinsfile source.

### 2. Docker Build & Push

```bash
# Tag images
docker build -t ${REGISTRY}/signalops-api-gateway:${VERSION} -f infrastructure/Dockerfile.api .
docker tag ${REGISTRY}/signalops-api-gateway:${VERSION} ${REGISTRY}/signalops-api-gateway:latest

# Push to registry
docker push ${REGISTRY}/signalops-api-gateway:${VERSION}
docker push ${REGISTRY}/signalops-api-gateway:latest
```

**Vấn đề giải quyết**: Multi-tag (version + latest) → easy rollback & latest deployment.

---

## Deployment Strategy (CI/CD Pipeline)

### Jenkins Pipeline Stages

| Stage | Action | Success Criteria | Rollback |
|-------|--------|-----------------|----------|
| **Checkout** | Pull latest code | No git errors | N/A |
| **Build** | npm install + npm run build | 0 TS errors | Abort pipeline |
| **Test** | npm run test + npm run test:integration | >70% coverage + all tests pass | Abort pipeline |
| **Docker Build** | Build & tag images | Image exists in local | Abort pipeline |
| **Docker Push** | Push to registry | Image accessible from registry | N/A |
| **Deploy** | Pull & run docker-compose | Health check pass | Rollback to previous version |
| **Verify** | Health check + smoke tests | API /health responds 200 | Rollback |

**Vấn đề giải quyết**: Automated verification ở mỗi stage → catch deployment issue trước user phát hiện.

### Rollback Procedure

```bash
# If deployment fails:
docker compose down
docker pull ${REGISTRY}/signalops-api-gateway:$(git describe --tags --abbrev=0 --exclude='*-prev')
docker compose up -d
```

**Vấn đề giải quyết**: Previous version vẫn accessible từ registry → quick rollback nếu cần.

---

## Lưu ý cho Production

### Security

- ✅ MongoDB auth enabled (không anonymous access)
- ✅ API Key authentication trên event endpoint (F1)
- ✅ Rate limiting per IP (E4)
- ✅ CORS restricted to known domain (M8 Medium 7)
- ✅ Environment secrets không commit vào git
- ✅ Kế hoạch HTTPS/TLS cho API & Dashboard (hardening)
  - Triển khai: terminate TLS tại Nginx hoặc Load Balancer, redirect HTTP → HTTPS.
  - Cấu hình: mount certificate (`fullchain.pem`, `privkey.pem`) qua secret/volume, không lưu trong repo.
  - Tiêu chí đạt: truy cập qua HTTPS thành công, không còn mixed-content trên dashboard.
  - Lệnh kiểm tra:
    ```bash
    curl -I https://yourdomain.com/api/health
    ```

### Operations

- ✅ Health check endpoint để orchestrator monitor
- ✅ Graceful shutdown (SIGTERM handler)
- ✅ Structured logging (JSON format)
- ✅ Correlation ID propagation (F4) cho cross-service tracing
- ✅ Kế hoạch OpenTelemetry tracing (hardening)
  - Triển khai: instrument API Gateway + Worker với OpenTelemetry SDK, xuất trace sang OTLP Collector.
  - Chuẩn hóa: propagate `traceparent` giữa API, queue worker và WebSocket emission.
  - Tiêu chí đạt: xem được distributed trace cho luồng `POST /api/events` → queue → worker → alert emit.
  - Lệnh kiểm tra:
    ```bash
    # Kiểm tra service có export trace tới collector
    docker compose logs -f api-gateway worker | grep -i "otel\|trace"
    ```

### Database

- ✅ MongoDB auth required
- ✅ Events TTL index (30 ngày)
- ✅ Alerts history archived
- ✅ Kế hoạch backup MongoDB hằng đêm (hardening)
  - Triển khai: dùng `scripts/backup-mongodb.sh` qua cron/Jenkins schedule, lưu backup vào object storage.
  - Chính sách: giữ bản backup hằng ngày 7 ngày, hằng tuần 4 tuần, hằng tháng 3 tháng.
  - Tiêu chí đạt: có log backup thành công + kiểm thử restore định kỳ (ít nhất 1 lần/tháng).
  - Lệnh kiểm tra:
    ```bash
    ls -lh /path/to/backup
    ```

### Monitoring

- ✅ Prometheus scrape metrics
- ✅ Grafana dashboard
- ✅ Node Exporter for system metrics
- ✅ Kế hoạch alert rules cho Prometheus/Grafana (hardening)
  - Triển khai rule tối thiểu:
    - API error rate cao (`5xx` tăng đột biến).
    - API latency P95 vượt ngưỡng trong 5 phút.
    - Queue depth vượt ngưỡng liên tục.
    - Worker restart hoặc container down.
  - Kênh cảnh báo: email/Slack/on-call webhook.
  - Tiêu chí đạt: test firing rule thành công và nhận cảnh báo ở kênh đích.
  - Lệnh kiểm tra:
    ```bash
    curl -s http://localhost:9090/api/v1/rules
    ```

### Lộ trình hardening đề xuất (ưu tiên theo thứ tự)

| Ưu tiên | Hạng mục | ETA đề xuất | Trạng thái |
|--------|----------|-------------|-----------|
| P1 | HTTPS/TLS + redirect HTTP | 0.5-1 ngày | Sẵn sàng triển khai |
| P1 | Alert rules cơ bản (API/queue/worker) | 0.5-1 ngày | Sẵn sàng triển khai |
| P2 | Backup schedule + restore drill | 1 ngày | Sẵn sàng triển khai |
| P2 | OpenTelemetry end-to-end tracing | 1-2 ngày | Sẵn sàng triển khai |

---

## Troubleshooting

### Vấn đề: "Connection refused" khi API connect MongoDB

**Nguyên nhân**: MongoDB container chưa sẵn sàng hoặc auth failed

**Cách khắc phục**:
```bash
docker compose logs mongodb | tail -20
docker compose restart mongodb
```

### Vấn đề: WebSocket không connect từ Dashboard

**Nguyên nhân**: CORS policy hoặc WebSocket URL sai

**Cách khắc phục**:
```bash
# Check CORS config
curl -H "Origin: http://localhost:3001" http://localhost:3000/api/health -v

# Check WebSocket URL trong .env.production
cat .env.production | grep SOCKET_URL
```

### Vấn đề: Image build fail ở Docker stage

**Nguyên nhân**: Dependencies không cài đặt trong Dockerfile hoặc cache stale

**Cách khắc phục**:
```bash
# Rebuild without cache
docker build --no-cache -f infrastructure/Dockerfile.api .

# Clean images & rebuild
docker system prune -a --volumes
npm install && npm run build
```

---

**Cập nhật**: 04/05/2026  
**Status**: ✅ Production-ready (Milestone 8 complete)