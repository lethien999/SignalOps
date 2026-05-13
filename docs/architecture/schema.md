# Cấu hình Schema MongoDB cho SignalOps

Tài liệu này mô tả các collection, cấu trúc tài liệu mẫu và các index được khuyến nghị cho triển khai local và production.

---

## Các Collection

| Collection      | Mục đích                    | Ghi chú                              |
| --------------- | --------------------------- | ------------------------------------ |
| `events`        | Sự kiện telemetry thô       | Lưu trữ ngắn hạn, có thể TTL/archive |
| `alerts`        | Cảnh báo được tạo từ events | Lưu trữ lâu dài                      |
| `failed_events` | DLQ / xử lý thất bại        | Cho phép replay thủ công             |
| `api_keys`      | Khóa API cho ingestion      | Seed demo local                      |

---

## Tài liệu Mẫu

### Events (Sự kiện)

```javascript
{
  _id: ObjectId,
  deviceId: String,              // ID thiết bị
  location: {                    // Vị trí địa lý
    lat: Number,
    lng: Number,
    name?: String               // Tên vị trí (tuỳ chọn)
  },
  metrics: {                     // Chỉ số hiệu suất
    latency: Number,            // Độ trễ (ms)
    packetLoss: Number,         // Mất gói (%)
    signalStrength: Number      // Độ mạnh tín hiệu (dBm)
  },
  timestamp: ISODate,           // Thời gian sự kiện
  processedAt?: ISODate,        // Thời gian xử lý
  alertId?: String,             // Liên kết cảnh báo
  createdAt: ISODate,           // Khi tạo trong hệ thống
  updatedAt: ISODate
}
```

### Alerts (Cảnh báo)

```javascript
{
  _id: ObjectId,
  alertId: String,              // ID cảnh báo duy nhất
  deviceId: String,             // ID thiết bị
  type: String,                 // Loại: 'latency', 'packet_loss', 'signal'
  severity: String,             // Mức độ: 'high', 'medium', 'low'
  location: {                   // Vị trí địa lý
    lat: Number,
    lng: Number,
    name?: String
  },
  message: String,              // Mô tả cảnh báo
  status: String,               // Trạng thái: 'open', 'acknowledged', 'resolved'
  acknowledgedBy?: String,      // Tên người xác nhận
  acknowledgedAt?: ISODate,     // Khi xác nhận
  resolvedAt?: ISODate,         // Khi xử lý xong
  resolvedBy?: String,          // Tên người xử lý
  resolutionNote?: String,      // Ghi chú xử lý
  eventId?: String,             // Liên kết event gốc
  createdAt: ISODate,           // Khi tạo cảnh báo
  updatedAt: ISODate
}
```

### Failed Events (DLQ - Hàng chờ thư tả)

```javascript
{
  _id: ObjectId,
  event: Object,                // Sự kiện gốc
  errorMessage: String,         // Thông báo lỗi
  retryCount: Number,           // Số lần thử lại
  nextRetryAt: ISODate,         // Lần thử tiếp theo
  firstFailedAt: ISODate        // Lần thất bại đầu tiên
}
```

### API Keys (Khóa API)

```javascript
{
  _id: ObjectId,
  key: String,                  // Khóa bí mật
  name: String,                 // Tên khóa (mô tả)
  description?: String,         // Chi tiết
  scopes?: [String],            // Phạm vi quyền hạn
  createdAt: ISODate,           // Khi tạo
  updatedAt?: ISODate,
  lastUsedAt?: ISODate,         // Lần dùng gần nhất
  active: Boolean               // Trạng thái hoạt động
}
```

---

## Các Index (Lệnh MongoDB shell)

### Events

```javascript
// Index cho query thiết bị theo thời gian
db.events.createIndex({ deviceId: 1, timestamp: -1 });

// Index cho query mọi event theo thời gian (ví dụ dashboard)
db.events.createIndex({ timestamp: -1 });

// TTL index: tự xóa events sau 30 ngày
db.events.createIndex({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
```

### Alerts

```javascript
// Index chính: query theo trạng thái, thiết bị, thời gian
db.alerts.createIndex({ status: 1, deviceId: 1, createdAt: -1 });

// Index cho query alerts đã xử lý
db.alerts.createIndex({ resolvedAt: 1 });

// Full-text search trên thông báo
db.alerts.createIndex({ message: 'text' });
```

### Failed Events (DLQ)

```javascript
// Index cho retry queue
db.failed_events.createIndex({ retryCount: 1 });

// Index cho scheduled retry
db.failed_events.createIndex({ nextRetryAt: 1 });
```

### API Keys

```javascript
// Unique index trên khóa
db.api_keys.createIndex({ key: 1 }, { unique: true });
```

---

## Ghi Chú Mở Rộng (Scaling)

- **Sharding**: Khi dữ liệu lớn, xem xét sharding collection `events` theo hashed `deviceId` hoặc time-range để tăng throughput ghi.
- **TTL + Archive**: Sử dụng TTL index + công việc archiver để di chuyển events cũ sang lưu trữ lạnh.
- **Aggregation**: Pre-aggregate dữ liệu vào collection `aggregates` để tăng hiệu suất đọc dashboard.

---

## Vận Hành

- **Backup**: Backup hàng đêm và kiểm tra restore thường xuyên.
- **Giám sát**: Theo dõi kích thước collection `events` và sử dụng index.
- **Seed dữ liệu**: Seed khóa API cho demo local sử dụng `apps/api-gateway/scripts/init-db.mjs`.
- **Performance**: Monitor query performance khi data > 50M documents.

---

**Cập nhật**: 04/05/2026
