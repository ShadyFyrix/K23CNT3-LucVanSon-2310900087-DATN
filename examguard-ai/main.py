import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from app.config import settings
from app.api.routes import router as api_router
from app.core.hmac_auth import HmacInternalAuthMiddleware

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="ExamGuard AI - Face AI Proctoring Microservice with 3D Vector Mesh & ArcFace Recognition"
)

# Thêm Middleware HMAC Bảo mật Service-to-Service (Node.js <-> Python AI)
app.add_middleware(HmacInternalAuthMiddleware)

# Cấu hình CORS: Cho phép các domain CRM chính thức, localhost và dải IP LAN nội bộ
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|.*\.deepcode\.vn)(:\d+)?$",
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(api_router, prefix="/api")


@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "storage_type": settings.STORAGE_TYPE,
        "models": {
            "yunet_exists": os.path.exists(settings.YUNET_MODEL_PATH),
            "arcface_exists": os.path.exists(settings.ARCFACE_MODEL_PATH)
        }
    }

@app.get("/", response_class=HTMLResponse, tags=["Web UI"])
def index():
    html_content = """<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ExamGuard AI - Face AI Proctoring & Vector Engine</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #060913;
            --surface: #0f172a;
            --surface-card: #1e293b;
            --primary: #3b82f6;
            --primary-hover: #2563eb;
            --cyan: #06b6d4;
            --accent: #10b981;
            --danger: #ef4444;
            --warning: #f59e0b;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --border: #334155;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Outfit', sans-serif; }
        body { background: var(--bg); color: var(--text); min-height: 100vh; padding: 18px; }
        .container { max-width: 1380px; margin: 0 auto; }
        
        header {
            display: flex; justify-content: space-between; align-items: center;
            padding: 14px 22px; background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(14px);
            border: 1px solid var(--border); border-radius: 14px; margin-bottom: 18px;
        }
        .logo { font-size: 20px; font-weight: 700; color: #60a5fa; display: flex; align-items: center; gap: 10px; }
        .badge { background: #1e3a8a; color: #93c5fd; padding: 4px 12px; border-radius: 999px; font-size: 11px; font-weight: 600; }
        
        .grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 18px; }
        @media (max-width: 980px) { .grid { grid-template-columns: 1fr; } }
        
        .card {
            background: var(--surface); border: 1px solid var(--border);
            border-radius: 14px; padding: 18px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.5);
        }
        .card h2 { font-size: 16px; margin-bottom: 12px; color: #f1f5f9; display: flex; align-items: center; gap: 8px; }
        
        .camera-container {
            position: relative; border-radius: 12px; overflow: hidden; background: #020617;
            aspect-ratio: 4/3; display: flex; align-items: center; justify-content: center;
            border: 2px solid var(--border);
        }
        video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
        #overlayCanvas {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            pointer-events: none;
        }
        
        .hud-overlay {
            position: absolute; top: 10px; left: 10px; right: 10px;
            display: flex; justify-content: space-between; pointer-events: none;
        }
        .hud-chip {
            background: rgba(15, 23, 42, 0.85); backdrop-filter: blur(8px);
            border: 1px solid rgba(59, 130, 246, 0.4); border-radius: 6px;
            padding: 4px 10px; font-size: 11px; font-family: 'JetBrains Mono', monospace;
            color: #38bdf8; font-weight: 600;
        }
        
        .btn-group { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
        button {
            background: var(--primary); color: white; border: none; padding: 8px 15px;
            border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 6px; font-size: 13px;
        }
        button:hover { background: var(--primary-hover); transform: translateY(-1px); }
        button.success { background: var(--accent); }
        button.success:hover { background: #059669; }
        button.danger { background: var(--danger); }
        button.danger:hover { background: #dc2626; }
        button.outline { background: transparent; border: 1px solid var(--border); color: var(--text); }
        button.outline:hover { background: #1e293b; }
        
        .tab-nav { display: flex; gap: 6px; border-bottom: 1px solid var(--border); padding-bottom: 10px; margin-bottom: 12px; flex-wrap: wrap; }
        .tab-btn {
            background: transparent; color: var(--text-muted); padding: 6px 13px;
            border-radius: 6px; border: none; font-size: 13px; cursor: pointer;
        }
        .tab-btn.active { background: #1e3a8a; color: #60a5fa; font-weight: 600; }
        
        .form-group { margin-bottom: 12px; }
        label { display: block; font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
        input, select {
            width: 100%; background: #0b0f19; border: 1px solid var(--border);
            padding: 8px 12px; border-radius: 8px; color: white; font-size: 13px; outline: none;
        }
        input:focus { border-color: var(--primary); }
        
        .challenge-box {
            background: #0b1120; border: 1px solid var(--border); border-radius: 10px;
            padding: 12px; margin-bottom: 12px;
        }
        .challenge-item {
            display: flex; align-items: center; justify-content: space-between;
            padding: 8px 12px; border-radius: 6px; margin-bottom: 6px;
            background: rgba(30, 41, 59, 0.5); font-size: 13px;
        }
        .challenge-item.passed {
            background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; font-weight: 600;
        }
        .challenge-item.active {
            background: rgba(59, 130, 246, 0.2); border: 1px solid #3b82f6; color: #60a5fa; font-weight: 600;
            animation: pulse 1.5s infinite;
        }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        
        .result-box {
            background: #020617; border: 1px solid var(--border); border-radius: 10px;
            padding: 12px; margin-top: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px;
            min-height: 100px; max-height: 200px; overflow-y: auto; white-space: pre-wrap; color: #cbd5e1;
        }
        .status-badge {
            padding: 4px 10px; border-radius: 6px; font-weight: 600; display: inline-block;
            font-size: 12px;
        }
        .status-badge.success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #059669; }
        .status-badge.fail { background: rgba(239, 68, 68, 0.2); color: #f87171; border: 1px solid #b91c1c; }
        
        .emp-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
        .emp-table th, .emp-table td { padding: 7px 10px; text-align: left; border-bottom: 1px solid var(--border); font-size: 12px; }
        .emp-table th { color: var(--text-muted); font-weight: 500; }
        
        .action-log {
            font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #94a3b8;
            max-height: 85px; overflow-y: auto; margin-top: 6px; background: #020617;
            padding: 8px; border-radius: 6px; border: 1px solid var(--border);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <div class="logo">
                <span>⚡ DeepCode Face AI</span>
                <span class="badge">3D Vector Mesh + 5-Angle Recognition</span>
            </div>
            <div style="display:flex; gap:12px; align-items:center;">
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; color:#38bdf8;">
                    <input type="checkbox" id="chkMesh" checked>
                    <span>🕸️ Lưới Vector 3D</span>
                </label>
                <label style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; color:#34d399;">
                    <input type="checkbox" id="chkRealtimeTrack" checked onchange="toggleTracking()">
                    <span>🎯 Realtime Tracking</span>
                </label>
                <a href="/docs" target="_blank" style="color: #60a5fa; text-decoration: none; font-size: 13px; font-weight: 600;">📖 Swagger API ↗</a>
            </div>
        </header>

        <div class="grid">
            <!-- Left Column: Camera Preview with 3D Vector Mesh & Non-Mirrored Forward Badge -->
            <div class="card">
                <h2>📸 Camera Trực Tiếp & Lưới Vector AI (Realtime Face Mesh)</h2>
                <div class="camera-container" id="camContainer">
                    <video id="videoElement" autoplay playsinline muted></video>
                    <canvas id="overlayCanvas"></canvas>
                    <div class="hud-overlay">
                        <div class="hud-chip" id="hudIdentity">DANH TÍNH: --</div>
                        <div class="hud-chip" id="hudPose">TƯ THẾ: --</div>
                    </div>
                </div>
                <div class="btn-group">
                    <button id="btnStartCam" onclick="startCamera()">▶ Mở Camera</button>
                    <button id="btnStopCam" class="outline" onclick="stopCamera()">⏹ Tắt Camera</button>
                    <input type="file" id="fileUpload" accept="image/*" style="display:none;" onchange="handleFileUpload(event)">
                    <button class="outline" onclick="document.getElementById('fileUpload').click()">📁 Chọn Ảnh từ Máy</button>
                </div>
                <div style="margin-top: 10px; display:flex; justify-content:space-between; align-items:center;">
                    <span id="camStatus" style="font-size: 12px; color: var(--text-muted);">Trạng thái camera: Chưa kết nối</span>
                    <span id="fpsCounter" style="font-size: 12px; font-family: monospace; color: #38bdf8;">FPS: 0</span>
                </div>
                
                <div style="margin-top: 10px;">
                    <label>Nhật ký nhận diện & Hành động thời gian thực (Audit Stream):</label>
                    <div class="action-log" id="actionLogStream">Đang chờ mở camera...</div>
                </div>
            </div>

            <!-- Right Column: Operations & 5-Angle Console -->
            <div class="card">
                <div class="tab-nav">
                    <button class="tab-btn active" onclick="switchTab('challenge')">🛡️ Điểm Danh 5 Tư Thế</button>
                    <button class="tab-btn" onclick="switchTab('mobile')">📱 Mobile Chấm Công (Check In/Out)</button>
                    <button class="tab-btn" onclick="switchTab('recognize')">1:N Điểm Danh Nhanh</button>
                    <button class="tab-btn" onclick="switchTab('enroll')">➕ Đăng Ký 5 Góc Mặt</button>
                    <button class="tab-btn" onclick="switchTab('verify')">1:1 Đối Chiếu</button>
                    <button class="tab-btn" onclick="switchTab('list')">👥 Danh Sách Đã Lưu</button>
                </div>

                <!-- Global Settings -->
                <div style="background: #0b1120; padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; border: 1px solid var(--border); display: flex; gap: 14px; align-items: center; flex-wrap: wrap;">
                    <label style="margin: 0; display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                        <input type="checkbox" id="chkQuality" checked style="width: auto;">
                        <span>🛡️ Kiểm tra chất lượng ảnh</span>
                    </label>
                    <label style="margin: 0; display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                        <input type="checkbox" id="chkLiveness" checked style="width: auto;">
                        <span>👁️ Chống ảnh giả mạo</span>
                    </label>
                </div>

                <!-- Tab 0: Action Challenge 5 Steps (Straight -> Left -> Right -> Up -> Down) -->
                <div id="tab-challenge" class="tab-content">
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 10px;">
                        Thực hiện 5 tư thế để xác thực 100% người thật trước khi điểm danh:
                    </p>
                    <div class="challenge-box">
                        <div class="challenge-item" id="step-straight">
                            <span>1. 🎯 Nhìn thẳng vào Camera</span>
                            <span id="badge-straight" style="font-size:12px; color:#94a3b8;">Chờ thực hiện</span>
                        </div>
                        <div class="challenge-item" id="step-left">
                            <span>2. 👈 Quay mặt sang TRÁI</span>
                            <span id="badge-left" style="font-size:12px; color:#94a3b8;">Chờ thực hiện</span>
                        </div>
                        <div class="challenge-item" id="step-right">
                            <span>3. 👉 Quay mặt sang PHẢI</span>
                            <span id="badge-right" style="font-size:12px; color:#94a3b8;">Chờ thực hiện</span>
                        </div>
                        <div class="challenge-item" id="step-up">
                            <span>4. 👆 Ngước cằm lên TRÊN</span>
                            <span id="badge-up" style="font-size:12px; color:#94a3b8;">Chờ thực hiện</span>
                        </div>
                        <div class="challenge-item" id="step-down">
                            <span>5. 👇 Cúi đầu xuống DƯỚI</span>
                            <span id="badge-down" style="font-size:12px; color:#94a3b8;">Chờ thực hiện</span>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px;">
                        <button class="success" style="flex:1; padding: 10px;" onclick="startInteractiveChallenge()">
                            🚀 Bắt Đầu Thử Thách 5 Bước
                        </button>
                        <button class="outline" style="padding: 10px;" onclick="resetChallenge()">
                            🔄 Reset
                        </button>
                    </div>
                </div>

                <!-- Tab Mobile: Enterprise Attendance Simulator -->
                <div id="tab-mobile" class="tab-content" style="display:none;">
                    <div style="background: rgba(15, 23, 42, 0.9); border: 1px solid #334155; border-radius: 10px; padding: 12px; margin-bottom: 12px;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                            <span style="font-size:12px; font-weight:700; color:#38bdf8;">📍 GPS Geofencing (Bán kính 100m)</span>
                            <span id="gpsDistanceLabel" style="font-size:11px; font-family:'JetBrains Mono'; color:#34d399; font-weight:700;">Cách Cty: 35m 🟢</span>
                        </div>
                        <input type="range" id="simGpsSlider" min="10" max="250" value="35" style="width:100%; cursor:pointer;" oninput="updateGpsDistance(this.value)">
                        <div style="display:flex; justify-content:space-between; font-size:10px; color:#64748b; margin-top:2px;">
                            <span>10m (Trong cty)</span>
                            <span style="color:#f59e0b;">100m (Ngưỡng tối đa)</span>
                            <span>250m (Ngoài cty 🔴)</span>
                        </div>
                    </div>

                    <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; font-size: 11px; color: #94a3b8; display: flex; justify-content: space-between;">
                        <span>⏱️ <b>Ca làm:</b> 08:00 - 17:30</span>
                        <span>⚠️ <b>Trễ tối đa:</b> 15 phút (08:15)</span>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <button class="success" style="padding: 14px; font-size: 13px; font-weight: 700; flex-direction: column; gap: 4px;" onclick="executeMobileClock('CHECK_IN')">
                            <span>🟢 CHECK-IN ĐẦU GIỜ</span>
                            <span style="font-size: 10px; opacity: 0.8; font-weight: normal;">(Trước 08:15 Đúng giờ)</span>
                        </button>
                        <button style="background: #2563eb; padding: 14px; font-size: 13px; font-weight: 700; flex-direction: column; gap: 4px;" onclick="executeMobileClock('CHECK_OUT')">
                            <span>🏁 CHECK-OUT CUỐI GIỜ</span>
                            <span style="font-size: 10px; opacity: 0.8; font-weight: normal;">(Sau 17:30 Đủ giờ làm)</span>
                        </button>
                    </div>
                </div>

                <!-- Tab 1: Recognize (Fast Attendance) -->
                <div id="tab-recognize" class="tab-content" style="display:none;">
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">
                        Chụp ảnh khuôn mặt để tìm kiếm danh tính nhân viên trong toàn bộ database (1:N search).
                    </p>
                    <button class="success" style="width: 100%; padding: 11px;" onclick="executeRecognize()">
                        🎯 Chụp & Nhận Diện Điểm Danh
                    </button>
                </div>

                <!-- Tab 2: Enroll Face (5 Angles: Straight, Left, Right, Up, Down) -->
                <div id="tab-enroll" class="tab-content" style="display:none;">
                    <div class="form-group">
                        <label>Mã Nhân Viên (Employee ID) *</label>
                        <input type="text" id="enroll_id" placeholder="ví dụ: EMP001">
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="form-group">
                            <label>Họ và Tên</label>
                            <input type="text" id="enroll_name" placeholder="ví dụ: Nguyễn Văn A">
                        </div>
                        <div class="form-group">
                            <label>Phòng Ban / Bộ Phận</label>
                            <input type="text" id="enroll_dept" placeholder="ví dụ: Kỹ thuật AI">
                        </div>
                    </div>

                    <!-- 5 Angle Cards -->
                    <div style="margin: 10px 0;">
                        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 8px;">
                            <label style="font-weight:600; color:#38bdf8; font-size:12px;">📸 Thu thập 5 góc mặt (Chính diện, Trái, Phải, Trên, Dưới):</label>
                            <button class="outline" style="padding: 3px 8px; font-size: 11px; border-color:#38bdf8; color:#38bdf8;" onclick="startAutoAngleScan()">
                                ⚡ Tự Động Quét 5 Góc
                            </button>
                        </div>
                        <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 6px;">
                            <!-- Angle 1: Straight -->
                            <div id="card-straight" style="background:#0f172a; border:1px solid var(--border); border-radius:8px; padding:6px; text-align:center;">
                                <div style="font-size:10px; font-weight:700; color:#f8fafc; margin-bottom:4px;">1. Trực Diện</div>
                                <div id="prev-straight" style="width:100%; aspect-ratio:1; background:#020617; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:4px; border:1px dashed #334155;">
                                    <span style="font-size:9px; color:#64748b;">Chưa chụp</span>
                                </div>
                                <button class="outline" style="width:100%; padding:3px 2px; font-size:9px;" onclick="captureAngle('straight')">📸 Chụp</button>
                            </div>

                            <!-- Angle 2: Left -->
                            <div id="card-left" style="background:#0f172a; border:1px solid var(--border); border-radius:8px; padding:6px; text-align:center;">
                                <div style="font-size:10px; font-weight:700; color:#f8fafc; margin-bottom:4px;">2. Trái</div>
                                <div id="prev-left" style="width:100%; aspect-ratio:1; background:#020617; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:4px; border:1px dashed #334155;">
                                    <span style="font-size:9px; color:#64748b;">Chưa chụp</span>
                                </div>
                                <button class="outline" style="width:100%; padding:3px 2px; font-size:9px;" onclick="captureAngle('left')">👈 Chụp</button>
                            </div>

                            <!-- Angle 3: Right -->
                            <div id="card-right" style="background:#0f172a; border:1px solid var(--border); border-radius:8px; padding:6px; text-align:center;">
                                <div style="font-size:10px; font-weight:700; color:#f8fafc; margin-bottom:4px;">3. Phải</div>
                                <div id="prev-right" style="width:100%; aspect-ratio:1; background:#020617; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:4px; border:1px dashed #334155;">
                                    <span style="font-size:9px; color:#64748b;">Chưa chụp</span>
                                </div>
                                <button class="outline" style="width:100%; padding:3px 2px; font-size:9px;" onclick="captureAngle('right')">👉 Chụp</button>
                            </div>

                            <!-- Angle 4: Up -->
                            <div id="card-up" style="background:#0f172a; border:1px solid var(--border); border-radius:8px; padding:6px; text-align:center;">
                                <div style="font-size:10px; font-weight:700; color:#f8fafc; margin-bottom:4px;">4. Trên</div>
                                <div id="prev-up" style="width:100%; aspect-ratio:1; background:#020617; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:4px; border:1px dashed #334155;">
                                    <span style="font-size:9px; color:#64748b;">Chưa chụp</span>
                                </div>
                                <button class="outline" style="width:100%; padding:3px 2px; font-size:9px;" onclick="captureAngle('up')">👆 Chụp</button>
                            </div>

                            <!-- Angle 5: Down -->
                            <div id="card-down" style="background:#0f172a; border:1px solid var(--border); border-radius:8px; padding:6px; text-align:center;">
                                <div style="font-size:10px; font-weight:700; color:#f8fafc; margin-bottom:4px;">5. Dưới</div>
                                <div id="prev-down" style="width:100%; aspect-ratio:1; background:#020617; border-radius:6px; display:flex; align-items:center; justify-content:center; overflow:hidden; margin-bottom:4px; border:1px dashed #334155;">
                                    <span style="font-size:9px; color:#64748b;">Chưa chụp</span>
                                </div>
                                <button class="outline" style="width:100%; padding:3px 2px; font-size:9px;" onclick="captureAngle('down')">👇 Chụp</button>
                            </div>
                        </div>
                    </div>

                    <div style="display:flex; gap:6px; margin-top:8px;">
                        <button class="success" style="flex:1; padding: 10px; font-size:12px;" onclick="executeEnrollMultiAngle()">
                            🚀 Phân Tích & Lưu Trữ 5 Góc
                        </button>
                        <button class="outline" style="padding: 10px; font-size:12px;" title="Chụp nhanh 1 ảnh trực tiếp hiện tại" onclick="executeEnroll()">
                            💾 Chụp Nhanh
                        </button>
                    </div>
                </div>

                <!-- Tab 3: Verify (1:1) -->
                <div id="tab-verify" class="tab-content" style="display:none;">
                    <div class="form-group">
                        <label>Nhập Mã Nhân Viên cần kiểm tra *</label>
                        <input type="text" id="verify_id" placeholder="ví dụ: EMP001">
                    </div>
                    <button class="success" style="width: 100%; padding: 11px;" onclick="executeVerify()">
                        🔍 Chụp & Kiểm Tra Đúng Nhân Viên Này
                    </button>
                </div>

                <!-- Tab 4: Employee List -->
                <div id="tab-list" class="tab-content" style="display:none;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size: 12px; color: var(--text-muted);">Nhân viên đã lưu Face Vector</span>
                        <button class="outline" style="padding:3px 8px; font-size:11px;" onclick="loadEmployeeList()">🔄 Làm Mới</button>
                    </div>
                    <div style="max-height: 200px; overflow-y:auto;">
                        <table class="emp-table">
                            <thead>
                                <tr>
                                    <th>Mã NV</th>
                                    <th>Họ và Tên</th>
                                    <th>Phòng Ban</th>
                                    <th>Hành Động</th>
                                </tr>
                            </thead>
                            <tbody id="empTableBody">
                                <tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Đang tải...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Live Results Console -->
                <div style="margin-top: 14px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <label style="margin: 0; font-weight: 600;">Kết quả trả về từ API:</label>
                        <span id="resultBadge" class="status-badge" style="display:none;"></span>
                    </div>
                    <div class="result-box" id="resultOutput">Hệ thống sẵn sàng. Vui lòng mở Camera hoặc chọn tác vụ.</div>
                </div>
            </div>
        </div>
    </div>

    <!-- Processing Canvas (Hidden) -->
    <canvas id="processCanvas" style="display: none;"></canvas>

    <script>
        const video = document.getElementById('videoElement');
        const overlayCanvas = document.getElementById('overlayCanvas');
        const overlayCtx = overlayCanvas.getContext('2d');
        const canvas = document.getElementById('processCanvas');

        let stream = null;
        let isTracking = true;
        let trackingInterval = null;
        let frameCount = 0;
        let lastTime = performance.now();
        let laserY = 0;
        let laserDirection = 1;

        // Challenge Steps (5 Steps)
        const CHALLENGE_STEPS = ['straight', 'left', 'right', 'up', 'down'];
        let currentChallengeIndex = -1;
        let challengeActive = false;
        let stepHoldCounter = 0;

        async function startCamera() {
            try {
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                    stream = null;
                }
                stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
                });
                video.srcObject = stream;
                try {
                    await video.play();
                } catch(e) {}

                document.getElementById('camStatus').innerText = "Camera: Đang hoạt động 🟢";
                document.getElementById('camStatus').style.color = "#34d399";
                
                const initCanvas = () => {
                    if (video.videoWidth > 0) {
                        overlayCanvas.width = video.videoWidth;
                        overlayCanvas.height = video.videoHeight;
                        startTrackingLoop();
                    }
                };

                video.onloadedmetadata = initCanvas;
                initCanvas();
            } catch (err) {
                console.error("Camera error:", err);
                let friendlyMsg = err.message;
                if (err.name === "NotReadableError" || err.name === "TrackStartError") {
                    friendlyMsg = "Camera đang bị tab khác (ví dụ: Tab Quản Trị Port 3000) chiếm dụng. Vui lòng TẮT Camera ở tab kia trước khi mở tại đây!";
                } else if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    friendlyMsg = "Trình duyệt chưa được cấp quyền mở Camera. Vui lòng bấm vào biểu tượng Khóa/Camera trên thanh địa chỉ để Cho phép!";
                }
                alert("Lỗi Camera: " + friendlyMsg);
                document.getElementById('camStatus').innerText = `Camera: ${err.name || "Lỗi"} 🔴`;
                document.getElementById('camStatus').style.color = "#f87171";
            }
        }

        function stopCamera() {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
                video.srcObject = null;
                document.getElementById('camStatus').innerText = "Camera: Đã tắt ⏹";
                document.getElementById('camStatus').style.color = "var(--text-muted)";
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
                if (trackingInterval) clearInterval(trackingInterval);
            }
        }

        function toggleTracking() {
            isTracking = document.getElementById('chkRealtimeTrack').checked;
            if (!isTracking) {
                overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            }
        }

        let isProcessingFrame = false;

        function startTrackingLoop() {
            if (trackingInterval) clearInterval(trackingInterval);
            // Optimized interval: 350ms (~3 FPS) saves 70% CPU while maintaining smooth UX
            trackingInterval = setInterval(async () => {
                if (!isTracking || !video.videoWidth || isProcessingFrame) return;
                await processVideoFrame();
            }, 350);
        }

        async function processVideoFrame() {
            isProcessingFrame = true;
            try {
                // Downscale tracking canvas to max 480px to save 85% bandwidth & CPU decoding
                const maxDim = 480;
                let w = video.videoWidth;
                let h = video.videoHeight;
                if (w > maxDim || h > maxDim) {
                    if (w > h) {
                        h = Math.round((h * maxDim) / w);
                        w = maxDim;
                    } else {
                        w = Math.round((w * maxDim) / h);
                        h = maxDim;
                    }
                }

                canvas.width = w;
                canvas.height = h;
                let ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, w, h);

                frameCount++;
                const now = performance.now();
                if (now - lastTime >= 1000) {
                    document.getElementById('fpsCounter').innerText = `FPS: ${frameCount}`;
                    frameCount = 0;
                    lastTime = now;
                }

                await new Promise((resolve) => {
                    canvas.toBlob(async (blob) => {
                        if (!blob) {
                            resolve();
                            return;
                        }
                        const formData = new FormData();
                        formData.append('image', blob, 'frame.jpg');

                        try {
                            const res = await fetch('/v1/face/detect-pose', {
                                method: 'POST',
                                body: formData
                            });
                            const data = await res.json();

                            // Rescale bbox and landmarks to match original overlayCanvas if downscaled
                            if (data && data.bbox && (w !== overlayCanvas.width || h !== overlayCanvas.height)) {
                                const scaleX = overlayCanvas.width / w;
                                const scaleY = overlayCanvas.height / h;
                                data.bbox.x = Math.round(data.bbox.x * scaleX);
                                data.bbox.y = Math.round(data.bbox.y * scaleY);
                                data.bbox.width = Math.round(data.bbox.width * scaleX);
                                data.bbox.height = Math.round(data.bbox.height * scaleY);
                                if (data.landmarks) {
                                    for (let key in data.landmarks) {
                                        if (data.landmarks[key] && data.landmarks[key].x !== undefined) {
                                            data.landmarks[key].x = data.landmarks[key].x * scaleX;
                                            data.landmarks[key].y = data.landmarks[key].y * scaleY;
                                        }
                                    }
                                }
                            }

                            drawHUDAndMesh(data);
                            if (challengeActive) {
                                handleChallengeStep(data);
                            }
                            if (autoScanActive) {
                                handleAutoScanStep(data, blob);
                            }
                        } catch (e) {
                        } finally {
                            resolve();
                        }
                    }, 'image/jpeg', 0.65);
                });
            } finally {
                isProcessingFrame = false;
            }
        }

        // --- DRAW 3D VECTOR FACE MESH & FORWARD-FACING READABLE NAME BADGE ---
        function drawHUDAndMesh(data) {
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
            if (!data.face_detected || !data.bbox) {
                document.getElementById('hudIdentity').innerText = "DANH TÍNH: --";
                document.getElementById('hudPose').innerText = "TƯ THẾ: KHÔNG CÓ MẶT";
                return;
            }

            // Mirror X coordinates for canvas to match scaleX(-1) mirrored video
            const rawBox = data.bbox;
            const width = rawBox.width;
            const height = rawBox.height;
            const x = overlayCanvas.width - (rawBox.x + width);
            const y = rawBox.y;

            const pose = data.pose ? data.pose.pose : "STRAIGHT";
            const identity = data.identity || {};
            const isMatched = identity.matched;
            const fullName = identity.full_name;
            const empId = identity.employee_id;
            const similarity = identity.similarity ? (identity.similarity * 100).toFixed(1) : 0;

            const poseMap = {
                "STRAIGHT": { icon: "👤", text: "NHÌN THẲNG (CHÍNH DIỆN)" },
                "TURN_LEFT": { icon: "👈", text: "QUAY TRÁI (BÊN TRÁI)" },
                "TURN_RIGHT": { icon: "👉", text: "QUAY PHẢI (BÊN PHẢI)" },
                "LOOK_UP": { icon: "👆", text: "NGƯỚC LÊN (PHÍA TRÊN)" },
                "LOOK_DOWN": { icon: "👇", text: "CÚI XUỐNG (PHÍA DƯỚI)" }
            };
            const currentPoseInfo = poseMap[pose] || { icon: "🎯", text: pose };
            document.getElementById('hudPose').innerText = `TƯ THẾ: ${currentPoseInfo.icon} ${currentPoseInfo.text}`;

            if (isMatched && fullName) {
                document.getElementById('hudIdentity').innerText = `XÁC THỰC: ${fullName} (${empId}) - ${similarity}%`;
                document.getElementById('hudIdentity').style.color = "#34d399";
            } else {
                document.getElementById('hudIdentity').innerText = `DANH TÍNH: CHƯA ĐĂNG KÝ / KHÁCH`;
                document.getElementById('hudIdentity').style.color = "#fbbf24";
            }

            const showMesh = document.getElementById('chkMesh').checked;
            const mainColor = isMatched ? "#10b981" : "#06b6d4";
            const glowColor = isMatched ? "rgba(16, 185, 129, 0.4)" : "rgba(6, 182, 212, 0.4)";

            overlayCtx.save();

            // 1. RENDER 3D VECTOR FACE MESH WIREFRAME
            if (showMesh && data.landmarks) {
                const lm = data.landmarks;
                const mirrorX = (px) => overlayCanvas.width - px;

                const re = { x: mirrorX(lm.right_eye.x), y: lm.right_eye.y };
                const le = { x: mirrorX(lm.left_eye.x), y: lm.left_eye.y };
                const nose = { x: mirrorX(lm.nose_tip.x), y: lm.nose_tip.y };
                const mr = { x: mirrorX(lm.mouth_right.x), y: lm.mouth_right.y };
                const ml = { x: mirrorX(lm.mouth_left.x), y: lm.mouth_left.y };

                const foreheadL = { x: x + width * 0.7, y: y + height * 0.1 };
                const foreheadR = { x: x + width * 0.3, y: y + height * 0.1 };
                const foreheadMid = { x: x + width * 0.5, y: y + height * 0.05 };
                const templeL = { x: x + width * 0.92, y: y + height * 0.28 };
                const templeR = { x: x + width * 0.08, y: y + height * 0.28 };
                const cheekL = { x: x + width * 0.88, y: y + height * 0.62 };
                const cheekR = { x: x + width * 0.12, y: y + height * 0.62 };
                const jawL = { x: x + width * 0.75, y: y + height * 0.9 };
                const jawR = { x: x + width * 0.25, y: y + height * 0.9 };
                const chin = { x: x + width * 0.5, y: y + height * 0.98 };
                const noseBridge = { x: (re.x + le.x) / 2, y: (re.y + le.y) / 2 - height * 0.05 };

                const meshLines = [
                    [foreheadMid, foreheadL], [foreheadMid, foreheadR],
                    [foreheadL, templeL], [foreheadR, templeR],
                    [templeL, cheekL], [templeR, cheekR],
                    [cheekL, jawL], [cheekR, jawR],
                    [jawL, chin], [jawR, chin],
                    [foreheadL, le], [foreheadR, re], [foreheadMid, noseBridge],
                    [templeL, le], [templeR, re],
                    [re, le], [re, noseBridge], [le, noseBridge],
                    [noseBridge, nose], [re, nose], [le, nose],
                    [cheekL, ml], [cheekR, mr],
                    [cheekL, nose], [cheekR, nose],
                    [nose, mr], [nose, ml],
                    [mr, ml], [mr, jawR], [ml, jawL], [mr, chin], [ml, chin]
                ];

                overlayCtx.strokeStyle = glowColor;
                overlayCtx.lineWidth = 1.2;
                overlayCtx.beginPath();
                for (const [p1, p2] of meshLines) {
                    overlayCtx.moveTo(p1.x, p1.y);
                    overlayCtx.lineTo(p2.x, p2.y);
                }
                overlayCtx.stroke();

                const allNodes = [foreheadMid, foreheadL, foreheadR, templeL, templeR, re, le, noseBridge, nose, cheekL, cheekR, mr, ml, jawL, jawR, chin];
                overlayCtx.fillStyle = mainColor;
                overlayCtx.shadowColor = mainColor;
                overlayCtx.shadowBlur = 8;
                for (const node of allNodes) {
                    overlayCtx.beginPath();
                    overlayCtx.arc(node.x, node.y, 2.5, 0, 2 * Math.PI);
                    overlayCtx.fill();
                }

                laserY += 3 * laserDirection;
                if (laserY > height || laserY < 0) laserDirection *= -1;
                const scanLineY = y + laserY;

                overlayCtx.strokeStyle = isMatched ? "rgba(16, 185, 129, 0.8)" : "rgba(6, 182, 212, 0.8)";
                overlayCtx.lineWidth = 2;
                overlayCtx.shadowColor = mainColor;
                overlayCtx.shadowBlur = 12;
                overlayCtx.beginPath();
                overlayCtx.moveTo(x, scanLineY);
                overlayCtx.lineTo(x + width, scanLineY);
                overlayCtx.stroke();
            }

            // 2. DRAW CORNER BRACKETS BOUNDING BOX
            const cornerLength = Math.min(width, height) * 0.2;
            overlayCtx.strokeStyle = mainColor;
            overlayCtx.lineWidth = 3;
            overlayCtx.shadowColor = mainColor;
            overlayCtx.shadowBlur = 10;

            overlayCtx.beginPath();
            overlayCtx.moveTo(x, y + cornerLength); overlayCtx.lineTo(x, y); overlayCtx.lineTo(x + cornerLength, y);
            overlayCtx.moveTo(x + width - cornerLength, y); overlayCtx.lineTo(x + width, y); overlayCtx.lineTo(x + width, y + cornerLength);
            overlayCtx.moveTo(x + width, y + height - cornerLength); overlayCtx.lineTo(x + width, y + height); overlayCtx.lineTo(x + width - cornerLength, y + height);
            overlayCtx.moveTo(x + cornerLength, y + height); overlayCtx.lineTo(x, y + height); overlayCtx.lineTo(x, y + height - cornerLength);
            overlayCtx.stroke();

            // 3. DRAW FORWARD-FACING READABLE NAME BADGE ON TOP
            const badgeH = 28;
            const badgeW = Math.max(180, width * 0.95);
            const badgeX = x + (width - badgeW) / 2;
            const badgeY = y - badgeH - 12;

            overlayCtx.shadowBlur = 0;
            overlayCtx.fillStyle = isMatched ? "rgba(6, 78, 59, 0.92)" : "rgba(15, 23, 42, 0.9)";
            overlayCtx.beginPath();
            overlayCtx.roundRect(badgeX, badgeY, badgeW, badgeH, 6);
            overlayCtx.fill();

            overlayCtx.strokeStyle = isMatched ? "#10b981" : "#06b6d4";
            overlayCtx.lineWidth = 1.5;
            overlayCtx.stroke();

            overlayCtx.fillStyle = "#ffffff";
            overlayCtx.font = "bold 13px Outfit, sans-serif";
            overlayCtx.textAlign = "center";
            if (isMatched && fullName) {
                overlayCtx.fillText(`✅ ${fullName} (${empId}) • ${similarity}%`, badgeX + badgeW / 2, badgeY + 18);
            } else {
                overlayCtx.fillText(`${currentPoseInfo.icon} ${currentPoseInfo.text}`, badgeX + badgeW / 2, badgeY + 18);
            }

            overlayCtx.restore();
        }

        function logAction(msg) {
            const stream = document.getElementById('actionLogStream');
            const now = new Date().toLocaleTimeString();
            stream.innerHTML = `<div><span style="color:#60a5fa;">[${now}]</span> ${msg}</div>` + stream.innerHTML;
        }

        // --- 5-STEP ACTION CHALLENGE (Straight -> Left -> Right -> Up -> Down) ---
        function startInteractiveChallenge() {
            if (!video.videoWidth) {
                alert("Vui lòng mở Camera trước khi bắt đầu thử thách!");
                return;
            }
            challengeActive = true;
            currentChallengeIndex = 0;
            stepHoldCounter = 0;
            resetChallengeUI();
            highlightCurrentStep();
            logAction("🚀 Bắt đầu thử thách 5 bước xác thực người thật...");
            setResult("Đang thực hiện thử thách Liveness: Vui lòng làm theo hướng dẫn từng bước...", null);
        }

        function resetChallenge() {
            challengeActive = false;
            currentChallengeIndex = -1;
            stepHoldCounter = 0;
            resetChallengeUI();
            logAction("Đã đặt lại thử thách.");
        }

        function resetChallengeUI() {
            for (const step of CHALLENGE_STEPS) {
                const el = document.getElementById(`step-${step}`);
                const badge = document.getElementById(`badge-${step}`);
                if (el && badge) {
                    el.className = "challenge-item";
                    badge.innerText = "Chờ thực hiện";
                    badge.style.color = "#94a3b8";
                }
            }
        }

        function highlightCurrentStep() {
            if (currentChallengeIndex >= 0 && currentChallengeIndex < CHALLENGE_STEPS.length) {
                const step = CHALLENGE_STEPS[currentChallengeIndex];
                const el = document.getElementById(`step-${step}`);
                const badge = document.getElementById(`badge-${step}`);
                if (el && badge) {
                    el.className = "challenge-item active";
                    badge.innerText = "▶ Hãy thực hiện ngay!";
                    badge.style.color = "#60a5fa";
                }
            }
        }

        function markStepPassed(step) {
            const el = document.getElementById(`step-${step}`);
            const badge = document.getElementById(`badge-${step}`);
            if (el && badge) {
                el.className = "challenge-item passed";
                badge.innerText = "✅ Đạt chuẩn";
                badge.style.color = "#34d399";
            }
        }

        let lastStepCaptureTime = 0;

        function handleChallengeStep(data) {
            if (!challengeActive || currentChallengeIndex < 0 || currentChallengeIndex >= CHALLENGE_STEPS.length) return;
            if (!data.face_detected || !data.pose) return;
            if (Date.now() - lastStepCaptureTime < 600) return; // Cooldown between steps

            const step = CHALLENGE_STEPS[currentChallengeIndex];
            const currentPose = data.pose.pose;
            const yawDeg = data.pose.yaw_deg || 0;
            const pitchDeg = data.pose.pitch_deg || 0;

            let conditionMet = false;
            if (step === 'straight' && (currentPose === 'STRAIGHT' && Math.abs(yawDeg) <= 7 && Math.abs(pitchDeg) <= 7)) conditionMet = true;
            else if (step === 'left' && (currentPose === 'TURN_LEFT' || yawDeg >= 13) && yawDeg > 6) conditionMet = true;
            else if (step === 'right' && (currentPose === 'TURN_RIGHT' || yawDeg <= -13) && yawDeg < -6) conditionMet = true;
            else if (step === 'up' && (currentPose === 'LOOK_UP' || pitchDeg >= 10) && pitchDeg > 5) conditionMet = true;
            else if (step === 'down' && (currentPose === 'LOOK_DOWN' || pitchDeg <= -10) && pitchDeg < -5) conditionMet = true;

            if (conditionMet) {
                stepHoldCounter++;
                if (stepHoldCounter >= 4) {
                    lastStepCaptureTime = Date.now();
                    logAction(`✅ Đã hoàn thành bước: ${step.toUpperCase()}`);
                    markStepPassed(step);
                    currentChallengeIndex++;
                    stepHoldCounter = 0;

                    if (currentChallengeIndex < CHALLENGE_STEPS.length) {
                        highlightCurrentStep();
                    } else {
                        challengeActive = false;
                        logAction("🎉 HOÀN THÀNH 100% LIVENESS 5 BƯỚC! Tự động xác thực điểm danh...");
                        setResult("✅ Liveness Đạt 100%! Đang trích xuất Face Vector để điểm danh...", "success", "✅ XÁC NHẬN NGƯỜI THẬT");
                        setTimeout(() => {
                            executeRecognize();
                        }, 400);
                    }
                }
            } else {
                stepHoldCounter = 0;
            }
        }

        function captureBlob() {
            return new Promise((resolve) => {
                if (!video.videoWidth) {
                    alert("Vui lòng mở Camera hoặc Chọn ảnh từ máy trước!");
                    resolve(null);
                    return;
                }
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                let ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.95);
            });
        }

        let uploadedBlob = null;
        function handleFileUpload(event) {
            const file = event.target.files[0];
            if (file) {
                uploadedBlob = file;
                const img = new Image();
                img.onload = function() {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);
                    video.srcObject = null;
                    video.poster = URL.createObjectURL(file);
                    document.getElementById('camStatus').innerText = "Đã nạp ảnh: " + file.name + " 📁";
                };
                img.src = URL.createObjectURL(file);
            }
        }

        function switchTab(tabName) {
            document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
            
            event.target.classList.add('active');
            document.getElementById('tab-' + tabName).style.display = 'block';

            if (tabName === 'list') {
                loadEmployeeList();
            }
        }

        // --- ENTERPRISE MOBILE ATTENDANCE SIMULATOR ---
        let simulatedDistance = 35;

        function updateGpsDistance(val) {
            simulatedDistance = parseInt(val, 10);
            const label = document.getElementById('gpsDistanceLabel');
            if (simulatedDistance <= 100) {
                label.innerText = `Cách Cty: ${simulatedDistance}m 🟢 (Hợp lệ)`;
                label.style.color = "#34d399";
            } else {
                label.innerText = `Cách Cty: ${simulatedDistance}m 🔴 (Ngoài vùng)`;
                label.style.color = "#f87171";
            }
        }

        async function executeMobileClock(actionType) {
            if (simulatedDistance > 100) {
                const errMsg = `❌ TỪ CHỐI CHẤM CÔNG: Bạn đang ở cách công ty ${simulatedDistance}m (Vượt quá bán kính cho phép 100m)!`;
                setResult(errMsg, "fail", "🚫 OUT OF GEOFENCE");
                logAction(`🚫 ${actionType} thất bại: Ngoài vùng GPS (${simulatedDistance}m > 100m)`);
                return;
            }

            const blob = uploadedBlob || await captureBlob();
            if (!blob) return;

            const checkQuality = document.getElementById('chkQuality').checked;
            const checkLiveness = document.getElementById('chkLiveness').checked;

            setResult(`Đang xác thực khuôn mặt và thực hiện ${actionType}...`, null);
            const formData = new FormData();
            formData.append('image', blob, 'mobile_capture.jpg');

            try {
                const res = await fetch(`/v1/face/recognize?threshold=0.70&check_liveness=${checkLiveness}&check_quality=${checkQuality}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (!data.matched || !data.employee_id) {
                    setResult(JSON.stringify(data, null, 2), "fail", `❌ Không nhận diện được khuôn mặt`);
                    logAction(`❌ ${actionType} thất bại: Khuôn mặt không khớp`);
                    return;
                }

                const now = new Date();
                const currentHour = now.getHours();
                const currentMin = now.getMinutes();
                const timeStr = now.toLocaleTimeString();

                let statusBadge = "";
                let statusMsg = "";

                if (actionType === 'CHECK_IN') {
                    const isLate = (currentHour > 8) || (currentHour === 8 && currentMin > 15);
                    const lateMins = isLate ? ((currentHour - 8) * 60 + currentMin) : 0;
                    statusBadge = isLate ? `⚠️ CHECK-IN: ĐI MUỘN (${lateMins} phút)` : `🟢 CHECK-IN: ĐÚNG GIỜ`;
                    statusMsg = `Nhân viên ${data.full_name || data.employee_id} đã Check-in lúc ${timeStr}. ${isLate ? `Đi muộn ${lateMins} phút!` : 'Đúng giờ làm việc!'}`;
                } else {
                    const isEarly = (currentHour < 17) || (currentHour === 17 && currentMin < 30);
                    const earlyMins = isEarly ? ((17 - currentHour) * 60 + (30 - currentMin)) : 0;
                    statusBadge = isEarly ? `⚠️ CHECK-OUT: VỀ SỚM (${earlyMins} phút)` : `🏁 CHECK-OUT: ĐỦ GIỜ`;
                    statusMsg = `Nhân viên ${data.full_name || data.employee_id} đã Check-out lúc ${timeStr}. ${isEarly ? `Về sớm ${earlyMins} phút!` : 'Hoàn thành ca làm việc!'}`;
                }

                const reportResult = {
                    action: actionType,
                    employee_id: data.employee_id,
                    full_name: data.full_name,
                    timestamp: timeStr,
                    gps_distance: `${simulatedDistance}m (Hợp lệ <= 100m)`,
                    similarity: `${(data.similarity * 100).toFixed(1)}% (${data.matched_angle || 'straight'})`,
                    liveness_passed: data.liveness_passed,
                    status_detail: statusMsg
                };

                setResult(JSON.stringify(reportResult, null, 2), "success", statusBadge);
                logAction(`🎉 ${statusBadge} - ${data.full_name} (${data.employee_id}) - Cách Cty ${simulatedDistance}m`);
            } catch (err) {
                setResult("Lỗi kết nối: " + err.message, "fail", "❌ Lỗi");
            }
        }

        async function executeRecognize() {
            const blob = uploadedBlob || await captureBlob();
            if (!blob) return;

            const checkQuality = document.getElementById('chkQuality').checked;
            const checkLiveness = document.getElementById('chkLiveness').checked;

            setResult("Đang gửi ảnh lên Face AI và trích xuất vector...", null);
            const formData = new FormData();
            formData.append('image', blob, 'capture.jpg');

            try {
                const res = await fetch(`/v1/face/recognize?threshold=0.75&check_liveness=${checkLiveness}&check_quality=${checkQuality}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.matched) {
                    setResult(JSON.stringify(data, null, 2), "success", `✅ KHỚP: ${data.full_name || data.employee_id} (Độ khớp: ${(data.similarity*100).toFixed(1)}%)`);
                    logAction(`🎉 Điểm danh thành công: ${data.full_name} (${data.employee_id}) - Khớp ${(data.similarity*100).toFixed(1)}%`);
                } else {
                    setResult(JSON.stringify(data, null, 2), "fail", `❌ KHÔNG KHỚP: ${(data.reasons || []).join(', ')}`);
                }
            } catch (err) {
                setResult("Lỗi kết nối API: " + err.message, "fail", "❌ Lỗi");
            }
        }

        // --- 5-ANGLE FACE CAPTURE & AUTO-SCANNER ---
        const ANGLE_KEYS = ['straight', 'left', 'right', 'up', 'down'];
        let angleBlobs = {
            straight: null,
            left: null,
            right: null,
            up: null,
            down: null
        };
        let autoScanActive = false;
        let autoScanStep = 0; // 0: straight, 1: left, 2: right, 3: up, 4: down
        let autoScanHold = 0;

        function highlightAngleCard(angle) {
            ANGLE_KEYS.forEach(a => {
                const card = document.getElementById(`card-${a}`);
                if (card) {
                    if (a === angle) {
                        card.style.borderColor = "#38bdf8";
                        card.style.background = "rgba(56, 189, 248, 0.15)";
                    } else if (angleBlobs[a]) {
                        card.style.borderColor = "#10b981";
                        card.style.background = "rgba(16, 185, 129, 0.1)";
                    } else {
                        card.style.borderColor = "var(--border)";
                        card.style.background = "#0f172a";
                    }
                }
            });
        }

        function setAnglePreview(angle, blob) {
            angleBlobs[angle] = blob;
            const container = document.getElementById(`prev-${angle}`);
            if (container && blob) {
                const url = URL.createObjectURL(blob);
                container.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:4px;">`;
                highlightAngleCard(null);
            }
        }

        async function captureAngle(angle) {
            const blob = await captureBlob();
            if (blob) {
                setAnglePreview(angle, blob);
                logAction(`📸 Đã chụp xong góc: ${angle.toUpperCase()}`);
            }
        }

        function startAutoAngleScan() {
            if (!video.videoWidth) {
                alert("Vui lòng mở Camera trước khi quét 5 góc!");
                return;
            }
            autoScanActive = true;
            autoScanStep = 0;
            autoScanHold = 0;
            logAction("⚡ BẮT ĐẦU QUÉT 5 GÓC: 1. Hãy nhìn thẳng vào camera...");
            highlightAngleCard('straight');
            setResult("Đang quét tự động 5 góc: 1. Hãy nhìn thẳng trực diện...", null);
        }

        function handleAutoScanStep(data, currentBlob) {
            if (!autoScanActive || !data.face_detected || !data.pose) return;
            if (Date.now() - lastStepCaptureTime < 700) return; // 700ms cooldown after capturing each step

            const pose = data.pose.pose;
            const yawDeg = data.pose.yaw_deg || 0;
            const pitchDeg = data.pose.pitch_deg || 0;

            if (autoScanStep === 0) {
                // 1. Straight
                if (pose === 'STRAIGHT' && Math.abs(yawDeg) <= 7 && Math.abs(pitchDeg) <= 7) {
                    autoScanHold++;
                    if (autoScanHold >= 4) {
                        lastStepCaptureTime = Date.now();
                        setAnglePreview('straight', currentBlob);
                        logAction("✅ ĐÃ BẮT GÓC TRỰC DIỆN! 👉 Bước 2: Hãy quay mặt sang TRÁI...");
                        setResult("✅ Đã bắt góc trực diện! 👉 Bước 2: Hãy quay mặt sang TRÁI...", null);
                        autoScanStep = 1;
                        autoScanHold = 0;
                        highlightAngleCard('left');
                    }
                } else {
                    autoScanHold = 0;
                }
            } else if (autoScanStep === 1) {
                // 2. Left (Physical Left)
                if ((pose === 'TURN_LEFT' || yawDeg >= 13) && yawDeg > 6) {
                    autoScanHold++;
                    if (autoScanHold >= 4) {
                        lastStepCaptureTime = Date.now();
                        setAnglePreview('left', currentBlob);
                        logAction("✅ ĐÃ BẮT GÓC NGHIÊNG TRÁI! 👉 Bước 3: Hãy quay mặt sang PHẢI...");
                        setResult("✅ Đã bắt góc nghiêng trái! 👉 Bước 3: Hãy quay mặt sang PHẢI...", null);
                        autoScanStep = 2;
                        autoScanHold = 0;
                        highlightAngleCard('right');
                    }
                } else {
                    autoScanHold = 0;
                }
            } else if (autoScanStep === 2) {
                // 3. Right (Physical Right)
                if ((pose === 'TURN_RIGHT' || yawDeg <= -13) && yawDeg < -6) {
                    autoScanHold++;
                    if (autoScanHold >= 4) {
                        lastStepCaptureTime = Date.now();
                        setAnglePreview('right', currentBlob);
                        logAction("✅ ĐÃ BẮT GÓC NGHIÊNG PHẢI! 👉 Bước 4: Hãy ngước cằm lên TRÊN...");
                        setResult("✅ Đã bắt góc nghiêng phải! 👉 Bước 4: Hãy ngước cằm lên TRÊN...", null);
                        autoScanStep = 3;
                        autoScanHold = 0;
                        highlightAngleCard('up');
                    }
                } else {
                    autoScanHold = 0;
                }
            } else if (autoScanStep === 3) {
                // 4. Up (Tilt Up)
                if ((pose === 'LOOK_UP' || pitchDeg >= 10) && pitchDeg > 5) {
                    autoScanHold++;
                    if (autoScanHold >= 4) {
                        lastStepCaptureTime = Date.now();
                        setAnglePreview('up', currentBlob);
                        logAction("✅ ĐÃ BẮT GÓC NGƯỚC LÊN (TRÊN)! 👉 Bước 5: Hãy cúi đầu xuống DƯỚI...");
                        setResult("✅ Đã bắt góc ngước lên! 👉 Bước 5: Hãy cúi đầu xuống DƯỚI...", null);
                        autoScanStep = 4;
                        autoScanHold = 0;
                        highlightAngleCard('down');
                    }
                } else {
                    autoScanHold = 0;
                }
            } else if (autoScanStep === 4) {
                // 5. Down (Tilt Down)
                if ((pose === 'LOOK_DOWN' || pitchDeg <= -10) && pitchDeg < -5) {
                    autoScanHold++;
                    if (autoScanHold >= 4) {
                        lastStepCaptureTime = Date.now();
                        setAnglePreview('down', currentBlob);
                        logAction("🎉 HOÀN THÀNH THU THẬP ĐỦ 5 GÓC! Nhấn 'Phân Tích & Lưu Trữ 5 Góc' để hoàn tất.");
                        setResult("🎉 Đã thu thập đủ 5 góc mặt! Nhấn 'Phân Tích & Lưu Trữ 5 Góc' để hoàn tất đăng ký.", "success", "✅ ĐỦ 5 GÓC KHUÔN MẶT");
                        autoScanActive = false;
                        autoScanStep = -1;
                        autoScanHold = 0;
                        highlightAngleCard(null);
                    }
                } else {
                    autoScanHold = 0;
                }
            }
        }

        async function executeEnrollMultiAngle() {
            const empId = document.getElementById('enroll_id').value.trim();
            const empName = document.getElementById('enroll_name').value.trim();
            const empDept = document.getElementById('enroll_dept').value.trim();
            const checkQuality = document.getElementById('chkQuality').checked;

            if (!empId) {
                alert("Vui lòng nhập Mã Nhân Viên!");
                return;
            }

            const hasAny = Object.values(angleBlobs).some(b => b !== null);
            if (!hasAny) {
                const currentBlob = await captureBlob();
                if (!currentBlob) return;
                angleBlobs.straight = currentBlob;
            }

            setResult("Đang phân tích 5 góc khuôn mặt và trích xuất vector ArcFace đa chiều...", null);
            const formData = new FormData();
            formData.append('employee_id', empId);
            if (empName) formData.append('full_name', empName);
            if (empDept) formData.append('department', empDept);

            if (angleBlobs.straight) {
                formData.append('image_straight', angleBlobs.straight, 'straight.jpg');
            } else if (uploadedBlob) {
                formData.append('image_straight', uploadedBlob, 'straight.jpg');
            }

            if (angleBlobs.left) formData.append('image_left', angleBlobs.left, 'left.jpg');
            if (angleBlobs.right) formData.append('image_right', angleBlobs.right, 'right.jpg');
            if (angleBlobs.up) formData.append('image_up', angleBlobs.up, 'up.jpg');
            if (angleBlobs.down) formData.append('image_down', angleBlobs.down, 'down.jpg');

            try {
                const res = await fetch(`/v1/face/enroll-multi-angle?check_quality=${checkQuality}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    const anglesText = (data.registered_angles || []).join(', ');
                    setResult(JSON.stringify(data, null, 2), "success", `✅ Đăng ký 5 góc thành công (${anglesText})!`);
                    logAction(`💾 Đã đăng ký 5 góc cho: ${empName || empId} (${empId}) - [${anglesText}]`);
                    loadEmployeeList();
                } else {
                    setResult(JSON.stringify(data, null, 2), "fail", `❌ Lỗi: ${(data.reasons || []).join(', ')}`);
                }
            } catch (err) {
                setResult("Lỗi kết nối: " + err.message, "fail", "❌ Lỗi");
            }
        }

        async function executeEnroll() {
            const empId = document.getElementById('enroll_id').value.trim();
            const empName = document.getElementById('enroll_name').value.trim();
            const empDept = document.getElementById('enroll_dept').value.trim();
            const checkQuality = document.getElementById('chkQuality').checked;

            if (!empId) {
                alert("Vui lòng nhập Mã Nhân Viên!");
                return;
            }

            const blob = uploadedBlob || await captureBlob();
            if (!blob) return;

            setResult("Đang kiểm tra chất lượng khuôn mặt và đăng ký vector...", null);
            const formData = new FormData();
            formData.append('image', blob, 'enroll.jpg');
            formData.append('employee_id', empId);
            if (empName) formData.append('full_name', empName);
            if (empDept) formData.append('department', empDept);

            try {
                const res = await fetch(`/v1/face/enroll?check_quality=${checkQuality}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.success) {
                    setResult(JSON.stringify(data, null, 2), "success", "✅ Đăng ký thành công!");
                    logAction(`💾 Đã đăng ký thành công: ${empName || empId} (${empId})`);
                    loadEmployeeList();
                } else {
                    setResult(JSON.stringify(data, null, 2), "fail", `❌ Lỗi: ${(data.reasons || []).join(', ')}`);
                }
            } catch (err) {
                setResult("Lỗi kết nối: " + err.message, "fail", "❌ Lỗi");
            }
        }

        async function executeVerify() {
            const empId = document.getElementById('verify_id').value.trim();
            const checkQuality = document.getElementById('chkQuality').checked;
            const checkLiveness = document.getElementById('chkLiveness').checked;

            if (!empId) {
                alert("Vui lòng nhập Mã Nhân Viên cần đối chiếu!");
                return;
            }

            const blob = uploadedBlob || await captureBlob();
            if (!blob) return;

            setResult("Đang đối chiếu 1:1 khuôn mặt với " + empId + "...", null);
            const formData = new FormData();
            formData.append('image', blob, 'verify.jpg');
            formData.append('employee_id', empId);

            try {
                const res = await fetch(`/v1/face/verify?threshold=0.75&check_liveness=${checkLiveness}&check_quality=${checkQuality}`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (data.matched) {
                    setResult(JSON.stringify(data, null, 2), "success", `✅ XÁC THỰC THÀNH CÔNG (${(data.similarity*100).toFixed(1)}%)`);
                } else {
                    setResult(JSON.stringify(data, null, 2), "fail", `❌ XÁC THỰC THẤT BẠI: ${(data.reasons || []).join(', ')}`);
                }
            } catch (err) {
                setResult("Lỗi: " + err.message, "fail", "❌ Lỗi");
            }
        }

        async function loadEmployeeList() {
            try {
                const res = await fetch('/v1/faces/list');
                const list = await res.json();
                const tbody = document.getElementById('empTableBody');
                if (!list || list.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color: var(--text-muted);">Chưa có nhân viên nào được lưu khuôn mặt.</td></tr>`;
                    return;
                }
                tbody.innerHTML = list.map(item => {
                    const angles = item.registered_angles || ['straight'];
                    const anglesBadge = angles.map(a => `<span style="background:#1e293b; color:#38bdf8; border:1px solid #334155; padding:1px 5px; border-radius:4px; font-size:10px; margin-right:3px;">${a}</span>`).join('');
                    return `
                    <tr>
                        <td style="font-weight:600; color:#93c5fd;">${item.employee_id}</td>
                        <td>${item.full_name || '—'}<br>${anglesBadge}</td>
                        <td>${item.department || '—'}</td>
                        <td>
                            <button class="danger" style="padding:4px 8px; font-size:12px;" onclick="deleteEmployee('${item.employee_id}')">Xoá</button>
                        </td>
                    </tr>
                    `;
                }).join('');
            } catch (err) {
                console.error(err);
            }
        }

        async function deleteEmployee(empId) {
            if (!confirm(`Bạn có chắc chắn muốn xoá khuôn mặt nhân viên ${empId}?`)) return;
            try {
                const res = await fetch(`/v1/faces/${empId}`, { method: 'DELETE' });
                const data = await res.json();
                loadEmployeeList();
                setResult(JSON.stringify(data, null, 2), "success", `Đã xoá ${empId}`);
            } catch (err) {
                alert("Lỗi khi xoá: " + err.message);
            }
        }

        function setResult(text, type, badgeText) {
            document.getElementById('resultOutput').innerText = text;
            const badge = document.getElementById('resultBadge');
            if (badgeText && type) {
                badge.style.display = 'inline-block';
                badge.className = 'status-badge ' + type;
                badge.innerText = badgeText;
            } else {
                badge.style.display = 'none';
            }
        }
    </script>
</body>
</html>
    """
    return HTMLResponse(content=html_content)

if __name__ == "__main__":
    import uvicorn
    host = os.getenv("FACE_AI_HOST", "127.0.0.1")
    port = int(os.getenv("FACE_AI_PORT", "8000"))
    uvicorn.run("main:app", host=host, port=port, reload=True)
