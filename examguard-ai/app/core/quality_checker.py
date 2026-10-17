import numpy as np
from typing import Tuple, List
from app.config import settings
from app.schemas.models import QualityCheck, BoundingBox

try:
    import cv2
except ImportError:
    cv2 = None

class FaceQualityChecker:
    """
    Checks face image quality:
    1. Brightness (avoid under/over-exposure)
    2. Sharpness/Blur (Laplacian variance)
    3. Minimum face size & ratio
    4. Centering and bounding box bounds
    """

    @staticmethod
    def calculate_brightness(image_bgr: np.ndarray, bbox: BoundingBox) -> float:
        h, w = image_bgr.shape[:2]
        x1 = max(0, bbox.x)
        y1 = max(0, bbox.y)
        x2 = min(w, bbox.x + bbox.width)
        y2 = min(h, bbox.y + bbox.height)

        crop = image_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            return 0.0

        if cv2 is not None:
            gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        else:
            # Grayscale approximation: 0.299 R + 0.587 G + 0.114 B (BGR format: 0.114 B + 0.587 G + 0.299 R)
            gray = crop[:, :, 0] * 0.114 + crop[:, :, 1] * 0.587 + crop[:, :, 2] * 0.299

        return float(np.mean(gray))

    @staticmethod
    def calculate_blur_score(image_bgr: np.ndarray, bbox: BoundingBox, normalized_size: Tuple[int, int] = (160, 160)) -> float:
        """
        Calculates scale-invariant sharpness by normalizing the face crop to a standard dimension (160x160)
        before computing the Laplacian variance. This ensures fair, consistent blur scoring across 480p, 720p, 1080p, and 4K cameras.
        """
        h, w = image_bgr.shape[:2]
        x1 = max(0, bbox.x)
        y1 = max(0, bbox.y)
        x2 = min(w, bbox.x + bbox.width)
        y2 = min(h, bbox.y + bbox.height)

        crop = image_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            return 0.0

        if cv2 is not None:
            # Resize crop to standard dimension for scale-invariant measurement
            crop_resized = cv2.resize(crop, normalized_size, interpolation=cv2.INTER_AREA if crop.shape[0] > normalized_size[0] else cv2.INTER_LINEAR)
            gray = cv2.cvtColor(crop_resized, cv2.COLOR_BGR2GRAY)
            laplacian = cv2.Laplacian(gray, cv2.CV_64F)
            return float(laplacian.var())
        else:
            gray = (crop[:, :, 0] * 0.114 + crop[:, :, 1] * 0.587 + crop[:, :, 2] * 0.299).astype(np.float64)
            if gray.shape[0] < 3 or gray.shape[1] < 3:
                return 0.0
            gh, gw = gray.shape
            conv = (
                gray[0:gh-2, 1:gw-1] +
                gray[2:gh,   1:gw-1] +
                gray[1:gh-1, 0:gw-2] +
                gray[1:gh-1, 2:gw] -
                4.0 * gray[1:gh-1, 1:gw-1]
            )
            return float(np.var(conv))

    @classmethod
    def check_quality(cls, image_bgr: np.ndarray, bbox: BoundingBox) -> QualityCheck:
        img_h, img_w = image_bgr.shape[:2]
        reasons: List[str] = []

        # 1. Adaptive Face Size & Ratio Check
        img_area = float(img_h * img_w)
        face_area = float(bbox.width * bbox.height)
        face_ratio = face_area / max(img_area, 1.0)

        # A face is valid if it meets the minimum pixel dimensions (e.g. 60px)
        # and doesn't occupy an absurdly minuscule part of the whole frame
        if bbox.width < settings.MIN_FACE_SIZE or bbox.height < settings.MIN_FACE_SIZE:
            reasons.append(f"Face size too small ({bbox.width}x{bbox.height}px, min {settings.MIN_FACE_SIZE}px). Please move closer.")
        elif face_ratio < settings.MIN_FACE_RATIO and (bbox.width < 120 or bbox.height < 120):
            reasons.append(f"Face occupies only {face_ratio*100:.1f}% of frame (min {settings.MIN_FACE_RATIO*100:.1f}%). Move closer.")

        # 2. Check Brightness
        brightness = cls.calculate_brightness(image_bgr, bbox)
        if brightness < settings.MIN_BRIGHTNESS:
            reasons.append(f"Lighting too dark (brightness: {brightness:.1f}/{settings.MIN_BRIGHTNESS}). Move to a brighter area.")
        elif brightness > settings.MAX_BRIGHTNESS:
            reasons.append(f"Lighting overexposed (brightness: {brightness:.1f}/{settings.MAX_BRIGHTNESS}). Avoid direct glare.")

        # 3. Scale-Invariant Blur / Sharpness Check
        blur_score = cls.calculate_blur_score(image_bgr, bbox)
        if blur_score < settings.MIN_BLUR_SCORE:
            reasons.append(f"Image too blurry (sharpness score: {blur_score:.1f}, min {settings.MIN_BLUR_SCORE}). Hold camera steady.")

        is_valid = len(reasons) == 0
        return QualityCheck(
            valid=is_valid,
            brightness=round(brightness, 2),
            blur_score=round(blur_score, 2),
            face_ratio=round(face_ratio, 4),
            reasons=reasons
        )

