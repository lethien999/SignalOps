# 🚀 Mốc 10: Tính năng vận hành lõi

**Trạng thái**: 🟢 Hoàn thành (P0 hoàn tất, phần mở rộng đã chuyển và hoàn tất ở M11)  
**Mục tiêu**: Các tính năng cần làm sớm để SignalOps trở thành hệ thống vận hành thực sự, không chỉ là dashboard quan sát.

---

## Ưu tiên P0 - Làm trước

- [x] Xuất CSV lịch sử cảnh báo
  - [x] Xuất CSV lịch sử cảnh báo
  - [x] Xuất lịch sử alert theo bộ lọc hiện tại
  - [x] Hỗ trợ khoảng thời gian và severity
  - [x] Trả file CSV để tải xuống

- [x] Marker Clustering trên bản đồ
  - [x] Gom cụm marker khi zoom out
  - [x] Tách cụm khi zoom in
  - [x] Giữ tương thích với tooltip/chi tiết thiết bị

- [x] Thông báo âm thanh cảnh báo
  - [x] Phát âm báo khi có alert mới
  - [x] Cho phép bật/tắt trong UI
  - [x] Tùy biến âm báo theo mức độ nghiêm trọng

- [x] Phân trang và lọc phía máy chủ
  - [x] Chuyển phân trang sang server-side
  - [x] Lọc theo severity, status, deviceId, thời gian
  - [x] Giảm tải cho UI khi dữ liệu lớn

- [x] Chế độ bảo trì / Chặn cảnh báo
  - [x] Cho phép bật chế độ bảo trì theo thiết bị
  - [x] Chặn alert spam trong thời gian bảo trì
  - [x] Hiển thị rõ trạng thái suppression trên dashboard

- [x] Bộ máy thông báo — Webhook (Slack/Telegram)
  - [x] Gửi alert ra Slack/Telegram bằng webhook
  - [x] Cho phép cấu hình theo severity
  - [x] Có retry và log lỗi gửi thông báo

- [x] Giao diện quản lý ngưỡng động
  - [x] Cho phép chỉnh ngưỡng ngay trên UI
  - [x] Lưu cấu hình theo thiết bị hoặc nhóm thiết bị
  - [x] Có validate và rollback về mặc định

- [x] Mức độ nghiêm trọng nhiều cấp (WARNING / HIGH / CRITICAL)
  - [x] Chuẩn hóa severity nhiều cấp
  - [x] Áp dụng cho API, worker và dashboard
  - [x] Cập nhật màu sắc/label tương ứng

- [x] Tự động đóng cảnh báo
  - [x] Tự đóng alert khi metric trở về bình thường
  - [x] Ghi nhận lý do auto-resolve
  - [x] Tránh đóng nhầm alert đang được xử lý thủ công

---

## Ghi chú triển khai

### Kế hoạch tiếp theo (chờ duyệt): M11 Tăng trưởng & Mở rộng

- [x] Mở rộng đa tenant và quota theo tenant (đã hoàn thành ở M11)
- [x] Tối ưu truy vấn aggregation cho dữ liệu lớn (đã hoàn thành ở M11)
- [x] Bổ sung giám sát chi phí và auto-scaling (đã hoàn thành ở M11)

**Quy tắc**
1. Tất cả feature mới phải được thêm vào docs trước khi code.
2. Chỉ bắt đầu khi bạn xác nhận rõ: "OK, đi code đi".
3. Khi tách task nhỏ hơn, giữ nguyên tên feature gốc để dễ trace.

**Trạng thái**
- **Tổng số hạng mục**: 9
- **Đang thực hiện**: 0
- **Đã hoàn thành**: 9 (P0) + 3 hạng mục mở rộng đã hoàn thành ở M11
- **Cập nhật lần cuối**: 10/05/2026

---

## Tài liệu liên quan

- [M1-M9 Đã hoàn thành](M1-M9-Completed.md)
- [BACKLOG](../BACKLOG.md)
- [Mốc 11](M11-Growth-Scale.md)
- [Mốc 12](M12-Auth-SaaS.md)
- [Mốc 13](M13-Client-AI.md)
