import time
import os
from typing import Any, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import ImageAnalysis


DETECTION_KEYWORDS = {
    "pothole": ["pothole", "crack", "hole", "rut", "deterioration"],
    "garbage": ["garbage", "waste", "trash", "dump", "litter", "debris"],
    "water_leak": ["water", "leak", "pipe", "wet", "puddle", "damp"],
    "broken_light": ["light", "lamp", "pole", "streetlight", "broken", "dark"],
    "drainage_blockage": ["drain", "blockage", "clog", "sewer", "stagnant"],
    "fallen_tree": ["tree", "fallen", "branch", "trunk", "uprooted"],
    "damaged_property": ["damage", "broken", "collapse", "crack", "debris"],
}


class ImageAnalysisService:
    async def analyze_image(self, image_path: str) -> dict:
        if not os.path.exists(image_path):
            return {
                "detected_objects": [],
                "suggested_category": None,
                "suggested_priority": None,
                "confidence": 0.0,
                "error": "Image file not found",
            }

        try:
            import cv2
            import numpy as np

            img = cv2.imread(image_path)
            if img is None:
                return {
                    "detected_objects": [],
                    "suggested_category": None,
                    "suggested_priority": None,
                    "confidence": 0.0,
                    "error": "Failed to read image",
                }

            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            blur = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blur, 50, 150)

            height, width = gray.shape
            total_pixels = height * width
            edge_ratio = float(np.count_nonzero(edges)) / total_pixels

            laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()

            detected = []
            detection_map = {}

            if edge_ratio > 0.15:
                detected.append("pothole")
                detection_map["pothole"] = min(edge_ratio * 2, 0.95)

            mean_brightness = float(np.mean(gray))
            if mean_brightness < 50:
                detected.append("broken_light")
                detection_map["broken_light"] = max(0.5, 1.0 - (mean_brightness / 50))

            hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
            green_mask = cv2.inRange(hsv, (35, 40, 40), (85, 255, 255))
            green_ratio = float(np.count_nonzero(green_mask)) / total_pixels
            if green_ratio > 0.3:
                detected.append("fallen_tree")
                detection_map["fallen_tree"] = min(green_ratio * 1.2, 0.95)

            brown_mask = cv2.inRange(hsv, (10, 50, 50), (30, 255, 200))
            brown_ratio = float(np.count_nonzero(brown_mask)) / total_pixels
            if brown_ratio > 0.2:
                detected.append("garbage")
                detection_map["garbage"] = min(brown_ratio * 1.5, 0.9)

            dark_blue_mask = cv2.inRange(hsv, (90, 50, 50), (130, 255, 255))
            dark_blue_ratio = float(np.count_nonzero(dark_blue_mask)) / total_pixels
            if dark_blue_ratio > 0.1:
                detected.append("water_leak")
                detection_map["water_leak"] = min(dark_blue_ratio * 2, 0.9)

            if laplacian_var < 50:
                detected.append("damaged_property")
                detection_map["damaged_property"] = max(0.5, 1.0 - (laplacian_var / 100))

            category_map = {
                "pothole": "road",
                "garbage": "sanitation",
                "water_leak": "water",
                "broken_light": "electricity",
                "drainage_blockage": "water",
                "fallen_tree": "infrastructure",
                "damaged_property": "infrastructure",
            }

            suggested_category = None
            suggested_priority = None
            best_confidence = 0.0

            if detected:
                best_obj = max(detected, key=lambda o: detection_map.get(o, 0))
                best_confidence = detection_map.get(best_obj, 0.0)
                suggested_category = category_map.get(best_obj)
                suggested_priority = "high" if best_confidence > 0.7 else "medium"

            return {
                "detected_objects": detected,
                "suggested_category": suggested_category,
                "suggested_priority": suggested_priority,
                "confidence": round(best_confidence, 4),
                "edge_ratio": round(edge_ratio, 4),
                "mean_brightness": round(mean_brightness, 2),
                "laplacian_variance": round(laplacian_var, 2),
            }

        except ImportError:
            return {
                "detected_objects": [],
                "suggested_category": None,
                "suggested_priority": None,
                "confidence": 0.0,
                "error": "OpenCV not available",
            }

    async def analyze_image_with_yolo(self, image_path: str) -> dict:
        return {
            "detections": [
                {"class": "pothole", "confidence": 0.0, "bbox": [0, 0, 0, 0]},
            ],
            "suggested_category": None,
            "suggested_priority": None,
            "model": "yolo-stub",
            "note": "YOLO model not deployed; replace with actual inference endpoint",
        }

    async def analyze_and_save(
        self, db: AsyncSession, complaint_id: int, image_url: str, image_path: str,
    ) -> ImageAnalysis:
        start = time.time()
        result = await self.analyze_image(image_path)
        analysis = ImageAnalysis(
            complaint_id=complaint_id,
            image_url=image_url,
            detected_objects=result.get("detected_objects", []),
            suggested_category=result.get("suggested_category"),
            suggested_priority=result.get("suggested_priority"),
            confidence=result.get("confidence"),
            model_version="opencv-v1",
            processing_time_ms=(time.time() - start) * 1000,
        )
        db.add(analysis)
        await db.flush()
        await db.refresh(analysis)
        return analysis
