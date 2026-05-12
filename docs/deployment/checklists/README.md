# ✅ Checklists Triển khai

Danh sách kiểm tra cho từng giai đoạn triển khai.

## Các file trong mục này

| File | Khi nào dùng | Thời gian |
|------|-------------|----------|
| [STAGING-MONITORING-CHECKLIST.md](STAGING-MONITORING-CHECKLIST.md) | Kiểm tra hàng ngày khi chạy A/B test trên staging | 48-72 giờ |
| [PRODUCTION-READY-CHECKLIST.md](PRODUCTION-READY-CHECKLIST.md) | Chuẩn bị trước khi triển khai lên production | 2-3 giờ |

## Cách sử dụng

1. **Staging (A/B Test)**
   - Mở [STAGING-MONITORING-CHECKLIST.md](STAGING-MONITORING-CHECKLIST.md)
   - Chạy tasks hàng ngày: Sáng (08:00), Trưa (12:00), Tối (18:00)
   - Ghi nhận metrics vào bảng Daily Summary
   - 14/05 trưa: Điền Decision Form

2. **Production (Pre-deployment)**
   - Chờ staging PASS ✅
   - Mở [PRODUCTION-READY-CHECKLIST.md](PRODUCTION-READY-CHECKLIST.md)
   - Làm từng bước theo thứ tự (Bước 1-7)
   - Ghi nhận thời gian + người thực hiện
   - Nếu có issue → Rollback theo hướng dẫn

## Tips

- ✅ Làm hàng ngày để không quên bước nào
- ✅ Ghi nhận thời gian + người thực hiện (audit trail)
- ✅ Nếu fail → không bỏ qua, escalate ngay
- ✅ Lưu checklist file để reference sau này
