# TÀI LIỆU ĐẶC TẢ KỸ THUẬT & KẾ HOẠCH TRIỂN KHAI TỔNG THỂ (MASTER BLUEPRINT v2.0)
**Tên dự án:** Hệ thống Quản lý Thi Trực tuyến & Giám sát Phòng thi 3D Ứng dụng AI (AI Proctoring & 3D Digital Twin Exam System)  
**Quy mô thiết kế:** 10.000 Sinh viên | Chịu tải: 1.000 – 1.500 CCU (Kết nối đồng thời)

---

## PHẦN 1: GIẢI PHÁP KHẮC PHỤC 3 BÀI TOÁN THỰC TẾ (CẬP NHẬT CỐT LÕI)

### 1.1. Giải pháp cho Hình thức 3: Sinh viên IT thi bằng Laptop cá nhân (BYOD Mode)
Khi sinh viên mang laptop cá nhân vào phòng thi (thường gặp ở các môn Lập trình, Đồ án, Thi trên phòng lý thuyết không có PC), hệ thống kích hoạt **Cơ chế Bảo mật Kép (SEB Lockdown + Dual-View Camera)**:

*   **Chống gian lận phần mềm trên máy cá nhân (Safe Exam Browser - SEB):**
    *   Sinh viên bắt buộc mở bài thi thông qua **Safe Exam Browser (SEB)** (hoặc Electron Kiosk Agent của trường).
    *   Tự động phát hiện và **chặn đứng Máy ảo (VMware, VirtualBox, Hyper-V)**, chặn Remote Desktop (AnyDesk, TeamViewer, UltraViewer), chặn cắm màn hình thứ 2, và tự động tắt các tiến trình cấm (Discord, Zalo, trình duyệt ngầm) trước khi cho phép mở đề.
*   **Chống thi hộ ở ngoài phòng thi (Network & Seat Binding):**
    *   **Xác thực Mạng nội bộ:** Backend kiểm tra dải IP của gói tin phải thuộc VLAN Wifi Phòng thi của trường.
    *   **Mã PIN/QR theo Ghế ngồi:** Sau khi sinh viên quét mặt tại Kiosk cửa phòng (hoặc Giám thị điểm danh), hệ thống cấp 1 mã **Seat Token** gắn liền với bàn (VD: `R2-C3`). Sinh viên mở laptop cá nhân, nhập mã này + quét mặt qua Webcam của laptop mới mở khóa được bài thi và hiện Avatar lên đúng bàn `R2-C3` trên Phòng thi 3D.
*   **Giám sát 2 lớp (Dual-Camera Cross-Check):**
    *   **Lớp 1 (Webcam trên Laptop cá nhân):** Bắt trực diện khuôn mặt và ánh nhìn (`MediaPipe` chạy ở mức 30 FPS).
    *   **Lớp 2 (Hệ thống nhiều Camera CCTV trên tường phòng thi):** Quét từ trên cao xuống để bắt hành vi dùng điện thoại giấu dưới gầm bàn hoặc trao đổi với bàn bên cạnh (vốn nằm ngoài góc nhìn của webcam laptop).

### 1.2. Giải pháp Đa Camera trong 1 Phòng thi (Multi-Camera Architecture `1-N`)
Loại bỏ việc lưu cứng 1 link camera trong bảng `phong_thi`. Hệ thống chuyển sang kiến trúc **Một phòng thi có nhiều Camera (`1 - N`)**:
*   Mỗi phòng thi có thể lắp đặt $1, 2, 3...$ hoặc $N$ Camera CCTV (Góc Trái, Góc Phải, Đầu phòng, Cuối phòng).
*   **Phân vùng Bàn theo từng Camera (Camera-to-Desk ROI Mapping):** Ví dụ phòng có 40 bàn (`R1-C1` đến `R4-C10`) và 2 Camera:
    *   `Camera_01` (Đầu phòng) được cấu hình phụ trách đa giác tọa độ từ bàn `R1-C1` đến `R2-C10` (20 bàn đầu).
    *   `Camera_02` (Cuối phòng) phụ trách đa giác tọa độ từ bàn `R3-C1` đến `R4-C10` (20 bàn cuối).
*   **Hợp nhất sự kiện (Multi-Cam Fusion):** Dù `Camera_01` hay `Camera_02` hay `Webcam Laptop` bắt được lỗi của sinh viên ngồi tại bàn `R2-C3`, tất cả đều quy chiếu về mã định danh bàn `R2-C3` trên **Phòng thi 3D** duy nhất.

---

## PHẦN 2: SƠ ĐỒ WORKFLOW TOÀN HỆ THỐNG (END-TO-END SYSTEM WORKFLOWS)

Dưới đây là 5 luồng hoạt động (Workflows) xương sống của hệ thống, mô tả chi tiết luồng đi của dữ liệu giữa các tác nhân và các Services:

### Workflow 1: Luồng Khởi tạo Kỳ thi, Cấu hình Đa Camera & Xếp chỗ Phòng 3D
```text
[Admin / Khảo thí] 
   │
   ├── 1. Khai báo Phòng thi (Bảng `phong_thi`): Nhập Số dãy (Rows) x Số cột (Cols) -> Tạo khung lưới 3D.
   │
   ├── 2. Gắn danh sách Camera vào Phòng (Bảng `camera_phong_thi`):
   │      ├── Thêm Cam 1 (RTSP URL 1) -> Vẽ vùng Polygon ROI cho các bàn nửa trên.
   │      └── Thêm Cam 2 (RTSP URL 2) -> Vẽ vùng Polygon ROI cho các bàn nửa dưới.
   │
   ├── 3. Tạo Ca thi (Bảng `ca_thi`): Chọn Môn, Phòng, Giờ thi, Hình thức ('LAB_PC' | 'BYOD_LAPTOP' | 'PAPER').
   │      └── Gán Giảng viên coi thi (Bảng `phan_cong_coi_thi`) + Gắn mã Đề thi từ MongoDB (`de_thi_mongo_id`).
   │
   └── 4. Import Danh sách Sinh viên & Bấm [Xếp Chỗ Tự Động]:
          └── [Flask Core Service] trộn ngẫu nhiên sinh viên -> Gán SBD -> Gán cứng tọa độ bàn (`R1-C1`...`Rn-Cm`) 
              vào bảng `sinh_vien_ca_thi` với trạng thái `not_checkin` và `diem_uy_tin = 100`.
```

### Workflow 2: Luồng Định danh Khuôn mặt Gốc (Onboarding KYC)
```text
[Sinh viên] ──(1. Đăng nhập lần đầu)──> [ReactJS Client]
                                              │
   ┌──────────────────────────────────────────┘
   ▼
[Webcam chụp 3 góc: Thẳng, Trái, Phải] ──(2. POST /ai/kyc/register-face)──> [FastAPI AI Service]
                                                                                   │
   ┌───────────────────────────────────────────────────────────────────────────────┘
   ▼
[ONNXRuntime chạy MiniFASNet (Check người thật) + InsightFace (Trích xuất Vector 512 chiều)]
   │
   ├── Nếu Giả mạo / Không rõ mặt ──> Trả về lỗi 400 (Yêu cầu chụp lại).
   └── Nếu Hợp lệ ──> Lưu mảng 512 số thực vào cột `face_embedding` (Bảng `sinh_vien` - MySQL).
```

### Workflow 3: Luồng Check-in Phòng thi cho cả 3 Hình thức (PC Lab / Laptop Cá nhân / Thi Giấy)
```text
                   ┌── [TH1: Thi Giấy] ────────> SV đứng trước Kiosk Cam ở cửa phòng 1 giây.
[Sinh viên vào thi]├── [TH2: Thi Máy PC Lab] ──> SV ngồi vào PC của trường, mở trình duyệt khóa sẵn.
                   └── [TH3: Thi Laptop BYOD] ─> SV mở Safe Exam Browser trên Laptop, kết nối Wifi phòng thi.
                                  │
                                  ▼
              [Chụp ảnh khuôn mặt thực tế qua Camera/Webcam]
                                  │
                                  ▼ (POST /ai/checkin/verify)
                        [FastAPI AI Service]
                                  │
   ┌──────────────────────────────┴───────────────────────────────┐
   ▼                                                              ▼
1. Kiểm tra Anti-Spoofing (Chống ảnh/điện thoại)       2. Tính Cosine Similarity với `face_embedding`
   │                                                              │
   └──────────────────────────────┬───────────────────────────────┘
                                  ▼
                [Điểm khớp `similarity_score` >= 0.75 ?]
                  ├── SAI ──> Báo đỏ trên màn hình + Báo Giám thị kiểm tra thủ công.
                  └── ĐÚNG ─> 1. Lưu ảnh vào `captured_image_url`, cập nhật `thoi_gian_checkin`.
                              2. Đổi `trang_thai` = `'checkin'` trong bảng `sinh_vien_ca_thi`.
                              3. Bắn sự kiện Redis -> [Flask Socket.IO] -> [Phòng thi 3D Giám thị]:
                                 Chiếc bàn tại tọa độ `vi_tri_ngoi` (VD: R2-C3) bật sáng MÀU XANH LÁ + hiện Avatar 3D.
                              4. Mở khóa Đề thi từ MongoDB (nếu là Thi PC Lab hoặc Laptop BYOD).
```

### Workflow 4: Luồng Giám sát AI Thời gian thực & Đồng bộ Phòng thi 3D (Trong giờ thi)
```text
╔══════════════════════════════════════════════════════╗   ╔══════════════════════════════════════════════════════╗
║ NHÁNH A: WEBCAM TRỰC DIỆN (Thi PC Lab & Laptop BYOD) ║   ║ NHÁNH B: ĐA CAMERA CCTV PHÒNG (Thi Giấy & Laptop)    ║
╠══════════════════════════════════════════════════════╣   ╠══════════════════════════════════════════════════════╣
║ 1. Trình duyệt/SEB khóa Fullscreen, chặn chuyển Tab, ║   ║ 1. [FastAPI AI Service] mở các Worker đọc đồng thời  ║
║    chặn Máy ảo, chặn màn hình phụ.                   ║   ║    N luồng RTSP từ bảng `camera_phong_thi` (5 FPS).  ║
║ 2. Web Worker chạy `MediaPipe Face Mesh` (30 FPS)    ║   ║ 2. Chạy `yolov8n-pose.onnx` lấy 17 điểm khung xương  ║
║    tính góc quay đầu (Yaw, Pitch) & hướng mắt (Gaze).║   ║    của tất cả sinh viên trong khung hình.            ║
║ 3. Nếu SV làm bài nghiêm túc: Tốn 0% băng thông.     ║   ║ 3. Dùng thư viện `Shapely` đối chiếu tọa độ từng     ║
║ 4. KHI VI PHẠM (Quay đầu >3s, liếc mắt >4s, 2 mặt,   ║   ║    người với đa giác bàn (`roi_mapping_json`).       ║
║    mất mặt, chuyển tab):                             ║   ║ 4. KHI VI PHẠM (Xoay vai sang bàn bên cạnh, cúi gằm  ║
║    -> Cắt 1 ảnh nén (30KB) + Góc Yaw/Pitch gửi về    ║   ║    xuống hộc bàn, rời khỏi vị trí ghế ngồi):         ║
║       FastAPI (`POST /ai/proctor/report-violation`). ║   ║    -> Cắt ảnh vùng bàn vi phạm + định danh mã bàn.   ║
╚══════════════════════════╤═══════════════════════════╝   ╚══════════════════════════╤═══════════════════════════╝
                           └────────────────────────────┬─────────────────────────────┘
                                                        ▼
                                       [FastAPI AI Proctoring Engine]
                                                        │
        ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
        ▼                                               ▼                                               ▼
1. Ghi Document bằng chứng vào             2. Trừ `diem_uy_tin` của SV            3. Publish gói tin JSON cảnh báo
   MongoDB (`ai_proctoring_logs`).            trong MySQL (`sinh_vien_ca_thi`).      vào kênh **Redis Pub/Sub**.
                                                                                                        │
                                                                                                        ▼
                                                                                       [Flask-SocketIO Server (Gevent)]
                                                                                                        │
        ┌───────────────────────────────────────────────┬───────────────────────────────────────────────┘
        ▼                                               ▼                                               ▼
[Màn hình 3D của Giám thị & Quản lý]          [Màn hình Sinh viên (PC/Laptop)]               [Bảng Điều khiển Giám thị]
- Bàn `R2-C3` nhấp nháy CỘT SÁNG ĐỎ.          - Hiện Popup cảnh báo đỏ giữa màn hình.        - Phát âm báo nhẹ, ghim thẻ
- Đầu Avatar 3D xoay đúng góc Yaw/Pitch       - Phát âm thanh nhắc nhở.                        vi phạm kèm ảnh chụp thực tế.
  thực tế + hiển thị hình nón hướng nhìn.     - Hiển thị số điểm uy tín còn lại.             - Giám thị Click vào bàn 3D để
                                                                                               Xem ảnh / Cảnh cáo / Đình chỉ.
```

### Workflow 5: Luồng Thu bài, Chấm điểm & Xuất Báo cáo Toàn vẹn (Post-Exam)
```text
[Hết giờ thi hoặc Sinh viên bấm Nộp bài / Giám thị thu bài giấy]
   │
   ├── 1. Với Thi Máy (PC Lab / Laptop BYOD):
   │      ├── Khóa giao diện làm bài ngay lập tức, chốt bản ghi cuối cùng trong MongoDB (`exam_submissions`).
   │      └── [Flask Core Service] đối chiếu đáp án -> Chấm điểm tự động -> Lưu vào cột `diem_thi` (Bảng `sinh_vien_ca_thi`).
   │
   ├── 2. Với Thi Giấy:
   │      └── Sinh viên nộp giấy thi -> Giám thị bấm xác nhận thu bài trên sơ đồ ghế (hoặc quét mặt Checkout).
   │
   └── 3. Cập nhật `trang_thai` = `'checkout'` -> Tổng hợp [Hồ sơ Toàn vẹn Bài thi (Integrity Report)]:
          Kết hợp Điểm số (MySQL) + Điểm uy tín + Dòng thời gian toàn bộ ảnh bằng chứng vi phạm (MongoDB)
          để Giám thị và Hội đồng thi duyệt kết quả cuối cùng.
```

---

## PHẦN 3: THIẾT KẾ CƠ SỞ DỮ LIỆU LAI HOÀN CHỈNH (HYBRID DATABASE SCHEMA v2.0)

Bản thiết kế dưới đây đã sửa lỗi quan hệ Camera (`1 Phòng - N Camera`) và bổ sung các trường kiểm soát thiết bị Laptop cá nhân (BYOD).

### 3.1. Cơ sở dữ liệu Quan hệ – MySQL (12 Bảng Chuẩn Hóa)

#### Nhóm A: Các bảng Danh mục & Người dùng (Kế thừa từ Class Diagram gốc)
1.  **`users`**: `id` (PK), `username`, `password_hash`, `role` (`enum('admin','teacher','student')`), `is_active`, `created_at`.
2.  **`khoa`**: `id` (PK), `ma_khoa`, `ten_khoa`, `so_dien_thoai`.
3.  **`lop`**: `id` (PK), `ma_lop`, `ten_lop`, `khoa_hoc`, `khoa_id` (FK -> `khoa.id`).
4.  **`sinh_vien`**: `id` (PK), `user_id` (FK -> `users.id`), `ma_sv` (Unique), `ho_ten`, `ngay_sinh`, `gioi_tinh`, `email`, `lop_id` (FK -> `lop.id`), `avatar_url`, `face_embedding` (JSON - Vector 512 chiều), `face_updated_at`.
5.  **`giang_vien`**: `id` (PK), `user_id` (FK -> `users.id`), `ma_gv` (Unique), `ho_ten`, `email`, `khoa_id` (FK -> `khoa.id`), `avatar_url`, `face_embedding` (JSON).
6.  **`mon_hoc`**: `id` (PK), `ma_mon`, `ten_mon`, `so_tin_chi`, `khoa_id` (FK -> `khoa.id`).
7.  **`hoc_ky`**: `id` (PK), `ten_hoc_ky`, `nam_hoc`, `ngay_bat_dau`, `ngay_ket_thuc`.

#### Nhóm B: Các bảng Quản lý Phòng thi 3D, Đa Camera & Ca thi (Thiết kế Mới & Nâng cấp)
8.  **`phong_thi` *(Quản lý cấu trúc không gian 3D & Mạng phòng thi)*:**
    *   `id` (Int, PK)
    *   `ma_phong` (varchar 20, Unique) – VD: `'P302'`
    *   `ten_phong` (varchar 100)
    *   `loai_phong_mac_dinh` (`enum('LAB_PC', 'HALL_ROOM')`)
    *   `so_day` (Int) – Số hàng bàn dùng để dựng lưới 3D (VD: `4`)
    *   `so_cot` (Int) – Số cột bàn mỗi dãy dùng để dựng lưới 3D (VD: `10`)
    *   `allowed_ip_subnet` (varchar 50, Nullable) – Dải IP Wifi hợp lệ của phòng (VD: `'192.168.30.0/24'`) để chống sinh viên dùng Laptop cá nhân ngồi ngoài phòng thi.

9.  **`camera_phong_thi` *(Bảng Mới – Giải quyết bài toán 1 Phòng có 1 hoặc Nhiều Camera)*:**
    *   `id` (Int, PK)
    *   `phong_thi_id` (Int, FK -> `phong_thi.id`) – Quan hệ `N - 1` với `phong_thi`
    *   `ma_camera` (varchar 30) – VD: `'CAM_P302_TRUOC'`, `'CAM_P302_SAU'`
    *   `vi_tri_lap_dat` (`enum('FRONT_LEFT', 'FRONT_RIGHT', 'BACK_LEFT', 'BACK_RIGHT', 'CENTER_CEILING', 'KIOSK_DOOR')`)
    *   `rtsp_url` (varchar 255) – Đường dẫn luồng video của từng camera
    *   `do_phan_giai` (varchar 20) – VD: `'1920x1080'`
    *   `roi_polygons_json` (JSON) – Lưu tọa độ đa giác (4 đỉnh X, Y) của các bàn mà camera này phụ trách quan sát (VD: `{"R1-C1": [[120,200],[180,200],[180,260],[120,260]], "R1-C2": [...]}`).
    *   `is_active` (boolean, Default: `true`)

10. **`ca_thi` *(Hỗ trợ 3 hình thức thi)*:**
    *   `id` (Int, PK)
    *   `ma_ca_thi` (varchar 30, Unique)
    *   `mon_hoc_id` (Int, FK -> `mon_hoc.id`)
    *   `hoc_ky_id` (Int, FK -> `hoc_ky.id`)
    *   `phong_thi_id` (Int, FK -> `phong_thi.id`)
    *   `hinh_thuc_thi` (`enum('LAB_PC', 'BYOD_LAPTOP', 'PAPER')`) – Thi máy phòng Lab / Thi Laptop cá nhân (IT) / Thi giấy.
    *   `de_thi_mongo_id` (varchar 50, Nullable)
    *   `require_seb_lockdown` (boolean, Default: `true`) – Bắt buộc mở bằng Safe Exam Browser khi thi `BYOD_LAPTOP`.
    *   `ngay_thi` (Date), `gio_bat_dau` (Time), `gio_ket_thuc` (Time)
    *   `trang_thai_ca` (`enum('UPCOMING', 'ACTIVE', 'FINISHED')`)

11. **`phan_cong_coi_thi` *(Gán Giám thị vào Ca thi)*:**
    *   `id` (Int, PK)
    *   `ca_thi_id` (Int, FK -> `ca_thi.id`)
    *   `giang_vien_id` (Int, FK -> `giang_vien.id`)
    *   `vai_tro` (`enum('GIAM_THI_1', 'GIAM_THI_2', 'THANH_TRA')`)

12. **`sinh_vien_ca_thi` *(Ánh xạ Sinh viên lên Bàn 3D & Quản lý Phiên thiết bị)*:**
    *   `id` (BigInt, PK)
    *   `ca_thi_id` (Int, FK -> `ca_thi.id`)
    *   `sinh_vien_id` (Int, FK -> `sinh_vien.id`)
    *   `so_bao_danh` (varchar 20)
    *   `vi_tri_ngoi` (varchar 20) – Mã tọa độ bàn 3D chuẩn hóa, VD: `'R2-C3'`
    *   `seat_pin_code` (varchar 10) – Mã PIN 6 số cấp tại phòng để SV dùng Laptop cá nhân xác thực đúng ghế ngồi.
    *   `client_ip_address` (varchar 45, Nullable) – Lưu IP máy tính/laptop của sinh viên lúc làm bài.
    *   `device_fingerprint` (varchar 255, Nullable) – Định danh phần cứng trình duyệt/SEB (chống đăng nhập 2 máy cùng lúc).
    *   `thoi_gian_checkin` (Datetime, Nullable)
    *   `similarity_score` (Float, Nullable)
    *   `captured_image_url` (varchar 255, Nullable)
    *   `trang_thai` (`enum('not_checkin', 'checkin', 'checkout', 'suspicious', 'suspended')`)
    *   `diem_uy_tin` (Int, Default: `100`)
    *   `diem_thi` (Float, Nullable)

---

### 3.2. Cơ sở dữ liệu Phi cấu trúc – MongoDB (3 Collections)

1.  **`exams` (Ngân hàng đề thi):** Hỗ trợ câu hỏi Trắc nghiệm (`MULTIPLE_CHOICE`), Tự luận (`ESSAY`), và **Chấm code tự động cho SV IT (`CODING_PROBLEM` kèm Test Cases)**.
2.  **`exam_submissions` (Bài làm thời gian thực):** Lưu đáp án trắc nghiệm hoặc source code sinh viên đang gõ (Auto-save mỗi 10 giây).
3.  **`ai_proctoring_logs` (Nhật ký & Bằng chứng vi phạm đa nguồn):**
    ```json
    {
      "_id": "665f1c773c4d5e6f7a8b9c99",
      "ca_thi_id": 102,
      "sinh_vien_ca_thi_id": 5088,
      "vi_tri_ngoi": "R2-C3",
      "timestamp": "2026-10-14T08:45:03Z",
      "nguon_camera": {
        "loai_nguon": "ROOM_CCTV", // hoặc "WEBCAM_PC", "WEBCAM_LAPTOP_BYOD", "SEB_SYSTEM"
        "camera_id": 4,            // Tham chiếu tới `camera_phong_thi.id` (nếu bắt từ CCTV phòng)
        "ma_camera": "CAM_P302_TRUOC"
      },
      "loai_vi_pham": "HEAD_TURN", // GAZE_OFF, MULTI_FACE, TAB_SWITCH, VM_DETECTED, SECONDARY_MONITOR, LEAVE_SEAT
      "muc_do": "HIGH",
      "diem_tru": 10,
      "telemetry_3d": {
        "yaw": -45.2,
        "pitch": 4.8,
        "gaze_direction": "LEFT"
      },
      "evidence_image_url": "/static/evidences/ca102/cam4_sv5088_084503.jpg",
      "trang_thai_duyet": "PENDING"
    }
    ```

---

## PHẦN 4: BỘ THƯ VIỆN CHUẨN & CHỨNG MINH KỸ THUẬT

### 4.1. Service 2 – AI Proctoring Engine (`ai-service/requirements.txt` - FastAPI)
```txt
# 12 Thư viện cốt lõi
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
python-multipart>=0.0.9
numpy>=1.24.0
pillow>=10.0.0
opencv-python-headless>=4.8.0
onnxruntime>=1.16.0
requests>=2.31.0
pymongo>=4.6.0
python-dotenv>=1.0.0
pytest>=8.0.0

# 5 Thư viện bổ sung cho Đa Camera, Nhận diện & Kết nối Realtime
insightface>=0.7.3          # Trích xuất vector khuôn mặt 512-D siêu tốc trên onnxruntime (~20ms/mặt)
motor>=3.3.0                # Async MongoDB driver chống nghẽn khi ghi hàng ngàn log vi phạm cùng lúc
shapely>=2.0.3              # Xử lý đa giác vùng bàn (ROI) cho hệ thống nhiều Camera CCTV trong 1 phòng
redis>=5.0.0                # Đẩy cảnh báo sang Flask Socket.IO trong < 1ms
python-socketio>=5.11.0     # Phát sự kiện trực tiếp lên Phòng thi 3D
```

### 4.2. Service 1 – Core Backend (`core-service/requirements.txt` - Flask)
```txt
Flask>=3.0.2
Flask-Cors>=4.0.0
Flask-SQLAlchemy>=3.1.1     # Quản lý 12 bảng MySQL với QueuePool chịu tải 1.500 CCU
Flask-Migrate>=4.0.7
PyMySQL>=1.1.0
cryptography>=42.0.0
Flask-JWT-Extended>=4.6.0
bcrypt>=4.1.2
Flask-SocketIO>=5.3.6       # Điều phối WebSocket cho Phòng thi 3D và Popup cảnh báo
gevent>=24.2.1              # Xử lý bất đồng bộ hàng ngàn kết nối WebSocket đồng thời
gevent-websocket>=0.10.1
redis>=5.0.0
pymongo>=4.6.0
python-dotenv>=1.0.0
```

### 4.3. Frontend Client (`frontend-client/package.json` - ReactJS + Tailwind)
```bash
npm install three @types/three @react-three/fiber @react-three/drei zustand socket.io-client axios @mediapipe/tasks-vision react-webcam lucide-react katex react-katex @monaco-editor/react clsx tailwind-merge
```
*(Bổ sung `@monaco-editor/react`: Trình soạn thảo code chuẩn VS Code nhúng ngay trong trang thi dành riêng cho sinh viên IT làm bài thi lập trình trên Laptop/PC).*

---

## PHẦN 5: LỘ TRÌNH TRIỂN KHAI CHI TIẾT (MASTER ROADMAP 6 GIAI ĐOẠN)

| Giai đoạn | Thời gian | Hạng mục Triển khai Cụ thể | Đầu ra Nghiệm thu (Deliverables) |
| :--- | :--- | :--- | :--- |
| **GĐ 1: Hạ tầng & CSDL Đa Camera** | Tuần 1 – 2 | 1. Dựng Docker Compose (MySQL, MongoDB, Redis).<br>2. Viết Models SQLAlchemy cho **12 bảng MySQL** (bao gồm bảng `camera_phong_thi` quan hệ `1-N` với `phong_thi`).<br>3. Xây dựng công cụ vẽ đa giác bàn (ROI Polygon Drawer) trên giao diện Admin cho từng Camera trong phòng. | Tạo được 1 phòng thi gắn 3 Camera CCTV, mỗi Camera lưu được tọa độ đa giác của các bàn tương ứng. |
| **GĐ 2: Quản lý Thi, BYOD Lockdown & Code Editor** | Tuần 3 – 4 | 1. Thuật toán xếp chỗ tự động (`R1-C1`...`Rn-Cm`) & sinh mã `seat_pin_code`.<br>2. Xây dựng cổng làm bài thi tích hợp `@monaco-editor/react` (cho SV IT thi code) và `KaTeX` (công thức toán).<br>3. Tích hợp kiểm tra Header `Safe Exam Browser (SEB)`, kiểm tra dải IP phòng thi (`allowed_ip_subnet`), chặn máy ảo & cắm màn hình phụ cho chế độ `BYOD_LAPTOP`. | Sinh viên mở bằng Chrome thường bị chặn; mở bằng SEB trong mạng Wifi phòng thi + nhập đúng mã PIN bàn mới vào được đề thi. |
| **GĐ 3: AI KYC & Check-in Đa Chế độ** | Tuần 5 – 6 | 1. Tích hợp `InsightFace` + `MiniFASNet` chạy trên `onnxruntime`.<br>2. Xây dựng luồng đăng ký mặt 3 góc và luồng Check-in cho cả 3 chế độ (`LAB_PC`, `BYOD_LAPTOP`, `PAPER`). | Quét mặt Check-in dưới `200ms`, chống được việc giơ ảnh trên điện thoại lên webcam, tự động bật sáng ghế tương ứng trên sơ đồ. |
| **GĐ 4: Hệ thống Giám sát AI Kép & Đa Luồng CCTV** | Tuần 7 – 9 | 1. **Client Edge AI:** Nhúng `@mediapipe/tasks-vision` vào Web Worker trên ReactJS bắt hướng mắt (Gaze) và góc quay đầu 30 FPS trên PC/Laptop.<br>2. **Server Multi-CCTV AI:** Xây dựng trình quản lý đa luồng (`Multiprocessing Stream Reader`) trên FastAPI đọc đồng thời nhiều camera của 1 phòng, chạy `yolov8n-pose.onnx` + `Shapely` để phát hiện quay cóp, dùng điện thoại gầm bàn và rời vị trí. | Cả Webcam trên Laptop cá nhân lẫn 2-3 Camera CCTV trên tường đều gửi cảnh báo chính xác về đúng tọa độ bàn `vi_tri_ngoi` của sinh viên vi phạm. |
| **GĐ 5: Phòng thi 3D & Cảnh báo 3 Chiều** | Tuần 10 – 11 | 1. Dùng `@react-three/fiber` (`InstancedMesh`) dựng tự động phòng thi 3D, hiển thị cả **vị trí các Camera CCTV trên tường 3D** và lưới bàn ghế.<br>2. Đồng bộ qua `Flask-SocketIO` + `Zustand`: Xoay đầu Avatar 3D theo góc thực tế, chớp cột sáng đỏ tại bàn vi phạm.<br>3. Làm Popup cảnh báo cho Sinh viên, Giám thị, Quản lý và tính năng Click vào bàn 3D để xem ảnh bằng chứng từ cả Webcam lẫn CCTV. | Giám thị nhìn vào Phòng 3D thấy rõ bàn nào đang báo đỏ, click vào xem được ảnh chụp từ Webcam laptop và ảnh chụp từ Camera góc tường để đối chứng. |
| **GĐ 6: Hậu kiểm & Stress Test 1.500 CCU** | Tuần 12 | 1. Xây dựng trang **Báo cáo Toàn vẹn Bài thi (Integrity Report)** sau ca thi.<br>2. Viết kịch bản `pytest` và dùng `Locust` giả lập **1.500 kết nối đồng thời** để tối ưu hóa cấu hình `gevent` và `uvicorn`. | Hệ thống vận hành ổn định ở mốc 1.500 sinh viên thi cùng lúc, độ trễ cảnh báo lên Phòng 3D dưới `300ms`. |