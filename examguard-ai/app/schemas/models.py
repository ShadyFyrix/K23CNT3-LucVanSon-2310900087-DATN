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
    pose: str = Field(..., description="STRAIGHT, TURN_LEFT, TURN_RIGHT, LOOK_UP, LOOK_DOWN, PHONE_LOOK_DOWN, SUSPICIOUS_SIDE_LEFT, SUSPICIOUS_SIDE_RIGHT")
    yaw_ratio: float
    pitch_ratio: float
    yaw_deg: Optional[float] = None
    pitch_deg: Optional[float] = None
    roll_deg: Optional[float] = None
    vert_ratio: Optional[float] = None
    severity: str = "NONE"
    confidence: float = 1.0
    penalty_suggestion: int = 0
    blink_detected: bool = False
    eye_open_score: float = 1.0

class FaceIdentityInfo(BaseModel):
    matched: bool = False
    employee_id: Optional[str] = None
    full_name: Optional[str] = None
    similarity: float = 0.0

class FaceActionDetectionResult(BaseModel):
    face_detected: bool
    num_faces: int = 1
    bbox: Optional[BoundingBox] = None
    landmarks: Optional[FaceLandmarks] = None
    pose: Optional[HeadPoseInfo] = None
    quality: Optional[QualityCheck] = None
    liveness_score: float = 1.0
    identity: Optional[FaceIdentityInfo] = None
    all_poses: Optional[List[Dict[str, Any]]] = None

class ProctorBatchItem(BaseModel):
    frame_id: str
    image_base64: str
    student_id: Optional[str] = None
    expected_student_id: Optional[str] = None

class ProctorBatchAnalyzeRequest(BaseModel):
    frames: List[ProctorBatchItem]

class ProctorBatchItemResult(BaseModel):
    frame_id: str
    student_id: Optional[str] = None
    result: FaceActionDetectionResult
    violations: List[str] = []
    severity: str = "NONE"
    suggested_penalty: int = 0

class ProctorBatchAnalyzeResponse(BaseModel):
    success: bool = True
    results: List[ProctorBatchItemResult]
    total_processed: int
    execution_time_ms: float

class AntiCheatEventRequest(BaseModel):
    session_id: str
    student_id: str
    event_type: str = Field(..., description="TAB_SWITCH, COPY_PASTE, RIGHT_CLICK, DEVTOOLS_OPEN, FULLSCREEN_EXIT")
    details: Optional[Dict[str, Any]] = None
    timestamp: Optional[str] = None

class AntiCheatEventResponse(BaseModel):
    success: bool
    event_type: str
    severity: str
    suggested_penalty: int
    message: str



