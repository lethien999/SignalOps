# SignalOps — Tham khảo API

## URL cơ sở

- REST API: `http://localhost:3000/api`
- Swagger UI: `http://localhost:3000/api/docs`
- WebSocket: `http://localhost:3000`

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

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `deviceId` | string | Lọc theo thiết bị |
| `skip` | number | Bỏ qua N bản ghi |
| `limit` | number | Số bản ghi trả về |
| `from` | string | Từ ngày (ISO 8601) |
| `to` | string | Đến ngày (ISO 8601) |

### `GET /api/events/:id`

Chi tiết một sự kiện theo ID.

---

## Cảnh báo (Alerts)

### `GET /api/alerts`

Danh sách cảnh báo với bộ lọc:

| Tham số | Kiểu | Mô tả |
|---------|------|-------|
| `severity` | string | `high`, `medium`, `low` |
| `status` | string | `open`, `acknowledged`, `resolved` |
| `skip` | number | Bỏ qua N bản ghi |
| `limit` | number | Số bản ghi trả về |

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

| Event | Mô tả |
|-------|-------|
| `alert:new` | Cảnh báo mới được tạo |
| `alert:acknowledged` | Cảnh báo đã được xác nhận |
| `alert:resolved` | Cảnh báo đã được xử lý |
| `event:processed` | Sự kiện xử lý xong |
| `device:status:changed` | Thiết bị thay đổi trạng thái |
| `queue:depth` | Độ sâu hàng đợi |
| `worker:stats` | Thống kê Worker |

---

## Định dạng lỗi

Các endpoint trả về lỗi dạng JSON với `message` và `statusCode`. Lỗi validation được xử lý bởi NestJS validation pipes.