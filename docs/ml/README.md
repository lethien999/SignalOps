# 🤖 Machine Learning

Tài liệu về mô hình ML, training, tích hợp, và đánh giá.

## Các file trong mục này

| File                                               | Mô tả                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| [ML-TRAINING.md](ML-TRAINING.md)                   | Training pipeline: dữ liệu, feature engineering, model (RandomForest) |
| [ML-MODEL-INTEGRATION.md](ML-MODEL-INTEGRATION.md) | Tích hợp ONNX vào worker: inference, fallback, A/B test               |
| [AI-EVALUATION.md](AI-EVALUATION.md)               | Đánh giá model: precision/recall, tuning threshold, A/B test staging  |
| [SCALE_EVALUATION.md](SCALE_EVALUATION.md)         | Mở rộng quy mô: hiệu suất model, latency, throughput                  |

## Khi nào dùng?

- **Training mô hình mới**: → Đọc ML-TRAINING.md
- **Tích hợp model vào hệ thống**: → Đọc ML-MODEL-INTEGRATION.md
- **Đánh giá độ chính xác model**: → Đọc AI-EVALUATION.md
- **Tối ưu hiệu suất**: → Đọc SCALE_EVALUATION.md

## M13 Status

| Task                             | Status                                       |
| -------------------------------- | -------------------------------------------- |
| Training dataset (29,305 events) | ✅ Complete                                  |
| RandomForest model               | ✅ Trained (Precision 89.19%, Recall 91.67%) |
| ONNX conversion                  | ✅ Cross-platform format                     |
| Worker integration               | ✅ Inference + fallback                      |
| Threshold tuning                 | ✅ Optimal: 80 (F1 90.41)                    |
| Staging A/B test                 | 🔄 In progress (12-14/05)                    |
| Production shadow                | 📋 Ready (after staging PASS)                |
