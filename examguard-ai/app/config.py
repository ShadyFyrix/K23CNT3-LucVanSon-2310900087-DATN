import os
from pathlib import Path
try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

try:
    from pydantic import BaseModel
except ImportError:
    from dataclasses import dataclass
    class BaseModel:
        pass


BASE_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BASE_DIR.parent

# Nạp file .env từ thư mục gốc dự án (hoặc fallback về thư mục cục bộ)
if load_dotenv:
    root_env_file = ROOT_DIR / ".env"
    local_env_file = BASE_DIR / ".env"
    if root_env_file.exists():
        load_dotenv(dotenv_path=root_env_file, override=True)
    elif local_env_file.exists():
        load_dotenv(dotenv_path=local_env_file, override=True)

# Cấu hình thư mục lưu trữ dữ liệu điểm danh / khuôn mặt ra ngoài mã nguồn (/var/www/crm.deepcode.vn.face.api)
face_data_env = os.getenv("FACE_DATA_DIR")
if face_data_env and (os.name != "nt" or not face_data_env.startswith("/var/")):
    DATA_DIR = Path(face_data_env)
elif os.name != "nt":
    DATA_DIR = Path("/var/www/crm.deepcode.vn.face.api")
else:
    DATA_DIR = BASE_DIR / "data"

# Đường dẫn models: ưu tiên models trong DATA_DIR nếu có, hoặc fallback về models trong thư mục code
MODELS_DIR = (DATA_DIR / "models") if (DATA_DIR / "models").exists() else (BASE_DIR / "data" / "models")
FACES_DIR = DATA_DIR / "registered_faces"
REGISTER_DIR = (DATA_DIR / "register") if (DATA_DIR / "register").exists() else (BASE_DIR / "www" / "register")
DB_PATH = DATA_DIR / "faces_vector_db.json"

# Đảm bảo các thư mục tồn tại an toàn
try:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    MODELS_DIR.mkdir(parents=True, exist_ok=True)
    FACES_DIR.mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"[Config] Lưu ý khởi tạo thư mục dữ liệu: {e}")

class Settings(BaseModel):
    # Paths
    BASE_DIR: Path = BASE_DIR
    DATA_DIR: Path = DATA_DIR
    MODELS_DIR: Path = MODELS_DIR
    FACES_DIR: Path = FACES_DIR
    REGISTER_DIR: Path = REGISTER_DIR
    DB_PATH: Path = DB_PATH

    # App Settings
    APP_NAME: str = "ExamGuard AI Service"
    APP_VERSION: str = "2.0.0"
    DEBUG: bool = True
    
    # Face Quality Thresholds
    MIN_FACE_SIZE: int = 50          # Minimum width & height of detected face in pixels
    MIN_FACE_RATIO: float = 0.010    # Face area must be at least 1.0% of whole frame
    MIN_BRIGHTNESS: float = 20.0     # Mean grayscale brightness (0-255)
    MAX_BRIGHTNESS: float = 245.0    # Avoid overexposure
    MIN_BLUR_SCORE: float = 2.5      # Laplacian variance threshold on normalized 160x160 crop (laptop webcams)
    
    # Face Recognition Thresholds
    SIMILARITY_THRESHOLD: float = 0.68  # Cosine similarity threshold for verification (0.0 to 1.0)
    EMBEDDING_DIM: int = 512            # Vector dimension (512 for ArcFace / 128 for MobileFaceNet)
    
    # Liveness Thresholds
    LIVENESS_THRESHOLD: float = 0.55    # Liveness confidence score threshold (calibrated for laptop webcams)
    
    # Model Configurations
    YUNET_MODEL_URL: str = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"
    ARCFACE_MODEL_URL: str = "https://github.com/onnx/models/raw/main/validated/vision/body_analysis/arcface/model/arcfaceresnet100-8.onnx"
    
    YUNET_MODEL_PATH: str = str(MODELS_DIR / "face_detection_yunet.onnx")
    ARCFACE_MODEL_PATH: str = str(
        (MODELS_DIR / "w600k_mbf.onnx") if (MODELS_DIR / "w600k_mbf.onnx").exists()
        else (MODELS_DIR / "arcface_resnet100.onnx") if (MODELS_DIR / "arcface_resnet100.onnx").exists()
        else (MODELS_DIR / "face_recognition_sface.onnx")
    )
    
    # Storage & Database (MongoDB)
    STORAGE_TYPE: str = os.getenv("STORAGE_TYPE", "mongodb") # 'mongodb', 'local', or 'qdrant'
    MONGODB_URI: str = os.getenv("MONGODB_URI") or os.getenv("MONGO_URI") or "mongodb://localhost:27017/crm_deepcode_db"
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "crm_deepcode_db")
    USE_MONGODB: bool = True
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_COLLECTION: str = "employee_faces"

    # Microservice Security (Node.js <-> Python HMAC Authentication)
    INTERNAL_AI_SECRET: str = os.getenv("INTERNAL_AI_SECRET", "FaceAI_Internal_Microservice_Secret_Key_999")
    REQUIRE_HMAC_AUTH: bool = os.getenv("REQUIRE_HMAC_AUTH", "true").lower() in ("true", "1", "yes")

settings = Settings()

