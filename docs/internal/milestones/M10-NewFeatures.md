# 🚀 Milestone 10: Tính năng vận hành lõi

**Trạng thái**: 🟡 Planning  
**Mục tiêu**: Các tính năng cần làm sớm để SignalOps trở thành hệ thống vận hành thực sự, không chỉ là dashboard quan sát.

---

## Ưu tiên P0 - Làm trước

- [x] Export CSV Alert History
  - [x] Export CSV Alert History
  - [x] Xuất lịch sử alert theo bộ lọc hiện tại
  - [x] Hỗ trợ khoảng thời gian và severity
  - [x] Trả file CSV để tải xuống

- [x] Marker Clustering trên bản đồ
  - [x] Gom cụm marker khi zoom out
  - [x] Tách cụm khi zoom in
  - [x] Giữ tương thích với tooltip/chi tiết thiết bị

- [x] Alert Sound Notification
  - [x] Phát âm báo khi có alert mới
  - [x] Cho phép bật/tắt trong UI
  - [x] Tùy biến âm báo theo mức độ nghiêm trọng

- [x] Server-side Pagination & Filter
  - [x] Chuyển phân trang sang server-side
  - [x] Lọc theo severity, status, deviceId, thời gian
  - [x] Giảm tải cho UI khi dữ liệu lớn

- [x] Maintenance Mode / Alert Suppression
  - [x] Cho phép bật chế độ bảo trì theo thiết bị
  - [x] Chặn alert spam trong thời gian bảo trì
  - [x] Hiển thị rõ trạng thái suppression trên dashboard

- [x] Notification Engine — Webhook (Slack/Telegram)
  - [x] Gửi alert ra Slack/Telegram bằng webhook
  - [x] Cho phép cấu hình theo severity
  - [x] Có retry và log lỗi gửi thông báo

- [x] Dynamic Threshold Management UI
  - [x] Cho phép chỉnh ngưỡng ngay trên UI
  - [x] Lưu cấu hình theo thiết bị hoặc nhóm thiết bị
  - [x] Có validate và rollback về mặc định

- [x] Multi-level Severity (WARNING / HIGH / CRITICAL)
  - [x] Chuẩn hóa severity nhiều cấp
  - [x] Áp dụng cho API, worker và dashboard
  - [x] Cập nhật màu sắc/label tương ứng

- [x] Auto-resolve Alert
  - [x] Tự đóng alert khi metric trở về bình thường
  - [x] Ghi nhận lý do auto-resolve
  - [x] Tránh đóng nhầm alert đang được xử lý thủ công

---

## Ghi chú triển khai

### Kế hoạch tiếp theo (chờ duyệt): M11 Growth & Scale

- [ ] Mở rộng đa tenant và quota theo tenant
- [ ] Tối ưu truy vấn aggregation cho dữ liệu lớn
- [ ] Bổ sung giám sát chi phí và auto-scaling

**Quy tắc**
1. Tất cả feature mới phải được thêm vào docs trước khi code.
2. Chỉ bắt đầu khi bạn xác nhận rõ: "OK, đi code đi".
3. Khi tách task nhỏ hơn, giữ nguyên tên feature gốc để dễ trace.

**Trạng thái**
- **Tasks Defined**: 9
- **Tasks In Progress**: 0
- **Tasks Completed**: 9
- **Last Updated**: 07/05/2026

---

## Tài liệu liên quan

- [M1-M9 Completed Work](M1-M9-Completed.md)
- [BACKLOG](../BACKLOG.md)
- [Milestone 11](M11-Growth-Scale.md)
- [Milestone 12](M12-Auth-SaaS.md)
- [Milestone 13](M13-Client-AI.md)
