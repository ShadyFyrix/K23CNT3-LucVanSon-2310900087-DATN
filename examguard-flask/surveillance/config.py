# ==============================================================================
# EXAMGUARD AI - SURVEILLANCE & ANTI-OVERLOAD CONFIGURATION
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# ==============================================================================

import os

class SurveillanceConfig:
    # 1. HẠ TẦNG THỰC THI ĐA LUỒNG & BỘ ĐỆM
    MAX_WORKER_THREADS = int(os.getenv("SURVEILLANCE_MAX_WORKERS", 16))
    
    # 2. TỐI ƯU HÓA MÁY THÍ SINH (CANDIDATE WEBCAM)
    # Tần suất tối thiểu giữa 2 lần gửi liên tiếp (Token Bucket Rate Limiting)
    CLIENT_MIN_REQUEST_INTERVAL_SEC = float(os.getenv("CLIENT_MIN_REQUEST_INTERVAL", 4.5))
    # Kích thước frame tối ưu hóa cho máy thí sinh (Downscaling)
    CLIENT_FRAME_MAX_WIDTH = 320
    CLIENT_FRAME_MAX_HEIGHT = 240
    
    # 3. TỐI ƯU HÓA CAMERA PHÒNG THI (ROOM CCTV RTSP)
    # Tần suất lấy mẫu thưa từ luồng RTSP (FPS Decimation): 2.5 - 3.0 FPS thay vì 30 FPS
    CCTV_TARGET_FPS = float(os.getenv("CCTV_TARGET_FPS", 3.0))
    CCTV_SAMPLE_INTERVAL_SEC = 1.0 / CCTV_TARGET_FPS
    # Kích thước frame phân tích CCTV
    CCTV_FRAME_WIDTH = 640
    CCTV_FRAME_HEIGHT = 360
    # Dung lượng buffer nhận luồng (Single-Slot Ring Buffer để loại trừ độ trễ tích lũy)
    CCTV_BUFFER_MAXSIZE = 1
    # Thời gian timeout tự động kết nối lại khi mất luồng RTSP (giây)
    CCTV_RECONNECT_TIMEOUT_SEC = 5.0

    # 4. BỘ LỌC TRỄ TRẠNG THÁI & CHỐNG SPAM (HYSTERESIS FILTER)
    # Thời gian duy trì trạng thái liên tục để xác nhận vi phạm (Debounce)
    DEBOUNCE_ABSENT_SEC = 3.0      # Rời ghế liên tục > 3s mới kích hoạt
    DEBOUNCE_STANDING_SEC = 3.0    # Đứng dậy liên tục > 3s mới kích hoạt
    DEBOUNCE_COLLAPSE_SEC = 4.0    # Gục ngã liên tục > 4s mới kích hoạt
    
    # Ngưỡng phát hiện bất động bất thường (Immobility Thresholds)
    IMMOBILITY_TIME_THRESHOLD_SEC = 45.0  # Bất động liên tục > 45s
    IMMOBILITY_ENERGY_EPSILON = 0.008     # Ngưỡng biến thiên động năng tối thiểu

    # 5. ĐÍCH WEBHOOK & TÍCH HỢP HỆ THỐNG
    NODE_CORE_WEBHOOK_URL = os.getenv("NODE_CORE_WEBHOOK_URL", "http://localhost:3011/api/proctor/webhook")
    INTERNAL_AI_SECRET = os.getenv("INTERNAL_AI_SECRET", "FaceAI_Internal_Microservice_Secret_Key_999")
