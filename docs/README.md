# 📚 SignalOps Documentation

Tài liệu toàn diện cho dự án SignalOps: kiến trúc, hướng dẫn, triển khai, ML, và kiểm thử hiệu năng.

---

## 🗂️ Cấu trúc Tài liệu

Các tài liệu được tổ chức theo chức năng để dễ tìm kiếm:

### 🏗️ [architecture/](architecture/) — Kiến trúc & Thiết kế

Hiểu cách hệ thống hoạt động, các quyết định thiết kế, và cấu trúc dữ liệu.

- **[ARCHITECTURE.md](architecture/ARCHITECTURE.md)** — Tổng quan kiến trúc: components, luồng sự kiện, scaling
- **[ADR.md](architecture/ADR.md)** — 11 Architecture Decision Records: Outbox, Circuit Breaker, AsyncLocal, v.v.
- **[schema.md](architecture/schema.md)** — MongoDB collections, indexes, queries

👉 **Dùng khi**: Phát triển tính năng mới, debug vấn đề hệ thống, hiểu design pattern

---

### 📖 [guides/](guides/) — Hướng dẫn & Tham khảo

Hướng dẫn sử dụng API, xác thực, vận hành, và quy trình đóng góp.

- **[API.md](guides/API.md)** — Tham khảo API đầy đủ: endpoints, request/response, WebSocket events
- **[AUTH.md](guides/AUTH.md)** — Xác thực & phép cấp: JWT, API Key, role-based access
- **[OPERATIONS.md](guides/OPERATIONS.md)** — Vận hành: monitoring, logging, troubleshooting
- **[CONTRIBUTING.md](guides/CONTRIBUTING.md)** — Quy trình đóng góp: git workflow, code review

👉 **Dùng khi**: Dùng API, vận hành hệ thống, muốn đóng góp code

---

### 🚀 [deployment/](deployment/) — Triển khai & CI/CD

Hướng dẫn triển khai, checklists, và kế hoạch rollout.

#### 📋 [checklists/](deployment/checklists/) — Danh sách Kiểm tra

- **[STAGING-MONITORING-CHECKLIST.md](deployment/checklists/STAGING-MONITORING-CHECKLIST.md)** — Kiểm tra hàng ngày (48-72h staging test)
- **[PRODUCTION-READY-CHECKLIST.md](deployment/checklists/PRODUCTION-READY-CHECKLIST.md)** — Chuẩn bị pre-deployment (2-3h)

#### 📋 [plans/](deployment/plans/) — Kế hoạch Rollout

- **[STAGING-AB-REPORT.md](deployment/plans/STAGING-AB-REPORT.md)** — A/B test staging: metrics, quyết định
- **[PRODUCTION-SHADOW-MODE-DEPLOYMENT.md](deployment/plans/PRODUCTION-SHADOW-MODE-DEPLOYMENT.md)** — Giai đoạn 1: shadow mode (AI scoring, không alert)
- **[PRODUCTION-ROLLOUT-PLAN.md](deployment/plans/PRODUCTION-ROLLOUT-PLAN.md)** — Giai đoạn 2-5: từ 5% → 100%

#### 📄 Các file chính

- **[DEPLOYMENT.md](deployment/DEPLOYMENT.md)** — Hướng dẫn triển khai: local, staging, production
- **[CI_CD_STRATEGY.md](deployment/CI_CD_STRATEGY.md)** — Jenkins pipeline: stages, rollback
- **[ARCHIVE_STRATEGY.md](deployment/ARCHIVE_STRATEGY.md)** — Chiến lược lưu trữ: TTL, backup, retention

👉 **Dùng khi**: Triển khai, kiểm tra checklist, follow kế hoạch rollout, vận hành CI/CD

---

### 🤖 [ml/](ml/) — Machine Learning

Mô hình ML, training pipeline, tích hợp, và đánh giá.

- **[ML-TRAINING.md](ml/ML-TRAINING.md)** — Training pipeline: dữ liệu, feature engineering, RandomForest
- **[ML-MODEL-INTEGRATION.md](ml/ML-MODEL-INTEGRATION.md)** — Tích hợp ONNX: inference, fallback, A/B test
- **[AI-EVALUATION.md](ml/AI-EVALUATION.md)** — Đánh giá model: precision/recall, threshold tuning
- **[SCALE_EVALUATION.md](ml/SCALE_EVALUATION.md)** — Mở rộng quy mô: hiệu suất, latency

👉 **Dùng khi**: Training model, integrate ML, đánh giá accuracy, optimize performance

---

### ⚡ [performance/](performance/) — Kiểm thử Hiệu năng

Performance testing, load testing, optimization.

- **[PERFORMANCE_TESTING.md](performance/PERFORMANCE_TESTING.md)** — Performance testing plan: load test, baseline, metrics

👉 **Dùng khi**: Kiểm thử hiệu năng, identify bottlenecks, benchmark baseline

---

### 🔒 [internal/](internal/) — Nội bộ

Nội bộ: backlog, checklist triển khai, milestones M1-M13.

- **BACKLOG.md** — Danh sách tính năng tương lai
- **IMPLEMENTATION_CHECKLIST.md** — Checklist phát triển
- **milestones/** — M1-M13 progress tracking

---

## 🎯 Quick Start by Role

### 👨‍💻 Developer

1. Đọc: [architecture/ARCHITECTURE.md](architecture/ARCHITECTURE.md) — Hiểu cấu trúc
2. Đọc: [guides/CONTRIBUTING.md](guides/CONTRIBUTING.md) — Quy trình đóng góp
3. Tham khảo: [guides/API.md](guides/API.md) — API endpoints
4. Tham khảo: [architecture/schema.md](architecture/schema.md) — Cấu trúc dữ liệu

### 🛠️ DevOps / Operations

1. Đọc: [deployment/DEPLOYMENT.md](deployment/DEPLOYMENT.md) — Triển khai
2. Dùng: [deployment/checklists/](deployment/checklists/) — Checklists
3. Đọc: [guides/OPERATIONS.md](guides/OPERATIONS.md) — Vận hành & monitoring
4. Tham khảo: [deployment/CI_CD_STRATEGY.md](deployment/CI_CD_STRATEGY.md) — CI/CD

### 🧠 ML Engineer

1. Đọc: [ml/ML-TRAINING.md](ml/ML-TRAINING.md) — Training pipeline
2. Đọc: [ml/ML-MODEL-INTEGRATION.md](ml/ML-MODEL-INTEGRATION.md) — Tích hợp
3. Đọc: [ml/AI-EVALUATION.md](ml/AI-EVALUATION.md) — Đánh giá
4. Tham khảo: [ml/SCALE_EVALUATION.md](ml/SCALE_EVALUATION.md) — Optimization

### 📊 Project Manager

1. Đọc: [deployment/plans/](deployment/plans/) — Kế hoạch rollout M13
2. Dùng: [deployment/checklists/](deployment/checklists/) — Progress tracking
3. Tham khảo: [internal/BACKLOG.md](internal/BACKLOG.md) — Nội bộ

---

## 📋 M13 Timeline (AI Anomaly Detection)

```
12-14/05: Staging A/B Test (48-72h)
└─ Dùng: deployment/plans/STAGING-AB-REPORT.md
└─ Checklist: deployment/checklists/STAGING-MONITORING-CHECKLIST.md

14/05 trưa: Decision Gate (PASS/FAIL)

14-21/05: Production Shadow Mode (Giai đoạn 1)
└─ Dùng: deployment/plans/PRODUCTION-SHADOW-MODE-DEPLOYMENT.md

21/05+: Gradual Rollout (Giai đoạn 2-5: 5% → 100%)
└─ Dùng: deployment/plans/PRODUCTION-ROLLOUT-PLAN.md
```

---

## 🔗 Liên kết Hữu ích

| Mục                  | Link                                             |
| -------------------- | ------------------------------------------------ |
| **Cấu trúc Project** | [Root README.md](../README.md)                   |
| **Quick Start**      | [QUICKSTART.md](../QUICKSTART.md)                |
| **License**          | [LICENSE](../LICENSE)                            |
| **Contributing**     | [guides/CONTRIBUTING.md](guides/CONTRIBUTING.md) |

---

## 💡 Tips

- ✅ Mỗi thư mục có `README.md` giải thích mục đích
- ✅ Dùng Ctrl+Shift+P (VS Code) → "Markdown: Open Preview" để xem định dạng
- ✅ Tất cả file đã dịch sang tiếng Việt (giữ nguyên thuật ngữ chuyên ngành)
- ✅ Code examples, commands, JSON blocks giữ nguyên tiếng Anh

---

**Cập nhật**: 12/05/2026  
**Trạng thái**: ✅ Toàn diện & sẵn sàng
