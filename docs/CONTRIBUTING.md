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

## Bảo mật

- Không bao giờ commit credentials thật
- Giữ `.env`, `.npmrc`, `.vscode/`, và file override local ngoài git
- Chỉ sử dụng giá trị mẫu trong `.env.example`

## Pull Requests

- Bao gồm tóm tắt ngắn về thay đổi
- Nêu các bước xác minh đã thực hiện
- Ghi rõ branch nguồn, branch đích, và tính năng tương ứng
- Ghi chú các mục chủ ý để lại cho sau