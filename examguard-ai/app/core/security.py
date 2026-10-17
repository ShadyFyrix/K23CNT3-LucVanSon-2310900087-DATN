import hmac
import hashlib
import time
from fastapi import HTTPException, status
from starlette.requests import HTTPConnection
from starlette.websockets import WebSocket
from app.config import settings

async def verify_internal_service_signature(conn: HTTPConnection):
    """
    Xác thực chữ ký số HMAC-SHA256 giữa Node.js Gateway và Python Face AI Service:
    - Ngăn chặn truy cập trái phép trực tiếp vào cổng 8000
    - Chống giả mạo lệnh gọi AI từ client ngoài
    - Giới hạn thời gian hiệu lực trong 60 giây (Time Drift <= 60s)
    """
    if not settings.ENABLE_INTERNAL_HMAC:
        return True

    # Nếu là luồng WebSocket realtime
    if isinstance(conn, WebSocket):
        # Cho phép luồng nội bộ hoặc kiểm tra query token nếu cần
        return True

    timestamp_str = conn.headers.get("x-internal-timestamp")
    signature = conn.headers.get("x-internal-signature")

    if not timestamp_str or not signature:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bảo mật liên dịch vụ: Thiếu Header chữ ký HMAC (X-Internal-Timestamp, X-Internal-Signature)."
        )

    try:
        timestamp = int(timestamp_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Bảo mật liên dịch vụ: X-Internal-Timestamp không đúng định dạng mili-giây."
        )

    # 1. Kiểm tra độ lệch thời gian giữa Node.js và Python (tối đa 60 giây)
    now_ms = int(time.time() * 1000)
    drift = abs(now_ms - timestamp)
    if drift > 60000:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Bảo mật liên dịch vụ: Chữ ký đã hết hạn (Độ trôi thời gian: {drift}ms > 60000ms)."
        )

    # 2. Xây dựng Canonical String và tính toán lại chữ ký HMAC-SHA256
    # Chuỗi chuẩn: METHOD\nPATH\nTIMESTAMP
    canonical_string = f"{conn.method.upper()}\n{conn.url.path}\n{timestamp_str}"
    
    expected_sig = hmac.new(
        settings.INTERNAL_AI_SECRET.encode("utf-8"),
        canonical_string.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

    # 3. So khớp an toàn bằng constant-time comparison
    if not hmac.compare_digest(expected_sig, signature):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Bảo mật liên dịch vụ: Chữ ký HMAC không khớp. Truy cập bị từ chối!"
        )

    return True
