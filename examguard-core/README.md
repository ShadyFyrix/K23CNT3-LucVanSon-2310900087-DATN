# ExamGuard AI — Hệ Thống Quản Lý Thi Trực Tuyến Tích Hợp Xác Thực Khuôn Mặt

> **Đồ Án Tốt Nghiệp**  
> **Sinh viên:** Lục Văn Sơn — **Mã SV:** 2310900087 — **Lớp:** K23CNT3  

## 1. Giới thiệu
ExamGuard AI là nền tảng quản lý thi trực tuyến thế hệ mới, tích hợp cơ chế bảo mật Zero-Trust và trí tuệ nhân tạo giám sát khuôn mặt thời gian thực (YuNet, ArcFace, Liveness).

## 2. Các phân hệ chính
- **Khảo thí & Quản lý Ca thi**: Tạo ca thi, sơ đồ phòng máy (rows x cols), xếp chỗ, tạo mã phách ẩn danh và PIN bàn thi.
- **Ngân hàng Đề thi**: Soạn đề trắc nghiệm, tự luận, code kèm đáp án đúng và lời giải thích chi tiết.
- **Candidate Workspace**: Giao diện làm bài thi chia 2 panel (đề thi + camera live HUD AI), tự động lưu bài làm mỗi 15s.
- **Động cơ Chấm Tự động Trắc nghiệm**: Chấm điểm tức thì khi thí sinh nộp bài hoặc hết giờ (< 50ms).
- **Không gian Rà soát 1 Lần của Giảng viên**: Phân tích độ khó đề thi, phát hiện câu hỏi lệch đáp án bất thường, 1-click Chấm lại (Recalculate All), Phê duyệt và Công bố điểm.
- **Xác thực Giám thị đi quanh lớp**: Tránh trừ oan điểm của thí sinh khi có mặt Cán bộ coi thi.
- **Sinh viên Đối chiếu Kết quả**: Xem điểm chính thức, đối chiếu bài làm kèm lời giải thích chi tiết và nộp đơn phúc khảo.

## 3. Khởi chạy hệ thống
```bash
# 1. Cài đặt thư viện (nếu cần)
npm install

# 2. Khởi chạy máy chủ phát triển
npm run dev

# 3. Khởi chạy Python Face AI Service (thư mục examguard-ai)
uvicorn main:app --host 127.0.0.1 --port 8000
```
