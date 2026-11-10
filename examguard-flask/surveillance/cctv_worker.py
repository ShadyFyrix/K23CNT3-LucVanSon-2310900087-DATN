# ==============================================================================
# EXAMGUARD AI - CCTV STREAM MANAGER & FRAME DECIMATION WORKER POOL
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# ==============================================================================

import time
import queue
import threading
import cv2
import numpy as np
from typing import Dict, Any, List, Optional
from .config import SurveillanceConfig
from .posture_classifier import PostureClassifier
from .immobility_analyzer import ImmobilityAnalyzer
from .event_dispatcher import EventDispatcher

import sys
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass

class CCTVCameraWorker:
    """
    Tiến trình/Luồng độc lập phụ trách 1 Camera CCTV Phòng Thi:
    - Kéo luồng RTSP 1080p@30fps từ camera
    - Lấy mẫu thưa (FPS Decimation): Chỉ đưa 2.5 - 3.0 FPS vào pipeline AI
    - Vòng đệm 1-Slot không chặn (Single-Slot Ring Buffer): Không bao giờ trễ hình tích lũy
    - Tự động kết nối lại khi mất mạng (Watchdog Auto-reconnect)
    """
    def __init__(
        self,
        room_id: str,
        stream_url: str,
        classifier: PostureClassifier,
        immobility: ImmobilityAnalyzer,
        dispatcher: EventDispatcher,
        target_fps: float = SurveillanceConfig.CCTV_TARGET_FPS
    ):
        self.room_id = room_id
        self.stream_url = stream_url
        self.classifier = classifier
        self.immobility = immobility
        self.dispatcher = dispatcher
        self.target_fps = target_fps
        self.sample_interval = 1.0 / target_fps

        self.is_running = False
        self._stop_event = threading.Event()
        self._worker_thread: Optional[threading.Thread] = None
        
        # Thống kê hiệu năng
        self.total_frames_read = 0
        self.frames_analyzed = 0
        self.frames_dropped = 0
        self.last_analysis_time = 0.0
        self.current_state = "NORMAL_SITTING"
        self.last_error = ""

    def start(self):
        """Khởi động luồng giám sát camera CCTV"""
        if self.is_running:
            return
        self.is_running = True
        self._stop_event.clear()
        self._worker_thread = threading.Thread(target=self._run_loop, daemon=True)
        self._worker_thread.start()
        print(f"[CCTV] Đã khởi chạy giám sát Camera Phòng thi: {self.room_id} -> {self.stream_url}")

    def stop(self):
        """Dừng luồng an toàn"""
        self.is_running = False
        self._stop_event.set()
        if self._worker_thread and self._worker_thread.is_alive():
            self._worker_thread.join(timeout=2.0)
        print(f"[CCTV] Đã dừng Camera Phòng thi: {self.room_id}")

    def _run_loop(self):
        while not self._stop_event.is_set():
            cap = None
            try:
                # Mở kết nối RTSP / Video file
                cap = cv2.VideoCapture(self.stream_url)
                # Đặt kích thước buffer nội bộ của OpenCV bằng 1 để giảm lag
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

                if not cap.isOpened():
                    self.last_error = f"Không thể mở luồng: {self.stream_url}"
                    time.sleep(SurveillanceConfig.CCTV_RECONNECT_TIMEOUT_SEC)
                    continue

                last_sample_time = 0.0

                while not self._stop_event.is_set() and cap.isOpened():
                    ret = cap.grab()
                    if not ret:
                        self.last_error = "Mất tín hiệu từ camera (Frame Grab Failed)"
                        break

                    self.total_frames_read += 1
                    now = time.time()

                    # FPS Decimation: Chỉ lấy mẫu khi đã trôi qua đủ chu kỳ sample_interval (ví dụ: 330ms cho 3 FPS)
                    if (now - last_sample_time) >= self.sample_interval:
                        ret_retrieve, frame = cap.retrieve()
                        if not ret_retrieve or frame is None:
                            continue

                        last_sample_time = now
                        self.frames_analyzed += 1

                        # Phân tích tư thế và kiểm tra bất động
                        analysis = self.classifier.analyze_frame(frame, is_cctv=True)
                        posture_state = analysis.get("posture_state", "NORMAL_SITTING")
                        
                        immobility_res = self.immobility.update_and_check(f"cctv_{self.room_id}", frame)
                        is_immobile = immobility_res.get("is_immobile", False)

                        self.current_state = posture_state

                        # Bắn qua bộ lọc trễ Debounce & Webhook
                        metadata = {
                            "room_id": self.room_id,
                            "angles": analysis.get("angles", {}),
                            "confidence": analysis.get("confidence", 0.0),
                            "motion_energy": immobility_res.get("motion_energy", 0.0),
                            "immobile_duration": immobility_res.get("immobile_duration_sec", 0.0)
                        }
                        self.dispatcher.filter_and_enqueue(
                            entity_id=f"room_{self.room_id}",
                            current_state=posture_state,
                            is_immobile=is_immobile,
                            metadata=metadata,
                            is_cctv=True
                        )
                    else:
                        # Bỏ qua frame để giải phóng CPU (Load Shedding)
                        self.frames_dropped += 1

            except Exception as e:
                self.last_error = str(e)
            finally:
                if cap is not None:
                    cap.release()

            if not self._stop_event.is_set():
                time.sleep(SurveillanceConfig.CCTV_RECONNECT_TIMEOUT_SEC)

    def get_status(self) -> Dict[str, Any]:
        """Lấy thông số giám sát hiện thời của camera"""
        drop_rate = (
            round((self.frames_dropped / (self.total_frames_read + 1e-6)) * 100, 2)
            if self.total_frames_read > 0 else 0.0
        )
        return {
            "room_id": self.room_id,
            "stream_url": self.stream_url,
            "is_running": self.is_running,
            "total_frames_read": self.total_frames_read,
            "frames_analyzed": self.frames_analyzed,
            "frames_dropped": self.frames_dropped,
            "drop_rate_percentage": drop_rate,
            "current_state": self.current_state,
            "last_error": self.last_error
        }


class CCTVStreamManager:
    """
    Quản lý tập trung toàn bộ các luồng Camera CCTV của các phòng thi
    """
    def __init__(
        self,
        classifier: PostureClassifier,
        immobility: ImmobilityAnalyzer,
        dispatcher: EventDispatcher
    ):
        self.classifier = classifier
        self.immobility = immobility
        self.dispatcher = dispatcher
        self._cameras: Dict[str, CCTVCameraWorker] = {}
        self._lock = threading.Lock()

    def register_camera(self, room_id: str, stream_url: str, target_fps: float = 3.0) -> Dict[str, Any]:
        with self._lock:
            if room_id in self._cameras:
                self._cameras[room_id].stop()

            worker = CCTVCameraWorker(
                room_id=room_id,
                stream_url=stream_url,
                classifier=self.classifier,
                immobility=self.immobility,
                dispatcher=self.dispatcher,
                target_fps=target_fps
            )
            self._cameras[room_id] = worker
            worker.start()
            return worker.get_status()

    def stop_camera(self, room_id: str) -> bool:
        with self._lock:
            if room_id in self._cameras:
                self._cameras[room_id].stop()
                del self._cameras[room_id]
                return True
            return False

    def get_all_status(self) -> List[Dict[str, Any]]:
        with self._lock:
            return [cam.get_status() for cam in self._cameras.values()]

    def stop_all(self):
        with self._lock:
            for cam in self._cameras.values():
                cam.stop()
            self._cameras.clear()
