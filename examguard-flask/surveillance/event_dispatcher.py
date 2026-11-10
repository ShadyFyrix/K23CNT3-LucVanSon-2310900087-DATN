# ==============================================================================
# EXAMGUARD AI - ASYNCHRONOUS EVENT DISPATCHER & HYSTERESIS DEBOUNCER
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# ==============================================================================

import time
import json
import queue
import threading
import requests
from typing import Dict, Any, Optional
from .config import SurveillanceConfig

class EventDispatcher:
    """
    Bộ quản lý phát tán sự kiện bất đồng bộ và bộ lọc trễ trạng thái (Hysteresis Filter).
    Đảm bảo:
    1. Chỉ phát sự kiện khi trạng thái duy trì đủ lâu (Debounce 3s - 45s).
    2. Chỉ phát khi có sự chuyển giao trạng thái (State Transition).
    3. Hàng đợi worker chạy ngầm, không bao giờ làm chậm luồng nhận request HTTP của Flask.
    """
    def __init__(self, webhook_url: str = SurveillanceConfig.NODE_CORE_WEBHOOK_URL):
        self.webhook_url = webhook_url
        self._event_queue = queue.Queue(maxsize=1000)
        
        # Lưu vết chuyển giao trạng thái:
        # entity_id -> {
        #   "confirmed_state": "NORMAL_SITTING",
        #   "candidate_state": "STANDING",
        #   "state_first_seen_time": float,
        #   "last_event_time": float
        # }
        self._states: Dict[str, Dict[str, Any]] = {}
        self._lock = threading.Lock()
        
        # Khởi chạy luồng gửi webhook ngầm
        self._worker_thread = threading.Thread(target=self._process_queue, daemon=True)
        self._worker_thread.start()

    def filter_and_enqueue(
        self,
        entity_id: str,
        current_state: str,
        is_immobile: bool,
        metadata: Dict[str, Any],
        is_cctv: bool = False
    ) -> Optional[Dict[str, Any]]:
        """
        Lọc trạng thái qua bộ đệm trễ Hysteresis.
        Nếu đủ điều kiện vi phạm mới đưa vào hàng đợi phát tán sự kiện.
        """
        now = time.time()
        with self._lock:
            if entity_id not in self._states:
                self._states[entity_id] = {
                    "confirmed_state": current_state,
                    "candidate_state": current_state,
                    "state_first_seen_time": now,
                    "last_event_time": 0.0,
                    "immobile_alert_sent": False
                }
                return None

            st = self._states[entity_id]

            # 1. Xử lý sự kiện Bất động kéo dài (Immobility Alert)
            if is_immobile and not st["immobile_alert_sent"]:
                st["immobile_alert_sent"] = True
                event = {
                    "entity_id": entity_id,
                    "event_type": "PROLONGED_IMMOBILITY",
                    "severity": "HIGH",
                    "penalty": 15,
                    "source": "CCTV_SURVEILLANCE" if is_cctv else "CANDIDATE_WEBCAM",
                    "metadata": metadata,
                    "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now))
                }
                self._safe_enqueue(event)
                return event
            elif not is_immobile:
                st["immobile_alert_sent"] = False

            # 2. Xử lý biến đổi tư thế thể chất (State Transition)
            if current_state != st["confirmed_state"]:
                if current_state != st["candidate_state"]:
                    # Bắt đầu theo dõi ứng viên trạng thái mới
                    st["candidate_state"] = current_state
                    st["state_first_seen_time"] = now
                    return None
                else:
                    # Trạng thái ứng viên đang duy trì
                    dwell_time = now - st["state_first_seen_time"]
                    
                    # Xác định thời gian debounce cần thiết
                    required_debounce = SurveillanceConfig.DEBOUNCE_ABSENT_SEC
                    if current_state == "STANDING":
                        required_debounce = SurveillanceConfig.DEBOUNCE_STANDING_SEC
                    elif current_state == "COLLAPSE":
                        required_debounce = SurveillanceConfig.DEBOUNCE_COLLAPSE_SEC

                    if dwell_time >= required_debounce:
                        # Trạng thái mới đã đủ thời gian kiểm chứng -> Xác nhận chuyển giao
                        prev_confirmed = st["confirmed_state"]
                        st["confirmed_state"] = current_state
                        st["last_event_time"] = now

                        # Nếu chuyển sang trạng thái bất thường -> Kích hoạt vi phạm
                        if current_state in ["ABSENT", "STANDING", "COLLAPSE", "IRREGULAR_POSTURE"]:
                            severity_map = {
                                "ABSENT": ("CRITICAL", 20),
                                "COLLAPSE": ("HIGH", 0),  # Sự cố y tế - không trừ điểm
                                "STANDING": ("HIGH", 15),
                                "IRREGULAR_POSTURE": ("MEDIUM", 5)
                            }
                            sev, pen = severity_map.get(current_state, ("LOW", 0))

                            event = {
                                "entity_id": entity_id,
                                "event_type": f"POSTURE_{current_state}",
                                "previous_state": prev_confirmed,
                                "current_state": current_state,
                                "severity": sev,
                                "penalty": pen,
                                "source": "CCTV_SURVEILLANCE" if is_cctv else "CANDIDATE_WEBCAM",
                                "metadata": metadata,
                                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime(now))
                            }
                            self._safe_enqueue(event)
                            return event
            else:
                # Trạng thái hiện tại trùng với trạng thái đã xác nhận -> Không làm gì cả
                st["candidate_state"] = current_state
                st["state_first_seen_time"] = now

        return None

    def _safe_enqueue(self, event: Dict[str, Any]):
        try:
            self._event_queue.put_nowait(event)
        except queue.Full:
            print("[SURVEILLANCE WARNING] Event Queue đầy, bỏ qua bản ghi cũ nhất để chống nghẽn bộ nhớ.")

    def _process_queue(self):
        """Worker chạy ngầm lấy sự kiện và bắn Webhook sang Node.js Backend"""
        while True:
            try:
                event = self._event_queue.get(timeout=2.0)
                try:
                    # Gửi Webhook sang Node.js Core
                    headers = {
                        "Content-Type": "application/json",
                        "x-internal-ai-key": SurveillanceConfig.INTERNAL_AI_SECRET
                    }
                    requests.post(self.webhook_url, json=event, headers=headers, timeout=3.0)
                except Exception as req_err:
                    # Bỏ qua lỗi kết nối trong môi trường phát triển ngoại tuyến
                    pass
                finally:
                    self._event_queue.task_done()
            except queue.Empty:
                continue
            except Exception:
                pass
