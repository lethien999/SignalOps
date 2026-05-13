# 🚀 Kế hoạch Production Rollout - ML Anomaly Detection

**Mục tiêu**: Rollout AI anomaly detection từ 0% → 100% trên production an toàn, từng bước  
**Thời gian ước lượng**: 2-3 tuần (tùy theo KPI monitoring)  
**Fallback**: Có thể disable AI per-tenant hoặc globally bằng env var

---

## Giai đoạn Rollout

### Giai đoạn 1: Shadow Mode (Tuần 1)

- **ML Rollout**: 0% (vẫn dùng rule-based cho tất cả alerts)
- **AI Scoring**: ✅ Chạy ở background, lưu vào DB (không tạo alert từ ML)
- **Purpose**: Thu thập metrics, xác nhận model hoạt động stable
- **Duration**: 1 tuần
- **Monitor**:
  - Worker error rate < 0.1%
  - ML inference latency < 150ms (p99)
  - Model accuracy giữ nguyên vs staging

**Env Config:**

```bash
ANOMALY_THRESHOLD=80
AI_AB_TEST=false          # Vẫn shadow mode, không tạo alert
AI_ROLLOUT_PERCENT=0
```

### Giai đoạn 2: Early Adopter (Tuần 2)

- **ML Rollout**: 5-10% events (production traffic)
- **A/B Split**: 5-10% events dùng ML, 90-95% rule-based
- **Purpose**: Kiểm tra ML vs rule-based trên production data
- **Duration**: 3-4 ngày
- **KPI Targets**:
  - False Positive rate < 3% (so với rule-based)
  - Alert latency Δ < 50ms (so với rule-based)
  - Precision ≥ 88%, Recall ≥ 90%
- **Monitor**:
  - Số alerts từ ML vs rule-based
  - Customer complaints via webhook errors
  - Model inference time

**Env Config:**

```bash
ANOMALY_THRESHOLD=80
AI_AB_TEST=true
AI_ROLLOUT_PERCENT=5     # Bắt đầu 5%
```

### Giai đoạn 3: Scaled Pilot (Tuần 2-3)

- **ML Rollout**: 25-50% events
- **Purpose**: Mở rộng trên subset của production, thu thập more data
- **Duration**: 3-5 ngày
- **KPI Targets**: (như Giai đoạn 2)
- **Decision Gate**:
  - ✅ PASS: Chuyển sang Giai đoạn 4
  - ❌ FAIL: Rollback xuống Giai đoạn 1, tune hyperparameter

**Env Config:**

```bash
AI_ROLLOUT_PERCENT=25    # Tăng lên 25%
# hoặc 50% nếu 25% smooth
```

### Giai đoạn 4: Gradual Rollout (Tuần 3)

- **ML Rollout**: 50% → 75% → 90% (từng bước 1-2 ngày)
- **Purpose**: Reach mainstream users, collect more telemetry
- **Duration**: 3-5 ngày
- **Monitor**: Như trên

**Env Config:**

```bash
AI_ROLLOUT_PERCENT=50    # Day 1
AI_ROLLOUT_PERCENT=75    # Day 2-3
AI_ROLLOUT_PERCENT=90    # Day 4+
```

### Giai đoạn 5: Full Rollout (Tuần 4)

- **ML Rollout**: 100% events
- **Rule-Based**: Lưu vào alert nhưng chỉ dùng cho fallback + comparison
- **Purpose**: ML là primary, rule-based là secondary/fallback
- **Duration**: ∞ (ongoing production)
- **Monitor**:
  - Precision, Recall, F1 score hàng tuần
  - Customer satisfaction (via NPS hoặc feedback)
  - False alert trend

**Env Config:**

```bash
AI_ROLLOUT_PERCENT=100
# Tenant-level override: db.tenants.updateOne({ name: "xxx" }, { $set: { aiEnabled: false } })
```

---

## Biến Môi Trường & Cấu hình

### Worker Environment (Docker / K8s)

```yaml
# production/deployment.yml hoặc .env.production
ANOMALY_THRESHOLD=80                # ML decision threshold

# A/B Rollout Control
AI_AB_TEST=true                    # Enable A/B test
AI_ROLLOUT_PERCENT=5               # Giai đoạn đầu: 5%

# Monitoring
LOG_LEVEL=info                     # Log all AI decisions
METRICS_ENABLE=true                # Export Prometheus metrics
```

### Tenant-level Override (per-tenant toggle)

```javascript
// MongoDB: Enable/disable AI per tenant
db.tenants.updateOne({ name: 'production-tenant-1' }, { $set: { aiEnabled: true } });

// Kiểm tra
db.tenants.findOne({ name: 'production-tenant-1' }, { aiEnabled: 1 });
```

---

## Rollback Plan

Nếu KPI không đạt, rollback ngay:

```bash
# Từng bước 1: Giảm rollout về 0%
AI_ROLLOUT_PERCENT=0

# Từng bước 2: Disable AI per-tenant (nếu cần)
db.tenants.updateOne({ }, { $set: { aiEnabled: false } }, { multi: true })

# Kiểm tra: chỉ rule-based tạo alert
docker compose logs -f worker | grep -v "In A/B rollout"
```

---

## Decision Points & Metrics

| Giai đoạn   | Rollout % | Thời gian | KPI Targets                   | Go/No-Go             |
| ----------- | --------- | --------- | ----------------------------- | -------------------- |
| **Shadow**  | 0%        | 1 tuần    | Latency < 150ms               | ✅ Go (collect data) |
| **Early**   | 5-10%     | 3-4 ngày  | Precision ≥ 88%, FP rate < 3% | ✅ Go / ❌ Rollback  |
| **Scaled**  | 25-50%    | 3-5 ngày  | Precision ≥ 87%, Recall ≥ 89% | ✅ Go / ❌ Rollback  |
| **Gradual** | 50% → 90% | 3-5 ngày  | Maintain KPI                  | ✅ Go                |
| **Full**    | 100%      | ∞         | F1 ≥ 90%, FP rate < 2%        | ✅ Sustain           |

---

## Monitoring & Alerting

### Prometheus Metrics (if enabled)

```
# Worker metrics
signalops_ml_inference_duration_ms{quantile="p50,p95,p99"}  # Latency
signalops_ml_score_distribution{bucket}                      # Score buckets
signalops_alert_created_total{source="ml|rule-based"}       # Alert source
signalops_false_positive_rate                                # FP tracking
```

### Dashboard (Grafana optional)

- ML vs rule-based alert rates (line chart)
- Inference latency over time (heatmap)
- Precision/Recall trend (panel)

---

## Communication Plan

**Stakeholders to notify:**

1. **Operations**: Alert creation behavior may change (ML vs rule-based)
2. **Support**: New "AI confidence" field in alerts
3. **Customers**: (optional) "Better alert accuracy with ML" messaging
4. **Engineering**: On-call for rollback if needed

**Notification cadence:**

- Giai đoạn 1: Status update hàng 3 ngày
- Giai đoạn 2-4: Daily status update
- Giai đoạn 5: Weekly KPI review

---

## Success Criteria (End of Rollout)

✅ **All must be true:**

1. Precision ≥ 88% on production data (vs baseline)
2. Recall ≥ 90% (catching most anomalies)
3. F1 Score ≥ 90%
4. False Positive rate < 2%
5. ML inference latency < 100ms (p99)
6. Zero worker crashes due to ML model
7. Customer satisfaction maintained or improved

---

## Appendix: Tenant Flags

### Tenant Schema (MongoDB)

```javascript
{
  name: "production-tenant-1",
  aiEnabled: true,                    // Enable ML for this tenant
  aiRolloutPercent: 100,              // Override global rollout %
  aiThreshold: 80,                    // Override global threshold
  createdAt: ISODate("2026-05-12")
}
```

### Disable AI for specific tenant

```bash
# If issues detected for tenant-X
db.tenants.updateOne(
  { name: "tenant-x" },
  { $set: { aiEnabled: false } }
)

# Verify
db.tenants.findOne({ name: "tenant-x" }, { aiEnabled: 1 })
```

---

_Kế hoạch được phê duyệt: 12/05/2026_  
_Liên hệ: Backend Team / ML Engineer_
