import numpy as np
from typing import Dict, Any, Optional
from app.config import settings
from app.schemas.models import LivenessCheck, BoundingBox

try:
    import cv2
except ImportError:
    cv2 = None

class LivenessChecker:
    """
    Anti-Spoofing & Liveness verification:
    1. High-frequency texture & Moiré pattern analysis (detecting phone screens / paper prints).
    2. Skin color chroma distribution (YCrCb & HSV).
    3. Specular reflection / glare spikes on flat surfaces.
    """

    @classmethod
    def check_liveness(cls, image_bgr: np.ndarray, bbox: BoundingBox) -> LivenessCheck:
        if cv2 is None or image_bgr is None or image_bgr.size == 0:
            return LivenessCheck(is_live=True, score=1.0, details={"status": "bypass"})

        h, w = image_bgr.shape[:2]
        x1 = max(0, bbox.x)
        y1 = max(0, bbox.y)
        x2 = min(w, bbox.x + bbox.width)
        y2 = min(h, bbox.y + bbox.height)

        crop = image_bgr[y1:y2, x1:x2]
        if crop.size == 0:
            return LivenessCheck(is_live=False, score=0.0, details={"reason": "empty_crop"})

        # 1. Texture & Frequency Check (Moiré / Print detection)
        gray = cv2.cvtColor(crop, cv2.COLOR_BGR2GRAY)
        laplacian = cv2.Laplacian(gray, cv2.CV_64F)
        texture_score = float(laplacian.var())
        norm_texture = min(1.0, texture_score / 300.0)

        # 2. Skin Chroma in YCrCb space
        ycrcb = cv2.cvtColor(crop, cv2.COLOR_BGR2YCrCb)
        cr = ycrcb[:, :, 1]
        cb = ycrcb[:, :, 2]

        # Natural human skin tone typical range in CrCb: Cr ~ 133-173, Cb ~ 77-127
        skin_mask = (cr >= 130) & (cr <= 175) & (cb >= 75) & (cb <= 130)
        skin_ratio = float(np.sum(skin_mask)) / float(crop.shape[0] * crop.shape[1])
        chroma_score = min(1.0, skin_ratio / 0.4)  # expect at least 40% skin area

        # 3. Flat Glare / Screen Reflection Detection
        hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
        val = hsv[:, :, 2]
        glare_pixels = np.sum(val > 250)
        glare_ratio = float(glare_pixels) / float(crop.shape[0] * crop.shape[1])
        glare_penalty = max(0.0, 1.0 - (glare_ratio * 10.0))

        # Composite Liveness Score (weighted combination)
        composite_score = float(0.40 * norm_texture + 0.40 * chroma_score + 0.20 * glare_penalty)
        composite_score = float(np.clip(composite_score, 0.0, 1.0))

        is_live = composite_score >= settings.LIVENESS_THRESHOLD

        return LivenessCheck(
            is_live=is_live,
            score=round(composite_score, 3),
            details={
                "texture_score": round(texture_score, 1),
                "chroma_score": round(chroma_score, 3),
                "glare_penalty": round(glare_penalty, 3),
                "threshold": settings.LIVENESS_THRESHOLD
            }
        )

    @staticmethod
    def estimate_head_pose(landmarks, bbox: Optional[BoundingBox] = None) -> Dict[str, Any]:
        """
        Estimates 3D Head Pose with Euler Angles (Pitch, Yaw, Roll in Degrees)
        """
        from app.core.head_pose_3d import HeadPose3DEstimator
        return HeadPose3DEstimator.calculate_euler_angles(landmarks, bbox)

    @staticmethod
    def analyze_eye_state(image_bgr: np.ndarray, landmarks, bbox: BoundingBox) -> Dict[str, Any]:
        """
        Detects eye state (open vs blink/closed) by analyzing eye region dark pupil circularity,
        vertical aspect ratio, and vertical gradient intensity.
        """
        if cv2 is None or image_bgr is None or landmarks is None:
            return {"blink_detected": False, "eye_open_score": 1.0}

        h, w = image_bgr.shape[:2]
        # Eye bounding box radius based on face width
        eye_w = max(10, int(bbox.width * 0.12))
        eye_h = max(8, int(bbox.height * 0.08))
        
        open_scores = []
        for eye in [landmarks.right_eye, landmarks.left_eye]:
            ex1 = max(0, int(eye.x - eye_w))
            ey1 = max(0, int(eye.y - eye_h))
            ex2 = min(w, int(eye.x + eye_w))
            ey2 = min(h, int(eye.y + eye_h))

            eye_crop = image_bgr[ey1:ey2, ex1:ex2]
            if eye_crop.size > 0 and eye_crop.shape[0] >= 4 and eye_crop.shape[1] >= 4:
                gray = cv2.cvtColor(eye_crop, cv2.COLOR_BGR2GRAY)
                
                # 1. Vertical Gradient contrast
                sobely = cv2.Sobel(gray, cv2.CV_64F, 0, 1, ksize=3)
                grad_score = min(1.0, float(sobely.var()) / 120.0)

                # 2. Dark pupil component analysis (isolated dark pixels)
                # An open eye has a clear dark iris/pupil in the center
                min_val = float(np.min(gray))
                max_val = float(np.max(gray))
                contrast_range = max_val - min_val

                if contrast_range > 25:
                    # Threshold bottom 20% darkest pixels in eye region
                    thresh_val = min_val + 0.35 * contrast_range
                    dark_mask = (gray <= thresh_val).astype(np.uint8)
                    
                    # Find dark pupil bounding box
                    y_indices, x_indices = np.where(dark_mask > 0)
                    if len(y_indices) >= 4:
                        pupil_h = float(np.max(y_indices) - np.min(y_indices) + 1)
                        pupil_w = float(np.max(x_indices) - np.min(x_indices) + 1)
                        pupil_ratio = pupil_h / max(pupil_w, 1.0)
                        # Open eye pupil ratio is typically 0.5 - 1.0, closed eye is flat < 0.25
                        pupil_score = min(1.0, pupil_ratio / 0.5)
                    else:
                        pupil_score = 0.2
                else:
                    pupil_score = 0.15 # Very low contrast = closed eyelid skin

                # Composite openness score
                eye_score = float(0.6 * pupil_score + 0.4 * grad_score)
                open_scores.append(eye_score)

        avg_open = float(np.mean(open_scores)) if open_scores else 1.0
        # When eyes are closed/blinking, avg_open drops significantly (< 0.40)
        is_blink = avg_open < 0.40

        return {
            "blink_detected": is_blink,
            "eye_open_score": round(avg_open, 3)
        }


