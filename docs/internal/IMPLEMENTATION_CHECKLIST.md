# ✅ SignalOps — Danh sách kiểm tra triển khai

---

## Milestone 1: Project Setup & Infrastructure

### Environment Setup
- [x] Node.js v18+ installed
- [x] npm/yarn configured
- [x] Git repository initialized
- [x] .gitignore configured

### Project Initialization
- [x] Root `package.json` created (monorepo)
- [x] NestJS CLI installed globally
- [x] Workspace structure created:
  - [x] `apps/api-gateway`
  - [x] `apps/event-broker`
  - [x] `apps/worker-service`
  - [x] `apps/simulator`
  - [x] `apps/dashboard`
  - [x] `libs/common`
  - [x] `libs/models`
  - [x] `infrastructure/`

### Docker Setup
- [x] Docker installed & running
- [x] `docker-compose.yml` created with:
  - [x] MongoDB service
  - [x] Redis service
  - [x] Nginx reverse proxy (optional)
- [x] Test: `docker-compose up -d` succeeds
- [x] Verify: mongo and redis accessible

### Database Setup
- [x] MongoDB connection string configured
- [x] Database created: `signalops-db`
- [x] Initial collections:
  - [x] `events`
  - [x] `alerts`
  - [x] `devices`
- [x] Indexes created for performance

### Development Tools
- [x] ESLint configured
- [x] Prettier configured
- [x] TypeScript strict mode enabled
- [x] `.env.example` created

---

## Milestone 2: Event Flow & Queue System

### API Gateway Service
- [x] NestJS app scaffold created
- [x] HTTP server listening on port 3000
- [x] Request/Response interceptors
- [x] Error handling middleware
- [x] Logging setup (Winston/Pino)

### Event Ingestion Endpoint
- [x] `POST /api/events` endpoint created
- [x] Input validation (class-validator)
- [x] Event DTO created:
  ```
  - deviceId: string
  - location: { lat, lng }
  - metrics: { latency, packetLoss, signalStrength }
  ```
- [x] 202 Accepted response returned
- [x] Request logged for debugging

### Event Broker Service
- [x] Separate NestJS module or service
- [x] Receives event from API Gateway
- [x] Validates event schema
- [x] Enriches with metadata (timestamp, etc)
- [x] Serializes to queue job format

### Redis Queue Integration
- [x] BullMQ installed: `npm install bull`
- [x] Redis connection configured
- [x] Event queue created: `event-processing`
- [x] Job producer implemented
- [x] Job added to queue with unique ID
- [x] Error handling for failed queuing

### Verification Tests
- [x] Manual: `curl -X POST /api/events` with test data
- [x] Verify: Events appear in Redis queue
- [x] Test: Queue persists across service restart
- [x] Monitor: Redis memory usage is reasonable

---

## Milestone 3: Worker & Detection Logic

### Worker Service Setup
- [x] Separate NestJS app or worker process
- [x] Connects to Redis queue
- [x] Starts polling for jobs
- [x] Graceful shutdown handling

### Queue Consumer
- [x] Worker listens to `event-processing` queue
- [x] Dequeues jobs
- [x] Implements error handling + retries
- [x] Dead Letter Queue (DLQ) for failed jobs

### Threshold Detection Logic
- [x] Service created: `ThresholdDetector`
- [x] Implements logic:
  ```
  if latency > 200ms → type: 'latency', severity: 'high'
  if packetLoss > 5% → type: 'packet_loss', severity: high'
  if signalStrength < -90 dBm → type: 'signal', severity: 'medium'
  ```
- [x] Unit tests pass for each threshold
- [x] Edge cases handled (null, undefined)

### Alert Model Created
- [x] Alert schema defined
- [x] Fields: alertId, type, severity, location, message, status
- [x] Fields mở rộng: resolvedBy, resolutionNote, acknowledgedBy
- [x] Timestamp fields: createdAt, updatedAt, acknowledgedAt, resolvedAt
- [x] Status transitions defined

### Alert Generation
- [x] When alert should be created (threshold exceeded)
- [x] Alert saved to MongoDB
- [x] Duplicate check (optional but recommended)
- [x] Event linked to alert

### Verification
- [x] Send event to API that exceeds threshold
- [x] Worker triggers threshold detection
- [x] Alert created in MongoDB
- [x] Log shows alert creation
- [x] DLQ handles problematic events

---

## Milestone 4: Persistence & API

### MongoDB Repository Pattern
- [x] `EventRepository` service created
  - [x] save event
  - [x] findById
  - [x] find (with pagination)
  - [x] findByDeviceId
  - [x] findRecent (E1)
- [x] `AlertRepository` service created
  - [x] save alert
  - [x] findById
  - [x] find (with filtering)
  - [x] updateStatus
  - [x] alertHistory — aggregate theo ngày (E3)
  - [x] countActiveAlerts

### REST API Endpoints

#### Events API
- [x] `POST /api/events` - Create event (already from Event Flow & Queue System)
- [x] `GET /api/events` - List events
  - [x] Pagination support
  - [x] Filter by deviceId (optional)
  - [x] Filter by date range (optional)
- [x] `GET /api/events/:id` - Get event detail

#### Alerts API
- [x] `GET /api/alerts` - List alerts
  - [x] Filter by severity
  - [x] Filter by status
  - [x] Pagination
- [x] `GET /api/alerts/:id` - Get alert detail
- [x] `GET /api/alerts/history` - Lịch sử cảnh báo theo ngày (E3)
- [x] `PATCH /api/alerts/:id` - Update alert
  - [x] Update status (open → acknowledged → resolved)
  - [x] Record who acknowledged + when
  - [x] Record resolvedBy + resolutionNote (A2)
- [x] `POST /api/alerts/batch` - Batch acknowledge/resolve (A3)

#### System API
- [x] `GET /api/health` - Health check
  - [x] MongoDB connection status
  - [x] Redis connection status
  - [x] Response includes uptime
  - [x] Version, environment, Node.js version (F3)
  - [x] Memory usage (RSS, heap) (F3)
- [x] `GET /api/stats` - System statistics
  - [x] Total events count
  - [x] Active alerts count
  - [x] Events per minute

#### Devices API (E1)
- [x] `GET /api/devices` - Danh sách thiết bị (derive từ events)
  - [x] DeviceController + EventService.getDevices()

### Database Optimization
- [x] Indexes created:
  - [x] events: deviceId, timestamp
  - [x] alerts: status, severity, createdAt
- [x] Query performance tested (should be <100ms)
- [x] Document validation enabled

### API Documentation
- [x] Swagger/OpenAPI setup
- [x] Endpoints documented in Swagger UI
- [x] Response schemas defined
- [x] Error responses documented

### Verification
- [x] All endpoints return 200 OK with correct data
- [x] Pagination works correctly
- [x] Filters work as expected
- [x] Database queries complete in time
- [x] Swagger UI loads at GET /api/docs

---

## Milestone 5: Real-time Communication

### WebSocket Server Setup
- [x] Socket.io installed: `npm install socket.io`
- [x] WebSocket server running on same port as API
- [x] CORS configured for WebSocket

### WebSocket Namespaces
- [x] `/events` namespace for event notifications
- [x] `/alerts` namespace for alert notifications
- [x] `/status` namespace for status updates

### Event Emissions

#### Alert Notifications
- [x] When alert created → emit `alert:new`
  ```
  payload: { id, type, severity, location, message, timestamp }
  ```
- [x] When alert acknowledged → emit `alert:acknowledged`
- [x] When alert resolved → emit `alert:resolved`

#### Event Notifications
- [x] When event processed → emit `event:processed`
- [x] Device status changes → emit `device:status:changed`

#### System Notifications
- [x] Emit queue depth periodically (for monitoring)
- [x] Emit worker stats (optional)

### Client Connection Handling
- [x] Track connected clients
- [x] Handle disconnect cleanup
- [x] Implement connection authentication (token/Bearer optional)
- [x] Rate limit emissions per client (configurable interval)

### Error Handling
- [x] Catch emit errors and log
- [x] Monitor unhandled socket exceptions
- [x] Reconnection logic for failed emits (exponential backoff retry service implemented)

### Verification
- [x] WebSocket test client connects successfully
- [x] Emit alert message is received (alert:new, alert:acknowledged, alert:resolved)
- [x] Multiple clients receive the same emission (tested with 2 event clients)
- [x] Subscriptions work (optional: room-based filtering)

---

## Milestone 6: Frontend Dashboard

### React/Next.js Setup
- [x] Next.js app created in `apps/dashboard`
- [x] TypeScript configured
- [x] Tailwind CSS installed (or styling solution)

### State Management
- [x] Redux/Zustand/Context setup (whichever chosen)
- [x] Alert state slice
- [x] Event state slice
- [x] System state slice
- [x] Device state slice

### WebSocket Client Setup
- [x] Socket.io-client installed
- [x] Wrapper hook: `useSocket()`
- [x] Connection to backend WebSocket
- [x] Event listeners setup
- [x] Proper cleanup on unmount

### Components

#### Dashboard Main View
- [x] Layout component with navigation
- [x] Responsive design (mobile-friendly)

#### Map Component
- [x] Leaflet or Mapbox integrated
- [x] Device markers on map
  - [x] Green marker = normal status
  - [x] Red marker = alert/error
  - [x] Click marker = show device details
- [x] Zoom/pan functionality
- [x] Legend showing marker meanings

#### Alert Table Component
- [x] Table displays alerts in grid format
- [x] Columns: severity, type, location, message, status, time
- [x] Sorting by any column
- [x] Filter by severity dropdown
- [x] Filter by status radio buttons
- [x] Pagination
- [x] Nhóm cảnh báo theo vị trí — toggle view (A4)

#### Metrics Dashboard Component
- [x] Total events card
- [x] Active alerts card
- [x] Chart: latency over time (Chart.js/Recharts)
- [x] Chart: packet loss over time
- [x] Refresh rate visualization

#### Alert Detail Modal/Page
- [x] Show full alert information
- [x] Acknowledge button (if status=open)
- [x] Resolve button (if status=acknowledged)
- [x] Show who acknowledged and when
- [x] Nhập tên người thực hiện khi xác nhận/xử lý (A1)
- [x] Nhập ghi chú xử lý khi resolve (A2)
- [x] Back button

### Data Fetching
- [x] Fetch initial data on mount:
  - [x] `GET /api/alerts` → populate alerts list
  - [x] `GET /api/events?limit=100` → recent events for chart
- [x] Real-time updates via WebSocket
- [x] Error handling for failed fetches

### UI Polish
- [x] Empty states (no alerts, no events)
- [x] Loading states (skeleton screens)
- [x] Error messages user-friendly
- [x] Toast notifications for actions
- [x] Confirmation dialogs for critical actions
- [x] Dark Mode toggle + CSS (C5)
- [x] Tiếng Việt toàn diện (B1, B2)

### Verification
- [x] Dashboard loads without errors
- [x] Map renders with markers
- [x] Alerts table displays alerts
- [x] Metrics show reasonable numbers
- [x] Real-time alerts appear without refresh
- [x] Responsive on mobile devices

---

## Milestone 7: CI/CD & DevOps Polish

### Docker Configuration

#### Dockerfiles
- [x] API Gateway Dockerfile
- [x] Event Broker Dockerfile
- [x] Worker Service Dockerfile
- [x] Simulator Dockerfile (optional)
- [x] Dashboard Dockerfile (multi-stage build)
- [x] All Dockerfiles use node:18-alpine base

#### Docker Compose
- [x] `docker-compose.yml` updated
- [x] All services defined:
  - [x] api-gateway
  - [x] event-broker
  - [x] worker-service
  - [x] simulator (optional)
  - [x] dashboard
  - [x] mongodb
  - [x] redis
  - [x] nginx (optional reverse proxy)
- [x] Environment variables via `.env` file
- [x] Volumes for mongo data persistence
- [x] Health checks defined
- [x] Dependencies order correct (db → services)

### Local Testing
- [x] `docker-compose up -d` starts all services
- [x] All services become healthy within 30 seconds
- [x] API Gateway accessible at localhost:3000
- [x] Dashboard accessible at localhost:3001
- [x] `docker-compose logs -f` shows expected logs
- [x] `docker-compose down` cleans up properly

### Logging
- [x] Structured logging (JSON format) in all services
- [x] Log levels: debug, info, warn, error
- [x] Logger outputs to stdout (for container logs)
- [x] Request logging middleware (API Gateway)
- [x] Queue processing logs (Worker)
- [x] WebSocket connection/disconnection logs

### Environment Configuration
- [x] `.env.example` contains all required variables
- [x] Each service reads from environment
- [x] Defaults for development provided
- [x] Production environment specified (optional)
- [x] Secrets never committed to repo

### Testing

#### Unit Tests
- [x] Threshold detection tests
- [x] Alert generation tests
- [x] Repository methods tested
- [x] Utilities tested
- [x] Test command: `npm test`
- [x] Code coverage: >70%

#### Integration Tests
- [x] Event flow: API → Queue → Worker → DB → WebSocket
- [x] Alert creation and updates
- [x] Database persistence verified
- [x] Redis queue reliability

#### Load/Performance Tests (Cần hạ tầng thật)
- [x] Load test harness sẵn sàng: `npm run perf:load`
- [x] Soak test harness sẵn sàng: `npm run perf:soak` (dùng duration dài khi có staging/prod)
- [x] WebSocket fan-out harness sẵn sàng: `npm run perf:websocket`
- [ ] Send 100 events/sec → system stable *(verify trên staging/prod)*
- [ ] Worker processes events in <1s *(verify trên staging/prod)*
- [ ] API response time <200ms *(verify trên staging/prod)*
- [ ] WebSocket broadcasts to 100+ clients *(verify trên staging/prod)*

### CI/CD Pipeline (Jenkins)

#### Jenkins Setup
- [ ] Jenkins server running (cần hạ tầng)
- [ ] GitHub/GitLab webhook configured (cần hạ tầng)
- [x] Jenkins pipeline file: `Jenkinsfile`

#### Pipeline Stages
- [x] **Checkout**: Pull latest code
- [x] **Build**:
  - [x] `npm install` all packages
  - [x] Build all NestJS services
  - [x] Build React dashboard
- [x] **Test**:
  - [x] Run unit tests
  - [x] Run integration tests (`npm run test:integration` = `verify:api` + `verify:websocket`)
  - [x] Generate coverage report
  - [x] Fail if tests don't pass or coverage <70%
- [x] **Docker Build**:
  - [x] Build images for all services
  - [x] Tag with commit hash
  - [x] Tag with 'latest' for main branch
  - [ ] Push to container registry (cần registry)
- [ ] **Deploy** (cần staging server):
  - [ ] Pull latest images
  - [ ] Run `docker-compose up -d`
  - [ ] Wait for health checks
  - [ ] Rollback on failure
- [x] **Verify**:
  - [x] Health check passes
  - [x] Smoke tests pass
  - [x] No critical errors in logs

### Monitoring Setup
- [x] Prometheus scrape config (`infrastructure/monitoring/prometheus.yml`)
- [x] Metrics exposed at `/api/metrics` (`MetricsController` + `prom-client`)
- [x] Grafana dashboard created (`infrastructure/monitoring/grafana-dashboard.json`)
- [x] Docker Compose monitoring stack (`docker-compose.monitoring.yml`)
- [ ] Grafana alert rules configured (cần tuỳ chỉnh theo nhu cầu)

### Documentation
- [x] README.md at root with quick start
- [x] DEPLOYMENT.md with production checklist
- [x] API.md with endpoint documentation
- [x] ARCHITECTURE.md with system design
- [x] CONTRIBUTING.md with development guide

### Production Readiness
- [x] Error handling toàn diện
- [x] Graceful shutdown implemented
- [x] Environment validated on startup (`env-validator.ts`) (E5)
- [x] Database migrations manageable (`db:migrate`, `db:rollback`, `db:seed`, `status` scripts)
- [x] API Key authentication (`api-key.guard.ts`) (F1)
- [x] Backup strategy for MongoDB (`scripts/backup-mongodb.sh`) (F2)
- [x] Rate limiting configured (`rate-limit.guard.ts`) (E4)
- [x] Correlation ID middleware (`correlation-id.middleware.ts`) (F4)
- [x] CORS properly configured
- [ ] HTTPS support (cần SSL certificate)
- [x] Auto-resolve cảnh báo khi metric bình thường (E2)

### Final Verification
- [x] Full system up via `docker-compose up` ✅ (28/04/2026)
- [x] Create event via simulator or manual request
- [x] Event appears in alerts (if exceeds threshold)
- [x] Alert appears in dashboard map and table in <2 seconds
- [x] Acknowledge alert and status updates real-time
- [ ] Jenkins pipeline runs successfully on commit (cần Jenkins server)
- [ ] No warnings in logs (minor deprecation warnings chấp nhận được)

---

## Sign-Off Criteria

- [x] Tất cả mục cốt lõi đã hoàn thành
- [ ] Code review passed
- [x] Lint passing (✅ 0 warnings across all workspaces — 29/04/2026)
- [x] Tests passing (unit tests ✅, integration tests có)
- [ ] System runs stable for 24 hours
- [x] Documentation complete (API, Architecture, Deployment, Contributing, Operations — tiếng Việt)
- [ ] Team trained on architecture & deployment
- [ ] Production deployment plan approved

## Việc Còn Lại Theo Phạm Vi

### Có thể làm ngay trên local/demo
- Code review passed
- System runs stable for 24 hours
- No warnings in logs (nếu muốn chặt hơn, hiện minor deprecation warnings vẫn được chấp nhận)

### Chỉ còn cho hạ tầng thật / production rollout
- Jenkins server runs và webhook được cấu hình
- Jenkins pipeline runs successfully on commit
- Test: Jenkins pipeline successfully pushes images
- Deploy stage chạy trên staging server
- Verify Prometheus can reach `http://api-gateway:3000/metrics`
- Configure Grafana scrape jobs / alert rules
- HTTPS support (cần SSL certificate)
- Load/performance tests trên hạ tầng thật
- Team trained on architecture & deployment
- Production deployment plan approved

---

## Tính năng bổ sung đã triển khai (ngoài checklist gốc)

- [x] **A1** — Yêu cầu nhập tên khi xác nhận/xử lý cảnh báo
- [x] **A2** — Lưu resolvedBy + resolutionNote
- [x] **A3** — Batch acknowledge/resolve API
- [x] **A4** — Nhóm cảnh báo theo vị trí (AlertTable)
- [x] **B1-B2** — Tiếng Việt toàn bộ UI + tài liệu
- [x] **C5** — Dark Mode (CSS + toggle + localStorage)
- [x] **E1** — GET /api/devices endpoint
- [x] **E2** — Auto-resolve cảnh báo
- [x] **E3** — GET /api/alerts/history thống kê theo ngày
- [x] **E4** — Rate limiting (IP-based)
- [x] **E5** — Environment validation on startup
- [x] **F1** — API Key authentication guard
- [x] **F2** — MongoDB backup script
- [x] **F3** — Enhanced health check (version, memory, env)
- [x] **F4** — Correlation ID middleware
- [x] **G2** — Prometheus + Grafana monitoring stack
- [x] **D1** — Tài liệu vận hành OPERATIONS.md

---

**Cập nhật lần cuối**: 29/04/2026  
**Trạng thái**: ~95% hoàn thành (Milestone 8 phần local: xanh; còn lại cần hạ tầng thật: Jenkins server, registry, SSL, load testing)  
**Effort**: Est. 500-800 person-hours  
**Team Size**: 2-3 developers recommended  
**Lint Status**: ✅ Green (0 warnings, all workspaces pass)

---

## Milestone 8: Bug Fixes & Refinement

*Dựa trên Analysis Report (28/04/2026) — 18 vấn đề phát hiện*

**Validation note (29/04/2026):** Đã fix lỗi Redis resolution trong runtime Docker và chạy `npm run verify:websocket` thành công end-to-end (`VERIFY_WEBSOCKET_OK`). MongoDB đã bật auth bắt buộc (`mongod --auth`), truy cập không credentials bị từ chối (insert lỗi `requires authentication`), và compose production không còn publish port MongoDB/Redis. Lint đã xanh hoàn toàn: 0 warnings across all workspaces (dashboard, api-gateway, simulator, worker-service, libs/common, libs/models).

**Bỏ qua khi chạy local (cần hạ tầng/server thật):** Jenkins server/webhook/credentials plugin, container registry có credentials thật, staging/prod server để chạy deploy pipeline.

### 🔴 Critical Fixes (Ngay lập tức — trước khi demo/deploy)

#### 1. Dashboard — Fix NEXT_PUBLIC environment variables
- [x] Fix `NEXT_PUBLIC_API_URL` → từ `http://api-gateway:3000/api` sang `http://localhost:3000/api` (dev mode)
- [x] Fix `NEXT_PUBLIC_SOCKET_URL` → từ `http://api-gateway:3000` sang `http://localhost:3000`
- [x] Update `infrastructure/docker-compose.yml` dashboard service environment block
- [x] Test: Dashboard connects to API và WebSocket thành công trên browser
- [x] Verify: API calls và socket events hoạt động real-time

**✅ FIXED (29/04/2026)**: Dashboard hiện tại hoàn toàn không hoạt động do browser không resolve internal Docker hostname → URLs đã được sửa, tested và working.

---

#### 2. API Gateway — Apply ApiKeyGuard decorator
- [x] Import `ApiKeyGuard` vào `apps/api-gateway/src/modules/event/event.controller.ts`
- [x] Thêm `@UseGuards(ApiKeyGuard)` decorator trên `EventController` hoặc `@Post()` method
- [x] Test: POST `/api/events` không có `x-api-key` header → 403 Forbidden
- [x] Test: POST `/api/events` với invalid key → 403 Forbidden
- [x] Test: POST `/api/events` với valid key → 202 Accepted
- [x] Update Swagger docs để yêu cầu `x-api-key` header

**✅ FIXED (29/04/2026)**: Security hole — hiện tại bất kỳ ai cũng có thể ingestion events → ApiKeyGuard applied, tested (403/403/202).

---

#### 3. MongoDB — Fix authentication environment variables
- [x] Fix `MONGO_INITDB_USERNAME` → `MONGO_INITDB_ROOT_USERNAME` trong `infrastructure/docker-compose.yml`
- [x] Fix `MONGO_INITDB_PASSWORD` → `MONGO_INITDB_ROOT_PASSWORD`
- [x] Thêm `MONGO_INITDB_DATABASE` variable
- [x] Verify: MongoDB khởi động với authentication enabled
- [x] Test: Connection string `mongodb://user:password@localhost:27017/signalops-db` hoạt động
- [x] Test: Không thể connect mà không có credentials

**✅ FIXED (29/04/2026)**: MongoDB hiện tại không có authentication — bất kỳ ai connect được tới port 27017 đều có full access → Auth enabled (mongod --auth), unauthenticated insert blocked.

---

### 🟡 High Priority (Tuần này)

#### 4. Jenkinsfile — Remove dangerous `|| true` anti-pattern
- [x] Remove `|| true` từ `npm run lint` step
- [x] Remove `|| true` từ `npm run test` step
- [x] Ensure pipeline fails nếu test hoặc lint failed
- [x] Test: Local build runs `npm run lint` và `npm run test` mà không bỏ qua lỗi
- [ ] Update Jenkinsfile để chặn commit nếu quality gate fail *(BỎ QUA local: cần Jenkins + branch protection/server integration)*

**✅ FIXED (29/04/2026)**: Pipeline hiện tại luôn pass dù có bao nhiêu test fail hay lint error → || true removed, local lint now fails on errors (non-zero exit).

---

#### 5. API Gateway — Add CORS_ORIGIN to docker-compose
- [x] Thêm `CORS_ORIGIN` variable vào `docker-compose.yml` service `api-gateway`
- [x] Update `.env.example` với mẫu: `CORS_ORIGIN=http://localhost:3001,https://yourdomain.com`
- [x] Update `main.ts` CORS config để đọc từ environment variable
- [x] Test: CORS headers trả về đúng origin list thay vì wildcard `*`

**✅ FIXED (29/04/2026)**: CORS hiện tại mở rộng cho tất cả origin — không an toàn cho production → CORS_ORIGIN env var configured, tested (specific origin headers returned).

---

#### 6. Monitoring — Fix Grafana password hardcoded
- [x] Remove hardcoded password khỏi `infrastructure/monitoring/docker-compose.monitoring.yml`
- [x] Thêm `GRAFANA_ADMIN_PASSWORD` variable từ `.env`
- [x] Update `.env.example` với placeholder `GRAFANA_ADMIN_PASSWORD=<set-secure-password>`
- [x] Test: Grafana khởi động và authenticate bằng env variable

**✅ FIXED (29/04/2026)**: Source code repo chứa Grafana password — ai clone được tất cả credential → Password moved to env var from .env.

---

#### 7. MongoDB & Redis — Remove port bindings from production
- [x] Thêm comment vào `docker-compose.yml` giải thích: ports 27017 (MongoDB) và 6379 (Redis) chỉ cho dev
- [x] Tạo `infrastructure/docker-compose.prod.yml` mà không expose ports này
- [x] Document trong `DEPLOYMENT.md`: Trên production, use internal Docker network — không bind ra host
- [x] Test: `docker-compose up` (dev) expose ports; prod version không expose

**✅ FIXED (29/04/2026)**: Database ports lộ ra ngoài — potential unauthorized access trên production → docker-compose.prod.yml created with ports: !reset [].

---

### 🟡 Medium Priority (Sprint tiếp — 1-2 tuần)

#### 8. Jenkinsfile — Add Docker push to registry
- [x] Configure Docker registry credentials trong Jenkinsfile environment
- [x] Thêm docker tag step (đã tag trực tiếp khi `docker build -t ...:${TAG} -t ...:latest`)
- [x] Thêm docker push step: `docker push ${REGISTRY}/signalops-service:${TAG}`
- [x] Document registry setup trong `DEPLOYMENT.md`
- [ ] Test: Jenkins pipeline successfully pushes images *(BỎ QUA local: cần registry thật + Jenkins credentials)*

**Impact**: Mỗi build tạo local images nhưng không store artifact — không thể deploy từ CI/CD

---

#### 9. Jenkinsfile — Setup environment file in CI
- [x] Thêm stage `Setup Environment` trước Docker setup
- [ ] Use Jenkins credentials plugin để load `.env` file *(BỎ QUA local: cần Jenkins server + credentials plugin)*
- [x] Copy `.env` từ Jenkins credentials sang workspace
- [ ] Test: Pipeline không fail khi thiếu `.env` *(BỎ QUA local: cần Jenkins runtime thật để xác thực)*

**Impact**: Fresh workspace trên Jenkins không có `.env` → health check stage fail

---

#### 10. API Gateway — Add unit tests (Coverage Phase 1)
- [x] Create `apps/api-gateway/src/modules/event/event.service.spec.ts`
  - [x] Test: `createEvent()` validation
  - [x] Test: Event saved to queue
  - [x] Test: Duplicate check logic (đảm bảo payload `_id` + `deviceId` được forward để tạo `jobId` ổn định ở broker)
- [x] Create `apps/api-gateway/src/modules/alert/alert.service.spec.ts`
  - [x] Test: `updateStatus()` transitions
  - [x] Test: `batchAcknowledge()` updates multiple alerts
- [x] Create `apps/api-gateway/src/common/guards/api-key.guard.spec.ts`
  - [x] Test: Valid API key → allow
  - [x] Test: Invalid API key → 403
  - [x] Test: Missing API key → 403
- [x] Ensure coverage ≥70% cho api-gateway

**Impact**: API Gateway là service quan trọng nhất nhưng 0 test — không có confidence khi refactor

---

#### 11. API Gateway — Add RateLimitGuard Redis-backed (Optional for Phase 2)
- [x] Current: In-memory Map dùng như fallback khi Redis unavailable
- [x] Recommendation: Convert sang Redis-backed sliding window
- [x] Implementation: Use `Redis.incr()` + `Redis.expire()` pattern
- [ ] Test: Verify rate limit works across multiple instances
- [ ] Note: Can be deferred nếu single-instance deployment

**Impact**: Rate limiting không consistent khi scale tới 2+ instances

---

#### 12. Worker Service — Extract and test `isMetricNormal()` logic
- [x] Move threshold logic từ `handleAutoResolve()` vào `ThresholdDetector.isMetricNormal()`
- [x] Consolidate duplicate threshold check logic
- [x] Add unit tests cho new method
- [x] Verify: `handleAutoResolve()` dùng shared logic

**✅ FIXED (29/04/2026)**: Duplicate threshold logic khó maintain và dễ bugs → isMetricNormal() extracted, consolidated, tested.

---

#### 13. Add API Key security scheme to Swagger
- [x] Update `apps/api-gateway/src/main.ts` DocumentBuilder
- [x] Add: `.addApiKey(securityScheme, 'api-key')`
- [x] Apply `@ApiSecurity('api-key')` to protected endpoints
- [x] Test: Swagger UI shows API Key header requirement
- [x] Document: x-api-key header usage in Swagger

**✅ FIXED (29/04/2026)**: Developers dùng Swagger UI không biết cần pass API key → API Key security scheme added to Swagger, protected endpoints marked.

---

### 🔵 Nice-to-have (Backlog — Q2/Q3)

#### 14. Create `docker-compose.dev.yml` for hot reload
- [x] Tạo file `infrastructure/docker-compose.dev.yml` với volume mounts
- [x] Enable hot reload cho `api-gateway`, `worker-service`, `simulator`, `dashboard`
- [x] Document trong `CONTRIBUTING.md`: `docker-compose -f docker-compose.dev.yml up`
- [ ] Test: Code changes apply immediately without rebuild *(blocked local: Docker daemon chưa chạy)*

**Impact**: Developer experience — currently mentioned in README nhưng file không tồn tại

---

#### 15. Implement DLQ monitoring & alerting
- [x] Add scheduled task: check DLQ size every 5 minutes
- [x] Emit WebSocket event khi DLQ count > 0
- [x] Add endpoint `GET /api/dlq/failed-jobs` để review
- [x] Add UI component để display failed jobs
- [x] Document handling procedure trong `OPERATIONS.md`

**Impact**: Failed events im lặng biến mất — không có visibility

---

#### 16. Connect Monitoring stack to App network
- [x] Update `infrastructure/monitoring/docker-compose.monitoring.yml`
- [x] Connect Prometheus vào main `signalops` network (external)
- [ ] Verify: Prometheus can reach `http://api-gateway:3000/metrics` *(blocked local: Docker daemon chưa chạy)*
- [x] Add `/metrics` endpoint to NestJS services (prom-client integration)
- [ ] Configure Grafana scrape jobs *(Grafana alerting/provisioning cần tinh chỉnh theo môi trường)*

**Impact**: Monitoring stack riêng biệt — không scrape được app metrics

---

#### 17. Add Docker resource limits
- [x] Add `deploy.resources.limits` cho mỗi service trong `docker-compose.yml`
  - [x] API Gateway: 512m memory, 0.5 CPU
  - [x] Worker Service: 512m memory, 0.5 CPU
  - [x] Simulator: 256m memory, 0.25 CPU
  - [x] Dashboard: 256m memory, 0.25 CPU
- [x] Add `deploy.resources.reservations` (minimum required)
- [ ] Test: Docker compose respects limits under load

**Impact**: Memory leak không bị kiềm chế → có thể crash host

---

#### 18. Decide Event Broker service fate
- [x] Option 1: Xóa service
  - [x] Remove `apps/event-broker/`
  - [x] Remove `infrastructure/Dockerfile.broker`
  - [x] Remove service từ `docker-compose.yml`
  - [x] Document: `EventBrokerService` trong api-gateway đảm nhận vai trò
  
- [x] Option 2: Implement properly *(N/A - không chọn theo quyết định Option 1)*
  - [x] Move logic từ api-gateway ra dedicated service *(N/A)*
  - [x] Nhận events từ HTTP endpoint hoặc message queue *(N/A)*
  - [x] Enrich + validate + push vào Redis queue *(N/A)*
  - [x] Add tests + documentation *(N/A)*
  
- [x] Recommendation: Option 1 (xóa) — simplify architecture, maintain trong api-gateway

**Impact**: Currently empty container chiếm tài nguyên mà không tạo giá trị

---

### 📊 Priority Matrix

| Fix | Severity | Effort | Priority | Target |
|-----|----------|--------|----------|--------|
| Dashboard URLs (Critical 3) | 🔴 P0 | 30m | ngay | 2/5 (sáng) |
| ApiKeyGuard (Critical 1) | 🔴 P0 | 30m | ngay | 2/5 (sáng) |
| MongoDB Auth (Critical 2) | 🔴 P0 | 30m | ngay | 2/5 (sáng) |
| Remove `\|\| true` (Medium 8) | 🟡 P1 | 15m | tuần này | 2/5 |
| CORS_ORIGIN (Medium 7) | 🟡 P1 | 30m | tuần này | 3/5 |
| Grafana password (Medium 6) | 🟡 P1 | 20m | tuần này | 3/5 |
| API Gateway tests (Medium 10) | 🟡 P1 | 6-8h | sprint | 9/5-10/5 |
| Swagger security (Medium 13) | 🟡 P1 | 1h | sprint | 10/5 |
| Event Broker decision (Medium 18) | 🟡 P1 | 2-4h | sprint | 10/5 |
| Remaining (Medium 11-17) | 🔵 P2 | variable | backlog | Q2 |

---

### Checklist Format

**Phase 1 — Ngay lập tức (2/5 sáng, ~2 giờ):**
- [x] Fix Dashboard URLs (Critical 3)
- [x] Apply ApiKeyGuard (Critical 1)
- [x] Fix MongoDB Auth (Critical 2)
- [x] Verify all 3 fixes working locally

**Phase 2 — Tuần này (3/5, ~2 giờ):**
- [x] Remove || true từ Jenkinsfile (Medium 8)
- [x] Add CORS_ORIGIN (Medium 7)
- [x] Fix Grafana password (Medium 6)
- [ ] Commit & push changes

**Phase 3 — Sprint tiếp (~20 giờ):**
- [x] API Gateway unit tests (Medium 10)
- [x] Swagger security scheme (Medium 13)
- [x] Event Broker architectural decision (Medium 18)
- [x] Optional: MongoDB/Redis port bindings (Medium 5)

**Phase 4 — Backlog (Variable effort):**
- [x] docker-compose.dev.yml (Nice 14)
- [x] DLQ monitoring (Nice 15)
- [x] Monitoring network (Nice 16)
- [x] Docker resource limits (Nice 17)
- [x] Rate limit Redis-backed (Nice 11)
- [x] Extract metric logic (Nice 12)

---

**Cập nhật**: 04/05/2026  
**Trạng thái Phase 1-3**: ✅ Hoàn thành phần code  
**Est. completion (all)**: 30/5/2026 (với team 2-3 people)

---

## Milestone 9: Repo Audit 2026-05-04 — Pending Approval

*Nguồn: docs/SignalOps_Repo_Audit.md (audit ngày 04/05/2026).*

**Nguyên tắc thực hiện:**
- [x] Tất cả thay đổi mới phải được đưa vào checklist trước khi code
- [ ] Chỉ bắt đầu triển khai sau khi Product Owner xác nhận hạng mục

### 9.1. P0 — Trước Production (ưu tiên cao nhất)

#### Reliability & Correctness
- [ ] Thêm `restart: unless-stopped` cho `worker-service` trong compose
- [ ] Đồng bộ logic ngưỡng tại `EventService.getDevices()` bằng `ThresholdDetector.detectAnomalies()` (xóa hardcode)
- [ ] Tối ưu `EventService.getDevices()` bằng MongoDB aggregation (`$sort` + `$group`) để tránh xử lý in-memory khi scale
- [ ] Thêm TTL index cho events (90 ngày)
- [ ] Chuẩn hóa timeout cho external dependencies:
  - [ ] Request timeout middleware/interceptor cho API Gateway
  - [ ] Cấu hình `connectTimeoutMS` / `socketTimeoutMS` / `serverSelectionTimeoutMS` cho MongoDB
  - [ ] Cấu hình timeout/retry phù hợp cho Redis client
- [ ] Thiết kế cơ chế idempotency nâng cao cho case `DB save thành công nhưng enqueue thất bại` (outbox/retry compensation)

#### CI/CD & Runtime Security
- [ ] Chuyển các Dockerfile backend sang multi-stage build
- [ ] Chạy container với non-root user (`USER` không phải root)
- [ ] Tối ưu layer cache Dockerfile (copy lockfile/package trước source)

### 9.2. P1 — Sprint Kế Tiếp

#### Reliability Hardening
- [ ] Thêm jitter cho BullMQ backoff để giảm thundering herd
- [ ] Áp dụng circuit breaker cho thao tác MongoDB/Redis (opossum hoặc tương đương)

#### Observability
- [ ] Propagate `correlationId` xuyên suốt bằng `AsyncLocalStorage`
- [ ] Tích hợp `correlationId` vào logger của API Gateway và Worker
- [ ] Bổ sung business metrics cho Prometheus:
  - [ ] `signalops_events_ingested_total`
  - [ ] `signalops_alerts_created_total`
  - [ ] `signalops_queue_depth`
  - [ ] `signalops_job_processing_seconds` (histogram)

#### Testing
- [ ] Tạo integration tests với MongoDB thật bằng `mongodb-memory-server`
- [ ] Bổ sung test luồng API -> Queue -> Worker -> DB cho các case lỗi/chậm
- [ ] Bổ sung contract tests giữa Dashboard và API Gateway (Pact hoặc schema contract tương đương)

### 9.3. P2 — Trung Hạn

#### Tracing & Ops
- [ ] Triển khai OpenTelemetry tracing (API Gateway -> Redis -> Worker -> MongoDB)
- [ ] Hoàn thiện SSL termination cho Nginx (không chỉ tài liệu)

#### Data Platform
- [ ] Đánh giá ngưỡng scale dữ liệu (`>10M events/tháng`) để cân nhắc TimescaleDB/VictoriaMetrics
- [ ] Định nghĩa strategy archive trước khi xóa dữ liệu theo TTL

#### Delivery & Governance
- [ ] Bổ sung workflow GitHub Actions song song Jenkins (CI fallback)
- [ ] Thiết kế rollback strategy tự động cho deployment (blue/green hoặc canary + health-based rollback)
- [ ] Publish coverage report/artifacts trong CI để theo dõi quality gate theo từng build
- [ ] Bổ sung versioned migration workflow cho schema/data change (có khả năng rollback)
- [ ] Viết ADR cho quyết định kiến trúc chính trong `docs/adr/`
  - [ ] ADR: MongoDB vs TimescaleDB
  - [ ] ADR: BullMQ vs Kafka
  - [ ] ADR: Embed EventBroker trong API Gateway
  - [ ] ADR: Rule-based threshold vs ML detection

### 9.4. Chức Năng Mới / Thay Đổi Đề Xuất

#### NFR & SLO
- [ ] Định nghĩa SLO hệ thống:
  - [ ] API response time P95/P99
  - [ ] Alert creation latency sau khi ingest event
  - [ ] Uptime mục tiêu theo tháng/quý

#### Security & Access Control
- [ ] Thiết kế RBAC cơ bản (viewer/operator/admin)
- [ ] Bắt buộc auth cho WebSocket khi deploy production
- [ ] Thêm audit log cho thay đổi API key/cấu hình nhạy cảm

#### ATS Domain Evolution
- [ ] Chuẩn hóa dashboard NOC theo use-case vận hành (alert triage timeline, ownership, escalation)
- [ ] Định nghĩa quy trình failover tự động và kiểm thử định kỳ

### 9.5. Quyết Định Triển Khai (Chờ xác nhận)

- [ ] Chốt phạm vi P0 sẽ làm ngay
- [ ] Chốt phạm vi P1 cho sprint gần nhất
- [ ] Chốt mục P2 nào đưa vào roadmap quý
- [ ] Chỉ định thứ tự thực hiện + thời gian mong muốn

**Cập nhật milestone 9**: 04/05/2026  
**Trạng thái**: 🟡 Chờ duyệt để triển khai
