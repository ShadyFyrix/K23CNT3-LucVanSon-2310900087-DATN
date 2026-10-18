# ExamGuard AI — Hệ Thống Quản Lý Thi Trực Tuyến & Giám Sát Thông Minh Tích Hợp Face AI

> **ĐỒ ÁN TỐT NGHIỆP ĐẠI HỌC**  
> **Đề tài:** Hệ thống Quản lý Thi Trực tuyến Tích hợp Xác thực Khuôn mặt & Giám sát Chống gian lận AI  
> **Sinh viên thực hiện:** Lục Văn Sơn — **Mã SV:** 2310900087 — **Lớp:** K23CNT3  
> **Nền tảng công nghệ đăng ký:** `ReactJS; Python Flask; MySQL; MongoDB; Tailwind Framework` (Khớp 100% Đề cương Đồ án Tốt nghiệp)

---

## 📌 1. Giới thiệu Tổng quan
**ExamGuard AI** là giải pháp nền tảng khảo thí và tổ chức thi trực tuyến toàn diện, bảo mật cao dành cho các cơ sở giáo dục đại học. Hệ thống kết hợp kiến trúc phân quyền chặt chẽ (RBAC + CBAC Zero-Trust), mô hình giám sát 3D thời gian thực (Live 3D Proctoring Matrix), động cơ trí tuệ nhân tạo thị giác máy tính (Computer Vision Face AI) và kiến trúc đa lưu trữ đa nền tảng (**Polyglot Persistence Architecture**) nhằm đảm bảo tính công bằng, minh bạch tuyệt đối trong toàn bộ quá trình thi cử.

---

## 🎯 2. Đối chiếu 5 Nền tảng Công nghệ Đăng ký (100% Thesis Compliance)

| STT | Công nghệ Đăng ký | Thành phần trong Hệ thống | Vai trò Kỹ thuật & Nghiệp vụ | Cổng (Port) |
|:---:|:---|:---|:---|:---:|
| **1** | **ReactJS** | `examguard-core/src/` | Ứng dụng Frontend Single Page App (React 19), giao diện làm bài thi tương tác, Dual-Screen Snipping Tool cắt sơ đồ mạch điện tử từ file PDF đề thi, Studio chụp quét Face KYC 5 góc. | `3011` |
| **2** | **Python Flask** | `examguard-flask/` | Microservice Quản trị Đào tạo & Cầu nối Đồng bộ (Flask 3.0, PyMySQL, PyMongo), quản lý sổ bộ đào tạo (Khoa, Lớp, Sinh viên, Ca thi) và thực thi đồng bộ hai chiều RDBMS - NoSQL. | `5000` |
| **3** | **MySQL** | `database/init_mysql.sql` | CSDL Quan hệ Chuẩn ACID (`examguard_db`), lưu trữ 13 bảng phân cấp tổ chức đào tạo, phòng thi, phân công coi thi, danh sách dự thi và bảng điểm chính thức của sinh viên. | `3306` |
| **4** | **MongoDB** | `examguard_ai_db` | CSDL Hướng Tài liệu NoSQL linh hoạt, lưu trữ đề thi hỗn hợp đa định dạng, cây câu hỏi động, vector sinh trắc học ArcFace 512 chiều, telemetry và nhật ký vi phạm thời gian thực. | `27017` |
| **5** | **Tailwind Framework** | `@tailwindcss/vite` | Khung giao diện Styling toàn diện (TailwindCSS v4) thiết kế theo nguyên lý CSS Variables-first, Dark/Light mode, hiệu ứng Glassmorphism và tối ưu hóa responsive. | — |

---

## 🏗️ 3. Kiến trúc Đa Dịch vụ (Polyglot Microservices Architecture)

```
                            ┌────────────────────────────────────────┐
                            │    REACTJS & TAILWIND FRONTEND         │
                            │    (React 19 + Tailwind v4 - Port 3011)│
                            └───────┬────────────────────────┬───────┘
                                    │ (HTTP REST / WebSocket)│ (HTTP REST API)
                                    ▼                        ▼
┌────────────────────────────────────────┐          ┌────────────────────────────────────────┐
│     EXAMGUARD CORE (Node.js Express 5) │          │     EXAMGUARD FLASK (Python 3.10+)     │
│   • API Gateway & Auth JWT             │          │   • Quản trị Đào tạo (Khoa/Lớp/SV)     │
│   • Dual-Screen Exam Builder           │          │   • API Sổ bộ & Đồng bộ Polyglot       │
│   • Socket.IO Realtime 3D Matrix       │          │   • PyMySQL (3306) + PyMongo (27017)   │
│   • Cổng: 3011                         │          │   • Cổng: 5000                         │
└───────────────┬────────────────────────┘          └───────────────────┬────────────────────┘
                │                                                       │
                ├───────────────────────────────────────────────────────┤
                │                                                       │
                ▼                                                       ▼
┌────────────────────────────────────────┐          ┌────────────────────────────────────────┐
│    MYSQL 8.0 RELATIONAL DATABASE       │          │    MONGODB 7.0+ DOCUMENT DATABASE      │
│   • DB: examguard_db (Port 3306)       │          │   • DB: examguard_ai_db (Port 27017)   │
│   • 13 Bảng chuẩn hóa ACID             │          │   • Đề thi hỗn hợp, Cắt ảnh sơ đồ      │
│   • Khoa, Lớp, Sinh viên, Điểm chính thức │       │   • ArcFace 512-D, Realtime Telemetry  │
└────────────────────────────────────────┘          └────────────────────────────────────────┘
                                    ▲
                                    │ (Cosine Verification / Liveness / 3D Pose)
┌───────────────────────────────────┴────┐
│      FACE AI SERVICE (Python FastAPI)  │
│   • ArcFace 512-D + MiniFASNet         │
│   • Cổng: 8000                         │
└────────────────────────────────────────┘
```

---

## 🚀 4. Hướng dẫn Vận hành Hệ thống

### Cách 1: Khởi chạy 1-Click Toàn Hệ Thống (Khuyến nghị khi Bảo vệ ĐATN)
Chỉ cần nhấp đúp chuột vào file:
```bash
run_system.bat
```
*Script sẽ tự động:*
1. Quét và giải phóng cổng xung đột (Port `3011`, `5000`, `8000`).
2. Kiểm tra socket kết nối CSDL MySQL (Port `3306`) và MongoDB (Port `27017`).
3. Khởi chạy song song 3 dịch vụ: Python Face AI (Port 8000), Python Flask (Port 5000), và ExamGuard Core Web (Port 3011).
4. Tự động bật trình duyệt tới địa chỉ: `http://localhost:3011`.
5. Khi kết thúc, nhấn phím bất kỳ trong cửa sổ script để tự động tắt sạch toàn bộ hệ thống và đóng mọi tab terminal.

### Cách 2: Dừng Hệ Thống An Toàn
```bash
stop_system.bat
```
*Script sẽ tự động thu hồi tài nguyên và giải phóng toàn bộ các cổng 3011, 5000, 8000.*

---

## 🔑 5. Danh sách Tài khoản & Endpoint Trực tiếp

### A. Tài khoản Trải nghiệm:
| Vai trò | Email / Username | Mật khẩu | Chức năng chính |
|---|---|---|---|
| **Admin** | `admin@examguard.edu.vn` | `123456` | Toàn quyền quản trị cơ cấu, tạo phòng 3D, duyệt KYC, xem báo cáo tổng hợp. |
| **Giảng viên** | `anguyen@examguard.edu.vn` | `123456` | Soạn đề thi đa dạng, dùng Snipping Tool cắt đề PDF, giám sát ca thi, chấm bài. |
| **Sinh viên** | `son.luc@sinhvien.edu.vn` *(Lục Văn Sơn)* | `123456` | Đăng ký Face KYC 5 góc, vào phòng thi trực tuyến, làm bài thi chia đôi màn hình. |

### B. Endpoint Kiểm tra Tình trạng Hoạt động (Health Check):
- **Frontend Web & Core API:** `http://localhost:3011`
- **Kiểm tra Kết nối MySQL từ Core:** `http://localhost:3011/api/mysql/status`
- **Python Flask Core Health:** `http://127.0.0.1:5000/api/flask/health`
- **Python Flask Thống kê Dữ liệu:** `http://127.0.0.1:5000/api/flask/stats`
- **Danh sách Sinh viên từ Flask:** `http://127.0.0.1:5000/api/flask/students`
- **Python Face AI Documentation:** `http://127.0.0.1:8000/docs`

---

## 📂 6. Cấu trúc Thư mục Đồ Án
```
d:\K23CNT3-LucVanSon-2310900087\DATN\
├── run_system.bat                    # Script khởi chạy tự động 1-click toàn hệ sinh thái
├── stop_system.bat                   # Script dừng hệ thống an toàn & giải phóng port
├── SYSTEM_BLUEPRINT.md               # Tài liệu Đặc tả Kỹ thuật & Nghiệp vụ Toàn diện v3.0
├── README.md                         # Hướng dẫn tổng quan & vận hành đồ án
│
├── database/                         # CƠ SỞ DỮ LIỆU QUAN HỆ MYSQL
│   └── init_mysql.sql                # 13 Bảng quan hệ chuẩn hóa & Dữ liệu hạt giống (Seed)
│
├── examguard-flask/                  # MICROSERVICE PYTHON FLASK (Port 5000)
│   ├── app.py                        # RESTful API Server, PyMySQL + PyMongo dual connection
│   ├── requirements.txt              # Flask, Flask-CORS, PyMySQL, PyMongo, python-dotenv
│   └── .env                          # Cấu hình chuỗi kết nối MySQL 3306 & MongoDB 27017
│
├── examguard-core/                   # REACTJS + TAILWIND FRONTEND & CORE BACKEND (Port 3011)
│   ├── src/                          # Toàn bộ mã nguồn React 19 SPA, TailwindCSS v4, Pages, Components
│   ├── server/                       # Node.js Express 5 API Gateway, Socket.IO, mysql2, Mongoose
│   ├── package.json                  # Khai báo React 19, Tailwind v4, Express 5, mysql2...
│   └── vite.config.ts                # Vite 6 compiler & proxy
│
└── examguard-ai/                     # PYTHON FACE AI MICROSERVICE (Port 8000)
    ├── main.py                       # FastAPI ASGI Server
    ├── requirements.txt              # FastAPI, OpenCV, ONNX Runtime, PyMongo
    └── models/                       # ArcFace 512-D, MiniFASNet, YOLOv8 Pose
```

---

## 📜 7. Tài liệu Tham khảo
- Xem chi tiết kiến trúc và toàn bộ 19 mục đặc tả kỹ thuật tại [`SYSTEM_BLUEPRINT.md`](./SYSTEM_BLUEPRINT.md).
