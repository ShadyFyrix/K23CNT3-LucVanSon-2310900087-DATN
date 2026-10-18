# EXAMGUARD AI — SYSTEM BLUEPRINT v1.0
## Tài liệu Phân tích Nghiệp vụ & Kỹ thuật Toàn diện

> **Mục đích:** Tài liệu này là nguồn tham chiếu duy nhất (Single Source of Truth) cho toàn bộ quá trình phát triển.  
> AI/Dev đọc tài liệu này là đủ — không cần đọc lại tài liệu gốc v2.0.  
> Cập nhật mỗi khi có thay đổi quyết định kiến trúc.

---

## MỤC LỤC
1. [Tổng quan hệ thống](#1-tổng-quan)
2. [Actor & Role Matrix (RBAC + CBAC & Zero-Trust)](#2-actor--role-matrix)
3. [State Machine: Sinh viên trong Ca thi & Điểm uy tín](#3-state-machine)
4. [5 Workflow Chi tiết](#4-workflows)
5. [Database Schema — MySQL (Các bảng cơ bản & chuẩn hóa)](#5-mysql-schema)
6. [Database Schema — MongoDB Collections](#6-mongodb-schema)
7. [API Contract Core & AI Service](#7-api-contract)
8. [Business Rules & Validation](#8-business-rules)
9. [UI/UX Flow theo Role](#9-uiux-flow)
10. [Technical Architecture](#10-technical-architecture)
11. [Quản lý Đề thi, Tự động Chấm Trắc nghiệm, Rà soát 1 lần, Duyệt & Công bố Đáp án](#11-đề-thi--cấu-trúc--nghiệp-vụ-quản-lý)
12. [Giao diện Làm bài Thi (UI Candidate Layout)](#12-giao-diện-làm-bài-thi--uiux-chi-tiết)
13. [Xử lý Giám thị Đi quanh lớp & Xác thực Khuôn mặt Cán bộ Coi thi (Log không trừ điểm)](#13-xử-lý-giám-thị-đi-quanh-lớp--false-positive-detection)
14. [Mục lục Cập nhật Changelog (v1.3)](#14-mục-lục-cập-nhật-v13)
15. [Luồng Quản lý Phân cấp Tổ chức: Khoa — Khóa học — Lớp — Sinh viên & Giảng viên](#15-luồng-quản-lý-phân-cấp-tổ-chức-khoa--khóa-học--lớp--sinh-viên--giảng-viên)
16. [API Contracts & Dữ liệu: Tự động Chấm điểm, Rà soát, Phê duyệt & Công bố Đáp án](#16-api-contracts--dữ-liệu-tự-động-chấm-điểm-rà-soát-phê-duyệt--công-bố-đáp-án)
17. [Nâng cấp Hệ thống Giám sát Phòng thi: Socket.IO Realtime, Face AI 3D Pose & Chống Gian lận Trình duyệt](#17-nâng-cấp-hệ-thống-giám-sát-phòng-thi-socketio-face-ai-3d-pose--anti-cheat)
18. [Kiến trúc Đề thi Đa dạng: Đề thi Hỗn hợp, Đề theo File & Quy chế Chấm Đa đáp án](#18-kiến-trúc-đề-thi-đa-dạng-đề-thi-hỗn-hợp-trắc-nghiệm--tự-luận-đề-theo-file--quy-chế-chấm-đa-đáp-án-multi-select--alternative-keys)
19. [Danh mục Toàn diện Nền tảng Hệ thống, Công nghệ & Thư viện (Tech Stack & Libraries Specification)](#19-danh-mục-toàn-diện-nền-tảng-hệ-thống-công-nghệ--thư-viện-tech-stack--libraries-specification)

---

## 1. TỔNG QUAN

**Tên hệ thống:** ExamGuard AI — Hệ thống Quản lý Thi Trực tuyến Tích hợp Xác thực Khuôn mặt  
**Quy mô thiết kế:** 10.000 sinh viên, 1.000–1.500 CCU  
**3 hình thức thi:**

| Mã | Tên | Mô tả | Đặc điểm bảo mật |
|---|---|---|---|
| `LAB_PC` | Thi máy phòng Lab | SV ngồi tại PC của trường | Trình duyệt khóa sẵn + Webcam PC + Camera CCTV |
| `BYOD_LAPTOP` | Thi Laptop cá nhân | SV mang laptop vào | SEB + IP VLAN + Seat PIN + Webcam laptop + Camera CCTV |
| `ONLINE_QUIZ` | Thi Trắc nghiệm Quiz Trực tuyến | SV làm bài quiz tương tác trên Web/PC/Laptop | AI Face Tracking + Anti-tab switch + Đếm ngược câu hỏi + Auto-save & Chấm điểm tức thì |

### 1.1 Triết lý Kiến trúc Cốt lõi: Biometric Ground-Truth Identity First
ExamGuard AI thiết lập nguyên tắc kiến trúc **"Khuôn mặt là Căn cước Sinh trắc học Số Gốc" (Biometric Ground-Truth Identity First)** làm hạt nhân vận hành cho toàn bộ quy trình quản lý đào tạo và tổ chức khảo thí:

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│              BIOMETRIC GROUND-TRUTH BASELINE (DỮ LIỆU CĂN CƯỚC SINH TRẮC HỌC GỐC)                │
│    • Thu thập KYC 5 góc (Thẳng, Trái, Phải, Ngửa, Cúi) + Liveness Anti-Spoofing (MiniFASNet)    │
│    • Trích xuất Vector ArcFace 512-D chuẩn hóa, lưu trữ an toàn trong Cơ sở dữ liệu             │
└───────────────────────────────────────────────┬─────────────────────────────────────────────────┘
                                                │
                 ┌──────────────────────────────┴──────────────────────────────┐
                 ▼                                                             ▼
   ┌───────────────────────────┐                                 ┌───────────────────────────┐
   │        SINH VIÊN          │                                 │        GIẢNG VIÊN         │
   ├───────────────────────────┤                                 ├───────────────────────────┤
   │ 1. Điều kiện tiên quyết:  │                                 │ 1. Điều kiện phân công:   │
   │    Bắt buộc KYC APPROVED  │                                 │    Bắt buộc KYC APPROVED  │
   │    mới được xếp chỗ & thi │                                 │    mới được gán Giám thị  │
   │ 2. Check-in phòng thi:    │                                 │ 2. Staff Face Whitelist:  │
   │    1:1 Face Match ≥ 0.75  │                                 │    Nạp Vector vào Cache   │
   │    (Ngăn 100% thi hộ cổng)│                                 │    trước giờ thi 15 phút  │
   │ 3. Continuous Proctored:  │                                 │ 3. Miễn trừ Giám thị:     │
   │    So khớp ngầm mỗi 20s   │                                 │    STAFF_EXEMPTION (0đ)   │
   │    bắt tráo người giữa giờ│                                 │    khi lại gần bàn kiểm tra│
   │ 4. Chống tạo hồ sơ ảo     │                                 │ 4. Xác thực ký biên bản   │
   └───────────────────────────┘                                 └───────────────────────────┘
```

1. **Bắt buộc đối với Sinh viên (Mandatory Student Ground-Truth):**
   - Hồ sơ sinh viên trong hệ thống quản lý đào tạo phải có ảnh chân dung chuẩn KYC và vector ArcFace 512 chiều được duyệt (`face_status = 'APPROVED'`).
   - Đây là **Ground-Truth Baseline** đối chiếu danh tính xuyên suốt:
     + Khi xếp chỗ ca thi: Chỉ sinh viên có Face KYC hợp lệ mới được cấp Số báo danh (SBD) và gán vị trí bàn.
     + Khi vào phòng thi: AI đối chiếu 1:1 giữa khuôn mặt trước camera và Vector Gốc (ngưỡng Cosine Similarity $\ge 0.75$) kèm kiểm tra Liveness.
     + Trong suốt thời gian làm bài: AI thực hiện **Continuous Biometric Verification (Xác thực Sinh trắc học Liên tục)** định kỳ mỗi 15–20 giây. Nếu người ngồi thi khác với Vector Gốc $\rightarrow$ Báo động đỏ `IMPERSONATION_DETECTED` (Nghi ngờ tráo người/thi hộ giữa giờ), trừ ngay 50 điểm hoặc tự động đình chỉ thi.

2. **Bắt buộc đối với Giảng viên (Mandatory Proctor Ground-Truth):**
   - Giảng viên tham gia hệ thống phải hoàn tất đăng ký khuôn mặt chuẩn KYC để kích hoạt tư cách Cán bộ Coi thi / Cán bộ Thanh tra.
   - Vector Gốc của Giảng viên được hệ thống tự động biên soạn thành **Staff Biometric Whitelist (Danh sách Cán bộ được phép xuất hiện)** nạp sẵn vào Redis/In-Memory Cache của ca thi:
     + Khi Giảng viên đi lại quanh lớp hoặc đứng cạnh bàn thí sinh để kiểm tra máy/giấy tờ, camera AI phát hiện $\ge 2$ khuôn mặt (`MULTIPLE_FACES`) sẽ so khớp ngay với Staff Whitelist.
     + Nếu khuôn mặt thứ hai trùng khớp với Giám thị ca thi $\rightarrow$ Kích hoạt cơ chế `STAFF_EXEMPTION` (**0 điểm trừ - Không phạt thí sinh**), hiển thị thông báo "Cán bộ coi thi đang kiểm tra bàn".
     + Giảng viên điểm danh nhận phòng thi và ký số xác nhận đóng ca thi bằng Face Verification.

---

## 2. ACTOR & ROLE MATRIX

### 2.1 Danh sách Actor & Ngữ cảnh Vai trò (Roles & Contextual Scopes)

Hệ thống ExamGuard AI áp dụng kết hợp **RBAC (Role-Based Access Control)** và **CBAC (Context-Based Access Control)** nhằm phân định chặt chẽ quyền hạn theo từng ngữ cảnh chuyên môn thực tế tại trường đại học:

| Actor | DB Role | Ngữ cảnh chuyên môn (Context Scope) | Mô tả trách nhiệm chính |
|---|---|---|---|
| **Admin / Khảo thí** | `admin` | **Toàn hệ thống (System-wide)** | Quản lý cấu hình AI, danh mục cơ cấu (Khoa - Khóa - Lớp - Môn), tạo ca thi, xếp chỗ, duyệt đề, giám sát toàn diện, phê duyệt KYC ngoại lệ |
| **Giảng viên** | `teacher` | **1. GV Bộ môn (Course Instructor)** | Quản lý ngân hàng câu hỏi, soạn đề thi kèm đáp án đúng & giải thích, chấm bài thi tự luận/code |
| | | **2. Cán bộ Coi thi (Proctor)** | **Bắt buộc KYC Face ID**: Coi thi ca thi được phân công, nạp Face Whitelist để miễn trừ vi phạm khi kiểm tra bàn, giám sát phòng 3D realtime, xử lý vi phạm |
| | | **3. Cán bộ Thanh tra (Inspector)** | **Bắt buộc KYC Face ID**: Giám sát ngẫu nhiên nhiều phòng thi cùng lúc, hậu kiểm tra biên bản ca thi |
| | | **4. Cố vấn học tập (Class Advisor)** | Theo dõi tiến độ học tập, lịch thi, trạng thái KYC và điểm rèn luyện uy tín của lớp mình phụ trách |
| **Sinh viên** | `student` | **Cá nhân (Self-only)** | **Bắt buộc KYC Face ID**: Đăng ký khuôn mặt gốc (KYC 5 góc), xem lịch thi, check-in 1:1, làm bài thi, xác thực liên tục chống thi hộ, xem điểm uy tín realtime |
| **AI Service** | — | **Background Engine (FastAPI)** | Tự động phân tích stream camera (YuNet, ArcFace, YOLOv8 Pose), so sánh đối chiếu liên tục với Vector Gốc, nhận diện cán bộ coi thi, tính điểm uy tín |
| **SEB Agent** | — | **Client Lockdown (Desktop App)** | Khóa màn hình laptop thí sinh (BYOD), chặn đa màn hình, máy ảo, phím tắt gian lận |

---

### 2.2 Ma trận Phân quyền Chi tiết (Comprehensive Permission Matrix)

| Nhóm Nghiệp vụ | Chức năng cụ thể | Admin | Giảng viên | Sinh viên | Ghi chú ràng buộc nghiệp vụ |
|---|---|:---:|:---:|:---:|---|
| **A. Quản trị Tổ chức & Người dùng** | Tạo / sửa / xóa Khoa, Khóa học, Lớp học | ✅ | ❌ | ❌ | Admin Khoa / Đào tạo |
| | Import danh sách Sinh viên / Giảng viên bằng Excel | ✅ | ❌ | ❌ | Tự động tạo user & gán lớp |
| | Phân công Giảng viên làm Cố vấn học tập cho Lớp | ✅ | ❌ | ❌ | |
| | **Đăng ký Face ID Gốc (KYC khuôn mặt 5 góc)** | ❌ | ✅ *(Chính mình)* | ✅ *(Chính mình)* | **Điều kiện TIÊN QUYẾT BẮT BUỘC để được coi thi / dự thi** |
| | Khóa / Mở khóa tài khoản người dùng | ✅ | ❌ | ❌ | |
| | Hủy / Yêu cầu đăng ký lại Face ID khi thay đổi nhận dạng | ✅ | ❌ | ❌ | Admin Khảo thí thẩm định |
| **B. Ngân hàng Đề & Soạn đề** | Quản lý Ngân hàng câu hỏi (MCQ, Essay, Code) | ✅ | ✅ *(Môn phụ trách)* | ❌ | Theo phân công giảng dạy |
| | Soạn đề thi kèm đáp án đúng & lời giải thích | ✅ | ✅ *(Môn phụ trách)* | ❌ | Hỗ trợ Excel/Word/JSON |
| | Phê duyệt đề thi & Mã hóa gán vào Ca thi | ✅ | ❌ | ❌ | Bảo mật tuyệt đối trước giờ thi |
| **C. Khảo thí & Chuẩn bị Ca thi** | Tạo phòng thi 3D, cấu hình số dãy/cột bàn | ✅ | ❌ | ❌ | Khảo thí |
| | Gắn camera CCTV RTSP, vẽ ROI Polygon bàn ngồi | ✅ | ❌ | ❌ | |
| | Tạo Ca thi, chọn môn, hình thức (LAB/BYOD/QUIZ) | ✅ | ❌ | ❌ | |
| | Xếp chỗ sinh viên & cấp Số Báo Danh (SBD) | ✅ | ❌ | ❌ | **Chặn tự động: Chỉ xếp chỗ SV đã KYC APPROVED** |
| | Phân công Giám thị 1, Giám thị 2, Thanh tra | ✅ | ❌ | ❌ | **Chặn tự động: Chỉ gán GV đã KYC APPROVED** |
| | Xem lịch thi cá nhân, số báo danh, vị trí bàn | ✅ | ✅ *(Lịch coi thi)* | ✅ *(Lịch thi của mình)* | |
| **D. Trong Ca thi (Realtime Proctoring)** | Check-in 1:1 khuôn mặt + Liveness detection | ❌ | ❌ | ✅ *(Chính mình)* | So khớp Cosine $\ge 0.75$ với Vector Gốc |
| | Check-in thủ công (Override khi SV hỏng cam) | ✅ | ✅ *(Giám thị ca đó)* | ❌ | Ghi audit log danh tính người duyệt |
| | Xem Dashboard Phòng thi 3D Realtime | ✅ *(Tất cả phòng)* | ✅ *(Chỉ phòng được gán)* | ❌ | Giám sát avatar, cone mắt, vi phạm |
| | Nhận cảnh báo vi phạm AI (Webcam + CCTV) | ✅ | ✅ *(Chỉ phòng được gán)* | ❌ | Kèm ảnh snapshot bằng chứng |
| | Cảnh báo Nghi vấn Tráo người (`IMPERSONATION`) | ✅ *(Tất cả phòng)* | ✅ *(Chỉ phòng được gán)* | ❌ | AI so sánh liên tục với Vector Gốc |
| | Miễn trừ vi phạm Giám thị (`STAFF_EXEMPTION`) | 🤖 | 🤖 | ❌ | Tự động so khớp với Proctor Whitelist |
| | Xem Điểm uy tín (Reputation Score) Realtime | ✅ | ✅ *(Chỉ phòng được gán)* | ✅ *(Chỉ xem điểm mình)* | Thang điểm 0–100 |
| | Gửi Cảnh báo nhắc nhở tới màn hình SV | ✅ | ✅ *(Giám thị ca đó)* | ❌ | Hiện popup nhắc nhở trên máy SV |
| | Đình chỉ thi (Suspension) — Khóa bài làm | ✅ | ✅ *(Giám thị ca đó)* | ❌ | Khi SV gian lận / tráo người nghiêm trọng |
| | Cộng bù giờ (Extra Time) khi SV gặp sự cố | ✅ | ✅ *(Giám thị ca đó)* | ❌ | Tối đa 15 phút, lưu lý do audit |
| | Tạm dừng giám sát bàn (Proctor Override 2 phút) | ❌ | ✅ *(Giám thị ca đó)* | ❌ | Dành khi GT trực tiếp đứng kiểm tra |
| | Bỏ qua vi phạm do AI bắt nhầm (Dismiss) | ✅ | ✅ *(Giám thị ca đó)* | ❌ | Đánh dấu flag, khôi phục điểm uy tín |
| | Gửi yêu cầu trợ giúp kỹ thuật khẩn cấp | ❌ | ❌ | ✅ | Gửi tín hiệu SOS tới bàn giám thị |
| | Làm bài thi & Nộp bài thi | ❌ | ❌ | ✅ | Giao diện 2 panel, auto-save |
| | Thu bài thi cả phòng / Đóng ca thi | ✅ | ✅ *(Giám thị 1 ca đó)* | ❌ | Ký đóng ca thi bằng Face Biometric Auth |
| **E. Chấm thi & Công bố Điểm** | Tự động chấm Trắc nghiệm (MCQ) | 🤖 *(Hệ thống)* | ❌ | ❌ | Tự động tính ngay khi SV nộp bài |
| | Chấm bài Tự luận (Essay) & Code | ❌ | ✅ *(GV được phân công)* | ❌ | Rọc phách (ẩn danh tính sinh viên) |
| | Rà soát bảng điểm tự động & kiểm tra phân tích đề | ✅ | ✅ *(GV chấm thi)* | ❌ | Kiểm tra 1 lần trước khi chốt |
| | Phê duyệt bảng điểm chính thức (Approve) | ✅ | ✅ *(Trưởng bộ môn/GV chấm)* | ❌ | Chốt điểm không cho sửa tự do |
| | Công bố Điểm đi kèm Đáp án & Lời giải cho SV | ✅ | ❌ | ❌ | Kích hoạt quyền tra cứu của SV |
| | Xem kết quả thi chi tiết kèm đối chiếu đáp án | ❌ | ❌ | ✅ *(Chính mình)* | Sau khi ca thi được công bố |
| **F. Hậu kiểm, Audit Log & Phúc khảo** | Xem Integrity Report (Báo cáo vi phạm toàn vẹn) | ✅ | ✅ *(Chỉ ca mình coi)* | ❌ | Gồm timeline + video/ảnh S3 + Log KYC |
| | Gửi đơn phúc khảo bài thi / Điểm uy tín | ❌ | ❌ | ✅ | Trong thời hạn 7 ngày sau công bố |
| | Thẩm tra phúc khảo (Xem lại video CCTV/Webcam) | ✅ *(Khảo thí)* | ✅ *(Hội đồng chấm)* | ❌ | Đối soát toàn bộ log AI & Vector Gốc |
| | Xuất dữ liệu báo cáo (Excel, PDF Biên bản ca thi) | ✅ | ✅ *(Biên bản ca coi)* | ❌ | |

---

### 2.3 Năm Giới hạn Tuyệt đối để Chống Tiêu cực (Zero-Trust Boundaries)

```
RULE-SEC-01: Tính Độc lập giữa Soạn đề và Coi thi (Conflict of Interest)
  → Giảng viên soạn đề thi cho môn học X sẽ TỰ ĐỘNG BỊ LOẠI TRỪ khỏi danh sách phân công coi thi môn X
  → Ngăn chặn triệt để hành vi cố ý nhắc bài hoặc ưu ái cho sinh viên phòng thi.

RULE-SEC-02: Rọc Phách Điện tử khi Chấm Tự luận / Code (Blind Grading)
  → Khi Giảng viên truy cập chấm bài Essay / Coding Problem:
    • Hệ thống ẩn hoàn toàn: Họ tên, Mã SV, Lớp, Ảnh đại diện.
    • Mỗi bài làm được gán một "Mã phách ngẫu nhiên" (Anonymous Hash).
    • Chỉ sau khi Trưởng bộ môn duyệt điểm, hệ thống mới ghép phách trả về danh tính thực.

RULE-SEC-03: Khóa Quyền Giám thị Ngoài Giờ thi (Room-scoped Temporal Lock)
  → Giám thị chỉ có quyền xem phòng 3D và can thiệp trong khung thời gian:
    [T_bat_dau - 15 phút]  đến  [T_ket_thuc + 15 phút].
  → Ngoài khung giờ trên: Toàn bộ nút điều khiển bị vô hiệu hóa (chuyển sang chế độ Read-only).

RULE-SEC-04: Tính Bất biến của Nhật ký Vi phạm AI (Immutable Audit Logs)
  → Cả Admin lẫn Giám thị ĐỀU KHÔNG THỂ XÓA các bản ghi vi phạm trong MongoDB ai_proctoring_logs.
  → Thao tác "Bỏ qua bắt nhầm (Dismiss)" chỉ cập nhật cờ is_dismissed = true kèm lý do và ID người bấm
    để phục vụ thanh tra và hội đồng phúc khảo đối soát.

RULE-SEC-05: Ràng buộc Căn cước Sinh trắc học Gốc (Mandatory Biometric Ground-Truth)
  → KHÔNG MỘT SINH VIÊN NÀO được phép vào phòng thi nếu chưa hoàn thành Đăng ký Khuôn mặt Gốc (face_status != 'APPROVED').
  → KHÔNG MỘT GIẢNG VIÊN NÀO được phân công Giám thị nếu hồ sơ chưa có Vector Khuôn mặt Gốc hợp lệ.
  → Trong ca thi, việc tráo người thi hộ sẽ bị phát hiện bởi Continuous Biometric Verification và đình chỉ thi ngay lập tức.
```

---

## 3. STATE MACHINE

### 3.1 Vòng đời Căn cước Sinh trắc học Gốc (`face_status` của Sinh viên & Giảng viên)

Mọi cá nhân tham gia vào hoạt động thi trực tuyến hoặc coi thi đều phải trải qua quy trình thẩm định Căn cước Sinh trắc học Gốc:

```
                      ┌──────────────────┐
                      │   NOT_ENROLLED   │  ← Khởi tạo khi tạo tài khoản
                      └────────┬─────────┘
                               │ Bắt đầu KYC (Quét 5 góc + Liveness Anti-spoofing)
                               ▼
                      ┌──────────────────┐
                      │    ENROLLING     │  ← Đang thu nhận hình ảnh & vector
                      └────────┬─────────┘
                               │ Gửi vector ArcFace 512-D
                               ▼
                      ┌──────────────────┐
                 ┌───▶│ PENDING_APPROVAL │  ← Chờ thẩm định (Tự động hoặc Khảo thí)
                 │    └────────┬─────────┘
                 │             │
        Chụp lại │             ├────────────────────────────────┐
        khi bị   │             │ Đạt chuẩn                      │ Bị từ chối
        từ chối  │             │ (Liveness pass + Đủ 5 góc)     │ (Ảnh mờ, che mặt, spoofing)
                 │             ▼                                ▼
                 │    ┌──────────────────┐             ┌──────────────────┐
                 └────┤     APPROVED     │             │     REJECTED     │
                      │  (GROUND TRUTH)  │             └──────────────────┘
                      └────────┬─────────┘
                               │
                               ├─► SINH VIÊN: Mở khóa xếp chỗ & cấp quyền vào ca thi
                               └─► GIẢNG VIÊN: Mở khóa phân công Giám thị & nạp Staff Whitelist
```

**Bảng Chuyển trạng thái Face KYC:**

| Trạng thái | Quyền của Sinh viên | Quyền của Giảng viên | Điều kiện kích hoạt |
|---|---|---|---|
| `NOT_ENROLLED` | ❌ Không được xếp ca thi, không được vào phòng thi | ❌ Không được phân công làm Giám thị / Thanh tra | Mặc định khi tài khoản mới tạo |
| `ENROLLING` | Đang thực hiện quét 5 góc trên Web/App | Đang thực hiện quét 5 góc trên Web/App | Bật camera KYC |
| `PENDING_APPROVAL` | Chờ hệ thống / Khảo thí đối soát ảnh căn cước | Chờ hệ thống / Khảo thí đối soát ảnh cán bộ | Đã gửi đủ 5 góc & vector 512-D |
| `APPROVED` (Ground Truth) | ✅ Đủ điều kiện xếp chỗ, cấp SBD, check-in và dự thi | ✅ Đủ điều kiện coi thi, nạp vào Staff Face Whitelist | Vector chất lượng cao, liveness pass |
| `REJECTED` | ❌ Bị chặn thi, thông báo chụp lại ảnh KYC | ❌ Bị chặn phân công coi thi, thông báo chụp lại | Phát hiện giả mạo ảnh / sai góc |

---

### 3.2 Trạng thái Sinh viên trong Ca thi (`sinh_vien_ca_thi.trang_thai`)

```
                      ┌──────────────────┐
                      │  BLOCKED_NO_KYC  │  ← Chưa có Face Ground Truth APPROVED (Chặn tuyệt đối)
                      └────────┬─────────┘
                               │ Đã hoàn thành Face KYC APPROVED
                               ▼
                      ┌──────────────────┐
                      │   not_checkin    │  ← Đã xếp chỗ, chờ giờ vào phòng thi
                      └────────┬─────────┘
                               │ Check-in 1:1 với Vector Gốc (similarity ≥ 0.75 + Liveness pass)
                               ▼
                      ┌──────────────────┐
                 ┌───▶│    checkin       │  ← Đang làm bài thi, AI giám sát liên tục
                 │    └────────┬─────────┘
                 │             │
           ┌─────┴──────┐      │ ┌──────────────────────────────────────────────┐
           │ [Dọn vi    │      │ │ 1. Vi phạm tích lũy (diem_uy_tin < 50)        │
           │  phạm,     │      │ │ 2. Continuous Verification:                  │
           │  khôi phục]│      │ │    Khuôn mặt lệch Vector Gốc kéo dài > 15s   │
           │            │      ▼ ▼                                              │
           └────────────┘ ┌──────────────────┐                                  │
                          │   suspicious     │◀─────────────────────────────────┘
                          └────────┬─────────┘
                                   │ Giám thị click "Đình chỉ"
                                   │ HOẶC diem_uy_tin = 0
                                   │ HOẶC AI xác nhận Tráo người (IMPERSONATION)
                                   ▼
                          ┌──────────────────┐
                          │   suspended      │  ← Bị đình chỉ, khóa bài thi ngay lập tức
                          └──────────────────┘
                          
                      ┌──────────────────┐
                      │    checkout      │  ← Kết thúc thi (nộp bài / hết giờ)
                      └──────────────────┘
```

**Điều kiện chuyển trạng thái:**

| Từ | Sang | Điều kiện | Ai trigger |
|---|---|---|---|
| `BLOCKED_NO_KYC` | `not_checkin` | Sinh viên hoàn thành KYC và được duyệt `face_status = 'APPROVED'` | Hệ thống (auto) |
| `not_checkin` | `checkin` | So khớp 1:1 với Vector Gốc: `similarity_score ≥ 0.75` + Liveness pass | AI Service |
| `checkin` | `suspicious` | `diem_uy_tin` < 50 HOẶC AI nghi vấn tráo người (`similarity < 0.70` trong 15s) | AI Service (auto) |
| `suspicious` | `checkin` | Giám thị kiểm tra bàn xác nhận thí sinh hợp lệ và reset cảnh báo | Giám thị |
| `checkin/suspicious` | `suspended` | Giám thị ra lệnh HOẶC `diem_uy_tin` = 0 HOẶC xác nhận thi hộ | Giám thị / AI |
| `checkin/suspicious` | `checkout` | Hết giờ làm bài / Thí sinh chủ động nộp bài / Giám thị thu bài | System / SV / GT |

---

### 3.3 Bảng Trừ Điểm Uy Tín (`diem_uy_tin`) — Thang 0-100

| Vi phạm | Trừ điểm | Mức độ | Ghi chú kỹ thuật |
|---|---|---|---|
| **Tráo người thi hộ (`IMPERSONATION_DETECTED`)** | **-50** | **CRITICAL** | **So khớp webcam với Vector Gốc Cosine < 0.70 liên tục > 15s** |
| Phát hiện máy ảo (`VM_DETECTED`) | -20 | CRITICAL | SEB / OS Agent phát hiện môi trường ảo hóa |
| Mở Developer Tools (`DEVTOOLS_OPEN`) | -30 | CRITICAL | Bấm F12, Ctrl+Shift+I, inspect phần tử |
| Cúi đầu nhìn điện thoại (`PHONE_LOOK_DOWN`) | -20 | HIGH | Pitch $\le -22^\circ$ gập mặt xem màn hình phụ |
| Phát hiện 2 người lạ (`MULTI_FACE_UNKNOWN`) | -15 | HIGH | Không khớp với Staff Proctor Whitelist |
| Màn hình thứ 2 (`SECONDARY_MONITOR`) | -15 | HIGH | Phát hiện mở rộng desktop ra màn hình ngoài |
| Chuyển Tab / Ẩn ứng dụng (`TAB_SWITCH`) | -10 | MEDIUM | Bắt sự kiện `visibilitychange` của trình duyệt |
| Rời vị trí ngồi / Che webcam (`NO_FACE`) | -10 | MEDIUM | Mất dấu khuôn mặt quá 10 giây |
| Liếc bài bên cạnh (`SUSPICIOUS_SIDE`) | -10 | MEDIUM | Góc quay ngang $\|Yaw\| \ge 30^\circ$ |
| Xoay vai sang bên (`SHOULDER_TURN`) | -8 | MEDIUM | YOLOv8 Pose phát hiện xoay lệch người |
| Quay đầu sang bên (`HEAD_TURN`) | -5 | LOW | Góc quay ngang $15^\circ \le \|Yaw\| < 30^\circ$ |
| Liếc mắt rời màn hình (`GAZE_OFF`) | -3 | LOW | Mống mắt nhìn lệch khỏi màn hình > 4 giây |
| Chuột phải / Copy-paste (`BROWSER_VIOLATION`) | -5 đến -10 | MEDIUM | Chặn các hành vi sao chép đề bài |
| **Cán bộ coi thi ghé bàn (`STAFF_EXEMPTION`)** | **0** | **INFO** | **Trùng khớp ArcFace với Staff Whitelist $\rightarrow$ Miễn trừ phạt** |

---

## 4. WORKFLOWS

### WF-01: Khởi tạo Kỳ thi

**Actor:** Admin  
**Precondition:** Đã có dữ liệu `khoa`, `mon_hoc`, `hoc_ky`, `giang_vien`  
**Postcondition:** `ca_thi` ở trạng thái `UPCOMING`, `sinh_vien_ca_thi` có đủ bản ghi `not_checkin`

```
BƯỚC 1: Khai báo Phòng thi
  Input:  ma_phong, ten_phong, loai_phong, so_day (rows), so_cot (cols), allowed_ip_subnet
  Output: phong_thi.id
  Rule:   so_day × so_cot = max capacity phòng
  UI:     Form tạo phòng + preview grid 3D

BƯỚC 2: Gắn Camera vào Phòng
  Input:  phong_thi_id, ma_camera, vi_tri_lap_dat, rtsp_url, do_phan_giai
  Output: camera_phong_thi.id
  Rule:   1 phòng có thể có N camera (1..N)
  UI:     Thêm row camera trong bảng, preview RTSP stream nếu có

BƯỚC 3: Vẽ ROI Polygon cho Camera
  Input:  camera_phong_thi.id, roi_polygons_json
  Output: Cập nhật roi_polygons_json vào camera_phong_thi
  Rule:   Mỗi camera phụ trách một vùng bàn (ví dụ Camera FRONT: R1-R2, Camera BACK: R3-R4)
  Format: {"R1-C1": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], "R1-C2": [...]}
  UI:     Canvas overlay lên ảnh preview camera, click vẽ polygon 4 đỉnh

BƯỚC 4: Tạo Ca thi
  Input:  ma_ca_thi, mon_hoc_id, hoc_ky_id, phong_thi_id, hinh_thuc_thi,
          de_thi_mongo_id, require_seb_lockdown, ngay_thi, gio_bat_dau, gio_ket_thuc
  Output: ca_thi.id, trang_thai_ca = 'UPCOMING'
  Rule:   Nếu hinh_thuc_thi = 'BYOD_LAPTOP' → require_seb_lockdown = true (mặc định)
          Nếu hinh_thuc_thi = 'ONLINE_QUIZ' → Giao diện Interactive Quiz, đếm ngược từng câu / toàn bài, auto-save đáp án
          Mọi ca thi trực tuyến bắt buộc phải có de_thi_mongo_id hợp lệ từ Ngân hàng đề thi

BƯỚC 5: Import Sinh viên + Xếp chỗ
  Input:  ca_thi_id, file Excel (ma_sv, ho_ten) HOẶC chọn từ danh sách lớp
  Process:
    1. Shuffle ngẫu nhiên danh sách SV
    2. Gán SBD tự động (format: YYYYMMDD-001, YYYYMMDD-002...)
    3. Gán tọa độ bàn: SV[0] → R1-C1, SV[1] → R1-C2... SV[cols] → R2-C1...
    4. Sinh seat_pin_code: random 6 chữ số, unique trong ca thi
    5. Gán giám thị (phan_cong_coi_thi)
  Output: N bản ghi sinh_vien_ca_thi với trang_thai = 'not_checkin', diem_uy_tin = 100
```

---

### WF-01.1: Giảng viên Lập & Quản lý Danh sách Thí sinh & Số Báo Danh (SBD) cho Ca thi

**Actor:** Giảng viên phụ trách môn / Cán bộ Khảo thí  
**Precondition:** Ca thi đã được khởi tạo trong hệ thống (`ca_thi` tồn tại)  
**Postcondition:** Mọi thí sinh trong ca thi đều có Số Báo Danh (SBD) duy nhất, vị trí bàn thi hợp lệ và trạng thái định danh Face KYC sẵn sàng

```
BƯỚC 1: Truy cập Ca thi & Mở Trung tâm Quản lý Thí sinh & SBD
  - Giảng viên chọn ca thi tại /exam-sessions, nhấn nút "Quản Lý Thí Sinh & Số Báo Danh".
  - Hệ thống tải danh sách thí sinh đã ghi danh kèm thông tin SBD, Họ tên, MSSV, Bàn thi (Hàng-Cột), và Trạng thái Face KYC.

BƯỚC 2: Thêm / Bổ sung Thí sinh từ Danh sách Lớp
  - Giảng viên nhấn "Thêm Thí Sinh", tìm kiếm theo Tên hoặc MSSV.
  - Hệ thống tự động gợi ý vị trí bàn trống tiếp theo (Seat Row - Seat Col) và đề xuất SBD kế tiếp.

BƯỚC 3: Sinh Số Báo Danh (SBD) Hàng Loạt theo Quy tắc Chuẩn
  - Giảng viên cấu hình quy tắc sinh SBD:
    • Tiền tố SBD (Prefix): Ví dụ "SBD-", "CA01-", "23IT-"
    • Số bắt đầu: Mặc định từ 1
    • Độ dài đệm số 0 (Padding): 2 chữ số (01, 02...), 3 chữ số (001, 002...), hoặc 4 chữ số
    • Tiêu chí sắp xếp danh sách trước khi đánh số:
        + Theo Họ tên A → Z (Chuẩn Bộ Giáo dục & Đào tạo)
        + Theo Mã số sinh viên (MSSV tăng dần)
        + Theo Vị trí bàn thi (Hàng trước, Cột sau)
  - Hệ thống thực thi Bulk Update và kiểm tra tính toàn vẹn (Unique Constraint) trong ca thi.

BƯỚC 4: Hiệu chỉnh Thủ công Từng Thí sinh (Inline SBD Editor)
  - Giảng viên có thể nhấp trực tiếp vào ô SBD của bất kỳ thí sinh nào để chỉnh sửa riêng biệt (dành cho thí sinh thi ghép, thí sinh tự do hoặc chuyển ca).
  - Tự do phân bổ lại vị trí bàn thi (Hàng R - Cột C) nếu cần thiết kế khoảng cách giãn cách.

BƯỚC 5: Xử lý Thí sinh Chưa Định danh Khuôn mặt (On-the-spot Face Registration)
  - Bảng danh sách trực quan hiển thị badge: "Đã KYC ArcFace" (xanh) hoặc "Chưa KYC" (vàng).
  - Với thí sinh chưa KYC, giảng viên/cán bộ coi thi có thể nhấp ngay nút "Đăng Ký Face ID" bên cạnh tên thí sinh để bật webcam chụp quét 5 góc khuôn mặt, đồng bộ Vector 512-D tức thì vào hồ sơ gốc mà không cần chuyển màn hình.

BƯỚC 6: Xuất & In Danh sách Phòng thi Chính thức
  - Giảng viên nhấn "In Danh Sách Ca Thi" để xuất bảng điểm danh chuẩn gồm: STT, SBD, MSSV, Họ tên, Vị trí bàn, Trạng thái KYC, Cột ký tên thí sinh và Chữ ký của cán bộ coi thi.
```

---

### WF-02: Đăng ký Căn cước Khuôn mặt Gốc (Biometric Ground-Truth Enrollment) cho Sinh viên & Giảng viên

**Actor:** Sinh viên, Giảng viên & Cán bộ Quản trị  
**Điểm truy cập tích hợp (Access Touchpoints):**
1. **Studio Chuyên biệt KYC:** `/face-kyc` (Bảng điều hành định danh Face KYC toàn trường, thống kê tỷ lệ hoàn thành, bộ lọc trạng thái và chụp trực tiếp).
2. **Danh mục Sinh viên:** `/students` (Nút "Đăng ký Face ID" và badge trạng thái trực tiếp trên từng hàng sinh viên).
3. **Danh mục Giảng viên & Cán bộ Coi thi:** `/teachers` (Đăng ký khuôn mặt giảng viên đưa vào Staff Whitelist để miễn trừ cảnh báo khi đi kiểm tra bàn thi).
4. **Phòng thi & Ca thi:** Modal "Quản lý Thí sinh & SBD" tại `/exam-sessions` (Hỗ trợ giảng viên bổ sung Face ID cho thí sinh trước giờ phát đề).

**Precondition:** Người dùng đã có tài khoản, trạng thái `face_status = 'NOT_ENROLLED'` hoặc `'REJECTED'`  
**Postcondition:** `face_status = 'APPROVED'`, `isFaceKyc = true`, lưu ảnh gốc KYC chuẩn HD, lưu Vector ArcFace 512-D làm Ground Truth  
**Tần suất:** 1 lần duy nhất khi nhập học/nhận việc (hoặc cập nhật lại khi có thẩm định của Hội đồng Khảo thí)

```
BƯỚC 1: Người dùng truy cập trang Đăng ký Khuôn mặt (KYC Onboarding)
  UI: Hướng dẫn tiêu chuẩn:
    - Ngồi thẳng, khoảng cách 50–70cm trước webcam, môi trường đủ sáng (≥ 300 lux).
    - Tháo kính râm, khẩu trang, không để tóc che khuất trán và mắt.

BƯỚC 2: Thu thập 5 Góc Khuôn mặt (Multi-angle Biometric Capture)
  Kỹ thuật: WebSocket /v1/ws/face-stream hoặc Client Auto-capture qua YuNet:
    • Góc 1: Nhìn thẳng (STRAIGHT)       → Pitch ∈ [-5°, 5°], Yaw ∈ [-5°, 5°]
    • Góc 2: Nghiêng trái (TURN_LEFT)    → Yaw ∈ [25°, 35°]
    • Góc 3: Nghiêng phải (TURN_RIGHT)   → Yaw ∈ [-35°, -25°]
    • Góc 4: Ngửa lên (LOOK_UP)          → Pitch ∈ [15°, 25°]
    • Góc 5: Cúi xuống (LOOK_DOWN)       → Pitch ∈ [-25°, -15°]

BƯỚC 3: Kiểm định Chất lượng & Chống Giả mạo (Quality Check & Anti-Spoofing)
  AI xử lý:
    a. Liveness Detection (MiniFASNet / Silent-Face-Anti-Spoofing):
       - Chặn 100% hình thức gian lận: Giơ ảnh in trên giấy, video phát lại trên điện thoại/iPad, mặt nạ 3D.
       - Trả về Liveness Score ∈ [0.0, 1.0]. Yêu cầu score ≥ 0.90 để đạt chuẩn.
    b. Image Quality Analysis:
       - Độ sắc nét (Laplacian Variance ≥ 100).
       - Cân bằng sáng (Mean Intensity ∈ [80, 200]).

BƯỚC 4: Trích xuất & Hợp nhất Vector Căn cước Gốc (Ground-Truth Vector Extraction)
  AI xử lý:
    - Trích xuất 5 vector ArcFace 512-D tương ứng 5 góc.
    - Hợp nhất có trọng số (Weighted Fusion) và chuẩn hóa L2-norm:
      Vector_Ground_Truth = Normalize(0.4 × V_straight + 0.15 × (V_left + V_right + V_up + V_down))
    - Lưu vào DB: users/sinh_vien/giang_vien.face_embedding (JSON Array 512 float32).
    - Lưu ảnh chụp thẳng chất lượng cao vào Storage (S3 / Local Vault) làm ảnh đối soát.

BƯỚC 5: Kích hoạt Quyền Hạn Nghiệp vụ (Post-enrollment Privileges Activation)
  → ĐỐI VỚI SINH VIÊN:
    - Cập nhật face_status = 'APPROVED'.
    - Hệ thống mở khóa: Cho phép xếp chỗ vào Ca thi, cấp Số báo danh (SBD) và mở quyền Check-in.
  → ĐỐI VỚI GIẢNG VIÊN:
    - Cập nhật face_status = 'APPROVED'.
    - Hệ thống mở khóa: Cho phép Phân công Giám thị 1, Giám thị 2, Thanh tra phòng thi.
    - Vector Gốc được đồng bộ vào Redis Cache ca thi để nhận diện Miễn trừ vi phạm khi coi thi.
```

---

### WF-03: Check-in Phòng thi & Giám sát Liên tục với Dữ liệu Gốc (Continuous Biometric Verification)

**Actor:** Sinh viên  
**Precondition:** `ca_thi.trang_thai = 'ACTIVE'`, SV có `face_status = 'APPROVED'` (Ground Truth), SV có `sinh_vien_ca_thi.trang_thai = 'not_checkin'`  
**Postcondition:** `trang_thai = 'checkin'`, bàn 3D bật xanh, đề thi mở khóa, AI kích hoạt vòng lặp giám sát liên tục

#### Chế độ LAB_PC

```
1. SV ngồi vào PC lab → Mở trình duyệt khóa sẵn
2. Nhập SBD hoặc nhận diện khuôn mặt tự động
3. POST /ai/checkin/verify {image_base64, sinh_vien_ca_thi_id}
4. [AI] Liveness check → So khớp Cosine Similarity với Vector Gốc (Ground-Truth):
   - Ngưỡng đạt chuẩn: similarity_score ≥ 0.75
5. [Nếu pass] → Check-in thành công:
   - Ghi checkin, publish Socket.IO event proctor:student_update
   - Bàn thi bật XANH trên màn hình Giám thị
   - Kích hoạt giao diện làm bài thi
```

#### Chế độ BYOD_LAPTOP

```
1. SV mở Safe Exam Browser (SEB) → Gửi kèm header bảo mật X-SEB-Key
2. Backend kiểm tra hợp lệ X-SEB-Key và subnet IP phòng thi
3. SV nhập mã Seat PIN (6 số) được cấp tại bàn
4. Chụp ảnh webcam check-in:
   - POST /ai/checkin/verify {image_base64, sinh_vien_ca_thi_id, device_fingerprint}
   - So khớp 1:1 với Vector Gốc + Liveness check (similarity ≥ 0.75)
5. [Nếu pass] → Khóa máy theo thiết bị (device_fingerprint) và mở giao diện thi
```

#### Chế độ ONLINE_QUIZ (Trang Quiz Trực tuyến Linh hoạt)

```
1. SV truy cập phòng thi Quiz từ máy tính cá nhân có Webcam
2. Nhập Mã Ca thi (Exam Code) & Mã PIN bàn thi
3. AI quét camera 1:1 đối chiếu với Vector Gốc (Ground-Truth) + Liveness Anti-spoofing
4. [Nếu pass] → Bàn thi bật XANH, mở bài thi Quiz với các câu hỏi tương tác
```

#### WF-03.1: Xác thực Sinh trắc học Liên tục (Continuous Biometric Verification Trong Ca Thi)
Trong suốt thời gian làm bài, camera thí sinh được AI kiểm tra định kỳ (chu kỳ 10s–20s):

```
                       [Webcam Frame Thí sinh]
                                  │
                                  ▼
                       [AI YuNet Face Detector]
                                  │
          ┌───────────────────────┴───────────────────────┐
          │ (1 khuôn mặt)                                 │ (≥ 2 khuôn mặt)
          ▼                                               ▼
[Trích xuất Vector ArcFace]                     [So khớp với Staff Proctor Whitelist]
          │                                               │
          ▼                                    ┌──────────┴──────────┐
[Cosine Similarity với Vector Gốc              │ Khớp Giám thị       │ Không khớp
       (Ground-Truth) của SV]                  │ (Cosine ≥ 0.75)     │ (Người lạ xuất hiện)
          │                                    ▼                     ▼
 ┌────────┴────────┐                  ┌───────────────────┐ ┌───────────────────┐
 │ Similarity ≥0.75│ Similarity <0.70 │ STAFF_EXEMPTION   │ │ MULTI_FACE_UNKNOWN│
 │                 │ kéo dài > 15s    │ 0 điểm trừ (INFO) │ │ -15 điểm (HIGH)   │
 ▼                 ▼                  │ Hiện badge giám thị│ │ Chuông báo Giám thị│
[HỢP LỆ (NORMAL)]  [TRÁO NGƯỜI THI HỘ │ trên màn hình SV  │ └───────────────────┘
 0 điểm trừ        │ IMPERSONATION]   └───────────────────┘
                   │ -50 điểm (CRITICAL)
                   │ Báo động đỏ Giám thị
                   │ Khóa bài thi ngay lập tức!
                   └──────────────────┘
```

**Xử lý khi fail check-in ban đầu:**

```
similarity_score < 0.75 hoặc Liveness Fail:
  → Màn hình đỏ: "Xác thực không trùng khớp với hồ sơ khuôn mặt gốc. Vui lòng thử lại"
  → Thử lại tối đa 3 lần. Nếu vẫn thất bại:
    • Bắn cờ cảnh báo đỏ CHECKIN_FAILED lên Dashboard Giám thị.
    • Giám thị trực tiếp kiểm tra Thẻ SV / CCCD và có quyền Force Check-in kèm Audit Log.
```

liveness fail:
  → "Phát hiện giả mạo. Không thể check-in"
  → Log suspicious event vào MongoDB
```

---

### WF-04: Giám sát AI Thời gian thực (Trong giờ thi)

**Actor:** AI Service (tự động), Giám thị (phản ứng)  
**Precondition:** `ca_thi.trang_thai = 'ACTIVE'`, SV đã `checkin`  
**Parallel execution:** 2 nhánh chạy song song

#### Nhánh A: Webcam Client-side (LAB_PC & BYOD_LAPTOP)

```
Chạy trong: Web Worker (không block UI)
Thư viện:   @mediapipe/tasks-vision — FaceLandmarker
Tần suất:   30 FPS analysis

Phát hiện:
  - Yaw angle: Góc xoay ngang đầu (> ±35° trong > 3 giây → HEAD_TURN)
  - Pitch angle: Góc cúi/ngước đầu (> ±30° → GAZE_OFF)
  - Gaze direction: Hướng nhìn mắt (nhìn sang bên > 4 giây → GAZE_OFF)
  - Face count: > 1 mặt → MULTI_FACE
  - Face count: = 0 → NO_FACE
  
Chuyển tab: document.addEventListener('visibilitychange')
  → Tab bị ẩn → TAB_SWITCH (ngay lập tức)

Khi phát hiện vi phạm:
  1. Chụp 1 frame → Nén JPEG 30KB
  2. POST /ai/proctor/report-violation {
       sinh_vien_ca_thi_id,
       loai_vi_pham,
       telemetry_3d: {yaw, pitch, gaze_direction},
       evidence_image: base64_30kb,
       nguon_camera: "WEBCAM_PC" hoặc "WEBCAM_LAPTOP_BYOD"
     }
  3. Worker tiếp tục scan (không chờ response)
```

#### Nhánh B: CCTV Server-side (Tất cả hình thức)

```
Chạy trong: FastAPI Background Worker (Multiprocessing)
Thư viện:   OpenCV RTSP + yolov8n-pose.onnx + Shapely
Tần suất:   5 FPS

Quy trình:
  1. Đọc N luồng RTSP đồng thời từ camera_phong_thi
  2. YOLOv8n-pose → Detect 17 keypoints của tất cả người trong frame
  3. Với mỗi người detect được:
     a. Lấy tọa độ trung tâm người (midpoint hips)
     b. Shapely: Kiểm tra điểm này thuộc ROI bàn nào trong roi_polygons_json
     c. → Xác định vi_tri_ngoi: "R2-C3"
  4. Phân tích hành vi:
     - Keypoints vai → Xoay vai sang bên > threshold → SHOULDER_TURN
     - Keypoints cổ/đầu → Cúi gằm xuống → HEAD_DOWN
     - Bbox người ra ngoài ROI bàn → LEAVE_SEAT
     - Wrist keypoint ở vị trí thấp (hộc bàn) → PHONE_UNDER_DESK (cần confirm)
  5. POST /ai/proctor/report-violation với nguon_camera: "ROOM_CCTV"
```

#### Xử lý Vi phạm Trung tâm (FastAPI Proctoring Engine)

```
POST /ai/proctor/report-violation nhận được:
  
  1. Ghi MongoDB ai_proctoring_logs (async, không block)
  
  2. Tính diem_tru theo loai_vi_pham + muc_do
     UPDATE sinh_vien_ca_thi SET diem_uy_tin = diem_uy_tin - diem_tru
     WHERE id = sinh_vien_ca_thi_id AND diem_uy_tin > 0
  
  3. Kiểm tra ngưỡng:
     diem_uy_tin < 50 → UPDATE trang_thai = 'suspicious'
     diem_uy_tin = 0  → UPDATE trang_thai = 'suspended'
  
  4. Publish Redis Pub/Sub: channel "exam_violations"
     Message: {
       room: "exam_{ca_thi_id}",
       vi_tri_ngoi: "R2-C3",
       loai_vi_pham,
       muc_do,
       telemetry_3d: {yaw, pitch},
       evidence_image_url,
       diem_uy_tin_con_lai,
       trang_thai_moi
     }

Flask-SocketIO nhận từ Redis → Broadcast vào room "exam_{ca_thi_id}":
  - Event "violation_alert" → Giám thị nhận
  - Event "warning_popup"  → Sinh viên vi phạm nhận
```

#### Phản ứng UI

```
[Phòng 3D Giám thị]:
  - Bàn vi phạm: Đổi màu XANH → ĐỎ + nhấp nháy
  - Avatar 3D: Xoay đầu theo góc Yaw/Pitch thực tế
  - Hình nón hướng nhìn: Hiện cone 3D chỉ hướng mắt
  - Sidebar: Ghim thẻ vi phạm (ảnh + thông tin + nút Xem/Cảnh báo/Đình chỉ)
  - Âm thanh: Beep nhẹ

[Màn hình Sinh viên]:
  - Popup overlay đỏ: "⚠️ Cảnh báo vi phạm - [Mô tả]"
  - Hiện điểm uy tín còn lại: "Điểm uy tín: 75/100"
  - Countdown 5 giây → tự đóng
  - Âm thanh: Tone cảnh báo

[Màn hình Sinh viên khi suspended]:
  - Khóa toàn bộ giao diện thi
  - Thông báo: "Tài khoản bị đình chỉ. Liên hệ giám thị."
```

---

### WF-05: Thu bài & Báo cáo Toàn vẹn

**Actor:** Hệ thống (tự động khi hết giờ) hoặc Giám thị/Sinh viên  
**Postcondition:** `trang_thai = 'checkout'`, Integrity Report có thể xem

```
TH1: Hết giờ (System trigger)
  1. Scheduler Flask check: now() >= ca_thi.gio_ket_thuc
  2. UPDATE ca_thi SET trang_thai_ca = 'FINISHED'
  3. Publish "exam_end" event qua SocketIO
  4. Client nhận → Khóa giao diện thi ngay lập tức
  5. Chốt submission cuối cùng trong MongoDB exam_submissions
  6. Flask Core: Tự chấm điểm trắc nghiệm (đối chiếu đáp án de_thi)
  7. UPDATE sinh_vien_ca_thi SET trang_thai = 'checkout', diem_thi = score

TH2: Sinh viên nộp bài sớm (BYOD / LAB_PC)
  1. SV click "Nộp bài"
  2. Confirm dialog: "Bạn có chắc chắn? Không thể làm tiếp sau khi nộp."
  3. POST /core/exam/submit {sinh_vien_ca_thi_id}
  4. Tương tự TH1 từ bước 5 (chỉ cho 1 SV này)

TH3: Nộp bài & Tự động Chấm điểm Quiz (ONLINE_QUIZ)
  1. Thí sinh bấm "Nộp bài Quiz" (kèm popup xác nhận số câu đã làm / chưa làm) HOẶC tự động nộp bài khi hết giờ (Quiz Countdown reach 0)
  2. POST /api/exam/submit {sinh_vien_ca_thi_id, answers}
  3. Hệ thống Quiz Engine tự động đối chiếu đáp án và chấm điểm tức thì (Instant Auto-grading 100%)
  4. Cập nhật trang_thai = 'checkout', autoGradeScore = score, officialScore = score (nếu ca thi cho phép công bố tức thì)
  5. Màn hình sinh viên chuyển sang Giao diện Tổng kết Quiz (Quiz Completion Summary):
     - Hiệu ứng pháo hoa chúc mừng (Confetti celebration) khi hoàn thành
     - Bảng phân tích chi tiết: Điểm số, số câu đúng / sai / bỏ qua, % chính xác, thời gian hoàn thành
     - Tra cứu và đối chiếu đáp án đúng kèm giải thích chi tiết của từng câu hỏi (nếu ca thi cho phép hiển thị)

INTEGRITY REPORT (Sau khi tất cả checkout):
  Kết hợp từ 2 nguồn:
  
  MySQL:
    - Thông tin SV, bàn ngồi, checkin time, checkout time
    - diem_thi (điểm số cuối)
    - diem_uy_tin (điểm uy tín còn lại)
    - similarity_score (điểm khớp mặt lúc check-in)
    - captured_image_url (ảnh check-in)
  
  MongoDB (ai_proctoring_logs):
    - Timeline toàn bộ vi phạm với timestamp
    - Ảnh bằng chứng từng vi phạm
    - Nguồn camera (webcam / CCTV)
    - Telemetry 3D (góc đầu, hướng mắt)
  
  Output UI: Timeline dạng feed, có thể click vào từng mốc thời gian xem ảnh
```

---

## 5. MYSQL SCHEMA

### Nhóm A: Danh mục & Người dùng

```sql
-- BẢNG 1: users
CREATE TABLE users (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  username     VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role         ENUM('admin','teacher','student') NOT NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- BẢNG 2: khoa
CREATE TABLE khoa (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  ma_khoa      VARCHAR(20) UNIQUE NOT NULL,  -- VD: 'CNTT'
  ten_khoa     VARCHAR(100) NOT NULL,
  so_dien_thoai VARCHAR(15)
);

-- BẢNG 3: lop
CREATE TABLE lop (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  ma_lop       VARCHAR(20) UNIQUE NOT NULL,  -- VD: 'K23CNT3'
  ten_lop      VARCHAR(100) NOT NULL,
  khoa_hoc     VARCHAR(10),                  -- VD: '2023-2027'
  khoa_id      INT NOT NULL,
  FOREIGN KEY (khoa_id) REFERENCES khoa(id)
);

-- BẢNG 4: sinh_vien
CREATE TABLE sinh_vien (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  user_id         INT UNIQUE NOT NULL,
  ma_sv           VARCHAR(20) UNIQUE NOT NULL,  -- VD: '2310900087'
  ho_ten          VARCHAR(100) NOT NULL,
  ngay_sinh       DATE,
  gioi_tinh       ENUM('M','F','OTHER'),
  email           VARCHAR(100),
  lop_id          INT,
  avatar_url      VARCHAR(255),
  -- BIOMETRIC GROUND-TRUTH BASELINE (Căn cước sinh trắc học gốc):
  face_status     ENUM('NOT_ENROLLED','PENDING_APPROVAL','APPROVED','REJECTED') DEFAULT 'NOT_ENROLLED',
  face_image_url  VARCHAR(255),  -- Ảnh chân dung chuẩn KYC HD làm ảnh gốc đối soát
  face_embedding  JSON,          -- Array 512 float32 ArcFace chuẩn hóa (Ground-Truth Vector)
  face_angles     JSON,          -- 5 góc đã thu nhận: ["straight","left","right","up","down"]
  face_quality_score FLOAT,      -- Điểm chất lượng ảnh & độ sắc nét (0.0 - 1.0)
  face_enrolled_at DATETIME,     -- Thời điểm hoàn tất KYC
  face_verified_by INT,          -- ID Admin/Hệ thống duyệt
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (lop_id)  REFERENCES lop(id)
);

-- BẢNG 5: giang_vien
CREATE TABLE giang_vien (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  user_id         INT UNIQUE NOT NULL,
  ma_gv           VARCHAR(20) UNIQUE NOT NULL,
  ho_ten          VARCHAR(100) NOT NULL,
  email           VARCHAR(100),
  khoa_id         INT,
  avatar_url      VARCHAR(255),
  -- BIOMETRIC GROUND-TRUTH BASELINE (Nhận diện Cán bộ Coi thi / Staff Whitelist):
  face_status     ENUM('NOT_ENROLLED','PENDING_APPROVAL','APPROVED','REJECTED') DEFAULT 'NOT_ENROLLED',
  face_image_url  VARCHAR(255),
  face_embedding  JSON,          -- Vector ArcFace 512-D nạp vào Staff Face Cache
  face_angles     JSON,
  face_quality_score FLOAT,
  face_enrolled_at DATETIME,
  face_verified_by INT,
  FOREIGN KEY (user_id)  REFERENCES users(id),
  FOREIGN KEY (khoa_id)  REFERENCES khoa(id)
);

-- BẢNG 5B: face_enrollment_history (Nhật ký Thay đổi & Thẩm định Căn cước Sinh trắc học Gốc)
CREATE TABLE face_enrollment_history (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  user_id         INT NOT NULL,
  user_type       ENUM('student', 'teacher') NOT NULL,
  enrollment_type ENUM('INITIAL_KYC', 'UPDATE_REQUEST', 'SYSTEM_RECALIBRATE'),
  captured_image_url VARCHAR(255) NOT NULL,
  vector_hash     VARCHAR(64),   -- SHA-256 của Vector ArcFace 512-D
  liveness_score  FLOAT NOT NULL,
  quality_score   FLOAT NOT NULL,
  angles_captured JSON,
  status          ENUM('APPROVED', 'REJECTED') NOT NULL,
  reject_reason   VARCHAR(255),
  ip_address      VARCHAR(45),
  device_info     VARCHAR(255),
  created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- BẢNG 6: mon_hoc
CREATE TABLE mon_hoc (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  ma_mon       VARCHAR(20) UNIQUE NOT NULL,
  ten_mon      VARCHAR(150) NOT NULL,
  so_tin_chi   INT DEFAULT 3,
  khoa_id      INT,
  FOREIGN KEY (khoa_id) REFERENCES khoa(id)
);

-- BẢNG 7: hoc_ky
CREATE TABLE hoc_ky (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  ten_hoc_ky      VARCHAR(50) NOT NULL,  -- VD: 'HK1 2026-2027'
  nam_hoc         VARCHAR(20),           -- VD: '2026-2027'
  ngay_bat_dau    DATE,
  ngay_ket_thuc   DATE
);
```

### Nhóm B: Phòng thi, Camera, Ca thi

```sql
-- BẢNG 8: phong_thi
CREATE TABLE phong_thi (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  ma_phong             VARCHAR(20) UNIQUE NOT NULL,  -- VD: 'P302'
  ten_phong            VARCHAR(100),
  loai_phong_mac_dinh  ENUM('LAB_PC','HALL_ROOM'),
  so_day               INT NOT NULL,  -- Số hàng (rows)
  so_cot               INT NOT NULL,  -- Số cột (cols)
  -- Capacity = so_day × so_cot
  allowed_ip_subnet    VARCHAR(50)    -- VD: '192.168.30.0/24' — NULL nếu không giới hạn IP
);

-- BẢNG 9: camera_phong_thi  ← QUAN HỆ 1 phòng : N camera
CREATE TABLE camera_phong_thi (
  id               INT PRIMARY KEY AUTO_INCREMENT,
  phong_thi_id     INT NOT NULL,
  ma_camera        VARCHAR(30) NOT NULL,  -- VD: 'CAM_P302_TRUOC'
  vi_tri_lap_dat   ENUM('FRONT_LEFT','FRONT_RIGHT','BACK_LEFT','BACK_RIGHT',
                        'CENTER_CEILING','KIOSK_DOOR'),
  rtsp_url         VARCHAR(255),          -- VD: 'rtsp://admin:pass@192.168.1.10:554/stream1'
  do_phan_giai     VARCHAR(20),           -- VD: '1920x1080'
  roi_polygons_json JSON,
  -- Format: {"R1-C1": [[x1,y1],[x2,y2],[x3,y3],[x4,y4]], "R1-C2": [...]}
  -- Tọa độ pixel tương đối trong khung hình camera
  is_active        BOOLEAN DEFAULT TRUE,
  FOREIGN KEY (phong_thi_id) REFERENCES phong_thi(id)
);

-- BẢNG 10: ca_thi
CREATE TABLE ca_thi (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  ma_ca_thi            VARCHAR(30) UNIQUE NOT NULL,  -- VD: 'CA_KTLT_20261014_P302_SA'
  mon_hoc_id           INT NOT NULL,
  hoc_ky_id            INT NOT NULL,
  phong_thi_id         INT NOT NULL,
  hinh_thuc_thi        ENUM('LAB_PC','BYOD_LAPTOP','ONLINE_QUIZ') NOT NULL,
  de_thi_mongo_id      VARCHAR(50) NOT NULL, -- ObjectId MongoDB (Bắt buộc cho mọi ca thi trực tuyến)
  require_seb_lockdown BOOLEAN DEFAULT TRUE,
  ngay_thi             DATE NOT NULL,
  gio_bat_dau          TIME NOT NULL,
  gio_ket_thuc         TIME NOT NULL,
  trang_thai_ca        ENUM('UPCOMING','ACTIVE','FINISHED') DEFAULT 'UPCOMING',
  FOREIGN KEY (mon_hoc_id)   REFERENCES mon_hoc(id),
  FOREIGN KEY (hoc_ky_id)    REFERENCES hoc_ky(id),
  FOREIGN KEY (phong_thi_id) REFERENCES phong_thi(id)
);

-- BẢNG 11: phan_cong_coi_thi
CREATE TABLE phan_cong_coi_thi (
  id              INT PRIMARY KEY AUTO_INCREMENT,
  ca_thi_id       INT NOT NULL,
  giang_vien_id   INT NOT NULL,
  vai_tro         ENUM('GIAM_THI_1','GIAM_THI_2','THANH_TRA'),
  FOREIGN KEY (ca_thi_id)     REFERENCES ca_thi(id),
  FOREIGN KEY (giang_vien_id) REFERENCES giang_vien(id),
  UNIQUE KEY uq_ct_gv (ca_thi_id, giang_vien_id)
);

-- BẢNG 12: sinh_vien_ca_thi  ← BẢNG TRUNG TÂM CỦA HỆ THỐNG
CREATE TABLE sinh_vien_ca_thi (
  id                 BIGINT PRIMARY KEY AUTO_INCREMENT,
  ca_thi_id          INT NOT NULL,
  sinh_vien_id       INT NOT NULL,
  so_bao_danh        VARCHAR(20) NOT NULL,   -- VD: '20261014-001'
  vi_tri_ngoi        VARCHAR(20) NOT NULL,   -- VD: 'R2-C3' — tọa độ bàn 3D
  seat_pin_code      VARCHAR(10),            -- 6 chữ số — chỉ dùng cho BYOD_LAPTOP
  client_ip_address  VARCHAR(45),            -- IPv4 hoặc IPv6
  device_fingerprint VARCHAR(255),           -- Hash thiết bị — chống đăng nhập 2 máy
  thoi_gian_checkin  DATETIME,
  similarity_score   FLOAT,                  -- Cosine similarity lúc check-in với Vector Gốc (0.0-1.0)
  captured_image_url VARCHAR(255),           -- Ảnh chụp lúc check-in
  last_continuous_verified_at DATETIME,     -- Thời điểm gần nhất AI đối chiếu lại với Vector Gốc
  continuous_similarity       FLOAT,        -- Điểm khớp mặt ngầm trong lúc làm bài
  impersonation_flag          BOOLEAN DEFAULT FALSE, -- Bật TRUE nếu AI nghi vấn tráo người thi hộ
  trang_thai         ENUM('not_checkin','checkin','checkout','suspicious','suspended')
                     DEFAULT 'not_checkin',
  diem_uy_tin        INT DEFAULT 100,        -- 0-100
  diem_thi           FLOAT,                  -- NULL cho đến khi chấm xong
  FOREIGN KEY (ca_thi_id)    REFERENCES ca_thi(id),
  FOREIGN KEY (sinh_vien_id) REFERENCES sinh_vien(id),
  UNIQUE KEY uq_ca_sv (ca_thi_id, sinh_vien_id),
  INDEX idx_vi_tri (ca_thi_id, vi_tri_ngoi)  -- Tìm kiếm theo tọa độ bàn nhanh
);
```

---

## 6. MONGODB SCHEMA

### Collection 1: `exams` (Ngân hàng đề thi)

```json
{
  "_id": "ObjectId",
  "tieu_de": "Kiểm tra Lập trình C - HK1 2026",
  "mon_hoc_id": 5,
  "thoi_gian_lam_bai": 90,  // phút
  "tong_diem": 10.0,
  "cau_hoi": [
    {
      "stt": 1,
      "loai": "MULTIPLE_CHOICE",  // | "ESSAY" | "CODING_PROBLEM"
      "noi_dung": "Kết quả của printf(\"%d\", 5/2) là?",
      "diem": 0.5,
      "lua_chon": ["1", "2", "2.5", "0"],
      "dap_an_dung": 1,  // index 0-based
      "giai_thich": "Phép chia nguyên 5/2 = 2 trong C"
    },
    {
      "stt": 10,
      "loai": "CODING_PROBLEM",
      "noi_dung": "Viết hàm tính tổng dãy số nguyên",
      "diem": 2.0,
      "ngon_ngu": ["c", "cpp", "python"],
      "test_cases": [
        {"input": "5\n1 2 3 4 5", "expected_output": "15", "timeout_ms": 1000},
        {"input": "3\n-1 0 1",    "expected_output": "0",  "timeout_ms": 1000}
      ],
      "template_code": {"c": "int sum(int arr[], int n) {\n  // TODO\n}"}
    }
  ]
}
```

### Collection 2: `exam_submissions` (Bài làm realtime)

```json
{
  "_id": "ObjectId",
  "ca_thi_id": 102,
  "sinh_vien_ca_thi_id": 5088,
  "sinh_vien_id": 230,
  "trang_thai": "IN_PROGRESS",  // | "SUBMITTED" | "EXPIRED"
  "bat_dau_luc": "2026-10-14T08:00:00Z",
  "nop_bai_luc": null,
  "thoi_gian_con_lai": 4500,  // giây — sync mỗi 10s
  "cau_tra_loi": [
    {
      "stt": 1,
      "loai": "MULTIPLE_CHOICE",
      "lua_chon": 1,             // index đã chọn
      "thoi_diem_tra_loi": "2026-10-14T08:05:30Z"
    },
    {
      "stt": 10,
      "loai": "CODING_PROBLEM",
      "source_code": "int sum(int arr[], int n) {\n  int s=0;\n  for(int i=0;i<n;i++) s+=arr[i];\n  return s;\n}",
      "ngon_ngu": "c",
      "ket_qua_test": null,   // null cho đến khi submit chấm
      "auto_saved_at": "2026-10-14T08:45:00Z"
    }
  ]
}
```

### Collection 3: `ai_proctoring_logs` (Bằng chứng vi phạm)

```json
{
  "_id": "ObjectId",
  "ca_thi_id": 102,
  "sinh_vien_ca_thi_id": 5088,
  "vi_tri_ngoi": "R2-C3",
  "timestamp": "2026-10-14T08:45:03Z",
  "nguon_camera": {
    "loai_nguon": "ROOM_CCTV",     // | "WEBCAM_PC" | "WEBCAM_LAPTOP_BYOD" | "SEB_SYSTEM"
    "camera_phong_thi_id": 4,      // FK tới MySQL camera_phong_thi.id (nếu CCTV)
    "ma_camera": "CAM_P302_TRUOC"
  },
  "loai_vi_pham": "HEAD_TURN",
  // Enum: HEAD_TURN | GAZE_OFF | MULTI_FACE | NO_FACE | TAB_SWITCH |
  //       VM_DETECTED | SECONDARY_MONITOR | LEAVE_SEAT | SHOULDER_TURN |
  //       HEAD_DOWN | PHONE_UNDER_DESK | SEB_VIOLATION
  "muc_do": "HIGH",             // LOW | MEDIUM | HIGH | CRITICAL
  "diem_tru": 10,
  "telemetry_3d": {             // null nếu từ CCTV
    "yaw": -45.2,
    "pitch": 4.8,
    "gaze_direction": "LEFT"   // LEFT | RIGHT | UP | DOWN | CENTER
  },
  "evidence_image_url": "/static/evidences/ca102/cam4_sv5088_084503.jpg",
  "trang_thai_duyet": "PENDING"  // PENDING | CONFIRMED | DISMISSED
}
```

---

## 7. API CONTRACT

### Core Service (Flask — Port 5000)

#### Auth

| Method | Endpoint | Body | Response |
|---|---|---|---|
| POST | `/api/auth/login` | `{username, password}` | `{access_token, user: {id, role, ...}}` |
| POST | `/api/auth/refresh` | Header: Bearer token | `{access_token}` |
| POST | `/api/auth/logout` | — | `{success: true}` |

#### Admin — Phòng thi

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/admin/rooms` | Danh sách phòng |
| POST | `/api/admin/rooms` | Tạo phòng mới |
| PUT | `/api/admin/rooms/:id` | Cập nhật phòng |
| GET | `/api/admin/rooms/:id/cameras` | Danh sách camera của phòng |
| POST | `/api/admin/rooms/:id/cameras` | Thêm camera vào phòng |
| PUT | `/api/admin/cameras/:id/roi` | Cập nhật ROI polygons |

#### Admin — Ca thi

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/admin/exams` | Danh sách ca thi |
| POST | `/api/admin/exams` | Tạo ca thi |
| POST | `/api/admin/exams/:id/import-students` | Import SV từ Excel/JSON |
| POST | `/api/admin/exams/:id/auto-assign-seats` | Xếp chỗ tự động |
| POST | `/api/admin/exams/:id/assign-proctor` | Gán giám thị |
| PUT | `/api/admin/exams/:id/activate` | Chuyển sang ACTIVE |

#### BYOD Check

| Method | Endpoint | Ghi chú |
|---|---|---|
| POST | `/api/byod/validate-environment` | Kiểm tra SEB header + IP |
| POST | `/api/byod/activate-seat` | Xác thực seat PIN |

#### Giám thị — Actions

| Method | Endpoint | Body |
|---|---|---|
| POST | `/api/proctor/warn-student` | `{svct_id, message}` |
| POST | `/api/proctor/suspend-student` | `{svct_id, reason}` |
| POST | `/api/proctor/reset-violation` | `{svct_id}` |
| POST | `/api/proctor/force-checkin` | `{svct_id, giang_vien_id}` |
| POST | `/api/proctor/collect-paper` | `{svct_id}` |

#### Bài thi

| Method | Endpoint | Ghi chú |
|---|---|---|
| GET | `/api/exam/get-paper/:svct_id` | Lấy đề thi (đã unlock) |
| POST | `/api/exam/autosave` | Auto-save bài làm mỗi 10s |
| POST | `/api/exam/submit` | Nộp bài |
| GET | `/api/exam/integrity-report/:ca_thi_id` | Integrity Report sau thi |

---

### AI Service (FastAPI — Port 8000)

#### KYC & Biometric Ground-Truth Enrollment (Sinh viên & Giảng viên)

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/v1/face/enroll-multi-angle` | `FormData: {user_id, user_type ('student'\|'teacher'), image_straight, image_left, image_right, image_up, image_down, check_quality}` | `{success, user_id, registered_angles[], vector_dim: 512, quality_score, liveness_score}` |
| POST | `/v1/face/enroll` | `FormData: {user_id, user_type, image, check_quality}` | `{success, user_id, vector_dim: 512, message}` |
| GET | `/v1/face/status/:user_type/:user_id` | — | `{has_embedding, face_status, registered_angles[], face_updated_at}` |
| GET | `/v1/faces/list` | `?user_type=student\|teacher` | `[{user_id, full_name, user_type, registered_angles[], created_at}]` |
| DELETE | `/v1/faces/:user_id` | — | `{success: true, message: "Deleted face identity"}` |

#### Check-in & Continuous Verification (Đối chiếu với Vector Gốc)

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/v1/face/verify` | `FormData: {user_id, image, threshold: 0.75, check_liveness: true}` | `{matched: bool, similarity: float, liveness_passed: bool}` |
| POST | `/v1/checkin/verify` | `{image_base64, sinh_vien_ca_thi_id, device_fingerprint?}` | `{verified, similarity_score, captured_url}` |
| POST | `/v1/proctor/inspect-frame` | `FormData: {sessionStudentId, frame}` | `{success, detectedEvent, isProctorPresence, proctorName, trustScore, penalty}` |
| POST | `/v1/proctor/continuous-verify` | `FormData: {sinh_vien_ca_thi_id, frame}` | `{is_impersonation: bool, similarity_to_ground_truth: float, matched_with_staff_whitelist: bool}` |

#### Proctoring & CCTV

| Method | Endpoint | Input | Output |
|---|---|---|---|
| POST | `/v1/proctor/report-violation` | `{svct_id, loai_vi_pham, telemetry_3d, evidence_image, nguon}` | `{logged: true, diem_uy_tin_con_lai}` |
| POST | `/v1/proctor/start-cctv-session` | `{ca_thi_id}` | `{session_id, cameras_started: N}` |
| POST | `/v1/proctor/stop-cctv-session` | `{ca_thi_id}` | `{stopped: true}` |

#### WebSocket

| Endpoint | Mô tả |
|---|---|
| `WS /v1/ws/face-stream` | Stream frames để KYC — nhận hướng pose realtime (pitch, yaw, roll) và auto-capture |

---

### SocketIO Events (Flask — Port 5000)

#### Client → Server (emit)

| Event | Data | Mô tả |
|---|---|---|
| `join_exam_room` | `{ca_thi_id, role}` | Tham gia room realtime |
| `leave_exam_room` | `{ca_thi_id}` | Rời room |
| `proctor_action` | `{action, svct_id, data}` | Giám thị thực hiện action |

#### Server → Client (broadcast)

| Event | Data | Nhận bởi |
|---|---|---|
| `seat_checkin` | `{vi_tri_ngoi, sinh_vien: {...}}` | Giám thị |
| `violation_alert` | `{vi_tri_ngoi, loai_vi_pham, muc_do, evidence_url, diem_uy_tin}` | Giám thị |
| `warning_popup` | `{message, diem_uy_tin_con_lai, loai_vi_pham}` | Sinh viên bị vi phạm |
| `student_suspended` | `{svct_id}` | SV bị đình chỉ |
| `exam_end` | `{ca_thi_id}` | Tất cả |
| `avatar_update` | `{vi_tri_ngoi, yaw, pitch}` | Giám thị (update 3D avatar) |

---

## 8. BUSINESS RULES & VALIDATION

### BR-KYC: Bộ Quy tắc Dữ liệu Gốc Sinh trắc học & Giám sát Online (Ground-Truth Rules)

- **BR-KYC-01: Điều kiện Dự thi Tiên quyết của Sinh viên (Mandatory Student KYC)**:
  - Sinh viên **BẮT BUỘC** phải có `face_status = 'APPROVED'` trong hồ sơ đào tạo mới được phép:
    1. Import vào danh sách ca thi và cấp Số báo danh (SBD).
    2. Check-in vào phòng thi trực tuyến.
  - Nếu sinh viên chưa đăng ký hoặc bị từ chối KYC (`face_status != 'APPROVED'`), hệ thống tự động khóa quyền truy cập ca thi với thông báo lỗi: `BLOCKED_REQUIRE_FACE_KYC`.

- **BR-KYC-02: Điều kiện Phân công Coi thi của Giảng viên (Mandatory Proctor KYC)**:
  - Giảng viên **BẮT BUỘC** phải có `face_status = 'APPROVED'` mới được Admin/Phòng Đào tạo phân công làm `GIAM_THI_1`, `GIAM_THI_2` hoặc `THANH_TRA`.
  - Hệ thống tự động lọc danh sách phân công: Chỉ hiển thị các Giảng viên đã hoàn tất Face KYC.
  - Vector Gốc của Giảng viên được tự động nạp vào **Staff Proctor Whitelist Cache** của ca thi trước giờ G 15 phút.

- **BR-KYC-03: Ngưỡng So khớp Vector Gốc (Ground-Truth Cosine Thresholds)**:
  - **Check-in 1:1 ban đầu:** Cosine Similarity $\ge 0.75$ VÀ Liveness Score $\ge 0.90$.
  - **Xác thực Liên tục giữa giờ (Continuous Verification):** Cosine Similarity $\ge 0.70$.
  - **Nhận diện Cán bộ Coi thi (Staff Exemption):** Cosine Similarity $\ge 0.75$ với bất kỳ cán bộ nào trong Staff Whitelist.

- **BR-KYC-04: Xử lý Vi phạm Tráo người Thi hộ (Continuous Impersonation Detection)**:
  - Nếu AI phát hiện khuôn mặt ngồi thi có Cosine Similarity $< 0.70$ so với Vector Gốc kéo dài quá 15 giây (hoặc 3 chu kỳ camera liên tiếp):
    + Bật cờ `impersonation_flag = true`.
    + Ghi nhận vi phạm `IMPERSONATION_DETECTED` (Mức độ: `CRITICAL`, Trừ 50 điểm uy tín).
    + Bắn còi cảnh báo đỏ khẩn cấp tới màn hình Giám thị kèm ảnh chụp đối chiếu (Ảnh gốc KYC vs Ảnh camera hiện tại).
    + Tự động khóa giao diện làm bài thi của thí sinh (`suspended`).

- **BR-KYC-05: Miễn trừ Cán bộ Coi thi Ghé bàn (Staff Exemption Protocol)**:
  - Khi camera phát hiện $\ge 2$ khuôn mặt (`MULTIPLE_FACES`), AI lập tức trích xuất vector khuôn mặt phụ và so khớp với Staff Proctor Whitelist.
  - Nếu trùng khớp với Giám thị / Thanh tra ca thi:
    + Ghi nhận sự kiện `STAFF_EXEMPTION` (Trừ 0 điểm).
    + Bàn thi trên màn hình Giám thị chuyển sang icon Cán bộ màu tím an tâm.
    + Thí sinh nhận thông báo "Cán bộ coi thi đang kiểm tra bàn", KHÔNG bị trừ điểm uy tín.

---

### BR-01: Xếp chỗ tự động
- Tổng SV không được vượt quá `phong_thi.so_day × phong_thi.so_cot`
- Shuffle trước khi xếp → đảm bảo ngẫu nhiên
- Một SV chỉ có 1 bàn trong 1 ca thi (UNIQUE constraint)
- Seat PIN: 6 chữ số, UNIQUE trong `ca_thi_id` (không unique global)
- **Chỉ xếp chỗ cho sinh viên đã có `face_status = 'APPROVED'`**

### BR-02: Check-in
- `similarity_score >= 0.75` với Vector Gốc để pass (configurable)
- Liveness check phải pass trước khi so sánh embedding
- Cho phép thử lại tối đa 3 lần trước khi báo giám thị
- `device_fingerprint` UNIQUE trong `ca_thi_id` — chặn 1 tài khoản login 2 máy
- Chỉ check-in khi `ca_thi.trang_thai = 'ACTIVE'`

### BR-03: BYOD Security
- Header `X-SEB-Key` PHẢI có và hợp lệ (hoặc skip nếu `require_seb_lockdown = false`)
- IP request PHẢI thuộc `allowed_ip_subnet` (nếu trường đó NOT NULL)
- Seat PIN đúng → mới được chụp mặt check-in

### BR-04: Điểm uy tín
- `diem_uy_tin` không xuống dưới 0
- `diem_uy_tin < 50` → auto chuyển `suspicious` (nhưng vẫn làm bài được)
- `diem_uy_tin = 0` → auto `suspended` (khóa giao diện thi)
- Giám thị có thể reset điểm uy tín (quyền `GIAM_THI_1`, `GIAM_THI_2`)

### BR-05: Phòng 3D
- Tọa độ bàn format chuẩn: `R{row}-C{col}` — row, col bắt đầu từ 1
- Ví dụ phòng 4×10: R1-C1 đến R4-C10 = 40 bàn
- Màu bàn theo trạng thái:
  - `not_checkin` → Xám nhạt
  - `checkin`     → Xanh lá
  - `suspicious`  → Vàng + pulse animation
  - `suspended`   → Cam
  - `checkout`    → Xanh dương nhạt
  - Vi phạm mới   → Đỏ + blink (tạm thời, sau 10s về màu trạng thái)

---

## 9. UI/UX FLOW THEO ROLE

### 9.1 Admin Flow

```
Login → Dashboard (Thống kê tổng quan)
  ├── Quản lý Cơ cấu (Khoa - Khóa - Lớp - Sinh viên - Giảng viên)
  │     ├── Danh sách SV/GV kèm trạng thái Face KYC (APPROVED / PENDING / NOT_ENROLLED)
  │     └── Phê duyệt / Thẩm định lại ảnh Căn cước Gốc
  ├── Quản lý Phòng thi (Grid 3D + Camera ROI)
  ├── Ngân hàng Đề thi (CRUD đề trong MongoDB)
  ├── Quản lý Ca thi (Chặn tự động: Chỉ xếp chỗ SV đã KYC APPROVED, chỉ gán GV đã KYC APPROVED)
  └── Báo cáo & Audit Log (Integrity Report + Đối soát Face KYC)
```

### 9.2 Giám thị Flow

```
Login → Kiểm tra Căn cước Sinh trắc học Gốc
  ├── [Chưa có Face KYC APPROVED] → Chặn nhận ca thi, mở Modal: "Bắt buộc Đăng ký Face ID Giám thị"
  └── [Đã có Face KYC APPROVED] → Danh sách Ca thi được phân công
        └── Vào Ca thi (Trước giờ thi 15 phút: Vector Gốc tự nạp vào Staff Whitelist)
              ├── Tab 1: Phòng thi 3D (góc nhìn isometric)
              │     ├── Grid bàn theo trạng thái màu sắc
              │     ├── Avatar 3D trên mỗi bàn đã check-in
              │     ├── Khi Giám thị lại gần bàn → Icon Giám thị tím (STAFF_EXEMPTION, 0đ phạt)
              │     └── Click bàn → Xem chi tiết SV + ảnh KYC gốc + ảnh bằng chứng
              ├── Tab 2: Feed Vi phạm realtime (lọc theo mức độ)
              │     └── Báo động đỏ đặc biệt khi phát hiện Tráo người (IMPERSONATION)
              ├── Tab 3: Danh sách SV (tìm kiếm, lọc trạng thái)
              └── Actions: Cảnh báo / Đình chỉ / Thu bài / Force check-in / Bàn giao ca thi bằng Face Auth
```

### 9.3 Sinh viên Flow

```
Login → Kiểm tra Căn cước Sinh trắc học Gốc
  ├── [face_status != 'APPROVED'] → Chặn toàn bộ ca thi, hiện Banner đỏ bắt buộc:
  │     └── KYC Onboarding Page: Hướng dẫn → Quét 5 góc khuôn mặt + Liveness → Lưu Vector Gốc
  └── [face_status == 'APPROVED'] → Trang chủ (Xem lịch thi, SBD, vị trí bàn)
        └── Vào Ca thi khi đến giờ:
              ├── Check-in 1:1 (Quét camera đối chiếu với Vector Gốc ArcFace ≥ 0.75)
              ├── Mở giao diện làm bài thi (Interactive Quiz / Essay / Code)
              ├── Vòng lặp giám sát liên tục (Continuous Verification ngầm mỗi 20s)
              │     ├── Góc đầu, hướng mắt, tư thế ngồi
              │     ├── Chống gian lận trình duyệt (Tab switch, DevTools F12, Right click)
              │     └── Xác thực danh tính liên tục chống thi hộ giữa giờ
              └── Nộp bài thi → Xem tổng kết kết quả & tra cứu đáp án giải thích sau khi công bố
```

---

## 10. TECHNICAL ARCHITECTURE

### 10.1. Cấu trúc Thư mục Toàn dự án (Repository Directory Layout)

Hệ thống được tổ chức theo kiến trúc **Microservices phân tầng**, phân tách rành mạch giữa Cổng điều phối / Ứng dụng Khảo thí (`examguard-core`) và Dịch vụ Trí tuệ Nhân tạo Sinh trắc học (`examguard-ai`):

```
d:\K23CNT3-LucVanSon-2310900087\DATN\
├── run_system.bat                    # Script khởi chạy tự động: Tự giải phóng Port 3011 & 8000, kiểm tra MongoDB, bật Core & AI
├── stop_system.bat                   # Script dừng hệ thống an toàn & tắt toàn bộ tiến trình liên quan
├── SYSTEM_BLUEPRINT.md               # Nguồn tham chiếu kỹ thuật & nghiệp vụ duy nhất (Single Source of Truth)
├── README.md                         # Hướng dẫn cài đặt & vận hành nhanh
│
├── examguard-core/                   # Unified Fullstack Web & API Gateway (Node.js Express 5 + React 19 / Vite 6)
│   ├── package.json                  # Khai báo toàn bộ thư viện Fullstack (Node 20+, React 19, Tailwind v4, Socket.IO, Mongoose...)
│   ├── vite.config.ts                # Cấu hình Vite 6, TailwindCSS v4 plugin & Proxy backend
│   ├── tsconfig.json                 # Cấu hình TypeScript compiler
│   ├── index.html                    # Entry HTML tích hợp PDF.js CDN hỗ trợ Exam Snipping Canvas
│   ├── .env / .env.example           # Biến môi trường Core (PORT=3011, MONGO_URI, JWT_SECRET, CORS_ORIGIN...)
│   │
│   ├── server/                       # Backend Server & API Gateway (Node.js & Express 5)
│   │   ├── server.js                 # Entry point khởi tạo Express, HTTP Server & Socket.IO Realtime Server
│   │   ├── configs/                  # Cấu hình kết nối cơ sở dữ liệu MongoDB qua Mongoose
│   │   ├── constants/                # Hằng số toàn hệ thống, mã hóa quyền hạn (permissions.js)
│   │   ├── controllers/              # Business logic: auth, exam, student, course, kyc, proctoring, grading...
│   │   ├── middlewares/              # authMiddleware (JWT), roleCheck, uploadMiddleware (Multer), rateLimit, security
│   │   ├── models/                   # Mongoose Schemas (User, ExamPaper, ExamSession, FaceKYC, Course, Department...)
│   │   ├── routes/                   # RESTful API Endpoints (/api/auth, /api/exam, /api/courses, /api/proctoring...)
│   │   ├── services/                 # Realtime Socket.IO Room manager, Face AI HTTP Client Bridge
│   │   ├── utils/                    # examFileParser (PDF/Word), token generator, response helper
│   │   └── uploads/                  # Thư mục lưu trữ đề thi gốc, tài liệu minh họa & ảnh bài làm thí sinh
│   │
│   └── src/                          # Modern React 19 Single Page Application
│       ├── main.tsx                  # React DOM Root
│       ├── App.tsx                   # Central Router, Route Guard (RBAC/CBAC) & Layout
│       ├── index.css                 # Core Design System, CSS variables & Tailwind v4 Design Tokens
│       ├── api/                      # Axios HTTP Client kết nối API Gateway Core (Port 3011) & AI Service (Port 8000)
│       ├── store/                    # Zustand Stores: authStore, examStore, proctorStore
│       ├── constants/                # Phân quyền UI, danh mục môn học, mã phòng thi
│       ├── types/                    # TypeScript interfaces dùng chung cho toàn bộ Frontend
│       ├── components/               # UI components tái sử dụng: Modal, Canvas, Navbar, Sidebar, Dropdown...
│       └── pages/                    # 17+ Màn hình nghiệp vụ chuyên sâu:
│           ├── auth/                 # Login, Register, Forgot Password
│           ├── admin/                # Dashboard phân tích, Quản lý Người dùng, Môn học, Khoa, Lớp
│           ├── exam/                 # ExamPapers (Dual-View Builder + Snipping Tool), TakeExam, ExamGrading...
│           ├── student/              # FaceKyc (Thu thập KYC 5 góc), StudentSchedule, StudentResults...
│           └── proctor/              # LiveMonitoring (Giám sát phòng thi 3D / Isometric, Báo động vi phạm)
│
└── examguard-ai/                     # Dedicated Face AI & Computer Vision Microservice (Python FastAPI)
    ├── main.py                       # FastAPI Application entry point (Port 8000)
    ├── requirements.txt              # Thư viện AI (FastAPI, ONNX Runtime, OpenCV Headless, NumPy, PyMongo...)
    ├── .env / .env.example           # Biến môi trường AI (MONGO_URI, MODEL_PATH, HMAC_SECRET...)
    ├── app/                          # Modules xử lý AI nghiệp vụ
    │   ├── api/                      # REST Endpoints: /v1/kyc, /v1/checkin, /v1/proctor, /v1/verify
    │   ├── core/                     # Liveness checker (MiniFASNet), HMAC Security Authentication, Config
    │   ├── services/                 # ArcFace 512-D embedding extraction, Head Pose 3D, Face Matching Engine
    │   └── schemas/                  # Pydantic Schemas cho request/response sinh trắc học chuẩn hóa
    └── data/
        └── models/                   # ONNX Weight files (ArcFace 512-D, MiniFASNet, YOLOv8)
```

### 10.2. Bản đồ Phân bổ Cổng & Hạ tầng Vận hành (Service Port Topology)

| Thành phần (Component) | Nền tảng (Platform) | Cổng (Port) | Vai trò (Responsibility) | Giao thức (Protocol) |
|:---|:---|:---|:---|:---|
| **Core Web & API Gateway** (`examguard-core`) | Node.js v20+ / Express v5 | `3011` | Cổng API trung tâm, xác thực JWT, phân quyền RBAC/CBAC, quản lý ca thi, chấm thi tự động, Socket.IO Server & Phục vụ Frontend Web | HTTP / WebSocket (WS/WSS) |
| **Face AI Microservice** (`examguard-ai`) | Python 3.10+ / FastAPI / Uvicorn | `8000` | Trích xuất Face Vector 512-D, kiểm tra Liveness chống giả mạo ảnh/video, tính toán góc xoay đầu 3D Pose, phát hiện vật thể lạ | HTTP / RESTful JSON |
| **Cơ sở Dữ liệu Chính** (`MongoDB`) | MongoDB Community / Enterprise v7.0+ | `27017` | Lưu trữ dữ liệu người dùng, đề thi hỗn hợp, phiên thi, nhật ký vi phạm thời gian thực, vector khuôn mặt 512 chiều | TCP Wire Protocol |

### 10.3. Luồng Dữ liệu Thời Gian Thực (Realtime Data Flow Architecture)

```
[Thí sinh làm bài thi (Client)] 
      │ 
      ├─► (1) Gửi Frame khuôn mặt định kỳ (20s) ──► POST /v1/proctor/verify ──► [examguard-ai:8000]
      │                                                                               │
      │   ◄── Kết quả vi phạm / Pose / Tráo người (Fraud alert) ──────────────────────┘
      │
      ├─► (2) Bắn sự kiện vi phạm hoặc thay đổi trạng thái ──► Socket.IO emit
      │                                                               │
      ▼                                                               ▼
[examguard-core:3011 (Socket.IO Server)] ◄────────────────────────────┘
      │
      ├─► (3) Ghi nhận Log vi phạm & Trừ điểm uy tín tức thì ──► [MongoDB:27017]
      │
      └─► (4) Broadcast sự kiện tới Room Phòng thi `room_exam_{id}` 
                │
                ├─► [Màn hình Giám thị (Proctor Dashboard)]: Bàn đổi màu đỏ, ghim feed vi phạm, phát âm thanh cảnh báo
                └─► [Màn hình Thí sinh (TakeExam)]: Hiển thị cảnh báo trực tiếp, trừ điểm uy tín (Trust Score)
```

---

### 10.5 Kiến trúc Vận hành Đồng thời Nhiều Phòng thi (Concurrent Multi-Room & Multi-Session Architecture)

Khi nhà trường tổ chức thi học kỳ tập trung với **nhiều phòng thi diễn ra cùng một thời điểm** (ví dụ đồng thời Phòng P301, P302, P303, Lab 1, Lab 2...):

```
                                  [HỆ THỐNG TRUNG TÂM EXAMGUARD AI]
                                                 │
            ┌────────────────────────────────────┼────────────────────────────────────┐
            ▼                                    ▼                                    ▼
┌───────────────────────────────┐  ┌───────────────────────────────┐  ┌───────────────────────────────┐
│     CA THI 1 — PHÒNG P302     │  │     CA THI 2 — PHÒNG P303     │  │     CA THI 3 — PHÒNG LAB 1    │
├───────────────────────────────┤  ├───────────────────────────────┤  ├───────────────────────────────┤
│ • Room: P302 (40 bàn)         │  │ • Room: P303 (35 bàn)         │  │ • Room: LAB 1 (50 máy)        │
│ • Giám thị: ThS. Nguyễn Văn A │  │ • Giám thị: TS. Trần Thị B    │  │ • Giám thị: ThS. Lê Văn C     │
│ • Camera RTSP 1, 2 (P302)     │  │ • Camera RTSP 3 (P303)        │  │ • Camera RTSP 4, 5 (LAB 1)    │
│ • Socket: `exam_ca1_id`       │  │ • Socket: `exam_ca2_id`       │  │ • Socket: `exam_ca3_id`       │
│ • Thí sinh: SBD P302-001..040 │  │ • Thí sinh: SBD P303-001..035 │  │ • Thí sinh: SBD LAB1-001..050 │
└───────────────┬───────────────┘  └───────────────┬───────────────┘  └───────────────┬───────────────┘
                │                                  │                                  │
                └──────────────────────────────────┼──────────────────────────────────┘
                                                   ▼
                       ┌───────────────────────────────────────────────────────┐
                       │   DASHBOARD HỘI ĐỒNG KHẢO THÍ & THANH TRA TOÀN DIỆN   │
                       │   • Giám sát tổng thể N phòng thi đồng thời           │
                       │   • Chuyển đổi linh hoạt giữa các phòng 3D Live       │
                       │   • Báo cáo vi phạm tập trung & Tỷ lệ hoàn thành      │
                       └───────────────────────────────────────────────────────┘
```

1. **Cô lập Không gian Dữ liệu & Sự kiện (Data & Event Isolation):**
   - Mỗi phòng thi gắn với một bản ghi `phong_thi` (sơ đồ hàng/cột, danh sách camera, subnet IP) và một `ca_thi` riêng biệt.
   - Kênh WebSocket Socket.IO được phân chia theo Room ID: `room: exam_{ca_thi_id}`. Toàn bộ cảnh báo AI, vi phạm, nhịp tim sinh trắc học và cập nhật bàn thi của Phòng A **tuyệt đối không bị lẫn** sang Phòng B.
2. **Phân quyền Giám thị Phòng vs. Thanh tra Đa phòng:**
   - **Cán bộ coi thi (Proctor):** Được phân công vào phòng thi nào thì chỉ có quyền mở và giám sát phòng thi 3D Live của ca thi đó.
   - **Thanh tra Khảo thí (Inspector / Admin):** Có quyền xem Bảng điều hành tổng quan (`/dashboard` hiển thị `ĐANG DIỄN RA: N/N CA THI`), có thể mở nhiều tab hoặc chuyển nhanh giữa các phòng thi 3D khác nhau để hậu kiểm tra ngẫu nhiên.
3. **Xử lý Đa luồng AI Camera CCTV Song song:**
   - Python FastAPI Microservice chạy kiến trúc xử lý video song song (Async Workers / Multi-processing). Mỗi luồng camera RTSP từ từng phòng được tính toán độc lập dựa trên ma trận ROI Polygon của phòng tương ứng, không gây hiện tượng nghẽn luồng chéo giữa các phòng.

---

## 11. ĐỀ THI — CẤU TRÚC & NGHIỆP VỤ QUẢN LÝ

### 11.1 Nguồn đề thi — Admin / Giảng viên tạo như thế nào?

Admin và Giảng viên có **4 phương thức** để đưa đề thi vào hệ thống:

| Cách | Mô tả | Khi nào dùng |
|---|---|---|
| **A. Tạo thủ công trên UI** | Nhập từng câu hỏi trắc nghiệm/tự luận, chọn loại, nhập đáp án | Đề nhỏ < 20 câu, đề kiểm tra nhanh |
| **B. Import file Word/PDF → parse** | Upload file .docx/.pdf → AI tự động bóc tách ra các câu hỏi JSON | Đề có sẵn từ tài liệu Word/PDF của trường |
| **C. Import file JSON chuẩn** | Upload JSON theo cấu trúc schema định dạng hệ thống | Đề đã được số hóa sẵn trong ngân hàng |
| **D. Đề thi Dạng File Đính Kèm (File-based Exam) + Phiếu Trả Lời Số** | Giảng viên tải lên file đề thi gốc (PDF / Word / Ảnh scan) kèm cấu hình Phiếu Điền Trả Lời Trực Tuyến | Giảng viên có sẵn file đề thi niêm phong, không cần nhập lại từng câu |

**Schema JSON import chuẩn:**
```json
{
  "tieu_de": "Kiểm tra Lập trình C - HK1 2026",
  "mon_hoc_id": 5,
  "thoi_gian_lam_bai": 90,
  "tong_diem": 10.0,
  "tron_cau_hoi": true,
  "tron_dap_an": true,
  "cau_hoi": [
    {
      "stt": 1,
      "loai": "MULTIPLE_CHOICE",
      "noi_dung": "Kết quả của printf(\"%d\", 5/2) là?",
      "diem": 0.5,
      "lua_chon": ["1", "2", "2.5", "0"],
      "dap_an_dung": 1,
      "giai_thich": "Phép chia nguyên trong C",
      "anh_minh_hoa": null
    },
    {
      "stt": 2,
      "loai": "ESSAY",
      "noi_dung": "Phân tích sự khác biệt giữa stack và queue. Cho ví dụ thực tế.",
      "diem": 2.0,
      "huong_dan_cham": "Nêu được 3 điểm khác biệt (1đ), ví dụ thực tế (1đ)",
      "tu_khoa_goi_y": ["LIFO", "FIFO", "stack overflow", "queue"],
      "so_tu_toi_thieu": 150
    },
    {
      "stt": 3,
      "loai": "CODING_PROBLEM",
      "noi_dung": "Viết hàm tính tổng dãy số nguyên từ 1 đến N",
      "diem": 3.0,
      "ngon_ngu": ["c", "cpp", "python", "java"],
      "test_cases": [
        {"input": "5",  "expected_output": "15", "timeout_ms": 1000, "is_hidden": false},
        {"input": "10", "expected_output": "55", "timeout_ms": 1000, "is_hidden": true}
      ],
      "template_code": {
        "c":      "#include<stdio.h>\nint sum(int n) {\n  // TODO\n}\nint main(){int n;scanf(\"%d\",&n);printf(\"%d\",sum(n));}",
        "python": "def sum_n(n):\n    # TODO\n    pass\nprint(sum_n(int(input())))"
      },
      "giai_thich": "Dùng vòng lặp hoặc công thức n*(n+1)/2"
    }
  ]
}
```

### 11.2 Liên kết Đề thi → Ca thi

```
de_thi (MongoDB) ──── de_thi_mongo_id ────▶ ca_thi (MySQL)
    ObjectId                                    VARCHAR(50)

Quy trình:
  1. Admin / GV tạo đề thi → MongoDB trả về ObjectId
  2. Admin tạo ca thi → điền de_thi_mongo_id = ObjectId đó
  3. Khi SV check-in xong → Flask Core gọi MongoDB lấy đề → Trả về cho SV (ĐÃ LƯỢC BỎ ĐÁP ÁN ĐÚNG)
  4. Nếu tron_cau_hoi = true → Server shuffle thứ tự câu hỏi trước khi gửi
  5. Nếu tron_dap_an = true → Server shuffle thứ tự đáp án (chỉ MULTIPLE_CHOICE)
     → Lưu mapping gốc để chấm đúng sau: {"cau1_sv": [2,0,3,1], "cau2_sv": [...]}
```

---

### 11.3 Soạn Đề Trắc Nghiệm Tích Hợp Đáp Án Đúng & Lời Giải Thích

Giảng viên bộ môn có thể nhập đề trực tiếp trên UI hoặc upload file Excel/Word (.docx) theo template chuẩn của trường. Mỗi câu hỏi trắc nghiệm bắt buộc phải có đầy đủ:
- Nội dung câu hỏi + Hình ảnh minh họa (nếu có).
- Danh sách các phương án lựa chọn (A, B, C, D...).
- **Đáp án đúng (`dap_an_dung`)**: Chỉ mục phương án chính xác (VD: 0, 1, 2, 3 hoặc mảng `[1, 2]` nếu là câu chọn nhiều đáp án).
- **Điểm số câu hỏi (`diem`)**: Mặc định chia đều hoặc gán trọng số riêng.
- **Lời giải thích chi tiết (`giai_thich`)**: Diễn giải lý do vì sao đáp án đó đúng, căn cứ vào giáo trình/tài liệu nào (phục vụ sinh viên đối chiếu sau khi thi).

**Bảo mật Đề thi trong lúc làm bài (Zero-Knowledge Payload):**
```
Khi Client Sinh viên gọi GET /api/exam/questions:
  Hệ thống chạy hàm lọc bảo mật (Sanitization Pipeline):
  → XÓA BỎ hoàn toàn trường `dap_an_dung`
  → XÓA BỎ hoàn toàn trường `giai_thich`
  → XÓA BỎ `huong_dan_cham` và `test_cases[].is_hidden`
  → Chỉ trả về nội dung câu hỏi + các lựa chọn đã được đảo ngẫu nhiên.
```

---

### 11.4 Chế độ Thi theo File Đề thi (PDF / Doc / Image) & Phiếu Trả Lời Trực Tuyến (Digital Answer Sheet)

Trong thực tế thi cử đại học, rất nhiều môn học (Toán, Vật lý, Kỹ thuật, Ngoại ngữ, Đồ họa...) đã có sẵn **File đề thi chính thức** (định dạng PDF, Word hoặc Ảnh scan niêm phong của Hội đồng ra đề). Hệ thống ExamGuard AI hỗ trợ toàn diện mô hình này mà giảng viên không cần phải gõ lại từng câu hỏi:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                         GIAO DIỆN LÀM BÀI SPLIT-SCREEN WORKSPACE (TỶ LỆ 60% : 40%)               │
├─────────────────────────────────────────────────┬────────────────────────────────────────────────┤
│      KHUNG TRÁI (60%): TRÌNH XEM ĐỀ THI GỐC     │   KHUNG PHẢI (40%): PHIẾU ĐIỀN TRẢ LỜI SỐ      │
├─────────────────────────────────────────────────┼────────────────────────────────────────────────┤
│  [Trình đọc PDF / Document Viewer Bảo Mật]      │  [PHIẾU TÔ TRẮC NGHIỆM ĐIỆN TỬ - OMR SHEET]    │
│  • Thanh công cụ: [Zoom + / -] [Lật trang 1/4]  │  • Tiến độ: Đã làm 28/40 câu (70%)             │
│  • Khóa chức năng: Chặn Copy, Chặn Print,       │  • Lọc: [Tất cả] [Đã làm] [Chưa làm] [Cờ 🚩]   │
│    Chặn Tải file về máy, Chống xem mã nguồn     │                                                │
│                                                 │  Câu 1:  (A)  (B)  [C]  (D)    🚩 Đánh dấu cờ │
│  ┌───────────────────────────────────────────┐  │  Câu 2:  [A]  (B)  (C)  (D)                   │
│  │ BỘ GIÁO DỤC VÀ ĐÀO TẠO                     │  │  Câu 3:  (A)  [B]  (C)  (D)                   │
│  │ ĐỀ THI HẾT HỌC PHẦN: KỸ THUẬT LẬP TRÌNH    │  │  ...                                        │
│  │ Thời gian: 60 phút - Không sử dụng tài liệu│  │  Câu 40: (A)  (B)  (C)  [D]                   │
│  │                                           │  ├────────────────────────────────────────────────┤
│  │ Câu 1 (0.5đ): Cho đoạn mã sau trong C...  │  │  [KHU VỰC TỰ LUẬN / NỘP TẬP TIN ĐÍNH KÈM]     │
│  │ Câu 2 (0.5đ): Con trỏ trong C là gì?...   │  │  • Khung soạn thảo lời giải chi tiết (nếu có) │
│  │ ...                                       │  │  • Kéo thả file nộp bài (.zip, .c, .cpp, .pdf) │
│  └───────────────────────────────────────────┘  │  ├────────────────────────────────────────────────┤
│                                                 │  ⚡ Tự động lưu: Đã lưu 14:02:15               │
│                                                 │  [ 🔘 NỘP BÀI THI CHÍNH THỨC ]                 │
└─────────────────────────────────────────────────┴────────────────────────────────────────────────┘
```

#### Quy trình Nghiệp vụ Chi tiết:
1. **Giảng viên Chuẩn bị Đề thi:**
   - Upload file đề thi gốc (`file_url`: PDF, DOCX, hoặc Image).
   - Khai báo cấu hình làm bài:
     - Số lượng câu hỏi (ví dụ: `40 câu`).
     - Thang điểm tổng (ví dụ: `10.0`).
     - Chế độ nộp bài (`submission_mode`):
       + `OMR_BUBBLE_SHEET`: Phiếu tô trắc nghiệm A-B-C-D.
       + `ESSAY_TEXT`: Điền văn bản tự luận.
       + `FILE_ATTACHMENT`: Upload file sản phẩm (code, đồ án, zip, pdf).
       + `HYBRID`: Kết hợp vừa tô trắc nghiệm vừa nộp file/tự luận.
     - Nhập ma trận đáp án đúng (Answer Key: `1-C, 2-A, 3-B...`) để hệ thống tự động chấm trắc nghiệm ngay khi nộp.
2. **Sinh viên Làm bài trên Phiếu Điền Trả lời (Digital Answer Sheet):**
   - Màn hình chia đôi: Sinh viên vừa đọc đề ở bên trái vừa trực tiếp tô chọn đáp án bên phải mà không cần chuyển qua lại giữa các trang hay ứng dụng khác.
   - **Cơ chế Auto-save thời gian thực**: Mỗi khi thí sinh click chọn đáp án hoặc gõ văn bản, hệ thống gửi gói tin lưu ngầm (Debounced Auto-save) về máy chủ. Nếu thí sinh lỡ F5 hoặc gặp sự cố nguồn điện, toàn bộ đáp án đã điền sẽ được phục hồi 100%.
   - **Tự động thu bài**: Khi đồng hồ đếm ngược hết giờ, hệ thống tự động đóng băng giao diện, khóa phiếu trả lời và kích hoạt nộp bài tự động.

---

### 11.5 Động cơ Tự động Chấm điểm Trắc nghiệm (Auto-Grading Engine)

Ngay khi sinh viên nhấn **"Nộp bài"** hoặc **hết giờ làm bài** (Hệ thống tự động kích hoạt `checkout`), Động cơ chấm điểm tự động chạy ngay lập tức trong vòng **dưới 100 millisecond** cho mỗi bài thi:

```
                  [Sinh viên nộp bài / Hết giờ]
                               │
                               ▼
        POST /api/exam/submit  hoặc  Event Auto-Checkout
                               │
                               ▼
            [Backend Auto-Grading Engine (Flask Core)]
                               │
       1. Đọc bài làm từ MongoDB `exam_submissions` (danh sách lựa chọn của SV)
       2. Đọc đề thi gốc từ MongoDB `de_thi` (chứa `dap_an_dung` và điểm từng câu)
       3. Đọc bảng đảo vị trí `shuffle_mapping` của sinh viên đó:
          → Hoàn nguyên đáp án SV đã chọn về thứ tự gốc của đề thi
       4. So khớp từng câu trắc nghiệm (MULTIPLE_CHOICE):
          - Nếu SV chọn đúng: Diem_cau = cau_hoi.diem
          - Nếu SV chọn sai / bỏ trống: Diem_cau = 0
       5. Tính tổng điểm tự động: diem_tu_dong = SUM(Diem_cau)
                               │
                               ▼
  ┌────────────────────────────────────────────────────────────┐
  │ LƯU KẾT QUẢ VÀO CSDL Ở TRẠNG THÁI "CHỜ DUYỆT"              │
  ├────────────────────────────────────────────────────────────┤
  │ 1. Cập nhật MySQL `sinh_vien_ca_thi`:                      │
  │    - diem_tu_dong = 8.5                                    │
  │    - diem_thi = NULL (Chưa công bố chính thức)             │
  │    - trang_thai_cham = 'AUTO_GRADED'                       │
  │ 2. Lưu chi tiết từng câu vào MongoDB `exam_submissions`:   │
  │    - ket_qua_chi_tiet: [ {stt: 1, dung: true, diem: 0.5},  │
  │                          {stt: 2, dung: false, diem: 0} ]  │
  │ 3. KHÔNG CÔNG BỐ ĐIỂM CHO SINH VIÊN TẠI THỜI ĐIỂM NÀY      │
  │    (Chờ người chấm kiểm tra rà soát lần cuối)              │
  └────────────────────────────────────────────────────────────┘
```

---

### 11.5 Giao diện & Nghiệp vụ Rà soát 1 Lần của Người Chấm thi (Review Workspace)

> **Mục tiêu:** Tiết kiệm tối đa thời gian cho Giảng viên. Người chấm không cần chấm từng bài thủ công, mà chỉ cần **rà soát tổng thể 1 lần** sau khi máy đã chấm xong toàn bộ phòng thi.

#### 11.5.1 Bảng Thống kê & Phân tích Đề thi Tự động (Item Difficulty Analysis)

Khi Giảng viên truy cập màn hình Chấm thi của ca thi, hệ thống hiển thị bảng phân tích thông minh:

```
┌──────────────────────────────────────────────────────────────────────────┐
│  BÁO CÁO RÀ SOÁT CA THI: KỸ THUẬT LẬP TRÌNH — PHÒNG P302 (40 THÍ SINH)   │
├──────────────────────────────────────────────────────────────────────────┤
│ • Tổng số bài thi: 40/40 đã nộp      • Điểm trung bình tự động: 7.2/10   │
│ • Điểm cao nhất: 9.5 (2 SV)          • Điểm thấp nhất: 3.5 (1 SV)        │
├──────────────────────────────────────────────────────────────────────────┤
│ ⚠️ CẢNH BÁO BẤT THƯỜNG CỦA HỆ THỐNG:                                    │
│ [!] Câu số 14 có 92% sinh viên chọn đáp án C, nhưng đáp án trong đề là D! │
│     → Đề xuất: Giảng viên kiểm tra lại xem đề thi có bị nhầm đáp án?    │
└──────────────────────────────────────────────────────────────────────────┘
```

#### 11.5.2 Quyền Can thiệp Nhanh của Người Chấm trước khi Chốt

Nếu phát hiện câu hỏi có sai sót trong file đề gốc (nhầm đáp án, câu hỏi tối nghĩa dẫn đến 2 đáp án đều hợp lý), Giảng viên có các công cụ can thiệp chỉ với 1 click:

1. **Công nhận thêm đáp án đúng:**
   * Cho phép chọn cả đáp án B và C đều đạt điểm tối đa câu đó.
2. **Hủy câu hỏi / Cho điểm tối đa câu đó (Bonus mark):**
   * Tất cả thí sinh đều được cộng điểm câu bị lỗi.
3. **Nút "Chấm lại tự động toàn bộ ca thi (Recalculate All)":**
   * Hệ thống tự động quét lại toàn bộ 40 bài thi theo đáp án mới cập nhật trong vòng **1.5 giây**.
   * Bảng điểm tự động cập nhật ngay lập tức mà Giảng viên không phải sửa điểm từng người.
4. **Chấm bài tự luận (Essay) / Code (nếu đề thi hỗn hợp):**
   * Nếu đề thi có câu tự luận hoặc code, Giảng viên chấm điểm các câu này trên giao diện rọc phách ẩn danh. Điểm tự luận sẽ tự động cộng dồn với điểm trắc nghiệm đã chấm máy.

---

### 11.6 Quy trình Phê duyệt & Công bố Điểm Kèm Đáp Án (Publishing Workflow)

```
[Giảng viên Chấm thi]
        │
        ▼ (Kiểm tra phổ điểm, xử lý câu tranh cãi xong)
  Click: "PHÊ DUYỆT BẢNG ĐIỂM (Approve & Finalize)"
        │
        ▼
  [Backend Core Service]:
    - Cập nhật ca_thi.trang_thai_cham = 'APPROVED'
    - Khóa toàn bộ tính năng chỉnh sửa điểm của ca thi này
    - Gửi thông báo đến Trưởng bộ môn / Phòng Khảo thí
        │
        ▼
[Admin / Khảo thí / Trưởng bộ môn]:
  Click: "CÔNG BỐ KẾT QUẢ & ĐÁP ÁN (Publish to Students)"
        │
        ▼
  [Hệ thống Tự động Kích hoạt]:
    1. UPDATE sinh_vien_ca_thi SET diem_thi = diem_chot, trang_thai_diem = 'PUBLISHED'
    2. Cập nhật quyền xem bài: Cho phép sinh viên ca thi được đọc `dap_an_dung` & `giai_thich`
    3. Gửi thông báo In-app & Email cho tất cả sinh viên trong ca thi:
       "Điểm thi môn [Kỹ thuật lập trình] đã được công bố. Bạn đạt 8.5/10. Click để xem chi tiết bài làm."
```

---

### 11.7 Giao diện Sinh viên Tra cứu Kết quả & Đối Chiếu Đáp Án (Post-Exam Feedback)

Sau khi ca thi được công bố, Sinh viên đăng nhập vào hệ thống và mở mục **"Chi tiết Kết quả Thi"**:

```
┌────────────────────────────────────────────────────────────────────────┐
│  KẾT QUẢ THI: KỸ THUẬT LẬP TRÌNH — HK1 2026-2027                       │
│  Thí sinh: Lục Văn Sơn (2310900087) | Lớp: K23CNT3                     │
├────────────────────────────────────────────────────────────────────────┤
│  🏆 ĐIỂM SỐ CHÍNH THỨC:  8.5 / 10.0   (Đúng 17/20 câu)                  │
│  🛡️ ĐIỂM UY TÍN CA THI:  95 / 100    (Mức độ tin cậy: XUẤT SẮC)         │
│  ⏱️ Thời gian làm bài:   42 phút 15 giây                               │
├────────────────────────────────────────────────────────────────────────┤
│  CHI TIẾT TỪNG CÂU HỎI & ĐÁP ÁN ĐỐI CHIẾU:                             │
│                                                                        │
│  ✅ Câu 1: Kết quả của printf("%d", 5/2) là gì? (+0.5đ)               │
│     - Lựa chọn của bạn: B. 2 (Đúng)                                    │
│     - Đáp án chính thức: B. 2                                          │
│     - 💡 Lời giải thích: Trong ngôn ngữ C, phép chia giữa 2 số nguyên  │
│       5 và 2 sẽ lấy phần nguyên là 2, bỏ qua phần thập phân.           │
│                                                                        │
│  ❌ Câu 4: Đâu là cấu trúc dữ liệu hoạt động theo cơ chế LIFO? (0đ)   │
│     - Lựa chọn của bạn: A. Queue (Sai)                                 │
│     - Đáp án chính thức: C. Stack                                      │
│     - 💡 Lời giải thích: Stack hoạt động theo nguyên lý Last-In,       │
│       First-Out (LIFO). Queue hoạt động theo FIFO (First-In First-Out).│
│                                                                        │
│  ... (Hiển thị đầy đủ tất cả các câu còn lại) ...                      │
├────────────────────────────────────────────────────────────────────────┤
│  [📩 GỬI YÊU CẦU PHÚC KHẢO] (Hạn chót: đến hết ngày 22/10/2026)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 12. GIAO DIỆN LÀM BÀI THI — UI/UX CHI TIẾT


### 12.1 Layout Tổng thể (theo sketch của bạn)

```
┌──────────────────────────────────────┬───────────────────────────┐
│                                      │  ┌─────────────────────┐  │
│                                      │  │    📷 WEBCAM FEED   │  │
│                                      │  │   (Live camera)     │  │
│          KHU VỰC ĐỀ THI             │  └─────────────────────┘  │
│          (Scrollable)                │                           │
│                                      │  📋 Thông tin đợt thi:    │
│  - Câu hỏi + Options / Textarea     │  Môn: Lập trình C         │
│  - Monaco Editor (nếu Coding)       │  Ca: 08:00 - 10:00        │
│                                      │  Phòng: P302 - Bàn R2-C3 │
│                                      │                           │
│                                      │  👤 Thông tin SV:         │
│                                      │  Họ tên: Lục Văn Sơn     │
│                                      │  SBD: 20261014-001        │
│                                      │                           │
│                                      │  ⏱️ Thời gian còn lại:    │
│                                      │  ┌─────────────────────┐  │
│                                      │  │    01 : 24 : 35      │  │
│                                      │  └─────────────────────┘  │
│                                      │                           │
│                                      │  🔔 Thông báo / Cảnh báo  │
│                                      │  [Feed cảnh báo realtime] │
│                                      │                           │
│                                      │  🛡️ Điểm uy tín: 85/100  │
│                                      │  ████████░░              │
└──────────────────────────────────────┴───────────────────────────┘
[← Câu trước]  [Câu 1/30 ▼]  [Câu tiếp →]          [💾 Nộp bài]
```

**Tỷ lệ chia:** Đề thi 65% | Panel phải 35%  
**Panel phải:** `position: fixed` — không scroll theo đề  
**Đề thi:** `overflow-y: auto` — scroll độc lập

---

### 12.2 Tương tác theo loại câu hỏi

#### A. Trắc nghiệm (MULTIPLE_CHOICE)

```
┌─────────────────────────────────────────────────────┐
│ Câu 1 (0.5 điểm)                          ✅ Đã làm │
│                                                     │
│ Kết quả của printf("%d", 5/2) là?                  │
│                                                     │
│ ○ A. 1                                              │
│ ● B. 2          ← Click chọn, highlight màu chính  │
│ ○ C. 2.5                                            │
│ ○ D. 0                                              │
└─────────────────────────────────────────────────────┘

Tương tác:
  - Click vào option → tô màu, lưu vào state Zustand
  - Auto-save: Mỗi 10 giây gửi POST /api/exam/autosave với tất cả câu đã trả lời
  - Chỉ chọn được 1 đáp án (radio button behavior)
  - Có thể thay đổi trước khi nộp

Trạng thái câu hỏi (hiển thị ở navigation bar dưới):
  ○ Xám   = Chưa làm
  ● Xanh  = Đã làm
  ★ Vàng  = Đánh dấu xem lại
```

#### B. Tự luận (ESSAY)

```
┌─────────────────────────────────────────────────────┐
│ Câu 5 (2.0 điểm)                       ✏️ Đang làm │
│                                                     │
│ Phân tích sự khác biệt giữa stack và queue.        │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Stack là cấu trúc dữ liệu hoạt động theo        │ │
│ │ nguyên tắc LIFO (Last In, First Out)...         │ │
│ │                                                 │ │
│ │                                                 │ │
│ │                              [Toolbar: B I U]   │ │
│ └─────────────────────────────────────────────────┘ │
│ Đã nhập: 287 / tối thiểu 150 từ ✅                 │
└─────────────────────────────────────────────────────┘

Tương tác:
  - Rich textarea (hoặc simple textarea tùy cấu hình đề)
  - Đếm số từ realtime, hiển thị % so với so_tu_toi_thieu
  - Auto-save source text vào MongoDB mỗi 10 giây
  - Paste từ clipboard: CHO PHÉP (khác với copy-paste từ tab khác bị detect)

Chấm điểm:
  - Tự luận KHÔNG tự chấm được → Sau khi thi, giảng viên vào UI chấm tay
  - Hệ thống chỉ hiển thị bài làm + hướng dẫn chấm (huong_dan_cham)
  - Giảng viên nhập điểm từng câu → Tổng điểm tự luận
  - Điểm cuối = Điểm trắc nghiệm (auto) + Điểm tự luận (manual)
```

#### C. Lập trình — Coding Problem (CODING_PROBLEM)

```
┌─────────────────────────────────────────────────────┐
│ Câu 8 (3.0 điểm)                       🔴 Chưa làm │
│                                                     │
│ Viết hàm tính tổng từ 1 đến N.                     │
│                                                     │
│ Input: Số nguyên N (1 ≤ N ≤ 1000)                  │
│ Output: Tổng S = 1 + 2 + ... + N                   │
│                                                     │
│ [C] [C++] [Python] [Java]  ← Chọn ngôn ngữ         │
│                                                     │
│ ┌─── Monaco Editor ──────────────────────────────┐ │
│ │ #include<stdio.h>                               │ │
│ │ int sum(int n) {                                │ │
│ │     // TODO                                     │ │
│ │ }                                               │ │
│ │ int main(){int n;scanf("%d",&n);                │ │
│ │   printf("%d",sum(n));}                         │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ [▶ Chạy thử]          [Test Cases 0/2 passed]      │
│                                                     │
│ ┌─ Output ──────────────────────────────────────┐  │
│ │ Input:  5                                     │  │
│ │ Output: (đang chạy...)                        │  │
│ └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘

Tương tác:
  - Monaco Editor: Syntax highlight, autocomplete cơ bản, Ctrl+Z/Y
  - "Chạy thử": Gửi code lên FastAPI → Sandbox chạy → Trả kết quả (timeout 3s)
  - Chỉ thấy test case PUBLIC (is_hidden = false), không thấy test case ẩn
  - Test case ẩn chỉ chạy khi NỘPP BÀI (chấm điểm thực)
  - Auto-save source code mỗi 10 giây

Chấm điểm (Auto):
  - Khi nộp bài → FastAPI chạy TẤT CẢ test cases (public + hidden)
  - Mỗi test case pass = full điểm phần đó (hoặc partial nếu cấu hình)
  - Timeout → 0 điểm test đó
  - Tổng = Σ(điểm test case pass / tổng test cases) × diem_cau
```

### 12.3 Navigation Bar câu hỏi

```
┌──────────────────────────────────────────────────────────┐
│  [◀]  Câu 1  2  3  4  5  6  7  8  9  10 ...  30  [▶]   │
│        ●  ●  ●  ○  ●  ★  ○  ○  ○  ○  ...  ○             │
│        Xanh=Đã làm, Xám=Chưa, Vàng=Đánh dấu lại        │
└──────────────────────────────────────────────────────────┘

Click số câu → Jump thẳng đến câu đó
Right-click câu → "Đánh dấu xem lại" / "Bỏ đánh dấu"
```

### 12.4 Auto-save Schema (POST /api/exam/autosave)

```json
{
  "sinh_vien_ca_thi_id": 5088,
  "thoi_gian_con_lai": 4500,
  "cau_tra_loi": [
    {"stt": 1, "loai": "MULTIPLE_CHOICE", "lua_chon": 1},
    {"stt": 5, "loai": "ESSAY",           "noi_dung": "Stack là..."},
    {"stt": 8, "loai": "CODING_PROBLEM",  "source_code": "...", "ngon_ngu": "c"}
  ]
}
```
→ MongoDB `exam_submissions` ghi đè (upsert theo `sinh_vien_ca_thi_id`)  
→ Nếu mạng mất → lưu vào localStorage → Retry khi có mạng lại

---

### 12.5 GIAO DIỆN & TRẢI NGHIỆM THI KIỂU TRANG QUIZ TRỰC TUYẾN (INTERACTIVE QUIZ EXPERIENCE)

Nhằm tối ưu hóa trải nghiệm kiểm tra trắc nghiệm online tương tác cao, hệ thống ExamGuard AI cung cấp Chế độ **Trang Quiz Trực tuyến (Online Interactive Quiz)**:

#### A. Sơ đồ Kiến trúc Giao diện Quiz
```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 🛡️ EXAMGUARD AI QUIZ  [Tiến độ: 18/30 câu (60%)] ⏱️ 00:42:15  [⛶ Toàn màn]  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│                                                                             │
│  ┌─ BỘ LỌC CÂU HỎI ──────────────────────────────────────────────────────┐  │
│  │ [Tất cả: 30]  [Đã làm: 18]  [Chưa làm: 10]  [★ Cần xem lại: 2]        │  │
│  │ (1) (2) (3) [4] (5) (6) (7) (8) ★9 (10) ... 28 29 30                  │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
│  ┌─ THẺ CÂU HỎI QUIZ (INTERACTIVE QUIZ CARD) ─┐  ┌─ CAMERA AI PROCTOR ──┐  │
│  │ CÂU HỎI 4 / 30                 [★ Gắn cờ]   │  │ ┌─────────────────┐ │  │
│  │ Điểm: 0.5 đ • Môn: Kỹ thuật lập trình       │  │ │ 📷 WEBCAM LIVE  │ │  │
│  │                                             │  │ │ (Pose HUD + AI) │ │  │
│  │ Đâu là phát biểu ĐÚNG về con trỏ trong C?   │  │ └─────────────────┘ │  │
│  │                                             │  │ Uy tín: 95/100      │  │
│  │ ┌─────────────────────────────────────────┐ │  │ [● Nhìn thẳng]      │  │
│  │ │ [A] Con trỏ chỉ lưu trữ giá trị số thực │ │  │ [● Không chuyển tab]│  │
│  │ └─────────────────────────────────────────┘ │  └─────────────────────┘  │
│  │ ┌─────────────────────────────────────────┐ │                            │
│  │ │ [B] Con trỏ là biến lưu địa chỉ ô nhớ   │ │  ┌─ TIỆN ÍCH QUIZ ──────┐  │
│  │ └─────────────────────────────────────────┘ │  │ Auto-save: Vừa xong │  │
│  │ ┌─────────────────────────────────────────┐ │  │ Phím tắt: A, B, C, D│  │
│  │ │ [C] Không thể gán NULL cho con trỏ      │ │  │ Chuyển câu: ← / →   │  │
│  │ └─────────────────────────────────────────┘ │  └─────────────────────┘  │
│  │ ┌─────────────────────────────────────────┐ │                            │
│  │ │ [D] Toán tử & dùng để lấy giá trị con trỏ │                            │
│  │ └─────────────────────────────────────────┘ │                            │
│  │                                             │                            │
│  │ [◀ Câu trước]   [Tự động qua câu: BẬT]   [Câu tiếp theo ▶]  [🚀 NỘP BÀI] │
│  └─────────────────────────────────────────────┘                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### B. Các Đặc trưng Vượt trội của Chế độ Quiz Trực tuyến
1. **Thẻ câu hỏi trực quan (Interactive Quiz Card):**
   - Hỗ trợ lựa chọn đáp án bằng click chuột hoặc phím tắt nhanh (`A`, `B`, `C`, `D` hoặc `1`, `2`, `3`, `4`).
   - Hiệu ứng phản hồi thị giác: Đổi màu viền gradient cyan/emerald, hiệu ứng tick xanh mượt mà.
   - Hỗ trợ câu hỏi kèm hình ảnh minh họa chất lượng cao hoặc đoạn mã định dạng đẹp mắt.
2. **Bộ lọc trạng thái câu hỏi thông minh:**
   - Phân loại rõ: *Tất cả*, *Đã trả lời* (màu xanh lá), *Chưa trả lời* (màu xám đậm), *Cần xem lại* (màu vàng hổ phách).
   - Thí sinh dễ dàng kiểm soát được những câu còn sót trước khi nộp bài.
3. **Cơ chế chống gian lận đa lớp khi làm Quiz:**
   - **AI Webcam Monitor:** Web Worker theo dõi liên tục góc nghiêng/quay đầu (Pose yaw/pitch), cảnh báo khi vắng mặt hoặc có người lạ ghé vào màn hình.
   - **Anti-Tab Switching:** Bắt sự kiện `visibilitychange`, nếu rời trang quiz lập tức ghi nhận vi phạm `TAB_SWITCH` và trừ điểm uy tín.
   - **Fullscreen Lockdown:** Bắt buộc duy trì chế độ toàn màn hình, cảnh báo popup khi nhấn phím Escape.
4. **Nộp bài & Chấm điểm tức thì 100%:**
   - Khi bấm "Nộp bài", hệ thống đối chiếu đáp án với Ngân hàng đề thi và xuất ngay kết quả: Điểm số, xếp loại, số câu đúng/sai/bỏ trống.
   - Bắn hiệu ứng pháo hoa ăn mừng (Confetti) tạo cảm giác phấn khởi và khích lệ người học.

## 13. XỬ LÝ GIÁM THỊ ĐI QUANH LỚP — FALSE POSITIVE DETECTION

### 13.1 Vấn đề thực tế

Khi giám thị đi kiểm tra, **webcam sinh viên có thể bắt được khuôn mặt giám thị** đi qua phía sau. Nếu hệ thống phát hiện `MULTI_FACE` → trừ uy tín oan cho sinh viên.

### 13.2 Phân tích kỹ thuật

**Tại sao có thể phân biệt được giám thị vs. người ngồi cạnh gian lận:**

| Đặc điểm | Gian lận thật | Giám thị đi qua |
|---|---|---|
| Thời gian 2 mặt xuất hiện | > 5 giây (người ngồi cạnh) | < 3 giây (đi ngang) |
| Vị trí mặt thứ 2 trong frame | Gần trung tâm, rõ ràng | Rìa frame, mờ hơn |
| Mặt thứ 2 có nhìn vào camera? | Thường nhìn vào màn hình SV | Thường nhìn thẳng hoặc bên |
| Kích thước mặt thứ 2 | Lớn (gần camera) | Nhỏ (xa camera, phía sau) |

### 13.3 Giải pháp — Cơ chế Temporal Debounce

```
RULE: Chỉ trigger MULTI_FACE nếu:
  1. Phát hiện ≥ 2 khuôn mặt LIÊN TỤC trong ≥ 3 giây (90 frames ở 30FPS)
     → Loại bỏ: Giám thị đi qua (< 2 giây)

  2. Khuôn mặt thứ 2 có diện tích bbox > 15% diện tích khuôn mặt chính
     → Loại bỏ: Khuôn mặt nhỏ mờ xa ở hậu cảnh

  3. Khuôn mặt thứ 2 có confidence score > 0.7 (YuNet)
     → Loại bỏ: False detection từ ảnh poster/màn hình khác

Implementation trong Web Worker:
  let multiFaceCounter = 0;
  const MULTI_FACE_THRESHOLD_FRAMES = 90; // 3s × 30fps
  
  if (detectedFaces.length > 1 && secondFaceSizePct > 0.15) {
    multiFaceCounter++;
    if (multiFaceCounter >= MULTI_FACE_THRESHOLD_FRAMES) {
      reportViolation("MULTI_FACE");
      multiFaceCounter = 0; // reset sau khi report
    }
  } else {
    multiFaceCounter = Math.max(0, multiFaceCounter - 5); // decay dần
  }
```

### 13.4 Nút "Giám thị đang kiểm tra" (Proctor Override)

**Giải pháp bổ sung cho edge case:** Giám thị dừng lại hỏi SV lâu hơn 3 giây.

```
Trên màn hình Giám thị (Phòng 3D):
  → Click vào bàn sinh viên → "Tạm dừng giám sát bàn này (2 phút)"
  
  Backend:
    POST /api/proctor/pause-monitoring {svct_id, duration_seconds: 120}
    → Core Service ghi flag: sinh_vien_ca_thi.monitoring_paused = true, paused_until = now+120s
    → Core Service push sự kiện qua SocketIO → Web Worker client SV nhận
    → Web Worker: Dừng gửi violation reports trong khoảng paused_until
    → Sau 120s: Tự động resume
  
  Log: Mọi lần pause đều ghi vào audit log (admin xem được)
```

### 13.5 Xử lý mặt Giám thị ở Camera CCTV

**Vấn đề CCTV:** Camera góc tường sẽ bắt được giám thị đi quanh phòng.

```
Giải pháp:
  1. Giám thị mang ID badge có QR Code / AR marker
  2. YOLOv8 server: Khi detect người, kiểm tra xem có badge không
     → Có badge → Bỏ qua (đây là giám thị)
     → Không badge + thuộc ROI bàn → Là sinh viên, phân tích tiếp
  
  Nếu không có badge system:
  3. Temporal buffer CCTV: Yêu cầu bất thường xảy ra > 10 giây mới report
     (Giám thị đi qua thường < 5 giây tại 1 vị trí)
  
  4. Giám thị có thể dùng nút "Tôi đang đi kiểm tra" trên app mobile giám thị
     → Toàn bộ MULTI_PERSON detection bị suspend 2 phút cho phòng đó
```

### 13.6 Business Rule Chính thức — MULTI_FACE Detection

```
BR-MULTIFACE-01: Thời gian tối thiểu để trigger
  → MULTI_FACE chỉ log khi 2 mặt xuất hiện LIÊN TỤC ≥ 3 giây

BR-MULTIFACE-02: Kích thước mặt thứ 2
  → Kích thước bbox mặt thứ 2 ≥ 15% mặt chính mới tính

BR-MULTIFACE-03: Proctor Override
  → Khi svct.monitoring_paused = true → Không trừ điểm bất kỳ vi phạm nào
  → Log vẫn ghi (audit trail) nhưng không trừ điểm, không gửi cảnh báo

BR-MULTIFACE-04: Recovery
  → Sau khi 2 mặt biến mất → multiFaceCounter decay dần (không reset ngay)
  → Nếu xuất hiện lại ngay → tích lũy nhanh hơn (suspicious pattern)

BR-MULTIFACE-05: Notification cho SV
  → Nếu MULTI_FACE chưa đủ threshold → KHÔNG hiện popup cho SV
  → Chỉ hiện popup khi đã report vi phạm thực sự
```


### 13.7 Xác thực Khuôn mặt Giám thị / Thanh tra trên Camera Sinh viên (Face-based Proctor Verification)

> **Mục tiêu then chốt:** Giải quyết triệt để vấn đề Giám thị hoặc Thanh tra đi lại kiểm tra tại bàn sinh viên. Camera sinh viên bắt được mặt cán bộ coi thi thì **hệ thống tự động xác minh danh tính qua Face Embedding**, **vẫn ghi nhận nhật ký (Audit Log) giám sát hoạt động của sinh viên**, nhưng **TUYỆT ĐỐI KHÔNG TRỪ ĐIỂM UY TÍN** và **KHÔNG BÁO ĐỘNG ĐỎ OAN** cho sinh viên.

#### 13.7.1 Nguyên lý Hoạt động & Luồng Dữ liệu Realtime

```
                 [Webcam Sinh viên] (LAB_PC / BYOD_LAPTOP)
                         │
                         ▼ (Phát hiện ≥ 2 khuôn mặt trong khung hình)
            [Web Worker / Local MediaPipe YuNet]
                         │
         Crop bounding box của khuôn mặt thứ 2
                         │
                         ▼
        POST /ai/proctor/verify-face-proctor
        Body: { ca_thi_id, sinh_vien_ca_thi_id, second_face_image_base64 }
                         │
                         ▼
            [FastAPI Proctoring Engine]
                         │
       1. Trích xuất ArcFace Embedding (512-D vector) của mặt thứ 2: e_second
       2. Lấy danh sách Proctor Embeddings của ca thi từ Redis Cache:
          - Giám thị 1 (GV01)
          - Giám thị 2 (GV02)
          - Cán bộ Thanh tra (TT01)
       3. Tính Cosine Similarity:
          sim(e_second, e_proctor_i) = (e_second · e_proctor_i) / (||e_second|| * ||e_proctor_i||)
                         │
         ┌───────────────┴────────────────────────┐
         │ sim_max >= 0.65 (Khớp Giám thị/Thanh tra)│ sim_max < 0.65 (Không khớp)
         ▼                                        ▼
┌────────────────────────────────────────┐ ┌───────────────────────────────────────┐
│ XÁC MINH: CÁN BỘ COI THI ĐANG KIỂM TRA │ │ XÁC MINH: NGƯỜI LẠ / GIAN LẬN         │
├────────────────────────────────────────┤ ├───────────────────────────────────────┤
│ 1. Trừ điểm uy tín: 0 ĐIỂM (KHÔNG TRỪ) │ │ 1. Trừ điểm uy tín: -15 ĐIỂM          │
│ 2. Cảnh báo SV: KHÔNG HIỆN POPUP ĐỎ   │ │ 2. Cảnh báo SV: HIỆN POPUP ĐỎ VI PHẠM │
│ 3. UI SV: Hiện badge xám/xanh an tâm:  │ │ 3. Ghi log MongoDB: MULTI_FACE       │
│    "Cán bộ coi thi đang kiểm tra bàn"  │ │ 4. Đẩy chuông báo đỏ về Dashboard GT  │
│ 4. VẪN GHI NHẬT KÝ AUDIT LOG (MongoDB) │ └───────────────────────────────────────┘
│    Lưu hoạt động SV lúc đó + ảnh snapshot│
│ 5. Đẩy SocketIO về Dashboard Phòng 3D: │
│    Bàn R2-C3 hiển thị icon Giám thị xanh│
└────────────────────────────────────────┘
```

#### 13.7.2 Nạp Bộ nhớ đệm Vector Giám thị (Proctor Cache Pre-loading)

- **Thời điểm nạp:** Khi ca thi chuyển sang trạng thái `ACTIVE` (hoặc trước giờ thi 15 phút).
- **Bộ nhớ lưu trữ:** Redis Hash `ca_thi:{ca_thi_id}:proctor_embeddings` & In-Memory FastAPI Worker.
- **Cấu trúc dữ liệu trong Redis:**

```json
{
  "ca_thi_id": 105,
  "proctors": [
    {
      "giang_vien_id": 12,
      "ma_gv": "GV_CNTT_001",
      "ho_ten": "ThS. Nguyễn Văn A",
      "vai_tro": "GIAM_THI_1",
      "face_embedding": [0.0231, -0.0512, 0.1124, "... 512 float32 values ..."]
    },
    {
      "giang_vien_id": 18,
      "ma_gv": "GV_CNTT_008",
      "ho_ten": "TS. Trần Thị B",
      "vai_tro": "GIAM_THI_2",
      "face_embedding": [-0.0105, 0.0841, -0.0332, "... 512 float32 values ..."]
    },
    {
      "giang_vien_id": 5,
      "ma_gv": "TT_KTHI_002",
      "ho_ten": "ThS. Lê Hoàng C",
      "vai_tro": "THANH_TRA",
      "face_embedding": [0.0411, -0.0195, 0.0883, "... 512 float32 values ..."]
    }
  ]
}
```

> **Tối ưu hiệu năng:** Vì số lượng giám thị và thanh tra trong mỗi ca thi rất ít ($N \in [2, 4]$), phép so khớp $1:N$ Cosine Similarity trên CPU chỉ tốn **dưới 0.5 millisecond**, hoàn toàn không gây trễ hệ thống realtime.

#### 13.7.3 Chi tiết Nhật ký Hoạt động (Audit Log Schema) khi Giám thị xuất hiện

Mặc dù **không trừ điểm**, hệ thống **vẫn ghi toàn bộ hoạt động của sinh viên trong thời gian giám thị đứng cạnh** nhằm phục vụ hậu kiểm tra, phúc khảo và phòng tránh tình huống tiêu cực (ví dụ: sinh viên lợi dụng lúc giám thị quay lưng):

```json
// Collection MongoDB: ai_proctoring_logs
{
  "_id": ObjectId("670cb1e39a5f2a1b9c8d0001"),
  "sinh_vien_ca_thi_id": 5088,
  "ca_thi_id": 105,
  "timestamp": ISODate("2026-10-15T09:25:31.420Z"),
  "loai_su_kien": "PROCTOR_SUPERVISION_DETECTED",
  "muc_do": "INFO",
  "diem_tru": 0,
  "diem_uy_tin_hien_tai": 95,
  "thong_tin_giam_thi": {
    "giang_vien_id": 12,
    "ma_gv": "GV_CNTT_001",
    "ho_ten": "ThS. Nguyễn Văn A",
    "vai_tro": "GIAM_THI_1",
    "similarity_score": 0.814
  },
  "hoat_dong_sinh_vien": {
    "trang_thai_cau_hoi": "Dang_lam_cau_8_essay",
    "gaze_direction": "SCREEN_CENTER",
    "yaw": 2.1,
    "pitch": -8.4,
    "active_input": true
  },
  "evidence_image_url": "s3://examguard-evidence/20261015/ca105/proctor_check_sv5088_092531.jpg",
  "nguon_camera": "WEBCAM_LAPTOP_BYOD"
}
```

#### 13.7.4 Business Rules Bổ sung cho Nhận diện Giám thị / Thanh tra

```
BR-PROCTOR-01: Ngưỡng Khớp Mặt Giám thị (Face Match Threshold)
  → Cosine Similarity giữa mặt thứ 2 và vector giám thị trong ca thi:
    • >= 0.65: Xác nhận 100% là Cán bộ coi thi / Thanh tra hợp lệ.
    • 0.55 - 0.64: Khuôn mặt nghi ngờ, chờ kiểm tra 2 frame tiếp theo.
    • < 0.55: Không phải cán bộ coi thi → Kích hoạt quy trình phạt vi phạm MULTI_FACE.

BR-PROCTOR-02: Quy tắc Điểm Uy tín & Trừng phạt
  → Khi xác thực là Giám thị / Thanh tra:
    • Tuyệt đối KHÔNG trừ điểm uy tín (Penalty = 0).
    • Trạng thái sinh viên giữ nguyên (checkin / suspicious).
    • KHÔNG gửi thông báo vi phạm màu đỏ, KHÔNG phát âm thanh cảnh báo.

BR-PROCTOR-03: Ghi nhận Nhật ký Giám sát (Audit Continuity)
  → Mọi hành động của sinh viên trong thời gian giám thị có mặt tại bàn VẪN ĐƯỢC GHI LOG liên tục:
    • Vị trí con trỏ chuột, câu hỏi đang mở.
    • Hướng nhìn (gaze) và tư thế đầu (yaw/pitch) của sinh viên.
    • Lưu ảnh snapshot frame có mặt giám thị để đối soát minh bạch.

BR-PROCTOR-04: Điều kiện tiên quyết đối với Cán bộ Coi thi
  → Giảng viên / Cán bộ thanh tra chỉ được xếp lịch coi thi khi ĐÃ HOÀN THÀNH KYC khuôn mặt
    (có face_embedding 512-D lưu trong bảng giang_vien).
  → Nếu chưa KYC: Hệ thống cảnh báo trên giao diện Phân công coi thi của Admin.
```

---

## 14. MỤC LỤC CẬP NHẬT (v1.3)

| Section | Nội dung | Phiên bản |
|---|---|---|
| 1 | Tổng quan hệ thống ExamGuard AI | v1.0 |
| **2** | **Actor & Role Matrix: Phân quyền RBAC + CBAC toàn diện & 4 Giới hạn Zero-Trust** | **v1.3** |
| 3 | State Machine: Sinh viên trong Ca thi & Điểm uy tín | v1.0 |
| 4 | 5 Workflow Chi tiết (Tạo ca, Xếp chỗ, Check-in, Giám sát, Thu bài) | v1.0 |
| 5 | Database Schema — MySQL (Các bảng cơ bản & chuẩn hóa) | v1.0 |
| 6 | Database Schema — MongoDB (Telemetry, Logs, Submissions, Questions) | v1.0 |
| 7 | API Contract Core & AI Service | v1.0 |
| 8 | Business Rules & Validation | v1.0 |
| 9 | UI/UX Flow theo Role | v1.0 |
| 10 | Technical Architecture | v1.0 |
| **11** | **Quản lý Đề thi, Tự động Chấm Trắc nghiệm, Rà soát 1 lần, Duyệt & Công bố kèm Đáp án** | **v1.3** |
| 12 | Giao diện làm bài: Layout 2 panel, 3 loại câu hỏi, auto-save | v1.1 |
| 13 | Xử lý giám thị đi quanh lớp, MULTI_FACE false positive debounce | v1.1 |
| **13.7** | **Xác thực khuôn mặt Giám thị/Thanh tra trên camera SV (Log audit không trừ điểm)** | **v1.2** |
| **15** | **Luồng Quản lý Phân cấp Tổ chức: Khoa — Khóa học — Lớp — Sinh viên & Giảng viên** | **v1.2** |
| **16** | **API Contracts & Dữ liệu: Tự động Chấm điểm, Rà soát, Phê duyệt & Công bố Đáp án** | **v1.3** |

---

## 15. LUỒNG QUẢN LÝ PHÂN CẤP TỔ CHỨC: KHOA — KHÓA HỌC — LỚP — SINH VIÊN & GIẢNG VIÊN

### 15.1 Sơ đồ Cây Phân cấp Tổ chức Đào tạo

```
                            ┌─────────────────────────────────┐
                            │          TRƯỜNG ĐẠI HỌC         │
                            └────────────────┬────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      ▼                                             ▼
       ┌──────────────────────────────┐              ┌──────────────────────────────┐
       │   KHOA CÔNG NGHỆ THÔNG TIN   │              │     KHOA KINH TẾ & QTKD      │
       │   (ma_khoa: 'CNTT')          │              │     (ma_khoa: 'KTQT')        │
       └──────────────┬───────────────┘              └──────────────┬───────────────┘
                      │                                             │
      ┌───────────────┴───────────────┐                             │
      ▼                               ▼                             │
┌───────────────────────────┐   ┌───────────────────────────┐       │
│  GIẢNG VIÊN THUỘC KHOA    │   │   KHÓA HỌC (COHORT)       │       │
│  - ThS. Nguyễn Văn A      │   │   - Khóa 21 (2021 - 2025) │       │
│  - TS. Trần Thị B         │   │   - Khóa 22 (2022 - 2026) │       │
│  - ThS. Lê Hoàng C        │   │   - Khóa 23 (2023 - 2027) │       │
│  (Quản lý chuyên môn,     │   └─────────────┬─────────────┘       │
│   coi thi, cố vấn lớp)    │                 │                     │
└─────────────┬─────────────┘                 ▼                     ▼
              │                  ┌────────────────────────┐   ┌────────────────────────┐
              │  Phụ trách /     │   LỚP CHUYÊN NGÀNH     │   │   LỚP CHUYÊN NGÀNH     │
              │  Cố vấn học tập  │   (Thuộc Khóa 23 CNTT) │   │   (Thuộc Khóa 23 KTQT) │
              └─────────────────▶│   - K23CNT1            │   │   - K23QTR1            │
                                 │   - K23CNT2            │   │   - K23KTO1            │
                                 │   - K23CNT3            │   └────────────────────────┘
                                 └────────────┬───────────┘
                                              │
                                              ▼
                                 ┌────────────────────────┐
                                 │       SINH VIÊN        │
                                 │   (Thuộc Lớp K23CNT3)  │
                                 │   - 2310900087 (Sơn)   │
                                 │   - 2310900088 (Bình)  │
                                 │   - 2310900089 (An)... │
                                 └────────────────────────┘
```

---

### 15.2 Chuẩn hóa Cơ sở Dữ liệu Phân cấp (MySQL Schema Bổ sung)

Nhằm đáp ứng yêu cầu nghiệp vụ: **1 Khoa có nhiều Khóa học; 1 Khóa học có nhiều Lớp; 1 Lớp có nhiều Sinh viên; Giảng viên thuộc Khoa và có thể cố vấn lớp hoặc coi thi**, mô hình CSDL được chuẩn hóa thực thể `khoa_hoc`:

```sql
-- ====================================================================
-- 1. BẢNG KHOA (Faculty) — Đã có trong Schema v1.0
-- ====================================================================
-- CREATE TABLE khoa (
--   id           INT PRIMARY KEY AUTO_INCREMENT,
--   ma_khoa      VARCHAR(20) UNIQUE NOT NULL,  -- VD: 'CNTT'
--   ten_khoa     VARCHAR(100) NOT NULL,
--   so_dien_thoai VARCHAR(15)
-- );

-- ====================================================================
-- 2. BẢNG MỚI BỔ SUNG: khoa_hoc (Academic Cohort / Course Intake)
-- Quan hệ: 1 Khoa có nhiều Khóa học (VD: Khoa CNTT có Khóa 21, 22, 23)
-- ====================================================================
CREATE TABLE khoa_hoc (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  khoa_id        INT NOT NULL,                 -- Khoa quản lý khóa học
  ma_khoa_hoc    VARCHAR(20) NOT NULL,         -- VD: 'K23', 'K22', 'K21'
  ten_khoa_hoc   VARCHAR(100) NOT NULL,        -- VD: 'Khóa 2023 - 2027'
  nam_tuyen_sinh INT NOT NULL,                 -- Năm bắt đầu: 2023
  nam_tot_nghiep INT NOT NULL,                 -- Năm dự kiến hoàn thành: 2027
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (khoa_id) REFERENCES khoa(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_khoa_khoahoc (khoa_id, ma_khoa_hoc)
);

-- ====================================================================
-- 3. BẢNG LỚP: lop (Class / Section)
-- Quan hệ: 1 Khóa học có nhiều Lớp (VD: Khóa K23 CNTT có K23CNT1, K23CNT2, K23CNT3)
-- Đồng thời có thể phân công 1 Giảng viên làm Cố vấn học tập / Chủ nhiệm
-- ====================================================================
CREATE TABLE lop (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  khoa_hoc_id         INT NOT NULL,            -- Khóa học trực thuộc (VD: K23)
  khoa_id             INT NOT NULL,            -- Khoa chuyên môn
  ma_lop              VARCHAR(20) UNIQUE NOT NULL, -- VD: 'K23CNT3'
  ten_lop             VARCHAR(100) NOT NULL,   -- VD: 'Lớp Công nghệ Thông tin 3 - Khóa 23'
  giang_vien_covan_id INT NULL,                -- Giảng viên làm Cố vấn học tập (nếu có)
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (khoa_hoc_id) REFERENCES khoa_hoc(id) ON DELETE RESTRICT,
  FOREIGN KEY (khoa_id)     REFERENCES khoa(id) ON DELETE RESTRICT,
  FOREIGN KEY (giang_vien_covan_id) REFERENCES giang_vien(id) ON DELETE SET NULL
);

-- ====================================================================
-- 4. BẢNG SINH VIÊN: sinh_vien (Student)
-- Quan hệ: 1 Lớp có nhiều Sinh viên (VD: Lớp K23CNT3 có 40 sinh viên)
-- Sinh viên thuộc 1 Lớp duy nhất (suy ra gián tiếp thuộc Khóa học và Khoa)
-- ====================================================================
-- Bảng sinh_vien kế thừa từ v1.0, liên kết chặt qua lop_id:
-- sinh_vien.lop_id -> lop.id -> khoa_hoc.id -> khoa.id

-- ====================================================================
-- 5. BẢNG GIẢNG VIÊN: giang_vien (Lecturer / Faculty Staff)
-- Quan hệ: Giảng viên thuộc Khoa.
-- Logic tương tự: Thuộc Khoa chuyên môn, có face_embedding để giám thị,
-- có thể được phân công cố vấn lớp hoặc coi thi các ca thi của lớp/khóa.
-- ====================================================================
-- giang_vien.khoa_id -> khoa.id
```

---

### 15.3 Ma trận Phân quyền & Quan hệ Quản lý (Logic Hierarchy)

| Cấp Quản lý | Thực thể cha | Thực thể con | Ví dụ thực tế | Người có quyền tạo/sửa |
|---|---|---|---|---|
| **Cấp 1: Khoa** | Trường | Khóa học, Giảng viên | Khoa Công nghệ Thông tin (`CNTT`) | Admin Tổng / Phòng Đào tạo |
| **Cấp 2: Khóa học** | Khoa | Lớp học | Khóa 23 (`K23`, Niên khóa 2023–2027) | Admin Khoa / Quản trị viên |
| **Cấp 3: Lớp học** | Khóa học & Khoa | Sinh viên | Lớp `K23CNT3` (Chuyên ngành CNTT) | Admin Khoa / Giáo vụ |
| **Cấp 4: Sinh viên** | Lớp học | Hồ sơ, Face ID, Ca thi | SV `2310900087` — Lục Văn Sơn | Giáo vụ import / SV cập nhật KYC |
| **Cấp Giảng viên** | Khoa | Lớp cố vấn, Ca thi coi thi | ThS. Nguyễn Văn A (`GV_CNTT_001`) | Admin Khoa / Phòng Đào tạo |

---

### 15.4 Chi tiết 3 Quy trình Nghiệp vụ Quản lý (Workflows)

#### WF-ORG-01: Quy trình Khởi tạo Cơ cấu Đào tạo (Khoa → Khóa → Lớp)

```
[Admin Đào tạo / Khoa]
        │
        ├─► 1. Tạo Khoa (Nếu chưa có): Nhập Mã Khoa ('CNTT'), Tên Khoa
        │
        ├─► 2. Tạo Khóa học theo Khoa:
        │      - Chọn Khoa: 'Khoa Công nghệ Thông tin'
        │      - Nhập Mã Khóa: 'K23'
        │      - Tên Khóa: 'Khóa 2023 - 2027'
        │      - Năm tuyển sinh: 2023 | Năm tốt nghiệp: 2027
        │
        └─► 3. Tạo Lớp học thuộc Khóa:
               - Chọn Khóa học: 'K23 (2023-2027)'
               - Nhập Mã Lớp: 'K23CNT3'
               - Tên Lớp: 'Lớp Công nghệ Thông tin 3'
               - Chọn Cố vấn học tập (tùy chọn): 'ThS. Nguyễn Văn A'
```

#### WF-ORG-02: Quy trình Import Danh sách Sinh viên & Cấp tài khoản

```
[Giáo vụ Khoa] Chuẩn bị file Excel (.xlsx) theo template:
  Cột: [STT] | [Mã SV] | [Họ đệm] | [Tên] | [Ngày sinh] | [Giới tính] | [Email] | [Mã Lớp]
                              │
                              ▼
  Upload file qua giao diện: POST /api/org/sinh-vien/import-excel
                              │
                              ▼
  [Backend Validation Engine]:
    1. Kiểm tra từng dòng: Mã SV đã tồn tại trong DB chưa?
    2. Kiểm tra 'Mã Lớp' (VD: 'K23CNT3') có tồn tại trong hệ thống chưa?
       → Nếu chưa có: Báo lỗi dòng X "Mã lớp không hợp lệ, hãy tạo lớp trước".
    3. Kiểm tra định dạng Email (@sinhvien.edu.vn) & Ngày sinh.
                              │
                              ▼ (Nếu tất cả hợp lệ - Transaction MySQL)
    1. Tạo bản ghi `users`:
       - username = ma_sv (VD: '2310900087')
       - password_hash = hash(ma_sv + '@DefaultPass')
       - role = 'student'
    2. Tạo bản ghi `sinh_vien`:
       - user_id = users.id
       - ma_sv, ho_ten, ngay_sinh, gioi_tinh, email
       - lop_id = lop.id (liên kết chuẩn vào lớp)
    3. Gửi email kích hoạt thông báo sinh viên đăng nhập và làm KYC khuôn mặt.
```

#### WF-ORG-03: Quy trình Quản lý Giảng viên & Đăng ký Khuôn mặt (KYC Giám thị)

```
[Admin / Trưởng Khoa]
        │
        ├─► 1. Thêm mới hồ sơ Giảng viên:
        │      - Chọn Khoa: 'Khoa Công nghệ Thông tin'
        │      - Mã Giảng viên: 'GV_CNTT_001'
        │      - Họ tên: 'Nguyễn Văn A'
        │      - Email, Học vị, Chuyên môn
        │      - Tạo user: role = 'teacher'
        │
        └─► 2. Đăng ký Khuôn mặt (KYC Cán bộ Coi thi / Giảng viên):
               - Giảng viên đăng nhập vào hệ thống ExamGuard.
               - Truy cập mục "Hồ sơ cá nhân & Đăng ký Face ID".
               - Chụp 5 góc khuôn mặt (Thẳng, Nghiêng trái, Nghiêng phải, Ngửa, Cúi).
               - AI Service (ArcFace) tính trung bình vector đặc trưng 512-D.
               - Lưu vector vào `giang_vien.face_embedding`.
               - Đánh dấu trạng thái: "Đã sẵn sàng phân công coi thi".
```

---

### 15.5 Bảng Business Rules về Quản lý Phân cấp & Sinh viên

```
BR-ORG-01: Ràng buộc Toàn vẹn Phân cấp (Integrity Constraint)
  → Không thể xóa Khoa nếu bên trong còn Khóa học hoặc Giảng viên.
  → Không thể xóa Khóa học nếu bên trong còn Lớp học.
  → Không thể xóa Lớp nếu bên trong còn Sinh viên đang theo học.

BR-ORG-02: Định danh Duy nhất (Unique Identification)
  → Mã SV (ma_sv) là duy nhất trên toàn trường.
  → Mã Lớp (ma_lop) là duy nhất trên toàn trường (ví dụ K23CNT3).
  → Mã Khóa học (ma_khoa_hoc) là duy nhất trong cùng 1 Khoa (ví dụ K23 thuộc CNTT).
  → Mã Giảng viên (ma_gv) là duy nhất trên toàn trường.

BR-ORG-03: Xếp lịch Thi theo Phân cấp
  → Khi tạo Ca thi, Admin có thể chọn nhanh thí sinh tham gia theo:
    1. Chọn theo Lớp: Tất cả SV thuộc lớp K23CNT3.
    2. Chọn theo Khóa học: Tất cả SV thuộc Khóa K23 của Khoa CNTT học môn Cơ sở dữ liệu.
    3. Nhập danh sách tự do: Dành cho ca thi thi lại / ghép phòng liên khoa.

BR-ORG-04: Điều kiện Đăng ký Thi & KYC Khuôn mặt
  → Sinh viên thuộc lớp hợp lệ phải hoàn thành KYC (đã có face_embedding) trước giờ thi ít nhất 2 giờ.
  → Nếu chưa KYC, trạng thái trong danh sách ca thi hiển thị badge đỏ: "Chưa kích hoạt Face ID".
```

---

### 15.6 API Contracts — Quản lý Tổ chức & Phân cấp

#### 1. Quản lý Khóa học theo Khoa

```http
### 1.1 Lấy danh sách Khóa học của một Khoa
GET /api/org/khoa/{khoa_id}/khoa-hoc
Response 200:
[
  {
    "id": 1,
    "ma_khoa_hoc": "K23",
    "ten_khoa_hoc": "Khóa 2023 - 2027",
    "nam_tuyen_sinh": 2023,
    "nam_tot_nghiep": 2027,
    "so_lop": 6,
    "so_sinh_vien": 240
  }
]

### 1.2 Tạo mới Khóa học
POST /api/org/khoa-hoc
Body:
{
  "khoa_id": 1,
  "ma_khoa_hoc": "K24",
  "ten_khoa_hoc": "Khóa 2024 - 2028",
  "nam_tuyen_sinh": 2024,
  "nam_tot_nghiep": 2028
}
```

#### 2. Quản lý Lớp học theo Khóa

```http
### 2.1 Lấy danh sách Lớp thuộc Khóa học
GET /api/org/khoa-hoc/{khoa_hoc_id}/lop
Response 200:
[
  {
    "id": 15,
    "ma_lop": "K23CNT3",
    "ten_lop": "Lớp Công nghệ Thông tin 3 - Khóa 23",
    "khoa_id": 1,
    "ten_khoa": "Công nghệ Thông tin",
    "khoa_hoc_id": 1,
    "ten_khoa_hoc": "Khóa 2023 - 2027",
    "giang_vien_covan": {
      "id": 12,
      "ma_gv": "GV_CNTT_001",
      "ho_ten": "ThS. Nguyễn Văn A"
    },
    "so_sinh_vien": 42
  }
]

### 2.2 Tạo Lớp học mới
POST /api/org/lop
Body:
{
  "khoa_id": 1,
  "khoa_hoc_id": 1,
  "ma_lop": "K23CNT4",
  "ten_lop": "Lớp Công nghệ Thông tin 4 - Khóa 23",
  "giang_vien_covan_id": 12
}
```

#### 3. Quản lý Sinh viên theo Lớp & Import Excel

```http
### 3.1 Lấy danh sách Sinh viên của 1 Lớp
GET /api/org/lop/{lop_id}/sinh-vien?page=1&limit=50
Response 200:
{
  "total": 42,
  "items": [
    {
      "id": 101,
      "ma_sv": "2310900087",
      "ho_ten": "Lục Văn Sơn",
      "ngay_sinh": "2005-08-15",
      "gioi_tinh": "M",
      "email": "son.luc@sinhvien.edu.vn",
      "lop_id": 15,
      "ma_lop": "K23CNT3",
      "da_kyc_face": true,
      "avatar_url": "https://examguard.edu.vn/avatars/2310900087.jpg"
    }
  ]
}

### 3.2 Import Sinh viên từ Excel
POST /api/org/sinh-vien/import-excel
Content-Type: multipart/form-data
Body: { file: binary_excel_file, default_password_type: "MA_SV" }
Response 200:
{
  "success_count": 42,
  "failed_count": 0,
  "errors": []
}
```

#### 4. Quản lý Giảng viên & Đăng ký Khuôn mặt

```http
### 4.1 Lấy danh sách Giảng viên theo Khoa
GET /api/org/khoa/{khoa_id}/giang-vien
Response 200:
[
  {
    "id": 12,
    "ma_gv": "GV_CNTT_001",
    "ho_ten": "ThS. Nguyễn Văn A",
    "email": "anguyen@daihoc.edu.vn",
    "khoa_id": 1,
    "da_kyc_face": true,
    "so_lop_co_van": 1
  }
]

### 4.2 Thu thập khuôn mặt Giảng viên (Face KYC Enroll)
POST /api/org/giang-vien/enroll-face
Body:
{
  "giang_vien_id": 12,
  "face_images": [
    "data:image/jpeg;base64,...(anh_thang)",
    "data:image/jpeg;base64,...(anh_nghieng_trai)",
    "data:image/jpeg;base64,...(anh_nghieng_phai)"
  ]
}
Response 200:
{
  "success": true,
  "message": "Đăng ký nhận diện khuôn mặt Giảng viên thành công",
  "embedding_length": 512
}
```

---

## 16. API CONTRACTS & DỮ LIỆU: TỰ ĐỘNG CHẤM ĐIỂM, RÀ SOÁT, PHÊ DUYỆT & CÔNG BỐ ĐÁP ÁN

### 16.1 Bổ sung Trường Dữ liệu (Schema Extensions)

```sql
-- Cập nhật bảng ca_thi để theo dõi tiến độ chấm thi
ALTER TABLE ca_thi ADD COLUMN trang_thai_cham 
  ENUM('NOT_GRADED', 'AUTO_GRADED', 'REVIEWING', 'APPROVED', 'PUBLISHED') 
  DEFAULT 'NOT_GRADED';

-- Cập nhật bảng sinh_vien_ca_thi để tách bạch điểm máy chấm và điểm chốt
ALTER TABLE sinh_vien_ca_thi 
  ADD COLUMN diem_tu_dong FLOAT NULL,                 -- Điểm do hệ thống tự chấm
  ADD COLUMN diem_dieu_chinh FLOAT NULL,             -- Điểm sau khi GV rà soát/cộng điểm
  ADD COLUMN nguoi_cham_id INT NULL,                 -- Giảng viên thực hiện rà soát
  ADD COLUMN ghi_chu_cham TEXT NULL,                 -- Nhận xét của giảng viên
  ADD FOREIGN KEY (nguoi_cham_id) REFERENCES giang_vien(id);
```

```json
// Cấu trúc kết quả chấm chi tiết lưu trong MongoDB `exam_submissions`
{
  "sinh_vien_ca_thi_id": 5088,
  "ca_thi_id": 105,
  "thoi_gian_nop": ISODate("2026-10-15T09:42:15Z"),
  "tong_diem_tu_dong": 8.5,
  "so_cau_dung": 17,
  "so_cau_sai": 3,
  "so_cau_bo_qua": 0,
  "chi_tiet_tung_cau": [
    {
      "stt_goc": 1,
      "stt_hien_thi_sv": 3,
      "loai": "MULTIPLE_CHOICE",
      "lua_chon_sv": 1,
      "dap_an_dung": 1,
      "is_correct": true,
      "diem_dat_duoc": 0.5,
      "diem_toi_da": 0.5,
      "giai_thich": "Phép chia 5/2 trong C lấy phần nguyên là 2."
    },
    {
      "stt_goc": 4,
      "stt_hien_thi_sv": 1,
      "loai": "MULTIPLE_CHOICE",
      "lua_chon_sv": 0,
      "dap_an_dung": 2,
      "is_correct": false,
      "diem_dat_duoc": 0.0,
      "diem_toi_da": 0.5,
      "giai_thich": "Stack hoạt động theo cơ chế LIFO. Queue theo FIFO."
    }
  ]
}
```

---

### 16.2 Đặc tả Chi tiết 7 API Endpoints

#### 1. Hệ thống / Worker Trigger Tự động Chấm điểm
```http
POST /api/grading/auto-grade/{ca_thi_id}
X-Internal-Token: "examguard-internal-secret-token"
Response 200:
{
  "ca_thi_id": 105,
  "tong_so_bai": 40,
  "da_cham_xong": 40,
  "thoi_gian_xu_ly_ms": 1240,
  "trang_thai": "AUTO_GRADED"
}
```

#### 2. Giảng viên Chấm thi Lấy Bảng Tổng kết & Rà soát Phổ điểm
```http
GET /api/grading/review/{ca_thi_id}
Authorization: Bearer <Teacher_JWT>
Response 200:
{
  "ca_thi_id": 105,
  "ten_mon": "Kỹ thuật lập trình",
  "ma_phong": "P302",
  "tong_thi_sinh": 40,
  "trang_thai_cham": "AUTO_GRADED",
  "thong_ke": {
    "diem_trung_binh": 7.24,
    "diem_cao_nhat": 9.5,
    "diem_thap_nhat": 3.5,
    "so_bai_duoi_5": 3
  },
  "canh_bao_cau_hoi_bat_thuong": [
    {
      "stt_cau": 14,
      "noi_dung": "Độ phức tạp thuật toán QuickSort trường hợp xấu nhất...",
      "ty_le_sai": 0.925,
      "dap_an_hien_tai_trong_de": "C",
      "phan_bo_lua_chon": { "A": 2, "B": 37, "C": 1, "D": 0 },
      "canh_bao": "92.5% sinh viên chọn B thay vì C. Cần rà soát lại file đề gốc!"
    }
  ],
  "danh_sach_bai_thi": [
    {
      "sinh_vien_ca_thi_id": 5088,
      "ma_phach": "PHACH_9A2F81",
      "so_cau_dung": "17/20",
      "diem_tu_dong": 8.5,
      "diem_dieu_chinh": null,
      "diem_chot": 8.5,
      "diem_uy_tin": 95
    }
  ]
}
```

#### 3. Giảng viên Can thiệp Sửa Đáp án / Công nhận Thêm Đáp án Đúng
```http
POST /api/grading/adjust-question
Authorization: Bearer <Teacher_JWT>
Body:
{
  "ca_thi_id": 105,
  "stt_cau": 14,
  "hanh_dong": "ADD_VALID_ANSWER",  // Hoặc "REPLACE_ANSWER" hoặc "CANCEL_QUESTION"
  "dap_an_cong_nhan_them": [1],      // Chấp nhận thêm phương án B (index 1)
  "ly_do": "Đề in thiếu từ phủ định, đáp án B và C đều đạt chuẩn học phần."
}
Response 200:
{
  "success": true,
  "message": "Đã ghi nhận điều chỉnh câu hỏi số 14. Vui lòng bấm Recalculate để cập nhật lại điểm."
}
```

#### 4. Chấm lại Tự động Toàn bộ Ca thi sau khi Sửa Đáp án
```http
POST /api/grading/recalculate/{ca_thi_id}
Authorization: Bearer <Teacher_JWT>
Response 200:
{
  "success": true,
  "ca_thi_id": 105,
  "so_bai_thay_doi_diem": 37,
  "diem_trung_binh_moi": 7.71,
  "thoi_gian_tinh_toan_ms": 1150
}
```

#### 5. Giảng viên Phê duyệt Bảng điểm (Khóa Sửa điểm)
```http
POST /api/grading/approve/{ca_thi_id}
Authorization: Bearer <Teacher_JWT>
Body:
{
  "ghi_chu": "Đã rà soát toàn bộ 40 bài thi, đã xử lý câu 14 công nhận 2 đáp án. Đề xuất công bố điểm."
}
Response 200:
{
  "success": true,
  "trang_thai_cham": "APPROVED",
  "approved_at": "2026-10-15T11:00:00Z"
}
```

#### 6. Admin / Khảo thí Công bố Kết quả & Đáp án cho Sinh viên
```http
POST /api/grading/publish/{ca_thi_id}
Authorization: Bearer <Admin_JWT>
Response 200:
{
  "success": true,
  "trang_thai_cham": "PUBLISHED",
  "so_sinh_vien_nhan_thong_bao": 40,
  "han_phuc_khao": "2026-10-22T23:59:59Z"
}
```

#### 7. Sinh viên Tra cứu Bài làm Chi tiết kèm Đáp án & Lời giải thích
```http
GET /api/student/exam-result/{sinh_vien_ca_thi_id}
Authorization: Bearer <Student_JWT>
Response 200:
{
  "mon_hoc": "Kỹ thuật lập trình",
  "ngay_thi": "2026-10-15",
  "diem_chinh_thuc": 8.5,
  "diem_uy_tin": 95,
  "xep_loai": "Giỏi",
  "trang_thai_diem": "PUBLISHED",
  "han_phuc_khao": "2026-10-22T23:59:59Z",
  "danh_sach_cau_hoi": [
    {
      "stt": 1,
      "noi_dung": "Kết quả của printf(\"%d\", 5/2) là?",
      "cac_lua_chon": ["1", "2", "2.5", "0"],
      "lua_chon_cua_ban": 1,
      "dap_an_dung": 1,
      "is_correct": true,
      "diem_dat": 0.5,
      "giai_thich": "Trong ngôn ngữ C, phép chia nguyên lấy phần nguyên 2."
    },
    {
      "stt": 2,
      "noi_dung": "Đâu là cấu trúc dữ liệu hoạt động theo cơ chế LIFO?",
      "cac_lua_chon": ["Queue", "Array", "Stack", "Tree"],
      "lua_chon_cua_ban": 0,
      "dap_an_dung": 2,
      "is_correct": false,
      "diem_dat": 0.0,
      "giai_thich": "Stack hoạt động theo cơ chế Last-In, First-Out (LIFO)."
    }
  ]
}
```

---

## 17. NÂNG CẤP HỆ THỐNG GIÁM SÁT PHÒNG THI: SOCKET.IO, FACE AI 3D POSE & ANTI-CHEAT (v2.0)

### 17.1. Kiến trúc Core Face AI 3D & Phân loại Hành vi Nghi vấn
- **Mô hình**: YuNet ONNX (Face Detection) + ArcFace w600k (Embedding) + PnP 3D Landmarks.
- **Tư thế mới & Ngưỡng phát hiện**:
  - `PHONE_LOOK_DOWN`: Pitch ≤ -22° (Cúi đầu nhìn điện thoại dưới hộc bàn) → Mức độ: `HIGH`, Trừ: 20đ.
  - `SUSPICIOUS_SIDE_LEFT` / `SUSPICIOUS_SIDE_RIGHT`: |Yaw| ≥ 30° (Liếc bài thí sinh bên cạnh) → Mức độ: `MEDIUM`, Trừ: 10đ.
  - `TURN_LEFT` / `TURN_RIGHT` / `LOOK_UP` / `LOOK_DOWN`: Mức độ: `LOW`, Trừ: 5đ.
  - `MULTIPLE_FACES`: Phát hiện > 1 mặt → So khớp ArcFace với danh sách Giám thị/Thanh tra. Nếu trùng khớp → `PROCTOR_INSPECTION` (0đ - Miễn trừ phạt). Nếu không khớp → `HIGH` (-15đ).
  - `NO_FACE`: Thí sinh rời khỏi khung hình hoặc che webcam → Mức độ: `MEDIUM`, Trừ: 10đ.

### 17.2. Giao thức Socket.IO Giám thị Thời gian Thực (Realtime Proctoring Protocol)
- **Namespaces & Rooms**: `session_{sessionId}`
- **Luồng Sự kiện**:
  1. `join_session` (`{ sessionId, role, studentId, candidateCode }`): Thí sinh và Giám thị gia nhập room phòng thi.
  2. `proctor:violation`: Server bắn thông báo vi phạm ngay lập tức tới Giám thị kèm severity, penalty, snapshot evidence.
  3. `proctor:student_update`: Đồng bộ điểm uy tín và trạng thái thí sinh tức thì lên sơ đồ bàn thi (Desk Matrix).
  4. `proctor:override_update`: Giám thị kích hoạt chế độ kiểm tra tại bàn (Override 2 phút) → Chuyển màu bàn sang tím trên toàn bộ UI giám thị.
  5. `student:warning:{studentId}`: Giám thị gửi cảnh báo trực tiếp lên màn hình thí sinh → Hiển thị modal bắt buộc xác nhận và trừ 5đ.
  6. `student:extra_time`: Giám thị cộng bù giờ trực tiếp cho thí sinh gặp sự cố mạng.
  7. `student:suspended`: Giám thị đình chỉ và khóa màn hình bài thi ngay tức thì.
  8. `student:heartbeat`: Thí sinh gửi định kỳ câu hỏi đang làm (VD: Câu 5/30) và keepalive.

### 17.3. Bộ công cụ Chống Gian lận Trình duyệt (Browser Anti-Cheat Suite)
- **Cơ chế**:
  - `TAB_SWITCH`: Bắt sự kiện `visibilitychange` khi thí sinh chuyển tab hoặc thu nhỏ trình duyệt (-10đ).
  - `RIGHT_CLICK`: Chặn `contextmenu` ngăn tra cứu menu chuột phải (-5đ).
  - `COPY_PASTE`: Chặn `copy`, `paste`, `cut` nội dung bài thi (-10đ).
  - `DEVTOOLS_OPEN`: Chặn các phím tắt F12, Ctrl+Shift+I/J/C, Ctrl+U ngăn mở Developer Tools (-30đ, Mức độ: `CRITICAL`).
  - `FULLSCREEN_EXIT`: Giám sát thoát chế độ toàn màn hình (-10đ).
- **Debounce / Deduplication vi phạm**:
  - Vi phạm cùng loại trên cùng một thí sinh trong vòng 15–30 giây sẽ không trừ điểm lặp lại (Debounced).

### 17.4. Chu kỳ Camera Thích ứng (Adaptive Camera Inspection)
- Điểm uy tín ≥ 90đ: Gửi frame kiểm tra mỗi **20 giây**.
- Điểm uy tín 70–89đ: Tăng tần suất kiểm tra lên mỗi **15 giây**.
- Điểm uy tín < 70đ (Nghi vấn cao): Tăng tần suất kiểm tra lên mỗi **10 giây**.

### 17.5. Xác thực Khuôn mặt Liên tục & Chống Tráo người / Thi hộ (Continuous Biometric Verification)
- **Hạt nhân**: Vector Gốc ArcFace 512-D được lưu trữ an toàn trong DB sau khi Sinh viên hoàn thành KYC 5 góc (`face_status = 'APPROVED'`).
- **Cơ chế kiểm soát thời gian thực**:
  1. Trong mỗi chu kỳ Camera Thích ứng, ngoài việc phân tích góc cúi/nghiêng đầu (Head Pose), AI trích xuất vector khuôn mặt hiện tại từ frame webcam.
  2. Tính Cosine Similarity giữa khuôn mặt trước camera và Vector Gốc của thí sinh đang dự thi:
     $$\text{Similarity} = \frac{\mathbf{u}_{\text{live}} \cdot \mathbf{v}_{\text{ground\_truth}}}{\|\mathbf{u}_{\text{live}}\| \|\mathbf{v}_{\text{ground\_truth}}\|}$$
  3. **Ngưỡng quyết định & Phản ứng tự động**:
     - $\text{Similarity} \ge 0.75$: Danh tính hợp lệ (`IDENTITY_VERIFIED`), không can thiệp.
     - $\text{Similarity} < 0.70$ kéo dài liên tiếp $\ge 15$ giây (3 frame):
       + Kích hoạt vi phạm `IMPERSONATION_DETECTED` (Trừ 50đ uy tín, Mức độ: `CRITICAL`).
       + Phát còi báo động khẩn cấp tới Giám thị kèm Popup ảnh đối chiếu kép: **[Ảnh Gốc KYC]** vs **[Ảnh Frame Hiện Tại]**.
       + Server tự động gửi lệnh Socket.IO `student:suspended` khóa ngay lập tức giao diện làm bài thi của thí sinh.

---

## 18. KIẾN TRÚC ĐỀ THI ĐA DẠNG: ĐỀ THI HỖN HỢP (TRẮC NGHIỆM + TỰ LUẬN), ĐỀ THEO FILE & QUY CHẾ CHẤM ĐA ĐÁP ÁN (MULTI-SELECT & ALTERNATIVE KEYS)

### 18.1. Kiến trúc Đề thi Hỗn hợp (Hybrid Exam Paper: MCQ + Essay / Coding)
Trong khảo thí đại học, kỳ thi thường không chỉ thuần túy trắc nghiệm mà kết hợp giữa đánh giá kiến thức diện rộng (Trắc nghiệm) và đánh giá tư duy chiều sâu / kỹ năng giải quyết vấn đề (Tự luận / Lập trình). ExamGuard AI thiết kế kiến trúc hỗ trợ 3 cấu trúc đề thi:
1. **100% Trắc nghiệm khách quan (`PURE_MCQ`)**:
   - Gồm $N$ câu trắc nghiệm (ví dụ 40 hoặc 50 câu).
   - Hệ thống tự động chấm điểm $100\%$ ngay khi nộp bài.
2. **Đề thi Hỗn hợp (`HYBRID`)**:
   - **Phần I — Trắc nghiệm khách quan (Objective MCQs)**: Câu $1 \dots M$. Thí sinh tô đáp án trên Phiếu OMR điện tử. Hệ thống tự động chấm điểm tức thì.
   - **Phần II — Tự luận / Giải bài tập / Viết Code (Subjective Essay / Coding)**: Câu $M+1 \dots N$. Thí sinh làm bài trực tiếp trong hộp soạn thảo văn bản, hỗ trợ định dạng, đếm từ, trình biên tập code hoặc nộp file ảnh/PDF bài làm viết tay.
   - **Cơ chế Chấm điểm**: Điểm tổng kết = Điểm Trắc nghiệm (Auto-Graded) + Điểm Tự luận (Giảng viên chấm thủ công / Trợ lý AI Rubric).
3. **100% Tự luận (`PURE_ESSAY`)**:
   - Dành cho các môn thi chuyên đề, đồ án, tiểu luận hoặc viết code thuật toán. Toàn bộ câu hỏi do Giảng viên trực tiếp chấm.

```mermaid
graph TD
    A["Đề Thi Hỗn Hợp (Hybrid Exam Paper)"] --> B["Phần I: Trắc Nghiệm (Câu 1..M)"]
    A --> C["Phần II: Tự Luận / Code (Câu M+1..N)"]
    
    B --> D["Phiếu Tô OMR Trực Tuyến"]
    D --> E["Động Cơ Auto-Grading Chấm Tức Thì"]
    E --> F["Điểm Trắc Nghiệm (VD: 6.0 / 10)"]
    
    C --> G["Hộp Soạn Thảo / Sandbox Viết Code"]
    G --> H["Giao Diện Giảng Viên Chấm Điểm (Manual / AI Rubric)"]
    H --> I["Điểm Tự Luận (VD: 3.5 / 10)"]
    
    F --> J["TỔNG ĐIỂM CHÍNH THỨC: 9.5 / 10.0"]
    I --> J
```

---

### 18.2. Quy chế Chấm Trắc nghiệm Nhiều Đáp án Đúng & Đáp án Tương Đương

| Chế độ Đáp án (`selectionMode`) | Cơ chế Hiển thị UI Thí sinh | Quy tắc Chấm điểm (`scoringMode`) | Ứng dụng Thực tiễn |
|:---|:---|:---|:---|
| **Chọn 1 đáp án duy nhất (`SINGLE`)** | Nút tròn Radio `[A] [B] [C] [D]` | So khớp chính xác: Thí sinh chọn đúng duy nhất phương án được định nghĩa $\rightarrow$ Đạt điểm câu. | Câu hỏi trắc nghiệm truyền thống (1 đáp án đúng). |
| **Chọn nhiều đáp án đúng (`MULTIPLE`)** | Hộp chọn Checkbox đa phương án `[A] [B] [C] [D]` (cho phép chọn nhiều nút) | 1. **Đúng toàn bộ (`ALL_OR_NOTHING`)**: Phải chọn đúng đủ toàn bộ tập hợp đáp án đúng và không chọn thừa đáp án sai mới đạt $100\%$ điểm câu.<br>2. **Điểm thành phần (`PARTIAL_CREDIT`)**: Điểm = $(\text{Số đáp án đúng chọn được} - \text{Số đáp án sai chọn nhầm}) \times \frac{\text{Điểm câu}}{\text{Tổng đáp án đúng}}$. | Câu hỏi trắc nghiệm phức hợp (ví dụ: "Những phát biểu nào sau đây đúng? -> A và C đúng"). |
| **Chấp nhận nhiều đáp án tương đương (`ALTERNATIVE`)** | Nút chọn linh hoạt | Thí sinh chọn **bất kỳ đáp án nào** nằm trong danh mục đáp án chấp nhận $\rightarrow$ Đều được tính trọn vẹn điểm câu. | Áp dụng khi đề thi có câu hỏi mà 2 phương án đều đúng, hoặc sau phúc khảo Hội đồng khảo thí công nhận thêm đáp án đúng. |

---

### 18.3. Không gian Làm bài Thi Chia đôi Màn hình Đa năng (Hybrid Digital Workspace)
- **Cột Trái (60% độ rộng)**: File đề thi (PDF / DOCX / Ảnh scan) với thanh công cụ phóng to/thu nhỏ (Zoom 50%–250%), nút mở tab mới và lớp Watermark mã hóa chống chụp trộm đề thi.
- **Cột Phải (40% độ rộng)**: **Phiếu Trả Lời Trực Tuyến Đa Năng (Hybrid Answer Sheet)**:
  - Các dòng câu hỏi Trắc nghiệm: Hiển thị các nút tô OMR (hỗ trợ cả chọn đơn Radio lẫn chọn nhiều Checkbox).
  - Các dòng câu hỏi Tự luận: Tự động mở rộng thành **Hộp Bài Làm Tự Luận (Essay Editor)** với bộ đếm ký tự, đếm từ tối thiểu (`minWords`) và chỉ dẫn làm bài.
  - Tự động lưu tiến độ đám mây (Cloud Auto-save) mỗi 15 giây.

---

### 18.4. Trình Phân Tích Đề Thi & Bóc Tách Tự Động Câu Hỏi & Ma Trận Đáp Án (AI & Document Parser Engine)

Khi Giảng viên tải lên tệp đề thi (Microsoft Word `.docx`, `.doc`, Acrobat `.pdf`, hoặc văn bản thuần):
1. **Trích xuất Văn bản Đa tầng (Multi-layer Document Extraction):**
   - Định dạng Word (`.docx`): Sử dụng công nghệ trích xuất AST và HTML để giữ nguyên các thuộc tính định dạng đặc biệt (`<strong>` in đậm, `<u>` gạch chân, danh sách bullet).
   - Định dạng PDF: Trích xuất các luồng văn bản (Text Streams), loại bỏ phần header/footer trang thi để lấy nội dung đề bài liên tục.
2. **Thuật toán Nhận diện Đáp án Đúng & Bóc tách Tự động (Answer Key Detection):**
   - **Mô hình 1: Đáp án đánh dấu trực tiếp trong câu hỏi:** Nhận diện ký hiệu dấu sao (`*A.`, `A*.`, `*B)`), ký hiệu hộp kiểm (`[x] C.`), hoặc thẻ đáp án (`Đáp án: B`, `Key: A,C`).
   - **Mô hình 2: Bảng đáp án tổng hợp ở cuối tài liệu:** Quét và bóc tách khối `BẢNG ĐÁP ÁN / HƯỚNG DẪN CHẤM / ANSWER KEY` với các cặp `Câu : Đáp án` (hỗ trợ cả đáp án đơn `1.A`, đáp án nhiều lựa chọn `4:A,C` và câu tự luận `5:TL`).
   - **Mô hình 3: Phân định phần Trắc nghiệm & Tự luận:** Tự động phát hiện ranh giới chuyển tiếp `PHẦN II: TỰ LUẬN` để phân bổ chính xác loại câu hỏi (`MULTIPLE_CHOICE` vs `ESSAY`).
3. **Đồng bộ hóa 1-Click vào Giao diện Soạn Đề:**
   - Tự động điền số lượng câu hỏi, cơ cấu điểm và ma trận nút bấm OMR tương ứng.
   - Giảng viên chỉ cần tải tệp lên, hệ thống sẽ tự động cấu hình toàn bộ đáp án chuẩn mà không cần thao tác gõ tay thủ công.

---

### 18.5. Ma Trận Tùy Biến Phương Thức Trả Lời Từng Câu Hỏi & Hiển Thị Đồ Họa Sơ Đồ Mạch

Đối với các môn học đặc thù như **Toán rời rạc, Kỹ thuật số, Mạch điện tử, Lý thuyết đồ thị, Cấu trúc dữ liệu & Thuật toán**, bài thi thường có:
- **Câu hỏi kèm hình ảnh sơ đồ phức tạp:** Ví dụ đề thi Toán rời rạc Câu 3: *"Tìm đầu ra của các mạch tổ hợp sau"* kèm hình vẽ mạch gồm các cổng **NAND, NOT, AND, OR**.
- Công thức toán học phức tạp: $F(x,y,z) = \bar{x}\bar{z} + \bar{y}$
- Bảng chân trị (Truth table) 8 dòng cho 3 biến $x, y, z$.

#### A. Kiến trúc Hiển thị Đồ họa & Sơ đồ Mạch cho Thí sinh (Visual Diagram Delivery)
Nếu hệ thống chỉ bóc tách văn bản thô (plain text) thì sinh viên sẽ không nhìn thấy hình ảnh sơ đồ mạch. ExamGuard AI giải quyết triệt để bằng 2 cơ chế:
1. **Chế độ Chia đôi Màn hình Song song (Split-Screen View - Mặc định cho đề thi đính kèm tệp):**
   - **Cột Trái (60%):** Hiển thị nguyên vẹn 100% file đề gốc (PDF / Hình ảnh) của giảng viên với đầy đủ sơ đồ mạch điện, đồ thị, bảng biểu, ký hiệu toán học nguyên bản. Có nút Zoom In/Out và Watermark chống rò rỉ đề thi.
   - **Cột Phải (40%):** Phiếu trả lời / Thẻ câu hỏi tương ứng để sinh viên nhập đáp án. Thí sinh nhìn trực tiếp sơ đồ mạch bên trái và làm bài bên phải.
2. **Đính kèm Hình ảnh Minh họa Từng câu (`q.image`):**
   - Hỗ trợ Giảng viên đính kèm ảnh sơ đồ mạch/đồ thị riêng cho từng câu hỏi trong ngân hàng câu hỏi.
   - Giao diện làm bài hiển thị hình ảnh minh họa to rõ nét ngay dưới nội dung câu hỏi, hỗ trợ tính năng click phóng to (Lightbox Zoom).
3. **Thanh Ký hiệu Toán rời rạc & Đại số Boole (Discrete Math Quick Toolbar):**
   - Tích hợp thanh phím tắt chèn nhanh các ký hiệu logic: `[ x̄ (Phủ định) ]`, `[ ¬ (NOT) ]`, `[ ∧ (AND) ]`, `[ ∨ (OR) ]`, `[ ⊕ (XOR) ]`, `[ ⊼ (NAND) ]`, `[ ⊽ (NOR) ]`, `[ → ]`, `[ ↔ ]` giúp thí sinh gõ biểu thức logic chính xác và thuận tiện ngay trên máy tính.

#### B. Ma Trận Tùy Biến Phương Thức Trả Lời
Giảng viên được toàn quyền cấu hình phương thức làm bài riêng cho từng câu hỏi:

| Phương thức Nộp bài (`submissionMethod`) | Hành vi Giao diện Thí sinh (Candidate UI) | Cơ chế Chấm & Kiểm soát | Môn học Phù hợp Điển hình |
|:---|:---|:---|:---|
| **1. Trắc nghiệm OMR (`MCQ_SELECT`)** | Bảng nút tròn Radio hoặc Checkbox tô đáp án A, B, C, D | Hệ thống tự động chấm tức thì theo ma trận đáp án chuẩn (`ALL_OR_NOTHING` hoặc `PARTIAL_CREDIT`). | Các câu hỏi lý thuyết, nhận biết, trắc nghiệm tính toán nhanh. |
| **2. Soạn thảo Trực tiếp (`TEXT_EDITOR`)** | Ô nhập văn bản tích hợp thanh ký hiệu logic và bộ gõ công thức MathJax. | Chấm tự động qua bộ từ khóa (`suggestedKeywords`) kết hợp AI Rubric hoặc Giảng viên chấm tay. | Câu hỏi giải thích khái niệm, biểu thức rút gọn, phân tích logic ngắn. |
| **3. Chụp ảnh Bài làm Giấy (`FILE_UPLOAD`)** | Chụp trực tiếp bằng **Webcam máy tính** (hoặc nộp tệp vẽ mạch / scan bài thi). | Hệ thống số hóa ảnh, so khớp nét chữ sinh trắc học và hiển thị song song cho Giảng viên chấm điểm chi tiết. | **Toán rời rạc (Vẽ sơ đồ mạch Câu 3), Lập bảng chân trị (Câu 2), Hình học, Đồ thị**. |
| **4. Kết hợp Linh hoạt (`HYBRID_TEXT_FILE`)** | Vừa có khung nhập kết quả rút gọn ($F_{out} = \dots$), vừa chụp kèm bài giải chi tiết từng bước trên giấy thi. | Kiểm tra đối chiếu giữa kết quả tóm tắt và lời giải viết tay trong ảnh đính kèm. | Bài thi tính toán nhiều bước (Tìm khai triển tích các tổng + vẽ mạch). |

---

### 18.6. Kiến Trúc Giám Sát & Chụp Bài Làm Giấy Chuẩn Quy Chế Phòng Thi (Zero-Phone Webcam Paper Capture)

> [!IMPORTANT]
> **Quy chế Phòng thi Chuẩn (MOET & Đại học): Thí sinh BỊ CẤM TUYỆT ĐỐI MANG/SỬ DỤNG ĐIỆN THOẠI DI ĐỘNG trong phòng thi.**  
> Việc yêu cầu sinh viên rút điện thoại ra quét QR/chụp ảnh là **vi phạm quy chế thi** và tạo kẽ hở gian lận. Do đó, ExamGuard AI thiết lập cơ chế **Chụp Bài Làm Giấy 100% Qua Webcam Máy Tính (Zero-Phone Paper Capture)** làm phương thức chuẩn mực trong phòng thi!

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│           ZERO-PHONE ATTACHMENT PROCTORING FRAMEWORK (CHUẨN QUY CHẾ PHÒNG THI)                   │
├────────────────────────────────┬────────────────────────────────┬───────────────────────────────┤
│    LỚP 1: MÔI TRƯỜNG CÔ LẬP    │      LỚP 2: WEBCAM PAPER SCAN  │    LỚP 3: DIGITAL FORENSICS   │
│   (Lockdown & Process Guard)   │   (Chụp trực tiếp bằng Webcam) │   (EXIF & AI Plagiarism Scan) │
├────────────────────────────────┼────────────────────────────────┼───────────────────────────────┤
│ • Khóa Full-Screen & Chặn Alt-Tab│ • TUYỆT ĐỐI KHÔNG DÙNG ĐT      │ • Kiểm tra EXIF DateTimeOriginal│
│ • Chặn Paste từ ngoài (Anti-Paste│ • Thí sinh giơ trang giấy thi  │   (Phải khớp khung giờ ca thi)│
│ • Process Monitor: Chặn Zalo,  │   trước Webcam máy tính phòng thi│ • Phát hiện ảnh chỉnh sửa qua  │
│   Discord, Telegram, UltraView │ • Khung định vị tài liệu A4    │   Photoshop / Canva / AI tool │
│ • Dual-screen detection        │ • Đếm ngược 3s tự động chụp    │ • So khớp nét chữ viết tay    │
│   (Chặn màn hình phụ mở app)   │ • AI tăng tương phản mực viết  │ • MOSS Code Plagiarism        │
└────────────────────────────────┴────────────────────────────────┴───────────────────────────────┘
```

#### 1. Lớp 1: Khóa Môi trường & Chống Thoát Ứng dụng (Client Isolation & Process Lockdown)
- **Lockdown Toàn Màn Hình:** Thí sinh bắt buộc bật chế độ Fullscreen. Mọi hành vi Alt-Tab, nhấn phím Windows, mở Task Manager đều bị chặn hoặc ghi nhận vi phạm cờ vàng/đỏ (`BROWSER_SWITCH_VIOLATION`).
- **Chặn Clipboard Paste từ Ứng dụng Ngoài:** Vô hiệu hóa `Ctrl+V` từ bên ngoài trình duyệt thi. Thí sinh chỉ được thao tác trong buồng thi.
- **Kiểm soát Tiến trình (Process Whitelist):** Chặn các ứng dụng điều khiển từ xa (TeamViewer, AnyDesk, UltraViewer) và ứng dụng nhắn tin ngầm (Zalo, Telegram, Discord).

#### 2. Lớp 2: Cơ chế "Webcam Paper Capture" (Chụp Bài Làm Giấy Trực Tiếp Qua Webcam Máy Tính - Không Cần Điện Thoại)
*Cách thức vận hành hoàn toàn tuân thủ quy chế thi:*
1. **Thí sinh làm bài ra giấy thi:** Đối với Câu 3 (vẽ sơ đồ mạch logic) hoặc Câu 2 (kẻ bảng chân trị), thí sinh dùng bút mực vẽ và làm bài chi tiết lên tờ giấy thi được phát tại chỗ.
2. **Bấm "Chụp bằng Webcam máy tính":** Tại câu hỏi đó, thí sinh nhấn nút `[📷 Giơ giấy trước Webcam máy tính]`.
3. **Khung Định vị Tài liệu Thông minh (A4 Guide Frame):**
   - Màn hình hiển thị khung ngắm trực tiếp từ webcam phòng thi với đường viền hướng dẫn canh chỉnh trang giấy.
   - Thí sinh hai tay cầm tờ giấy thi giơ trước webcam máy tính trong 3–5 giây. Cả giám thị trong phòng và camera giám sát đều nhìn thấy rõ ràng hành động này.
4. **Đếm ngược & Tự động Chụp (3s Countdown & Auto Enhancement):**
   - Hệ thống đếm ngược 3... 2... 1... và chụp lại khung hình độ phân giải cao từ luồng video.
   - Thuật toán Document Enhancement tự động tăng độ tương phản của nét bút mực đen trên nền giấy trắng, khử bóng mờ.
   - Thí sinh xem trước ảnh vừa chụp: Bấm `[✅ Xác nhận nộp bài làm này]` hoặc `[🔄 Chụp lại]`.
5. **Tuyệt đối không cần điện thoại di động:** Toàn bộ quá trình diễn ra ngay trên máy tính thi, không cần bất kỳ thiết bị trung gian nào. (Chế độ quét QR Mobile chỉ đóng vai trò phương án phụ cho các kỳ thi từ xa tại nhà có giám thị cho phép).

#### 3. Lớp 3: Điều Tra Kỹ Thuật Số & Trí Tuệ Nhân Tạo Hậu Kiểm (Digital Forensics & AI Audit)
- **Kiểm định Siêu dữ liệu EXIF:** Thời gian chụp ảnh phải nằm trọn vẹn trong khoảng thời gian diễn ra ca thi.
- **So Khớp Chữ Viết Tay Sinh Trắc Học (Handwriting Stylometry Engine):** Đối chiếu nét chữ bài làm với mẫu chữ ký/viết tay của sinh viên lúc KYC ban đầu để ngăn chặn việc người khác viết hộ.
- **Kiểm tra Trùng lặp Ảnh Toàn Phòng Thi (Cross-Candidate Plagiarism Detection):** So khớp chéo ảnh bài làm của tất cả sinh viên trong ca thi để phát hiện việc chép bài của nhau (`COLLUSION_DETECTED`).

---

## 19. DANH MỤC TOÀN DIỆN NỀN TẢNG HỆ THỐNG, CÔNG NGHỆ & THƯ VIỆN (TECH STACK & LIBRARIES SPECIFICATION)

> Tài liệu quy chuẩn hóa toàn bộ các nền tảng hệ điều hành, cơ sở dữ liệu, runtime, framework máy chủ, thư viện giao diện người dùng, và module thị giác máy tính đang được triển khai thực tế trong hệ thống **ExamGuard AI**.  
> Được đối chiếu chính xác từ [package.json](file:///d:/K23CNT3-LucVanSon-2310900087/DATN/examguard-core/package.json) và [requirements.txt](file:///d:/K23CNT3-LucVanSon-2310900087/DATN/examguard-ai/requirements.txt).

### 19.1. Nền Tảng Hệ Thống & Hạ Tầng Runtime (System Platforms & Infrastructure)

| Nền tảng (Platform) | Phiên bản / Tiêu chuẩn | Vai trò & Mục đích Triển khai trong ExamGuard AI |
|:---|:---|:---|
| **Hệ Điều Hành Máy Chủ & Máy Trạm** | Windows 10/11 / Windows Server / Linux (Ubuntu 22.04 LTS) | Môi trường máy chủ dịch vụ và môi trường máy trạm thi chuẩn trong phòng Lab của Nhà trường. |
| **Node.js Runtime** | Node.js v20.x+ (LTS) | Runtime máy chủ non-blocking I/O hiệu năng cao vận hành Backend Core API, Quản lý WebSocket & Phục vụ Frontend. |
| **Python Runtime** | Python 3.10 / 3.11+ | Môi trường vận hành Microservice Trí tuệ Nhân tạo, xử lý tính toán số học ma trận và Deep Learning Inference. |
| **Cơ sở Dữ liệu NoSQL (MongoDB)** | MongoDB v7.0+ (Port 27017) | Lưu trữ hướng tài liệu linh hoạt: Cấu trúc đề thi đa dạng, danh sách câu hỏi động, vector sinh trắc học 512 chiều, nhật ký giám sát realtime. |
| **Kịch bản Khởi chạy Tự động** | Windows Batch Script (`run_system.bat`, `stop_system.bat`) | Tự động quét và giải phóng port xung đột (3011, 8000), kiểm tra socket kết nối MongoDB, khởi chạy song song 2 service và tự mở trình duyệt. |

---

### 19.2. Thư Viện Backend & Máy Chủ Cốt Lõi (`examguard-core` — Node.js / Express 5)

Dưới đây là danh mục chi tiết các thư viện backend trong [examguard-core/package.json](file:///d:/K23CNT3-LucVanSon-2310900087/DATN/examguard-core/package.json):

| Tên Thư Viện (Package) | Phiên bản (Version) | Mục đích Kỹ thuật & Nghiệp vụ trong Hệ thống |
|:---|:---|:---|
| `express` | `^5.2.1` | **Web Framework cốt lõi**: Định tuyến RESTful API, quản lý middleware, xử lý request/response của toàn bộ hệ thống quản lý thi. |
| `mongoose` | `^9.3.0` | **Object Data Modeling (ODM)**: Định nghĩa Schema chặt chẽ cho MongoDB, quản lý model quan hệ, validation dữ liệu người dùng, ca thi, đề thi. |
| `socket.io` | `^4.8.4` | **Giao thức WebSocket Realtime Server**: Tạo room phòng thi ảo (`room_exam_{id}`), phát sóng cảnh báo gian lận, đồng bộ trạng thái thí sinh tức thì tới Giám thị. |
| `jsonwebtoken` | `^9.0.3` | **Xác thực Không trạng thái (Stateless Auth)**: Ký và kiểm tra JWT token, phân quyền theo vai trò (RBAC: Admin, Giảng viên, Sinh viên) và bối cảnh ca thi (CBAC). |
| `bcrypt` & `bcryptjs` | `^6.0.0` / `^3.0.3` | **Bảo mật Mật khẩu**: Băm mật khẩu người dùng với muối ngẫu nhiên (Salt-Hash 10 rounds), chống giải mã từ điển và rò rỉ cơ sở dữ liệu. |
| `multer` | `^2.1.1` | **Xử lý Tải tệp Đa phương tiện**: Tiếp nhận tệp đề thi (PDF, DOCX, XLSX), ảnh KYC sinh viên, và ảnh chụp bài làm tự luận từ Webcam/Thiết bị. |
| `pdf-parse` | `^2.4.5` | **Trích xuất Nội dung Tệp PDF**: Đọc nội dung văn bản từ các tệp đề thi PDF học thuật, phân tích bố cục phục vụ bóc tách câu hỏi tự động. |
| `mammoth` | `^1.13.0` | **Chuyển đổi Tài liệu Word (.docx)**: Trích xuất nội dung từ tệp Word sang HTML/Text chuẩn, bảo toàn cấu trúc in đậm, gạch chân và danh sách lựa chọn. |
| `xlsx` | `^0.18.5` | **Xử lý Bảng tính Excel**: Đọc danh sách sinh viên theo lớp từ file Excel, xuất bảng điểm tổng hợp ca thi và ma trận đáp án. |
| `helmet` | `^8.1.0` | **Bảo mật HTTP Headers**: Thiết lập các header an toàn (Content-Security-Policy, X-Frame-Options, X-XSS-Protection) chống tấn công web. |
| `express-rate-limit` | `^8.3.1` | **Giới hạn Tần suất Truy cập (Rate Limiting)**: Chặn tấn công từ chối dịch vụ (DDoS) và brute-force mật khẩu tại các endpoint nhạy cảm. |
| `express-mongo-sanitize`| `^2.2.0` | **Chống NoSQL Injection**: Làm sạch và loại bỏ các ký tự đặc biệt (`$`, `.`) trong body/query params gửi lên MongoDB. |
| `xss-clean` | `^0.1.4` | **Chống Tấn công XSS**: Làm sạch dữ liệu đầu vào của người dùng, loại bỏ mã script độc hại trong câu hỏi, bài làm tự luận. |
| `cors` | `^2.8.6` | **Kiểm soát Truy cập Nguồn gốc Chéo**: Cho phép kết nối an toàn giữa Frontend Web (Port 3011) và các microservice liên quan. |
| `cookie-parser` | `^1.4.7` | **Quản lý Cookie HTTP-Only**: Đọc và lưu trữ token phiên đăng nhập bảo mật trên trình duyệt, chống đánh cắp qua JavaScript. |
| `compression` | `^1.8.1` | **Nén Băng thông HTTP**: Tự động nén response bằng thuật toán Gzip, giảm độ trễ mạng khi truyền tải danh sách đề thi lớn. |
| `dotenv` | `^17.3.1` | **Quản lý Cấu hình Môi trường**: Nạp an toàn các biến môi trường cấu hình cổng, chuỗi kết nối cơ sở dữ liệu, secret key từ tệp `.env`. |
| `@google/genai` | `^1.29.0` | **Google Gemini AI SDK**: Tích hợp mô hình ngôn ngữ lớn hỗ trợ phân tích rubric tự luận, giải thích đáp án và đề xuất câu hỏi. |
| `axios` | `^1.13.6` | **HTTP Client Máy chủ**: Giao tiếp HTTP bất đồng bộ giữa Node.js Core Backend và Python Face AI Microservice (Port 8000). |
| `date-fns` | `^4.1.0` | **Xử lý Thời gian Học thuật**: Định dạng ngày thi, tính toán thời gian làm bài chính xác tới mili-giây, đếm ngược ca thi theo múi giờ chuẩn. |

---

### 19.3. Thư Viện Giao Diện Người Dùng & Trải Nghiệm Thí Sinh (`examguard-core` — React 19 / Vite 6)

| Tên Thư Viện (Package) | Phiên bản (Version) | Mục đích Kỹ thuật & Nghiệp vụ trong Giao diện |
|:---|:---|:---|
| `react` & `react-dom` | `^19.0.0` | **Thư viện UI thế hệ mới nhất**: Quản lý Virtual DOM, Server Actions, hooks hiện đại (`useActionState`, `useOptimistic`) cho giao diện mượt mà. |
| `vite` | `^6.2.0` | **Next-Generation Frontend Tooling**: Biên dịch TypeScript siêu tốc với esbuild, Hot Module Replacement (HMR) tức thì dưới 50ms. |
| `@vitejs/plugin-react` | `^5.0.4` | **Plugin Vite cho React**: Tối ưu hóa Fast Refresh và chuyển đổi mã JSX/TSX. |
| `typescript` | `~5.8.2` | **Ngôn ngữ Type-Safe**: Đảm bảo an toàn kiểu dữ liệu cho toàn bộ State, Props, DTO, tránh lỗi runtime trong phòng thi. |
| `tailwindcss` | `^4.1.14` | **CSS Framework tiện ích v4**: Hệ thống Design Token hiện đại (CSS Variables-first), tối ưu dung lượng CSS tải trang. |
| `@tailwindcss/vite` | `^4.1.14` | **Tích hợp Tailwind v4 vào Vite**: Xử lý compile CSS trực tiếp trong pipeline của Vite mà không cần file cấu hình phức tạp. |
| `react-router-dom` | `^7.13.1` | **Bộ điều hướng Single Page App**: Quản lý định tuyến động, bảo vệ đường dẫn theo Role (Role Guards), layout lồng nhau. |
| `zustand` | `^5.0.14` | **Quản lý Trạng thái Toàn cục (Global State)**: Siêu nhẹ, lưu trữ session đăng nhập (`authStore`), tiến trình làm bài (`examStore`), trạng thái giám sát (`proctorStore`). |
| `socket.io-client` | `^4.8.4` | **WebSocket Client**: Duy trì kết nối realtime 2 chiều liên tục giữa trình duyệt của Thí sinh / Giám thị với máy chủ thi. |
| `lucide-react` | `^0.546.0` | **Thư viện Icon Vector**: Bộ biểu tượng chuẩn cho giao diện thi cử, camera, trạng thái bảo mật, công cụ cắt ảnh (`Scissors`, `Camera`, `ShieldAlert`...). |
| `motion` (Framer Motion) | `^12.23.24` | **Animation & Micro-interactions**: Tạo hiệu ứng chuyển động mượt mà cho bảng điểm, modal cảnh báo, chuyển đổi thẻ câu hỏi. |
| `recharts` | `^3.7.0` | **Biểu đồ Trực quan hóa Dữ liệu**: Vẽ biểu đồ phổ điểm thi, tỷ lệ vi phạm theo thời gian, độ tin cậy của ca thi. |
| `react-hot-toast` | `^2.6.0` | **Thông báo Toast Thông minh**: Hiển thị thông báo tức thì (Cắt ảnh thành công, cảnh báo mất tiêu điểm, nhắc nhở thời gian). |
| `canvas-confetti` | `^1.9.4` | **Hiệu ứng Khen thưởng**: Bắn pháo hoa đồ họa Canvas khi thí sinh hoàn thành nộp bài thi thành công. |
| `@hello-pangea/dnd` | `^18.0.1` | **Kéo thả Trực quan (Drag & Drop)**: Hỗ trợ thao tác sắp xếp lại thứ tự câu hỏi, kéo thả sơ đồ bàn thi trong phòng thi. |
| `clsx` & `tailwind-merge`| `^2.1.1` / `^3.5.0` | **Tối ưu Hóa Class CSS**: Ghép nối class có điều kiện và loại bỏ class Tailwind trùng lặp một cách chuẩn xác. |
| **PDF.js CDN (Mozilla)** | `v3.11.174` | **Render Tài liệu PDF lên Canvas**: Nạp file PDF đề thi trực tiếp trên trình duyệt, cho phép giảng viên kéo rê chuột khoanh vùng cắt sơ đồ mạch điện tử. |

---

### 19.4. Thư Viện Trí Tuệ Nhân Tạo & Thị Giác Máy Tính (`examguard-ai` — Python FastAPI)

Dưới đây là danh mục chi tiết các thư viện trong [examguard-ai/requirements.txt](file:///d:/K23CNT3-LucVanSon-2310900087/DATN/examguard-ai/requirements.txt):

| Tên Thư Viện (Package) | Phiên bản (Version) | Mục đích Kỹ thuật & Nghiệp vụ AI |
|:---|:---|:---|
| `fastapi` | `>=0.110.0` | **High-performance AI Web Framework**: Xây dựng Microservice RESTful API bất đồng bộ (async/await), tự sinh tài liệu OpenAPI/Swagger. |
| `uvicorn` | `>=0.28.0` | **ASGI Web Server**: Máy chủ bất đồng bộ chuẩn ASGI chạy trên cổng `8000`, tối ưu hóa xử lý đồng thời nhiều luồng camera/frame ảnh. |
| `pydantic` | `>=2.6.0` | **Xác thực Dữ liệu AI**: Kiểm tra kiểu dữ liệu đầu vào của các vector khuôn mặt, tọa độ bounding box, thông số góc quay đầu 3D. |
| `python-multipart` | `>=0.0.9` | **Tiếp nhận Dữ liệu Đa phần (Multipart Form)**: Hỗ trợ upload ảnh chụp khuôn mặt KYC, ảnh frame camera giám sát từ client. |
| `numpy` | `>=1.24.0` | **Tính toán Ma trận & Đại số Tuyến tính**: Xử lý ma trận điểm mốc (landmarks), tính khoảng cách Cosine Distance so khớp vector 512-D, chuẩn hóa L2-norm. |
| `pillow` (PIL) | `>=10.0.0` | **Xử lý Ảnh Số**: Đọc, nén, chuyển đổi không gian màu RGB/BGR, resize ảnh khuôn mặt về chuẩn $112 \times 112$ px trước khi đưa vào mạng nơ-ron. |
| `opencv-python-headless` | `>=4.8.0` | **Thị giác Máy tính Toàn diện (OpenCV)**: Cắt cúp khuôn mặt (face crop), căn chỉnh 5 điểm mắt mũi miệng (face alignment), tính góc quay đầu 3D Pose (Pitch, Yaw, Roll). Phiên bản headless không phụ thuộc GUI X11, tối ưu cho môi trường server. |
| `onnxruntime` | `>=1.16.0` | **Bộ Thực thi Mô hình Học sâu (Deep Learning Inference Engine)**: Chạy các mô hình ONNX tối ưu hóa phần cứng (ArcFace 512-D, MiniFASNet, YOLOv8) với tốc độ mili-giây trên CPU/GPU. |
| `requests` | `>=2.31.0` | **HTTP Client**: Gửi webhook thông báo hoặc đồng bộ dữ liệu vi phạm sang các dịch vụ giám sát ngoại vi khi cần thiết. |
| `pymongo` | `>=4.6.0` | **Driver Kết nối MongoDB Chính thức**: Truy vấn và lưu trữ trực tiếp vector sinh trắc học gốc và lịch sử điểm danh vào cơ sở dữ liệu MongoDB. |
| `python-dotenv` | `>=1.0.0` | **Nạp Biến Môi trường**: Quản lý đường dẫn các mô hình ONNX, ngưỡng tương đồng khuôn mặt (`FACE_MATCH_THRESHOLD=0.75`), cấu hình cổng AI. |
| `pytest` | `>=8.0.0` | **Kiểm thử Tự động Hóa (Test Suite)**: Viết và chạy unit test cho các module trích xuất đặc trưng khuôn mặt và logic phát hiện giả mạo. |

---

### 19.5. Danh Mục Các Mô Hình Học Sâu ONNX Tích Hợp (Embedded Deep Learning Models)

Các mô hình được đóng gói dưới định dạng chuẩn công nghiệp **ONNX (Open Neural Network Exchange)** và nạp trực tiếp qua `onnxruntime`:

1. **ArcFace 512-D Embedding Model (`arcface_resnet50.onnx` / `mobileface_v2.onnx`):**
   - *Đầu vào:* Ảnh khuôn mặt đã được căn chỉnh (Aligned Face) kích thước $112 \times 112 \times 3$.
   - *Đầu ra:* Vector đặc trưng sinh trắc học 512 chiều được chuẩn hóa ($\|v\|_2 = 1$).
   - *Thuật toán so khớp:* Tính độ tương đồng Cosine Similarity:
     $$\text{Similarity} = \frac{v_1 \cdot v_2}{\|v_1\|_2 \|v_2\|_2}$$
   - *Ngưỡng định danh:* $\ge 0.75$ xác nhận cùng một người; $< 0.50$ kích hoạt cảnh báo tráo người (`IMPERSONATION_VIOLATION`).

2. **MiniFASNet Liveness & Anti-Spoofing Model (`minifasnet_v2.onnx`):**
   - *Chức năng:* Phát hiện các cuộc tấn công giả mạo (Presentation Attack Detection - PAD) bằng màn hình điện thoại, ảnh in giấy hoặc mặt nạ silicon.
   - *Đầu ra:* Xác suất Liveness Score $[0.0 \dots 1.0]$. Ngưỡng cho phép $\ge 0.85$.

3. **3D Head Pose & Facial Landmarks Estimation:**
   - *Chức năng:* Dự đoán hướng nhìn và tư thế đầu của thí sinh thông qua 68 điểm mốc khuôn mặt và thuật toán Perspective-n-Point (PnP).
   - *Ngưỡng phát hiện vi phạm:*
     - Quay đầu trái/phải quá lớn: $|\text{Yaw}| > 35^\circ$
     - Cúi đầu nhìn tài liệu dưới gầm bàn: $\text{Pitch} < -25^\circ$
     - Nghiêng đầu trao đổi: $|\text{Roll}| > 30^\circ$

4. **YOLOv8 Onnx Object Detection (`yolov8n.onnx`):**
   - *Chức năng:* Phát hiện sự xuất hiện của các vật thể bị cấm trong phòng thi (Điện thoại di động `cell phone`, Tai nghe `earphone`, Sách vở tài liệu `book`).

---

### 19.6. Ma Trận Phối Hợp Giữa Các Thư Viện Trong Các Luồng Nghiệp Vụ Cốt Lõi

```
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                       MA TRẬN TÍCH HỢP LIÊN THƯ VIỆN THEO NGHIỆP VỤ (EXAMGUARD AI)                             │
├──────────────────────────┬──────────────────────────────────────────┬──────────────────────────────────────────┤
│ Luồng Nghiệp Vụ          │ Thư viện / Module Phía Client (Frontend) │ Thư viện / Module Phía Server & AI       │
├──────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ **1. Đăng ký KYC 5 Góc** │ • React 19 + Lucide Icons + Motion       │ • Node.js Multer (Upload)                │
│                          │ • WebRTC Camera Canvas Stream            │ • FastAPI + OpenCV (Alignment)           │
│                          │ • React Hot Toast (Hướng dẫn xoay đầu)   │ • ONNX Runtime ArcFace 512-D + PyMongo   │
├──────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ **2. Soạn & Cắt Đề Thi** │ • PDF.js CDN (Render trang PDF lên Canvas)│ • Node.js Multer + pdf-parse             │
│                          │ • Lucide Scissors (Exam Snipping Tool)   │ • Mammoth (.docx to HTML AST)            │
│                          │ • Canvas Selection Bounding Box          │ • Mongoose ExamPaper Schema              │
├──────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ **3. Giám Sát Realtime** │ • Socket.IO Client (Phòng thi trực tiếp) │ • Node.js Socket.IO Server (Rooms)       │
│                          │ • Fullscreen API + Event Listeners       │ • FastAPI Head Pose 3D + MiniFASNet      │
│                          │ • Zero-Phone Webcam Paper Capture Canvas │ • Helmet + Rate-Limit + Mongoose Log     │
├──────────────────────────┼──────────────────────────────────────────┼──────────────────────────────────────────┤
│ **4. Chấm Thi & Báo Cáo**│ • Recharts (Vẽ biểu đồ phổ điểm, vi phạm)│ • Node.js Scoring Pipeline (Auto-score)  │
│                          │ • Canvas Confetti (Hiệu ứng hoàn thành)  │ • @google/genai (Gemini AI Rubric Assist)│
│                          │ • XLSX Export Button                     │ • xlsx (Tạo file Bảng điểm Excel .xlsx)  │
└──────────────────────────┴──────────────────────────────────────────┴──────────────────────────────────────────┘
```

---

*Blueprint version 2.6 — Cập nhật: 2026-10-18*  
*Bổ sung: Danh mục Toàn diện Nền tảng Hệ thống, Công nghệ & Thư viện (Tech Stack & Libraries Specification) đối chiếu 100% từ `package.json` và `requirements.txt`.*  
*Nguồn tham chiếu gốc: `SYSTEM_BLUEPRINT.md`, `run_system.bat`, `examguard-core/package.json`, `examguard-ai/requirements.txt`*



