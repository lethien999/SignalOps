# 🔐 Milestone 12: Xác thực và nền tảng SaaS

**Trạng thái**: 🟡 Sẵn sàng triển khai  
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
- [x] Unit tests: auth.service.spec.ts (signup, login, JWT validation)
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
- [x] Unit tests for guards (mocked user context)

**Tệp liên quan:**
- `src/common/guards/jwt.guard.ts`
- `src/common/guards/role.guard.ts`
- `src/common/decorators/authorize.decorator.ts`
- `src/common/guards/index.ts`

---

### Hạng mục 3: Auth Endpoints & Dashboard Integration
**Hạng mục cần làm:**
- [x] `UserController`: 
  - `POST /auth/signup` → create user + tenant (auto-assign admin role)
  - `POST /auth/login` → return JWT token + user info
  - `GET /auth/me` → return current user (from JWT)
- [x] Dashboard login page: `/login` form (email+password)
- [x] Dashboard redirect: if no token → redirect to `/login`
- [x] Store JWT in `localStorage`, send in `Authorization: Bearer <token>`
- [x] Unit tests: user.controller.spec.ts

**Tệp liên quan:**
- `src/modules/user/controllers/user.controller.ts`
- `src/modules/user/dtos/signup.dto.ts`, `login.dto.ts`
- `apps/dashboard/app/login/page.tsx` (new)
- `apps/dashboard/lib/auth.ts` (new) - JWT management
- `apps/dashboard/middleware.ts` (new) - redirect to login

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
- [x] Unit tests: tenant.service.spec.ts (user management)

**Tệp liên quan:**
- `src/modules/tenant/controllers/tenant.controller.ts` (extend)
- `src/modules/tenant/services/tenant.service.ts` (extend)
- `src/modules/tenant/tenant.service.spec.ts` (new tests)

---

### Hạng mục 6: Integration Tests & Docs
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
- `docs/AUTH.md` (new)
- Update `docs/API.md`

---

## Status Tracking

**Trạng thái**
- **Tasks Defined**: 6
- **Tasks In Progress**: 0
- **Tasks Completed**: 6/6 ✅ ALL COMPLETE
- **Last Updated**: 09/05/2026

**Đã đẩy lên remote**
- **Branch đã push**: `origin/m12/p0-auth` (đã tạo branch mới và đẩy lên)
- **Thông tin push / PR**: https://github.com/lethien999/SignalOps/pull/new/m12/p0-auth

---

## Notes

- Task 1 là nền tảng; Task 2-6 phụ thuộc vào Task 1
- Signup auto-creates tenant + assign admin role (simple flow)
- Tenant admin có thể invite users (POST /tenants/:id/users)
- API key routes (events, alerts ingestion) vẫn public, không require JWT
- OAuth / SSO → P1 (không làm ở P0)
- Session-based auth → không cần (JWT đủ)
