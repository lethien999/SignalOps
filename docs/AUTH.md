# Authentication & Authorization Documentation

## Overview

SignalOps implements a stateless JWT-based authentication system with role-based access control (RBAC) for multi-tenant isolation.

## Authentication Architecture

### JWT (JSON Web Tokens)

- **Format**: Stateless tokens signed with HS256
- **Expiry**: 7 days (configurable via `JWT_EXPIRES_IN` env var)
- **Secret**: Configured via `JWT_SECRET` env var (default: 'dev-secret-key-change-in-prod' - MUST be changed in production)

### JWT Payload

```typescript
{
  userId: ObjectId,           // User ID
  tenantId: ObjectId,         // Tenant ID (multi-tenant context)
  email: string,              // User email
  roleId: 'admin' | 'editor' | 'viewer',  // User role
  iat: number,                // Issued at (Unix timestamp)
  exp: number                 // Expiration (Unix timestamp)
}
```

### Token Flow

1. **Client authenticates**: POST `/auth/signup` or `/auth/login`
2. **Server returns JWT**: Token embedded in response
3. **Client stores JWT**: In browser localStorage (dashboard)
4. **Client sends JWT**: In Authorization header for subsequent requests
5. **Server validates JWT**: On protected routes using `JwtGuard`

## Endpoints

### Public (No Auth Required)

#### POST /auth/signup
Register a new user and create a tenant

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "tenantId": "mongodb-objectid"
}
```

**Response (201 Created):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-mongodb-id",
    "email": "user@example.com",
    "tenantId": "tenant-id",
    "roleId": "admin"
  }
}
```

**Validation:**
- Email must be valid and unique
- Password must be ≥8 characters
- Tenant must exist

**Note**: First user in a tenant gets 'admin' role automatically.

#### POST /auth/login
Authenticate with email and password

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-mongodb-id",
    "email": "user@example.com",
    "tenantId": "tenant-id",
    "roleId": "admin"
  }
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `400 Bad Request` - Missing/invalid email or password

### Protected (Require Auth Header)

All protected endpoints require the Authorization header:
```
Authorization: Bearer <jwt-token>
```

#### GET /auth/me
Get current authenticated user info

**Response (200 OK):**
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "tenantId": "tenant-id",
  "roleId": "admin"
}
```

#### GET /tenants/:tenantId/users
List all users in a tenant

**Permissions**: `admin` only

**Query Parameters:**
- `skip` (default: 0) - Number of records to skip
- `limit` (default: 50, max: 100) - Records per page

**Response (200 OK):**
```json
[
  {
    "id": "user-id",
    "email": "user@example.com",
    "tenantId": "tenant-id",
    "roleId": "editor",
    "isActive": true,
    "createdAt": "2024-01-15T10:30:00Z"
  }
]
```

#### POST /tenants/:tenantId/users
Add a user to a tenant

**Permissions**: `admin` only

**Request:**
```json
{
  "email": "newuser@example.com",
  "roleId": "editor"  // optional, defaults to 'viewer'
}
```

**Response (201 Created):**
```json
{
  "id": "user-id",
  "email": "newuser@example.com",
  "tenantId": "tenant-id",
  "roleId": "editor"
}
```

#### DELETE /tenants/:tenantId/users/:userId
Remove user from tenant (soft delete - sets isActive=false)

**Permissions**: `admin` only

**Response (200 OK):**
```json
{
  "id": "user-id",
  "email": "removed@example.com",
  "isActive": false
}
```

#### PATCH /tenants/:tenantId/users/:userId/role
Update a user's role

**Permissions**: `admin` only

**Request:**
```json
{
  "roleId": "admin"  // 'admin', 'editor', or 'viewer'
}
```

**Response (200 OK):**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "roleId": "admin"
}
```

## Roles & Permissions

### Role Definitions

SignalOps uses three fixed roles:

#### admin
- Full access to all features
- Can manage users and roles
- Can view all metrics and SLA data
- Can configure alerts and thresholds

**Permissions:**
- `read:events` - Read event data
- `write:events` - Create/write events
- `manage:users` - User management
- `view:metrics` - View infrastructure metrics
- `manage:alerts` - Configure alerts

#### editor
- Can read and write event data
- Can view metrics
- Cannot manage users or configuration

**Permissions:**
- `read:events`
- `write:events`
- `view:metrics`

#### viewer
- Read-only access to events and metrics
- No write or management capabilities

**Permissions:**
- `read:events`
- `view:metrics`

### Permission Checking

Server validates user permissions using `@Authorize(role)` decorator:

```typescript
@Get('/sensitive-data')
@UseGuards(JwtGuard, RoleGuard)
@Authorize('admin')  // Only admin can access
async getSensitiveData() {
  // ...
}
```

## Multi-Tenant Isolation

### Tenant Context

Every user belongs to exactly one tenant:
- User.tenantId = tenant's MongoDB ObjectId
- JWT payload includes tenantId
- `TenantContextMiddleware` extracts tenantId from JWT and attaches to request

### Tenant Validation

Before accessing tenant resources:

1. **Extract user's tenantId from JWT**
2. **Compare with requested tenantId in URL**
3. **Reject if mismatch** (403 Forbidden)

Example:
```typescript
if (!validateTenantAccess(req.user.tenantId, requestedTenantId)) {
  throw new ForbiddenException('You do not have access to this tenant');
}
```

### Data Filtering

All queries should filter by tenantId:

```typescript
// Good - filters by tenant
const alerts = await alertModel.find({ tenantId: userTenantId });

// Bad - no tenant filtering (data leak)
const alerts = await alertModel.find({});
```

Use `buildTenantFilter()` utility:
```typescript
const filter = buildTenantFilter(userTenantId, { status: 'open' });
const alerts = await alertModel.find(filter);
// Equivalent to: { tenantId: userTenantId, status: 'open' }
```

## Security Best Practices

### Password Security

- Hashed with bcrypt (12 rounds)
- Minimum 8 characters
- Never logged or exposed in responses

### Token Security

1. **Transmission**: Always use HTTPS in production
2. **Storage (Browser)**: localStorage + httpOnly cookies
   - localStorage: For client-side access
   - cookies: For middleware access
3. **Expiry**: 7-day tokens to limit exposure window
4. **Revocation**: Not implemented (stateless); use logout on client to clear tokens

### Environment Variables (Production)

```bash
# Must be configured in production
JWT_SECRET=<long-random-string>  # Min 32 chars, use openssl rand -base64 32
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://...
```

### CORS & CSRF

- Configure CORS for dashboard domain
- CSRF tokens optional (JWT provides inherent CSRF protection)

## Dashboard Integration

### Login Flow

1. User navigates to `/login`
2. Enters email and password
3. POST `/auth/login` request
4. Store token in localStorage and cookies (see `lib/auth.ts`)
5. Redirect to `/` (dashboard)
6. Middleware validates token presence
7. API interceptor adds Bearer token to all requests

### Token Storage

```typescript
// apps/dashboard/lib/auth.ts
setAuthToken({ token, user });  // Stores in localStorage + cookies

// Retrieval
const token = getAuthToken();
const user = getAuthUser();

// Logout
clearAuthToken();
```

### API Integration

All axios requests automatically include Authorization header:

```typescript
// apps/dashboard/lib/api.ts
api.interceptors.request.use((config) => {
  const authHeader = getAuthHeader();
  if (authHeader && 'Authorization' in authHeader) {
    config.headers.Authorization = authHeader.Authorization;
  }
  return config;
});
```

## Testing

### Unit Tests

Test auth service, guards, and utilities:
```bash
npm run -w api-gateway test -- auth.service.spec.ts
npm run -w api-gateway test -- guards.spec.ts
```

### E2E Tests

Test complete auth flows including tenant isolation:
```bash
npm run -w api-gateway test:e2e -- auth.e2e-spec.ts
```

Covers:
- Signup and login
- JWT validation
- Cross-tenant isolation
- Permission checks

## Troubleshooting

### "Invalid or expired token" Error

**Causes:**
- Token expired (7 days old)
- Token tampered with
- Wrong JWT_SECRET on server

**Solution:**
- Re-login to get new token
- Verify JWT_SECRET matches on server

### "You do not have access to this tenant" Error

**Causes:**
- User's tenantId doesn't match URL tenantId
- User trying to access another tenant's resources

**Solution:**
- Verify user is in the correct tenant
- Check URL parameters

### "Insufficient permissions" Error

**Causes:**
- User role lacks required permission
- Route requires role not assigned to user

**Solution:**
- Admin must upgrade user role
- User requests admin to grant access

## Migration Notes

- Auth system added in M12 (Milestone 12)
- Previous endpoints without auth guards are now protected
- Existing API keys (for event ingestion) remain separate from JWT auth
- All dashboard operations now require JWT authentication
