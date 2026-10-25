# BỘ PROMPT CHUẨN GOOGLE STITCH — THIẾT KẾ GIAO DIỆN HỆ THỐNG EXAMGUARD AI
> **Hệ thống:** Khảo thí Trực tuyến & Giám sát 3D Tích hợp Face AI  
> **Nền tảng mục tiêu:** Tương thích Đa thiết bị (Desktop 1440px+ & Mobile Responsive 390px)  
> **Nguyên tắc thiết kế cốt lõi:** *Spatial Academic Minimalism, Zero Telemetry Clutter, Strict 60-30-10 Color Rule*  

---

## PHẦN I: ĐẶC TẢ HỆ THỐNG THIẾT KẾ KHÔNG GIAN (SPATIAL DESIGN SYSTEM)

### 1. Visual Direction & Aesthetic
- **Aesthetic:** Spatial Academic Minimalism (Cảm hứng thiết kế từ Linear, Apple Education, và Notion).
- **Core Rule:** Ultra-clean, khoảng trắng phóng khoáng (generous whitespace), triệt tiêu hoàn toàn "tiếng ồn dữ liệu" (zero technical telemetry clutter), tối đa **3 điểm dữ liệu trên mỗi thẻ card** (maximum 3 data points per card).
- **Corner Radius:**
  * `16px` (`rounded-2xl`) cho các container chính, modal, khung không gian.
  * `12px` (`rounded-xl`) cho các thẻ đáp án tương tác (interactive option cards) và nút bấm.
- **Typography:**
  * **Headings:** Google Sans (Bold / SemiBold).
  * **Body & Badges:** Inter / Google Sans Text. Nhãn quét nhanh từ 2–4 từ tối đa.

### 2. Strict 60-30-10 Color Palettes (3 Phối Màu Trọng Tâm)
- **Theme 1: "Phòng Thi Dịu Mát" (Student Exam View — Calm & Alert)**
  * **60%** Primary Canvas Background: `#E6FFFA` (Soft Mint — Xanh bạc hà mát dịu)
  * **30%** Secondary Structural Panels & Sidebar: `#319795` (Medium Teal — Xanh mòng két)
  * **10%** Focal Card Surface & Active Highlights: `#FFFFFF` (Pure White) với chữ `#134E4A` (Deep Teal)
- **Theme 2: "Trí Tuệ Sáng Tạo" (Instructor Exam Builder — Creative Flow)**
  * **60%** Primary Canvas Background: `#EBF8FF` (Lavender Mist — Sương mù lam sáng)
  * **30%** Secondary Structural Panels: `#BEE3F8` (Pastel Sky Blue — Xanh da trời nhạt)
  * **10%** Primary CTA & Active Accents: `#553C9A` (Deep Cold Purple — Tím học thuật đậm)
- **Theme 3: "Mùa Thi Nghiêm Túc" (Instructor Grading & Admin — Deep Focus)**
  * **60%** Primary App Shell & Structural Frame: `#1A365D` (Deep Academic Navy — Xanh hải quân sâu)
  * **30%** Secondary Workspace Cards: `#E2E8F0` (Light Cool Gray — Xám mát)
  * **10%** Interactive Accents & Face ID Ring: `#3182CE` (Bright Royal Blue — Xanh hoàng gia rực rỡ)

---

## PHẦN II: 4 PROMPT SPATIAL CỐT LÕI (DÁN TRỰC TIẾP VÀO GOOGLE STITCH)

### PROMPT 1: GIAO DIỆN SINH VIÊN — PHÒNG THI "ZEN FOCUS" (TÔNG MÀU "PHÒNG THI DỊU MÁT")
*Cách dùng trên Stitch: Chọn chế độ Web / Desktop hoặc Mobile, dán prompt dưới đây để tạo màn hình làm bài thi tích hợp Face ID không gây áp lực.*

```text
Context: Design a breakthrough, distraction-free web application screen for an online exam platform with integrated Face ID verification (ExamGuard AI).
User: University students taking a high-stakes exam who need a calm, stress-free, and effortless interface.
Screen Goal: Allow the student to focus 100% on answering the current question while seamlessly confirming Face ID presence without intimidating technical numbers or text clutter.

Layout & Hierarchy (Asymmetric 75/25 Split-Canvas, NO vertical dashboard clutter):
- Top Floating Pill Header: Minimalist horizontal bar containing a visual dot-matrix question switcher (dots 1 to 10), a sleek countdown timer pill ("24:18"), and a subtle cloud-saved icon.
- Main Center Canvas (75% width): A spacious floating white card (#FFFFFF) displaying a single question badge ("Câu 03/20 · Tư duy"), a clean question heading, and a 2x2 tactile grid of large selectable answer cards (A, B, C, D) instead of traditional radio buttons. Bottom of card has a "Đánh dấu" ghost button and a primary "Câu tiếp theo →" button.
- Right Spatial Pod (25% width): A calming teal structural panel (#319795) featuring a circular Face ID Biometric Avatar Ring with a soft glowing emerald border, a "Khớp 99%" pill badge, a "Thu gọn Zen" toggle button, and 3 minimal icon-only status badges (Face OK, Quiet Room, Fullscreen Locked).

Visual Direction & 60-30-10 Color Rule ("Phòng Thi Dịu Mát"):
- 60% Dominant background canvas: Soft Mint (#E6FFFA).
- 30% Secondary structural pod and navigation container: Medium Teal (#319795).
- 10% Focal question card and active highlights: Pure White (#FFFFFF) with deep teal text (#134E4A).

Constraints:
Strictly NO long paragraphs, NO technical telemetry (hide bandwidth, FPS, or risk score numbers), NO red warning banners.
Switch all UI copy, labels, and button text to Vietnamese.
```

---

### PROMPT 2: GIAO DIỆN GIẢNG VIÊN (LUỒNG 1) — STUDIO TẠO ĐỀ KHÔNG GIAN KÉO THẢ (TÔNG MÀU "TRÍ TUỆ SÁNG TẠO")
*Cách dùng trên Stitch: Tạo màn hình mới trong cùng dự án cho luồng Tạo đề thi (Visual Drag-and-Drop Exam Builder).*

```text
Context: Design a modern, spatial drag-and-drop exam authoring studio for university instructors in ExamGuard AI.
User: Instructors who want to visually construct rich STEM & language exams with zero clutter, using drag-and-drop question blocks and embedded video micro-tutorials.
Screen Goal: Enable visual assembly of 4 multimedia question block types (Image MCQ, Audio Listening, Code Debugging, Geometry Canvas) with high-efficiency authoring and instant tutorial previews.

Layout & Hierarchy (3-Column Spatial Studio, Ultra-Clean UI/UX):
- Left Toolbox Palette (25% width): A pastel blue panel (#BEE3F8) containing a 2x2 grid of draggable Question Block Tiles:
  * Tile 1: "Trắc nghiệm Ảnh" (Icon: Image + 4 Option Cards)
  * Tile 2: "Nghe Tiếng Anh" (Icon: Audio Waveform + Play Limit)
  * Tile 3: "Sửa Lỗi Code" (Icon: Bug Code Editor + Testcases)
  * Tile 4: "Hình Học Canvas" (Icon: Triangle angle solver + Proof box)
  Below the tiles is a reorderable question list tree (Câu 01..10) with drag handles and point chips.

- Center Drop-Zone Workspace (50% width): A clean floating white card (#FFFFFF) displaying the active question editor:
  * Top Card Action Bar: Question type badge, points input pill ("1.5 điểm"), difficulty pills ("Dễ", "Vừa", "Khó"), and a distinct, elegant button: "[▶ Video Hướng Dẫn]" (opens a 20-second glassmorphism micro-tutorial popover showing how to configure and how students interact with this block).
  * Block Content Area:
    - If Image MCQ: Drag-and-drop image upload slot + 4 tactile A, B, C, D answer cards with radio toggles.
    - If Audio Listening: Audio waveform upload slot, play limit counter pill ("Tối đa 2 lượt nghe"), and nested question bubbles.
    - If Code Debug: Embedded dark code editor with syntax highlighting showing buggy code + testcase expected output box.
    - If Geometry Canvas: Interactive geometric canvas for finding x or angle α, drawing/uploading vector shapes, and a step-by-step student proof box.
  * Bottom Bar: "AI Gợi Ý Nội Dung" magic pill and "Lưu Câu Hỏi" button.

- Right Inspector Panel (25% width): A compact visual card showing a sleek Doughnut Chart for exam structure balance (Bloom: Nhận biết 30%, Thông hiểu 40%, Vận dụng 20%, Vận dụng cao 10%), total points ("10.0 / 10.0"), and a prominent royal purple primary CTA button: "[Xuất Bản Đề Thi]".

Visual Direction & 60-30-10 Color Rule ("Trí Tuệ Sáng Tạo"):
- 60% Dominant workspace background: Lavender Mist (#EBF8FF).
- 30% Secondary sidebars and block containers: Pastel Sky Blue (#BEE3F8).
- 10% Primary CTA buttons, active states, and AI badges: Deep Cold Purple (#553C9A).

Constraints:
Ultra-clean UI. Keep text minimal (2-4 words per label). Strictly NO dense multi-tiered tables, NO technical server clutter.
Switch all UI copy, labels, and button text to Vietnamese.
```

---

### PROMPT 3: GIAO DIỆN GIẢNG VIÊN (LUỒNG 2) — BÀN CHẤM THI SPLIT-SCREEN & ĐỐI CHIẾU FACE ID (TÔNG MÀU "MÙA THI NGHIÊM TÚC")
*Cách dùng trên Stitch: Tạo màn hình cho luồng Chấm thi và Xác thực chính chủ (Grading & Face ID Proof Studio).*

```text
Context: Design a breakthrough Split-Screen Grading & Biometric Verification Studio for instructors in ExamGuard AI.
User: Instructors grading student exam submissions who need to simultaneously score answers and verify that the student's Face ID matched during that specific question.
Screen Goal: Combine AI-assisted rubric grading and Face ID visual proof on a single screen for 1-click approval.

Layout & Hierarchy (50/50 Split-Screen Studio):
- Top Compact Bar: Student selector pill ("Nguyễn Văn An · Câu 05/20"), progress indicator ("Đã chấm 18/25"), and LMS sync badge.
- Left Panel (Student Submission & 1-Click Rubric): A clean white card showing the student's written answer with key concepts highlighted in soft green, an "AI Gợi ý: 9.0/10" badge, and a horizontal 1-Click Quick Score Pill Bar ("10đ Xuất sắc", "9.0đ Tốt", "7.5đ Đạt", "5.0đ Cần xem lại").
- Right Panel (Synchronized Face ID Keyframe Proof): A cool-gray structural card (#E2E8F0) displaying 3 side-by-side circular webcam snapshots captured while the student answered this exact question ("Lúc mở câu: 99.6%", "Lúc đang gõ: 99.2%", "Lúc nộp: 99.5%"), a minimal clean timeline bar, and a prominent primary button "Duyệt 9.0đ & Chuyển câu tiếp".

Visual Direction & 60-30-10 Color Rule ("Mùa Thi Nghiêm Túc"):
- 60% Dominant app frame and header shell: Deep Academic Navy (#1A365D).
- 30% Secondary structural cards and containers: Light Cool Gray (#E2E8F0).
- 10% Primary action buttons, selected score pill, and Face ID verification rings: Bright Royal Blue (#3182CE).

Constraints:
No complex video editing timelines or raw server logs. Everything must be visual, scannable in 2 seconds, and actionable with one click.
Switch all UI copy, labels, and button text to Vietnamese.
```

---

### PROMPT 4: GIAO DIỆN QUẢN TRỊ VIÊN — TRUNG TÂM ĐIỀU PHỐI BENTO GRID (TÔNG MÀU "MÙA THI NGHIÊM TÚC")
*Cách dùng trên Stitch: Tạo màn hình tổng quan cho Quản trị viên theo phong cách Bento Grid gọn gàng, thay thế các bảng biểu truyền thống.*

```text
Context: Design a high-level Bento Grid Command Center for university exam administrators in ExamGuard AI.
User: Exam department heads overseeing exam creation, live Face ID proctoring sessions, and final grade publishing across the institution.
Screen Goal: Provide an instant visual overview of the 3 core pillars (Tạo đề, Thi, Chấm thi) and 1-click automated proctor scheduling without spreadsheet clutter.

Layout & Hierarchy (2x2 Asymmetric Bento Grid):
- Bento Card 1 (Top-Left, 3-Pillar Live Pipeline): 3 clean horizontal visual cards with icons showing "1. Ngân hàng Đề (142 Đề)", "2. Ca thi Face ID (1,420 Phiên)", and "3. Đã chấm & Đồng bộ (99.8%)".
- Bento Card 2 (Top-Right, Visual Schedule & Fairness Engine): A sleek visual card showing 3 proctor avatars with balanced shift pills ("4 ca/giám thị · 0 trùng lịch") and a primary CTA button "⚡ Tự động Xếp lịch Giám thị".
- Bento Card 3 (Bottom-Left, Face ID System Health): A minimal horizontal bar chart comparing Face ID match accuracy (99.4%) and device check speed (+50%).
- Bento Card 4 (Bottom-Right, Quick Institutional Toggles): 3 clean toggle switches for "Bắt buộc Face ID Liveness", "Đồng bộ điểm Moodle/Canvas", and "Lưu trữ mã hóa E2E".

Visual Direction & 60-30-10 Color Rule ("Mùa Thi Nghiêm Túc"):
- 60% Primary shell background: Deep Academic Navy (#1A365D).
- 30% Secondary Bento containers: Light Cool Gray (#E2E8F0) and White cards.
- 10% Accent buttons, active toggles, and progress bars: Bright Royal Blue (#3182CE).

Constraints:
Maximum 4 Bento cards on the entire screen. No multi-column data tables, no long text descriptions.
Switch all UI copy, labels, and button text to Vietnamese.
```

---

## PHẦN III: BỘ PROMPT CHI TIẾT TỪNG PHÂN MÀN HÌNH (EXPANDED SCREENS)

### 1. MASTER SYSTEM PROMPT — THIẾT LẬP CONTEXT GỐC
*Sử dụng prompt này làm ngữ cảnh gốc (Context / Custom Instructions) trên Stitch trước khi tạo từng màn hình.*

```text
Role & Goal: You are a Principal UI/UX Product Designer creating a world-class, enterprise-grade Web & Mobile UI for "ExamGuard AI" — an academic examination & AI proctoring platform for universities.

Core Design Philosophy:
- "Distraction-Free Minimalist UI & Cognitive Load Reduction": Display ONLY essential information. Hide all complex AI telemetry, coordinates, and raw technical data under the hood. No visual noise.
- "Progressive Disclosure": High-level views show clean visual status (Green/Amber/Red). Detailed audit logs or evidence snapshots appear only on-demand via side-drawers or modals.
- "Dual Platform Seamless Adaptability": Design must be fully responsive and optimized for both Desktop (1440px+, widescreen multi-column, split views) and Mobile devices (390px+, thumb-friendly, bottom navigation, collapsible drawers, tap targets >= 44px).

Visual Design System Tokens:
- Color Palette:
  * Primary Background: Deep Slate-950 (#020617) for Dark Mode; Pure Crisp White / Slate-50 (#F8FAFC) for Light Mode.
  * Card Surfaces: Slate-900/80 with subtle 1px border (#1E293B) and delicate Glassmorphism (backdrop-blur-md).
  * Brand & Accents: Cyber Cyan (#06B6D4) and Academic Indigo (#4F46E5).
  * Status Indicators: Emerald-400 (Safe / Verified / Active), Amber-400 (Notice / Warning), Rose-500 (Critical Violation / Blocked / Late).
- Typography: Clean modern Sans-serif (Inter / Outfit / Plus Jakarta Sans). High legibility, mathematical mono-font for timers & candidate codes.
- Micro-interactions: Smooth hover glow, biometric scanning radar rings, gentle state transitions (150-200ms ease-out).
```

---

## NHÓM 1: GIAO DIỆN SINH VIÊN (STUDENT EXPERIENCE)

### PROMPT 1.1: CỔNG SINH VIÊN & THẺ SV ĐIỆN TỬ (PORTAL)

```text
Design a responsive, ultra-clean Student Portal screen for ExamGuard AI ("StudentPortalPage") optimized for both Desktop (1440px) and Mobile (390px).

Key Sections & Layout:
1. Top Bar / Header:
   - Left: Compact ExamGuard AI logo + University Name.
   - Right: Quick Theme toggle (Light/Dark), notification bell with dot, and Student Avatar.
2. Digital Student ID Card (Hero Component):
   - Desktop: An elegant horizontal NFC-style card (Slate-900 gradient with subtle holographic mesh pattern).
   - Mobile: Vertical wallet-card layout.
   - Content: Student Portrait with verified checkmark, Full Name "Lục Văn Sơn", Student Code "2310900087", Class "K23CNT3", Major "Công nghệ thông tin".
   - Status Badge: Subtle Emerald pill "Face ID: Hồ Sơ Đã Kích Hoạt" (Verified). No distracting technical numbers.
3. Clean Tab Navigation:
   - 3 Pills: [Lịch Thi & Phòng Máy] (Active), [Bảng Điểm Học Phần], [Quy Chế Phòng Thi].
4. Active Exam Card (Call-To-Action):
   - Highlighting the currently active exam: "Thi Kết Thúc Học Phần: Kỹ Thuật Lập Trình C & Cấu Trúc Dữ Liệu".
   - Info chips: Phòng LAB-01 • SBD: SBD-001 • Thời lượng: 60 phút • Giờ thi: 07:30 - 08:30.
   - Primary CTA Button: Glowing Emerald button with Biometric Face icon: "VÀO PHÒNG CHỜ THI" (Take Exam).
5. Upcoming Schedule List:
   - A clean minimalist list of upcoming exams with subject code, date, room, and status chip "Chưa diễn ra".

Responsive Behavior:
- Desktop: 2-column layout (Digital ID Card on left, Active Exam + Schedule on right).
- Mobile: Single-column scroll, Sticky CTA bar at bottom for instant exam entry.
```

---

### PROMPT 1.2: SẢNH CHỜ CA THI THÔNG MINH (LOBBY)

```text
Design a modern, distraction-free Exam Waiting Lobby screen ("ExamWaitingLobby") for university candidates, supporting Desktop (1440px) and Mobile (390px).

Key Elements & Structure:
1. Top Header:
   - Back button "← Cổng Sinh Viên", Page Title "Phòng Chờ Vào Thi & Lịch Khảo Thí", and Live Status Badge (Pulse green dot: "Hệ thống Kết nối Ổn định").
2. Active Exam Hero Banner:
   - Big, welcoming, high-contrast banner for the current exam session.
   - Subject Title: "Kỹ Thuật Lập Trình C & AI Giám Sát (INT101)".
   - Desk & Candidate Info Grid (Clean 4-column badges on desktop, 2x2 grid on mobile):
     * Số Báo Danh: "SBD-001"
     * Phòng Máy: "LAB-01"
     * Vị Trí Bàn: "Dãy 1 - Bàn 02"
     * Mã PIN Ghế: "1002"
   - Prominent Action Button: Full-width or prominent Cyan/Emerald button with Face Scan Icon: "XÁC THỰC KHUÔN MẶT ĐỂ VÀO THI" (Opens Face Gate).
3. Filterable Exam Tabs:
   - Clean tab bar: [Tất cả ca thi] | [Chưa thi / Sắp tới] | [Đã hoàn thành].
4. Exam Cards Grid:
   - Minimalist cards showing date, duration, room, and action button [Vào xác thực] (if active) or [Đã nộp bài] (greyed out).
5. Instructions Footer Pill:
   - Short, reassuring tip: "Vui lòng ngồi đúng vị trí bàn được chỉ định và kiểm tra webcam trước khi bắt đầu."

Responsive Behavior:
- Desktop: Spacing is generous, cards arranged in 2 columns.
- Mobile: Full-width touch cards, bottom sticky action button for quick Face Check-in.
```

---

### PROMPT 1.3: CỔNG NHẬN DIỆN SINH TRẮC HỌC (FACE CHECK-IN)

```text
Design an intuitive, high-tech yet reassuring Biometric Face Check-In Gate screen ("FaceCheckInGate") for ExamGuard AI, supporting Desktop (1440px) and Mobile (390px).

Layout & Visual Hierarchy:
1. Top Navigation:
   - Secondary exit button: "← Phòng Chờ Ca Thi" (allows candidate to switch subject without getting locked).
   - Centered session subtitle: "Xác thực danh tính thí sinh ca thi: INT101 - Phòng LAB-01".
2. Central Biometric Camera Mirror (Focal Point):
   - Rounded webcam container (16:9 ratio on desktop, 4:3 on mobile) with sleek neon border.
   - Overlay: An aesthetic 3D Face Oval guide & animated circular radar scan line (Cyan/Emerald gradient).
   - Real-time Status Banner below the camera:
     * When scanning: "Đang nhận diện khuôn mặt... Vui lòng nhìn thẳng vào camera" (with smooth pulsing wave).
     * When verified: Emerald pill with checkmark: "Xác Thực Thành Công (100% Khớp Hồ Sơ)".
3. Candidate Comparison Card (Minimalist):
   - Shows Candidate Name: "Lục Văn Sơn", Student Code: "2310900087", Seat: "Bàn R1-C2".
   - Live Liveness indicator: Green dot "Chân dung thực thể sống (Passed)".
   - Absolutely NO raw technical numbers, NO raw angles, NO floating JSON coordinates.
4. Auto-Redirect / Unlock Countdown:
   - When verified, a 3-second auto-forward circle: "Đang mở khóa buồng thi trong 3... 2... 1..." with button "Vào Buồng Thi Ngay".

Responsive Behavior:
- Desktop: Centered card layout (max-width: 640px) with high-quality mirror feed.
- Mobile: Fullscreen camera view with floating bottom card and prominent back button.
```

---

### PROMPT 1.4: BUỒNG THI TRỰC TUYẾN TỐI GIẢN (LIVE WORKSPACE)

```text
Design a world-class, distraction-free Live Exam Workspace ("TakeExam") for candidates taking technical/engineering exams, supporting Desktop (1440px) and Tablet/Mobile (768px - 390px).

Core UI Components:
1. Ultra-Clean Sticky Header (Height 56px):
   - Left: ExamGuard AI logo, Subject Name "Kỹ Thuật Lập Trình C", and Exit button "Rời phòng".
   - Center: High-contrast Digital Countdown Timer Pill (e.g., "45:12 / 60:00"). Turns soft amber when < 10 mins, pulsing red when < 5 mins.
   - Right: Security Shield Icon (Simple Emerald Shield = "Buồng thi an toàn"), Candidate SBD chip, and prominent Red/Indigo CTA button: "NỘP BÀI THI".
2. Main Exam Canvas:
   - Desktop Mode (Split-Screen View):
     * Left Pane (55% width): High-resolution PDF Exam Document viewer with zoom controls, pan, and a "Snipping Tool" icon to highlight circuits/diagrams.
     * Right Pane (45% width): Interactive Digital OMR Answer Sheet.
   - Mobile/Tablet Mode:
     * Single column with floating bottom drawer for the OMR Answer Matrix. Swipe up to view all bubbles, swipe down to read question text.
3. Interactive OMR Sheet Component:
   - Question list with circular bubble options (A, B, C, D).
   - Clear visual states:
     * Unanswered: Subtle slate outline.
     * Answered: Solid Cyan/Indigo fill with white letter.
     * Flagged for review: Amber corner bookmark icon.
   - Quick Question Matrix Palette: A 5x8 grid of mini numbered squares at the bottom for instant navigation (Jump to Question 1..40).
4. Hidden Anti-Cheat Background Worker:
   - AI facial verification & full-screen enforcement run 100% in background.
   - If candidate switches tabs: Display an elegant, non-intrusive 3-second floating Toast warning: "Cảnh báo: Vui lòng không rời màn hình thi (-5đ)". No persistent clutter.

Responsive Adaptations:
- Desktop: Dual-screen split layout side-by-side.
- Mobile: Question card view with sticky bottom bar: [Câu trước] [Câu sau] and [Mở Phiếu OMR (12/40)].
```

---

### PROMPT 1.5: MÀN HÌNH KẾT QUẢ & TRA CỨU ĐIỂM (EXAM RESULTS)

```text
Design a rewarding, clean Exam Submission & Results screen ("ExamResult") for candidates, supporting Desktop (1440px) and Mobile (390px).

Key Sections:
1. Submission Confirmation Header:
   - Large Emerald animated checkmark circle: "Bài Làm Đã Được Thu Nhận An Toàn".
   - Subtext: "Hệ thống đã mã hóa và lưu trữ bài làm của bạn vào cơ sở dữ liệu quốc gia."
2. Performance Overview Card:
   - Score Gauge: Large circular score display (e.g., "8.5 / 10.0" or "Đang chờ chấm tự luận").
   - 3 Clean Stat Cards:
     * Số câu đúng: 34 / 40 câu
     * Thời gian làm bài: 42 phút 15 giây
     * Điểm Uy Tín Giữ Vững: 95 / 100 (An ninh xuất sắc)
3. Action Toolbar:
   - Primary button: "Xem Bảng Điểm & Chi Tiết Lời Giải" (if published).
   - Secondary button: "← Quay Lại Cổng Sinh Viên".
4. Review Question Drawer (Collapsible):
   - Expandable breakdown of each question with candidate's choice vs correct key, and professor's explanation note.
```

---

## NHÓM 2: GIAO DIỆN GIẢNG VIÊN & CÁN BỘ COI THI

### PROMPT 2.1: STUDIO SOẠN ĐỀ KÉO THẢ ĐA PHƯƠNG TIỆN (DRAG-AND-DROP EXAM BUILDER)

```text
Design a world-class, ultra-clean Drag-and-Drop Exam Authoring Studio ("ExamBuilder") for university professors in ExamGuard AI, supporting Desktop (1440px) with Tablet fallback.

Core Architecture (Spatial Academic Minimalism, Ultra-Clean UI/UX):
1. Top Toolbar (Height 56px):
   - Exam Title: "Đề Thi Kết Thúc Học Phần Kỹ Thuật Lập Trình & Khoa Học Máy Tính", Course Code "INT101", Total Points pill ("10.0đ"), Total Questions pill ("25 câu"), and Primary CTA button: "[Xuất Bản Đề Thi]".

2. Left Toolbox Palette & Question Outline (25% width):
   - Palette of 4 Draggable Question Block Tiles:
     * Tile 1: "Trắc nghiệm Ảnh" (Upload/Snipping slot + 4 Option Cards A-B-C-D)
     * Tile 2: "Nghe Tiếng Anh" (Audio Waveform player + Play Limit counter 1-2 times + Sub-questions)
     * Tile 3: "Sửa Lỗi Code" (Buggy code snippet + Monaco Editor + Testcase expected output)
     * Tile 4: "Hình Học Canvas" (Interactive angle/x solver + Vector drawer + Step-by-step student proof editor)
   - Question Navigator List: Reorderable list (Câu 01..Câu 25) with drag handles, difficulty badges (Nhận biết, Thông hiểu, Vận dụng, Vận dụng cao), and score weights.

3. Center Drop-Zone Workspace (50% width):
   - Main Question Card (Pure White #FFFFFF, rounded-2xl, subtle shadow):
     * Header Bar: Question Title input, Points weight input ("1.5 điểm"), Difficulty pills ("Dễ", "Vừa", "Khó"), and an eye-catching button: "[▶ Video Hướng Dẫn]" (triggers a 20s popover video explaining how to configure and how students interact with this block).
     * Multimedia Content Slots:
       - For Image MCQ: Drop-zone for circuit diagram / graph image, and 4 clean selectable option cards (A, B, C, D) with "Đáp án đúng" toggle.
       - For Audio: Upload .mp3/.wav button, interactive waveform preview, and "Số lượt nghe tối đa: [2]" stepper.
       - For Code: Buggy code editor with syntax highlighting, and an "+ Thêm Testcase" panel (Input: 5 -> Output: 15).
       - For Geometry: Geometric Canvas for finding x or angle α, vector drawing tools (point, line, circle, angle), and a student mathematical proof text area.
     * Card Footer: "AI Gợi Ý Nội Dung" magic button and "Lưu Câu Hỏi" button.

4. Right Inspector & Bloom Difficulty Matrix (25% width):
   - Visual Doughnut Chart for Bloom's Taxonomy balance (Nhận biết 30%, Thông hiểu 40%, Vận dụng 20%, Vận dụng cao 10%).
   - Exam settings: Randomize questions toggle, Randomize options toggle, Mandatory Face ID check toggle.
```

---

### PROMPT 2.2: MA TRẬN GIÁM SÁT PHÒNG THI 3D REALTIME

```text
Design a state-of-the-art Realtime 3D Digital Twin Proctoring Dashboard ("ExamProctor") for university exam invigilators, supporting Desktop (1440px - 1920px) and Tablet monitoring.

Screen Architecture (Progressive Disclosure Principle):
1. Proctor Header:
   - Room Code "Phòng LAB-01", Active Session "Kỹ Thuật Lập Trình C", Clock: "08:15:30", Total Candidates: 40/40.
   - Filter chips: [Tất cả bàn (40)] | [Bình thường (36)] | [Cần chú ý (3)] | [Báo động (1)].
2. Physical Exam Room Matrix Grid (Focal Centerpiece):
   - Digital twin representation of the physical computer lab arranged in Rows and Columns (e.g., 6 Rows x 7 Columns).
   - Each Desk Card (Compact, Minimalist, No visual clutter):
     * Header: Desk Number (e.g., "R1-C2") + Candidate SBD ("SBD-002").
     * Center: Live low-latency webcam thumbnail (150x110px).
     * Footer: Student Name "Võ Hoài Nam".
     * Border & Status Indicator:
       - Green Border: Safe (Trust Score >= 80, no alerts).
       - Amber Border: Notice (Trust Score 60-79, looking away or temporary tab switch).
       - Red Pulsing Border: Alarm (Trust Score < 60, multiple faces, unknown face).
3. Candidate Detail Drawer (Sliding Panel on Click):
   - When proctor clicks on any desk, a sleek right-side drawer opens:
     * Large HD camera feed + KYC Reference Photo.
     * Realtime Trust Score Gauge (e.g., 75/100).
     * Violation Event Timeline with timestamped evidence screenshots.
     * Quick Action Buttons:
       - [Mở Bàn Đặc Cách] (Unlock late arrival with +0m, +5m, +10m, +15m extra time).
       - [Gửi Cảnh Báo Trực Tiếp] (Send instant pop-up text to student's screen).
       - [Đình Chỉ Thi] (Force terminate exam for severe cheating).
```

---

### PROMPT 2.3: BẢNG ĐIỀU KHIỂN CHẤM TỰ LUẬN & PHÚC KHẢO

```text
Design a productive, distraction-free Grading & Single-Pass Review Console ("GradingConsole") for university instructors, supporting Desktop (1440px).

Key Sections:
1. Exam & Submission Filter:
   - Session Selector, Student Dropdown/Search, Progress pill "Đã chấm: 38 / 45 bài".
2. Split-Screen Review Workspace:
   - Left Pane: Student's Actual Submission:
     * OMR Multiple-choice selections (auto-highlighted green for correct, red for incorrect).
     * Short-answer essay or submitted C/C++ code snippet with syntax highlighting.
   - Right Pane: Grading Rubric & Score Input:
     * Official barem points per question.
     * Input box for Essay score with quick buttons (+0.5, +1.0, +2.0).
     * Instructor Feedback & Regrading Reason (required if changing score for audit trail).
3. Sticky Bottom Navigation Bar:
   - Total Raw Score: "8.25 / 10.0".
   - Navigation: [← Thí Sinh Trước] [Lưu & Sang Thí Sinh Tiếp Theo (Ctrl+Enter) →] [Phê Duyệt Điểm].
```

---

## NHÓM 3: GIAO DIỆN QUẢN TRỊ VIÊN (ADMIN PORTAL)

### PROMPT 3.1: TRUNG TÂM ĐIỀU HÀNH & 4 THẺ KPI CỐT LÕI

```text
Design an executive, clutter-free Admin Overview Dashboard ("AdminDashboard") for university examination directors, supporting Desktop (1440px) and Mobile (390px).

Key Layout & Information Hierarchy:
1. Top Welcome Banner:
   - Greeting "Xin chào Quản trị viên Khảo thí", Current Academic Year "Học kỳ 1 (2026-2027)", Quick action [Tạo Ca Thi Mới].
2. 4 Executive KPI Cards (Clean, Bold, No Fluff):
   - Card 1: "Tổng Sinh Viên": 10,240 (↑ 8% so với năm trước).
   - Card 2: "Ca Thi Đang Mở Hôm Nay": 6 Ca (Tại 4 Phòng Lab).
   - Card 3: "Hồ Sơ Face KYC Đã Duyệt": 98.4% (Xanh lục).
   - Card 4: "Vi Phạm Cần Xử Lý": 2 Vụ (Đỏ - Click để xem biên bản).
3. Active Sessions Monitor (Interactive Table):
   - Columns: Mã Ca, Tên Môn Học, Phòng Máy, Giám Thị Phụ Trách, Số Thí Sinh, Trạng Thái, Thao Tác (Xem Ma Trận 3D).
4. Academic Structure Quick Access:
   - Shortcut tiles to manage: Khoa/Viện, Khóa Học, Lớp Sinh Hoạt, Môn Học, Phân Quyền.
```

---

### PROMPT 3.2: TRUNG TÂM THẨM ĐỊNH SINH TRẮC HỌC FACE KYC

```text
Design a specialized, high-security Biometric KYC Verification Hub ("FaceKYC") for university administrators, supporting Desktop (1440px).

Key Components:
1. Pending Submissions Queue:
   - Left sidebar listing students waiting for face approval with search by Student Code / Name, filter by Class / Department.
2. 5-Angle Face Inspection Grid:
   - Centered 5-photo grid showing the student's onboarding KYC captures:
     [Góc Thẳng] [Góc Trái 30°] [Góc Phải 30°] [Góc Ngửa] [Góc Cúi].
   - Each photo shows Liveness Quality Score (e.g., "0.98 - Đạt chuẩn thực thể sống").
3. Extracted Biometric Embeddings Card:
   - Status badge: "Vector ArcFace 512-D: Đã chuẩn hóa ||v||=1".
   - Comparison with National Student ID Card scan (side-by-side verification).
4. Decision Action Bar:
   - Quick Reject button with preset reasons dropdown ("Ảnh mờ", "Bị che mặt", "Sai người").
   - Large Emerald button: "[✓ PHÊ DUYỆT HỒ SƠ FACE ID]".
```

---

### PROMPT 3.3: SƠ ĐỒ PHÒNG MÁY LAB & LÊN LỊCH CA THI

```text
Design a smart Room Designer & Exam Session Scheduler screen ("RoomAndSessionDesigner") for university admins, supporting Desktop (1440px).

Key Modules:
1. Room Grid Builder:
   - Visual drag-to-resize grid editor: Set Rows (e.g., 6) and Columns (e.g., 7) to configure total desks (42 PCs).
   - Label aisle walkways and assign CCTV Camera RTSP stream coverage polygon.
2. Auto-Seating & Seat Pin Generator:
   - [Xếp Chỗ Tự Động] button: Uses randomized shuffle algorithm to allocate approved candidates, generates sequential candidate codes (SBD-001..SBD-040) and 4-digit unique Seat PINs.
3. Schedule Collision Prevention Widget:
   - Visual calendar showing Lab occupancy. Highlights in red if two exams overlap in the same room or if an invigilator is double-booked.
```
