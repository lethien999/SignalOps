# Hồ sơ Quyết định Kiến trúc (ADR)

## ADR-001: Mô hình Outbox để Đảm bảo Độ tin cậy Sự kiện

**Ngày**: 2025-01-15
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Sự kiện phải tồn tại nếu queue bị lỗi (nếu commit DB thành công nhưng queue bị lỗi)

**Quyết định**: Triển khai Mô hình Outbox

- Lưu sự kiện vào MongoDB outbox trước
- Xuất bản sang queue thông qua dịch vụ nền
- Thử lại nếu xuất bản queue bị lỗi
- Tự động xóa dữ liệu sau khi xuất bản thành công

**Lý do**:

- Đảm bảo gửi ít nhất một lần
- Ngăn chặn mất sự kiện do queue bị lỗi tạm thời
- Tách biệt lưu trữ sự kiện với khả dụng queue
- Đơn giản hơn giao dịch phân tán

**Hệ quả**:

- ✅ Độ bền vững sự kiện được cải thiện
- ✅ Không mất sự kiện khi Redis/queue bị lỗi
- ⚠️ Trễ 2-5 giây trước khi xử lý queue (chấp nhận được)
- ⚠️ Lưu trữ MongoDB bổ sung cho outbox (giảm nhẹ bằng tự động xóa)

**Các phương án được xem xét**:

- Mô hình Saga: Bỏ qua (quá phức tạp)
- Ghi đôi (MongoDB + Redis): Bỏ qua (không idempotent)
- Sourcing sự kiện: Bỏ qua (cần thiết kế lại lớn)

---

## ADR-002: Circuit Breaker để Ngăn chặn Lỗi Tầng điều phối

**Ngày**: 2025-01-20
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Nếu Redis bị lỗi, thao tác queue thử lại vô hạn, cạn kiệt tài nguyên

**Quyết định**: Triển khai mô hình Circuit Breaker

- CLOSED: Hoạt động bình thường
- OPEN: Thất bại nhanh sau 5 lỗi
- HALF_OPEN: Kiểm tra phục hồi mỗi 60 giây

**Lý do**:

- Ngăn chặn vấn đề đàn ăn cỏ
- Cho phép hệ thống suy giảm khắc phục
- Phát hiện lỗi nhanh (ngăn chặn treo)
- Phục hồi tự động khi phụ thuộc phục hồi

**Hệ quả**:

- ✅ Phát hiện lỗi nhanh hơn
- ✅ Bảo vệ tài nguyên
- ⚠️ Một số sự kiện có thể không được queue trong trạng thái OPEN (có thể phục hồi thông qua outbox)
- ⚠️ Cần giám sát trạng thái OPEN

**Cấu hình**:

```javascript
const breaker = new CircuitBreaker({
  failureThreshold: 5, // Thất bại sau 5 lỗi
  successThreshold: 2, // Phục hồi sau 2 thành công
  timeout: 60000, // Kiểm tra phục hồi mỗi 60s
});
```

---

## ADR-003: AsyncLocalStorage cho ID Tương quan

**Ngày**: 2025-01-22
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Theo dõi yêu cầu qua API → Queue → Worker → Database

**Quyết định**: Sử dụng Node.js AsyncLocalStorage

- Bao lấy xử lý yêu cầu trong ngữ cảnh
- Lưu trữ correlationId cho thời lượng vòng đời yêu cầu
- Tự động lan truyền qua chuỗi async/await

**Lý do**:

- API Node.js tích hợp sẵn (không phụ thuộc bên ngoài)
- Duy trì ngữ cảnh qua các thao tác không đồng bộ
- Không cần chuyển tham số thủ công
- Hoạt động với async/await, Promises, callbacks

**Hệ quả**:

- ✅ Tracing phân tán được bật
- ✅ Gỡ lỗi trên các dịch vụ đơn giản hóa
- ✅ Không cần mã boilerplate chuyển tham số
- ⚠️ Cần khởi tạo ngữ cảnh cẩn thận
- ⚠️ Có thể rò rỉ ngữ cảnh nếu không dọn dẹp đúng cách

**Cách sử dụng**:

```typescript
// Khởi tạo ngữ cảnh cho yêu cầu
app.use((req, res, next) => {
  asyncLocalStorage.run(req.correlationId, () => next());
});

// Truy cập từ bất kỳ đâu trong chuỗi không đồng bộ
const correlationId = CorrelationContextManager.getCorrelationId();
```

---

## ADR-004: MongoDB Aggregation Pipeline so với Lọc Bộ nhớ trong

**Ngày**: 2025-01-20
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Lấy sự kiện mới nhất cho mỗi thiết bị từ 500+ sự kiện

**Quyết định**: Sử dụng ống MongoDB aggregation `$group`

- Truy vấn: `[ $sort, $group (mới nhất theo thiết bị), $limit, $replaceRoot, $sort ]`
- Để MongoDB xử lý nhóm hóa, không phải mã ứng dụng

**Lý do**:

- Truy vấn cơ sở dữ liệu đơn so với 500+ lần lặp trong bộ nhớ
- Nhanh hơn 10-100 lần tùy theo kích thước dữ liệu
- Giảm sử dụng bộ nhớ trong Node.js
- MongoDB tối ưu hóa kế hoạch thực thi

**Hệ quả**:

- ✅ Thời gian truy vấn 50-100ms so với 500ms+ trong bộ nhớ
- ✅ Giảm dấu chân bộ nhớ
- ✅ Mở rộng quy mô lên hàng triệu sự kiện
- ⚠️ Cú pháp aggregation phức tạp (cần tài liệu)

**Ví dụ**:

```javascript
const result = await eventModel
  .aggregate([
    { $sort: { createdAt: -1 } },
    { $group: { _id: '$deviceId', event: { $first: '$$ROOT' } } },
    { $limit: 500 },
    { $replaceRoot: { newRoot: '$event' } },
    { $sort: { createdAt: -1 } },
  ])
  .exec();
```

---

## ADR-005: Backoff với Jitter để Tránh Cơn bão Thử lại

**Ngày**: 2025-01-21
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Khi xử lý queue bị lỗi, ngăn chặn tất cả worker thử lại đồng thời

**Quyết định**: Sử dụng backoff hàm mũ với full jitter

- Công thức: `delay = random(0, min(maxDelay, baseDelay × 2^attempt))`
- Trải rộng thử lại trên cửa sổ thời gian
- Ngăn chặn cơn bão thử lại đồng bộ hóa

**Lý do**:

- Hàm mũ: Độ trễ tăng nhanh cho lỗi liên tục
- Jitter: Ngẫu nhiên hóa ngăn chặn vấn đề đàn ăn cỏ
- Full jitter: Phân phối đều trên cửa sổ thử lại
- Thực tiễn tiêu chuẩn ngành (AWS, Google)

**Hệ quả**:

- ✅ Giảm tải đỉnh trong quá trình phục hồi
- ✅ Ổn định queue tốt hơn
- ⚠️ Phục hồi chậm hơn một chút (đánh đổi chấp nhận được)
- ⚠️ Thời gian thử lại kém dự đoán hơn (chấp nhận được cho công việc nền)

**Triển khai**:

```typescript
const delay = Math.random() * Math.min(32000, 2000 * Math.pow(2, attempt));
setTimeout(() => retry(), delay);
```

---

## ADR-006: Docker Builds Đa giai đoạn để Tối ưu hóa Kích thước

**Ngày**: 2025-01-19
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Hình ảnh Docker Node.js bao gồm công cụ xây dựng không cần thiết khi chạy

**Quyết định**: Mô hình xây dựng đa giai đoạn

- Giai đoạn Builder: Cài đặt phụ thuộc dev, biên dịch TypeScript
- Giai đoạn Runtime: Sao chép chỉ mã biên dịch, phụ thuộc sản xuất
- Kết quả: Hình ảnh nhỏ hơn 40-50%

**Lý do**:

- Giảm kích thước hình ảnh từ 500MB → 250MB
- Giảm sử dụng bộ nhớ khi chạy
- Khởi động container nhanh hơn
- Bề mặt tấn công nhỏ hơn (ít công cụ hơn trong production)

**Hệ quả**:

- ✅ Giảm kích thước hình ảnh 40-50%
- ✅ Triển khai nhanh hơn
- ✅ Tư thế bảo mật tốt hơn
- ✅ Người dùng không phải root (uid 1001) để bảo mật
- ⚠️ Thời gian xây dựng hơi dài (không đáng kể)

**Ví dụ**:

```dockerfile
FROM node:18-alpine AS builder
COPY package*.json .
RUN npm ci
RUN npm run build

FROM node:18-alpine
RUN addgroup nodejs 1001 && adduser nodejs -u 1001
COPY --from=builder --chown=nodejs:nodejs /app/dist .
USER nodejs
CMD ["node", "dist/main.js"]
```

---

## ADR-007: TTL Index để Hết hạn Sự kiện Tự động

**Ngày**: 2025-01-18
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Sự kiện cũ hơn 90 ngày phải tự động xóa

**Quyết định**: MongoDB TTL index với hết hạn 90 ngày

- Index: `{ createdAt: 1 }, expireAfterSeconds: 7776000`
- MongoDB daemon tự động xóa tài liệu đã hết hạn
- Không cần mã ứng dụng để dọn dẹp

**Lý do**:

- Tự động, không cần công việc định kỳ
- Hiệu quả (MongoDB tối ưu hóa cho TTL)
- Giảm chi phí lưu trữ theo thời gian
- 90 ngày = cân bằng giữa chi phí và phân tích lịch sử

**Hệ quả**:

- ✅ Quản lý lưu trữ tự động
- ✅ Không phức tạp công việc định kỳ
- ✅ Cơ sở dữ liệu vẫn quản lý được kích thước
- ⚠️ Giai đoạn 1: Không lưu trữ (dữ liệu chỉ bị xóa, không được bảo tồn)
- ⚠️ Giai đoạn 1: Không thể truy vấn sự kiện > 90 ngày
- ✅ Giai đoạn 2: Chiến lược lưu trữ triển khai

**Lịch trình sửa chữa**:

- Giai đoạn 1 (Bây giờ): TTL xóa, không lưu trữ
- Giai đoạn 2 (Q2 2025): Lưu trữ trước khi xóa

---

## ADR-008: Giới hạn Tốc độ dựa trên Redis với Circuit Breaker

**Ngày**: 2025-01-16
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: API cần giới hạn tốc độ để ngăn chặn lạm dụng

**Quyết định**: Bộ đếm cửa sổ trượt dựa trên Redis

- Khóa: `rate-limit:{userId}:{endpoint}`
- Cửa sổ trượt: Đếm yêu cầu trong 60 giây cuối cùng
- Giới hạn: 100 yêu cầu trên 60 giây trên mỗi người dùng
- Circuit breaker: Nếu Redis bị lỗi, cho phép yêu cầu (chế độ suy giảm)

**Lý do**:

- Phân tán trên nhiều thể hiện API
- Cửa sổ trượt chính xác so với cửa sổ cố định
- Độ trễ thấp (Redis trong bộ nhớ)
- Không thành công (cho phép lưu lượng nếu Redis không khả dụng)

**Hệ quả**:

- ✅ API được bảo vệ khỏi lạm dụng
- ✅ Giới hạn tốc độ phân tán hoạt động
- ⚠️ Cần phụ thuộc Redis
- ⚠️ Thời gian ban ân miễn nếu Redis bị lỗi (có thể cho phép lạm dụng tạm thời)

---

## ADR-009: Kết nối riêng biệt cho Queue so với Pub/Sub

**Ngày**: 2025-01-21
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Queue BullMQ và Redis Pub/Sub có thể chặn nhau trên cùng một kết nối

**Quyết định**: Sử dụng kết nối Redis riêng biệt

- Kết nối Queue: `new Redis(queueConfig)` với `maxRetriesPerRequest: 3`
- Kết nối Pub/Sub: `new Redis(pubSubConfig)` dành riêng
- Ngăn chặn chặn chéo

**Lý do**:

- BullMQ yêu cầu lệnh chặn (bộ kết nối khác nhau)
- Pub/Sub sử dụng chặn subscribe (chặn các thao tác khác)
- Kết nối riêng biệt đảm bảo cách ly
- Hiệu suất và ổn định tốt hơn

**Hệ quả**:

- ✅ Queue và Pub/Sub không can thiệp
- ✅ Hiệu suất tốt hơn
- ⚠️ Sử dụng bộ nhớ cao hơn một chút (2 kết nối so với 1)

**Triển khai**:

```typescript
const queueRedis = new Redis(getRedisQueueConfig());
const pubSubRedis = new Redis(createRedisPubSubClient());
```

---

## ADR-010: Thu thập Số liệu Kinh doanh với prom-client

**Ngày**: 2025-01-22
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Prometheus cần các số liệu kinh doanh tùy chỉnh (sự kiện được nhập, cảnh báo được tạo, độ sâu queue)

**Quyết định**: Sử dụng thư viện prom-client để thu thập và phơi bày số liệu

- Bộ đếm: `signalops_events_ingested_total`, `signalops_alerts_created_total`
- Gauge: `signalops_queue_depth`
- Histogram: `signalops_job_processing_seconds`
- Điểm cuối: `/api/metrics` (Prometheus scrape)

**Lý do**:

- Thư viện tiêu chuẩn cho công cụ Prometheus
- Overhead thấp
- Hoạt động với các bảng điều khiển Grafana hiện có
- Cho phép cảnh báo dựa trên SLO kinh doanh

**Hệ quả**:

- ✅ Hiển thị số liệu kinh doanh
- ✅ Cảnh báo trên SLO có thể
- ✅ Đường cơ sở để phân tích xu hướng
- ⚠️ Cần ghi số liệu kỷ luật trong mã

**Cách sử dụng**:

```typescript
BusinessMetrics.recordEventIngested('api');
BusinessMetrics.recordAlertCreated('latency', 'high');
BusinessMetrics.recordQueueDepth('event-processing', 45);
```

---

## ADR-011: OpenTelemetry cho Tracing Phân tán

**Ngày**: 2025-01-23
**Trạng thái**: Chấp nhận ✅
**Bối cảnh**: Cần khả năng hiển thị end-to-end trên API → Queue → Worker → DB

**Quyết định**: SDK OpenTelemetry cho công cụ tự động

- Traces HTTP requests, thao tác cơ sở dữ liệu, hàng đợi tin nhắn
- Xuất sang Jaeger để trực quan hóa
- Tích hợp với ID tương quan hiện có

**Lý do**:

- Tiêu chuẩn ngành cho khả quan sát
- Công cụ tự động (thay đổi mã tối thiểu)
- Hoạt động với async/await Node.js
- Hỗ trợ nhiều trình xuất (Jaeger, Datadog, v.v.)

**Hệ quả**:

- ✅ Tracing phân tán được bật
- ✅ Gỡ lỗi đơn giản hóa
- ⚠️ Phụ thuộc bổ sung (gói OpenTelemetry)
- ⚠️ Overhead: ~1-2% tăng độ trễ
- ⚠️ Jaeger phải chạy

**Thiết lập**:

```typescript
import { initializeTracing } from '@signalops/common';
initializeTracing(); // Gọi trước khi ứng dụng khởi động
```

---

## Quyết định đang được Xem xét

### Điểm quyết định: TimescaleDB so với MongoDB

**Bối cảnh**: Ở 10M+ sự kiện/tháng, xem xét cơ sở dữ liệu chuyên biệt cho chuỗi thời gian

**Tùy chọn**:

1. Giữ lại MongoDB (mở rộng quy mô lên 50M/tháng với phân trang + bộ nhớ đệm)
2. Migrate sang TimescaleDB (phần mở rộng chuỗi thời gian PostgreSQL)
3. Hybrid: Giữ MongoDB cho giao dịch, TimescaleDB cho phân tích

**Lịch trình**: Q3 2025 (xem lại nếu khối lượng sự kiện > 50M/tháng)
**Chủ sở hữu**: Data Engineering
**Trạng thái**: Trì hoãn

---

## Lịch trình Xem xét

| ADR                          | Xem xét lần cuối | Xem xét tiếp theo            |
| ---------------------------- | ---------------- | ---------------------------- |
| ADR-001 (Outbox)             | 2025-01-15       | Q3 2025                      |
| ADR-002 (Circuit Breaker)    | 2025-01-20       | Q2 2025                      |
| ADR-003 (AsyncLocal)         | 2025-01-22       | Q4 2025                      |
| ADR-004 (Aggregation)        | 2025-01-20       | Q3 2025                      |
| ADR-005 (Jitter Backoff)     | 2025-01-21       | Q4 2025                      |
| ADR-006 (Docker Multi-stage) | 2025-01-19       | Q3 2025                      |
| ADR-007 (TTL Index)          | 2025-01-18       | Q2 2025 (chiến lược lưu trữ) |
| ADR-008 (Rate Limiting)      | 2025-01-16       | Q4 2025                      |
| ADR-009 (Connections)        | 2025-01-21       | Q3 2025                      |
| ADR-010 (prom-client)        | 2025-01-22       | Q2 2025                      |
| ADR-011 (OpenTelemetry)      | 2025-01-23       | Q3 2025                      |

---

## Cách Đề xuất ADR mới

1. Tạo tệp: `docs/adr/ADR-NNN-title.md`
2. Điền mẫu: Trạng thái, Bối cảnh, Quyết định, Lý do, Hệ quả
3. Thảo luận với đội trong PR
4. Merge khi đạt được sự đồng thuận
5. Thông báo trong cuộc họp đội
