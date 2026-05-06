# 🔐 Milestone 12: Auth và SaaS Foundation

**Trạng thái**: ⚪ Draft  
**Mục tiêu**: Nền tảng xác thực, phân quyền và tách tenant để SignalOps có thể đi theo hướng SaaS.

---

## Ưu tiên P0 - Bắt buộc cho SaaS

- [ ] User Authentication & RBAC
	- [ ] Đăng nhập người dùng
	- [ ] RBAC theo vai trò
	- [ ] Bảo vệ API, dashboard và webhook cấu hình

- [ ] Multi-tenant Architecture
	- [ ] Tách dữ liệu theo tenant
	- [ ] Tenant-aware settings và giới hạn
	- [ ] Đảm bảo không rò dữ liệu giữa các tenant

---

## Ghi chú

- Chỉ làm các hạng mục này khi phạm vi auth và tenant đã rõ ràng.
- Đây là nền tảng cho scale theo hướng SaaS, nên không nên trộn với feature vận hành hoặc feature client.
