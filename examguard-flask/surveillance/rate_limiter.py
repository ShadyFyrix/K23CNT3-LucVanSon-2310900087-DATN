# ==============================================================================
# EXAMGUARD AI - RATE LIMITER & CLIENT OVERLOAD PROTECTOR
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# ==============================================================================

import time
import threading
from typing import Dict, Tuple, Optional, Any
from .config import SurveillanceConfig

class ClientRateLimiter:
    """
    Bộ giới hạn tần suất gửi frame từ máy thí sinh (Token Bucket / Sliding Window)
    Ngăn chặn việc thí sinh spam frame hoặc script client bị lặp vô tận làm quá tải server.
    """
    def __init__(self, min_interval_sec: float = SurveillanceConfig.CLIENT_MIN_REQUEST_INTERVAL_SEC):
        self.min_interval_sec = min_interval_sec
        self._lock = threading.Lock()
        # Lưu trữ: sessionStudentId -> (last_timestamp, last_result_cache)
        self._clients: Dict[str, Tuple[float, Optional[Dict[str, Any]]]] = {}
        self._dropped_count = 0
        self._allowed_count = 0

    def check_and_update(self, client_id: str) -> Tuple[bool, float, Optional[Dict[str, Any]]]:
        """
        Kiểm tra xem request từ client_id có được phép thực thi không.
        Trả về: (is_allowed, time_elapsed, cached_result)
        """
        now = time.time()
        with self._lock:
            if client_id in self._clients:
                last_time, cached_result = self._clients[client_id]
                elapsed = now - last_time
                if elapsed < self.min_interval_sec:
                    self._dropped_count += 1
                    return False, elapsed, cached_result
            
            # Cập nhật thời gian mới
            self._clients[client_id] = (now, None)
            self._allowed_count += 1
            return True, self.min_interval_sec, None

    def store_cache(self, client_id: str, result: Dict[str, Any]):
        """Lưu lại kết quả phân tích gần nhất để trả về ngay khi client bị rate limit"""
        with self._lock:
            if client_id in self._clients:
                last_time, _ = self._clients[client_id]
                self._clients[client_id] = (last_time, result)

    def cleanup_stale_clients(self, max_idle_sec: float = 300.0):
        """Dọn dẹp các thí sinh đã rời khỏi phòng thi sau 5 phút không có tín hiệu"""
        now = time.time()
        with self._lock:
            stale_keys = [k for k, (t, _) in self._clients.items() if now - t > max_idle_sec]
            for k in stale_keys:
                del self._clients[k]

    def get_stats(self) -> Dict[str, Any]:
        """Thống kê số lượng request được chấp thuận và số lượng bị cắt giảm tải"""
        with self._lock:
            return {
                "active_clients": len(self._clients),
                "allowed_requests": self._allowed_count,
                "dropped_burst_requests": self._dropped_count,
                "load_shedding_percentage": (
                    round((self._dropped_count / (self._allowed_count + self._dropped_count)) * 100, 2)
                    if (self._allowed_count + self._dropped_count) > 0 else 0.0
                )
            }
