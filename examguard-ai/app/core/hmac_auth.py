import time
import hmac
import hashlib
from fastapi import Request, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings

def compute_hmac_signature(secret: str, method: str, path: str, timestamp_str: str) -> str:
    """
    Tạo chữ ký Canonical HMAC-SHA256 ràng buộc chặt chẽ với:
    - HTTP Method (GET, POST, DELETE, ...)
    - URL Path (/v1/face/recognize, /health, ...)
    - Timestamp (epoch seconds)
    Chống tấn công Replay Attack và ngăn chặn Payload/Endpoint Tampering.
    """
    canonical_payload = f"{method.upper()}:{path}:{timestamp_str}"
    return hmac.new(
        secret.encode("utf-8"),
        canonical_payload.encode("utf-8"),
        hashlib.sha256
    ).hexdigest()

class HmacInternalAuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware xác thực chữ ký HMAC giữa Node.js Backend và Python AI Microservice.
    - Ngăn chặn các kết nối trái phép gọi trực tiếp vào Python AI mà không qua Node.js CRM.
    - Chống tấn công Replay Attack bằng cách giới hạn độ lệch timestamp tối đa 45 giây.
    - Hỗ trợ cả Canonical Signature mới (Method + Path + Timestamp) và Legacy Signature (Timestamp).
    """
    async def dispatch(self, request: Request, call_next):
        # 1. Bỏ qua xác thực cho các route công khai (Health check, Swagger Docs, Web UI)
        public_paths = ["/", "/health", "/docs", "/openapi.json", "/redoc"]
        path = request.url.path

        if path in public_paths or path.startswith("/static") or not settings.REQUIRE_HMAC_AUTH:
            return await call_next(request)

        # Cho phép các request trực tiếp từ Web UI test hoặc Swagger Docs trên chính server Face AI (same-origin)
        referer = request.headers.get("referer", "")
        sec_fetch_site = request.headers.get("sec-fetch-site", "")
        is_same_origin = (sec_fetch_site == "same-origin") or any(
            h in referer for h in ["localhost:8000", "127.0.0.1:8000"]
        )
        if is_same_origin:
            return await call_next(request)

        # Chỉ áp dụng HMAC cho các API nhận diện / dữ liệu (/v1/*, /api/*)
        if not (path.startswith("/v1/") or path.startswith("/api/")):
            return await call_next(request)

        # 2. Kiểm tra IP nguồn (Chỉ cho phép localhost / mạng nội bộ)
        client_ip = request.client.host if request.client else None
        if client_ip:
            is_local = client_ip in ("127.0.0.1", "::1", "localhost", "testclient")
            is_private = (
                client_ip.startswith("192.168.") or
                client_ip.startswith("10.") or
                client_ip.startswith("172.")
            )
            if not (is_local or is_private):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "success": False,
                        "code": "EXTERNAL_ACCESS_DENIED",
                        "detail": f"Face AI chỉ cho phép truy cập từ localhost hoặc mạng nội bộ (IP: {client_ip})!"
                    }
                )

        # 3. Lấy Header xác thực HMAC
        timestamp_header = request.headers.get("x-internal-timestamp") or request.headers.get("X-Internal-Timestamp")
        signature_header = request.headers.get("x-internal-signature") or request.headers.get("X-Internal-Signature")
        method = request.method

        if not timestamp_header or not signature_header:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={
                    "success": False,
                    "code": "HMAC_AUTH_REQUIRED",
                    "detail": "Truy cập bị từ chối: Yêu cầu chữ ký bảo mật nội bộ (X-Internal-Signature & X-Internal-Timestamp)!"
                }
            )

        # 3. Kiểm tra Timestamp chống Replay Attack (sai lệch không quá 45 giây)
        try:
            req_time = int(timestamp_header)
            current_time = int(time.time())
            time_diff = abs(current_time - req_time)
            if time_diff > 45:
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "success": False,
                        "code": "HMAC_TIMESTAMP_EXPIRED",
                        "detail": f"Chữ ký đã hết hạn (Timestamp lệch {time_diff}s > 45s). Có nguy cơ bị Replay Attack!"
                    }
                )
        except ValueError:
            return JSONResponse(
                status_code=status.HTTP_400_BAD_REQUEST,
                content={
                    "success": False,
                    "code": "INVALID_TIMESTAMP_FORMAT",
                    "detail": "Định dạng timestamp không hợp lệ."
                }
            )

        # 4. Tính toán Canonical HMAC Signature mong đợi
        expected_sig = compute_hmac_signature(settings.INTERNAL_AI_SECRET, method, path, timestamp_header)

        # 5. So khớp chữ ký an toàn tránh Timing Attack
        if not hmac.compare_digest(expected_sig.lower(), signature_header.lower()):
            # Fallback legacy signature (chỉ timestamp) để tương thích ngược nếu Node.js chưa cập nhật
            legacy_sig = hmac.new(
                settings.INTERNAL_AI_SECRET.encode("utf-8"),
                timestamp_header.encode("utf-8"),
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(legacy_sig.lower(), signature_header.lower()):
                return JSONResponse(
                    status_code=status.HTTP_403_FORBIDDEN,
                    content={
                        "success": False,
                        "code": "HMAC_SIGNATURE_MISMATCH",
                        "detail": "Chữ ký bảo mật HMAC không chính xác hoặc không khớp với Method/Path được yêu cầu!"
                    }
                )

        return await call_next(request)
