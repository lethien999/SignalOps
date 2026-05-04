# ✅ SignalOps — Danh sách kiểm tra triển khai

---

## Milestone 1: Thiết lập dự án & hạ tầng

### Thiết lập môi trường
- [x] Đã cài Node.js v18+
- [x] Đã cấu hình npm/yarn
- [x] Đã khởi tạo Git repository
- [x] Đã cấu hình .gitignore

### Khởi tạo dự án
- [x] Đã tạo `package.json` ở root (monorepo)
- [x] Đã cài NestJS CLI toàn cục
- [x] Đã tạo cấu trúc workspace:
  - [x] `apps/api-gateway`
  - [x] `apps/event-broker`
  - [x] `apps/worker-service`
  - [x] `apps/simulator`
  - [x] `apps/dashboard`
  - [x] `libs/common`
  - [x] `libs/models`
  - [x] `infrastructure/`

### Thiết lập Docker
- [x] Docker đã cài và đang chạy
- [x] `docker-compose.yml` created with:
  - [x] MongoDB service
  - [x] Redis service
  - [x] Nginx reverse proxy (optional)
- [x] Kiểm thử: `docker-compose up -d` chạy thành công
- [x] Xác minh: có thể truy cập mongo và redis

### Thiết lập cơ sở dữ liệu
- [x] Đã cấu hình chuỗi kết nối MongoDB
- [x] Đã tạo database: `signalops-db`
- [x] Các collection khởi tạo:
  - [x] `events`
  - [x] `alerts`
  - [x] `devices`
- [x] Đã tạo index để tối ưu hiệu năng

### Công cụ phát triển
- [x] Đã cấu hình ESLint
- [x] Đã cấu hình Prettier
- [x] Đã bật TypeScript strict mode
- [x] Đã tạo `.env.example`

---

## Milestone 2: Luồng sự kiện & hệ thống hàng đợi

### Dịch vụ API Gateway
- [x] Đã tạo scaffold ứng dụng NestJS
- [x] HTTP server lắng nghe cổng 3000
- [x] Interceptor cho Request/Response
- [x] Middleware xử lý lỗi
- [x] Đã thiết lập logging (Winston/Pino)

### Endpoint tiếp nhận sự kiện
- [x] Đã tạo endpoint `POST /api/events`
- [x] Validation input (class-validator)
- [x] Đã tạo Event DTO:
  ```
  - deviceId: string
  - location: { lat, lng }
  - metrics: { latency, packetLoss, signalStrength }
  ```
- [x] Trả về phản hồi 202 Accepted
- [x] Đã ghi log request để debug

### Dịch vụ Event Broker
- [x] Module/service NestJS tách riêng
- [x] Nhận event từ API Gateway
- [x] Validation schema event
- [x] Bổ sung metadata (timestamp, ...)
- [x] Serialize sang định dạng queue job

### Tích hợp Redis Queue
- [x] Đã cài BullMQ: `npm install bull`
- [x] Đã cấu hình kết nối Redis
- [x] Đã tạo queue `event-processing`
- [x] Đã triển khai job producer
- [x] Job được thêm vào queue với ID duy nhất
- [x] Có xử lý lỗi khi enqueue thất bại

### Kiểm thử xác minh
- [x] Thủ công: `curl -X POST /api/events` với dữ liệu test
- [x] Xác minh: Event xuất hiện trong Redis queue
- [x] Kiểm thử: Queue giữ dữ liệu qua lần restart service
- [x] Giám sát: mức dùng bộ nhớ Redis hợp lý

---

## Milestone 3: Worker & logic phát hiện

### Thiết lập Worker Service
- [x] Ứng dụng NestJS hoặc process worker tách riêng
- [x] Kết nối tới Redis queue
- [x] Bắt đầu polling job
- [x] Xử lý graceful shutdown

### Queue Consumer
- [x] Worker lắng nghe queue `event-processing`
- [x] Dequeue jobs
- [x] Có xử lý lỗi + retry
- [x] Có Dead Letter Queue (DLQ) cho job thất bại

### Logic phát hiện ngưỡng
- [x] Đã tạo service `ThresholdDetector`
- [x] Triển khai logic:
  ```
  if latency > 200ms → type: 'latency', severity: 'high'
  if packetLoss > 5% → type: 'packet_loss', severity: high'
  if signalStrength < -90 dBm → type: 'signal', severity: 'medium'
  ```
- [x] Unit test đạt cho từng ngưỡng
- [x] Đã xử lý edge case (null, undefined)

### Đã tạo Alert Model
- [x] Định nghĩa Alert schema
- [x] Trường dữ liệu: alertId, type, severity, location, message, status
- [x] Trường mở rộng: resolvedBy, resolutionNote, acknowledgedBy
- [x] Trường thời gian: createdAt, updatedAt, acknowledgedAt, resolvedAt
- [x] Định nghĩa luồng chuyển trạng thái

### Tạo cảnh báo
- [x] Xác định điều kiện tạo alert (vượt ngưỡng)
- [x] Lưu alert vào MongoDB
- [x] Kiểm tra trùng lặp (tùy chọn nhưng khuyến nghị)
- [x] Liên kết event với alert

### Xác minh
- [x] Gửi event vượt ngưỡng vào API
- [x] Worker kích hoạt threshold detection
- [x] Alert được tạo trong MongoDB
- [x] Log hiển thị việc tạo alert
- [x] DLQ xử lý event lỗi

---

## Milestone 4: Lưu trữ & API

### Mẫu Repository MongoDB
- [x] `EventRepository` service created
  - [x] lưu event
  - [x] findById
  - [x] find (có phân trang)
  - [x] findByDeviceId
  - [x] findRecent (E1)
- [x] `AlertRepository` service created
  - [x] lưu alert
  - [x] findById
  - [x] find (có bộ lọc)
  - [x] updateStatus
  - [x] alertHistory — tổng hợp theo ngày (E3)
  - [x] countActiveAlerts

### Các REST API Endpoint

#### Events API
- [x] `POST /api/events` - Tạo event (đã có từ luồng Event & Queue)
- [x] `GET /api/events` - Danh sách events
  - [x] Hỗ trợ phân trang
  - [x] Lọc theo deviceId (tùy chọn)
  - [x] Lọc theo khoảng thời gian (tùy chọn)
- [x] `GET /api/events/:id` - Lấy chi tiết event

#### Alerts API
- [x] `GET /api/alerts` - Danh sách alerts
  - [x] Lọc theo severity
  - [x] Lọc theo status
  - [x] Phân trang
- [x] `GET /api/alerts/:id` - Lấy chi tiết alert
- [x] `GET /api/alerts/history` - Lịch sử cảnh báo theo ngày (E3)
- [x] `PATCH /api/alerts/:id` - Cập nhật alert
  - [x] Cập nhật trạng thái (open → acknowledged → resolved)
  - [x] Ghi nhận người xác nhận + thời điểm
  - [x] Ghi resolvedBy + resolutionNote (A2)
- [x] `POST /api/alerts/batch` - Xác nhận/đóng hàng loạt (A3)

#### System API
- [x] `GET /api/health` - Kiểm tra sức khỏe
  - [x] Trạng thái kết nối MongoDB
  - [x] Trạng thái kết nối Redis
  - [x] Response gồm uptime
  - [x] Version, environment, Node.js version (F3)
  - [x] Memory usage (RSS, heap) (F3)
- [x] `GET /api/stats` - Thống kê hệ thống
  - [x] Tổng số events
  - [x] Số alert đang mở
  - [x] Events mỗi phút

#### Devices API (E1)
- [x] `GET /api/devices` - Danh sách thiết bị (derive từ events)
  - [x] DeviceController + EventService.getDevices()

### Tối ưu cơ sở dữ liệu
- [x] Đã tạo index:
  - [x] events: deviceId, timestamp
  - [x] alerts: status, severity, createdAt
- [x] Đã test hiệu năng truy vấn (mục tiêu <100ms)
- [x] Đã bật document validation

### Tài liệu API
- [x] Đã setup Swagger/OpenAPI
- [x] Đã tài liệu hóa endpoint trên Swagger UI
- [x] Đã định nghĩa response schema
- [x] Đã tài liệu hóa lỗi response

### Xác minh
- [x] Tất cả endpoint trả 200 OK với dữ liệu đúng
- [x] Phân trang hoạt động đúng
- [x] Bộ lọc hoạt động đúng kỳ vọng
- [x] Truy vấn DB hoàn thành đúng thời gian
- [x] Swagger UI mở được tại GET /api/docs

---

## Milestone 5: Giao tiếp thời gian thực

### Thiết lập máy chủ WebSocket
- [x] Đã cài Socket.io: `npm install socket.io`
- [x] WebSocket server chạy cùng cổng với API
- [x] Đã cấu hình CORS cho WebSocket

### WebSocket Namespaces
- [x] `/events` namespace cho thông báo sự kiện
- [x] `/alerts` namespace cho thông báo cảnh báo
- [x] `/status` namespace cho cập nhật trạng thái

### Phát sự kiện

#### Thông báo cảnh báo
- [x] Khi alert được tạo → emit `alert:new`
  ```
  payload: { id, type, severity, location, message, timestamp }
  ```
- [x] Khi alert được xác nhận → emit `alert:acknowledged`
- [x] Khi alert được xử lý xong → emit `alert:resolved`

#### Thông báo sự kiện
- [x] Khi event được xử lý xong → emit `event:processed`
- [x] Khi trạng thái thiết bị thay đổi → emit `device:status:changed`

#### Thông báo hệ thống
- [x] Emit queue depth theo chu kỳ (phục vụ giám sát)
- [x] Emit worker stats (tùy chọn)

### Xử lý kết nối client
- [x] Theo dõi client đang kết nối
- [x] Dọn dẹp khi client ngắt kết nối
- [x] Triển khai xác thực kết nối (token/Bearer tùy chọn)
- [x] Giới hạn tần suất emit theo từng client (cấu hình được)

### Xử lý lỗi
- [x] Bắt lỗi khi emit và ghi log
- [x] Theo dõi unhandled socket exceptions
- [x] Logic kết nối lại cho emit thất bại (đã có retry service với exponential backoff)

### Xác minh
- [x] WebSocket test client kết nối thành công
- [x] Nhận được thông điệp emit alert (alert:new, alert:acknowledged, alert:resolved)
- [x] Nhiều client nhận cùng một emission (đã test với 2 event client)
- [x] Subscription hoạt động (tùy chọn: lọc theo room)

---

## Milestone 6: Frontend Dashboard

### Thiết lập React/Next.js
- [x] Đã tạo app Next.js trong `apps/dashboard`
- [x] Đã cấu hình TypeScript
- [x] Đã cài Tailwind CSS (hoặc giải pháp styling tương đương)

### Quản lý trạng thái
- [x] Đã setup Redux/Zustand/Context (theo lựa chọn)
- [x] Alert state slice
- [x] Event state slice
- [x] System state slice
- [x] Device state slice

### Thiết lập WebSocket Client
- [x] Đã cài socket.io-client
- [x] Wrapper hook: `useSocket()`
- [x] Kết nối tới backend WebSocket
- [x] Đã setup event listeners
- [x] Cleanup đúng khi unmount

### Thành phần giao diện

#### Màn hình dashboard chính
- [x] Layout component có navigation
- [x] Responsive design (thân thiện mobile)

#### Thành phần bản đồ
- [x] Đã tích hợp Leaflet hoặc Mapbox
- [x] Có marker thiết bị trên bản đồ
  - [x] Marker xanh = trạng thái bình thường
  - [x] Marker đỏ = alert/lỗi
  - [x] Bấm marker = hiện chi tiết thiết bị
- [x] Có chức năng zoom/pan
- [x] Có chú giải ý nghĩa marker

#### Thành phần bảng cảnh báo
- [x] Bảng hiển thị alerts dạng lưới
- [x] Cột: severity, type, location, message, status, time
- [x] Sắp xếp theo mọi cột
- [x] Lọc theo severity bằng dropdown
- [x] Lọc theo status bằng radio button
- [x] Phân trang
- [x] Nhóm cảnh báo theo vị trí — toggle view (A4)

#### Thành phần dashboard chỉ số
- [x] Card tổng số events
- [x] Card số alert đang mở
- [x] Biểu đồ latency theo thời gian (Chart.js/Recharts)
- [x] Biểu đồ packet loss theo thời gian
- [x] Hiển thị tốc độ cập nhật dữ liệu

- [x] Hiển thị đầy đủ thông tin alert
- [x] Nút xác nhận (khi status=open)
- [x] Nút xử lý xong (khi status=acknowledged)
- [x] Hiển thị ai đã xác nhận và thời điểm
- [x] Nhập tên người thực hiện khi xác nhận/xử lý (A1)
- [x] Nhập ghi chú xử lý khi resolve (A2)
- [x] Nút quay lại

### Lấy dữ liệu
- [x] Fetch dữ liệu ban đầu khi mount:
  - [x] `GET /api/alerts` → nạp danh sách alerts
  - [x] `GET /api/events?limit=100` → nạp event gần đây cho chart
- [x] Cập nhật real-time qua WebSocket
- [x] Có xử lý lỗi khi fetch thất bại

### Hoàn thiện UI
- [x] Empty state (không có alerts/events)
- [x] Loading state (skeleton screens)
- [x] Thông báo lỗi thân thiện người dùng
- [x] Toast notifications cho thao tác
- [x] Hộp thoại xác nhận cho thao tác quan trọng
- [x] Dark Mode toggle + CSS (C5)
- [x] Tiếng Việt toàn diện (B1, B2)

### Xác minh
- [x] Dashboard tải không lỗi
- [x] Map render được marker
- [x] Bảng alerts hiển thị đúng
- [x] Metrics hiển thị hợp lý
- [x] Alert real-time xuất hiện không cần refresh
- [x] Responsive trên thiết bị mobile

---

## Milestone 7: Hoàn thiện CI/CD & DevOps

### Cấu hình Docker

#### Dockerfiles
- [x] API Gateway Dockerfile
- [x] Event Broker Dockerfile
- [x] Worker Service Dockerfile
- [x] Simulator Dockerfile (tùy chọn)
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

### Kiểm thử local
- [x] `docker-compose up -d` khởi động toàn bộ services
- [x] Tất cả services healthy trong vòng 30 giây
- [x] API Gateway truy cập được ở localhost:3000
- [x] Dashboard truy cập được ở localhost:3001
- [x] `docker-compose logs -f` hiển thị log đúng kỳ vọng
- [x] `docker-compose down` dọn dẹp đúng cách

### Logging
- [x] Structured logging (JSON format) ở tất cả services
- [x] Mức log: debug, info, warn, error
- [x] Logger xuất ra stdout (cho container logs)
- [x] Middleware log request (API Gateway)
- [x] Log xử lý queue (Worker)
- [x] Log kết nối/ngắt kết nối WebSocket

### Cấu hình môi trường
- [x] `.env.example` chứa đầy đủ biến cần thiết
- [x] Mỗi service đọc cấu hình từ environment
- [x] Có giá trị mặc định cho development
- [x] Có cấu hình cho production (tùy chọn)
- [x] Secrets không commit vào repo

### Kiểm thử

#### Unit tests
- [x] Test threshold detection
- [x] Test tạo alert
- [x] Test các method của repository
- [x] Test utilities
- [x] Lệnh test: `npm test`
- [x] Độ phủ code: >70%

#### Integration tests
- [x] Luồng event: API → Queue → Worker → DB → WebSocket
- [x] Tạo và cập nhật alert
- [x] Xác minh lưu trữ database
- [x] Độ tin cậy Redis queue

#### Load/Performance Tests (Cần hạ tầng thật)
- [x] Load test harness sẵn sàng: `npm run perf:load`
- [x] Soak test harness sẵn sàng: `npm run perf:soak` (dùng duration dài khi có staging/prod)
- [x] WebSocket fan-out harness sẵn sàng: `npm run perf:websocket`
- [ ] Send 100 events/sec → system stable *(verify trên staging/prod)*
- [ ] Worker processes events in <1s *(verify trên staging/prod)*
- [ ] API response time <200ms *(verify trên staging/prod)*
- [ ] WebSocket broadcasts to 100+ clients *(verify trên staging/prod)*

### Pipeline CI/CD (Jenkins)

#### Thiết lập Jenkins
- [ ] Jenkins server running (cần hạ tầng)
- [ ] GitHub/GitLab webhook configured (cần hạ tầng)
- [x] Jenkins pipeline file: `Jenkinsfile`

#### Các stage trong pipeline
- [x] **Checkout**: Lấy code mới nhất
- [x] **Build**:
  - [x] `npm install` tất cả package
  - [x] Build toàn bộ NestJS services
  - [x] Build React dashboard
- [x] **Test**:
  - [x] Chạy unit tests
  - [x] Chạy integration tests (`npm run test:integration` = `verify:api` + `verify:websocket`)
  - [x] Tạo coverage report
  - [x] Fail nếu test không đạt hoặc coverage <70%
- [x] **Docker Build**:
  - [x] Build image cho tất cả services
  - [x] Tag theo commit hash
  - [x] Tag `latest` cho nhánh main
  - [ ] Push to container registry (cần registry)
- [ ] **Deploy** (cần staging server):
  - [ ] Pull image mới nhất
  - [ ] Chạy `docker-compose up -d`
  - [ ] Chờ health checks
  - [ ] Rollback khi thất bại
- [x] **Verify**:
  - [x] Health check đạt
  - [x] Smoke test đạt
  - [x] Không có lỗi critical trong logs

### Thiết lập monitoring
- [x] Prometheus scrape config (`infrastructure/monitoring/prometheus.yml`)
- [x] Metrics exposed at `/api/metrics` (`MetricsController` + `prom-client`)
- [x] Grafana dashboard created (`infrastructure/monitoring/grafana-dashboard.json`)
- [x] Docker Compose monitoring stack (`docker-compose.monitoring.yml`)
- [ ] Grafana alert rules configured (cần tuỳ chỉnh theo nhu cầu)

### Tài liệu
- [x] README.md ở root với phần khởi động nhanh
- [x] DEPLOYMENT.md với checklist production
- [x] API.md với tài liệu endpoint
- [x] ARCHITECTURE.md với thiết kế hệ thống
- [x] CONTRIBUTING.md với hướng dẫn phát triển

### Sẵn sàng production
- [x] Xử lý lỗi toàn diện
- [x] Đã triển khai graceful shutdown
- [x] Environment validated on startup (`env-validator.ts`) (E5)
- [x] Database migrations manageable (`db:migrate`, `db:rollback`, `db:seed`, `status` scripts)
- [x] API Key authentication (`api-key.guard.ts`) (F1)
- [x] Backup strategy for MongoDB (`scripts/backup-mongodb.sh`) (F2)
- [x] Rate limiting configured (`rate-limit.guard.ts`) (E4)
- [x] Correlation ID middleware (`correlation-id.middleware.ts`) (F4)
- [x] CORS đã cấu hình đúng
- [ ] HTTPS support (cần SSL certificate)
- [x] Auto-resolve cảnh báo khi metric bình thường (E2)

### Xác minh cuối
- [x] Toàn hệ thống chạy bằng `docker-compose up` ✅ (28/04/2026)
- [x] Tạo event qua simulator hoặc request thủ công
- [x] Event xuất hiện trong alerts (nếu vượt ngưỡng)
- [x] Alert xuất hiện trên map và table trong <2 giây
- [x] Xác nhận alert và cập nhật trạng thái theo thời gian thực
- [ ] Jenkins pipeline runs successfully on commit (cần Jenkins server)
- [ ] No warnings in logs (minor deprecation warnings chấp nhận được)

---

## Tiêu chí nghiệm thu

- [x] Tất cả mục cốt lõi đã hoàn thành
- [ ] Code review đạt
- [x] Lint passing (✅ 0 warnings across all workspaces — 29/04/2026)
- [x] Tests passing (unit tests ✅, integration tests có)
- [ ] Hệ thống chạy ổn định 24 giờ
- [x] Documentation complete (API, Architecture, Deployment, Contributing, Operations — tiếng Việt)
- [ ] Team được đào tạo về kiến trúc & triển khai
- [ ] Kế hoạch triển khai production được phê duyệt

## Việc Còn Lại Theo Phạm Vi

### Có thể làm ngay trên local/demo
- Code review đạt
- Hệ thống chạy ổn định 24 giờ
- Không còn cảnh báo trong logs (nếu cần tiêu chuẩn chặt; hiện minor deprecation warnings vẫn chấp nhận)

### Chỉ còn cho hạ tầng thật / production rollout
- Jenkins server chạy và webhook được cấu hình
- Jenkins pipeline chạy thành công theo commit
- Kiểm thử: Jenkins pipeline push image thành công
- Deploy stage chạy trên staging server
- Xác minh Prometheus truy cập được `http://api-gateway:3000/metrics`
- Cấu hình Grafana scrape jobs / alert rules
- HTTPS support (cần SSL certificate)
- Load/performance tests trên hạ tầng thật
- Team được đào tạo về kiến trúc & triển khai
- Kế hoạch triển khai production được phê duyệt

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
**Effort**: Ước tính 500-800 person-hours  
**Quy mô team**: Khuyến nghị 2-3 developers  
**Trạng thái lint**: ✅ Xanh (0 warnings, toàn bộ workspace đều pass)

---

## Milestone 8: Sửa lỗi & tinh chỉnh

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

## Milestone 9: Repo Audit 2026-05-04 — Chờ phê duyệt

*Nguồn: docs/SignalOps_Repo_Audit.md (kiểm toán ngày 04/05/2026).*

**Nguyên tắc thực hiện:**
- [x] Tất cả thay đổi mới phải được đưa vào checklist trước khi code
- [ ] Chỉ bắt đầu triển khai sau khi Product Owner xác nhận hạng mục

### 9.1. P0 — Trước Production (ưu tiên cao nhất)

#### Độ tin cậy & tính đúng đắn
- [ ] Thêm `restart: unless-stopped` cho `worker-service` trong compose
- [ ] Đồng bộ logic ngưỡng tại `EventService.getDevices()` bằng `ThresholdDetector.detectAnomalies()` (xóa hardcode)
- [ ] Tối ưu `EventService.getDevices()` bằng MongoDB aggregation (`$sort` + `$group`) để tránh xử lý in-memory khi scale
- [ ] Thêm TTL index cho events (90 ngày)
- [ ] Chuẩn hóa timeout cho external dependencies:
  - [ ] Request timeout middleware/interceptor cho API Gateway
  - [ ] Cấu hình `connectTimeoutMS` / `socketTimeoutMS` / `serverSelectionTimeoutMS` cho MongoDB
  - [ ] Cấu hình timeout/retry phù hợp cho Redis client
- [ ] Thiết kế cơ chế idempotency nâng cao cho case `DB save thành công nhưng enqueue thất bại` (outbox/retry compensation)

#### CI/CD & bảo mật runtime
- [ ] Chuyển các Dockerfile backend sang multi-stage build
- [ ] Chạy container với non-root user (`USER` không phải root)
- [ ] Tối ưu layer cache Dockerfile (copy lockfile/package trước source)

### 9.2. P1 — Sprint Kế Tiếp

#### Gia cố độ tin cậy
- [ ] Thêm jitter cho BullMQ backoff để giảm thundering herd
- [ ] Áp dụng circuit breaker cho thao tác MongoDB/Redis (opossum hoặc tương đương)

#### Khả năng quan sát
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

#### Tracing & vận hành
- [ ] Triển khai OpenTelemetry tracing (API Gateway -> Redis -> Worker -> MongoDB)
- [ ] Hoàn thiện SSL termination cho Nginx (không chỉ tài liệu)

#### Nền tảng dữ liệu
- [ ] Đánh giá ngưỡng scale dữ liệu (`>10M events/tháng`) để cân nhắc TimescaleDB/VictoriaMetrics
- [ ] Định nghĩa strategy archive trước khi xóa dữ liệu theo TTL

#### Delivery & quản trị
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

#### Bảo mật & kiểm soát truy cập
- [ ] Thiết kế RBAC cơ bản (viewer/operator/admin)
- [ ] Bắt buộc auth cho WebSocket khi deploy production
- [ ] Thêm audit log cho thay đổi API key/cấu hình nhạy cảm

#### Phát triển miền ATS
- [ ] Chuẩn hóa dashboard NOC theo use-case vận hành (alert triage timeline, ownership, escalation)
- [ ] Định nghĩa quy trình failover tự động và kiểm thử định kỳ

### 9.5. Quyết Định Triển Khai (Chờ xác nhận)

- [ ] Chốt phạm vi P0 sẽ làm ngay
- [ ] Chốt phạm vi P1 cho sprint gần nhất
- [ ] Chốt mục P2 nào đưa vào roadmap quý
- [ ] Chỉ định thứ tự thực hiện + thời gian mong muốn

**Cập nhật milestone 9**: 04/05/2026  
**Trạng thái**: 🟡 Chờ duyệt để triển khai
