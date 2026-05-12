# 📋 Kế hoạch Rollout & Triển khai

Chi tiết kế hoạch cho từng giai đoạn rollout AI từ staging tới production.

## Các file trong mục này

| File | Mô tả | Giai đoạn |
|------|-------|----------|
| [STAGING-AB-REPORT.md](STAGING-AB-REPORT.md) | Hướng dẫn A/B test staging, metrics, quyết định | Giai đoạn 0 (Staging) |
| [PRODUCTION-SHADOW-MODE-DEPLOYMENT.md](PRODUCTION-SHADOW-MODE-DEPLOYMENT.md) | Triển khai shadow mode (AI scoring, không tạo alert) | Giai đoạn 1 (Production Shadow) |
| [PRODUCTION-ROLLOUT-PLAN.md](PRODUCTION-ROLLOUT-PLAN.md) | 5 giai đoạn từ 0% → 100% AI rollout | Giai đoạn 2-5 (Production Gradual) |

## Timeline M13

```
Staging Phase (12-14/05):
├─ 12/05 sáng: Deploy staging, AI_ROLLOUT_PERCENT=10%
├─ 12-14/05: Monitor metrics (48-72h)
│  └─ Dùng: STAGING-AB-REPORT.md
├─ 14/05 trưa: Decision gate (PASS/FAIL)
│
Production Phase (14/05 onwards):
├─ Giai đoạn 1 (14-21/05): Shadow mode, AI_ROLLOUT_PERCENT=0%
│  └─ Dùng: PRODUCTION-SHADOW-MODE-DEPLOYMENT.md
│  └─ Mục đích: 1 tuần baseline, so sánh AI vs rule-based
│
├─ Giai đoạn 2-5 (21/05+): Gradual rollout 5% → 10% → 25% → 50% → 100%
│  └─ Dùng: PRODUCTION-ROLLOUT-PLAN.md
│  └─ Mục đích: Monitor từng giai đoạn, gate bằng KPI
```

## Quy trình

1. **Staging** (12-14/05)
   ```
   Chuẩn bị → Deploy → Monitor 48-72h → Decision
   Tài liệu: STAGING-AB-REPORT.md
   ```

2. **Production Shadow** (14-21/05)
   ```
   Nếu staging PASS:
   Chuẩn bị → Deploy shadow (0%) → 1 tuần baseline
   Tài liệu: PRODUCTION-SHADOW-MODE-DEPLOYMENT.md
   ```

3. **Production Gradual** (21/05+)
   ```
   Nếu shadow baseline OK:
   5% → 10% → 25% → 50% → 100% (tuần 2-3)
   Mỗi giai đoạn: monitor → gate → approve → next
   Tài liệu: PRODUCTION-ROLLOUT-PLAN.md
   ```

## KPI Gates (mỗi giai đoạn phải PASS)

- **Precision**: ≥ 88%
- **Recall**: ≥ 90%
- **False Positive Rate**: < 5%
- **Worker Uptime**: > 99%
- **ML Latency**: < 100ms avg

Nếu fail → tune threshold hoặc rollback
