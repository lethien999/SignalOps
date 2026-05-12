# M13: Đường ống Huấn luyện Machine Learning

## Tổng quan

Hướng dẫn này bao gồm chuẩn bị dữ liệu lịch sử cho huấn luyện mô hình machine learning và triển khai phát hiện dị thường dựa trên ML để thay thế/bổ sung cho điểm tính xác định hiện tại.

---

## Giai đoạn 1: Chuẩn bị Dữ liệu Huấn luyện

### Chuẩn hóa Dữ liệu

Tất cả các chỉ số được chuẩn hóa thành phạm vi 0-1 cho huấn luyện ML:

| Chỉ số | Tỷ lệ | Phạm vi Chuẩn hóa |
|--------|--------|------------------|
| Độ trễ | 0-500ms | 0.0 (hoàn hảo) đến 1.0 (xấu nhất) |
| Mất gói | 0-20% | 0.0 (hoàn hảo) đến 1.0 (xấu nhất) |
| Độ mạnh tín hiệu | -40 đến -120 dBm | 0.0 (tốt nhất) đến 1.0 (xấu nhất) |

**Hàm Chuẩn hóa** (trong `apps/worker-service/src/common/data-normalization.ts`):
```typescript
normalizeLatency(500) // = 1.0
normalizeLatency(250) // = 0.5
normalizeLatency(0)   // = 0.0

normalizePacketLoss(20) // = 1.0
normalizePacketLoss(10) // = 0.5

normalizeSignalStrength(-120) // = 1.0 (xấu nhất)
normalizeSignalStrength(-80)  // = 0.5
normalizeSignalStrength(-40)  // = 0.0 (tốt nhất)
```

### Trích xuất Tính năng

Tính năng được trích xuất cho mỗi sự kiện:

**Chỉ số Chuẩn hóa:**
- `latency_norm`: 0-1 (chuẩn hóa độ trễ)
- `packetLoss_norm`: 0-1 (chuẩn hóa mất gói)
- `signalStrength_norm`: 0-1 (chuẩn hóa độ mạnh tín hiệu)
- `overall_quality`: 0-1 (nghịch đảo của suy giảm trung bình)

**Tính năng Dựa trên Thời gian:**
- `hour_of_day`: 0-23 (dị thường có thể khác nhau theo thời gian)
- `day_of_week`: 0-6 (mẫu khác nhau vào ngày làm việc so với cuối tuần)

**Tính năng Phát hiện Thay đổi** (tùy chọn, được tính toán từ ngữ cảnh):
- `metric_volatility`: Độ lệch chuẩn của các chỉ số gần đây
- `change_magnitude`: Thay đổi tuyệt đối giữa các sự kiện liên tiếp

**Nhãn:**
- `anomalous`: 0 (bình thường, không có cảnh báo) hoặc 1 (dị thường, tạo cảnh báo)

### Tạo Bộ dữ liệu Huấn luyện

#### Bước 1: Tạo CSV từ Dữ liệu Lịch sử

```bash
# Tạo 30 ngày dữ liệu huấn luyện (mặc định)
npm run gen:training-dataset

# Tạo 60 ngày với output tùy chỉnh
DATASET_DAYS=60 OUTPUT_FILE=dataset-60d.csv npm run gen:training-dataset

# Tạo với cửa sổ cụ thể cho tính toán volatility
DATASET_DAYS=30 CONTEXT_WINDOW=10 npm run gen:training-dataset
```

#### Đầu ra Mong đợi

```
📊 Tạo Bộ dữ liệu Huấn luyện M13
   Giai đoạn: 30 ngày vừa qua
   Đầu ra: training-dataset.csv
   Cửa sổ ngữ cảnh: 5 sự kiện
-----------------------------------

Đang tìm nạp sự kiện từ 2026-04-11T10:30:00Z đến hiện tại...
✓ Đã tìm nạp 4250 sự kiện
Đang tìm nạp cảnh báo...
✓ Đã tìm nạp 450 cảnh báo (425 sự kiện duy nhất)

Trích xuất tính năng...
  Đã xử lý 100/4250 sự kiện...
  Đã xử lý 200/4250 sự kiện...
✓ Đã trích xuất tính năng từ 4250 sự kiện

Thống kê Bộ dữ liệu:
  Sự kiện bình thường: 3825 (90.0%)
  Sự kiện dị thường: 425 (10.0%)
  Tỷ lệ mất cân bằng lớp: 1:9.0

Xuất sang CSV...
✓ Bộ dữ liệu được xuất sang: training-dataset.csv
  Kích thước file: 512.3 KB
  Tổng mẫu: 4250

Sẵn sàng cho huấn luyện ML với 4250 mẫu
```

#### Định dạng CSV

```csv
eventId,deviceId,timestamp,latency_norm,packetLoss_norm,signalStrength_norm,overall_quality,hour_of_day,day_of_week,anomalous
550e8400-e29b-41d4-a716-446655440000,device-001,2026-04-11T10:30:00Z,0.2100,0.1500,0.3200,0.8388,10,1,0
550e8400-e29b-41d4-a716-446655440001,device-002,2026-04-11T10:31:00Z,0.8900,0.7500,0.9100,0.1167,10,1,1
...
```

---

## Giai đoạn 2: Huấn luyện Mô hình ML

### Các Cách tiếp cận Được khuyến nghị

#### Tùy chọn A: Scikit-Learn (Khởi động nhanh)

Tùy chọn Python đơn giản, được bao gồm đầy đủ để kiểm thử:

```bash
# Tạo môi trường ảo
python -m venv venv
source venv/bin/activate  # hoặc venv\Scripts\activate trên Windows

# Cài đặt phụ thuộc
pip install scikit-learn pandas numpy

# Tạo kịch bản huấn luyện: scripts/train-model.py
```

**Kịch bản Huấn luyện** (`scripts/train-model.py`):

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# Tải dữ liệu huấn luyện
df = pd.read_csv('training-dataset.csv')
X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm', 'overall_quality', 'hour_of_day', 'day_of_week']]
y = df['anomalous']

# Chia dữ liệu (80/20 train/test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Huấn luyện mô hình
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight='balanced'  # Xử lý dữ liệu mất cân bằng
)
model.fit(X_train, y_train)

# Đánh giá
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
print("Ma trận Nhầm lẫn:")
print(confusion_matrix(y_test, y_pred))

# Lưu mô hình
joblib.dump(model, 'anomaly-model.pkl')
print("Mô hình được lưu vào anomaly-model.pkl")
```

#### Tùy chọn B: TensorFlow/Keras (Nâng cao)

Cách tiếp cận mạng nơ-ron để có độ chính xác tốt hơn:

```python
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from tensorflow.keras import Sequential
from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
from tensorflow.keras.optimizers import Adam

df = pd.read_csv('training-dataset.csv')
X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm', 'overall_quality', 'hour_of_day', 'day_of_week']].values
y = df['anomalous'].values

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Xây dựng mạng nơ-ron
model = Sequential([
    Dense(64, activation='relu', input_shape=(X.shape[1],)),
    BatchNormalization(),
    Dropout(0.3),
    Dense(32, activation='relu'),
    Dropout(0.2),
    Dense(1, activation='sigmoid')
])

model.compile(
    optimizer=Adam(learning_rate=0.001),
    loss='binary_crossentropy',
    metrics=['accuracy', 'precision', 'recall']
)

# Huấn luyện
model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=50,
    batch_size=32
)

# Lưu
model.save('anomaly-model.h5')
```

#### Tùy chọn C: XGBoost (Hiệu suất Tốt nhất)

Gradient boosting để có độ chính xác tốt nhất:

```bash
pip install xgboost
```

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier
from sklearn.metrics import classification_report
import joblib

df = pd.read_csv('training-dataset.csv')
X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm', 'overall_quality', 'hour_of_day', 'day_of_week']]
y = df['anomalous']

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

model = XGBClassifier(
    max_depth=5,
    learning_rate=0.1,
    n_estimators=100,
    scale_pos_weight=9  # Tỷ lệ mất cân bằng (bình thường:dị thường)
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

joblib.dump(model, 'anomaly-model-xgb.pkl')
```

### Tiêu chí Thành công Huấn luyện

Sau khi huấn luyện, đánh giá trên tập kiểm thử:

| Chỉ số | Mục tiêu | Mục đích |
|--------|---------|---------|
| **Precision (Độ chính xác)** | ≥ 80% | Giảm thiểu cảnh báo giả |
| **Recall (Tái tìm kiếm)** | ≥ 75% | Bắt được hầu hết dị thường |
| **F1 Score** | ≥ 77 | Hiệu suất cân bằng |
| **ROC-AUC** | ≥ 0.85 | Khả năng phân biệt |

**Ví dụ Đầu ra:**
```
              precision    recall  f1-score   support

           0       0.92      0.88      0.90       765
           1       0.78      0.84      0.81       170

    accuracy                           0.88       935
   macro avg       0.85      0.86      0.85       935
weighted avg       0.88      0.88      0.88       935
```

---

## Giai đoạn 3: Tích hợp Mô hình ML vào Worker

### Tùy chọn A: Tải Mô hình Được huấn luyện trước (Được khuyến nghị cho MVP)

Cập nhật `apps/worker-service/src/services/anomaly-scoring.ts`:

```typescript
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-node'; // hoặc joblib tương đương

let mlModel: any = null;

/**
 * Tải mô hình ML tại khởi động
 */
export async function initMLModel() {
  try {
    // Tùy chọn 1: TensorFlow
    mlModel = await tf.loadLayersModel('file://./anomaly-model.h5');
    
    // Tùy chọn 2: ONNX
    // mlModel = await ort.InferenceSession.create('./anomaly-model.onnx');
    
    console.log('✓ Mô hình ML được tải');
  } catch (error) {
    console.error('Không thể tải mô hình ML, dùng điểm tính xác định:', error);
    mlModel = null;
  }
}

/**
 * Điểm tính sử dụng mô hình ML nếu có sẵn, fallback thành xác định
 */
export function scoreEventAnomaly(
  metrics: { latency: number; packetLoss: number; signalStrength: number },
  thresholdProfile?: any,
) {
  if (mlModel) {
    return scoreWithMLModel(metrics);
  } else {
    return scoreWithDeterministic(metrics, thresholdProfile);
  }
}

function scoreWithMLModel(metrics: any) {
  // Chuẩn hóa tính năng đầu vào
  const features = normalizeMetricsForML(metrics);
  
  // Chạy suy diễn
  const input = tf.tensor2d([
    [
      features.latency_norm,
      features.packetLoss_norm,
      features.signalStrength_norm,
      features.overall_quality,
      new Date().getHours(),
      new Date().getDay(),
    ],
  ]);

  const prediction = mlModel.predict(input) as any;
  const anomalyConfidence = (prediction.data()[0] * 100).toFixed(0);
  
  input.dispose();
  prediction.dispose();

  return {
    score: Math.round(anomalyConfidence),
    anomalyConfidence: Math.round(anomalyConfidence),
    label: anomalyConfidence > 65 ? 'anomalous' : 'normal',
    reason: `Độ tin cậy mô hình ML: ${anomalyConfidence}%`,
  };
}
```

### Tùy chọn B: Dịch vụ ML Cloud (Production)

Triển khai mô hình cho dịch vụ cloud:

```typescript
import axios from 'axios';

const ML_ENDPOINT = process.env.ML_SERVICE_ENDPOINT || 'https://ml-service.example.com/predict';

export async function scoreEventAnomaly(metrics: any) {
  try {
    const features = normalizeMetricsForML(metrics);
    
    const response = await axios.post(ML_ENDPOINT, {
      features: [
        features.latency_norm,
        features.packetLoss_norm,
        features.signalStrength_norm,
        features.overall_quality,
        new Date().getHours(),
        new Date().getDay(),
      ],
    });

    const { anomalyScore, confidence } = response.data;
    
    return {
      score: anomalyScore,
      anomalyConfidence: confidence,
      label: confidence > 65 ? 'anomalous' : 'normal',
      reason: `Suy diễn ML: ${confidence}% độ tin cậy`,
    };
  } catch (error) {
    // Fallback thành xác định
    return scoreWithDeterministic(metrics);
  }
}
```

---

## Giai đoạn 4: Cải thiện Liên tục

### Giám sát Hiệu suất Mô hình

Theo dõi metrics trong production:

```typescript
// Ghi lại độ chính xác dự đoán để đánh giá mô hình
function logPredictionForEvaluation(event: any, prediction: any, actualAlert: boolean) {
  const timestamp = new Date().toISOString();
  const correct = (prediction.score > 65) === actualAlert ? 1 : 0;
  
  // Ghi cho phân tích sau
  fs.appendFileSync('ml-predictions.jsonl', 
    JSON.stringify({
      timestamp,
      eventId: event._id,
      mlScore: prediction.score,
      actualAlert,
      correct,
    }) + '\n'
  );
}
```

### Huấn luyện lại Định kỳ

Chạy huấn luyện lại hàng tháng:

```bash
# Tạo dữ liệu huấn luyện mới
DATASET_DAYS=90 npm run gen:training-dataset

# Chạy đường ống huấn luyện
python scripts/train-model.py

# Đánh giá trên dữ liệu tháng hiện tại
npm run eval:ai

# Nếu metrics cải thiện, triển khai mô hình mới
```

---

## Tham chiếu File

| File | Mục đích |
|------|---------|
| `apps/worker-service/src/common/data-normalization.ts` | Tiện ích chuẩn hóa chỉ số |
| `apps/worker-service/src/common/feature-extraction.ts` | Trích xuất tính năng cho ML |
| `scripts/gen-training-dataset.mjs` | Tạo dữ liệu huấn luyện CSV |
| `scripts/train-model.py` | Huấn luyện mô hình ML (để tạo) |
| `apps/worker-service/src/services/anomaly-scoring.ts` | Điểm tích hợp cho mô hình ML |

---

## Khắc phục Sự cố

### Bộ dữ liệu huấn luyện mất cân bằng (quá ít dị thường)

**Vấn đề**: Tỷ lệ mất cân bằng lớp > 1:20 khiến huấn luyện khó

**Giải pháp**:
- Dùng `class_weight='balanced'` trong scikit-learn
- Dùng `scale_pos_weight` trong XGBoost
- Cân nhắc oversampling dị thường hoặc undersampling sự kiện bình thường
- Dùng stratified k-fold cross-validation

### Hiệu suất mô hình trên tập kiểm thử khác với huấn luyện

**Vấn đề**: Overfitting hoặc data drift

**Giải pháp**:
- Giảm độ phức tạp mô hình (tính năng ít hơn, cây nhỏ hơn)
- Thêm regularization (L1/L2, dropout)
- Thu thập dữ liệu huấn luyện gần đây hơn
- Xác thực trên các thời kỳ khác nhau

### Dự đoán mô hình ML có chất lượng kém

**Vấn đề**: Mô hình không nắm bắt được mẫu

**Giải pháp**:
- Kiểm tra phân phối tính năng (đảm bảo không bị lệch)
- Thử các thuật toán khác (Random Forest → XGBoost → Neural Networks)
- Thêm nhiều tính năng hơn (volatility, time-based interactions)
- Thu thập dữ liệu huấn luyện đa dạng hơn
- Điều chỉnh siêu tham số via grid search

---

## Các Bước Tiếp theo

1. ✅ Tạo chuẩn hóa dữ liệu & trích xuất tính năng (commit này)
2. ⏳ Tạo bộ dữ liệu huấn luyện: `npm run gen:training-dataset`
3. ⏳ Huấn luyện mô hình ML (chọn scikit-learn, TensorFlow, hoặc XGBoost)
4. ⏳ Tích hợp vào dịch vụ worker
5. ⏳ A/B test ML vs xác định trong staging
6. ⏳ Triển khai tới production với giám sát

---

**Cập nhật**: 11/05/2026  
**Trạng thái**: Cơ sở hạ tầng Giai đoạn 1 sẵn sàng (chuẩn hóa dữ liệu + trích xuất tính năng)
