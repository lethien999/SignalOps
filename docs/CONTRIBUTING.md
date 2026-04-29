# Hướng dẫn đóng góp SignalOps

## Nhánh (Branching)

- Mỗi tính năng phải có 1 nhánh riêng
- Tên nhánh nên rõ mục đích, ví dụ: `feature/api-key-guard`, `fix/dashboard-url`, `chore/cleanup-docs`
- Luôn tách nhánh từ nhánh ổn định như `main` hoặc `develop`
- Không commit trực tiếp lên `main`
- Chỉ merge vào `main` khi nhánh đó đã sẵn sàng deploy

## Quy tắc commit

- Mỗi commit nên bám 1 chức năng hoặc 1 thay đổi nhỏ, tránh gom nhiều feature vào cùng một commit
- Tên commit phải mô tả rõ việc đã làm, ví dụ: `feat: add api key guard for events`
- Tránh message mơ hồ như `fix bug`, `update code`, `cleanup`
- Nếu một feature lớn, hãy chia thành nhiều commit logic theo từng bước triển khai
- Giữ commit sạch, không kèm file môi trường local hoặc cấu hình editor

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
- Ghi rõ branch nguồn, branch đích, và tính năng tương ứng
- Ghi chú các mục chủ ý để lại cho sau