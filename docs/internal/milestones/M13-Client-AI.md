# 🤖 Mốc 13: Ứng dụng di động và AI

**Trạng thái**: 🟡 Đang triển khai (Mobile foundation + AI shadow mode)
**Mục tiêu**: Triển khai lớp trải nghiệm phía client trên di động và lớp phát hiện bất thường AI/ML theo hướng an toàn, có thể rollout từng phần.

---

## Phạm vi M13

- Track A: Client di động cho vận hành hiện trường
- Track B: AI anomaly detection song song rule-based hiện tại
- Nguyên tắc: rollout theo từng bước nhỏ, có fallback, không phá luồng M10-M12 đang ổn định

---

## Ưu tiên P2 - Nhóm mở rộng (theo thứ tự làm)

- [x] Ứng dụng di động (PWA)
	- [x] Chọn hướng triển khai: PWA
	- [x] Thiết kế kiến trúc xác thực dùng lại JWT hiện có
	- [x] Đồng bộ alert và trạng thái thiết bị từ backend
	- [x] Bổ sung nhận thông báo đẩy hoặc nền (push/background) ở mức tối thiểu
	- [x] Tối ưu trải nghiệm di động cho operator
	- [x] Kiểm thử trên thiết bị thật (Android trước, iOS sau)
	- [x] Tài liệu hóa quy trình build và phát hành nội bộ

- [ ] Phát hiện bất thường bằng AI
	- [ ] Phát hiện bất thường bằng mô hình AI/ML
	- [ ] So sánh với ngưỡng rule-based hiện tại
	- [x] Hiển thị lý do và độ tin cậy của dự đoán
	- [x] Thiết kế cơ chế fallback về rule-based khi mô hình lỗi
	- [x] Đánh giá precision/recall trên tập dữ liệu lịch sử
	- [x] Thêm cờ bật/tắt AI theo tenant hoặc môi trường
	- [x] AI shadow mode: chấm điểm bất thường song song rule-based

---

## Kế hoạch thực thi đề xuất

### Giai đoạn 1: Mobile foundation
- [x] Chốt lựa chọn PWA
- [x] Tạo khung dự án client di động trong monorepo
- [x] Tích hợp login, danh sách alert, chi tiết thiết bị

### Giai đoạn 2: AI foundation
- [ ] Chuẩn hóa pipeline dữ liệu huấn luyện/tính điểm
- [x] Tạo service chấm điểm bất thường (shadow mode)
- [x] Lưu kết quả AI song song với alert rule-based

### Giai đoạn 3: Rollout và vận hành
- [x] Bật hiển thị confidence + reason trên dashboard/mobile
- [x] Chạy A/B với rule-based trong môi trường staging (chuẩn bị sẵn sàng)
- [ ] Đánh giá hiệu quả trước khi bật production

---

## Theo dõi trạng thái

- **Tổng số hạng mục**: 2 track chính, 3 giai đoạn
- **Đang thực hiện**: Giai đoạn 3 (A/B testing prep)
- **Đã hoàn thành**: Mobile track + AI shadow mode + evaluation infrastructure
- **Cập nhật lần cuối**: 11/05/2026

---

## Ghi chú

- Chỉ đưa các hạng mục vào đây khi M10-M12 đã được chốt phạm vi.
- Giữ riêng phần mobile và AI để dễ ước lượng, review và rollout.
- Nếu sau này có thêm tính năng phía client lớn, ưu tiên đặt tiếp ở mốc này trước khi mở M14.
- Tuân thủ quy tắc: duyệt checklist trước, sau đó mới triển khai code.
