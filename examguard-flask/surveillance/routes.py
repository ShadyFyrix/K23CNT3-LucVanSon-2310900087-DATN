# ==============================================================================
# EXAMGUARD AI - SURVEILLANCE FLASK BLUEPRINT ROUTES
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# ==============================================================================

import time
import base64
import cv2
import numpy as np
from flask import Blueprint, request, jsonify
from .config import SurveillanceConfig
from .rate_limiter import ClientRateLimiter
from .posture_classifier import PostureClassifier
from .immobility_analyzer import ImmobilityAnalyzer
from .event_dispatcher import EventDispatcher
from .cctv_worker import CCTVStreamManager

# Khởi tạo Blueprint
surveillance_bp = Blueprint("surveillance", __name__, url_prefix="/api/surveillance")

# Khởi tạo Singleton Core Services
rate_limiter = ClientRateLimiter(min_interval_sec=SurveillanceConfig.CLIENT_MIN_REQUEST_INTERVAL_SEC)
posture_classifier = PostureClassifier()
immobility_analyzer = ImmobilityAnalyzer()
event_dispatcher = EventDispatcher()
cctv_manager = CCTVStreamManager(
    classifier=posture_classifier,
    immobility=immobility_analyzer,
    dispatcher=event_dispatcher
)

def _decode_image_from_request(req) -> np.ndarray:
    """Giải mã hình ảnh từ multipart file upload hoặc Base64 JSON"""
    # 1. Kiểm tra Multipart File
    if "frame" in req.files:
        file_storage = req.files["frame"]
        file_bytes = file_storage.read()
        nparr = np.frombuffer(file_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    # 2. Kiểm tra JSON Base64
    data = req.get_json(silent=True)
    if data and "frameBase64" in data:
        base64_str = data["frameBase64"]
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    return None

# ------------------------------------------------------------------------------
# 1. CANDIDATE WEBCAM INSPECTION (MÁY THÍ SINH - CHỐNG NGHẼN & RATE LIMITING)
# ------------------------------------------------------------------------------
@surveillance_bp.route("/candidate/inspect-frame", methods=["POST"])
def inspect_candidate_frame():
    """
    Endpoint nhận frame từ máy thí sinh (ReactJS TakeExam).
    Tích hợp bộ đệm kiểm soát Token Bucket để server không bị quá tải.
    """
    student_id = request.form.get("sessionStudentId") or (request.json and request.json.get("sessionStudentId"))
    if not student_id:
        student_id = "anonymous_candidate"

    # 1. Kiểm tra giới hạn tần suất Token Bucket (Chống Spam / DoS từ phía Client)
    allowed, elapsed, cached_result = rate_limiter.check_and_update(student_id)
    if not allowed and cached_result is not None:
        # Trả về ngay kết quả cache gần nhất, không tính toán lại AI để bảo vệ CPU
        return jsonify({
            "success": True,
            "rate_limited": True,
            "cached": True,
            "elapsed_since_last_req_sec": round(elapsed, 2),
            **cached_result
        })

    # 2. Giải mã hình ảnh
    frame = _decode_image_from_request(request)
    if frame is None:
        return jsonify({
            "success": False,
            "message": "Không tìm thấy dữ liệu ảnh (Cần gửi multipart 'frame' hoặc 'frameBase64')."
        }), 400

    # 3. Phân tích tư thế thể chất (Posture Kinematics)
    analysis = posture_classifier.analyze_frame(frame, is_cctv=False)
    posture_state = analysis.get("posture_state", "NORMAL_SITTING")

    # 4. Kiểm tra bất động kéo dài (Immobility Tracking)
    immobility_res = immobility_analyzer.update_and_check(student_id, frame)
    is_immobile = immobility_res.get("is_immobile", False)

    # 5. Lọc qua bộ đệm trễ Hysteresis & Phát tán sự kiện vi phạm
    metadata = {
        "student_id": student_id,
        "angles": analysis.get("angles", {}),
        "confidence": analysis.get("confidence", 0.0),
        "motion_energy": immobility_res.get("motion_energy", 0.0),
        "immobile_duration": immobility_res.get("immobile_duration_sec", 0.0)
    }
    violation_event = event_dispatcher.filter_and_enqueue(
        entity_id=student_id,
        current_state=posture_state,
        is_immobile=is_immobile,
        metadata=metadata,
        is_cctv=False
    )

    detected_event = "NORMAL"
    penalty = 0
    if violation_event:
        detected_event = violation_event.get("event_type", "NORMAL")
        penalty = violation_event.get("penalty", 0)

    response_data = {
        "posture_state": posture_state,
        "is_absent": analysis.get("is_absent", False),
        "is_immobile": is_immobile,
        "immobile_duration_sec": immobility_res.get("immobile_duration_sec", 0.0),
        "motion_energy": immobility_res.get("motion_energy", 0.0),
        "confidence": analysis.get("confidence", 0.0),
        "angles": analysis.get("angles", {}),
        "detected_event": detected_event,
        "penalty": penalty,
        "inference_ms": analysis.get("inference_ms", 0.0),
        "engine": analysis.get("engine", "UNKNOWN")
    }

    # Lưu cache phục vụ rate limiting
    rate_limiter.store_cache(student_id, response_data)

    return jsonify({
        "success": True,
        "rate_limited": False,
        **response_data
    })

# ------------------------------------------------------------------------------
# 2. ROOM CCTV STREAM MANAGEMENT (CAMERA PHÒNG THI)
# ------------------------------------------------------------------------------
@surveillance_bp.route("/cctv/register", methods=["POST"])
def register_cctv():
    """Đăng ký và bắt đầu giám sát một luồng RTSP camera phòng thi"""
    data = request.get_json(silent=True) or request.form
    room_id = data.get("roomId")
    stream_url = data.get("streamUrl")
    target_fps = float(data.get("targetFps", SurveillanceConfig.CCTV_TARGET_FPS))

    if not room_id or not stream_url:
        return jsonify({"success": False, "message": "Yêu cầu cung cấp roomId và streamUrl."}), 400

    status = cctv_manager.register_camera(room_id, stream_url, target_fps)
    return jsonify({
        "success": True,
        "message": f"Đã đăng ký và kích hoạt luồng camera phòng thi {room_id}.",
        "camera": status
    })

@surveillance_bp.route("/cctv/stop", methods=["POST"])
def stop_cctv():
    """Dừng giám sát luồng camera phòng thi"""
    data = request.get_json(silent=True) or request.form
    room_id = data.get("roomId")
    if not room_id:
        return jsonify({"success": False, "message": "Yêu cầu cung cấp roomId."}), 400

    stopped = cctv_manager.stop_camera(room_id)
    return jsonify({
        "success": stopped,
        "message": f"Đã dừng camera phòng {room_id}." if stopped else f"Không tìm thấy camera phòng {room_id}."
    })

@surveillance_bp.route("/cctv/streams", methods=["GET"])
def list_cctv_streams():
    """Xem danh sách các camera CCTV phòng thi đang hoạt động cùng số liệu FPS"""
    cameras = cctv_manager.get_all_status()
    return jsonify({
        "success": True,
        "total_active_cameras": len(cameras),
        "streams": cameras
    })

# ------------------------------------------------------------------------------
# 3. METRICS & CAPACITY BENCHMARK
# ------------------------------------------------------------------------------
@surveillance_bp.route("/metrics", methods=["GET"])
def get_surveillance_metrics():
    """Lấy số liệu thống kê chống quá tải và tải trọng hệ thống"""
    rate_stats = rate_limiter.get_stats()
    cctv_stats = cctv_manager.get_all_status()
    return jsonify({
        "success": True,
        "engine": posture_classifier.engine_type,
        "client_rate_limiter": rate_stats,
        "active_cctv_streams": len(cctv_stats),
        "cctv_details": cctv_stats,
        "config": {
            "max_workers": SurveillanceConfig.MAX_WORKER_THREADS,
            "client_min_interval_sec": SurveillanceConfig.CLIENT_MIN_REQUEST_INTERVAL_SEC,
            "cctv_target_fps": SurveillanceConfig.CCTV_TARGET_FPS,
            "debounce_absent_sec": SurveillanceConfig.DEBOUNCE_ABSENT_SEC,
            "immobility_threshold_sec": SurveillanceConfig.IMMOBILITY_TIME_THRESHOLD_SEC
        }
    })
