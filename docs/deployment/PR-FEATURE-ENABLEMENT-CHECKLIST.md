# 🚀 Danh sách kiểm tra PR: Bật chức năng an toàn & Di chuyển

**Tiêu đề PR**: `feat: fix Dockerfile.worker ENTRYPOINT + extend alert schema with AI metadata`  
**Commit**: `3a715a3`  
**Nhánh**: `feat/ml-ab-rollout`  
**Trạng thái**: Sẵn sàng cho triển khai từng giai đoạn  
**Cập nhật lần cuối**: 2026-05-12

---

## 📋 Tóm tắt các thay đổi

| Thành phần | Thay đổi | Tác động | Trạng thái |
|-----------|---------|---------|-----------|
| `infrastructure/Dockerfile.worker` | CMD → ENTRYPOINT, Debian base, libstdc++6/libgomp1 | Tương thích ONNX runtime ✅ | Hoạt động |
| `apps/worker-service/src/repositories/alert.repository.ts` | Thêm trường metadata AI | Cảnh báo có thể lưu điểm ML/nhãn | Hoạt động |
| `apps/worker-service/src/main.ts` | Logic rollout A/B (AI_ROLLOUT_PERCENT) | Chế độ shadow + triển khai từng giai đoạn | Hoạt động @ 10% |
| `apps/api-gateway/src/modules/event/event.controller.ts` | ApiKeyGuard trên POST /api/events | Yêu cầu API key khi nhập sự kiện | Hoạt động |
| `apps/dashboard/components/AlertTable.tsx` | Fallback config nghiêm trọng + tìm kiếm biểu tượng an toàn | Giao diện Dashboard ổn định | Hoạt động |
| `test_events.ps1` | DTO chuẩn hóa (deviceId, location, metrics) | Script kiểm tra tạo payload hợp lệ | Sẵn sàng |

---

## 🔄 Các giai đoạn bật chức năng

Mỗi giai đoạn dưới đây bao gồm điều kiện tiên quyết, cấu hình, triển khai và kiểm tra sức khỏe.

---

### **Giai đoạn 1: Bật lại Redis & WebSocket** *(Hiện tại: Tắt trong môi trường local)*

**Dịch vụ bị ảnh hưởng**: API Gateway, Worker Service  
**Trạng thái hiện tại**: 🔴 Tắt trong môi trường phát triển cục bộ  

#### 1.1 Điều kiện tiên quyết
- [ ] Redis cluster/instance đang chạy (hiện tại là `redis:7.0-alpine`)
- [ ] Dịch vụ Redis của Docker Compose được xác minh sức khỏe
- [ ] Triển khai API Gateway được cập nhật

#### 1.2 Thay đổi cấu hình
```bash
# .env.production — không cần thay đổi (mặc định giả định Redis được bật)
# Khi REDIS_HOST được đặt và không phải 'localhost', trình nghe WebSocket sẽ kích hoạt:
REDIS_HOST=redis                    # hoặc điểm cuối Redis bên ngoài
REDIS_PORT=6379
REDIS_DB=1                         # Không gian tên cho pubsub + hàng đợi công việc
```

#### 1.3 Các bước triển khai
```bash
# Bước 1: Xác minh Redis đang chạy
docker compose exec redis redis-cli ping
# Kỳ vọng: PONG

# Bước 2: Xây dựng lại API Gateway & Worker với mã mới nhất
docker compose build --no-cache api-gateway worker-service

# Bước 3: Triển khai với Redis được kết nối
docker compose up -d --force-recreate api-gateway worker-service

# Bước 4: Xác minh tích hợp Redis hoạt động
docker logs signalops-api-gateway --tail 30 | grep -i "redis\|pubsub"
docker logs signalops-worker --tail 30 | grep -i "redis\|queue"
```

#### 1.4 Kiểm tra sức khỏe
```bash
# Kiểm tra 1: Trình nghe WebSocket Pub/Sub của API Gateway đã bắt đầu
docker logs signalops-api-gateway | grep -E "WebSocket Pub/Sub listener" | head -1
# Kỳ vọng: KHÔNG nên chứa "disabled for local development"

# Kiểm tra 2: Worker có thể tiêu thụ từ hàng đợi Redis
docker logs signalops-worker | grep -E "event-processing queue|BullMQ" | head -1
# Kỳ vọng: Nên ghi đơn đăng ký hàng đợi

# Kiểm tra 3: Gửi sự kiện kiểm tra và xác minh nó được xếp hàng
curl -X POST http://localhost:3000/api/events \
  -H "x-api-key: signalops-local-key" \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test-redis","location":"lab","metrics":{"cpu":75}}'
# Kỳ vọng: 202 Chấp nhận với jobId

# Kiểm tra 4: Giám sát độ sâu hàng đợi Redis
docker compose exec redis redis-cli -n 1 LLEN "bull:event-processing:queue"
# Kỳ vọng: Nên giảm khi worker xử lý các công việc
```

#### 1.5 Kế hoạch quay lại
```bash
# Nếu phát hiện vấn đề WebSocket/Redis:
docker compose down redis api-gateway worker-service
# Hoàn nguyên REDIS_HOST của .env.production → localhost (tắt)
docker compose up -d api-gateway worker-service
```

---

### **Giai đoạn 2: Tiến trình triển khai AI** *(Hiện tại: 10%)*

**Dịch vụ bị ảnh hưởng**: Worker Service  
**Trạng thái hiện tại**: 🟡 Chế độ shadow @ 10% (Giai đoạn nhận dùng sớm)  

#### 2.1 Lịch triển khai

| Giai đoạn | Ngày | AI_ROLLOUT_PERCENT | Mô tả | Thời gian |
|--------|------|-------------------|-------|----------|
| Shadow | 14-21/05 | 0% | Điểm ML được ghi lại, không có cảnh báo | 1 tuần |
| **Sớm** | **21-28/05** | **5-10%** | Cảnh báo ML cho 5-10% sự kiện | 1 tuần |
| Tỷ lệ | 28-04/06 | 25% | 25% sự kiện sử dụng ML | 1 tuần |
| Dần dần | 04-11/06 | 50→75→90% | Tăng lên từng bước | 1 tuần |
| Toàn bộ | 11/06+ | 100% | Tất cả sự kiện sử dụng ML | Vĩnh viễn |

#### 2.2 Thay đổi cấu hình
```bash
# .env.production — Cập nhật AI_ROLLOUT_PERCENT
AI_AB_TEST=true                    # Hạ tầng kiểm tra A/B được bật
AI_ROLLOUT_PERCENT=10              # ← Hiện tại: Giai đoạn nhận dùng sớm
ANOMALY_THRESHOLD=80               # Ngưỡng quyết định ML (0-100)
```

**Tiến trình**: Để chuyển sang giai đoạn tiếp theo, cập nhật `AI_ROLLOUT_PERCENT` → `{5, 10, 25, 50, 75, 90, 100}` và triển khai lại worker.

#### 2.3 Các bước triển khai
```bash
# Ví dụ: Tăng từ 10% → 25%
# Bước 1: Cập nhật .env.production
sed -i 's/AI_ROLLOUT_PERCENT=10/AI_ROLLOUT_PERCENT=25/' .env.production

# Bước 2: Xây dựng lại & khởi động lại worker
docker compose build --no-cache worker-service
docker compose up -d --force-recreate worker-service

# Bước 3: Xác minh biến env trong container
docker exec signalops-worker env | grep AI_ROLLOUT_PERCENT
# Kỳ vọng: AI_ROLLOUT_PERCENT=25
```

#### 2.4 Kiểm tra sức khỏe
```bash
# Kiểm tra 1: Mô hình ML được tải khi khởi động
docker logs signalops-worker | grep "ML model loaded" | tail -1
# Kỳ vọng: "✓ ML model loaded from src/assets/anomaly-model.onnx"

# Kiểm tra 2: Xác minh phần trăm triển khai được áp dụng
docker logs signalops-worker | grep "AI_ROLLOUT_PERCENT" | tail -1
# Kỳ vọng: Nên ghi lại giá trị được đặt

# Kiểm tra 3: Gửi 100 sự kiện kiểm tra và xác minh số lượng cảnh báo
# Đối với triển khai 25%: mong đợi ~25 cảnh báo với aiModelVersion được đặt
# Chạy script kiểm tra và kiểm tra:
curl http://localhost:3000/api/alerts | jq '.data | length'
# Kỳ vọng: ~25 cảnh báo (25% của 100 sự kiện được gửi)

# Kiểm tra 4: Xác minh metadata cảnh báo hiện tại
curl http://localhost:3000/api/alerts | jq '.data[0] | {aiModelVersion, anomalyScore, anomalyLabel}'
# Kỳ vọng: { "aiModelVersion": "ml-shadow-v2", "anomalyScore": 62, "anomalyLabel": "suspicious" }

# Kiểm tra 5: Giám sát phân bố cảnh báo (ML vs dựa trên quy tắc)
docker logs signalops-worker | grep -E "Branch: ML|Branch: deterministic" | tail -20
# Kỳ vọng: ~25% lần chạy nhánh ML, ~75% lần chạy xác định
```

#### 2.5 Kế hoạch dừng / Hủy bỏ
```bash
# Nếu độ chính xác hoặc độ nhạy cảm giảm dưới ngưỡng:
# 1. Đặt triển khai thành 0%
sed -i 's/AI_ROLLOUT_PERCENT=.*/AI_ROLLOUT_PERCENT=0/' .env.production
docker compose up -d --force-recreate worker-service

# 2. Điều chỉnh ANOMALY_THRESHOLD nếu cần
# Độ chính xác thấp → Tăng ANOMALY_THRESHOLD (80→85)
# Độ nhạy cảm thấp → Giảm ANOMALY_THRESHOLD (80→75)
sed -i 's/ANOMALY_THRESHOLD=80/ANOMALY_THRESHOLD=85/' .env.production
docker compose up -d --force-recreate worker-service

# 3. Chờ 48 giờ, thu thập số liệu, đánh giá lại
```

---

### **Giai đoạn 3: OpenTelemetry / Tracing** *(Hiện tại: Tắt theo mặc định)*

**Dịch vụ bị ảnh hưởng**: API Gateway, Worker Service, Dashboard  
**Trạng thái hiện tại**: 🔴 Tắt (chọn tham gia, yêu cầu các gói bổ sung)  

#### 3.1 Điều kiện tiên quyết
- [ ] Các gói OpenTelemetry được cài đặt (`npm install --save @opentelemetry/api @opentelemetry/sdk-node`)
- [ ] Điểm cuối Jaeger hoặc Zipkin được cấu hình
- [ ] Dịch vụ bộ sưu tập Span đang chạy

#### 3.2 Thay đổi cấu hình
```bash
# .env.production — Thêm cấu hình tracing
TRACING_ENABLED=true                # Bật công cụ OpenTelemetry
JAEGER_AGENT_HOST=localhost          # Bộ sưu tập Jaeger
JAEGER_AGENT_PORT=6831               # Cổng UDP
SERVICE_NAME=signalops               # Định danh dịch vụ

# Hoặc sử dụng các biến môi trường:
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
export OTEL_SERVICE_NAME="signalops"
```

#### 3.3 Các bước triển khai
```bash
# Bước 1: Cài đặt các gói (nếu chưa thực hiện)
npm install --save \
  @opentelemetry/api \
  @opentelemetry/sdk-node \
  @opentelemetry/exporter-trace-otlp-http

# Bước 2: Bật tracing trong libs/common/src/tracing.config.ts
# Bỏ ghi chú thiết lập công cụ

# Bước 3: Xây dựng lại các ứng dụng
npm run build

# Bước 4: Triển khai lại với tracing được bật
docker compose up -d --force-recreate api-gateway worker-service
```

#### 3.4 Kiểm tra sức khỏe
```bash
# Kiểm tra 1: Xác minh middleware tracing được tải
docker logs signalops-api-gateway | grep -i "opentelemetry\|tracing" | head -3
# Kỳ vọng: Nên ghi lại khởi tạo tracing (không phải "disabled in this build")

# Kiểm tra 2: Xác minh spans được xuất
# Truy vấn Jaeger UI: http://localhost:16686
# Kỳ vọng: Dịch vụ "signalops" nên xuất hiện trong danh sách thả xuống dịch vụ

# Kiểm tra 3: Gửi yêu cầu kiểm tra và kiểm tra spans
curl http://localhost:3000/api/health
# Kỳ vọng: Trace ID nên xuất hiện trong tiêu đề phản hồi API (X-Trace-ID)
```

#### 3.5 Kế hoạch tắt
```bash
# Nếu tracing gây ra vấn đề về hiệu suất:
# Bỏ ghi chú tracing trong libs/common/src/tracing.config.ts
# Hoặc đặt env:
export TRACING_ENABLED=false
docker compose up -d --force-recreate api-gateway worker-service
```

---

### **Giai đoạn 4: Kiểm soát AI theo Tenant** *(Tương lai: Không có trong PR này)*

**Dịch vụ bị ảnh hưởng**: API Gateway, Tenant Module  
**Trạng thái hiện tại**: 🟢 Sẵn sàng (trường schema tồn tại, backend sẵn sàng)  

#### 4.1 Chuẩn bị
- [ ] Schema Tenant đã được mở rộng với trường `aiEnabled` boolean
- [ ] Điểm cuối giao diện người dùng quản trị được chuẩn bị để chuyển đổi

#### 4.2 Triển khai tương lai (sau M13)
```bash
# Đặt aiEnabled cho mỗi tenant trong MongoDB:
db.tenants.updateOne(
  { name: "tenant-a" },
  { $set: { aiEnabled: false } }
);

# Worker sẽ kiểm tra:
if (!tenant.aiEnabled && AI_ROLLOUT_PERCENT > 0) {
  // Chỉ sử dụng cảnh báo dựa trên quy tắc cho tenant này
}
```

---

## ✅ Danh sách kiểm tra trước khi hợp nhất

Trước khi hợp nhất `feat/ml-ab-rollout` vào `main`:

- [ ] Tất cả 3 commit được đẩy lên `origin`
- [ ] Xem xét mã được hoàn thành (ít nhất 1 phê duyệt)
- [ ] Kiểm tra đơn vị vượt qua: `npm run test`
- [ ] Kiểm tra tích hợp vượt qua: `npm run test:integration` (nếu được thêm)
- [ ] Xây dựng thành công: `npm run build` + `docker compose build`
- [ ] Hình ảnh Docker xây dựng không có cảnh báo/lỗi
- [ ] Không có những thay đổi phá vỡ hợp đồng API
- [ ] Thay đổi schema tương thích ngược (tất cả trường mới là tùy chọn hoặc có mặc định)
- [ ] Tất cả bí mật/khóa API KHÔNG được commit (sử dụng `.env.local`, `.env.production`)

---

## 📊 Giám sát trong quá trình triển khai

### Số liệu chính để theo dõi

| Chỉ số | Truy vấn | Mục tiêu | Cảnh báo nếu |
|--------|---------|---------|-------------|
| **Khối lượng cảnh báo** | `count(alerts) by (aiModelVersion)` | ML: 10% tổng số | Giảm dưới 5% hoặc trên 15% |
| **Độ chính xác** | TP/(TP+FP) trên tập kiểm tra | > 80% | Giảm dưới 70% |
| **Độ nhạy cảm** | TP/(TP+FN) trên tập kiểm tra | > 75% | Giảm dưới 65% |
| **Độ trễ (p95)** | Thời gian phản hồi cho `/api/events` | < 200ms | Vượt quá 500ms |
| **Độ sâu hàng đợi Worker** | Độ dài `bull:event-processing:queue` | < 100 công việc | Vượt quá 1000 |
| **Thời gian suy luận ONNX** | Nhật ký Worker `ml_inference_ms` | 10-50ms | Vượt quá 100ms |

### Bảng điều khiển Grafana
```
Nhập: docs/ml/STAGING-AB-REPORT.md → Bảng điều khiển "A/B Test Rollout"
Bảng điều khiển:
  - Phân bố cảnh báo (ML % vs Dựa trên quy tắc %)
  - Biểu đồ độ trễ suy luận
  - Độ sâu hàng đợi theo thời gian
  - Tỷ lệ lỗi theo loại
```

---

## 🔐 Quy trình quay lại

### Nếu chức năng AI gây ra vấn đề

**Triệu chứng**: Tỷ lệ dương tính giả cao, độ chính xác < 70%  
**Hành động**:
```bash
# Quay lại AI_ROLLOUT_PERCENT thành 0
echo "AI_ROLLOUT_PERCENT=0" >> .env.production
docker compose up -d --force-recreate worker-service
# Giám sát: Cảnh báo nên quay lại chỉ dựa trên quy tắc
```

### Nếu ONNX Runtime gặp sự cố

**Triệu chứng**: Worker sập, nhật ký hiển thị lỗi "ld-linux" hoặc "ONNX"  
**Hành động**:
```bash
# Quay lại cơ sở Alpine hoặc xác minh các phụ thuộc Debian
docker compose pull
docker compose build --no-cache worker-service
docker compose up -d --force-recreate worker-service
# Quay lại ghi điểm xác định (không suy luận ML)
```

### Nếu WebSocket/Redis gặp sự cố

**Triệu chứng**: Dashboard ngắt kết nối, sự kiện xếp hàng  
**Hành động**:
```bash
# Khởi động lại Redis
docker compose restart redis

# Hoặc chuyển sang chế độ thăm dò (dashboard tự động quay lại)
# Kiểm tra: dashboard nên hiển thị "Polling alerts (Redis unavailable)"
```

---

## 📝 Phê duyệt triển khai ký tên

| Vai trò | Tên | Ngày | Trạng thái |
|--------|-----|------|----------|
| **Tác giả** | AI Agent | 2026-05-12 | ✅ Sẵn sàng |
| **Người xem xét mã** | *Chờ xử lý* | - | ⏳ |
| **Người dẫn dắt QA** | *Chờ xử lý* | - | ⏳ |
| **Ops / DevOps** | *Chờ xử lý* | - | ⏳ |
| **Người dẫn dắt sản phẩm** | *Chờ xử lý* | - | ⏳ |

**Cổng phê duyệt**: Tất cả 5 vai trò phải ký tên trước khi hợp nhất vào `main`.

---

## 🔗 Tài liệu liên quan

- [PRODUCTION-SHADOW-MODE-DEPLOYMENT.md](PRODUCTION-SHADOW-MODE-DEPLOYMENT.md) — Thiết lập chế độ shadow ban đầu
- [PRODUCTION-ROLLOUT-PLAN.md](PRODUCTION-ROLLOUT-PLAN.md) — Lịch triển khai đầy đủ
- [STAGING-AB-REPORT.md](STAGING-AB-REPORT.md) — Kết quả A/B staging
- [AI-EVALUATION.md](../ml/AI-EVALUATION.md) — Đánh giá hiệu suất mô hình ML
- [M13-Client-AI.md](../internal/milestones/M13-Client-AI.md) — Trình theo dõi mốc M13

---

## ❓ Câu hỏi thường gặp

**C: Tôi có thể bỏ qua bật Redis và đi thẳng đến triển khai AI không?**  
Đ: Vâng. Redis là tùy chọn; các trình nghe WebSocket giảm một cách thanh lịch. Nhưng để sản xuất, Redis được khuyên dùng cho độ tin cậy.

**C: Điều gì sẽ xảy ra nếu tôi muốn quay lại 0% AI nhưng giữ WebSocket hoạt động?**  
Đ: Đặt `AI_ROLLOUT_PERCENT=0` và triển khai lại. WebSocket vẫn hoạt động độc lập.

**C: Tôi nên chờ bao lâu ở mỗi giai đoạn triển khai?**  
Đ: Tối thiểu 3-5 ngày để thu thập số liệu có ý nghĩa (dương tính giả, âm tính giả, độ trễ). 1 tuần được khuyên dùng.

**C: Ai phê duyệt chuyển sang phần trăm triển khai tiếp theo?**  
Đ: Người dẫn dắt sản phẩm + Người dẫn dắt QA + Đội Ops phải cùng nhau xem xét số liệu và phê duyệt.

**C: Tôi có thể triển khai PR này ngoài thứ tự danh sách kiểm tra không?**  
Đ: Không được khuyến khích. Theo dõi các giai đoạn 1→2→3→4 để đảm bảo an toàn và khả năng quan sát.

---

**Xem xét lần cuối**: 2026-05-12 17:00 UTC  
**Xem xét tiếp theo**: Sau khi kiểm tra sức khỏe Giai đoạn 1 vượt qua
