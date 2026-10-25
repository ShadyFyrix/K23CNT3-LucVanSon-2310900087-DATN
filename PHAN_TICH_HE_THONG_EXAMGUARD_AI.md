# 📊 PHÂN TÍCH HỆ THỐNG — EXAMGUARD AI v3.3
### Báo cáo Khảo sát & Phân tích Nghiệp vụ Toàn diện
> **Vai trò người phân tích:** Chuyên gia Phân tích Hệ thống  
> **Nguồn tham chiếu:** `SYSTEM_BLUEPRINT.md` v3.3 + Khảo sát cấu trúc mã nguồn thực tế  
> **Ngày phân tích:** 25/10/2026

---

## I. TỔNG QUAN HỆ THỐNG

**ExamGuard AI** là hệ thống quản lý thi trực tuyến tích hợp xác thực khuôn mặt sinh trắc học tiên tiến, được thiết kế phục vụ quy mô **10.000 sinh viên** với khả năng **1.000–1.500 người dùng đồng thời (CCU)**.

### Triết lý cốt lõi: *"Biometric Ground-Truth Identity First"*

Hệ thống xây dựng toàn bộ nghiệp vụ khảo thí xoay quanh nguyên tắc: **khuôn mặt là căn cước sinh trắc học số gốc**, được dùng để xác thực danh tính tại mọi điểm tiếp xúc nghiệp vụ — từ xếp chỗ, check-in, đến giám sát liên tục trong suốt ca thi.

### Bốn hình thức thi & kiểm tra được hỗ trợ

| Mã | Hình thức | Đặc điểm bảo mật & trải nghiệm |
|---|---|---|
| `LAB_PC` | Thi máy phòng Lab | Trình duyệt khóa cứng + Webcam PC + Camera CCTV tập trung |
| `BYOD_LAPTOP` | Thi Laptop cá nhân | SEB + IP VLAN + Seat PIN 6 số + Webcam + Camera CCTV |
| `ONLINE_QUIZ` | Thi Trắc nghiệm Chuẩn | AI Face Tracking + Anti-tab switch + Đếm ngược câu hỏi + Auto-save |
| `QUIZ_ARENA` | Đấu trường Quiz Tương tác (Gamification) | Trắc nghiệm trực tiếp phong cách Kahoot + Socket.IO realtime + Bảng xếp hạng trực tiếp + Điểm tốc độ + Âm thanh sống động |

---

## II. CHỨC NĂNG CHÍNH CỦA HỆ THỐNG

### 2.1 Sơ đồ nhóm chức năng

```
ExamGuard AI
├── A. Quản trị tổ chức & người dùng
│   ├── Quản lý phân cấp: Khoa → Khóa → Lớp → Sinh viên / Giảng viên
│   ├── Import hàng loạt từ Excel
│   └── Khóa / mở khóa tài khoản
│
├── B. Định danh sinh trắc học KYC
│   ├── Thu thập 5 góc khuôn mặt (KYC Enrollment)
│   ├── Liveness Anti-Spoofing (MiniFASNet)
│   ├── Trích xuất & lưu trữ ArcFace 512-D Vector
│   └── Phê duyệt / Từ chối hồ sơ khuôn mặt
│
├── C. Ngân hàng đề thi & soạn đề
│   ├── Tạo đề thi đa dạng (MCQ, Essay, Coding, Fill-blank, Image, Audio)
│   ├── Import từ Word/PDF/Excel/JSON
│   ├── Drag-and-drop Authoring Studio (8 loại khối câu hỏi)
│   └── Phê duyệt & mã hóa đề thi vào ca thi
│
├── D. Khảo thí & chuẩn bị ca thi
│   ├── Thiết lập phòng thi 3D (hàng/cột, lối đi, bục giảng)
│   ├── Gắn & cấu hình camera CCTV (RTSP + vẽ ROI Polygon)
│   ├── Tạo ca thi & lập lịch biểu (Gantt Chart) — Độc quyền Admin
│   ├── Xếp chỗ ngẫu nhiên & cấp Số Báo Danh (SBD)
│   └── Phân công Giám thị / Thanh tra (yêu cầu KYC APPROVED)
│
├── E. Tiến hành ca thi (Realtime Proctoring)
│   ├── Check-in 1:1 (Camera ↔ Vector Gốc, similarity ≥ 0.75)
│   ├── Giám sát CCTV server-side (YOLOv8, Shapely ROI)
│   ├── Giám sát Webcam client-side (MediaPipe FaceLandmarker)
│   ├── Continuous Biometric Verification (mỗi 10–20s)
│   ├── Xử lý STAFF_EXEMPTION (nhận diện giám thị, 0 điểm phạt)
│   ├── Dashboard phòng 3D realtime (avatar, cone mắt, màu bàn)
│   └── Bộ điều khiển giám thị (Cảnh báo / Đình chỉ / Force check-in / Bù giờ)
│
├── F. Chấm thi & công bố điểm
│   ├── Tự động chấm MCQ ngay khi nộp bài
│   ├── Chấm tay Essay/Code (chế độ rọc phách ẩn danh)
│   ├── Rà soát bảng điểm 1 lần trước khi chốt
│   ├── Phê duyệt & công bố điểm chính thức
│   └── Sinh viên tra cứu điểm + đối chiếu đáp án / giải thích
│
├── G. Hậu kiểm, Audit & Phúc khảo
│   ├── Integrity Report (timeline vi phạm + video/ảnh bằng chứng)
│   ├── Gửi đơn phúc khảo (trong 7 ngày)
│   ├── Thẩm tra phúc khảo (đối soát log AI + Vector Gốc)
│   └── Xuất báo cáo Excel / PDF biên bản ca thi
│
└── H. Đấu trường Quiz Gamification & Live Leaderboard
    ├── Khởi tạo phòng Quiz nhanh (Instant PIN 6 số) — Giảng viên & Admin
    ├── Tùy biến luật chơi (Speed Bonus, Streak Bonus, Survival 3 tim)
    ├── Host Cockpit điều khiển (Push câu hỏi, Realtime Answer Distribution)
    ├── Real-time Player Arena (Giao diện 4 màu, tính điểm mili-giây, combo streak)
    ├── Âm thanh Web Audio API sống động (không phụ thuộc tải file audio)
    └── Bảng xếp hạng Top 10 trực tiếp & Bục vinh danh Podium Top 3
```

### 2.2 Các chức năng cốt lõi nổi bật

| Chức năng | Mô tả kỹ thuật |
|---|---|
| **KYC 5 góc** | Thu thập ảnh 5 tư thế đầu (Thẳng, Trái, Phải, Ngửa, Cúi), trích xuất ArcFace 512-D, hợp nhất có trọng số |
| **Check-in 1:1** | Cosine Similarity ≥ 0.75 + Liveness Score ≥ 0.90 mới cho vào phòng thi |
| **Continuous Verification** | AI kiểm tra ngầm mỗi 20s, phát hiện tráo người (similarity < 0.70 trong 15s → IMPERSONATION_DETECTED, −50 điểm, đình chỉ) |
| **STAFF_EXEMPTION** | Khi phát hiện ≥ 2 khuôn mặt, AI so khớp với Staff Whitelist; nếu trùng Giám thị → 0 điểm phạt |
| **Hệ điểm uy tín** | Thang 0–100, 12 loại vi phạm từ LOW (−3đ) đến CRITICAL (−50đ) |
| **Dashboard 3D** | Isometric room view, avatar xoay theo góc Yaw/Pitch thực tế, màu bàn theo trạng thái |
| **Anti-Cheat Browser** | Chặn Tab Switch, DevTools F12, Copy/Paste, Right-click, màn hình phụ |
| **SEB Lockdown** | Safe Exam Browser với header X-SEB-Key và giới hạn IP subnet VLAN |
| **Quiz Gamification** | Chế độ đấu trường trực tiếp nhiều người chơi: tính điểm phản xạ (Speed bonus), chuỗi đúng (Streak bonus), hiệu ứng âm thanh Web Audio API, bảng xếp hạng Top 10 realtime và Podium Top 3 |

### 2.3 Chế độ Đấu trường Quiz Tương tác (Gamified Quiz Arena)

Nhằm nâng cao tính trải nghiệm, kích thích hứng thú và tạo môi trường cạnh tranh lành mạnh trong các giờ ôn tập, kiểm tra nhanh trên lớp hoặc các cuộc thi học thuật, hệ thống tích hợp **Đấu trường Quiz Gamification** với kiến trúc phòng đấu độc lập:

1. **Khởi tạo phòng nhanh bằng PIN 6 số:**
   - Giảng viên chỉ cần chọn một đề trắc nghiệm có sẵn và nhấn *"Tạo Đấu Trường Quiz"*.
   - Hệ thống tự động sinh một mã PIN 6 số ngẫu nhiên duy nhất (ví dụ: `824915`), sinh viên chỉ cần truy cập `/quiz-arena/player` và nhập PIN để tham gia mà không cần cấu hình phòng thi phức tạp.
2. **Bộ luật chơi tùy biến (Custom Game Rules):**
   - **Thời gian mỗi câu (Seconds Per Question):** 10 – 60 giây.
   - **Hệ số tốc độ (Speed Bonus Multiplier):** 0.1x – 2.0x (trả lời càng nhanh trong tích tắc, điểm nhận được càng cao).
   - **Điểm chuỗi liên hoàn (Streak Bonus):** Cộng thêm từ 10 – 100 điểm thưởng cho mỗi câu trả lời đúng liên tiếp, tạo động lực duy trì phong độ.
   - **Chế độ sinh tồn (Survival 3 Tim):** Mỗi người chơi khởi đầu với 3 mạng sống; trả lời sai 1 câu bị trừ 1 mạng, hết 3 mạng sẽ bị loại trực tiếp (Game Over) khỏi các câu tiếp theo.
   - **Tùy chọn hiển thị đáp án tức thì & Live Leaderboard:** Bật/tắt cho phép người chơi xem ngay giải thích sau mỗi câu hoặc ẩn giấu đến phút chót.
3. **Công thức tính điểm phản xạ & chuỗi liên hoàn:**
   $$\text{Score} = \text{BaseScore} \times \left(1 + \frac{T_{\text{remaining\_ms}}}{T_{\text{total\_ms}}} \times \text{SpeedMultiplier}\right) + (\text{CurrentStreak} \times \text{StreakBonus})$$
4. **Host Cockpit (Giao diện Giảng viên):**
   - Quản lý sảnh chờ (Lobby) trực tiếp, theo dõi danh sách sinh viên kết nối.
   - Điều khiển phát từng câu hỏi (`Push Question`), khóa nhận bài khi hết giờ.
   - Xem biểu đồ cột trực tiếp (Real-time Answer Bar Distribution) thể hiện số lượng người chọn đáp án A, B, C, D ngay trong lúc trận đấu diễn ra.
   - Hiển thị Bảng xếp hạng Top 10 sau mỗi câu hỏi và kích hoạt Bục vinh danh Podium Top 3 (Vàng, Bạc, Đồng) khi kết thúc trận đấu.
5. **Player Arena (Giao diện Sinh viên):**
   - Thiết kế 4 khối màu sắc lớn trực quan phong cách Kahoot (Đỏ, Xanh lam, Vàng, Xanh lục).
   - Hiệu ứng âm thanh sinh động bằng **Web Audio API** tổng hợp trực tiếp từ trình duyệt (tiếng đếm nhịp tích tắc, tiếng ting khi đúng, âm còi khi sai, fan-fare vinh danh), hoàn toàn không phụ thuộc tải file mp3 cồng kềnh.

---

## III. YÊU CẦU PHI CHỨC NĂNG

### 3.1 Hiệu năng (Performance)

| Yêu cầu | Chỉ số thiết kế |
|---|---|
| Quy mô người dùng | 10.000 sinh viên |
| Đồng thời (CCU) | 1.000 – 1.500 |
| Thời gian check-in (AI response) | < 2s (qua FastAPI 8000) |
| Chu kỳ giám sát liên tục | 10 – 20 giây/lần |
| Auto-save bài làm | Mỗi 10 giây |
| CCTV xử lý | 5 FPS (FastAPI Background Worker) |
| Webcam client | 30 FPS (Web Worker, không block UI) |
| Quiz Arena Socket Latency | < 100ms (đồng bộ phát câu hỏi, nhận đáp án & cập nhật điểm) |
| Web Audio API Latency | 0ms (tổng hợp trực tiếp sóng âm tại client, không delay tải audio) |

### 3.2 Bảo mật (Security) — Zero-Trust Model

| Quy tắc | Mô tả |
|---|---|
| **RULE-SEC-01** | Giảng viên soạn đề môn X bị **tự động loại** khỏi danh sách coi thi môn X |
| **RULE-SEC-02** | Rọc phách điện tử khi chấm Essay/Code: ẩn hoàn toàn danh tính SV, dùng Anonymous Hash |
| **RULE-SEC-03** | Khóa quyền giám thị ngoài khung giờ `[T_start − 15p, T_end + 15p]` |
| **RULE-SEC-04** | Nhật ký vi phạm AI **bất biến** (Immutable), chỉ đánh cờ `is_dismissed` khi bác bỏ |
| **RULE-SEC-05** | Không một SV nào được vào phòng thi nếu `face_status ≠ APPROVED` |
| **RULE-SEC-06** | **Phân quyền tạo phòng nghiêm ngặt:** Chỉ Admin có quyền tạo Ca thi chính thức (`MIDTERM`, `FINAL`) & cấu hình phòng thi 3D vật lý; Giảng viên được cấp quyền tạo phòng Đấu trường Quiz nhanh (`QUIZ`) để ôn tập |

### 3.3 Độ tin cậy & Khả dụng (Reliability & Availability)

- **Polyglot Persistence:** MySQL cho dữ liệu quan hệ cốt lõi; MongoDB cho đề thi động, log vi phạm, bài làm realtime — tối ưu theo đặc tính dữ liệu
- **Cô lập đa phòng thi & Đấu trường:** Mỗi phòng thi có Socket.IO Room riêng `exam_{ca_thi_id}`; mỗi đấu trường Quiz có Socket.IO Room riêng `arena_{pinCode}`, tự giải phóng bộ nhớ khi kết thúc
- **Fault-tolerance check-in:** Thử lại tối đa 3 lần; Giám thị có quyền Force Check-in kèm Audit Log

### 3.4 Khả năng mở rộng (Scalability)

- Kiến trúc Microservices phân tầng (examguard-core + examguard-ai + examguard-flask)
- FastAPI chạy async/multiprocessing, xử lý N luồng RTSP camera song song
- Redis Pub/Sub làm message bus giữa FastAPI AI Engine và Socket.IO Server
- Socket.IO Room Gateway tải nhẹ, cho phép hàng trăm thí sinh gửi answer cùng mili-giây mà không nghẽn database nhờ in-memory scoring buffer trước khi persist

### 3.5 Khả năng kiểm tra (Auditability)

- Mọi hành động giám thị có Audit Log (ID người thực hiện, lý do, timestamp)
- Integrity Report gộp từ MySQL (dữ liệu ca thi) + MongoDB (log vi phạm AI) sau mỗi ca thi
- Lịch sử thay đổi Face KYC lưu trong bảng `face_enrollment_history`

---

## IV. CÁC TÁC NHÂN THAM GIA HỆ THỐNG (ACTORS)

### 4.1 Bảng Actor & Phạm vi vai trò (RBAC + CBAC)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                      ACTOR MAP — EXAMGUARD AI SYSTEM                         │
├─────────────────┬──────────────┬───────────────────────────────────────────┤
│ Actor           │ DB Role      │ Ngữ cảnh & Trách nhiệm chính              │
├─────────────────┼──────────────┼───────────────────────────────────────────┤
│ Admin / Khảo thí│ admin        │ Toàn hệ thống: Cấu hình AI, quản lý cơ   │
│                 │              │ cấu tổ chức, tạo ca thi chính thức,       │
│                 │              │ phê duyệt KYC, giám sát toàn diện,        │
│                 │              │ công bố điểm, quản lý phòng Quiz          │
├─────────────────┼──────────────┼───────────────────────────────────────────┤
│ Giảng viên      │ teacher      │ 5 ngữ cảnh theo phân công:               │
│                 │ (multi-role) │  • GV Bộ môn: Soạn đề, chấm thi tự luận │
│                 │              │  • Cán bộ Coi thi (Proctor): Giám sát PT │
│                 │              │  • Cán bộ Thanh tra (Inspector): Hậu kiểm│
│                 │              │  • Cố vấn học tập: Theo dõi lớp phụ trách│
│                 │              │  • Host Đấu trường Quiz: Tạo phòng Quiz  │
│                 │              │    nhanh, tùy biến luật, điều khiển live │
├─────────────────┼──────────────┼───────────────────────────────────────────┤
│ Sinh viên       │ student      │ Cá nhân: KYC khuôn mặt, xem lịch thi,   │
│                 │              │ check-in, làm bài, xem điểm uy tín,      │
│                 │              │ nộp bài, phúc khảo; Tham gia Đấu trường  │
│                 │              │ Quiz bằng mã PIN 6 số                    │
├─────────────────┼──────────────┼───────────────────────────────────────────┤
│ AI Service      │ —            │ Background Engine (FastAPI 8000):        │
│                 │              │ Phân tích stream camera, so sánh Vector  │
│                 │              │ Gốc, nhận diện CBTC, tính điểm uy tín   │
├─────────────────┼──────────────┼───────────────────────────────────────────┤
│ SEB Agent       │ —            │ Client Lockdown (Desktop App):           │
│                 │              │ Khóa laptop thí sinh BYOD, chặn phím tắt │
│                 │              │ gian lận, phát hiện máy ảo               │
└─────────────────┴──────────────┴───────────────────────────────────────────┘
```

### 4.2 Ma trận phân quyền tóm tắt

> **Nguyên tắc phân quyền cốt lõi:**
> - **Phòng thi chính thức:** Độc quyền của **Admin**. Giảng viên **KHÔNG ĐƯỢC PHÉP** tự tạo Ca thi chính thức hoặc cấu hình Phòng thi vật lý nhằm đảm bảo tính bảo mật và trung thực khảo thí.
> - **Đấu trường Quiz:** Cả **Giảng viên** và **Admin** đều có quyền tạo phòng nhanh bằng mã PIN để tổ chức học tập tương tác, kiểm tra nhanh hoặc sinh hoạt học thuật.

| Nhóm nghiệp vụ | Admin | Giảng viên | Sinh viên |
|---|:---:|:---:|:---:|
| Quản trị tổ chức (Khoa/Lớp) | ✅ | ❌ | ❌ |
| Đăng ký Face ID KYC | ❌ | ✅ (chính mình) | ✅ (chính mình) |
| Quản lý Ngân hàng đề thi | ✅ | ✅ (môn phụ trách) | ❌ |
| Phê duyệt đề thi | ✅ | ❌ | ❌ |
| **Tạo ca thi chính thức (`MIDTERM`/`FINAL`)** | **✅ (Độc quyền)** | **❌ (Cấm)** | ❌ |
| Cấu hình Phòng thi 3D & Camera CCTV | ✅ | ❌ | ❌ |
| Xếp chỗ & cấp SBD chính thức | ✅ | ❌ | ❌ |
| Phân công Giám thị ca thi | ✅ | ❌ | ❌ |
| **Tạo phòng Đấu trường Quiz nhanh (`QUIZ`)** | **✅** | **✅** | **❌** |
| **Làm Host điều khiển Đấu trường Quiz** | **✅** | **✅** | **❌** |
| Check-in phòng thi chính thức | ❌ | ❌ | ✅ |
| **Tham gia Đấu trường Quiz (nhập PIN 6 số)** | ❌ | ❌ | **✅** |
| Force check-in (override) | ✅ | ✅ (phòng được gán) | ❌ |
| Giám sát Dashboard 3D | ✅ (tất cả) | ✅ (phòng được gán) | ❌ |
| Cảnh báo / Đình chỉ SV trong ca thi | ✅ | ✅ (phòng được gán) | ❌ |
| Làm bài thi chính thức | ❌ | ❌ | ✅ |
| Chấm thi Tự luận/Code | ❌ | ✅ (GV được phân công) | ❌ |
| Công bố điểm chính thức | ✅ | ❌ | ❌ |
| Xem kết quả + đáp án | ❌ | ❌ | ✅ (sau công bố) |
| Gửi phúc khảo | ❌ | ❌ | ✅ (trong 7 ngày) |

---

## V. QUY TRÌNH NGHIỆP VỤ (BUSINESS WORKFLOWS)

### WF-01: Khởi tạo Ca thi

```
[Admin]
  │
  ▼ Bước 1: Khai báo Phòng thi
  │  Input: campus_id, ma_phong, so_day × so_cot
  │  Output: phong_thi.id + layoutConfig 3D
  │
  ▼ Bước 2: Gắn Camera CCTV
  │  Input: phong_thi_id, rtsp_url, vi_tri_lap_dat
  │  Output: camera_phong_thi.id
  │
  ▼ Bước 3: Vẽ ROI Polygon
  │  Input: camera_id, roi_polygons_json (tọa độ pixel)
  │  Output: Mỗi bàn thi được ánh xạ vào vùng camera
  │
  ▼ Bước 4: Tạo Ca thi
  │  Input: mon_hoc, hinh_thuc_thi, de_thi_mongo_id, gio_bat_dau
  │  Output: ca_thi (trang_thai = UPCOMING)
  │
  ▼ Bước 5: Import SV + Xếp chỗ
     Process: Shuffle ngẫu nhiên → Gán SBD → Gán tọa độ bàn R-C → Sinh seat_pin
     Ràng buộc: Chỉ SV có face_status = APPROVED mới được xếp chỗ
     Output: N bản ghi sinh_vien_ca_thi (trang_thai = not_checkin, diem_uy_tin = 100)
```

### WF-02: Đăng ký KYC Khuôn mặt Gốc

```
[Sinh viên / Giảng viên]
  │
  ▼ Bước 1: Truy cập Studio KYC (/face-kyc)
  │
  ▼ Bước 2: Thu thập 5 góc khuôn mặt
  │  Góc 1: STRAIGHT  (Yaw ∈ [-5°, 5°])
  │  Góc 2: TURN_LEFT  (Yaw ∈ [25°, 35°])
  │  Góc 3: TURN_RIGHT (Yaw ∈ [-35°, -25°])
  │  Góc 4: LOOK_UP   (Pitch ∈ [15°, 25°])
  │  Góc 5: LOOK_DOWN  (Pitch ∈ [-25°, -15°])
  │
  ▼ Bước 3: Kiểm định chất lượng & Anti-Spoofing
  │  MiniFASNet Liveness: Score ≥ 0.90
  │  Laplacian Variance ≥ 100, Mean Intensity ∈ [80, 200]
  │
  ▼ Bước 4: Trích xuất & hợp nhất Vector
  │  Vector_GT = Normalize(0.4×V_straight + 0.15×(V_left + V_right + V_up + V_down))
  │  Lưu face_embedding (512 float32) + face_image_url
  │
  ▼ Bước 5: Kích hoạt quyền hạn
     SV: face_status = APPROVED → Mở quyền xếp chỗ + check-in
     GV: face_status = APPROVED → Mở quyền Giám thị + nạp Staff Whitelist
```

### WF-03: Check-in Phòng thi & Giám sát Liên tục

```
[Sinh viên]
  │
  ▼ Check-in 1:1 (khi vào phòng)
  │  POST /v1/checkin/verify {image_base64, sinh_vien_ca_thi_id}
  │  AI: Liveness check → Cosine Similarity với Vector Gốc
  │  Ngưỡng đạt: similarity ≥ 0.75 + Liveness ≥ 0.90
  │  Thành công: trang_thai = 'checkin', bàn bật XANH
  │  Thất bại (3 lần): Báo CHECKIN_FAILED → Giám thị Force check-in
  │
  ▼ Continuous Biometric Verification (trong ca thi, mỗi 20s)
     ┌─────────────────────────────────────────────────────┐
     │ Frame webcam → YuNet Detector                       │
     │   ├── 1 mặt → ArcFace Extract → So với Vector Gốc  │
     │   │     ├── ≥ 0.75 → HỢP LỆ (0 điểm trừ)          │
     │   │     └── < 0.70 × 3 chu kỳ → IMPERSONATION       │
     │   │              → −50 điểm, Đình chỉ, Báo đỏ       │
     │   └── ≥ 2 mặt → So với Staff Whitelist              │
     │         ├── Khớp Giám thị → STAFF_EXEMPTION (0đ)   │
     │         └── Không khớp → MULTI_FACE_UNKNOWN (−15đ) │
     └─────────────────────────────────────────────────────┘
```

### WF-04: Giám sát AI Thời gian thực (Trong Ca thi)

```
              ┌──────────────────────────────────────┐
              │    2 NHÁNH GIÁM SÁT SONG SONG        │
              └──────────────────────────────────────┘
                          │
          ┌───────────────┴──────────────────┐
          ▼                                  ▼
  NHÁNH A: Webcam Client-side          NHÁNH B: CCTV Server-side
  [Web Worker, 30 FPS]                 [FastAPI Background, 5 FPS]
  MediaPipe FaceLandmarker             OpenCV RTSP + YOLOv8n-pose
          │                                  │
          │  Phát hiện:                       │  Phát hiện:
          │  • Yaw > ±35° → HEAD_TURN        │  • Xoay vai → SHOULDER_TURN
          │  • Pitch > ±30° → GAZE_OFF       │  • Cúi gằm → HEAD_DOWN
          │  • 0 mặt → NO_FACE               │  • Ra khỏi ROI → LEAVE_SEAT
          │  • Tab ẩn → TAB_SWITCH           │  • Cổ tay thấp → PHONE_UNDER_DESK
          │                                  │
          └───────────────┬──────────────────┘
                          ▼
              POST /v1/proctor/report-violation
                          │
                          ├─► Ghi MongoDB (ai_proctoring_logs)
                          ├─► Trừ diem_uy_tin trong MySQL
                          ├─► Kiểm tra ngưỡng (<50→suspicious, =0→suspended)
                          └─► Publish Redis → Socket.IO Broadcast
                                  ├─► Giám thị: Bàn đỏ, feed cảnh báo
                                  └─► Sinh viên: Popup cảnh báo + điểm uy tín
```

### WF-05: Thu bài & Báo cáo Toàn vẹn

```
[Hết giờ hoặc SV nộp sớm]
  │
  ▼ Trigger: System (scheduler) hoặc SV click "Nộp bài"
  │
  ├── Khóa giao diện thi → Chốt submission cuối trong MongoDB
  ├── Tự động chấm MCQ (đối chiếu đáp án de_thi)
  ├── UPDATE trang_thai = 'checkout', diem_thi = score
  │
  ▼ Integrity Report (sau khi tất cả checkout):
     MySQL: Thông tin SV, bàn, checkin/checkout time, diem_thi, diem_uy_tin, similarity_score
     MongoDB: Timeline vi phạm, ảnh bằng chứng, telemetry 3D
     Output: Timeline feed có thể click từng mốc thời gian xem ảnh
```

### WF-06: Chấm thi & Công bố điểm

```
[Giảng viên được phân công chấm]
  │
  ├── Trắc nghiệm MCQ → Hệ thống tự động chấm (ngay khi nộp bài)
  │
  ├── Tự luận / Code → Chấm có người (Rọc phách)
  │     • Ẩn hoàn toàn: Họ tên, MSSV, Lớp, Ảnh đại diện
  │     • Hiển thị: "Mã phách #7A3F..." (Anonymous Hash)
  │     • GV nhập điểm → Trưởng bộ môn phê duyệt → Ghép phách
  │
  ├── Rà soát bảng điểm 1 lần (kiểm tra thống kê, phân tích đề)
  │
  └── Admin công bố điểm chính thức
        → SV được xem kết quả + đối chiếu đáp án + lời giải thích
        → SV có 7 ngày gửi đơn phúc khảo
```

### WF-07: Tổ chức & Điều khiển Đấu trường Quiz Gamification (Live Quiz Arena)

```
[Giảng viên (Host)]                                  [Sinh viên (Player)]
       │                                                      │
       ▼ Bước 1: Khởi tạo phòng Quiz                          │
       │  POST /api/quiz-arena/create-room                    │
       │  Input: examSessionId (QUIZ) + Custom Rules          │
       │  Output: pinCode 6 số (vd: 824915)                   │
       │                                                      ▼ Bước 2: Tham gia phòng
       │  Socket.IO: 'host:create_room'                       │  Nhập PIN 6 số (/quiz-arena/player)
       │  Tạo Room: `arena_{pinCode}`                         │  Socket.IO: 'player:join'
       │                                                      │  Gia nhập Room `arena_{pinCode}`
       ▼ Bước 3: Sảnh chờ trực tiếp (Lobby)                   │
       │  Host quan sát số lượng SV join qua live counter ◄───┼── Nhận 'player:joined' event
       │                                                      │
       ▼ Bước 4: Phát câu hỏi (Start / Push Next)             │
       │  Host bấm "Bắt đầu" / "Câu tiếp theo"                │
       │  Socket.IO Broadcast: 'arena:new_question' ─────────►│  Hiển thị câu hỏi + 4 khối màu
       │  Kèm: questionIndex, text, options, timeLimit        │  Bắt đầu đếm ngược đồng bộ (Timer)
       │                                                      │  Web Audio: tiếng nhịp tích tắc
       │                                                      │
       │                                                      ▼ Bước 5: Trả lời thời gian thực
       │                                                      │  Click chọn 1 trong 4 màu
       │                                                      │  Socket.IO: 'player:submit_answer'
       ▼ Bước 6: Phân phối đáp án Realtime                    │  {selectedIndex, responseTimeMs}
       │  Live Bar Chart: Cập nhật tỷ lệ A, B, C, D ◄─────────┤
       │                                                      │
       ▼ Bước 7: Hết giờ & Khóa câu trả lời                   │
       │  Socket.IO Broadcast: 'arena:question_ended' ────────►│  Khóa chọn đáp án
       │  Kèm: correctIndex, explanation                      │  Tính Speed Bonus + Streak Bonus
       │                                                      │  Survival: trừ 1 tim nếu sai
       │                                                      │  Web Audio: ting (đúng) / buzz (sai)
       ▼ Bước 8: Bảng xếp hạng Live & Podium                  │
       │  Host xem Top 10 người dẫn đầu                       │  SV xem thứ hạng & điểm cá nhân
       │  Lặp lại Bước 4 đến hết bộ câu hỏi                   │
       │  Kết thúc: Broadcast 'arena:game_over' ──────────────►│  Bục vinh danh Podium Top 3
       │                                                      │  (Huy chương Vàng, Bạc, Đồng)
```

---

## VI. BIỂU ĐỒ USE CASE TỔNG QUÁT

```
╔══════════════════════════════════════════════════════════════════════════╗
║              EXAMGUARD AI — USE CASE DIAGRAM TỔNG QUÁT                 ║
╚══════════════════════════════════════════════════════════════════════════╝

 ┌────────────┐    ┌─────────────────────────────────────────────────────────────────────────────────┐
 │            │    │                                                                                 │
 │   ADMIN /  │───▶│ UC-A01: Quản lý cơ cấu tổ chức (Khoa / Khóa / Lớp)                            │
 │  KHẢO THÍ  │───▶│ UC-A02: Import danh sách Sinh viên / Giảng viên từ Excel                       │
 │            │───▶│ UC-A03: Thiết lập phòng thi 3D + Gắn Camera + Vẽ ROI Polygon                   │
 │            │───▶│ UC-A04: Tạo Ca thi chính thức & Lập lịch biểu (Gantt) — Độc quyền             │
 │            │───▶│ UC-A05: Xếp chỗ SV & Cấp Số Báo Danh (SBD)                                    │
 │            │───▶│ UC-A06: Phân công Giám thị / Thanh tra                                         │
 │            │───▶│ UC-A07: Phê duyệt & mã hóa Đề thi vào Ca thi                                   │
 │            │───▶│ UC-A08: Kích hoạt / Đóng Ca thi                                                 │
 │            │───▶│ UC-A09: Phê duyệt / Từ chối KYC ngoại lệ                                       │
 │            │───▶│ UC-A10: Công bố Điểm chính thức                                                 │
 │            │───▶│ UC-A11: Xem Audit Log & Integrity Report toàn hệ thống                          │
 │            │───▶│ UC-A12: Giám sát & Quản trị các phòng Đấu trường Quiz                           │
 └────────────┘    └─────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────┐    ┌─────────────────────────────────────────────────────────────────────────────────┐
 │            │    │                                                                                 │
 │ GIẢNG VIÊN │───▶│ UC-T01: Đăng ký KYC Khuôn mặt 5 góc (Bắt buộc)                                │
 │            │───▶│ UC-T02: Soạn & quản lý Ngân hàng câu hỏi (MCQ/Essay/Code)                      │
 │            │───▶│ UC-T03: Import đề thi từ Word/PDF/Excel/JSON                                    │
 │  [5 ngữ    │───▶│ UC-T04: Quản lý danh sách Thí sinh & SBD trong Ca thi                          │
 │   cảnh]    │───▶│ UC-T05: (Coi thi) Vào Dashboard Phòng thi 3D Realtime                          │
 │            │───▶│ UC-T06: (Coi thi) Nhận & Phản hồi Cảnh báo vi phạm AI                         │
 │            │───▶│ UC-T07: (Coi thi) Cảnh báo / Đình chỉ / Bù giờ cho SV                         │
 │            │───▶│ UC-T08: (Coi thi) Force check-in thủ công (khi SV hỏng cam)                    │
 │            │───▶│ UC-T09: (Coi thi) Đóng Ca thi bằng Face Biometric Auth                        │
 │            │───▶│ UC-T10: (Thanh tra) Giám sát ngẫu nhiên nhiều phòng đồng thời                  │
 │            │───▶│ UC-T11: Chấm bài Tự luận / Code (chế độ Rọc phách ẩn danh)                    │
 │            │───▶│ UC-T12: Rà soát & Phê duyệt bảng điểm                                          │
 │            │───▶│ UC-T13: Xem Integrity Report ca mình coi                                        │
 │            │───▶│ UC-T14: (Cố vấn) Theo dõi tiến độ KYC & lịch thi lớp phụ trách                │
 │            │───▶│ UC-T15: Khởi tạo phòng Đấu trường Quiz nhanh bằng PIN 6 số                     │
 │            │───▶│ UC-T16: Tùy biến Luật chơi Quiz (Timer, Speed Bonus, Streak, Survival 3 Tim)  │
 │            │───▶│ UC-T17: Host điều khiển trận đấu (Push câu hỏi, Realtime Bar, Podium Top 3)    │
 └────────────┘    └─────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────┐    ┌─────────────────────────────────────────────────────────────────────────────────┐
 │            │    │                                                                                 │
 │  SINH VIÊN │───▶│ UC-S01: Đăng ký KYC Khuôn mặt 5 góc (Điều kiện tiên quyết BẮT BUỘC)           │
 │            │───▶│ UC-S02: Xem lịch thi cá nhân, SBD, vị trí bàn                                  │
 │            │───▶│ UC-S03: Check-in phòng thi 1:1 (Camera ↔ Vector Gốc)                           │
 │            │───▶│ UC-S04: Làm bài thi chính thức (MCQ / Essay / Code / Quiz)                      │
 │            │───▶│ UC-S05: Xem điểm uy tín (Trust Score) realtime                                  │
 │            │───▶│ UC-S06: Gửi tín hiệu SOS kỹ thuật khẩn cấp                                     │
 │            │───▶│ UC-S07: Nộp bài thi                                                             │
 │            │───▶│ UC-S08: Xem kết quả thi + đối chiếu Đáp án / Giải thích (sau công bố)          │
 │            │───▶│ UC-S09: Gửi đơn Phúc khảo (trong 7 ngày)                                       │
 │            │───▶│ UC-S10: Tham gia Đấu trường Quiz bằng mã PIN 6 số                             │
 │            │───▶│ UC-S11: Trả lời câu hỏi Quiz thời gian thực (Speed Bonus & Chuỗi Streak)       │
 │            │───▶│ UC-S12: Theo dõi Bảng xếp hạng trực tiếp & Bục vinh danh Podium Top 3         │
 └────────────┘    └─────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────┐    ┌─────────────────────────────────────────────────────────────────────────────────┐
 │            │    │                                                                                 │
 │ AI SERVICE │───▶│ UC-AI01: Trích xuất ArcFace 512-D Vector từ ảnh KYC 5 góc                      │
 │ (FastAPI)  │───▶│ UC-AI02: Liveness Anti-Spoofing Detection (MiniFASNet)                          │
 │            │───▶│ UC-AI03: Check-in 1:1 Biometric Verification                                   │
 │            │───▶│ UC-AI04: Continuous Biometric Verification (mỗi 20s trong ca thi)              │
 │            │───▶│ UC-AI05: Staff Whitelist Matching → STAFF_EXEMPTION                             │
 │            │───▶│ UC-AI06: CCTV YOLOv8 Pose Analysis + ROI Shapely Mapping                       │
 │            │───▶│ UC-AI07: Tính điểm uy tín & kích hoạt ngưỡng tự động (suspicious/suspended)   │
 └────────────┘    └─────────────────────────────────────────────────────────────────────────────────┘

 ┌────────────┐    ┌─────────────────────────────────────────────────────────────────────────────────┐
 │ SEB AGENT  │───▶│ UC-SEB01: Khóa môi trường Desktop BYOD (chặn phím tắt, màn hình phụ, VM)       │
 │ (Desktop)  │───▶│ UC-SEB02: Xác thực header X-SEB-Key + kiểm tra IP subnet VLAN                  │
 └────────────┘    └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## VII. KIẾN TRÚC KỸ THUẬT

### 7.1 Stack công nghệ

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TECH STACK — EXAMGUARD AI                                │
├─────────────────────┬───────────────────────────────────────────────────────┤
│ Lớp                 │ Công nghệ                                              │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Frontend            │ React 19 + TypeScript + Vite 6 + TailwindCSS v4        │
│ State Management    │ Zustand (authStore, examStore, proctorStore)            │
│ Realtime Client     │ Socket.IO Client                                        │
│ Audio Engine        │ Web Audio API (Synthesizer âm thanh động trực tiếp)    │
│ Quiz Modules        │ QuizArenaHost (Host Cockpit) + QuizArenaPlayer (Arena)  │
│ AI Client-side      │ MediaPipe FaceLandmarker (Web Worker, 30 FPS)          │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Backend Gateway     │ Node.js + Express 5 (Port 3011)                        │
│ Realtime Server     │ Socket.IO Server + Redis Pub/Sub                       │
│ Quiz Arena Service  │ quizArenaSocket.service.js + quizArena.controller.js   │
│ ORM / DB Client     │ Mongoose (MongoDB) + mysql2 (MySQL)                    │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Legacy Service      │ Python Flask (Port 5000) — Registry/Governance Service │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ AI Microservice     │ Python FastAPI + Uvicorn (Port 8000)                   │
│ Face Detection      │ YuNet (ONNX Runtime)                                   │
│ Face Recognition    │ ArcFace 512-D (ONNX Runtime)                          │
│ Anti-Spoofing       │ MiniFASNet (Silent-Face-Anti-Spoofing)                 │
│ Pose Estimation     │ YOLOv8n-pose (17 keypoints)                            │
│ ROI Mapping         │ Shapely (geometry library)                             │
│ CCTV               │ OpenCV + RTSP                                           │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Database Quan hệ    │ MySQL 8.0 (Port 3306) — examguard_db                   │
│ Database Tài liệu   │ MongoDB 7.0 (Port 27017) — examguard_ai_db             │
│ Message Broker      │ Redis (Pub/Sub cho Socket.IO broadcast)                │
├─────────────────────┼───────────────────────────────────────────────────────┤
│ Security            │ JWT Auth, bcrypt, HMAC, SEB Lockdown, IP VLAN          │
│ Storage             │ S3 / Local Vault (ảnh KYC, bằng chứng vi phạm)        │
└─────────────────────┴───────────────────────────────────────────────────────┘
```

### 7.2 Sơ đồ microservices & giao tiếp

```
[Browser Client]
      │  HTTP/WS
      ▼
[examguard-core :3011]  ←──── JWT Auth / RBAC ────
      │    │
      │    └── Socket.IO Server ──► Redis Pub/Sub ◄── [examguard-ai :8000]
      │              │
      │         ┌────┴──────────────────────────┐
      │         ▼                               ▼
      │    Room: exam_{ca_thi_id}           Room: arena_{pinCode}
      │         │                               │
      │    ┌────┴────────────┐             ┌────┴────────────┐
      │    ▼                 ▼             ▼                 ▼
      │  [Proctor]      [TakeExam]       [Host Cockpit]    [Quiz Player]
      │
      ├── HTTP ──► [examguard-flask :5000]  ──► MySQL :3306
      │            (Registry / Governance)
      │
      └── HTTP ──► [examguard-ai :8000]    ──► MongoDB :27017
                   (Face AI Microservice)        (embeddings + logs)
```

---

## VIII. STATE MACHINE TÓM TẮT

### 8.1 Vòng đời Face KYC

```
NOT_ENROLLED → ENROLLING → PENDING_APPROVAL → APPROVED ✅
                                           └─► REJECTED ❌ → (Chụp lại)
```

### 8.2 Trạng thái Sinh viên trong Ca thi

```
BLOCKED_NO_KYC → not_checkin → checkin ⇄ suspicious → suspended
                                   └──────────────────→ checkout
```

### 8.3 Bảng điểm uy tín (diem_uy_tin: 0–100)

| Vi phạm | Điểm trừ | Mức độ |
|---|---|---|
| Tráo người thi hộ (IMPERSONATION) | **−50** | CRITICAL |
| Mở Developer Tools (F12) | −30 | CRITICAL |
| Phát hiện máy ảo | −20 | CRITICAL |
| Cúi đầu xem điện thoại | −20 | HIGH |
| 2 người lạ xuất hiện | −15 | HIGH |
| Màn hình thứ 2 | −15 | HIGH |
| Chuyển Tab | −10 | MEDIUM |
| Rời vị trí / che webcam | −10 | MEDIUM |
| Liếc bài bên cạnh | −10 | MEDIUM |
| Xoay vai | −8 | MEDIUM |
| Quay đầu sang bên | −5 | LOW |
| Liếc mắt ra ngoài | −3 | LOW |
| **Giám thị ghé bàn (STAFF_EXEMPTION)** | **0** | INFO |

---

## IX. ĐÁNH GIÁ TỔNG HỢP

### ✅ Điểm mạnh

1. **Bảo mật đa tầng xuất sắc:** Kết hợp sinh trắc học (ArcFace + Liveness), bảo mật trình duyệt (SEB), giới hạn mạng (IP VLAN), và kiểm soát thiết bị (device fingerprint)
2. **Chống gian lận toàn diện:** Từ thi hộ (IMPERSONATION), nhắc bài, dùng thiết bị ngoài, đến thao tác trình duyệt
3. **Trải nghiệm UX đa vai trò:** Mỗi actor có luồng nghiệp vụ rõ ràng, phù hợp ngữ cảnh thực tế
4. **Kiến trúc mở rộng được:** Microservices, Redis Pub/Sub, cô lập đa phòng thi hoàn toàn
5. **Zero-Trust thực chất:** 5 quy tắc bảo mật tuyệt đối được thiết kế ở cấp kiến trúc, không chỉ là policy
6. **Tính trung thực học thuật:** Rọc phách điện tử, phân tách soạn đề – coi thi, audit log bất biến

### ⚠️ Rủi ro & Thách thức

1. **Độ chính xác AI trong điều kiện thực tế:** Ánh sáng yếu, góc camera xấu, kính cận có thể ảnh hưởng ngưỡng Cosine Similarity
2. **Phụ thuộc hạ tầng mạng:** BYOD cần IP VLAN ổn định; CCTV RTSP cần băng thông nội bộ đủ lớn
3. **Kỳ vọng về quy mô AI đồng thời:** 1.000–1.500 CCU đồng loạt gửi frame AI cần tối ưu queue và worker pool
4. **Quy trình KYC phụ thuộc hành chính:** Toàn bộ luồng phụ thuộc vào việc SV/GV hoàn tất KYC trước ngày thi
5. **False positive trong CCTV:** Bóng, chuyển động không liên quan có thể gây nhầm vi phạm trong hình thức thi tập trung

---

## X. CÔNG CỤ TẠO ĐỀ THI QUIZ ARENA (ASSESSMENT STUDIO v3.5)

### 10.1 Tổng quan
Nhằm phục vụ chế độ kiểm tra Quiz gamification (sàn đấu cạnh tranh trực tiếp, tính điểm tốc độ, combo streak, bảng xếp hạng realtime), hệ thống **Assessment Studio v3.5 SOLID** đã được bổ sung bộ công cụ chuyên dụng cho phép Giảng viên tạo và quản trị đề thi Quiz Arena:

1. **Top Menu Bar Quiz Controls:**
   - `[⚡ Tạo Đề Cho Quiz]`: Mở modal sinh đề tự động đa năng.
   - `[🎮 Quiz Mode: BẬT/TẮT]`: Bật/Tắt chế độ hiển thị Đấu trường Quiz trong Studio.
   - `[▶ Test Quiz Arena]`: Trình giả lập Live Quiz Simulator thử nghiệm ngay trong Studio với âm thanh Web Audio và 4 khối màu Kahoot.

2. **Modal Tạo Đề Thi Nhanh (Quiz Generator Modal):**
   - **Tab 1 - Preset Packs:** 4 bộ đề mẫu sẵn có chuẩn kiến thức CNTT (JavaScript Web Core, Thuật toán & CTDL, SQL Database, ExamGuard AI & Quy chế thi).
   - **Tab 2 - Fast Text AI Parser:** Bóc tách tự động từ văn bản thô (cú pháp: `Câu 1: [20s] Đề bài?`, `A. Đáp án`, `B. Đáp án*`, `Giải thích: ...`). Tự động phát hiện thời gian và đáp án đúng.
   - **Tab 3 - Batch Generator:** Sinh hàng loạt N câu hỏi trắc nghiệm A-B-C-D kèm tùy biến thời gian (10s - 60s) và điểm số.

3. **Cấu hình Đếm ngược & Giao diện Kahoot cho từng câu:**
   - Bộ chọn thời gian đếm ngược trực tiếp cho từng câu hỏi (`10s`, `15s`, `20s`, `30s`, `45s`, `60s`, `90s`, `120s`).
   - Huy hiệu Kahoot đặc trưng cho 4 phương án: ▲ Đỏ (A), ◆ Xanh dương (B), ● Vàng (C), ■ Xanh lá (D).
   - Lưu trữ thuộc tính `isQuizArena`, `quizSettings: { defaultTimePerQuestion, speedBonus }` và `timeLimitSeconds` trực tiếp vào MongoDB CSDL `exam_papers`.

4. **Live Quiz Arena Simulator:**
   - Giả lập phòng thi thời gian thực: Đếm ngược từng giây, ticker audio khi còn dưới 5s, điểm số đua tốc độ (Speed Bonus), chuỗi trả lời đúng (Streak Combo), âm thanh chuẩn Web Audio (fanfare, streak, correct, wrong, tick).

---

*Tài liệu phân tích này được xây dựng từ `SYSTEM_BLUEPRINT.md v3.3` và cập nhật theo phiên bản mới nhất của ExamGuard AI & Assessment Studio v3.5.*
