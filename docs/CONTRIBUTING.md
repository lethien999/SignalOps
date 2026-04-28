# Hướng dẫn đóng góp SignalOps

## Nhánh (Branching)

- Làm việc trên nhánh feature riêng
- Giữ commit gọn và tập trung
- Không commit file môi trường local hoặc cài đặt editor

## Thiết lập

1. Cài đặt dependencies: `npm install`
2. Sao chép `.env.example` thành `.env` và điền giá trị local
3. Chạy `npm run build` trước khi mở PR

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
- Ghi chú các mục chủ ý để lại cho sau