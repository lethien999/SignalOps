# SignalOps — Tham khảo API

## URL cơ sở

- REST API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- WebSocket: `http://localhost:3000`

---

## Nguồn Gốc & Loại API

### 🔵 **APIs Xây Mới (Custom Built)**

Được phát triển riêng cho SignalOps:

| Endpoint | Mô tả | Xây dựng bởi | Vấn đề / Tính năng giải quyết |
|----------|-------|--------------|------------------------------|
| `POST /api/events` | Event ingestion endpoint | EventController + EventService | Nhận telemetry từ thiết bị, validate rồi đẩy vào queue thay vì xử lý đồng bộ |
| `GET /api/events` | List events với filter | EventRepository query | Tra cứu sự kiện theo thiết bị/thời gian để debug hoặc đối soát lịch sử |
| `GET /api/events/:id` | Event detail | EventRepository query | Xem chi tiết một event cụ thể khi cần điều tra sự cố |
| `GET /api/devices` | List unique devices | EventService.getDevices() | Lấy danh sách thiết bị đã gửi dữ liệu để phục vụ lọc và dashboard |
| `GET /api/alerts` | List alerts với filter | AlertRepository query | Theo dõi toàn bộ cảnh báo theo mức độ, trạng thái và thời gian |
| `GET /api/alerts/:id` | Alert detail | AlertRepository query | Mở chi tiết cảnh báo để điều tra nguyên nhân và lịch sử xử lý |
| `PATCH /api/alerts/:id` | Update alert status | AlertService.updateStatus() | Xác nhận hoặc đóng cảnh báo để quản lý vòng đời xử lý |
| `POST /api/alerts/batch` | Batch acknowledge/resolve | AlertService.batchUpdate() | Xử lý nhiều cảnh báo cùng lúc để giảm thao tác thủ công |
| `GET /api/alerts/history` | Alert history by day | AlertRepository aggregation | Xem xu hướng cảnh báo theo ngày để báo cáo và phân tích |
| `GET /api/health` | Health check (DB, Redis) | HealthController | Kiểm tra nhanh MongoDB và Redis còn hoạt động trước khi deploy |
| `GET /api/stats` | System statistics | StatsService | Lấy số liệu tổng hợp để hiển thị KPI và trạng thái hệ thống |
| `GET /api/metrics` | Prometheus metrics export | MetricsController (prom-client) | Cung cấp metrics cho Prometheus/Grafana theo dõi hệ thống |
| WebSocket events | Real-time broadcasts | EventsGateway, AlertsGateway | Phát cảnh báo và trạng thái xử lý ngay lập tức tới dashboard thay vì polling |

### 🟢 **APIs Từ Thư Viện (Third-party Dependencies)**

Sử dụng frameworks & libraries:

| API / Feature | Thư viện | Mục đích | Vấn đề / Tính năng giải quyết |
|---------------|---------|---------|------|
| `GET /api/docs` | `@nestjs/swagger` | Swagger UI documentation | Cho phép developers & tester khám phá API mà không cần đọc source code |
| `POST /api/metrics` | `prom-client` | Prometheus metrics collection | Xuất metrics hệ thống (CPU, memory, latency) để Prometheus scrape & Grafana visualize |
| WebSocket (core) | `socket.io` | Real-time bidirectional communication | Phát broadcast alert:new/alert:acknowledged/alert:resolved real-time tới dashboard (thay vì polling) |
| Guard `@UseGuards(ApiKeyGuard)` | `@nestjs/common` | Custom API Key authentication | Bảo vệ event ingestion endpoint khỏi truy cập không được phép (F1) |
| Guard `@UseGuards(RateLimitGuard)` | `@nestjs/common` (custom impl) | Rate limiting by IP | Giới hạn số request/phút từ một IP để chống DDoS & sử dụng quá mức (E4) |
| Validation pipes | `class-validator` + `class-transformer` | Request DTO validation | Validate schema event ingestion (deviceId, location, metrics) trước khi queue |
| Logger | `@nestjs/common` Logger | Structured logging | Ghi log theo JSON format để dễ parse & khám phá lỗi trong Docker logs |

### 🟡 **APIs Được Dùng Lại / Wrapped (Internal Wrappers)**

Các NestJS built-in features được tùy chỉnh:

| Feature | Nguồn | Cách sử dụng | Vấn đề / Tính năng giải quyết |
|---------|-------|-------------|------|
| Request interceptors | NestJS Express | Custom logging, correlation ID | Ghi log tất cả request/response + trace request xuyên suốt các service qua `correlationId` (F4) |
| Exception filters | NestJS | Global error handling | Bắt lỗi & format response JSON đồng nhất thay vì raw stack traces |
| Middleware (CORS) | Express | Configured in main.ts | Cho phép dashboard (localhost:3001) truy cập API (localhost:3000) mà không bị block CORS |
| Database client | Mongoose | MongoDB ODM queries | Sao chép TypeScript schema & query (save, find, update) thay vì raw MongoDB client |
| Queue client | BullMQ | Redis-backed job queue | Decouple event ingestion từ xử lý (publish-subscribe) để API trả về 202 nhanh ngay tức khắc |
| Cache client | Redis client | In-memory rate limiting fallback | Lưu rate limit counter theo IP, fallback to memory nếu Redis down |

---

## Sự kiện (Events)

### `POST /api/events`

Tạo sự kiện mới. API trả về `202 Accepted` — dữ liệu được xử lý bất đồng bộ qua hàng đợi.

**Header bắt buộc (khi `API_KEY` được cấu hình):**

- `x-api-key: <your-api-key>`

**Request body:**

```json
{
  "deviceId": "device-01",
  "location": { "lat": 10.77, "lng": 106.7, "name": "HCM-Tower-1" },
  "metrics": { "latency": 240, "packetLoss": 7, "signalStrength": -95 }
}
```

**Ví dụ cURL:**

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "x-api-key: <your-api-key>" \
  -d '{
    "deviceId": "device-01",
    "location": { "lat": 10.77, "lng": 106.7, "name": "HCM-Tower-1" },
    "metrics": { "latency": 240, "packetLoss": 7, "signalStrength": -95 }
  }'
```

### `GET /api/events`

Danh sách sự kiện với phân trang và bộ lọc:

| Tham số | Kiểu | Mô tả | Vấn đề / Tính năng giải quyết |
|---------|------|-------|------------------------------|
| `deviceId` | string | Lọc theo thiết bị | Tập trung vào một thiết bị khi cần điều tra hoặc đối soát dữ liệu |
| `skip` | number | Bỏ qua N bản ghi | Phục vụ phân trang để tải dữ liệu lớn theo từng trang |
| `limit` | number | Số bản ghi trả về | Giới hạn payload để dashboard tải nhanh hơn |
| `from` | string | Từ ngày (ISO 8601) | Khoanh vùng khoảng thời gian cần truy vấn |
| `to` | string | Đến ngày (ISO 8601) | Xác định ranh giới thời gian để lọc lịch sử chính xác |

### `GET /api/events/:id`

Chi tiết một sự kiện theo ID.

---

## Cảnh báo (Alerts)

### `GET /api/alerts`

Danh sách cảnh báo với bộ lọc:

| Tham số | Kiểu | Mô tả | Vấn đề / Tính năng giải quyết |
|---------|------|-------|------------------------------|
| `severity` | string | `high`, `medium`, `low` | Ưu tiên xử lý các cảnh báo nặng trước |
| `status` | string | `open`, `acknowledged`, `resolved` | Theo dõi vòng đời cảnh báo từ phát sinh tới đóng |
| `skip` | number | Bỏ qua N bản ghi | Hỗ trợ phân trang danh sách cảnh báo |
| `limit` | number | Số bản ghi trả về | Giảm tải khi hiển thị danh sách lớn |

### `GET /api/alerts/:id`

Chi tiết cảnh báo.

### `PATCH /api/alerts/:id`

Cập nhật trạng thái cảnh báo.

**Chuyển trạng thái hợp lệ:**

- `open` → `acknowledged` (xác nhận tiếp nhận)
- `acknowledged` → `resolved` (đánh dấu đã xử lý)

**Request body:**

```json
{
  "status": "acknowledged",
  "acknowledgedBy": "Nguyễn Văn A"
}
```

```json
{
  "status": "resolved",
  "resolvedBy": "Trần Văn B",
  "resolutionNote": "Đã khởi động lại router, latency trở về bình thường"
}
```

---

## Hệ thống

### `GET /api/health`

Trạng thái sức khỏe hệ thống: MongoDB, Redis.

### `GET /api/stats`

Thống kê tổng hợp: tổng sự kiện, cảnh báo đang mở, events/phút.

---

## WebSocket Events

| Event | Mô tả | Vấn đề / Tính năng giải quyết |
|-------|-------|------------------------------|
| `alert:new` | Cảnh báo mới được tạo | Đẩy cảnh báo lên dashboard ngay khi phát sinh |
| `alert:acknowledged` | Cảnh báo đã được xác nhận | Đồng bộ trạng thái xử lý tới tất cả người xem |
| `alert:resolved` | Cảnh báo đã được xử lý | Cập nhật tức thời khi sự cố đã được khắc phục |
| `event:processed` | Sự kiện xử lý xong | Cho biết pipeline ingestion đã hoàn tất event |
| `device:status:changed` | Thiết bị thay đổi trạng thái | Theo dõi thay đổi trạng thái thiết bị theo thời gian thực |
| `queue:depth` | Độ sâu hàng đợi | Phát hiện backlog để cảnh báo khi hệ thống bị dồn tải |
| `worker:stats` | Thống kê Worker | Giám sát hiệu suất xử lý của worker theo thời gian thực |

---

## Định dạng lỗi

Các endpoint trả về lỗi dạng JSON với `message` và `statusCode`. Lỗi validation được xử lý bởi NestJS validation pipes.