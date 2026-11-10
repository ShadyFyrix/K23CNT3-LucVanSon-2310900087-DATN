# ==============================================================================
# EXAMGUARD AI - IMMOBILITY & VIDEO LOOP DETECTOR (KINETIC ENERGY ANALYZER)
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# ==============================================================================

import time
import cv2
import numpy as np
from typing import Dict, Any, Tuple, Optional
from .config import SurveillanceConfig

class ImmobilityAnalyzer:
    """
    Phân tích và phát hiện sự bất động kéo dài (Prolonged Immobility / Freeze Frame Video Loop)
    Áp dụng thuật toán đo năng lượng động học vi phân (Kinetic Motion Energy Delta).
    Thiết kế Zero-Memory Footprint để phục vụ hàng ngàn thí sinh mà không tốn RAM.
    """
    def __init__(
        self,
        time_threshold_sec: float = SurveillanceConfig.IMMOBILITY_TIME_THRESHOLD_SEC,
        energy_epsilon: float = SurveillanceConfig.IMMOBILITY_ENERGY_EPSILON
    ):
        self.time_threshold_sec = time_threshold_sec
        self.energy_epsilon = energy_epsilon
        
        # Lưu trữ trạng thái theo entity_id (sessionStudentId hoặc cctv_desk_id):
        # entity_id -> {
        #   "last_motion_time": float,
        #   "prev_tiny_gray": np.ndarray (64x48 px),
        #   "cumulative_immobile_sec": float
        # }
        self._states: Dict[str, Dict[str, Any]] = {}

    def update_and_check(self, entity_id: str, frame_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Cập nhật frame và đánh giá xem thực thể có đang bị bất động bất thường không.
        """
        now = time.time()
        
        if frame_bgr is None or frame_bgr.size == 0:
            return {
                "is_immobile": False,
                "immobile_duration_sec": 0.0,
                "motion_energy": 0.0
            }

        # 1. Thu nhỏ ảnh về kích thước siêu nhỏ (64x48) ảnh xám để đo biến thiên chuyển động vi sai
        tiny_gray = cv2.resize(cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2GRAY), (64, 48), interpolation=cv2.INTER_AREA)

        if entity_id not in self._states:
            self._states[entity_id] = {
                "last_motion_time": now,
                "prev_tiny_gray": tiny_gray,
                "cumulative_immobile_sec": 0.0
            }
            return {
                "is_immobile": False,
                "immobile_duration_sec": 0.0,
                "motion_energy": 1.0  # Coi như có chuyển động ở frame đầu tiên
            }

        state = self._states[entity_id]
        prev_tiny = state["prev_tiny_gray"]

        # 2. Tính toán năng lượng động học chuyển động (Mean Absolute Difference chuẩn hóa)
        diff = cv2.absdiff(tiny_gray, prev_tiny)
        motion_energy = float(np.mean(diff) / 255.0)

        # Cập nhật frame cũ
        state["prev_tiny_gray"] = tiny_gray

        # 3. Đánh giá ngưỡng chuyển động
        if motion_energy >= self.energy_epsilon:
            # Phát hiện chuyển động sinh học (chớp mắt, thở, cử động tay)
            state["last_motion_time"] = now
            state["cumulative_immobile_sec"] = 0.0
            is_immobile = False
        else:
            # Không có chuyển động đáng kể
            immobile_sec = now - state["last_motion_time"]
            state["cumulative_immobile_sec"] = immobile_sec
            is_immobile = immobile_sec >= self.time_threshold_sec

        return {
            "is_immobile": is_immobile,
            "immobile_duration_sec": round(state["cumulative_immobile_sec"], 1),
            "motion_energy": round(motion_energy, 4)
        }

    def remove_entity(self, entity_id: str):
        """Giải phóng bộ nhớ khi thí sinh nộp bài hoặc kết thúc giám sát"""
        if entity_id in self._states:
            del self._states[entity_id]
