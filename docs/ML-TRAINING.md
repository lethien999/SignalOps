# M13: Machine Learning Training Pipeline

## Overview

This guide covers preparing historical data for machine learning model training and implementing ML-based anomaly detection to replace/complement the current deterministic scoring.

---

## Phase 1: Training Data Preparation

### Data Normalization

All metrics are normalized to 0-1 range for ML training:

| Metric | Scale | Normalized Range |
|--------|-------|------------------|
| Latency | 0-500ms | 0.0 (perfect) to 1.0 (worst) |
| Packet Loss | 0-20% | 0.0 (perfect) to 1.0 (worst) |
| Signal Strength | -40 to -120 dBm | 0.0 (best) to 1.0 (worst) |

**Normalization Functions** (in `apps/worker-service/src/common/data-normalization.ts`):
```typescript
normalizeLatency(500) // = 1.0
normalizeLatency(250) // = 0.5
normalizeLatency(0)   // = 0.0

normalizePacketLoss(20) // = 1.0
normalizePacketLoss(10) // = 0.5

normalizeSignalStrength(-120) // = 1.0 (worst)
normalizeSignalStrength(-80)  // = 0.5
normalizeSignalStrength(-40)  // = 0.0 (best)
```

### Feature Extraction

Features extracted for each event:

**Normalized Metrics:**
- `latency_norm`: 0-1 (latency normalization)
- `packetLoss_norm`: 0-1 (packet loss normalization)
- `signalStrength_norm`: 0-1 (signal strength normalization)
- `overall_quality`: 0-1 (inverse of average degradation)

**Time-Based Features:**
- `hour_of_day`: 0-23 (anomalies may vary by time)
- `day_of_week`: 0-6 (different patterns on weekdays vs weekends)

**Change Detection Features** (optional, computed from context):
- `metric_volatility`: Standard deviation of recent metrics
- `change_magnitude`: Absolute change between consecutive events

**Label:**
- `anomalous`: 0 (normal, no alert) or 1 (anomalous, alert created)

### Generate Training Dataset

#### Step 1: Generate CSV from Historical Data

```bash
# Generate 30 days of training data (default)
npm run gen:training-dataset

# Generate 60 days with custom output
DATASET_DAYS=60 OUTPUT_FILE=dataset-60d.csv npm run gen:training-dataset

# Generate with specific window for volatility calculation
DATASET_DAYS=30 CONTEXT_WINDOW=10 npm run gen:training-dataset
```

#### Expected Output

```
📊 M13 Training Dataset Generation
   Period: Last 30 days
   Output: training-dataset.csv
   Context window: 5 events
-----------------------------------

Fetching events from 2026-04-11T10:30:00Z to now...
✓ Fetched 4250 events
Fetching alerts...
✓ Fetched 450 alerts (425 unique events)

Extracting features...
  Processed 100/4250 events...
  Processed 200/4250 events...
✓ Extracted features from 4250 events

Dataset Statistics:
  Normal events: 3825 (90.0%)
  Anomalous events: 425 (10.0%)
  Class imbalance ratio: 1:9.0

Exporting to CSV...
✓ Dataset exported to: training-dataset.csv
  File size: 512.3 KB
  Total samples: 4250

Ready for ML training with 4250 samples
```

#### CSV Format

```csv
eventId,deviceId,timestamp,latency_norm,packetLoss_norm,signalStrength_norm,overall_quality,hour_of_day,day_of_week,anomalous
550e8400-e29b-41d4-a716-446655440000,device-001,2026-04-11T10:30:00Z,0.2100,0.1500,0.3200,0.8388,10,1,0
550e8400-e29b-41d4-a716-446655440001,device-002,2026-04-11T10:31:00Z,0.8900,0.7500,0.9100,0.1167,10,1,1
...
```

---

## Phase 2: Train ML Model

### Recommended Approaches

#### Option A: Scikit-Learn (Quickstart)

Simple, battery-included Python option for testing:

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows

# Install dependencies
pip install scikit-learn pandas numpy

# Create training script: scripts/train-model.py
```

**Training Script** (`scripts/train-model.py`):

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix
import joblib

# Load training data
df = pd.read_csv('training-dataset.csv')
X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm', 'overall_quality', 'hour_of_day', 'day_of_week']]
y = df['anomalous']

# Split data (80/20 train/test)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier(
    n_estimators=100,
    max_depth=10,
    random_state=42,
    class_weight='balanced'  # Handle imbalanced data
)
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))
print("Confusion Matrix:")
print(confusion_matrix(y_test, y_pred))

# Save model
joblib.dump(model, 'anomaly-model.pkl')
print("Model saved to anomaly-model.pkl")
```

#### Option B: TensorFlow/Keras (Advanced)

Neural network approach for better accuracy:

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

# Build neural network
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

# Train
model.fit(
    X_train, y_train,
    validation_data=(X_test, y_test),
    epochs=50,
    batch_size=32
)

# Save
model.save('anomaly-model.h5')
```

#### Option C: XGBoost (Best Performance)

Gradient boosting for best accuracy:

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
    scale_pos_weight=9  # Imbalance ratio (normal:anomalous)
)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print(classification_report(y_test, y_pred))

joblib.dump(model, 'anomaly-model-xgb.pkl')
```

### Training Success Criteria

After training, evaluate on test set:

| Metric | Target | Purpose |
|--------|--------|---------|
| **Precision** | ≥ 80% | Minimize false alarms |
| **Recall** | ≥ 75% | Catch most anomalies |
| **F1 Score** | ≥ 77 | Balanced performance |
| **ROC-AUC** | ≥ 0.85 | Discrimination ability |

**Example Output:**
```
              precision    recall  f1-score   support

           0       0.92      0.88      0.90       765
           1       0.78      0.84      0.81       170

    accuracy                           0.88       935
   macro avg       0.85      0.86      0.85       935
weighted avg       0.88      0.88      0.88       935
```

---

## Phase 3: Integrate ML Model into Worker

### Option A: Load Pre-trained Model (Recommended for MVP)

Update `apps/worker-service/src/services/anomaly-scoring.ts`:

```typescript
import * as tf from '@tensorflow/tfjs';
import * as ort from 'onnxruntime-node'; // or joblib equivalent

let mlModel: any = null;

/**
 * Load ML model on startup
 */
export async function initMLModel() {
  try {
    // Option 1: TensorFlow
    mlModel = await tf.loadLayersModel('file://./anomaly-model.h5');
    
    // Option 2: ONNX
    // mlModel = await ort.InferenceSession.create('./anomaly-model.onnx');
    
    console.log('✓ ML model loaded');
  } catch (error) {
    console.error('Failed to load ML model, using deterministic scoring:', error);
    mlModel = null;
  }
}

/**
 * Score using ML model if available, fallback to deterministic
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
  // Normalize input features
  const features = normalizeMetricsForML(metrics);
  
  // Run inference
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
    reason: `ML model confidence: ${anomalyConfidence}%`,
  };
}
```

### Option B: Cloud ML Service (Production)

Deploy model to cloud service:

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
      reason: `ML inference: ${confidence}% confidence`,
    };
  } catch (error) {
    // Fallback to deterministic
    return scoreWithDeterministic(metrics);
  }
}
```

---

## Phase 4: Continuous Improvement

### Monitor Model Performance

Track metrics in production:

```typescript
// Log prediction accuracy for model evaluation
function logPredictionForEvaluation(event: any, prediction: any, actualAlert: boolean) {
  const timestamp = new Date().toISOString();
  const correct = (prediction.score > 65) === actualAlert ? 1 : 0;
  
  // Log for later analysis
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

### Retrain Periodically

Run monthly retraining:

```bash
# Generate fresh training data
DATASET_DAYS=90 npm run gen:training-dataset

# Run training pipeline
python scripts/train-model.py

# Evaluate on current month's data
npm run eval:ai

# If metrics improved, deploy new model
```

---

## File Reference

| File | Purpose |
|------|---------|
| `apps/worker-service/src/common/data-normalization.ts` | Metric normalization utilities |
| `apps/worker-service/src/common/feature-extraction.ts` | Feature extraction for ML |
| `scripts/gen-training-dataset.mjs` | Generate CSV training data |
| `scripts/train-model.py` | Train ML model (to create) |
| `apps/worker-service/src/services/anomaly-scoring.ts` | Integration point for ML model |

---

## Troubleshooting

### Training dataset is imbalanced (too few anomalies)

**Problem**: Class imbalance ratio > 1:20 makes training difficult

**Solution**:
- Use `class_weight='balanced'` in scikit-learn
- Use `scale_pos_weight` in XGBoost
- Consider oversampling anomalies or undersampling normal events
- Use stratified k-fold cross-validation

### Model performance on test set is different from training

**Problem**: Overfitting or data drift

**Solution**:
- Reduce model complexity (fewer features, smaller trees)
- Add regularization (L1/L2, dropout)
- Collect more recent training data
- Validate on different time periods

### ML model predictions are poor quality

**Problem**: Model not capturing patterns

**Solution**:
- Check feature distributions (ensure no skew)
- Try different algorithms (Random Forest → XGBoost → Neural Networks)
- Add more features (volatility, time-based interactions)
- Collect more diverse training data
- Tune hyperparameters via grid search

---

## Next Steps

1. ✅ Create data normalization & feature extraction (this commit)
2. ⏳ Generate training dataset: `npm run gen:training-dataset`
3. ⏳ Train ML model (choose scikit-learn, TensorFlow, or XGBoost)
4. ⏳ Integrate into worker service
5. ⏳ A/B test ML vs deterministic in staging
6. ⏳ Deploy to production with monitoring

---

**Updated**: 11/05/2026  
**Status**: Phase 1 infrastructure ready (data normalization + feature extraction)
