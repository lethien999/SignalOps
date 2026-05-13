# 🚀 Triển khai

Tài liệu về triển khai, CI/CD, checklists, và kế hoạch rollout.

## Các thư mục trong mục này

### [checklists/](checklists/)

Danh sách kiểm tra cho các giai đoạn triển khai:

- `STAGING-MONITORING-CHECKLIST.md` — Kiểm tra hàng ngày trong staging (48-72h)
- `PRODUCTION-READY-CHECKLIST.md` — Chuẩn bị trước khi triển khai production

### [plans/](plans/)

Kế hoạch triển khai chi tiết:

- `PRODUCTION-ROLLOUT-PLAN.md` — 5 giai đoạn rollout từ 0% → 100%
- `PRODUCTION-SHADOW-MODE-DEPLOYMENT.md` — Triển khai shadow mode (giai đoạn 1)
- `STAGING-AB-REPORT.md` — Hướng dẫn A/B test trong staging

## Các file trong mục này

| File                                       | Mô tả                                                |
| ------------------------------------------ | ---------------------------------------------------- |
| [DEPLOYMENT.md](DEPLOYMENT.md)             | Hướng dẫn triển khai local, staging, production      |
| [CI_CD_STRATEGY.md](CI_CD_STRATEGY.md)     | Chiến lược CI/CD: Jenkins pipeline, stages, rollback |
| [ARCHIVE_STRATEGY.md](ARCHIVE_STRATEGY.md) | Chiến lược lưu trữ: TTL index, backup, retention     |

## Quy trình triển khai

```
1. Kiểm tra Checklists (checklists/)
   ├─ Staging: checklists/STAGING-MONITORING-CHECKLIST.md
   └─ Production: checklists/PRODUCTION-READY-CHECKLIST.md

2. Theo dõi Plans (plans/)
   ├─ Staging: plans/STAGING-AB-REPORT.md
   └─ Production: plans/PRODUCTION-SHADOW-MODE-DEPLOYMENT.md → plans/PRODUCTION-ROLLOUT-PLAN.md

3. Đọc hướng dẫn chi tiết
   └─ DEPLOYMENT.md (local/staging/production)
```

## Khi nào dùng?

- **Triển khai lần đầu**: → Đọc DEPLOYMENT.md
- **Chuẩn bị staging A/B test**: → Dùng checklists/STAGING-MONITORING-CHECKLIST.md
- **Chuẩn bị production**: → Dùng checklists/PRODUCTION-READY-CHECKLIST.md
- **Hiểu kế hoạch rollout**: → Đọc plans/PRODUCTION-ROLLOUT-PLAN.md
- **Vận hành CI/CD**: → Đọc CI_CD_STRATEGY.md
