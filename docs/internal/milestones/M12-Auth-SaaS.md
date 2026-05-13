# 🔐 Mốc 12: Xác thực và nền tảng SaaS

**Trạng thái**: 🟢 Hoàn thành (P0 + P1)  
**Mục tiêu**: Nền tảng xác thực (JWT), RBAC (3 vai trò), multi-tenant architecture để SignalOps có thể đi theo hướng SaaS.  
**Thời gian ước tính**: 2-3 tuần (P0 tasks)

---

## Thiết kế tổng quan

### Quyết định kiến trúc

- **Auth**: JWT stateless (email+password); OAuth → P2
- **RBAC**: một role duy nhất cho mỗi user (admin/editor/viewer)
- **Multi-tenant**: `User.tenantId` (mapping 1:1); tenant admin quản lý user
- **Scopes**: Public API (API key), Protected API (JWT + role guard)
- **DB**: collection User + Role; mở rộng `Tenant.adminUserIds`

---

## Ưu tiên P0 - Hạng mục

### Hạng mục 1: User & Role Schema + Auth Service

**Hạng mục cần làm:**

- [x] `User` schema (Mongoose): email, passwordHash, tenantId, roleId, createdAt, updatedAt
- [x] `Role` collection (seeded): admin, editor, viewer with permissions array
- [x] `auth.service.ts`: signup, login, validateJwt, checkPermission methods
- [x] Hash passwords with bcrypt; generate JWT on login
- [x] Unit test: auth.service.spec.ts (đăng ký, đăng nhập, xác thực JWT)
- [x] Extend `Tenant` schema: add `adminUserIds: ObjectId[]`
- [x] Migration script: `db-migrate-users.mjs` (create indexes, seed roles)

**Tệp liên quan:**

- `src/modules/user/schemas/user.schema.ts`
- `src/modules/user/schemas/role.schema.ts`
- `src/modules/user/services/auth.service.ts`
- `src/modules/user/user.module.ts`
- `src/modules/user/user.service.ts`
- `src/modules/user/user.service.spec.ts`
- `scripts/db-migrate-users.mjs`

---

### Hạng mục 2: JWT & Role Guards

**Hạng mục cần làm:**

- [x] `jwt.guard.ts`: extract & validate JWT from Authorization header
- [x] `role.guard.ts`: check user role against required permissions
- [x] `@Authorize(role: string)` decorator for routes
- [x] Export guards from `src/common/guards/index.ts`
- [x] Unit test cho guards (mock ngữ cảnh người dùng)

**Tệp liên quan:**

- `src/common/guards/jwt.guard.ts`
- `src/common/guards/role.guard.ts`
- `src/common/decorators/authorize.decorator.ts`
- `src/common/guards/index.ts`

---

### Hạng mục 3: Endpoint xác thực và tích hợp Dashboard

**Hạng mục cần làm:**

- [x] `UserController`:
  - `POST /auth/signup` → create user + tenant (auto-assign admin role)
  - `POST /auth/login` → return JWT token + user info
  - `GET /auth/me` → return current user (from JWT)
- [x] Trang đăng nhập Dashboard: form `/login` (email+mật khẩu)
- [x] Điều hướng Dashboard: nếu không có token → chuyển tới `/login`
- [x] Store JWT in `localStorage`, send in `Authorization: Bearer <token>`
- [x] Unit test: user.controller.spec.ts

**Tệp liên quan:**

- `src/modules/user/controllers/user.controller.ts`
- `src/modules/user/dtos/signup.dto.ts`, `login.dto.ts`
- `apps/dashboard/app/login/page.tsx` (mới)
- `apps/dashboard/lib/auth.ts` (mới) - quản lý JWT
- `apps/dashboard/middleware.ts` (mới) - chuyển hướng đến đăng nhập

---

### Hạng mục 4: API Route Protection & Tenant Isolation

**Hạng mục cần làm:**

- [x] Protect admin endpoints: `/api/admin/*` → require JWT + admin role
- [x] Protect config endpoints: `/api/webhooks/*` → require JWT + editor role
- [x] Keep public ingestion: `POST /events`, `POST /alerts` → API key only
- [x] Add `tenantId` to request context (via JWT or API key)
- [x] Enforce tenant isolation: queries include `{ tenantId: currentTenant }`
- [x] Block cross-tenant data access (middleware validation)
- [x] Update existing services to filter by `tenantId`

**Tệp liên quan:**

- `src/common/middleware/tenant-context.middleware.ts`
- Update: `alert.service.ts`, `event.service.ts`, `webhook.service.ts` (add tenantId filters)
- `src/modules/webhook/webhook.controller.ts` (protect + authorize)
- `src/modules/admin/admin.controller.ts` (protect + authorize)

---

### Hạng mục 5: Tenant Admin & User Management

**Hạng mục cần làm:**

- [x] `TenantController`:
  - `GET /tenants/:id/users` → list users (admin only)
  - `POST /tenants/:id/users` → add user to tenant (admin only)
  - `DELETE /tenants/:id/users/:userId` → remove user (admin only)
  - `PATCH /tenants/:id/users/:userId` → update user role (admin only)
- [x] `UserService.addUserToTenant()`, `removeUserFromTenant()`, `updateUserRole()`
- [x] Validate: admin can only manage users in their tenant
- [x] Unit test: tenant.service.spec.ts (quản lý người dùng)

**Tệp liên quan:**

- `src/modules/tenant/controllers/tenant.controller.ts` (extend)
- `src/modules/tenant/services/tenant.service.ts` (extend)
- `src/modules/tenant/tenant.service.spec.ts` (test mới)

---

### Hạng mục 6: Kiểm thử tích hợp và tài liệu

**Hạng mục cần làm:**

- [x] E2E test: signup → login → access protected endpoint with JWT
- [x] E2E test: cross-tenant isolation (user A cannot access user B's tenant data)
- [x] E2E test: role-based access (viewer cannot write events)
- [x] Update `docs/API.md`: auth flows, token format, protected endpoints
- [x] Add `docs/AUTH.md`: user signup/login, role permissions, tenant isolation
- [x] Update README: steps to create first admin user (seed script)

**Tệp liên quan:**

- `src/modules/user/user.integration.spec.ts`
- `src/modules/tenant/tenant-isolation.integration.spec.ts`
- `docs/AUTH.md` (mới)
- Update `docs/API.md`

---

## Theo dõi trạng thái

**Trạng thái**

- **Tổng số hạng mục**: 6
- **Đang thực hiện**: 0
- **Đã hoàn thành**: 6/6 ✅ HOÀN THÀNH TOÀN BỘ
- **Cập nhật lần cuối**: 09/05/2026

**Đã đẩy lên remote**

- **Branch đã push**: `origin/m12/p0-auth` (đã tạo branch mới và đẩy lên)
- **Thông tin push / PR**: https://github.com/lethien999/SignalOps/pull/new/m12/p0-auth

---

## Ghi chú

- Hạng mục 1 là nền tảng; Hạng mục 2-6 phụ thuộc vào Hạng mục 1
- Signup tự tạo tenant + gán vai trò admin (luồng đơn giản)
- Tenant admin có thể mời người dùng (POST /tenants/:id/users)
- Các route API key (ingestion events, alerts) vẫn công khai, không yêu cầu JWT
- OAuth / SSO → P1 (không làm ở P0)
- Xác thực theo session → không cần (JWT là đủ)

---

## Ưu tiên P1 - Xác thực nâng cao

### Hạng mục 1: Đặt lại mật khẩu

**Hạng mục cần làm:**

- [x] `POST /auth/forgot-password` → gửi liên kết đặt lại mật khẩu qua email
- [x] Lưu reset token (hash + hết hạn 24 giờ) trong collection `PasswordResetToken`
- [x] `POST /auth/reset-password` → xác thực token + cập nhật mật khẩu mới
- [x] Mẫu email để gửi liên kết đặt lại mật khẩu (Node Mailer hoặc SendGrid)
- [x] Unit test: luồng đặt lại mật khẩu

**Tệp liên quan:**

- `src/modules/user/schemas/password-reset-token.schema.ts`
- `src/modules/user/services/password-reset.service.ts`
- `src/modules/user/controllers/user.controller.ts` (thêm endpoints)
- `src/modules/user/dtos/forgot-password.dto.ts`, `reset-password.dto.ts`
- `src/common/email/email.service.ts` (mới)

---

### Hạng mục 2: Xác thực hai lớp (2FA)

**Hạng mục cần làm:**

- [x] `POST /auth/2fa/enable` → tạo TOTP secret (Google Authenticator)
- [x] `POST /auth/2fa/verify-setup` → xác thực mã TOTP + lưu secret
- [x] `POST /auth/login` → chấp nhận mã OTP (6 chữ số)
- [x] `POST /auth/2fa/disable` → tắt 2FA (yêu cầu mật khẩu)
- [x] Lưu 2FA secret + backup codes trong User schema
- [x] Unit test: luồng bật/xác thực/đăng nhập 2FA

**Tệp liên quan:**

- `src/modules/user/schemas/user.schema.ts` (thêm totp secret + backup codes)
- `src/modules/user/services/two-factor.service.ts` (mới)
- `src/modules/user/controllers/user.controller.ts` (thêm 2FA endpoints)
- `src/modules/user/dtos/verify-2fa.dto.ts`
- Dashboard: `apps/dashboard/app/login/page.tsx` (thêm ô OTP nếu đã bật 2FA)

---

### Hạng mục 3: OAuth2 (Google, GitHub)

**Hạng mục cần làm:**

- [x] Cấu hình OAuth2 Passport strategies (Google, GitHub)
- [x] `GET /auth/oauth/:provider` → chuyển hướng đến đăng nhập nhà cung cấp
- [x] `GET /auth/oauth/:provider/callback` → xử lý phản hồi OAuth + tạo/liên kết user
- [x] Liên kết tài khoản OAuth với user hiện có
- [x] Hủy liên kết tài khoản OAuth
- [x] Unit test: luồng OAuth + liên kết tài khoản

**Tệp liên quan:**

- `src/modules/auth/strategies/google.strategy.ts`
- `src/modules/auth/strategies/github.strategy.ts`
- `src/modules/auth/controllers/oauth.controller.ts` (mới)
- `src/modules/user/services/oauth.service.ts` (mới)
- `src/modules/user/schemas/user.schema.ts` (thêm oauth providers field)
- Dashboard: nút đăng nhập OAuth

---

### Timeline P1

- Tuần 3: Triển khai OAuth2 (Hạng mục 3) ✅ HOÀN THÀNH (18 tệp, Passport strategies + OAuth service + tích hợp Dashboard)
- Tổng: ~3 tuần ✅ TOÀN BỘ M12 P1 ĐÃ HOÀN THÀNH

## 📋 M12 P1 Hạng mục 3: OAuth2 ✅ HOÀN THÀNH

### Tóm tắt

Đã triển khai đầy đủ OAuth2 với nhà cung cấp Google và GitHub. Người dùng có thể đăng ký/đăng nhập qua tài khoản mạng xã hội, liên kết nhà cung cấp vào tài khoản hiện có và hủy liên kết khi cần.

**Các tệp đã triển khai** (tổng 18):

1. Backend (11 tệp):

- `src/config/oauth.config.ts` - Cấu hình OAuth
- `src/modules/auth/strategies/google.strategy.ts` - Strategy Passport Google
- `src/modules/auth/strategies/github.strategy.ts` - Strategy Passport GitHub
- `src/modules/auth/controllers/oauth.controller.ts` - Endpoint OAuth
- `src/modules/auth/auth.module.ts` - Module xác thực
- `src/modules/user/services/oauth.service.ts` - Logic nghiệp vụ OAuth
- `src/modules/user/services/oauth.service.spec.ts` - Unit test
- `src/modules/user/schemas/user.schema.ts` - Cập nhật trường `oauthProviders`
- `src/modules/user/user.module.ts` - Xuất `OAuthService`
- `src/modules/user/services/auth.service.ts` - Bổ sung phương thức `generateToken`
- `src/app.module.ts` - Nhập `AuthModule`

2. Frontend (7 tệp):

- `lib/auth.ts` - Hàm hỗ trợ OAuth + xử lý callback
- `app/login/page.tsx` - Nút đăng nhập OAuth (Google, GitHub)
- `app/callback/page.tsx` - Trang xử lý callback OAuth
- `components/OAuthProviderManager.tsx` - UI quản lý nhà cung cấp OAuth
- `package.json` - Cài dependency Passport

**Trạng thái build**: ✅ PASS (0 lỗi, 44 cảnh báo)
**Trạng thái lint**: ✅ PASS (0 lỗi)
**Kiểm thử**: Đã viết unit test cho `oauth.service` (bao phủ toàn bộ phương thức)
**Đã commit**: `feat(M12 P1): Task 3 - OAuth2 authentication` (18 tệp lên `origin/m12/p0-auth`)
