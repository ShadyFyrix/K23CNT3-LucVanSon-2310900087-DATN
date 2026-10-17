import os
import numpy as np
from typing import List, Tuple, Optional
from app.config import settings
from app.schemas.models import BoundingBox, Landmark, FaceLandmarks, DetectedFace
from app.core.quality_checker import FaceQualityChecker

try:
    import cv2
except ImportError:
    cv2 = None

class FaceDetector:
    """
    Detects faces in images using OpenCV YuNet ONNX or Haar Cascade / DNN.
    Returns detected faces with bounding boxes, landmarks, and quality checks.
    """

    def __init__(self):
        self.yunet_detector = None
        self.cascade_detector = None
        self._init_models()

    def _init_models(self):
        if cv2 is None:
            return

        # Attempt to load YuNet if model file exists
        if os.path.exists(settings.YUNET_MODEL_PATH) and hasattr(cv2, 'FaceDetectorYN'):
            try:
                self.yunet_detector = cv2.FaceDetectorYN.create(
                    model=settings.YUNET_MODEL_PATH,
                    config="",
                    input_size=(320, 320),
                    score_threshold=0.6,
                    nms_threshold=0.3,
                    top_k=5000
                )
            except Exception as e:
                print(f"[FaceDetector] Could not load YuNet: {e}")
                self.yunet_detector = None

        # Fallback to Haar Cascade
        try:
            cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
            if os.path.exists(cascade_path):
                self.cascade_detector = cv2.CascadeClassifier(cascade_path)
        except Exception as e:
            print(f"[FaceDetector] Haar cascade load warning: {e}")

    def detect_faces(self, image_bgr: np.ndarray) -> List[DetectedFace]:
        """
        Detects all faces in image_bgr.
        """
        if image_bgr is None or image_bgr.size == 0:
            return []

        h, w = image_bgr.shape[:2]
        detected: List[DetectedFace] = []

        # 1. Try YuNet ONNX detector
        if self.yunet_detector is not None:
            try:
                # Downscale large frames to max 320px for YuNet (reduces CPU latency from ~75ms to ~8ms)
                scale = 1.0
                max_dim = max(w, h)
                if max_dim > 320:
                    scale = 320.0 / max_dim
                    detect_w = int(w * scale)
                    detect_h = int(h * scale)
                    detect_img = cv2.resize(image_bgr, (detect_w, detect_h))
                else:
                    detect_w, detect_h = w, h
                    detect_img = image_bgr

                self.yunet_detector.setInputSize((detect_w, detect_h))
                _, faces = self.yunet_detector.detect(detect_img)
                if faces is not None:
                    inv_scale = 1.0 / scale
                    for face_data in faces:
                        # face_data format: [x, y, w, h, x_re, y_re, x_le, y_le, x_nt, y_nt, x_rcm, y_rcm, x_lcm, y_lcm, score]
                        bx = int(face_data[0] * inv_scale)
                        by = int(face_data[1] * inv_scale)
                        bw = int(face_data[2] * inv_scale)
                        bh = int(face_data[3] * inv_scale)
                        score = float(face_data[-1])

                        # Landmarks scaled back to original image dimensions
                        landmarks = FaceLandmarks(
                            right_eye=Landmark(x=float(face_data[4] * inv_scale), y=float(face_data[5] * inv_scale)),
                            left_eye=Landmark(x=float(face_data[6] * inv_scale), y=float(face_data[7] * inv_scale)),
                            nose_tip=Landmark(x=float(face_data[8] * inv_scale), y=float(face_data[9] * inv_scale)),
                            mouth_right=Landmark(x=float(face_data[10] * inv_scale), y=float(face_data[11] * inv_scale)),
                            mouth_left=Landmark(x=float(face_data[12] * inv_scale), y=float(face_data[13] * inv_scale))
                        )

                        bbox = BoundingBox(x=bx, y=by, width=bw, height=bh)
                        quality = FaceQualityChecker.check_quality(image_bgr, bbox)

                        detected.append(DetectedFace(
                            bbox=bbox,
                            landmarks=landmarks,
                            confidence=score,
                            quality=quality
                        ))
                    return detected
            except Exception as e:
                print(f"[FaceDetector] YuNet detection error: {e}")

        # 2. Fallback: Haar Cascade
        if self.cascade_detector is not None:
            gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
            faces = self.cascade_detector.detectMultiScale(
                gray,
                scaleFactor=1.1,
                minNeighbors=5,
                minSize=(settings.MIN_FACE_SIZE, settings.MIN_FACE_SIZE)
            )

            for (x, y, bw, bh) in faces:
                bbox = BoundingBox(x=int(x), y=int(y), width=int(bw), height=int(bh))
                quality = FaceQualityChecker.check_quality(image_bgr, bbox)

                # Synthetic landmark estimation based on face anatomy ratios
                re_x = float(x + 0.3 * bw)
                re_y = float(y + 0.38 * bh)
                le_x = float(x + 0.7 * bw)
                le_y = float(y + 0.38 * bh)
                nose_x = float(x + 0.5 * bw)
                nose_y = float(y + 0.58 * bh)
                mr_x = float(x + 0.35 * bw)
                mr_y = float(y + 0.78 * bh)
                ml_x = float(x + 0.65 * bw)
                ml_y = float(y + 0.78 * bh)

                landmarks = FaceLandmarks(
                    right_eye=Landmark(x=re_x, y=re_y),
                    left_eye=Landmark(x=le_x, y=le_y),
                    nose_tip=Landmark(x=nose_x, y=nose_y),
                    mouth_right=Landmark(x=mr_x, y=mr_y),
                    mouth_left=Landmark(x=ml_x, y=ml_y)
                )

                detected.append(DetectedFace(
                    bbox=bbox,
                    landmarks=landmarks,
                    confidence=0.92,
                    quality=quality
                ))

        return detected
