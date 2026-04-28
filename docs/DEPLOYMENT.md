# Hướng dẫn triển khai SignalOps

## Tổng quan

SignalOps được thiết kế để chạy local với Docker Compose hoặc trong luồng CI/CD Jenkins.

## Yêu cầu

- Node.js 18+
- Docker Desktop với Compose v2
- Thông tin kết nối MongoDB và Redis qua file `.env`

## Triển khai Local

1. Sao chép `.env.example` thành `.env` và điều chỉnh theo môi trường.
2. Cài đặt dependencies: `npm install`
3. Build workspace: `npm run build`
4. Khởi động: `npm run docker:up`
5. Kiểm tra:
   - `http://localhost:3000/api/health`
   - `http://localhost:3001`
   - `http://localhost:8080/nginx-health` (nếu bật Nginx)

## Docker Images

- `infrastructure/Dockerfile.api` — API Gateway
- `infrastructure/Dockerfile.broker` — Event Broker
- `infrastructure/Dockerfile.worker` — Worker Service
- `infrastructure/Dockerfile.simulator` — Simulator
- `infrastructure/Dockerfile.dashboard` — Dashboard

## Lưu ý cho Production

- Sử dụng trình quản lý bí mật cho `MONGODB_PASSWORD`, `JWT_SECRET`, `WEBSOCKET_AUTH_TOKEN`
- Giữ `.env` ngoài git; chỉ commit `.env.example`
- Đặt `NODE_ENV=production`
- Đặt các service phía sau TLS ingress hoặc reverse proxy

## Luồng Jenkins

Pipeline Jenkins thực hiện:
- Checkout → Install → Build → Lint → Test → Xác minh API → Kiểm tra logs → Docker Build/Tag

## Rollback

Nếu triển khai thất bại: dừng stack bằng `npm run docker:down`, sửa lỗi, rồi chạy lại `npm run docker:up`.