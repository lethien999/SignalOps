#!/usr/bin/env python3
"""
M13: Train ML Model for Anomaly Detection

This script trains an ML model using one of three approaches:
1. Scikit-learn Random Forest (fastest, simplest)
2. TensorFlow Neural Network (standard)
3. XGBoost (best performance)

Usage:
    python scripts/train-model.py                    # Train with scikit-learn (default)
    python scripts/train-model.py --model xgboost    # Train with XGBoost
    python scripts/train-model.py --model tensorflow # Train with TensorFlow

Output:
    - anomaly-model.pkl (scikit-learn)
    - anomaly-model.h5 (TensorFlow)
    - anomaly-model-xgb.pkl (XGBoost)
    - training-metrics.json (precision/recall/f1)
"""

import pandas as pd
import numpy as np
import json
import argparse
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
)

# ============================================================================
# SCIKIT-LEARN: Random Forest (Recommended for MVP)
# ============================================================================

def train_sklearn():
    """Train Random Forest with class balancing for imbalanced data."""
    print("\n🤖 Training with Scikit-Learn Random Forest...")
    
    from sklearn.ensemble import RandomForestClassifier
    import joblib
    
    # Load data
    df = pd.read_csv('training-dataset.csv')
    X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm', 
             'overall_quality', 'hour_of_day', 'day_of_week']]
    y = df['anomalous']
    
    print(f"   Dataset shape: {X.shape}")
    print(f"   Class distribution: {y.value_counts().to_dict()}")
    
    # Split data (80/20 train/test)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model with balanced class weights
    print("   Training Random Forest (100 trees, max_depth=10)...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=42,
        class_weight='balanced',  # Handle 813:1 imbalance
        n_jobs=-1,  # Use all CPU cores
        verbose=1
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    metrics = evaluate_model(y_test, y_pred, y_pred_proba, "Random Forest")
    
    # Save model
    joblib.dump(model, 'anomaly-model.pkl')
    print("\n✓ Model saved to: anomaly-model.pkl")
    
    # Feature importance
    feature_names = ['latency_norm', 'packetLoss_norm', 'signalStrength_norm',
                     'overall_quality', 'hour_of_day', 'day_of_week']
    importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n📊 Feature Importance:")
    print(importance.to_string(index=False))
    
    return metrics


# ============================================================================
# TENSORFLOW: Neural Network
# ============================================================================

def train_tensorflow():
    """Train TensorFlow neural network."""
    print("\n🤖 Training with TensorFlow Neural Network...")
    
    try:
        import tensorflow as tf
        from tensorflow.keras import Sequential
        from tensorflow.keras.layers import Dense, Dropout, BatchNormalization
        from tensorflow.keras.optimizers import Adam
        from tensorflow.keras.callbacks import EarlyStopping
    except ImportError:
        print("✗ TensorFlow not installed. Install with: pip install tensorflow")
        return None
    
    # Load data
    df = pd.read_csv('training-dataset.csv')
    X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm',
             'overall_quality', 'hour_of_day', 'day_of_week']].values
    y = df['anomalous'].values
    
    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Calculate class weight
    class_weight = {
        0: 1.0,
        1: (len(y_train[y_train == 0]) / len(y_train[y_train == 1]))
    }
    print(f"   Class weights: {class_weight}")
    
    # Build neural network
    print("   Building neural network...")
    model = Sequential([
        Dense(64, activation='relu', input_shape=(X_train.shape[1],)),
        BatchNormalization(),
        Dropout(0.3),
        Dense(32, activation='relu'),
        BatchNormalization(),
        Dropout(0.2),
        Dense(16, activation='relu'),
        Dropout(0.1),
        Dense(1, activation='sigmoid')
    ])
    
    model.compile(
        optimizer=Adam(learning_rate=0.001),
        loss='binary_crossentropy',
        metrics=['accuracy', tf.keras.metrics.Precision(), tf.keras.metrics.Recall()]
    )
    
    # Train
    print("   Training (50 epochs)...")
    history = model.fit(
        X_train, y_train,
        validation_data=(X_test, y_test),
        epochs=50,
        batch_size=32,
        class_weight=class_weight,
        callbacks=[EarlyStopping(monitor='val_loss', patience=5, restore_best_weights=True)],
        verbose=1
    )
    
    # Evaluate
    y_pred_proba = model.predict(X_test)[:, 0]
    y_pred = (y_pred_proba > 0.5).astype(int)
    
    metrics = evaluate_model(y_test, y_pred, y_pred_proba, "TensorFlow")
    
    # Save model
    model.save('anomaly-model.h5')
    print("\n✓ Model saved to: anomaly-model.h5")
    
    return metrics


# ============================================================================
# XGBOOST: Gradient Boosting
# ============================================================================

def train_xgboost():
    """Train XGBoost model."""
    print("\n🤖 Training with XGBoost...")
    
    try:
        from xgboost import XGBClassifier
        import joblib
    except ImportError:
        print("✗ XGBoost not installed. Install with: pip install xgboost")
        return None
    
    # Load data
    df = pd.read_csv('training-dataset.csv')
    X = df[['latency_norm', 'packetLoss_norm', 'signalStrength_norm',
             'overall_quality', 'hour_of_day', 'day_of_week']]
    y = df['anomalous']
    
    print(f"   Dataset shape: {X.shape}")
    print(f"   Class distribution: {y.value_counts().to_dict()}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Calculate scale_pos_weight for imbalance
    scale_pos_weight = len(y_train[y_train == 0]) / len(y_train[y_train == 1])
    print(f"   scale_pos_weight: {scale_pos_weight:.1f}")
    
    # Train model
    print("   Training XGBoost (100 rounds, max_depth=5)...")
    model = XGBClassifier(
        max_depth=5,
        learning_rate=0.1,
        n_estimators=100,
        scale_pos_weight=scale_pos_weight,
        random_state=42,
        verbosity=1
    )
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_pred_proba = model.predict_proba(X_test)[:, 1]
    
    metrics = evaluate_model(y_test, y_pred, y_pred_proba, "XGBoost")
    
    # Save model
    joblib.dump(model, 'anomaly-model-xgb.pkl')
    print("\n✓ Model saved to: anomaly-model-xgb.pkl")
    
    # Feature importance
    feature_names = ['latency_norm', 'packetLoss_norm', 'signalStrength_norm',
                     'overall_quality', 'hour_of_day', 'day_of_week']
    importance = pd.DataFrame({
        'feature': feature_names,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print("\n📊 Feature Importance:")
    print(importance.to_string(index=False))
    
    return metrics


# ============================================================================
# Evaluation and Metrics
# ============================================================================

def evaluate_model(y_test, y_pred, y_pred_proba, model_name):
    """Evaluate model and print metrics."""
    print("\n📊 Classification Report:")
    print(classification_report(y_test, y_pred, digits=4))
    
    # Calculate metrics
    precision = precision_score(y_test, y_pred, zero_division=0)
    recall = recall_score(y_test, y_pred, zero_division=0)
    f1 = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_pred_proba)
    
    # Confusion matrix
    tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
    
    metrics = {
        'model': model_name,
        'precision': float(precision),
        'recall': float(recall),
        'f1_score': float(f1),
        'roc_auc': float(roc_auc),
        'confusion_matrix': {
            'true_negatives': int(tn),
            'false_positives': int(fp),
            'false_negatives': int(fn),
            'true_positives': int(tp)
        }
    }
    
    print(f"\n✓ Precision: {precision:.4f} (target: ≥0.80)")
    print(f"✓ Recall: {recall:.4f} (target: ≥0.75)")
    print(f"✓ F1 Score: {f1:.4f} (target: ≥0.77)")
    print(f"✓ ROC-AUC: {roc_auc:.4f} (target: ≥0.85)")
    
    # Save metrics
    with open('training-metrics.json', 'w') as f:
        json.dump(metrics, f, indent=2)
    
    print("\n✓ Metrics saved to: training-metrics.json")
    
    return metrics


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Train ML anomaly detection model')
    parser.add_argument('--model', choices=['sklearn', 'tensorflow', 'xgboost'],
                        default='sklearn', help='Model type (default: sklearn)')
    args = parser.parse_args()
    
    print("🚀 M13 ML Model Training Pipeline")
    print(f"   Model: {args.model}")
    print(f"   Training data: training-dataset.csv")
    print("-" * 50)
    
    if not Path('training-dataset.csv').exists():
        print("✗ training-dataset.csv not found. Run: npm run gen:training-dataset")
        return
    
    if args.model == 'sklearn':
        metrics = train_sklearn()
    elif args.model == 'tensorflow':
        metrics = train_tensorflow()
    elif args.model == 'xgboost':
        metrics = train_xgboost()
    
    if metrics:
        print("\n" + "=" * 50)
        print(f"✅ Training complete!")
        print(f"   Precision: {metrics['precision']:.4f}")
        print(f"   Recall: {metrics['recall']:.4f}")
        print(f"   F1 Score: {metrics['f1_score']:.4f}")
        print(f"   ROC-AUC: {metrics['roc_auc']:.4f}")
        print("=" * 50)


if __name__ == '__main__':
    main()
