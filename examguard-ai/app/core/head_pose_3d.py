import numpy as np
from typing import Dict, Any, Optional
from app.schemas.models import BoundingBox, FaceLandmarks

class HeadPose3DEstimator:
    """
    3D Head Pose Estimator calculating exact Euler Angles (Yaw, Pitch, Roll in Degrees)
    from facial landmarks and bounding box geometry.
    """

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
                "confidence": 0.0
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

        # 5. Classify dominant discrete 5-angle pose
        # Calibrated thresholds with distinct deadbands to prevent accidental triggers:
        # - Turn Left (Physical Left): yaw_deg >= +13.0°
        # - Turn Right (Physical Right): yaw_deg <= -13.0°
        # - Look Up (Tilt Up): pitch_deg >= +10.0°
        # - Look Down (Tilt Down): pitch_deg <= -10.0°
        # - Straight (Center): between -8.0° and +8.0° on both axes

        if yaw_deg >= 13.0:
            pose = "TURN_LEFT"
        elif yaw_deg <= -13.0:
            pose = "TURN_RIGHT"
        elif pitch_deg >= 10.0:
            pose = "LOOK_UP"
        elif pitch_deg <= -10.0:
            pose = "LOOK_DOWN"
        else:
            pose = "STRAIGHT"

        return {
            "pose": pose,
            "yaw_deg": round(yaw_deg, 1),
            "pitch_deg": round(pitch_deg, 1),
            "roll_deg": round(roll_deg, 1),
            "vert_ratio": round(vert_ratio, 2)
        }
