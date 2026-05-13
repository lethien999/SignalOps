# Hướng dẫn đóng góp SignalOps

## Nhánh và commit

- Mỗi tính năng, sửa lỗi, hoặc thay đổi lớn phải có một branch riêng
- Branch mới luôn tách từ `main` hoặc `develop`
- Không commit trực tiếp lên `main`
- Branch nên theo mẫu `<type>/<scope>-<short-description>`
- Dùng Conventional Commits cho message, ví dụ: `feat(api): add api key guard`
- Giữ commit sạch, không kèm file môi trường local hoặc cấu hình editor
- Với thay đổi lớn, chia thành các commit nhỏ theo từng bước logic

## Thiết lập

1. Cài đặt dependencies: `npm install`
2. Sao chép `.env.example` thành `.env` và điền giá trị local
3. Chạy `npm run build` trước khi mở PR

### Chạy dev với Docker hot reload

- Dùng cấu hình overlay: `docker compose --env-file .env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml up`
- Dừng stack: `docker compose --env-file .env -f infrastructure/docker-compose.yml -f infrastructure/docker-compose.dev.yml down`

## Quy tắc code

- Giữ TypeScript strict, tránh `any` trừ khi bắt buộc
- Ưu tiên sử dụng utilities và shared libs có sẵn trước khi thêm helper mới
- Giữ các thay đổi Docker và CI đồng bộ với cấu trúc monorepo

## Kiểm thử

- Chạy `npm run build` để xác nhận workspace biên dịch thành công
- Chạy test ở cấp package nếu có
- Thêm test cạnh logic mà test đó kiểm tra

### Kiểm thử hiệu năng (tùy chọn, khi có staging/prod)

Khi muốn kiểm thử hiệu năng hệ thống:

```bash
# Load test HTTP API (mặc định 30s, 10 concurrent workers)
npm run perf:load

# Tùy chỉnh load test:
PERF_TEST_TOTAL_REQUESTS=1000 PERF_TEST_CONCURRENCY=50 npm run perf:load

# Soak test (chạy dài, kiểm tra memory leak):
PERF_TEST_DURATION_SECONDS=600 PERF_TEST_CONCURRENCY=20 npm run perf:soak

# WebSocket fan-out test (broadcast stress):
PERF_TEST_CLIENTS=100 npm run perf:websocket

# Với assertions (fail nếu vượt ngưỡng):
PERF_TEST_TOTAL_REQUESTS=500 PERF_TEST_MAX_AVG_MS=100 PERF_TEST_MAX_P95_MS=200 npm run perf:load
```

**Đầu ra JSON**: `success`, `throughputPerSecond`, `avgMs`, `p95Ms`, `errorRate` — dùng để track regression.

## Bảo mật

- Không bao giờ commit credentials thật
- Giữ `.env`, `.npmrc`, `.vscode/`, và file override local ngoài git
- Chỉ sử dụng giá trị mẫu trong `.env.example`

## Pull Requests

- Bao gồm tóm tắt ngắn về thay đổi
- Nêu các bước xác minh đã thực hiện
- Ghi rõ branch nguồn, branch đích, và tính năng tương ứng
- Ghi chú các mục chủ ý để lại cho sau
