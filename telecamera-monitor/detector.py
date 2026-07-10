from dataclasses import dataclass
from io import BytesIO

import torch
from PIL import Image
from ultralytics import YOLO

PERSON_CLASS_NAME = "person"


@dataclass
class DetectionResult:
    detected: bool
    confidence: float


class PersonDetector:
    def __init__(self, confidence_threshold: float = 0.5, model_path: str = "yolov8n.pt"):
        self.confidence_threshold = confidence_threshold
        self.device = "mps" if torch.backends.mps.is_available() else "cpu"
        self.model = YOLO(model_path)

    def detect(self, image_bytes: bytes) -> DetectionResult:
        image = Image.open(BytesIO(image_bytes)).convert("RGB")
        results = self.model.predict(image, device=self.device, conf=min(self.confidence_threshold, 0.05), verbose=False)

        best_confidence = 0.0
        for result in results:
            for box in result.boxes:
                class_name = result.names[int(box.cls[0])]
                confidence = float(box.conf[0])
                if class_name == PERSON_CLASS_NAME and confidence > best_confidence:
                    best_confidence = confidence

        return DetectionResult(
            detected=best_confidence >= self.confidence_threshold,
            confidence=best_confidence,
        )
