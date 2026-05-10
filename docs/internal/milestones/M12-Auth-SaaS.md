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

---

## Ưu tiên P1 - Xác thực nâng cao

### Hạng mục 1: Đặt lại mật khẩu (Password Reset)
**Hạng mục cần làm:**
- [ ] `POST /auth/forgot-password` → gửi link reset email
- [ ] Lưu reset token (hash + expiry 24 giờ) trong collection `PasswordResetToken`
- [ ] `POST /auth/reset-password` → verify token + cập nhật mật khẩu mới
- [ ] Email template để gửi reset link (Node Mailer or SendGrid)
- [ ] Unit tests: password reset flow

**Tệp liên quan:**
- `src/modules/user/schemas/password-reset-token.schema.ts`
- `src/modules/user/services/password-reset.service.ts`
- `src/modules/user/controllers/user.controller.ts` (thêm endpoints)
- `src/modules/user/dtos/forgot-password.dto.ts`, `reset-password.dto.ts`
- `src/common/email/email.service.ts` (new)

---

### Hạng mục 2: Two-Factor Authentication (2FA)
**Hạng mục cần làm:**
- [ ] `POST /auth/2fa/enable` → generate TOTP secret (Google Authenticator)
- [ ] `POST /auth/2fa/verify-setup` → verify TOTP code + save secret
- [ ] `POST /auth/login` → accept OTP code (6 digits)
- [ ] `POST /auth/2fa/disable` → turn off 2FA (require password)
- [ ] Store 2FA secret + backup codes trong User schema
- [ ] Unit tests: 2FA enable/verify/login flow

**Tệp liên quan:**
- `src/modules/user/schemas/user.schema.ts` (thêm totp secret + backup codes)
- `src/modules/user/services/two-factor.service.ts` (new)
- `src/modules/user/controllers/user.controller.ts` (thêm 2FA endpoints)
- `src/modules/user/dtos/verify-2fa.dto.ts`
- Dashboard: `apps/dashboard/app/login/page.tsx` (thêm OTP input nếu 2FA enabled)

---

### Hạng mục 3: OAuth2 (Google, GitHub)
**Hạng mục cần làm:**
- [ ] Cấu hình OAuth2 Passport strategies (Google, GitHub)
- [ ] `GET /auth/oauth/:provider` → redirect đến provider login
- [ ] `GET /auth/oauth/:provider/callback` → handle OAuth response + create/link user
- [ ] Link OAuth account với existing user (connect social)
- [ ] Unlink OAuth account (disconnect)
- [ ] Unit tests: OAuth flow + account linking

**Tệp liên quan:**
- `src/modules/auth/strategies/google.strategy.ts`
- `src/modules/auth/strategies/github.strategy.ts`
- `src/modules/auth/controllers/oauth.controller.ts` (new)
- `src/modules/user/services/oauth.service.ts` (new)
- `src/modules/user/schemas/user.schema.ts` (thêm oauth providers field)
- Dashboard: OAuth login buttons

---

### Timeline P1
- Week 1: Password Reset (Task 1) ✅ DONE
- Week 2: 2FA Setup (Task 2) ✅ DONE
- Week 3: OAuth2 Implementation (Task 3) 🟡 READY FOR REVIEW
- Total: ~3 tuần

---

## 📋 M12 P1 Task 3: OAuth2 Implementation Checklist

### Objective
Cho phép users đăng nhập bằng Google hoặc GitHub, link social accounts với existing SignalOps account.

### Part 1: Infrastructure Setup
**Database Schema**:
- [ ] Update `User` schema: thêm `oauthProviders: Array<{ provider: string, providerId: string, email: string, linkedAt: Date }>`
- [ ] Add unique indexes: `oauthProviders.provider` + `oauthProviders.providerId` (compound)

**Configuration**:
- [ ] Add `.env` variables:
  - `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`
  - `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_CALLBACK_URL`
- [ ] Create `src/config/oauth.config.ts` to centralize OAuth settings

### Part 2: Passport Strategies
**File**: `src/modules/auth/strategies/google.strategy.ts`
- [ ] Configure Passport Google OAuth2 Strategy (profile scope)
- [ ] Validate `profile.emails[0].value` format

**File**: `src/modules/auth/strategies/github.strategy.ts`
- [ ] Configure Passport GitHub OAuth2 Strategy (user:email scope)
- [ ] Validate `profile.emails` existence and format

### Part 3: OAuth Service
**File**: `src/modules/user/services/oauth.service.ts` (new)
- [ ] Method: `findOrCreateUserViaOAuth(provider, providerId, email, profile)` 
  - If user exists by email: link provider + return user
  - If user not exists: create new user (generate secure password) + link provider + auto-assign tenant + return user
- [ ] Method: `linkOAuthProvider(userId, provider, providerId, email)`
  - Validate provider/providerId not already linked to another user
  - Add to `oauthProviders` array
- [ ] Method: `unlinkOAuthProvider(userId, provider)`
  - Validate user has at least email+password OR another OAuth provider
  - Remove from `oauthProviders` array
- [ ] Method: `getLinkedProviders(userId)` - return array of linked providers
- [ ] Unit tests: all methods with mocked User model

### Part 4: OAuth Controller
**File**: `src/modules/auth/controllers/oauth.controller.ts` (new, move from user controller)
- [ ] `@Get('/oauth/:provider')` (unprotected)
  - Validate provider (google|github)
  - Redirect to `passport.authenticate(provider)` with scope+state
- [ ] `@Get('/oauth/:provider/callback')` (unprotected, called by provider)
  - Handle `passport.authenticate(provider)` callback
  - Call `oauthService.findOrCreateUserViaOAuth()`
  - Generate JWT token
  - Redirect frontend with token: `/callback?token=<jwt>&provider=<provider>`
- [ ] `@Post('/oauth/link')` (protected by JWT)
  - Start linking flow: return URL to redirect user to provider
- [ ] `@Post('/oauth/:provider/link-callback')` (protected by JWT)
  - Complete linking: call `oauthService.linkOAuthProvider()`
  - Return `{ message, linkedProviders[] }`
- [ ] `@Post('/oauth/:provider/unlink')` (protected by JWT)
  - Validate password (like 2FA disable)
  - Call `oauthService.unlinkOAuthProvider()`
  - Return `{ message, linkedProviders[] }`

### Part 5: Dashboard Integration
**File**: `apps/dashboard/lib/auth.ts` (existing, update)
- [ ] Add `handleOAuthCallback(token, provider)` - extract token from URL, store in localStorage
- [ ] Add `getLinkedProviders()` - fetch from `/auth/me` or new endpoint

**File**: `apps/dashboard/app/login/page.tsx` (existing, update)
- [ ] Add Google OAuth button: `<a href="/api/auth/oauth/google">Sign in with Google</a>`
- [ ] Add GitHub OAuth button: `<a href="/api/auth/oauth/github">Sign in with GitHub</a>`
- [ ] Style buttons (Google blue, GitHub black)

**File**: `apps/dashboard/app/settings/page.tsx` (existing or new)
- [ ] Display linked providers section
- [ ] Button to link new provider (if not already linked)
- [ ] Button to unlink provider (with password confirmation modal)
- [ ] Show provider email for each linked account

### Part 6: Testing & Validation
- [ ] Unit tests: `oauth.service.spec.ts` (all methods + edge cases)
- [ ] Integration test: OAuth flow (signup → token → fetch user)
- [ ] Integration test: Account linking (existing user links Google)
- [ ] Integration test: Account unlinking (validation + removal)
- [ ] Manual test: Google OAuth flow
- [ ] Manual test: GitHub OAuth flow

### Part 7: Error Handling & Edge Cases
- [ ] OAuth provider returns error → friendly message to user
- [ ] Email mismatch between SignalOps user and provider profile → handle gracefully
- [ ] User tries to link provider already linked to another user → reject + message
- [ ] User tries to unlink their only auth method → reject (must have email+password or 2+ providers)
- [ ] Token expiry during callback → redirect to login with message
- [ ] Provider email not available → generate default email or request additional permission

### Deployment Prerequisites
- [ ] Google OAuth app created in Google Cloud Console
- [ ] GitHub OAuth app created in GitHub Settings
- [ ] `.env` variables set in production
- [ ] Callback URLs match environment (localhost:3000 for dev, production URL for staging/prod)

### Estimated Effort
- **Setup & Config**: 30 min
- **Strategies**: 45 min
- **OAuth Service**: 1 hour
- **OAuth Controller**: 1 hour
- **Dashboard Integration**: 45 min
- **Testing & Manual Verification**: 1 hour
- **Total**: ~5-6 hours

**Status**: 🔄 READY FOR USER APPROVAL

