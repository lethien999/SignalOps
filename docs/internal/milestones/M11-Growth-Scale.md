# 📈 Milestone 11: Growth, Ops và Scale

**Trạng thái**: � Progress (50% — P0 tasks done, P1 pending)  
**Mục tiêu**: Tăng khả năng vận hành ở quy mô lớn, tối ưu chi phí và độ tin cậy hệ thống.

---

## Ưu tiên P0 - Làm trước (theo thứ tự easy -> hard)

- [x] SLA Dashboard — MTTR, Uptime, Alert Rate
	- [x] Hiển thị MTTR theo khoảng thời gian
	- [x] Theo dõi uptime và alert rate theo service
	- [x] Có bộ lọc theo service và severity

- [x] Archive Pipeline (S3-compatible)
	- [x] Đẩy dữ liệu cũ (events/alerts) sang object storage
	- [x] Thiết lập retention policy rõ ràng
	- [x] Có lệnh hoặc API truy hồi dữ liệu khi cần điều tra

- [x] Aggregation Performance Tuning
	- [x] Rà soát truy vấn nặng và thêm index phù hợp
	- [x] Tối ưu pipeline thống kê cho dashboard/metrics
	- [x] Có benchmark trước/sau tối ưu

## Ưu tiên P1 - Làm sau

- [x] Tenant Quota & Rate Guard
	- [x] Giới hạn tốc độ ingest theo tenant hoặc nguồn
	- [x] Cảnh báo khi chạm ngưỡng quota
	- [x] Có cấu hình override theo môi trường

- [x] Cost & Auto-scaling Observability
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
- **Tasks Defined**: 5
- **Tasks In Progress**: 0
- **Tasks Completed**: 5 (SLA Dashboard, Archive Pipeline, Aggregation Performance Tuning, Tenant Quota & Rate Guard, Cost & Auto-scaling Observability)
- **Last Updated**: 09/05/2026

---

## Tài liệu liên quan

- [M10 New Features](M10-NewFeatures.md)
- [Milestone 12](M12-Auth-SaaS.md)
- [Milestone 13](M13-Client-AI.md)
