from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class BoundingBox(BaseModel):
    x: int
    y: int
    width: int
    height: int

class Landmark(BaseModel):
    x: float
    y: float

class FaceLandmarks(BaseModel):
    right_eye: Landmark
    left_eye: Landmark
    nose_tip: Landmark
    mouth_right: Landmark
    mouth_left: Landmark

class QualityCheck(BaseModel):
    valid: bool
    brightness: float
    blur_score: float
    face_ratio: float
    reasons: List[str] = []

class LivenessCheck(BaseModel):
    is_live: bool
    score: float
    details: Dict[str, Any] = {}

class DetectedFace(BaseModel):
    bbox: BoundingBox
    landmarks: Optional[FaceLandmarks] = None
    confidence: float
    quality: QualityCheck
    liveness: Optional[LivenessCheck] = None

class FaceEnrollRequest(BaseModel):
    employee_id: str = Field(..., description="Unique Employee ID (e.g. EMP001)")
    full_name: Optional[str] = Field(None, description="Employee Full Name")
    department: Optional[str] = Field(None, description="Department or Division")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

class FaceEnrollResponse(BaseModel):
    success: bool
    employee_id: str
    message: str
    face_detected: bool
    quality_passed: bool
    image_saved_path: Optional[str] = None
    registered_angles: List[str] = []
    embeddings: Optional[Dict[str, List[float]]] = None
    reasons: List[str] = []

class FaceVerifyResponse(BaseModel):
    matched: bool
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    similarity: float
    threshold: float
    matched_angle: Optional[str] = None
    liveness_passed: bool
    liveness_score: float
    reasons: List[str] = []
    face_box: Optional[BoundingBox] = None

class FaceRecognitionCandidate(BaseModel):
    employee_id: str
    full_name: Optional[str] = None
    similarity: float
    matched_angle: Optional[str] = None

class FaceRecognizeResponse(BaseModel):
    matched: bool
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    similarity: float
    threshold: float
    matched_angle: Optional[str] = None
    liveness_passed: bool
    liveness_score: float
    candidates: List[FaceRecognitionCandidate] = []
    reasons: List[str] = []
    face_box: Optional[BoundingBox] = None

class EmployeeFaceProfile(BaseModel):
    employee_id: str
    full_name: Optional[str] = None
    department: Optional[str] = None
    created_at: str
    image_path: Optional[str] = None
    embedding_dim: int
    registered_angles: List[str] = ["straight"]

class HeadPoseInfo(BaseModel):
    pose: str = Field(..., description="STRAIGHT, TURN_LEFT, TURN_RIGHT, LOOK_UP, LOOK_DOWN")
    yaw_ratio: float
    pitch_ratio: float
    blink_detected: bool = False
    eye_open_score: float = 1.0

class FaceIdentityInfo(BaseModel):
    matched: bool = False
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    similarity: float = 0.0

class FaceActionDetectionResult(BaseModel):
    face_detected: bool
    bbox: Optional[BoundingBox] = None
    landmarks: Optional[FaceLandmarks] = None
    pose: Optional[HeadPoseInfo] = None
    quality: Optional[QualityCheck] = None
    liveness_score: float = 1.0
    identity: Optional[FaceIdentityInfo] = None



