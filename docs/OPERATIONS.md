# Quy trình vận hành SignalOps

## Tổng quan

Tài liệu này hướng dẫn đội ngũ vận hành (NOC - Network Operations Center) cách sử dụng hệ thống SignalOps hàng ngày.

---

## 1. Quy trình xử lý cảnh báo

### Vòng đời cảnh báo

```
  OPEN ──────→ ACKNOWLEDGED ──────→ RESOLVED
  (Mới tạo)    (Đã xác nhận)       (Đã xử lý xong)
```

| Trạng thái | Ý nghĩa | Ai thực hiện |
|-----------|---------|-------------|
| **OPEN** | Cảnh báo mới, chưa ai xử lý | Hệ thống tự tạo |
| **ACKNOWLEDGED** | Đã có người tiếp nhận, đang xử lý | Kỹ thuật viên NOC |
| **RESOLVED** | Đã khắc phục xong | Kỹ thuật viên NOC |

### Bước xử lý chi tiết

1. **Nhận cảnh báo**: Kiểm tra Dashboard → Trang "Cảnh báo" → Lọc trạng thái "Đang mở"
2. **Đánh giá mức độ**: 
   - 🔴 HIGH (Latency/Packet Loss) → Xử lý ngay, ảnh hưởng người dùng
   - 🟡 MEDIUM (Signal) → Xử lý trong ca trực
3. **Xác nhận tiếp nhận**: Bấm "Xác nhận cảnh báo" → Nhập tên bạn
4. **Khắc phục sự cố**: Thực hiện biện pháp kỹ thuật (xem bảng bên dưới)
5. **Đánh dấu xử lý xong**: Bấm "Đã xử lý" → Nhập tên + ghi chú mô tả đã làm gì

---

## 2. Các loại cảnh báo và cách khắc phục

### Latency > 200ms (Mức HIGH)

**Triệu chứng**: Phản hồi chậm, cuộc gọi giật, video lag

**Nguyên nhân thường gặp**:
- Quá tải trên thiết bị mạng
- Đường truyền backhaul bị nghẽn
- Lỗi phần cứng (CPU/RAM cao)

**Cách khắc phục**:
1. Kiểm tra tải CPU/RAM trên thiết bị bị ảnh hưởng
2. Kiểm tra băng thông backhaul
3. Kiểm tra có đang bị tấn công DDoS không
4. Khởi động lại thiết bị nếu cần
5. Chuyển traffic sang thiết bị backup nếu có

### Packet Loss > 5% (Mức HIGH)

**Triệu chứng**: Cuộc gọi bị đứt, dữ liệu không đầy đủ

**Nguyên nhân thường gặp**:
- Cáp quang bị lỗi (suy hao cao)
- Nhiễu tín hiệu RF
- Buffer overflow trên thiết bị
- Lỗi phần cứng card mạng

**Cách khắc phục**:
1. Kiểm tra cáp quang (đo suy hao bằng OTDR)
2. Kiểm tra nhiễu RF trên băng tần
3. Kiểm tra error counters trên interface
4. Thay thế cáp/card mạng nếu lỗi phần cứng

### Signal Strength < -90 dBm (Mức MEDIUM)

**Triệu chứng**: Vùng phủ sóng yếu, khó kết nối

**Nguyên nhân thường gặp**:
- Anten bị lệch hướng
- Có vật cản mới (tòa nhà, cây cối)
- Thiết bị phát sóng giảm công suất
- Cần thêm trạm phát sóng

**Cách khắc phục**:
1. Kiểm tra hướng anten tại trạm
2. Điều chỉnh tilt/azimuth của anten
3. Kiểm tra công suất phát
4. Đề xuất lắp thêm trạm nếu cần

---

## 3. Cách sử dụng Dashboard

### Trang Tổng quan
- Xem nhanh: tổng sự kiện, cảnh báo đang mở, thiết bị kết nối
- Biểu đồ xu hướng
- Sự kiện gần đây (highlight đỏ nếu vượt ngưỡng)

### Trang Bản đồ
- Xem vị trí thiết bị trên bản đồ
- Marker đỏ = đang cảnh báo, xanh = bình thường
- Bấm vào marker để xem chi tiết

### Trang Cảnh báo
- Lọc theo mức độ (Nghiêm trọng, Trung bình, Thấp)
- Lọc theo trạng thái (Đang mở, Đã xác nhận, Đã xử lý)
- Bấm vào cảnh báo để xem chi tiết và xử lý

### Trang Chỉ số
- Biểu đồ Latency, Packet Loss, Signal Strength
- Thống kê hiệu suất Worker

### Trang Cài đặt
- Kiểm tra trạng thái kết nối
- Xem ngưỡng cảnh báo đang áp dụng
- Gửi event thử nghiệm để kiểm tra hệ thống

---

## 4. Quy tắc chống trùng lặp

Hệ thống tự động chống tạo cảnh báo trùng:
- Nếu **cùng thiết bị** + **cùng loại cảnh báo** đã có 1 cảnh báo OPEN → **không tạo thêm**
- Chỉ khi cảnh báo cũ được RESOLVED, event vi phạm tiếp theo mới tạo cảnh báo mới

**Ví dụ**:
```
14:00 — device-01 latency=300ms → Tạo cảnh báo #1 (OPEN)
14:01 — device-01 latency=280ms → Bỏ qua (đã có cảnh báo OPEN)
14:05 — Operator resolve cảnh báo #1
14:06 — device-01 latency=250ms → Tạo cảnh báo #2 (OPEN)
```

---

## 5. Escalation (Báo cấp trên)

| Điều kiện | Hành động |
|----------|----------|
| Cảnh báo HIGH mở > 30 phút | Báo trưởng ca |
| Cùng thiết bị lặp lại > 3 lần/ngày | Báo kỹ thuật trưởng, cần xem xét phần cứng |
| > 5 thiết bị cùng khu vực bị cảnh báo | Kiểm tra hạ tầng khu vực (cáp quang, nguồn điện) |
| API Gateway không phản hồi | Kiểm tra Docker, restart service |

---

## 6. Lệnh hữu ích

```bash
# Xem logs toàn bộ hệ thống
npm run docker:logs

# Xem logs của 1 service cụ thể
docker compose --env-file .env -f infrastructure/docker-compose.yml logs -f api-gateway

# Restart 1 service
docker compose --env-file .env -f infrastructure/docker-compose.yml restart worker-service

# Kiểm tra sức khỏe API
curl http://localhost:3000/api/health

# Gửi event thử nghiệm
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"test","location":{"lat":10.77,"lng":106.70},"metrics":{"latency":250,"packetLoss":8,"signalStrength":-95}}'
```
