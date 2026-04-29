# Quy Ước Branching & Commit SignalOps

Tài liệu này định nghĩa quy ước làm việc theo branch cho repo SignalOps.

## Nguyên tắc cốt lõi

- Mỗi tính năng, sửa lỗi, hoặc thay đổi lớn phải có một branch riêng
- Branch mới luôn được tạo từ nhánh ổn định như `main` hoặc `develop`
- Không commit trực tiếp lên `main`
- `main` phải luôn ở trạng thái có thể deploy
- Một branch chỉ nên chứa một mục tiêu rõ ràng

## Quy tắc đặt tên branch

### Cấu trúc chuẩn

`<type>/<scope>-<short-description>`

### Quy tắc chung

- Chỉ dùng chữ thường
- Dùng dấu gạch ngang `-` để ngăn cách từ
- Không dùng khoảng trắng, ký tự đặc biệt, hoặc tiếng Việt có dấu
- Tên ngắn gọn nhưng phải hiểu được mục đích

### Loại branch

| Type | Khi dùng | Ví dụ |
|------|----------|-------|
| `feature/` | Thêm chức năng mới | `feature/api-key-guard` |
| `fix/` | Sửa lỗi hành vi | `fix/dashboard-url` |
| `hotfix/` | Sửa lỗi khẩn cấp trên production | `hotfix/healthcheck-failure` |
| `chore/` | Việc bảo trì, dọn dẹp, tooling | `chore/remove-legacy-docs` |
| `refactor/` | Tái cấu trúc nhưng không đổi hành vi | `refactor/event-processing-flow` |
| `docs/` | Cập nhật tài liệu | `docs/git-workflow` |
| `test/` | Thêm hoặc sửa test | `test/api-gateway-coverage` |
| `release/` | Chuẩn bị phát hành | `release/v1-0-0` |

## Quy tắc commit

- Mỗi commit chỉ nên chứa một ý nghĩa rõ ràng
- Commit message phải mô tả đúng thay đổi, không dùng message chung chung như `fix bug` hoặc `update code`
- Nếu một feature lớn, chia commit theo từng bước logic
- Ưu tiên Conventional Commits

### Mẫu commit

`<type>(<scope>): <short summary>`

### Type commit

| Type | Ý nghĩa | Ví dụ |
|------|---------|-------|
| `feat` | Thêm tính năng | `feat(api): add api key guard` |
| `fix` | Sửa lỗi | `fix(dashboard): use localhost urls` |
| `refactor` | Tái cấu trúc | `refactor(worker): extract threshold logic` |
| `docs` | Tài liệu | `docs(contributing): add branch rules` |
| `test` | Test | `test(api): add guard coverage` |
| `chore` | Công việc phụ trợ | `chore(ci): update pipeline script` |
| `build` | Build/dependencies | `build: bump workspace packages` |
| `ci` | CI/CD | `ci(jenkins): fail on lint errors` |

## Luồng làm việc chuẩn

1. Tạo branch từ `main` hoặc `develop`
2. Làm đúng một feature hoặc một fix trên branch đó
3. Commit theo từng bước nhỏ, rõ nghĩa
4. Push branch lên remote
5. Tạo pull request để review và merge
6. Chỉ merge vào `main` khi branch đã sẵn sàng deploy

## Ví dụ tốt

- `feature/api-key-guard`
- `fix/dashboard-localhost-url`
- `hotfix/mongo-auth-config`
- `chore/remove-redundant-event-broker`
- `docs/git-branching-convention`

## Ví dụ nên tránh

- `fix-bug`
- `update-code`
- `temp`
- `test2`
- `new-feature`
