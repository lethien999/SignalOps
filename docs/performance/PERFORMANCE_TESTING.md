# Hướng dẫn kiểm thử hiệu năng SignalOps

Tài liệu này mô tả các bộ kiểm thử hiệu năng có sẵn trong SignalOps. Mục tiêu là xác minh hệ thống chịu tải tốt như thế nào trong môi trường local, staging và production.

---

## Bắt Đầu Nhanh

### Điều kiện cần

- Đã cài Node.js 18+ và npm
- Các dịch vụ SignalOps đang chạy (`docker-compose up`)
- File `.env` đã được cấu hình `API_KEY` để xác thực

### Chạy toàn bộ kiểm thử

```bash
# Unit + integration tests
npm run test:integration

# Load testing
npm run perf:load

# WebSocket broadcast testing
npm run perf:websocket

# Long-running soak test
npm run perf:soak
```

---

## 1. Kiểm thử tải HTTP (`npm run perf:load`)

Bộ này kiểm thử HTTP API dưới tải đồng thời. Nó đo throughput, latency (avg và P95), và error rate.

### Cách dùng cơ bản

```bash
npm run perf:load
```

Hành vi mặc định:

- Thời lượng: 30 giây
- Concurrency: 10 worker đồng thời
- Endpoint mục tiêu: `http://localhost:3000/api/events`
- Output: JSON chứa metrics

### Cấu hình (biến môi trường)

| Biến                         | Mặc định           | Mục đích                                                                     |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------------- |
| `PERF_TEST_TOTAL_REQUESTS`   | 0 (không giới hạn) | Số request cố định. Nếu đặt giá trị này, chế độ theo thời lượng sẽ bị ghi đè |
| `PERF_TEST_CONCURRENCY`      | 10                 | Số worker đồng thời                                                          |
| `PERF_TEST_DURATION_SECONDS` | 30                 | Thời gian chạy (bị bỏ qua nếu `PERF_TEST_TOTAL_REQUESTS` được đặt)           |
| `PERF_TEST_MAX_AVG_MS`       | (không có)         | Assertion: fail nếu latency trung bình vượt ngưỡng này                       |
| `PERF_TEST_MAX_P95_MS`       | (không có)         | Assertion: fail nếu latency P95 vượt ngưỡng này                              |
| `PERF_TEST_MAX_ERROR_RATE`   | (không có)         | Assertion: fail nếu error rate vượt ngưỡng này (0.0-1.0)                     |

### Ví dụ

**Probe test (5 request, 2 worker)**

```bash
$env:PERF_TEST_TOTAL_REQUESTS='5'
$env:PERF_TEST_CONCURRENCY='2'
node scripts/perf-load.mjs
```

**Load test 30 giây với 50 worker đồng thời**

```bash
$env:PERF_TEST_CONCURRENCY='50'
$env:PERF_TEST_DURATION_SECONDS='30'
npm run perf:load
```

**1000 request, fail nếu P95 > 500ms**

```bash
$env:PERF_TEST_TOTAL_REQUESTS='1000'
$env:PERF_TEST_CONCURRENCY='100'
$env:PERF_TEST_MAX_P95_MS='500'
npm run perf:load
```

**100 request/giây trong 5 phút (theo thời lượng, ~30.000 request)**

```bash
$env:PERF_TEST_DURATION_SECONDS='300'
$env:PERF_TEST_CONCURRENCY='100'  # Sẽ throttle để đạt 100 req/s
npm run perf:load
```

### Định dạng đầu ra

```json
{
  "event": "perf:load:summary",
  "baseUrl": "http://localhost:3000",
  "concurrency": 10,
  "durationSeconds": 30,
  "targetTotalRequests": 0,
  "success": 1456,
  "errors": 3,
  "throughputPerSecond": 48.53,
  "avgMs": 205.23,
  "p95Ms": 312.44,
  "errorRate": 0.002
}
```

### Cách đọc kết quả

- **throughputPerSecond**: Số request được xử lý mỗi giây
- **avgMs**: Thời gian phản hồi trung bình tính bằng mili-giây
- **p95Ms**: Độ trễ phân vị 95% (95% request nhanh hơn giá trị này)
- **errorRate**: Tỷ lệ request thất bại (ví dụ 0.02 = 2%)

### Mục tiêu thường dùng

| Chỉ số              | Mục tiêu   | Ghi chú                                      |
| ------------------- | ---------- | -------------------------------------------- |
| throughputPerSecond | >100 req/s | Với 10 concurrent, kỳ vọng khoảng ~500 req/s |
| avgMs               | <100 ms    | Thời gian phản hồi trung bình                |
| p95Ms               | <200 ms    | 95% request hoàn tất trong thời gian này     |
| errorRate           | <0.01 (1%) | Ít hơn 1% request thất bại                   |

---

## 2. Kiểm thử soak (`npm run perf:soak`)

Đây là bài test chạy dài để phát hiện memory leak hoặc suy giảm hiệu năng theo thời gian. Nó dùng cùng cấu hình với load testing nhưng thường chạy trong nhiều giờ.

### Cách dùng cơ bản

```bash
# Chạy 10 phút
$env:PERF_TEST_DURATION_SECONDS='600'
npm run perf:soak
```

### Cấu hình khuyến nghị

```bash
$env:PERF_TEST_CONCURRENCY='20'         # Tải vừa phải
$env:PERF_TEST_DURATION_SECONDS='3600'  # 1 giờ
npm run perf:soak
```

**Soak test 24 giờ** (dùng để xác thực production)

```bash
$env:PERF_TEST_CONCURRENCY='50'
$env:PERF_TEST_DURATION_SECONDS='86400'  # 24 giờ
npm run perf:soak
```

### Cần theo dõi gì

Trong lúc soak test chạy, hãy quan sát:

1. Memory usage: dùng `docker stats` hoặc `ps aux`
2. CPU usage: mức sử dụng tài nguyên nên ổn định
3. Logs: kiểm tra xem error rate hoặc warning có tăng dần không
4. Metrics: xem Prometheus dashboard cho metrics tùy chỉnh của ứng dụng

### Ví dụ: theo dõi trong lúc soak

```bash
# Mở terminal khác để xem Docker stats
docker stats signalops-api-gateway signalops-worker signalops-mongodb

# Xem log để tìm lỗi
docker-compose logs -f api-gateway worker
```

---

## 3. Kiểm thử broadcast WebSocket (`npm run perf:websocket`)

Bộ này kiểm thử real-time WebSocket broadcasts. Nó kết nối N client, kích hoạt một alert qua HTTP, rồi đo có bao nhiêu client nhận được broadcast trong thời gian chờ.

### Cách dùng cơ bản

```bash
npm run perf:websocket
```

Hành vi mặc định:

- Số client: 100
- Timeout: 20 giây (đợi broadcast)
- Output: JSON chứa delivery metrics

### Cấu hình (biến môi trường)

| Biến                   | Mặc định | Mục đích                                                |
| ---------------------- | -------- | ------------------------------------------------------- |
| `PERF_TEST_CLIENTS`    | 100      | Số WebSocket clients cần kết nối                        |
| `PERF_TEST_TIMEOUT_MS` | 20000    | Thời gian chờ `alert:new` broadcast tính bằng mili-giây |

### Ví dụ

**Probe test (2 client)**

```bash
$env:PERF_TEST_CLIENTS='2'
$env:PERF_TEST_TIMEOUT_MS='15000'
npm run perf:websocket
```

**100 client, timeout 30 giây**

```bash
$env:PERF_TEST_CLIENTS='100'
$env:PERF_TEST_TIMEOUT_MS='30000'
npm run perf:websocket
```

**Stress: 500 client đồng thời**

```bash
$env:PERF_TEST_CLIENTS='500'
$env:PERF_TEST_TIMEOUT_MS='45000'  # Timeout dài hơn khi client nhiều
npm run perf:websocket
```

### Định dạng đầu ra

```json
{
  "event": "perf:websocket:summary",
  "baseUrl": "http://localhost:3000",
  "clientCount": 100,
  "delivered": 100,
  "deliveryRate": 1.0
}
```

### Cách đọc kết quả

- **clientCount**: Số client WebSocket đã kết nối
- **delivered**: Bao nhiêu client nhận được broadcast `alert:new`
- **deliveryRate**: `delivered / clientCount` (1.0 = 100% delivery)

### Mục tiêu thường dùng

| Chỉ số       | Mục tiêu                          | Ghi chú                               |
| ------------ | --------------------------------- | ------------------------------------- |
| clientCount  | Phải khớp với `PERF_TEST_CLIENTS` | Cho biết kết nối thành công           |
| deliveryRate | 1.0 (100%)                        | Tất cả client đều phải nhận broadcast |

---

## Tự động hóa & tích hợp CI/CD

### Chạy trong Jenkins Pipeline

```groovy
stage('Performance Test') {
  steps {
    sh '''
      export PERF_TEST_TOTAL_REQUESTS=500
      export PERF_TEST_CONCURRENCY=50
      export PERF_TEST_MAX_AVG_MS=150
      export PERF_TEST_MAX_P95_MS=300
      npm run perf:load
    '''
  }
}
```

### Ví dụ GitHub Actions

```yaml
- name: Run Performance Tests
  run: |
    export PERF_TEST_TOTAL_REQUESTS=1000
    export PERF_TEST_CONCURRENCY=100
    npm run perf:load
```

---

## Xử lý sự cố

### "Connection refused" hoặc "ECONNREFUSED"

**Vấn đề**: Không thể kết nối tới API
**Cách xử lý**:

- Kiểm tra service đang chạy: `docker-compose ps`
- Kiểm tra API Gateway có khỏe không: `curl http://localhost:3000/api/health`
- Đảm bảo `API_KEY` trong `.env` đúng

### Error rate cao khi load test

**Nguyên nhân có thể**:

1. Hệ thống bị quá tải → tăng `PERF_TEST_CONCURRENCY` từ từ
2. API có bug → kiểm tra log: `docker-compose logs api-gateway`
3. Mất kết nối database → kiểm tra MongoDB/Redis: `docker-compose ps`

### WebSocket clients không kết nối được

**Vấn đề**: `clientCount` thấp hơn nhiều so với `PERF_TEST_CLIENTS`
**Cách xử lý**:

- Kiểm tra kết nối mạng
- Xác minh WebSocket của API Gateway đang chạy: `curl http://localhost:3000/socket.io`
- Tăng timeout: `PERF_TEST_TIMEOUT_MS=60000`

### Memory tăng đột biến trong soak test

**Nguyên nhân có thể**:

1. Memory leak trong ứng dụng → kiểm tra connection hoặc event listener chưa được đóng
2. Tool test tự tích lũy kết quả → bình thường nếu test ngắn

**Cách xử lý**:

- Theo dõi bằng `docker stats` và `docker logs`
- Kiểm tra log ứng dụng xem có warning/error không
- Nếu xác nhận leak, tạo bug report kèm timestamp và metrics

---

## Thực hành tốt nhất

1. **Bắt đầu nhỏ**: Dùng probe test (5 request, 2 client) để kiểm tra kết nối cơ bản
2. **Tăng tải dần**: Tăng load/client count từng bước thay vì nhảy thẳng lên mức tối đa
3. **Giám sát**: Theo dõi CPU, memory và logs trong lúc test
4. **Ghi baseline**: Chạy test trong môi trường sạch để làm mốc hiệu năng
5. **So sánh**: Sau khi đổi code, chạy lại cùng cấu hình để phát hiện regression
6. **Tự động hóa**: Tích hợp vào CI/CD với môi trường nhất quán
7. **Lưu kết quả**: Giữ lịch sử metrics hiệu năng theo thời gian

---

## Tài liệu liên quan

- [DEPLOYMENT.md](./DEPLOYMENT.md) — Hướng dẫn triển khai production
- [OPERATIONS.md](./OPERATIONS.md) — Quy trình vận hành
- [ARCHITECTURE.md](./ARCHITECTURE.md) — Thiết kế hệ thống
- [docs/internal/IMPLEMENTATION_CHECKLIST.md](./internal/IMPLEMENTATION_CHECKLIST.md) — Danh sách tính năng đầy đủ

---

**Cập nhật cuối**: 04/05/2026  
**Trạng thái**: ✅ Sẵn sàng sử dụng (local + staging/production)
