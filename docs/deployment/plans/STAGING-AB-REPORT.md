# 📊 Báo cáo Staging A/B Test - ML Anomaly Detection

**Ngày triển khai**: 12/05/2026  
**Trạng thái**: ✅ Chạy trên Staging (Docker Compose)  
**Thời gian dự kiến**: 48-72 giờ để thu thập metrics

---

## Cấu hình Staging

### Biến môi trường
```bash
ANOMALY_THRESHOLD=80              # ML decision threshold (0-100)
AI_AB_TEST=true                   # Bật A/B testing
AI_ROLLOUT_PERCENT=10             # 10% events dùng ML decision, 90% rule-based
MONGODB_URI=mongodb://signalops:secret123@mongodb:27017/signalops-db?authSource=admin
REDIS_ENABLED=true
```

### Kết quả từ Local Evaluation
| Metric | Giá trị | Mục tiêu |
|--------|--------|---------|
| **Precision** | 89.19% | ≥ 80% ✅ |
| **Recall** | 91.67% | ≥ 75% ✅ |
| **F1 Score** | 90.41 | ≥ 77% ✅ |
| **Accuracy** | 99.98% | ✅ |
| **ROC-AUC** | (từ training) 91.90% | ≥ 85% ✅ |
| **True Positives** | 33 | - |
| **False Positives** | 4 | ← Giám sát |
| **False Negatives** | 3 | ← Giám sát |

---

## Hướng dẫn Giám sát

### 1. Logs từ Worker Container
```bash
# Xem logs worker
docker compose logs -f signalops-worker

# Tìm A/B rollout events
docker compose logs signalops-worker | grep -i "rollout\|ai decision"
```

### 2. Metrics cần theo dõi

**Hàng ngày:**
- Số lượng sự kiện: `select count(*) from events where createdAt > now() - interval 1 day`
- Số alert từ ML: `select count(*) from alerts where source='ml' and createdAt > now() - interval 1 day`
- Số alert từ rule-based: `select count(*) from alerts where source='rule-based' and createdAt > now() - interval 1 day`

**Accuracy:**
- False Positive rate (FP / (FP + TN)): nên < 5%
- False Negative rate (FN / (FN + TP)): nên < 10%

**MongoDB Query:**
```javascript
// Tính toán metrics hàng ngày
db.alerts.aggregate([
  {
    $match: {
      createdAt: { $gte: new Date(new Date().setDate(new Date().getDate() - 1)) }
    }
  },
  {
    $group: {
      _id: "$anomalyLabel",
      count: { $sum: 1 }
    }
  }
])

// Xem alert có anomaly info
db.alerts.find({ anomalyScore: { $exists: true } }).limit(10)
```

### 3. Webhook Notifications (nếu có cấu hình)
- Giám sát alert webhook payloads để xác nhận `anomalyScore` và `anomalyLabel` được truyền
- Kiểm tra dashboard hiển thị "AI confidence" + "Reasons" cho mỗi alert

### 4. Sentinel Checks
- ✅ Worker container không crash (check `docker ps`)
- ✅ MongoDB kết nối OK (check MongoDB logs)
- ✅ Redis queue không backlog (check `redis-cli INFO stats`)
- ✅ ML model load thành công (check worker startup logs)

---

## Quyết định Production

### Tiêu chí PASS (tất cả phải đạt):
- [ ] Precision ≥ 88% (hiện tại 89.19%)
- [ ] Recall ≥ 90% (hiện tại 91.67%)
- [ ] False Positive rate < 5%
- [ ] Worker không crash sau 72 giờ chạy
- [ ] Latency trung bình < 100ms (ML inference)

### Tiêu chí FAIL (rollback ngay):
- [ ] Precision < 70%
- [ ] Recall < 70%
- [ ] Worker crash liên tục
- [ ] MongoDB timeout hoặc disconnect
- [ ] Model load thất bại

---

## Action Items

**Ngay (tại staging):**
1. ✅ Deploy worker với A/B=10%
2. 📋 Bật giám sát logs & metrics theo hướng dẫn trên
3. 📋 Ghi lại anomaly scores + alert patterns trong 24h đầu

**Sau 48-72 giờ:**
1. 📋 So sánh ML vs rule-based precision/recall
2. 📋 Kiểm tra customer feedback (nếu staging có users)
3. 📋 Quyết định: PASS → Production rollout, FAIL → Tune hyperparameters hoặc rollback

**Production Rollout (nếu PASS):**
- Xem [PRODUCTION-ROLLOUT-PLAN.md](PRODUCTION-ROLLOUT-PLAN.md)

---

## Liên hệ & Debug

- **Model file**: `apps/worker-service/src/assets/anomaly-model.onnx`
- **Scoring logic**: `apps/worker-service/src/services/anomaly-scoring.ts`
- **Worker main**: `apps/worker-service/src/main.ts` (line ~233: A/B rollout logic)
- **PR**: https://github.com/lethien999/SignalOps/pull/27

---

*Cập nhật lần cuối: 12/05/2026*
