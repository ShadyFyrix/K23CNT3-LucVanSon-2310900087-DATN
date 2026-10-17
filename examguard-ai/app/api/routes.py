import io
import base64
import numpy as np
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Query, WebSocket, WebSocketDisconnect
from app.services.face_service import FaceService
from app.schemas.models import (
    FaceEnrollResponse,
    FaceRecognizeResponse,
    FaceVerifyResponse,
    LivenessCheck,
    EmployeeFaceProfile,
    FaceActionDetectionResult
)

from app.core.liveness_checker import LivenessChecker
from app.config import settings

try:
    import cv2
except ImportError:
    cv2 = None

router = APIRouter(prefix="/v1", tags=["Face AI"])
face_service = FaceService()

def decode_image_file(file_bytes: bytes) -> Optional[np.ndarray]:
    """Decodes uploaded image bytes to BGR numpy array"""
    if cv2 is None or not file_bytes:
        return None
    nparr = np.frombuffer(file_bytes, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def decode_base64_image(base64_str: str) -> Optional[np.ndarray]:
    """Decodes base64 data URL string to BGR numpy array"""
    if not base64_str or cv2 is None:
        return None
    try:
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        img_bytes = base64.b64decode(base64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        return cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception:
        return None

@router.post("/face/enroll", response_model=FaceEnrollResponse, summary="Đăng ký khuôn mặt nhân viên")
async def enroll_face(
    image: UploadFile = File(..., description="Ảnh khuôn mặt rõ nét của nhân viên"),
    employee_id: str = Form(..., description="Mã nhân viên duy nhất (ví dụ: EMP001)"),
    full_name: Optional[str] = Form(None, description="Họ và tên nhân viên"),
    department: Optional[str] = Form(None, description="Phòng ban / Bộ phận"),
    check_quality: bool = Query(True, description="Kiểm tra chất lượng ảnh (độ nét, ánh sáng, kích thước)")
):
    contents = await image.read()
    img_bgr = decode_image_file(contents)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Không thể đọc định dạng ảnh được gửi lên.")

    response = face_service.enroll_employee(
        image_bgr=img_bgr,
        employee_id=employee_id.strip(),
        full_name=full_name.strip() if full_name else None,
        department=department.strip() if department else None,
        check_quality=check_quality
    )
    return response

@router.post("/face/enroll-multi-angle", response_model=FaceEnrollResponse, summary="Đăng ký 5 góc khuôn mặt (Chính diện, Trái, Phải, Trên, Dưới)")
async def enroll_face_multi_angle(
    image_straight: Optional[UploadFile] = File(None, description="Ảnh góc trực diện (Straight/Frontal)"),
    image_left: Optional[UploadFile] = File(None, description="Ảnh nghiêng trái (Turn Left)"),
    image_right: Optional[UploadFile] = File(None, description="Ảnh nghiêng phải (Turn Right)"),
    image_up: Optional[UploadFile] = File(None, description="Ảnh ngước lên (Look Up)"),
    image_down: Optional[UploadFile] = File(None, description="Ảnh cúi xuống (Look Down)"),
    image: Optional[UploadFile] = File(None, description="Ảnh đơn (Fallback góc chính diện)"),
    employee_id: str = Form(..., description="Mã nhân viên duy nhất (ví dụ: EMP001)"),
    full_name: Optional[str] = Form(None, description="Họ và tên nhân viên"),
    department: Optional[str] = Form(None, description="Phòng ban / Bộ phận"),
    check_quality: bool = Query(True, description="Kiểm tra chất lượng ảnh cho từng góc")
):
    """
    Đăng ký đa góc khuôn mặt (Hỗ trợ tối đa 5 góc: straight, left, right, up, down):
    - Trích xuất đặc trưng vector ArcFace 512 chiều riêng cho từng góc
    - Lưu trữ đồng bộ vào PostgreSQL (bảng employees, face_embeddings) và Vector Index
    - Giúp nhận diện cực kỳ chính xác ở mọi tư thế camera
    """
    images_dict: Dict[str, np.ndarray] = {}

    if image_straight:
        b = await image_straight.read()
        img = decode_image_file(b)
        if img is not None:
            images_dict["straight"] = img
    elif image:
        b = await image.read()
        img = decode_image_file(b)
        if img is not None:
            images_dict["straight"] = img

    if image_left:
        b = await image_left.read()
        img = decode_image_file(b)
        if img is not None:
            images_dict["left"] = img

    if image_right:
        b = await image_right.read()
        img = decode_image_file(b)
        if img is not None:
            images_dict["right"] = img

    if image_up:
        b = await image_up.read()
        img = decode_image_file(b)
        if img is not None:
            images_dict["up"] = img

    if image_down:
        b = await image_down.read()
        img = decode_image_file(b)
        if img is not None:
            images_dict["down"] = img

    if len(images_dict) == 0:
        raise HTTPException(status_code=400, detail="Vui lòng cung cấp ít nhất 1 ảnh khuôn mặt hợp lệ (khuyên dùng đủ 5 góc: straight, left, right, up, down).")

    response = face_service.enroll_employee_multi_angle(
        images_dict=images_dict,
        employee_id=employee_id.strip(),
        full_name=full_name.strip() if full_name else None,
        department=department.strip() if department else None,
        check_quality=check_quality
    )
    return response

@router.post("/face/recognize", response_model=FaceRecognizeResponse, summary="Nhận diện khuôn mặt (1:N Identification)")
async def recognize_face(
    image: UploadFile = File(..., description="Ảnh chụp từ camera chấm công"),
    threshold: float = Query(settings.SIMILARITY_THRESHOLD, description="Ngưỡng độ tương đồng cosine"),
    check_liveness: bool = Query(True, description="Bật kiểm tra chống giả mạo / Anti-Spoofing"),
    check_quality: bool = Query(True, description="Kiểm tra chất lượng ảnh trước khi nhận diện")
):
    contents = await image.read()
    img_bgr = decode_image_file(contents)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Không thể đọc định dạng ảnh.")

    response = face_service.recognize_face(
        image_bgr=img_bgr,
        threshold=threshold,
        check_liveness=check_liveness,
        check_quality=check_quality
    )
    return response

@router.post("/face/verify", response_model=FaceVerifyResponse, summary="Xác thực khuôn mặt theo mã NV (1:1 Verification)")
async def verify_face(
    image: UploadFile = File(..., description="Ảnh chụp từ camera"),
    employee_id: str = Form(..., description="Mã nhân viên cần đối chiếu"),
    threshold: float = Query(settings.SIMILARITY_THRESHOLD, description="Ngưỡng độ tương đồng"),
    check_liveness: bool = Query(True, description="Bật kiểm tra Liveness"),
    check_quality: bool = Query(True, description="Kiểm tra chất lượng ảnh")
):
    contents = await image.read()
    img_bgr = decode_image_file(contents)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Không thể đọc định dạng ảnh.")

    response = face_service.verify_employee(
        image_bgr=img_bgr,
        employee_id=employee_id.strip(),
        threshold=threshold,
        check_liveness=check_liveness,
        check_quality=check_quality
    )
    return response

@router.post("/face/liveness", response_model=LivenessCheck, summary="Kiểm tra Liveness / Chống giả mạo độc lập")
async def check_liveness(
    image: UploadFile = File(..., description="Ảnh chụp kiểm tra liveness")
):
    contents = await image.read()
    img_bgr = decode_image_file(contents)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Không thể đọc định dạng ảnh.")

    faces = face_service.detector.detect_faces(img_bgr)
    if not faces:
        raise HTTPException(status_code=400, detail="Không tìm thấy khuôn mặt trong ảnh.")

    return LivenessChecker.check_liveness(img_bgr, faces[0].bbox)

@router.post("/face/detect-pose", summary="Phát hiện Bounding Box và Tư thế khuôn mặt 5 góc thời gian thực")
async def detect_face_pose(
    image: UploadFile = File(..., description="Ảnh frame từ camera"),
    identify: bool = Query(False, description="Bật nhận diện danh tính ArcFace (mặc định False để tiết kiệm CPU)")
):
    contents = await image.read()
    img_bgr = decode_image_file(contents)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Không thể đọc định dạng ảnh.")

    result = face_service.detect_face_action(img_bgr, identify=identify)
    return result

@router.post("/detect_with_identity", summary="Alias phát hiện khuôn mặt & nhận diện danh tính realtime")
async def detect_face_with_identity(
    image: UploadFile = File(..., description="Ảnh frame từ camera")
):
    contents = await image.read()
    img_bgr = decode_image_file(contents)
    if img_bgr is None:
        raise HTTPException(status_code=400, detail="Không thể đọc định dạng ảnh.")

    result = face_service.detect_face_action(img_bgr, identify=True)
    return result

# ====================================================================
# WEBSOCKET REALTIME STREAMING FOR LIVE CAMERA ENROLLMENT & TRACKING
# ====================================================================
@router.websocket("/ws/face-stream")
async def websocket_face_stream(websocket: WebSocket):
    """
    WebSocket endpoint phục vụ theo dõi thời gian thực và tự động chụp 5 góc khuôn mặt:
    - Nhận frame liên tục từ webcam trình duyệt (base64)
    - Trả về Bounding Box, Landmarks, Tư thế hiện tại (STRAIGHT, TURN_LEFT, TURN_RIGHT, LOOK_UP, LOOK_DOWN)
    - Trả về kết quả khớp góc mục tiêu (target_angle) để UI tự động lưu ảnh khi đạt chuẩn
    """
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_json()
            frame_base64 = data.get("frame")
            target_angle = data.get("target_angle") # straight, left, right, up, down

            if not frame_base64:
                await websocket.send_json({"error": "Missing frame data"})
                continue

            img_bgr = decode_base64_image(frame_base64)
            if img_bgr is None:
                await websocket.send_json({"face_detected": False, "error": "Invalid frame"})
                continue

            action_res = face_service.detect_face_action(img_bgr, identify=False)

            # Check if current pose matches target angle
            target_matched = False
            pose_str = action_res.get("pose", {}).get("pose", "NONE") if action_res.get("face_detected") else "NONE"
            
            angle_map = {
                "straight": "STRAIGHT",
                "left": "TURN_LEFT",
                "right": "TURN_RIGHT",
                "up": "LOOK_UP",
                "down": "LOOK_DOWN"
            }

            if target_angle and angle_map.get(target_angle.lower()) == pose_str:
                # Also check quality
                quality = action_res.get("quality", {})
                if quality.get("valid", True):
                    target_matched = True

            action_res["target_angle"] = target_angle
            action_res["target_matched"] = target_matched

            await websocket.send_json(action_res)
    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass

@router.get("/faces/list", response_model=List[EmployeeFaceProfile], summary="Danh sách nhân viên đã lưu khuôn mặt")
async def list_registered_faces():
    return face_service.storage.list_faces()

@router.delete("/faces/clear-all", summary="Xoá toàn bộ cache và dữ liệu khuôn mặt")
async def clear_all_faces(delete_images: bool = Query(True, description="Xoá toàn bộ ảnh đã lưu trong thư mục")):
    deleted_count = face_service.storage.clear_all(delete_images=delete_images)
    return {
        "success": True,
        "message": f"Đã xoá thành công toàn bộ {deleted_count} hồ sơ khuôn mặt và dọn sạch cache!",
        "deleted_count": deleted_count
    }

@router.delete("/faces/{employee_id}", summary="Xoá khuôn mặt nhân viên")
async def delete_face(employee_id: str):
    success = face_service.storage.delete_face(employee_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Không tìm thấy nhân viên ID '{employee_id}'.")
    return {"success": True, "message": f"Đã xoá thành công dữ liệu khuôn mặt cho {employee_id}"}

