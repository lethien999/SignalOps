# ✅ Staging A/B Test - Hàng ngày Monitoring Checklist

**Ngày bắt đầu**: 12/05/2026 (Sáng)  
**Ngày dự kiến kết thúc**: 14/05/2026 (Trưa)  
**Khoảng thời gian**: 48-72 giờ

---

## 📋 Checklist Hàng ngày (làm 2-3 lần/ngày)

### ☀️ Sáng (08:00)

- [ ] **Container Health**

  ```bash
  docker compose ps | grep -E 'worker|mongodb|redis'
  # Expected: all "UP"
  ```

- [ ] **Worker Startup Logs** (kiểm tra ML model load)

  ```bash
  docker compose logs --tail=20 signalops-worker | grep -i "model loaded\|ml\|anomaly"
  # Expected: "ML model loaded successfully" hoặc "ONNX inference ready"
  ```

- [ ] **MongoDB Connection**

  ```bash
  docker compose exec mongodb mongosh --eval "db.adminCommand('ping')"
  # Expected: { ok: 1 }
  ```

- [ ] **Redis Queue Depth**

  ```bash
  docker compose exec redis redis-cli LLEN event-processing
  # Expected: < 100 (không backlog)
  ```

- [ ] **Ghi nhận lúc bắt đầu ca**
  - Số container restart (nếu có): \_\_\_
  - Ghi chú: \***\*\_\_\_\*\***

---

### 🌤️ Trưa (12:00)

- [ ] **Log Anomaly Detection Events**

  ```bash
  docker compose logs --since 4h signalops-worker | grep -i "in a/b rollout\|ai score\|anomaly"
  | tee staging-logs-$(date +%Y%m%d-%H%M).txt
  # Lưu file để review
  ```

- [ ] **MongoDB Event Count**

  ```bash
  docker compose exec mongodb mongosh --eval "
  use signalops-db
  db.events.countDocuments()
  db.events.countDocuments({ anomalyScore: { \$exists: true } })
  db.events.countDocuments({ createdAt: { \$gte: new Date(Date.now() - 24*60*60*1000) } })
  "
  # Ghi nhận: Total events | Events with AI scores | Events last 24h
  ```

- [ ] **Alert Comparison** (ML vs Rule-based)

  ```bash
  docker compose exec mongodb mongosh --eval "
  use signalops-db
  db.alerts.aggregate([
    { \$match: { createdAt: { \$gte: new Date(Date.now() - 24*60*60*1000) } } },
    { \$group: { _id: \$source, count: { \$sum: 1 } } },
    { \$sort: { _id: 1 } }
  ])
  "
  # Expected output:
  # { _id: "ml", count: ~X }          (10% × total events)
  # { _id: "rule-based", count: ~Y }  (90% × total events)
  ```

- [ ] **False Positives Check** (optional: compare with actual issues)

  ```bash
  # Lấy sample alerts từ ML
  docker compose exec mongodb mongosh --eval "
  use signalops-db
  db.alerts.find({ source: 'ml', createdAt: { \$gte: new Date(Date.now() - 12*60*60*1000) } })
    .limit(5)
    .pretty()
  "
  # Review: Có hợp lý không? Độ tin cậy cao không?
  ```

- [ ] **Thống kê ca sáng**
  - Events xử lý: \_\_\_
  - Alerts created (ML): \_\_\_
  - Alerts created (Rule): \_\_\_
  - Worker uptime: \_\_\_
  - Ghi chú: \***\*\_\_\_\*\***

---

### 🌙 Tối (18:00)

- [ ] **Error Rate Check**

  ```bash
  docker compose logs --since 6h signalops-worker | grep -i "error\|exception\|fail" | wc -l
  # Expected: < 5 lỗi (trong 6 giờ)
  ```

- [ ] **ML Inference Latency** (từ logs)

  ```bash
  docker compose logs --since 6h signalops-worker | grep "ml.*ms\|inference.*ms" | tail -10
  # Expected: 30-50ms / event
  ```

- [ ] **Redis Memory Usage**

  ```bash
  docker compose exec redis redis-cli INFO memory | grep used_memory_human
  # Expected: < 500MB
  ```

- [ ] **MongoDB Connection Pool**

  ```bash
  docker compose logs --tail=30 mongodb | grep -i "connection"
  ```

- [ ] **Thống kê ca chiều**
  - Total events (24h cumulative): \_\_\_
  - Alerts ratio (ML vs Rule): \_\_\_
  - Errors encountered: \_\_\_
  - Memory usage (Redis): \_\_\_
  - Ghi chú: \***\*\_\_\_\*\***

---

## 📊 Daily Summary Sheet

| Ngày  | Sáng (Container ✓) | Trưa (Events/Alerts) | Tối (Errors/Latency) | Status        |
| ----- | ------------------ | -------------------- | -------------------- | ------------- |
| 12/05 | ✓                  | \_                   | \_                   | 🔄 Collecting |
| 13/05 | \_                 | \_                   | \_                   | 🔄 Monitoring |
| 14/05 | \_                 | \_                   | \_                   | ⏳ Decision   |

---

## 🎯 Decision Gate (14/05 Trưa)

### Tiêu chí PASS ✅ (Tất cả phải đạt):

| Metric                  | Target      | Status | Notes           |
| ----------------------- | ----------- | ------ | --------------- |
| **Precision**           | ≥ 88%       | \_     | Local: 89.19%   |
| **Recall**              | ≥ 90%       | \_     | Local: 91.67%   |
| **False Positive Rate** | < 5%        | \_     | Monitoring...   |
| **Worker Uptime**       | > 99%       | \_     | No restart      |
| **ML Latency**          | < 100ms avg | \_     | Target: 30-50ms |
| **Error Rate**          | < 0.1%      | \_     | < 5 errors/6h   |

### Tiêu chí FAIL ❌ (Bất kỳ 1 nào fail):

| Metric       | Threshold    | Status | Action                     |
| ------------ | ------------ | ------ | -------------------------- |
| Precision    | < 70%        | \_     | Increase ANOMALY_THRESHOLD |
| Recall       | < 70%        | \_     | Decrease ANOMALY_THRESHOLD |
| Worker Crash | > 2 restarts | \_     | Debug & retry              |
| Latency      | > 200ms avg  | \_     | Check ONNX/CPU resources   |

---

## 📝 Decision Form (14/05)

### Kết quả Monitoring

**Precision (24h-72h average)**: **\_** %  
**Recall (24h-72h average)**: **\_** %  
**False Positive Rate**: **\_** %  
**Worker Uptime**: **\_** %  
**Total Events**: **\_** (ML scored: **\_**)  
**Alerts Created**: **\_** (ML-driven: **\_**, Rule-based: **\_**)  
**Errors Encountered**: **\_**  
**Critical Issues**: \***\*\*\*\*\*\*\***\_\_\_\***\*\*\*\*\*\*\***

### Quyết định

- [ ] ✅ **GO PRODUCTION** (All criteria PASS)
  - Action: Merge PR #27 → main
  - Deploy: Production shadow mode (AI_ROLLOUT_PERCENT=0)
  - Next: 1 week baseline collection

- [ ] ⚠️ **CONDITIONAL GO** (Most criteria PASS, minor tune needed)
  - Issue: \***\*\*\*\*\*\*\***\_\***\*\*\*\*\*\*\***
  - Fix: Adjust ANOMALY_THRESHOLD to \_\_\_
  - Retry: Run A/B test 3-5 more days

- [ ] ❌ **NO-GO ROLLBACK** (Multiple criteria FAIL)
  - Issues:
    1. ***
    2. ***
  - Action: Revert to rule-based only, debug, retrain
  - Timeline: \_\_ days để fix

### Ký duyệt

- **Reviewed by**: **\*\*\*\***\_\_\_**\*\*\*\*** (Date: \_\_/05)
- **Approved by**: **\*\*\*\***\_\_\_**\*\*\*\*** (Date: \_\_/05)
- **Deployed by**: **\*\*\*\***\_\_\_**\*\*\*\*** (Date: \_\_/05)

---

## 📞 Liên hệ Nếu Có Vấn đề

| Tình huống            | Action                                                                           |
| --------------------- | -------------------------------------------------------------------------------- |
| Worker crash liên tục | Restart: `docker compose restart signalops-worker`                               |
| MongoDB không respond | Check: `docker compose logs mongodb` → restart: `docker compose restart mongodb` |
| Precision quá thấp    | Increase ANOMALY_THRESHOLD từ 80 → 85 (khắt khe hơn)                             |
| Recall quá thấp       | Decrease ANOMALY_THRESHOLD từ 80 → 75 (nhạy hơn)                                 |
| Queue depth cao       | Check event rate: `docker compose logs worker`                                   |

---

**Bắt đầu**: 12/05 sáng  
**Kết thúc**: 14/05 trưa (tối đa 72h)  
**Status**: 🔄 In Progress
