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

## Danh Sách Branch Chuẩn Cho Repo SignalOps

Đây là danh sách branch chuẩn để chia lại công việc của repo theo đúng nguyên tắc "mỗi tính năng một branch". Danh sách này ưu tiên tính rõ ràng, khả năng review, và ranh giới commit sạch.

### 1. `docs/project-governance`

**Phạm vi**

- `docs/CONTRIBUTING.md`
- `docs/GIT_BRANCHING_CONVENTION.md`
- `README.md` phần quy ước Git

**Commit nên nằm trong branch này**

1. `docs(contributing): define feature-branch workflow`
2. `docs(git): add branch naming convention`
3. `docs(readme): link git workflow guidance`

**Mục tiêu**: chuẩn hóa quy trình Git và tài liệu làm việc nhóm.

---

### 2. `chore/repo-cleanup`

**Phạm vi**

- Xóa `apps/event-broker/`
- Xóa `infrastructure/Dockerfile.broker`
- Dọn reference trong `infrastructure/docker-compose.yml`, `package.json`, `README.md`
- Xóa các file báo cáo không còn cần thiết

**Commit nên nằm trong branch này**

1. `refactor(infrastructure): remove redundant event-broker service`
2. `docs(readme): remove event-broker references`
3. `docs: remove redundant analysis report files`

**Mục tiêu**: giữ repo gọn, loại bỏ thành phần trùng vai trò hoặc chỉ còn giá trị lịch sử.

---

### 3. `fix/local-runtime-config`

**Phạm vi**

- `infrastructure/docker-compose.yml`
- `.env.example`
- `apps/api-gateway/src/main.ts`
- `apps/dashboard` env/public URL

**Commit nên nằm trong branch này**

1. `fix(dashboard): use localhost public urls`
2. `fix(mongodb): use root auth env vars`
3. `fix(api-gateway): require cors origin`
4. `fix(dev): align redis and local runtime flags`

**Mục tiêu**: bảo đảm local/dev chạy đúng, không phụ thuộc hostname nội bộ Docker cho browser.

---

### 4. `feature/api-gateway-security`

**Phạm vi**

- `apps/api-gateway/src/common/guards/*`
- `apps/api-gateway/src/common/env-validator.ts`
- `apps/api-gateway/src/modules/event/*`
- Swagger config trong `apps/api-gateway/src/main.ts`

**Commit nên nằm trong branch này**

1. `feat(api-gateway): add api key guard`
2. `feat(api-gateway): add rate limit guard`
3. `feat(api-gateway): add swagger api-key scheme`
4. `test(api-gateway): cover guards and event flow`

**Mục tiêu**: bảo vệ ingestion boundary, giữ documentation đồng bộ với security.

---

### 5. `feature/worker-processing`

**Phạm vi**

- `apps/worker-service/src/main.ts`
- `apps/worker-service/src/services/*`
- `apps/worker-service/src/repositories/*`
- `apps/worker-service/src/common/*`

**Commit nên nằm trong branch này**

1. `feat(worker): extract alert factory`
2. `feat(worker): add graceful shutdown and queue handling`
3. `refactor(worker): dedupe threshold normalization`
4. `test(worker): cover repositories and logger`

**Mục tiêu**: tách logic xử lý nền rõ ràng, giảm duplicate logic, nâng coverage.

---

### 6. `feature/dashboard-ui`

**Phạm vi**

- `apps/dashboard/app/*`
- `apps/dashboard/components/*`
- `apps/dashboard/lib/*`
- `apps/dashboard/types/*`

**Commit nên nằm trong branch này**

1. `feat(dashboard): add layout shell and navigation`
2. `feat(dashboard): add alerts map metrics pages`
3. `feat(dashboard): add dark mode toggle`
4. `fix(dashboard): align api client with browser urls`

**Mục tiêu**: gom toàn bộ UI/UX dashboard vào một nhánh feature duy nhất.

---

### 7. `feature/observability`

**Phạm vi**

- `infrastructure/monitoring/*`
- `scripts/backup-mongodb.sh`
- documentation vận hành liên quan monitoring/backup

**Commit nên nằm trong branch này**

1. `feat(monitoring): add prometheus and grafana stack`
2. `chore(ops): add mongodb backup script`
3. `docs(operations): document monitoring runbook`

**Mục tiêu**: tách monitoring và backup thành một luồng thay đổi riêng.

---

### 8. `chore/ci-quality-gates`

**Phạm vi**

- `Jenkinsfile`
- `scripts/verify-api.mjs`
- `scripts/verify-websocket.mjs`
- `package.json` scripts liên quan CI

**Commit nên nằm trong branch này**

1. `ci(jenkins): fail on lint and test errors`
2. `ci(jenkins): add docker push stage`
3. `chore(ci): require env file in health check`
4. `chore(ci): rename verification scripts`

**Mục tiêu**: CI phải phản ánh đúng quality gate, không bỏ qua lỗi bằng workaround.

---

### 9. `test/api-gateway-coverage`

**Phạm vi**

- `apps/api-gateway/**/*.spec.ts`
- test fixtures cho guards/services/controllers của API Gateway

**Commit nên nằm trong branch này**

1. `test(api-gateway): add guard coverage`
2. `test(api-gateway): add event and alert service coverage`
3. `test(api-gateway): add websocket listener coverage`

**Mục tiêu**: nâng API Gateway từ 0 test lên baseline có thể bảo trì.

---

### 10. `release/v1-0-0`

**Phạm vi**

- Chỉ dùng khi mọi feature/fix đã merge và hệ thống sẵn sàng phát hành

**Commit nên nằm trong branch này**

1. `chore(release): prepare v1.0.0`
2. `docs(release): update changelog and deployment notes`

**Mục tiêu**: tạo một nhánh ngắn hạn cho đóng gói và chốt phát hành.

## Ánh Xạ Commit Theo Nhánh

Nếu chia lại lịch sử logic cho repo này từ đầu, nên gom commit theo thứ tự sau:

| Branch | Commit sequence |
|--------|-----------------|
| `docs/project-governance` | `docs(contributing)`, `docs(git)`, `docs(readme)` |
| `chore/repo-cleanup` | `refactor(infrastructure)`, `docs(readme)`, `docs(remove reports)` |
| `fix/local-runtime-config` | `fix(dashboard)`, `fix(mongodb)`, `fix(api-gateway)` |
| `feature/api-gateway-security` | `feat(api-gateway)`, `feat(api-gateway)`, `test(api-gateway)` |
| `feature/worker-processing` | `feat(worker)`, `feat(worker)`, `refactor(worker)`, `test(worker)` |
| `feature/dashboard-ui` | `feat(dashboard)`, `feat(dashboard)`, `fix(dashboard)` |
| `feature/observability` | `feat(monitoring)`, `chore(ops)`, `docs(operations)` |
| `chore/ci-quality-gates` | `ci(jenkins)`, `ci(jenkins)`, `chore(ci)` |
| `test/api-gateway-coverage` | `test(api-gateway)`, `test(api-gateway)`, `test(api-gateway)` |

## GitHub Branch Ref Hiện Tại

Bảng dưới đây dùng để tạo branch thật trên GitHub theo đúng mapping đã chuẩn hóa. Một vài branch hiện tại cùng trỏ về một commit tip vì lịch sử đã được triển khai theo dạng linear; điều này vẫn hợp lệ vì mục tiêu là có ref rõ ràng theo từng nhóm công việc.

| Branch | Commit tip hiện tại | Ghi chú |
|--------|---------------------|---------|
| `docs/project-governance` | `8c17474` | Bộ tài liệu quy ước Git + branch matrix |
| `chore/repo-cleanup` | `5a89ee9` | Xóa event-broker và dọn reference |
| `fix/local-runtime-config` | `0e5413d` | Runtime/dev config, env và Docker compose |
| `feature/api-gateway-security` | `0e5413d` | Guards, env validation, Swagger security |
| `feature/worker-processing` | `0e5413d` | Worker logic, tests, shutdown, queue handling |
| `feature/dashboard-ui` | `3f3512d` | Dashboard UI implementation |
| `feature/observability` | `0e5413d` | Monitoring stack và backup script |
| `chore/ci-quality-gates` | `0e5413d` | Jenkins, verify scripts, quality gates |
| `test/api-gateway-coverage` | `0e5413d` | Placeholder branch cho coverage mở rộng API Gateway |
| `release/v1-0-0` | `8c17474` | Branch phát hành sẽ cắt khi chốt release |

> Ghi chú: nếu sau này tách lịch sử theo từng branch thật sự, bảng này sẽ được cập nhật để mỗi branch trỏ về commit tip riêng đúng theo feature branch flow.

## Quy Tắc Khi Tách Commit Vào Branch

- Không đẩy nhiều branch logic vào cùng một branch dài hạn
- Branch phải khớp một mục tiêu rõ ràng, không dùng branch kiểu "misc" hoặc "temp"
- Commit trong một branch phải theo thứ tự: nền tảng → chức năng → test → dọn dẹp
- Nếu commit liên quan tới nhiều subsystem, ưu tiên tách ra branch hẹp hơn trước khi merge
- Khi review, chỉ review một branch một mục tiêu; nếu có hai mục tiêu, tách branch

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
