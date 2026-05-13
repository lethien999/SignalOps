# 📈 Mốc 11: Tăng trưởng, Vận hành và Scale

**Trạng thái**: 🟡 Đang tiến hành (50% — P0 đã xong, P1 còn lại)  
**Mục tiêu**: Tăng khả năng vận hành ở quy mô lớn, tối ưu chi phí và độ tin cậy hệ thống.

---

## Ưu tiên P0 - Làm trước (theo thứ tự dễ -> khó)

- [x] Dashboard SLA — MTTR, Uptime, Tần suất cảnh báo
  - [x] Hiển thị MTTR theo khoảng thời gian
  - [x] Theo dõi uptime và alert rate theo service
  - [x] Có bộ lọc theo service và severity

- [x] Pipeline lưu trữ (tương thích S3)
  - [x] Đẩy dữ liệu cũ (events/alerts) sang object storage
  - [x] Thiết lập retention policy rõ ràng
  - [x] Có lệnh hoặc API truy hồi dữ liệu khi cần điều tra

- [x] Tối ưu hiệu năng Aggregation
  - [x] Rà soát truy vấn nặng và thêm index phù hợp
  - [x] Tối ưu pipeline thống kê cho dashboard/metrics
  - [x] Có benchmark trước/sau tối ưu

## Ưu tiên P1 - Làm sau

- [x] Quota tenant và giới hạn tốc độ
  - [x] Giới hạn tốc độ ingest theo tenant hoặc nguồn
  - [x] Cảnh báo khi chạm ngưỡng quota
  - [x] Có cấu hình override theo môi trường

- [x] Quan sát chi phí và tự động mở rộng
  - [x] Dashboard theo dõi chi phí hạ tầng chính
  - [x] Đề xuất ngưỡng scale up/down theo tải thực tế
  - [x] Cảnh báo khi có dấu hiệu tăng chi phí bất thường

---

## Ghi chú triển khai

**Quy tắc**

1. Mọi thay đổi phải được chốt checklist tại file này trước khi code.
2. Chỉ bắt đầu code khi bạn xác nhận rõ: "OK, đi code đi" cho từng hạng mục.
3. Hoàn tất từng hạng mục theo thứ tự, push xong mới chuyển hạng mục kế tiếp.

**Trạng thái**

- **Tổng số hạng mục**: 5
- **Đang thực hiện**: 0
- **Đã hoàn thành**: 5 (Dashboard SLA, Pipeline lưu trữ, tối ưu Aggregation, quota tenant và giới hạn tốc độ, quan sát chi phí và auto-scaling)
- **Cập nhật lần cuối**: 09/05/2026

---

## Tài liệu liên quan

- [M10 Tính năng mới](M10-NewFeatures.md)
- [Mốc 12](M12-Auth-SaaS.md)
- [Mốc 13](M13-Client-AI.md)
