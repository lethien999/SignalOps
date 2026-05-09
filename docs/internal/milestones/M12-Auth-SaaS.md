# 🔐 Milestone 12: Auth và SaaS Foundation

**Trạng thái**: 🟡 Ready for Implementation  
**Mục tiêu**: Nền tảng xác thực (JWT), RBAC (3 vai trò), multi-tenant architecture để SignalOps có thể đi theo hướng SaaS.  
**Thời gian ước tính**: 2-3 tuần (P0 tasks)

---

## Thiết kế tổng quan

### Architecture Decisions
- **Auth**: JWT stateless (email+password); OAuth → P2
- **RBAC**: Single role per user (admin/editor/viewer)
- **Multi-tenant**: `User.tenantId` (1:1 mapping); tenant admin manages users
- **Scopes**: Public API (API key), Protected API (JWT + role guard)
- **DB**: User + Role collections; extend Tenant.adminUserIds

---

## Ưu tiên P0 - Tasks

### Task 1: User & Role Schema + Auth Service
**Deliverables:**
- [x] `User` schema (Mongoose): email, passwordHash, tenantId, roleId, createdAt, updatedAt
- [x] `Role` collection (seeded): admin, editor, viewer with permissions array
- [x] `auth.service.ts`: signup, login, validateJwt, checkPermission methods
- [x] Hash passwords with bcrypt; generate JWT on login
- [x] Unit tests: auth.service.spec.ts (signup, login, JWT validation)
- [x] Extend `Tenant` schema: add `adminUserIds: ObjectId[]`
- [x] Migration script: `db-migrate-users.mjs` (create indexes, seed roles)

**Files:**
- `src/modules/user/schemas/user.schema.ts`
- `src/modules/user/schemas/role.schema.ts`
- `src/modules/user/services/auth.service.ts`
- `src/modules/user/user.module.ts`
- `src/modules/user/user.service.ts`
- `src/modules/user/user.service.spec.ts`
- `scripts/db-migrate-users.mjs`

---

### Task 2: JWT & Role Guards
**Deliverables:**
- [ ] `jwt.guard.ts`: extract & validate JWT from Authorization header
- [ ] `role.guard.ts`: check user role against required permissions
- [ ] `@Authorize(role: string)` decorator for routes
- [ ] Export guards from `src/common/guards/index.ts`
- [ ] Unit tests for guards (mocked user context)

**Files:**
- `src/common/guards/jwt.guard.ts`
- `src/common/guards/role.guard.ts`
- `src/common/decorators/authorize.decorator.ts`
- `src/common/guards/index.ts`

---

### Task 3: Auth Endpoints & Dashboard Integration
**Deliverables:**
- [ ] `UserController`: 
  - `POST /auth/signup` → create user + tenant (auto-assign admin role)
  - `POST /auth/login` → return JWT token + user info
  - `GET /auth/me` → return current user (from JWT)
  - `POST /auth/logout` → invalidate token (optional/client-side)
- [ ] Update `HealthController /api/stats` to require JWT + role
- [ ] Dashboard login page: `/login` form (email+password)
- [ ] Dashboard redirect: if no token → redirect to `/login`
- [ ] Store JWT in `localStorage`, send in `Authorization: Bearer <token>`
- [ ] Unit tests: user.controller.spec.ts

**Files:**
- `src/modules/user/controllers/user.controller.ts`
- `src/modules/user/dtos/signup.dto.ts`, `login.dto.ts`
- `apps/dashboard/app/login/page.tsx` (new)
- `apps/dashboard/lib/auth.ts` (new) - JWT management
- `apps/dashboard/middleware.ts` (new) - redirect to login

---

### Task 4: API Route Protection & Tenant Isolation
**Deliverables:**
- [ ] Protect admin endpoints: `/api/admin/*` → require JWT + admin role
- [ ] Protect config endpoints: `/api/webhooks/*` → require JWT + editor role
- [ ] Keep public ingestion: `POST /events`, `POST /alerts` → API key only
- [ ] Add `tenantId` to request context (via JWT or API key)
- [ ] Enforce tenant isolation: queries include `{ tenantId: currentTenant }`
- [ ] Block cross-tenant data access (middleware validation)
- [ ] Update existing services to filter by `tenantId`

**Files:**
- `src/common/middleware/tenant-context.middleware.ts`
- Update: `alert.service.ts`, `event.service.ts`, `webhook.service.ts` (add tenantId filters)
- `src/modules/webhook/webhook.controller.ts` (protect + authorize)
- `src/modules/admin/admin.controller.ts` (protect + authorize)

---

### Task 5: Tenant Admin & User Management
**Deliverables:**
- [ ] `TenantController`: 
  - `GET /tenants/:id/users` → list users (admin only)
  - `POST /tenants/:id/users` → add user to tenant (admin only)
  - `DELETE /tenants/:id/users/:userId` → remove user (admin only)
  - `PATCH /tenants/:id/users/:userId` → update user role (admin only)
- [ ] `UserService.addUserToTenant()`, `removeUserFromTenant()`, `updateUserRole()`
- [ ] Validate: admin can only manage users in their tenant
- [ ] Unit tests: tenant.service.spec.ts (user management)

**Files:**
- `src/modules/tenant/controllers/tenant.controller.ts` (extend)
- `src/modules/tenant/services/tenant.service.ts` (extend)
- `src/modules/tenant/tenant.service.spec.ts` (new tests)

---

### Task 6: Integration Tests & Docs
**Deliverables:**
- [ ] E2E test: signup → login → access protected endpoint with JWT
- [ ] E2E test: cross-tenant isolation (user A cannot access user B's tenant data)
- [ ] E2E test: role-based access (viewer cannot write events)
- [ ] Update `docs/API.md`: auth flows, token format, protected endpoints
- [ ] Add `docs/AUTH.md`: user signup/login, role permissions, tenant isolation
- [ ] Update README: steps to create first admin user (seed script)

**Files:**
- `src/modules/user/user.integration.spec.ts`
- `src/modules/tenant/tenant-isolation.integration.spec.ts`
- `docs/AUTH.md` (new)
- Update `docs/API.md`

---

## Status Tracking

**Trạng thái**
- **Tasks Defined**: 6
- **Tasks In Progress**: 0
- **Tasks Completed: 6/6 ? ALL COMPLETE
- **Last Updated**: 09/05/2026

---

## Notes

- Task 1 là nền tảng; Task 2-6 phụ thuộc vào Task 1
- Signup auto-creates tenant + assign admin role (simple flow)
- Tenant admin có thể invite users (POST /tenants/:id/users)
- API key routes (events, alerts ingestion) vẫn public, không require JWT
- OAuth / SSO → P1 (không làm ở P0)
- Session-based auth → không cần (JWT đủ)
