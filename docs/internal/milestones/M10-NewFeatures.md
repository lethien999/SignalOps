# 🚀 Milestone 10: Tính năng vận hành lõi

**Trạng thái**: 🟡 Planning  
**Mục tiêu**: Các tính năng cần làm sớm để SignalOps trở thành hệ thống vận hành thực sự, không chỉ là dashboard quan sát.

---

## Ưu tiên P0 - Làm trước

- [x] Export CSV Alert History
  - [x] Export CSV Alert History
  - [ ] Xuất lịch sử alert theo bộ lọc hiện tại
  - [ ] Hỗ trợ khoảng thời gian và severity
  - [ ] Trả file CSV để tải xuống

- [ ] Marker Clustering trên bản đồ
  - [ ] Gom cụm marker khi zoom out
  - [ ] Tách cụm khi zoom in
  - [ ] Giữ tương thích với tooltip/chi tiết thiết bị

- [ ] Alert Sound Notification
  - [ ] Phát âm báo khi có alert mới
  - [ ] Cho phép bật/tắt trong UI
  - [ ] Tùy biến âm báo theo mức độ nghiêm trọng

- [x] Server-side Pagination & Filter
  - [x] Chuyển phân trang sang server-side
  - [x] Lọc theo severity, status, deviceId, thời gian
  - [x] Giảm tải cho UI khi dữ liệu lớn

- [ ] Maintenance Mode / Alert Suppression
  - [ ] Cho phép bật chế độ bảo trì theo thiết bị/vùng
  - [ ] Chặn alert spam trong thời gian bảo trì
  - [ ] Hiển thị rõ trạng thái suppression trên dashboard

- [ ] Notification Engine — Webhook (Slack/Telegram)
  - [ ] Gửi alert ra Slack/Telegram bằng webhook
  - [ ] Cho phép cấu hình theo severity
  - [ ] Có retry và log lỗi gửi thông báo

- [ ] Dynamic Threshold Management UI
  - [ ] Cho phép chỉnh ngưỡng ngay trên UI
  - [ ] Lưu cấu hình theo thiết bị hoặc nhóm thiết bị
  - [ ] Có validate và rollback về mặc định

- [ ] Multi-level Severity (WARNING / HIGH / CRITICAL)
  - [ ] Chuẩn hóa severity nhiều cấp
  - [ ] Áp dụng cho API, worker và dashboard
  - [ ] Cập nhật màu sắc/label tương ứng

- [ ] Auto-resolve Alert
  - [ ] Tự đóng alert khi metric trở về bình thường
  - [ ] Ghi nhận lý do auto-resolve
  - [ ] Tránh đóng nhầm alert đang được xử lý thủ công

---

## Ghi chú triển khai

**Quy tắc**
1. Tất cả feature mới phải được thêm vào docs trước khi code.
2. Chỉ bắt đầu khi bạn xác nhận rõ: "OK, đi code đi".
3. Khi tách task nhỏ hơn, giữ nguyên tên feature gốc để dễ trace.

**Trạng thái**
- **Tasks Defined**: 9
- **Tasks In Progress**: 0
- **Tasks Completed**: 3
- **Last Updated**: 06/05/2026

---

## Tài liệu liên quan

- [M1-M9 Completed Work](M1-M9-Completed.md)
- [BACKLOG](../BACKLOG.md)
- [Milestone 11](M11-Growth-Scale.md)
- [Milestone 12](M12-Auth-SaaS.md)
- [Milestone 13](M13-Client-AI.md)
