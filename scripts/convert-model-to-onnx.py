#!/usr/bin/env python3
"""
M13: Convert trained scikit-learn model to ONNX for Node.js inference.

Input:
  - anomaly-model.pkl

Output:
  - apps/worker-service/src/assets/anomaly-model.onnx
"""

from pathlib import Path

import joblib
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType

MODEL_PATH = Path('anomaly-model.pkl')
OUTPUT_PATH = Path('apps/worker-service/src/assets/anomaly-model.onnx')


def main() -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f'Model not found: {MODEL_PATH}')

    model = joblib.load(MODEL_PATH)
    initial_types = [('features', FloatTensorType([None, 6]))]
    onnx_model = convert_sklearn(
        model,
        initial_types=initial_types,
        target_opset=12,
        options={id(model): {'zipmap': False}},
    )

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_bytes(onnx_model.SerializeToString())

    print(f'✓ Converted {MODEL_PATH} -> {OUTPUT_PATH}')


if __name__ == '__main__':
    main()
