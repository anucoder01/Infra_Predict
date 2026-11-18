"""ONNX inference adapter for bridge surface defect segmentation.

The expected model is a YOLOv8-seg ONNX export. Configure
INFRAPREDICT_VISION_MODEL to its path. No weights are bundled because
model weights have separate licenses and need validation for the target camera.
"""
from __future__ import annotations

import os
from typing import Any

import cv2
import numpy as np
from backend.shm_engine.dsp import compute_power_spectral_density, extract_modal_peaks

MODEL_PATH = os.environ.get("INFRAPREDICT_VISION_MODEL", "")
INPUT_SIZE = int(os.environ.get("INFRAPREDICT_VISION_INPUT_SIZE", "640"))
CONFIDENCE = float(os.environ.get("INFRAPREDICT_VISION_CONFIDENCE", "0.25"))
CLASS_NAMES = [name.strip() for name in os.environ.get(
    "INFRAPREDICT_VISION_CLASSES", "crack,spalling"
).split(",")]
_session = None


def _load_session():
    global _session
    if _session is not None:
        return _session
    if not MODEL_PATH or not os.path.isfile(MODEL_PATH):
        raise RuntimeError(
            "Vision model is not configured. Set INFRAPREDICT_VISION_MODEL to a YOLOv8-seg ONNX file."
        )
    import onnxruntime as ort
    _session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    return _session


def inspect_image(image_path: str) -> dict[str, Any]:
    session = _load_session()
    image = cv2.imread(image_path)
    if image is None:
        raise ValueError("Unable to decode uploaded image")
    height, width = image.shape[:2]
    size = INPUT_SIZE
    scale = min(size / width, size / height)
    resized = cv2.resize(image, (round(width * scale), round(height * scale)))
    canvas = np.full((size, size, 3), 114, dtype=np.uint8)
    left = (size - resized.shape[1]) // 2
    top = (size - resized.shape[0]) // 2
    canvas[top:top + resized.shape[0], left:left + resized.shape[1]] = resized
    tensor = cv2.cvtColor(canvas, cv2.COLOR_BGR2RGB).astype(np.float32) / 255.0
    tensor = np.transpose(tensor, (2, 0, 1))[None, ...]
    outputs = session.run(None, {session.get_inputs()[0].name: tensor})
    if len(outputs) < 2:
        raise RuntimeError("Model output is not a YOLO segmentation pair (detections, masks)")
    detections = np.asarray(outputs[0])
    prototypes = np.asarray(outputs[1])
    detections = np.squeeze(detections)
    if detections.ndim == 1:
        detections = detections[None, :]
    if detections.ndim == 2 and detections.shape[0] < detections.shape[1]:
        detections = detections.T
    prototypes = np.squeeze(prototypes)
    if prototypes.ndim != 3:
        raise RuntimeError("Expected YOLOv8-seg mask prototypes with three dimensions")
    if prototypes.shape[0] > prototypes.shape[-1]:
        prototypes = np.transpose(prototypes, (1, 2, 0))

    detections_out = []
    for row in detections:
        # YOLOv8-seg output columns: cx,cy,w,h,class scores...,mask coefficients
        if len(row) < 7 + prototypes.shape[-1]:
            continue
        class_scores = row[4:len(row) - prototypes.shape[-1]]
        class_id = int(np.argmax(class_scores))
        score = float(class_scores[class_id])
        if score < CONFIDENCE:
            continue
        cx, cy, box_w, box_h = [float(x) for x in row[:4]]
        x1, y1, x2, y2 = cx - box_w / 2, cy - box_h / 2, cx + box_w / 2, cy + box_h / 2
        factor = size if max(abs(x1), abs(y1), abs(x2), abs(y2)) <= 1.5 else 1.0
        x1, x2 = (x1 * factor - left) / scale, (x2 * factor - left) / scale
        y1, y2 = (y1 * factor - top) / scale, (y2 * factor - top) / scale
        coeff = row[-prototypes.shape[-1]:]
        mask = 1 / (1 + np.exp(-np.clip(np.tensordot(coeff, prototypes, axes=(0, 2)), -30, 30)))
        mask = cv2.resize(mask.astype(np.float32), (size, size))
        crop_x1, crop_y1 = max(0, int(round(cx - box_w / 2))), max(0, int(round(cy - box_h / 2)))
        crop_x2, crop_y2 = min(size, int(round(cx + box_w / 2))), min(size, int(round(cy + box_h / 2)))
        cropped_mask = np.zeros((size, size), dtype=np.uint8)
        if crop_x2 > crop_x1 and crop_y2 > crop_y1:
            cropped_mask[crop_y1:crop_y2, crop_x1:crop_x2] = (mask[crop_y1:crop_y2, crop_x1:crop_x2] > 0.5).astype(np.uint8)
        original_mask = cv2.resize(cropped_mask, (round(width * scale), round(height * scale)), interpolation=cv2.INTER_NEAREST)
        original_mask = original_mask[:round(height * scale), :round(width * scale)]
        if left or top or original_mask.shape[:2] != (height, width):
            padded = np.zeros((height, width), dtype=np.uint8)
            padded[:min(height, original_mask.shape[0]), :min(width, original_mask.shape[1])] = original_mask[:height, :width]
            original_mask = padded
        contours, _ = cv2.findContours(original_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        polygons = [contour.reshape(-1, 2).tolist() for contour in contours if len(contour) >= 3]
        detections_out.append({
            "class_id": class_id,
            "class_name": CLASS_NAMES[class_id] if class_id < len(CLASS_NAMES) else f"class_{class_id}",
            "confidence": round(score, 4),
            "box_xyxy": [round(max(0, x1), 1), round(max(0, y1), 1),
                         round(min(width, x2), 1), round(min(height, y2), 1)],
            "mask_polygons": polygons,
        })
    return {
        "model": os.path.basename(MODEL_PATH),
        "task": "instance_segmentation",
        "detections": detections_out,
        "image_size": {"width": width, "height": height},
    }
