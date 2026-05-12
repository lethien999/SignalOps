# Tài liệu Xác thực và Phân quyền

## Tổng quan

SignalOps sử dụng hệ thống xác thực dựa trên JWT (stateless) với kiểm soát truy cập dựa trên vai trò (RBAC) để cách ly đa đối tượng.

## Kiến trúc Xác thực

### JWT (JSON Web Tokens)

- **Định dạng**: Token không trạng thái ký bằng HS256
- **Thời hạn**: 7 ngày (có thể cấu hình qua biến môi trường `JWT_EXPIRES_IN`)
- **Bí mật**: Cấu hình qua biến môi trường `JWT_SECRET` (mặc định: 'dev-secret-key-change-in-prod' - PHẢI thay đổi trong production)

### Payload JWT

```typescript
{
  userId: ObjectId,           // ID người dùng
  tenantId: ObjectId,         // ID đối tượng (ngữ cảnh đa đối tượng)
  email: string,              // Email người dùng
  roleId: 'admin' | 'editor' | 'viewer',  // Vai trò người dùng
  iat: number,                // Thời gian phát hành (Unix timestamp)
  exp: number                 // Thời hạn (Unix timestamp)
}
```

### Quy trình Token

1. **Client xác thực**: POST `/auth/signup` hoặc `/auth/login`
2. **Server trả về JWT**: Token được nhúng trong phản hồi
3. **Client lưu trữ JWT**: Trong localStorage của trình duyệt (dashboard)
4. **Client gửi JWT**: Trong header Authorization cho các yêu cầu tiếp theo
5. **Server xác thực JWT**: Trên các route được bảo vệ sử dụng `JwtGuard`

## Endpoints

### Công khai (Không yêu cầu xác thực)

#### POST /auth/signup
Đăng ký người dùng mới và tạo đối tượng

**Yêu cầu:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "tenantId": "mongodb-objectid"
}
```

**Phản hồi (201 Created):**
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

**Xác thực:**
- Email phải hợp lệ và duy nhất
- Mật khẩu phải có ≥8 ký tự
- Đối tượng phải tồn tại

**Lưu ý**: Người dùng đầu tiên trong một đối tượng được gán vai trò 'admin' tự động.

#### POST /auth/login
Xác thực bằng email và mật khẩu

**Yêu cầu:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**Phản hồi (200 OK):**
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

**Lỗi:**
- `401 Unauthorized` - Thông tin xác thực không hợp lệ
- `400 Bad Request` - Email hoặc mật khẩu bị thiếu/không hợp lệ

### Được bảo vệ (Yêu cầu header Authorization)

Tất cả các endpoint được bảo vệ yêu cầu header Authorization:
```
Authorization: Bearer <jwt-token>
```

#### GET /auth/me
Lấy thông tin người dùng đã xác thực hiện tại

**Phản hồi (200 OK):**
```json
{
  "userId": "user-id",
  "email": "user@example.com",
  "tenantId": "tenant-id",
  "roleId": "admin"
}
```

#### GET /tenants/:tenantId/users
Liệt kê tất cả người dùng trong một đối tượng

**Quyền**: Chỉ `admin`

**Tham số Query:**
- `skip` (mặc định: 0) - Số bản ghi cần bỏ qua
- `limit` (mặc định: 50, tối đa: 100) - Bản ghi trên mỗi trang

**Phản hồi (200 OK):**
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
Thêm người dùng vào đối tượng

**Quyền**: Chỉ `admin`

**Yêu cầu:**
```json
{
  "email": "newuser@example.com",
  "roleId": "editor"  // tùy chọn, mặc định 'viewer'
}
```

**Phản hồi (201 Created):**
```json
{
  "id": "user-id",
  "email": "newuser@example.com",
  "tenantId": "tenant-id",
  "roleId": "editor"
}
```

#### DELETE /tenants/:tenantId/users/:userId
Xóa người dùng khỏi đối tượng (xóa mềm - đặt isActive=false)

**Quyền**: Chỉ `admin`

**Phản hồi (200 OK):**
```json
{
  "id": "user-id",
  "email": "removed@example.com",
  "isActive": false
}
```

#### PATCH /tenants/:tenantId/users/:userId/role
Cập nhật vai trò của người dùng

**Quyền**: Chỉ `admin`

**Yêu cầu:**
```json
{
  "roleId": "admin"  // 'admin', 'editor', hoặc 'viewer'
}
```

**Phản hồi (200 OK):**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "roleId": "admin"
}
```

## Vai trò và Quyền

### Định nghĩa Vai trò

SignalOps sử dụng ba vai trò cố định:

#### admin
- Truy cập đầy đủ vào tất cả các tính năng
- Có thể quản lý người dùng và vai trò
- Có thể xem tất cả các metrics và dữ liệu SLA
- Có thể cấu hình cảnh báo và ngưỡng

**Quyền:**
- `read:events` - Đọc dữ liệu sự kiện
- `write:events` - Tạo/ghi sự kiện
- `manage:users` - Quản lý người dùng
- `view:metrics` - Xem metrics cơ sở hạ tầng
- `manage:alerts` - Cấu hình cảnh báo

#### editor
- Có thể đọc và ghi dữ liệu sự kiện
- Có thể xem metrics
- Không thể quản lý người dùng hoặc cấu hình

**Quyền:**
- `read:events`
- `write:events`
- `view:metrics`

#### viewer
- Chỉ có quyền đọc sự kiện và metrics
- Không có khả năng ghi hoặc quản lý

**Quyền:**
- `read:events`
- `view:metrics`

### Kiểm tra Quyền

Server xác thực quyền của người dùng sử dụng decorator `@Authorize(role)`:

```typescript
@Get('/sensitive-data')
@UseGuards(JwtGuard, RoleGuard)
@Authorize('admin')  // Chỉ admin có thể truy cập
async getSensitiveData() {
  // ...
}
```

## Cách ly Đa đối tượng

### Ngữ cảnh Đối tượng

Mỗi người dùng chỉ thuộc về một đối tượng:
- User.tenantId = MongoDB ObjectId của đối tượng
- JWT payload bao gồm tenantId
- `TenantContextMiddleware` trích xuất tenantId từ JWT và gắn vào yêu cầu

### Xác thực Đối tượng

Trước khi truy cập tài nguyên của đối tượng:

1. **Trích xuất tenantId của người dùng từ JWT**
2. **So sánh với tenantId được yêu cầu trong URL**
3. **Từ chối nếu không khớp** (403 Forbidden)

Ví dụ:
```typescript
if (!validateTenantAccess(req.user.tenantId, requestedTenantId)) {
  throw new ForbiddenException('Bạn không có quyền truy cập đối tượng này');
}
```

### Lọc Dữ liệu

Tất cả các truy vấn nên lọc theo tenantId:

```typescript
// Tốt - lọc theo đối tượng
const alerts = await alertModel.find({ tenantId: userTenantId });

// Xấu - không lọc theo đối tượng (rò rỉ dữ liệu)
const alerts = await alertModel.find({});
```

Sử dụng tiện ích `buildTenantFilter()`:
```typescript
const filter = buildTenantFilter(userTenantId, { status: 'open' });
const alerts = await alertModel.find(filter);
// Tương đương với: { tenantId: userTenantId, status: 'open' }
```

## Các Thực hành Bảo mật Tốt nhất

### Bảo mật Mật khẩu

- Được mã hóa bằng bcrypt (12 vòng)
- Tối thiểu 8 ký tự
- Không bao giờ được ghi log hoặc hiển thị trong phản hồi

### Bảo mật Token

1. **Truyền tải**: Luôn sử dụng HTTPS trong production
2. **Lưu trữ (Trình duyệt)**: localStorage + httpOnly cookies
   - localStorage: Để truy cập từ phía client
   - cookies: Để truy cập từ middleware
3. **Thời hạn**: Token 7 ngày để hạn chế cửa sổ tiếp xúc
4. **Thu hồi**: Chưa được triển khai (stateless); sử dụng logout trên client để xóa token

### Biến môi trường (Production)

```bash
# Phải được cấu hình trong production
JWT_SECRET=<long-random-string>  # Tối thiểu 32 ký tự, sử dụng openssl rand -base64 32
JWT_EXPIRES_IN=7d
MONGODB_URI=mongodb+srv://...
```

### CORS & CSRF

- Cấu hình CORS cho domain dashboard
- Token CSRF tùy chọn (JWT cung cấp bảo vệ CSRF vốn có)

## Tích hợp Dashboard

### Quy trình Đăng nhập

1. Người dùng điều hướng đến `/login`
2. Nhập email và mật khẩu
3. Yêu cầu POST `/auth/login`
4. Lưu token trong localStorage và cookies (xem `lib/auth.ts`)
5. Chuyển hướng đến `/` (dashboard)
6. Middleware xác thực sự có mặt của token
7. Interceptor API thêm token Bearer vào tất cả các yêu cầu

### Lưu trữ Token

```typescript
// apps/dashboard/lib/auth.ts
setAuthToken({ token, user });  // Lưu trong localStorage + cookies

// Truy xuất
const token = getAuthToken();
const user = getAuthUser();

// Đăng xuất
clearAuthToken();
```

### Tích hợp API

Tất cả các yêu cầu axios tự động bao gồm header Authorization:

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

## Kiểm thử

### Kiểm thử Đơn vị

Kiểm thử dịch vụ xác thực, guards, và tiện ích:
```bash
npm run -w api-gateway test -- auth.service.spec.ts
npm run -w api-gateway test -- guards.spec.ts
```

### Kiểm thử E2E

Kiểm thử các quy trình xác thực hoàn chỉnh bao gồm cách ly đa đối tượng:
```bash
npm run -w api-gateway test:e2e -- auth.e2e-spec.ts
```

Bao gồm:
- Đăng ký và đăng nhập
- Xác thực JWT
- Cách ly đa đối tượng
- Kiểm tra quyền

## Khắc phục Sự cố

### Lỗi "Invalid or expired token" (Token không hợp lệ hoặc đã hết hạn)

**Nguyên nhân:**
- Token đã hết hạn (7 ngày)
- Token bị giả mạo
- JWT_SECRET trên server sai

**Giải pháp:**
- Đăng nhập lại để lấy token mới
- Kiểm tra JWT_SECRET khớp trên server

### Lỗi "You do not have access to this tenant" (Bạn không có quyền truy cập đối tượng này)

**Nguyên nhân:**
- tenantId của người dùng không khớp với tenantId trong URL
- Người dùng cố gắng truy cập tài nguyên của đối tượng khác

**Giải pháp:**
- Xác minh người dùng ở trong đối tượng chính xác
- Kiểm tra tham số URL

### Lỗi "Insufficient permissions" (Quyền không đủ)

**Nguyên nhân:**
- Vai trò của người dùng thiếu quyền yêu cầu
- Route yêu cầu vai trò không được gán cho người dùng

**Giải pháp:**
- Admin phải nâng cấp vai trò của người dùng
- Người dùng yêu cầu admin cấp quyền truy cập

## Ghi chú Chuyển đổi

- Hệ thống xác thực được thêm vào M12 (Milestone 12)
- Các endpoint trước đó không có auth guards hiện được bảo vệ
- Các khóa API hiện có (để nhập sự kiện) vẫn riêng biệt với xác thực JWT
- Tất cả các hoạt động dashboard hiện yêu cầu xác thực JWT
