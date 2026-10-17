# ExamGuard AI — Hệ Thống Quản Lý Thi Trực Tuyến & Giám Sát Thông Minh Tích Hợp Face AI

> **Đề tài tốt nghiệp:** Hệ thống Quản lý Thi Trực tuyến Tích hợp Xác thực Khuôn mặt & Giám sát Chống gian lận AI  
> **Sinh viên thực hiện:** Lục Văn Sơn (Mã SV: 2310900087) — Lớp: K23CNT3  

---

## 📌 Giới thiệu Tổng quan
**ExamGuard AI** là giải pháp nền tảng khảo thí và tổ chức thi trực tuyến toàn diện, bảo mật cao dành cho các cơ sở giáo dục đại học và cao đẳng. Hệ thống kết hợp kiến trúc phân quyền chặt chẽ (RBAC + CBAC Zero-Trust), mô hình giám sát 3D thời gian thực (Live 3D Proctoring Matrix), và động cơ trí tuệ nhân tạo thị giác máy tính (Computer Vision Face AI) để đảm bảo tính công bằng, minh bạch tuyệt đối trong toàn bộ quá trình thi cử.

## 🎯 3 Hình thức Thi Trực Tuyến
1. **`ONLINE_QUIZ` (Thi Trắc nghiệm Quiz Trực tuyến):** Giao diện tương tác cao (Interactive Question Cards), bộ đếm ngược từng câu / toàn bài, phím tắt nhanh (`A, B, C, D`), cờ xem lại, auto-save đám mây, chống gian lận chuyển tab (`Anti-tab switch`), thoát toàn màn hình và tự động chấm điểm 100% tức thì.
2. **`LAB_PC` (Thi máy phòng Lab):** Sinh viên làm bài trên PC cố định tại phòng Lab của trường, tích hợp trình duyệt khóa Kiosk, Webcam trực diện và Camera CCTV phòng thi.
3. **`BYOD_LAPTOP` (Thi Laptop cá nhân):** Sinh viên mang laptop cá nhân vào phòng thi, sử dụng Safe Exam Browser (SEB) / Client Lockdown, xác thực IP VLAN phòng thi, mã Seat PIN và Webcam giám sát.

---

## 🏗️ Kiến trúc Hệ thống
Hệ thống được thiết kế theo mô hình Microservices phân tách rạch ròi:

```
                          ┌──────────────────────────┐
                          │   Frontend Web App (SPA) │
                          │   Vite + React 18 + TS   │
                          └─────────────┬────────────┘
                                        │ (HTTP / WebRTC / Socket)
                                        ▼
                          ┌──────────────────────────┐
                          │  Core Server (Node.js)   │
                          │  Express + MongoDB RBAC  │
                          └─────────────┬────────────┘
                                        │ (HMAC SHA-256 Internal Token)
                                        ▼
                          ┌──────────────────────────┐
                          │  Face AI Service (Python)│
                          │  FastAPI + ArcFace +     │
                          │  YuNet + MiniFASNet      │
                          └──────────────────────────┘
```

- **`examguard-core` (Node.js/Express + React/Vite):** Xử lý nghiệp vụ Đào tạo (Khoa, Khóa, Lớp, Môn học, Sinh viên, Giảng viên), Quản lý Ngân hàng đề thi, Tổ chức Ca thi, Xếp chỗ, Sơ đồ phòng thi 3D realtime, Rà soát điểm và Công bố kết quả.
- **`examguard-ai` (Python/FastAPI):** Động cơ Face AI microservice nhận diện khuôn mặt 1:1, nhận diện 1:N trong phòng thi, kiểm tra giả mạo (Liveness Detection), phân tích tư thế đầu 3D (Pose Yaw/Pitch/Roll) và so khớp danh tính Cán bộ coi thi đi quanh lớp để tránh phạt oan.

---

## 🚀 Hướng dẫn Cài đặt & Khởi chạy

### 1. Yêu cầu hệ thống
- **Node.js:** v18.0.0+
- **Python:** 3.10+
- **MongoDB:** v6.0+ (chạy tại cổng mặc định `27017`)

### 2. Khởi chạy Core Backend & Frontend (`examguard-core`)
```bash
cd examguard-core

# Cài đặt thư viện
npm install

# Khởi chạy đồng thời cả Server Backend (port 3011) và Frontend Vite (port 5173)
npm run dev
```

### 3. Khởi chạy Python Face AI Microservice (`examguard-ai`)
```bash
cd examguard-ai

# Cài đặt dependencies
pip install -r requirements.txt

# Khởi chạy microservice (port 8000)
python main.py
```

### 4. Kiểm thử hệ thống tự động
```bash
cd examguard-core
node server/test_examguard_api.js
```

---

## 📜 Tài liệu Tham khảo
- Xem chi tiết kiến trúc và đặc tả nghiệp vụ đầy đủ tại [`SYSTEM_BLUEPRINT.md`](./SYSTEM_BLUEPRINT.md).
