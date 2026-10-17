import numpy as np
from typing import Dict, Any, Optional
from app.schemas.models import BoundingBox, FaceLandmarks

class HeadPose3DEstimator:
    """
    3D Head Pose Estimator calculating exact Euler Angles (Yaw, Pitch, Roll in Degrees)
    from facial landmarks and bounding box geometry.
    
    Enhanced for ExamGuard AI Proctoring with:
    - PHONE_LOOK_DOWN: Phát hiện cúi đầu sâu (nghi dùng điện thoại dưới bàn)
    - SUSPICIOUS_SIDE_LEFT / SUSPICIOUS_SIDE_RIGHT: Nghiêng mạnh sang bên (nghi nhìn bài)
    - Severity levels: NONE / LOW / MEDIUM / HIGH / CRITICAL
    - Confidence scoring dựa trên khoảng cách so với ngưỡng
    """

    # ── Ngưỡng phân loại tư thế (Calibrated Thresholds) ──
    # Deadband tránh nhận nhầm khi SV dao động nhẹ tự nhiên
    THRESHOLDS = {
        "TURN_LEFT":             {"yaw_min": 13.0,  "yaw_max": 30.0},
        "TURN_RIGHT":            {"yaw_min": -30.0, "yaw_max": -13.0},
        "SUSPICIOUS_SIDE_LEFT":  {"yaw_min": 30.0,  "yaw_max": 90.0},
        "SUSPICIOUS_SIDE_RIGHT": {"yaw_min": -90.0, "yaw_max": -30.0},
        "LOOK_UP":               {"pitch_min": 10.0, "pitch_max": 45.0},
        "LOOK_DOWN":             {"pitch_min": -22.0, "pitch_max": -10.0},
        "PHONE_LOOK_DOWN":       {"pitch_min": -45.0, "pitch_max": -22.0},
        "STRAIGHT":              {"yaw_range": 8.0, "pitch_range": 8.0},
    }

    # ── Bảng severity cho hệ thống Proctoring ──
    SEVERITY_MAP = {
        "STRAIGHT":              "NONE",
        "LOOK_UP":               "LOW",
        "LOOK_DOWN":             "LOW",
        "TURN_LEFT":             "MEDIUM",
        "TURN_RIGHT":            "MEDIUM",
        "SUSPICIOUS_SIDE_LEFT":  "HIGH",
        "SUSPICIOUS_SIDE_RIGHT": "HIGH",
        "PHONE_LOOK_DOWN":       "HIGH",
    }

    # ── Mức phạt điểm uy tín gợi ý (server sẽ quyết định cuối cùng) ──
    PENALTY_SUGGESTION = {
        "STRAIGHT":              0,
        "LOOK_UP":               0,
        "LOOK_DOWN":             3,
        "TURN_LEFT":             5,
        "TURN_RIGHT":            5,
        "SUSPICIOUS_SIDE_LEFT":  12,
        "SUSPICIOUS_SIDE_RIGHT": 12,
        "PHONE_LOOK_DOWN":       15,
    }

    @staticmethod
    def calculate_euler_angles(landmarks: FaceLandmarks, bbox: Optional[BoundingBox] = None) -> Dict[str, Any]:
        """
        Calculates Euler Angles:
        - yaw_deg: Horizontal turn (-Left / +Right or vice-versa, 0° = straight)
        - pitch_deg: Vertical tilt (+Up / -Down, 0° = straight)
        - roll_deg: In-plane tilt (-Left ear / +Right ear tilt)
        """
        if landmarks is None:
            return {
                "pose": "STRAIGHT",
                "yaw_deg": 0.0,
                "pitch_deg": 0.0,
                "roll_deg": 0.0,
                "confidence": 0.0,
                "severity": "NONE",
                "penalty_suggestion": 0,
            }

        re = landmarks.right_eye
        le = landmarks.left_eye
        nose = landmarks.nose_tip
        mr = landmarks.mouth_right
        ml = landmarks.mouth_left

        # 1. Calculate In-Plane Roll Angle (tilt of eye line)
        dx_eyes = le.x - re.x
        dy_eyes = le.y - re.y
        roll_rad = np.arctan2(dy_eyes, dx_eyes)
        roll_deg = float(np.degrees(roll_rad))

        # 2. Eye midpoint and mouth midpoint
        mid_eye_x = (re.x + le.x) / 2.0
        mid_eye_y = (re.y + le.y) / 2.0
        mid_mouth_x = (mr.x + ml.x) / 2.0
        mid_mouth_y = (mr.y + ml.y) / 2.0

        eye_dist = max(np.sqrt(dx_eyes**2 + dy_eyes**2), 1.0)
        face_dist_y = max(abs(mid_mouth_y - mid_eye_y), 1.0)

        # 3. Horizontal Yaw Angle (Degrees):
        # Displacement of nose tip from midpoint of eyes relative to eye distance
        # Negative = Turn Left, Positive = Turn Right
        dx_nose_mid = nose.x - mid_eye_x
        # Normalize by eye distance
        yaw_norm = dx_nose_mid / (eye_dist * 0.5)
        yaw_norm = float(np.clip(yaw_norm, -1.0, 1.0))
        yaw_deg = float(yaw_norm * 45.0)  # Maps to approx -45° to +45°

        # 4. Vertical Pitch Angle (Degrees):
        # Ratio of eye-to-nose vs nose-to-mouth distance compared to straight baseline (~1.40)
        eye_to_nose = max(0.1, nose.y - mid_eye_y)
        nose_to_mouth = max(0.1, mid_mouth_y - nose.y)
        vert_ratio = float(eye_to_nose / nose_to_mouth)
        
        # Baseline straight ratio is approx 1.40
        # If vert_ratio < 1.40 -> looking UP (nose moves higher)
        # If vert_ratio > 1.40 -> looking DOWN (nose moves lower)
        if vert_ratio < 1.40:
            # Looking up (Pitch > 0)
            pitch_deg = float((1.40 - vert_ratio) / 1.40 * 45.0)
        else:
            # Looking down (Pitch < 0)
            pitch_deg = float(-min(1.0, (vert_ratio - 1.40) / 2.5) * 45.0)

        # 5. Classify dominant discrete pose with ENHANCED thresholds
        pose = HeadPose3DEstimator._classify_pose(yaw_deg, pitch_deg)

        # 6. Calculate confidence: Khoảng cách từ giá trị đo tới vùng STRAIGHT
        confidence = HeadPose3DEstimator._calculate_confidence(yaw_deg, pitch_deg, pose)

        # 7. Proctoring severity & penalty suggestion
        severity = HeadPose3DEstimator.SEVERITY_MAP.get(pose, "NONE")
        penalty = HeadPose3DEstimator.PENALTY_SUGGESTION.get(pose, 0)

        return {
            "pose": pose,
            "yaw_deg": round(yaw_deg, 1),
            "pitch_deg": round(pitch_deg, 1),
            "roll_deg": round(roll_deg, 1),
            "vert_ratio": round(vert_ratio, 2),
            "confidence": round(confidence, 2),
            "severity": severity,
            "penalty_suggestion": penalty,
        }

    @staticmethod
    def _classify_pose(yaw_deg: float, pitch_deg: float) -> str:
        """
        Phân loại tư thế theo thứ tự ưu tiên:
        1. Nghi vấn nghiêm trọng (SUSPICIOUS_SIDE, PHONE_LOOK_DOWN) 
        2. Quay mặt thông thường (TURN_LEFT/RIGHT, LOOK_UP/DOWN)
        3. Thẳng (STRAIGHT)
        """
        abs_yaw = abs(yaw_deg)
        
        # Ưu tiên kiểm tra nghiêng mạnh sang bên (nghi nhìn bài/tài liệu)
        if yaw_deg >= 30.0:
            return "SUSPICIOUS_SIDE_LEFT"
        if yaw_deg <= -30.0:
            return "SUSPICIOUS_SIDE_RIGHT"
        
        # Kiểm tra cúi đầu sâu (nghi dùng điện thoại dưới bàn)
        if pitch_deg <= -22.0:
            return "PHONE_LOOK_DOWN"
        
        # Quay mặt thông thường
        if yaw_deg >= 13.0:
            return "TURN_LEFT"
        if yaw_deg <= -13.0:
            return "TURN_RIGHT"
        if pitch_deg >= 10.0:
            return "LOOK_UP"
        if pitch_deg <= -10.0:
            return "LOOK_DOWN"
        
        return "STRAIGHT"

    @staticmethod
    def _calculate_confidence(yaw_deg: float, pitch_deg: float, pose: str) -> float:
        """
        Tính độ tin cậy của phân loại (0.0 = sát ngưỡng, 1.0 = rõ ràng nhất).
        Dùng để lọc false positive khi giá trị gần biên.
        """
        if pose == "STRAIGHT":
            # Càng gần tâm (0,0) -> confidence càng cao
            max_dev = max(abs(yaw_deg), abs(pitch_deg))
            return float(np.clip(1.0 - max_dev / 8.0, 0.1, 1.0))
        
        if pose in ("TURN_LEFT", "TURN_RIGHT"):
            margin = abs(abs(yaw_deg) - 13.0)
            return float(np.clip(margin / 17.0, 0.1, 1.0))
        
        if pose in ("SUSPICIOUS_SIDE_LEFT", "SUSPICIOUS_SIDE_RIGHT"):
            margin = abs(abs(yaw_deg) - 30.0)
            return float(np.clip(margin / 15.0, 0.2, 1.0))
        
        if pose == "LOOK_UP":
            margin = abs(pitch_deg - 10.0)
            return float(np.clip(margin / 20.0, 0.1, 1.0))
        
        if pose == "LOOK_DOWN":
            margin = abs(abs(pitch_deg) - 10.0)
            return float(np.clip(margin / 12.0, 0.1, 1.0))
        
        if pose == "PHONE_LOOK_DOWN":
            margin = abs(abs(pitch_deg) - 22.0)
            return float(np.clip(margin / 15.0, 0.2, 1.0))
        
        return 0.5
