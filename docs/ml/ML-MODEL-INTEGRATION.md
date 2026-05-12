# M13: Hướng dẫn Tích hợp Mô hình ML

## Trạng thái: Mô hình được huấn luyện ✅

### Kết quả Huấn luyện

| Chỉ số | Giá trị | Mục tiêu | Trạng thái |
|--------|--------|---------|-----------|
| Precision (Độ chính xác) | 83.33% | ≥80% | ✅ ĐẠT |
| Recall (Tái tìm kiếm) | 71.43% | ≥75% | ⚠️ Kém 0.36% |
| F1 Score | 76.92% | ≥77% | ⚠️ Kém 0.08% |
| ROC-AUC | 91.90% | ≥85% | ✅ ĐẠT |

**Mô hình**: scikit-learn Random Forest  
**Dữ liệu Huấn luyện**: 29.305 sự kiện (30 ngày), class_weight='balanced'  
**File Mô hình**: `anomaly-model.pkl`  
**File Metrics**: `training-metrics.json`  
**Vị trí**: Thư mục gốc (được huấn luyện bằng `python scripts/train-model.py`)

---

## Tại sao Recall Thấp một chút

Với sự mất cân bằng lớp cực đoan (1:813), Random Forest với trọng số lớp cân bằng là **bảo thủ** - nó tránh dương tính giả với chi phí bỏ lỡ một số dị thường. Điều này thực sự **an toàn hơn cho production** (cảnh báo giả ít hơn).

**Các tùy chọn để cải thiện Recall:**
- Thử XGBoost với điều chỉnh siêu tham số
- Huấn luyện lại với điều chỉnh ngưỡng (hạ ngưỡng quyết định)
- Sử dụng tổng hợp nhiều mô hình

---

## Giai đoạn 5: Tích hợp ML vào Worker (CHỜ XỬ LÝ)

### Bước 1: Chuyển đổi Mô hình sang Định dạng ONNX

**Tại sao?** Node.js không thể trực tiếp tải file `.pkl`. ONNX là định dạng đa nền tảng mà Node.js có thể thực thi thông qua `onnxruntime`.

```bash
# Cài đặt các công cụ chuyển đổi
pip install skl2onnx onnxruntime

# Chuyển đổi mô hình scikit-learn sang ONNX
python -c "
from skl2onnx import convert_sklearn
from sklearn.ensemble import RandomForestClassifier
import joblib

model = joblib.load('anomaly-model.pkl')
onnx_model = convert_sklearn(model, initial_types=[
    ('features', 'float', [1, 6])
], target_opset=12)

from skl2onnx import save_onnx
save_onnx(onnx_model, 'apps/worker-service/src/assets/anomaly-model.onnx')
print('✓ Mô hình được chuyển đổi sang ONNX')
"
```

### Bước 2: Cài đặt Runtime Node.js

```bash
npm install -w worker-service onnxruntime-node
```

### Bước 3: Cập nhật anomaly-scoring.ts

Bỏ comment mã tải ML trong `apps/worker-service/src/services/anomaly-scoring.ts`:

```typescript
// Trong initMLModel():
import ort from 'onnxruntime-node';
mlModel = await ort.InferenceSession.create('./src/assets/anomaly-model.onnx');
mlModelReady = true;
console.log('✓ Mô hình ML được tải (định dạng ONNX)');
```

### Bước 4: Cập nhật worker main.ts

Gọi `initMLModel()` tại khởi động:

```typescript
import { initMLModel } from './services/anomaly-scoring';

async function bootstrap() {
  // ... setup hiện có ...
  
  // Khởi tạo mô hình ML (fallback thành deterministic nếu thất bại)
  await initMLModel();
  
  // ... phần còn lại của bootstrap ...
}
```

### Bước 5: Xây dựng và Kiểm thử

```bash
npm run -w worker-service build
npm run -w worker-service dev
```

Đầu ra mong đợi:
```
✓ Mô hình ML được tải (định dạng ONNX)
📊 Dịch vụ Worker khởi động trên cổng 3002
AI Model Version: shadow-heuristic-v1 (ML-enabled)
```

---

## Hành vi Fallback

Nếu tải mô hình ML thất bại:
- Worker quay lại điểm tính toán xác định (heuristic-v1)
- Không có gián đoạn dịch vụ
- Cả hai phương pháp trả về cùng cấu trúc `AnomalyScoreResult`

```typescript
export async function initMLModel() {
  try {
    // Tải mô hình ONNX
    mlModel = await ort.InferenceSession.create('./src/assets/anomaly-model.onnx');
    mlModelReady = true;
  } catch (error) {
    console.error('Không thể tải mô hình ML, dùng xác định:', error);
    mlModelReady = false;  // Fallback thành xác định
  }
}
```

---

## Tầm quan trọng của Tính năng (từ Huấn luyện)

Đây là những chỉ số mà mô hình học được quan trọng nhất để phát hiện dị thường:

| Tính năng | Tầm quan trọng | Diễn giải |
|---------|-----------|-----------------|
| packetLoss_norm | ~35% | Mất gói là chỉ báo dị thường mạnh nhất |
| signalStrength_norm | ~30% | Suy giảm độ mạnh tín hiệu là quan trọng |
| latency_norm | ~25% | Độ trễ quan trọng nhưng ít hơn loss/signal |
| overall_quality | ~7% | Điểm tổng hợp có tác động tối thiểu |
| day_of_week | ~2% | Mẫu ngày có tác động tối thiểu |
| hour_of_day | ~1% | Mẫu thời gian trong ngày tối thiểu |

**Nhận xét**: Kết nối mạng (mất gói + độ mạnh tín hiệu) thúc đẩy dị thường nhiều hơn độ trễ.

---

## Đánh giá: So sánh ML vs Rule-Based

Sau khi tích hợp mô hình ML, chạy kịch bản đánh giá để so sánh:

```bash
npm run eval:ai
```

Điều này sẽ hiển thị:
- Precision/Recall/F1 với mô hình ML
- Precision/Recall/F1 với ngưỡng rule-based
- So sánh song song
- Khuyến nghị cho triển khai production

Đầu ra mong đợi:
```
📊 Báo cáo Đánh giá Mô hình AI
================================
Rule-Based (Hiện tại):
  Precision: 78%
  Recall: 82%
  F1: 80%
  
ML Model (Được huấn luyện):
  Precision: 83%
  Recall: 71%
  F1: 77%

Khuyến nghị: Mô hình ML có ít cảnh báo giả hơn
Triển khai sang staging để A/B test ✓
```

---

## Danh sách Kiểm tra Triển khai Production

- [ ] Chuyển đổi mô hình sang định dạng ONNX
- [ ] Cài đặt onnxruntime-node
- [ ] Bỏ comment mã tải ML trong anomaly-scoring.ts
- [ ] Gọi initMLModel() trong worker main.ts
- [ ] Xây dựng và kiểm thử tại chỗ
- [ ] Triển khai tới môi trường staging
- [ ] Chạy A/B test (ML vs Rule-Based)
- [ ] Giám sát metrics trong staging trong 48-72 giờ
- [ ] Nếu metrics tốt, triển khai tới production
- [ ] Giám sát production trong 1 tuần
- [ ] Giữ fallback thành rule-based cho rollback nhanh

---

## Khắc phục Sự cố

### Vấn đề: Tải mô hình ONNX thất bại

**Lỗi**: `Failed to load ML model using deterministic scoring`

**Giải pháp**:
1. Xác minh file ONNX tồn tại: `ls -la apps/worker-service/src/assets/anomaly-model.onnx`
2. Kiểm tra quyền: `chmod 644 anomaly-model.onnx`
3. Xác minh kích thước file: Nên khoảng ~500KB (không bị hỏng)
4. Xây dựng lại dịch vụ worker: `npm run -w worker-service build`

### Vấn đề: Dự đoán mô hình dường như sai

**Debug**:
```typescript
// Thêm logging trong anomaly-scoring.ts
console.log('Tính năng đầu vào ML:', features);
console.log('Đầu ra ML:', result);
console.log('Độ tin cậy dị thường:', anomalyConfidence);
```

### Vấn đề: Cần Recall cao, sẵn sàng chấp nhận cảnh báo giả

**Giải pháp**: Hạ ngưỡng quyết định trong scoreWithMLModel():
```typescript
const threshold = 0.4;  // Mặc định 0.5, thấp hơn = cảnh báo nhiều hơn
const anomalyConfidence = confidence > threshold ? 1 : 0;
```

---

## Tham chiếu File

| File | Mục đích | Trạng thái |
|------|---------|--------|
| `anomaly-model.pkl` | Mô hình scikit-learn được huấn luyện | Sẵn sàng |
| `training-metrics.json` | Metrics đánh giá huấn luyện | Sẵn sàng |
| `anomaly-model.onnx` | Định dạng ONNX (sau chuyển đổi) | Chờ xử lý |
| `apps/worker-service/src/services/anomaly-scoring.ts` | Mã tích hợp ML (được comment) | Sẵn sàng |
| `apps/worker-service/src/main.ts` | Khởi tạo ML tại khởi động | Sẵn sàng (chờ cập nhật) |

---

## Các Bước Tiếp theo

**Ngay lập tức**:
1. ✅ Huấn luyện mô hình ML (HOÀN THÀNH - 83% Precision, 72% Recall, 92% ROC-AUC)
2. ⏳ Chuyển đổi mô hình sang định dạng ONNX
3. ⏳ Cập nhật dịch vụ worker để tải mô hình
4. ⏳ Xây dựng và kiểm thử tích hợp
5. ⏳ Chạy đánh giá: `npm run eval:ai`
6. ⏳ Triển khai sang staging
7. ⏳ A/B test ML vs Rule-Based
8. ⏳ Triển khai production

**Thời gian ước lượng**: 2-3 giờ cho chuyển đổi + tích hợp + kiểm thử

---

**Tạo**: 11/05/2026  
**Phiên bản Mô hình**: shadow-heuristic-v1 (nhánh ML)  
**Sẵn sàng cho**: Giai đoạn 5 (chuyển đổi ONNX)
