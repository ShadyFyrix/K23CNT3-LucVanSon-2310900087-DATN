<table>
<colgroup>
<col style="width: 44%" />
<col style="width: 55%" />
</colgroup>
<tbody>
<tr>
<td style="text-align: center;"><p>TRƯỜNG ĐẠI HỌC NGUYỄN TRÃI</p>
<p><strong>KHOA CNTT &amp; CĐS</strong></p>
<p><img src="media/image1.png" style="width:0in" /></p></td>
<td style="text-align: center;"><p><strong>CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
<p><strong>Độc lập - Tự do - Hạnh phúc</strong></p>
<p><img src="media/image1.png" style="width:0in" /></p></td>
</tr>
</tbody>
</table>

*Hà Nội, ngày 15 tháng 10 năm 2026*

**ĐỀ CƯƠNG ĐỒ ÁN TỐT NGHIỆP**

# Thông tin chung

## Sinh viên

<table style="width:100%;">
<colgroup>
<col style="width: 30%" />
<col style="width: 17%" />
<col style="width: 1%" />
<col style="width: 0%" />
<col style="width: 19%" />
<col style="width: 8%" />
<col style="width: 21%" />
</colgroup>
<tbody>
<tr>
<td colspan="2"><strong>Họ và tên: Lục Văn Sơn</strong></td>
<td colspan="4"><strong>Ngày sinh: 13/02/2005</strong></td>
<td><strong>Giới tính: Nam</strong></td>
</tr>
<tr>
<td colspan="4"><strong>Số điện thoại: 0823760578</strong></td>
<td colspan="3"><strong>Email:</strong> sonlv2310900087@ntu.edu.vn</td>
</tr>
<tr>
<td><strong>Mã SV: 2310900087</strong></td>
<td colspan="2"><strong>Lớp:</strong> K23CNT3</td>
<td colspan="2"><strong>Khóa:</strong> 2023-2027</td>
<td colspan="2"></td>
</tr>
<tr>
<td colspan="3"><strong>Ngành:</strong> Công nghệ thông tin</td>
<td colspan="4"><strong>Loại hình đào tạo:</strong> Chính quy</td>
</tr>
</tbody>
</table>

## Thông tin giảng viên hướng dẫn

|  |  |
|----|----|
| **Họ và tên: ThS. Lê Trọng Nhất** | **Đơn vị công tác:** Trường Đại học Nguyễn Trãi |
| **Số điện thoại**: | **Email:** |

# Nội dung đề cương chi tiết

1.  **Tên đề tài, nền tảng công nghệ**

- **Tên đề tài:** Ứng dụng YuNet Convolutional Neural Network xây dựng hệ thống quản lý đào tạo và khảo thí trực tuyến SmartEdu.

- **Nền tảng công nghệ:**
  - *Frontend:* ReactJS (Single Page Application - SPA), Vite, Tailwind CSS, Lucide Icons, WebRTC MediaStream API, HTML5 Geolocation API, Socket.IO Client.
  - *Backend Core:* Node.js, Express.js RESTful API, Socket.IO Server (Realtime WebSockets), JWT & RBAC (Role-Based Access Control).
  - *AI Microservice:* Python, FastAPI, Uvicorn, OpenCV DNN, Mô hình học sâu YuNet CNN ONNX, Mô hình nhúng SFace/ArcFace ONNX, Liveness Anti-spoofing, NumPy.
  - *Kiến trúc Cơ sở dữ liệu kép (Dual-Database):* MySQL 8.0 (CSDL quan hệ tuân thủ chuẩn ACID quản lý phân cấp tổ chức đào tạo, người dùng, ca thi, điểm số) & MongoDB (CSDL NoSQL hướng tài liệu quản lý ngân hàng đề thi đa hình, trạng thái lưu nháp bài làm thời gian thực và nhật ký vi phạm AI bất biến kèm ảnh bằng chứng).
  - *Thuật toán không gian địa lý:* Thuật toán lượng giác mặt cầu Haversine thiết lập hàng rào địa lý GPS Geofencing ảo ($R \le 20 - 50$m).

2.  **Nội dung dự kiến thực hiện**

- Nghiên cứu cơ sở lý thuyết về mạng nơ-ron nhân tạo (ANN), mạng nơ-ron tích chập (CNN), kiến trúc siêu nhẹ YuNet phát hiện khuôn mặt và 5 điểm mốc sinh trắc học thời gian thực, mô hình SFace/ArcFace trích xuất vector đặc trưng 512 chiều, thuật toán lượng giác mặt cầu Haversine, giao thức WebSockets truyền thông hai chiều, kiến trúc vi dịch vụ (Microservices) và kiến trúc CSDL kép.

- Khảo sát thực tế, phân tích yêu cầu nghiệp vụ quản lý đào tạo phân cấp (Khoa - Khóa - Lớp sinh hoạt - Môn học - Lớp học phần), quy trình xác thực khuôn mặt và định vị GPS trong điểm danh, cùng yêu cầu khảo thí trực tuyến bảo mật đa tầng. Mô hình hóa hệ thống bằng các biểu đồ chuẩn UML (Use Case tổng quát, Use Case phân rã, Sequence Diagram, Activity Diagram).

- Thiết kế kiến trúc tổng thể hệ thống vi dịch vụ, thiết kế chi tiết CSDL quan hệ MySQL (13 bảng tổ chức và ca thi) kết hợp CSDL tài liệu MongoDB, thiết kế giao diện tương tác người dùng theo 4 nhóm tác nhân (Admin, Quản lý đào tạo, Giảng viên/Giám thị, Sinh viên).

- Xây dựng quy trình định danh căn cước sinh trắc học gốc (Face KYC 5 góc độ) và phát triển phân hệ Điểm danh lớp học phần tự động thông qua cơ chế xác thực kép hai lớp độc lập (Two-Factor Biometric & Spatial Verification): nhận diện khuôn mặt AI (YuNet CNN + SFace/ArcFace + Liveness Anti-spoofing) kết hợp hàng rào địa lý GPS Geofencing (thuật toán Haversine bán kính 20–50m) trên thiết bị cá nhân (BYOD) của sinh viên.

- Phát triển phân hệ Khảo thí trực tuyến bảo mật đa tầng (ExamGuard AI): quản lý ngân hàng đề thi trắc nghiệm đa hình, phân bổ đề thi, xếp chỗ tự động, cơ chế chống trùng lịch thi (Anti-collision), điều phối môn thi liên tiếp (Sequential Exams), khóa môi trường thi (Fullscreen lock, phát hiện chuyển tab / mất focus, vô hiệu hóa phím tắt hệ thống, chuột phải và chặn công cụ DevTools).

- Tích hợp cơ chế Giám sát sinh trắc học liên tục (Continuous Biometric Verification) định kỳ 15–20 giây bằng WebRTC: phát hiện tráo đổi thí sinh giữa giờ (impersonation), vắng mặt khỏi khung hình, phát hiện nhiều khuôn mặt cùng xuất hiện, phát hiện nhìn lệch hướng làm bài. Xây dựng thuật toán tính biến thiên Điểm uy tín thời gian thực (Trust Score 0–100), cơ chế Miễn trừ Giám thị (Staff Exemption - 0 điểm trừ), tự động lưu nháp (Auto-save draft) và tự động thu nộp bài thi khi hết giờ.

- Xây dựng Bảng điều khiển giám thị thời gian thực (Realtime Proctoring Dashboard) qua WebSockets (Socket.IO) hiển thị toàn cảnh lưới trạng thái phòng thi, cảnh báo vi phạm tức thời và trích xuất nhật ký bằng chứng AI phục vụ công tác hậu kiểm.

- Tiến hành kiểm thử chức năng và phi chức năng, đánh giá độ chính xác nhận diện khuôn mặt, độ trễ suy luận AI (<50ms), kiểm thử khả năng chịu tải đồng thời và hoàn thiện tài liệu hướng dẫn kỹ thuật, báo cáo đồ án tốt nghiệp.

3.  **Kết quả dự kiến**

- Xây dựng thành công hệ thống phần mềm quản lý đào tạo và khảo thí trực tuyến SmartEdu tích hợp phân hệ ExamGuard AI hoạt động ổn định trên nền tảng Web, tương thích hoàn toàn với máy tính và thiết bị di động thông minh.

- Hoàn thành đầy đủ các phân hệ quản lý đào tạo phân cấp theo đúng quy chế đào tạo tín chỉ: Quản lý Khoa, Ngành/Khóa học, Lớp sinh hoạt, Môn học, Lớp học phần, Giảng viên và Sinh viên với cơ chế phân quyền RBAC/CBAC minh bạch.

- Tích hợp thành công mô hình mạng nơ-ron tích chập YuNet CNN kết hợp SFace/ArcFace và thuật toán Haversine GPS Geofencing, phục vụ hoàn hảo quy trình thẩm định căn cước Face KYC và điểm danh lớp học phần tự động với độ chính xác cao, thời gian xử lý realtime (<50ms) và loại bỏ hoàn toàn nguy cơ điểm danh hộ.

- Hoàn thiện phân hệ Khảo thí trực tuyến bảo mật đa tầng ExamGuard AI: thiết lập môi trường thi an toàn tuyệt đối, giám sát sinh trắc học liên tục chống tráo người giữa giờ thi, đánh giá độ tin cậy qua Điểm uy tín thời gian thực (Trust Score), cơ chế Miễn trừ Giám thị (Staff Exemption), chống trùng lịch thi và điều phối mượt mà giữa các môn thi liên tiếp.

- Hoàn thành Bảng điều khiển giám thị trực tuyến (Realtime Proctoring Dashboard) qua Socket.IO giúp cán bộ coi thi nắm bắt toàn cảnh phòng thi, can thiệp xử lý vi phạm tức thời và tra cứu ảnh bằng chứng xác thực.

- Xây dựng hệ thống cơ sở dữ liệu kép (MySQL và MongoDB) hoàn chỉnh, bảo đảm an toàn giao dịch, tính toàn vẹn dữ liệu điểm thi và khả năng lưu trữ linh hoạt bài làm, đề thi cùng nhật ký vi phạm AI bất biến.

- Hoàn thành toàn diện các kịch bản kiểm thử, sản phẩm phần mềm demo hoạt động hoàn chỉnh, báo cáo thuyết minh ĐATN đạt chuẩn quy định của Nhà trường và bộ tài liệu hướng dẫn sử dụng, triển khai hệ thống.

4.  **Dự kiến tiến độ thực hiện**

<table style="width:99%;">
<colgroup>
<col style="width: 7%" />
<col style="width: 14%" />
<col style="width: 76%" />
</colgroup>
<tbody>
<tr>
<td rowspan="2" style="text-align: center;"><strong>Tuần</strong></td>
<td rowspan="2" style="text-align: center;"><strong>Ngày</strong></td>
<td rowspan="2" style="text-align: center;"><strong>Nội dung</strong></td>
</tr>
<tr>
</tr>
<tr>
<td style="text-align: center;"><p>1</p></td>
<td><p>15/10/2026 -</p>
<p>22/10/2026</p></td>
<td><p><strong>TỔNG QUAN ĐỀ TÀI VÀ NGHIÊN CỨU NỀN TẢNG CÔNG NGHỆ</strong></p>
<p>- Xác định mục tiêu, phạm vi và xây dựng Đề cương chi tiết ĐATN.</p>
<p>- Nghiên cứu tổng quan về lĩnh vực quản lý đào tạo, điểm danh thông minh và khảo thí trực tuyến.</p>
<p>- Tìm hiểu cơ sở lý thuyết: Mạng nơ-ron tích chập (CNN), mô hình học sâu siêu nhẹ YuNet ONNX, mô hình SFace/ArcFace 512-D, thuật toán lượng giác mặt cầu Haversine.</p>
<p>- Tìm hiểu nền tảng công nghệ phần mềm: ReactJS, Vite, Node.js, Express.js, Socket.IO, Python FastAPI, MySQL và MongoDB.</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>2</p></td>
<td><p>23/10/2026 -</p>
<p>30/10/2026</p></td>
<td><p><strong>KHẢO SÁT VÀ PHÂN TÍCH YÊU CẦU HỆ THỐNG</strong></p>
<p>- Khảo sát nghiệp vụ đào tạo phân cấp, quy trình Face KYC, điểm danh lớp học phần và quy chế khảo thí trực tuyến.</p>
<p>- Phân tích yêu cầu chức năng (Quản lý đào tạo, Face KYC, Điểm danh AI+GPS, Khảo thí đa tầng ExamGuard AI, Proctoring Dashboard) và yêu cầu phi chức năng.</p>
<p>- Xác định các tác nhân tham gia hệ thống (Admin, Quản lý đào tạo, Giảng viên/Giám thị, Sinh viên).</p>
<p>- Mô hình hóa quy trình nghiệp vụ và xây dựng Biểu đồ Use Case tổng quát.</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>3</p></td>
<td><p>31/10/2026 -</p>
<p>07/11/2026</p></td>
<td><p><strong>PHÂN TÍCH HỆ THỐNG VÀ XÂY DỰNG BIỂU ĐỒ UML CHI TIẾT</strong></p>
<p>- Xây dựng Biểu đồ Use Case phân rã chức năng cho từng phân hệ nghiệp vụ.</p>
<p>- Viết tài liệu Đặc tả chi tiết các Use Case trọng tâm.</p>
<p>- Xây dựng Biểu đồ tuần tự (Sequence Diagram) cho các luồng cốt lõi: Đăng ký Face KYC, Điểm danh xác thực kép AI+GPS, Check-in phòng thi, Giám sát sinh trắc học liên tục, Phát hiện vi phạm và Nộp bài thi.</p>
<p>- Xây dựng Biểu đồ hoạt động (Activity Diagram) cho các tiến trình nghiệp vụ.</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>4</p></td>
<td><p>08/11/2026 -</p>
<p>15/11/2026</p></td>
<td><p><strong>THIẾT KẾ KIẾN TRÚC HỆ THỐNG VÀ CƠ SỞ DỮ LIỆU</strong></p>
<p>- Thiết kế kiến trúc tổng thể vi dịch vụ (Microservices Architecture) gồm Frontend, Backend Core và AI Microservice.</p>
<p>- Thiết kế chi tiết các gói vi dịch vụ, API Contracts và giao thức WebSocket Socket.IO.</p>
<p>- Thiết kế giao diện người dùng (UI/UX Design) cho 4 nhóm tác nhân trên môi trường máy tính và thiết bị di động.</p>
<p>- Thiết kế biểu đồ lớp đối tượng (Class Diagram).</p>
<p>- Thiết kế Cơ sở dữ liệu quan hệ MySQL (13 bảng cấu trúc đào tạo và ca thi) và CSDL NoSQL MongoDB (ngân hàng đề thi, bài làm và nhật ký vi phạm AI bất biến).</p>
<p>- Xây dựng Biểu đồ thực thể liên kết (ERD) và ánh xạ dữ liệu CSDL kép.</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>5</p></td>
<td><p>16/11/2026 -</p>
<p>23/11/2026</p></td>
<td><p><strong>XÂY DỰNG ỨNG DỤNG (FRONTEND & DỊCH VỤ AI FASTAPI)</strong></p>
<p>- Lập trình Front-end bằng ReactJS, Vite, Tailwind CSS: Xây dựng Layouts, Pages, Components và State Management.</p>
<p>- Tích hợp WebRTC Camera Stream và HTML5 Geolocation API trên giao diện người dùng.</p>
<p>- Lập trình Dịch vụ Trí tuệ nhân tạo (AI Microservice) bằng Python FastAPI.</p>
<p>- Cài đặt và tích hợp mô hình YuNet phát hiện khuôn mặt và 5 điểm mốc đặc trưng qua OpenCV DNN.</p>
<p>- Cài đặt mô hình SFace/ArcFace trích xuất vector 512 chiều, thuật toán so khớp Cosine Similarity và thuật toán kiểm tra thực thể sống Liveness Anti-spoofing.</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>6</p></td>
<td><p>24/11/2026 -</p>
<p>29/11/2026</p></td>
<td><p><strong>XÂY DỰNG ỨNG DỤNG (BACKEND CORE & KHẢO THÍ EXAMGUARD AI)</strong></p>
<p>- Lập trình Back-end Core bằng Node.js và Express.js: Xây dựng hệ thống RESTful API quản lý phân cấp đào tạo, xác thực JWT/RBAC.</p>
<p>- Cài đặt thuật toán lượng giác mặt cầu Haversine xác thực hàng rào GPS Geofencing.</p>
<p>- Xây dựng máy chủ thời gian thực Socket.IO Server điều phối dữ liệu phòng thi trực tuyến.</p>
<p>- Hiện thực hóa phân hệ Khảo thí ExamGuard AI: Khóa môi trường thi (Fullscreen, Tab-switch, DevTools), thuật toán Điểm uy tín (Trust Score), cơ chế Miễn trừ Giám thị (Staff Exemption), chống trùng lịch thi (Anti-collision), điều phối ca thi liên tiếp, lưu nháp tự động và chấm điểm trắc nghiệm tự động.</p>
<p>- Xây dựng Bảng điều khiển giám thị thời gian thực (Realtime Proctoring Dashboard).</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>7</p></td>
<td><p>30/11/2026 -</p>
<p>06/12/2026</p></td>
<td><p><strong>TÍCH HỢP HỆ THỐNG, KIỂM THỬ VÀ ĐÁNH GIÁ KẾT QUẢ</strong></p>
<p>- Tích hợp liên thông toàn bộ các dịch vụ: Frontend, Backend Core, AI Microservice, MySQL và MongoDB.</p>
<p>- Kiểm thử chức năng toàn diện theo các kịch bản kiểm thử (Test Cases).</p>
<p>- Kiểm thử phi chức năng: Đánh giá độ chính xác nhận diện khuôn mặt, đo đạc thời gian suy luận AI (<50ms), kiểm thử khả năng chịu tải đồng thời và độ ổn định của kết nối WebSockets.</p>
<p>- Phát hiện, khắc phục lỗi (Bug fixing) và tối ưu hóa hiệu năng toàn hệ thống.</p></td>
</tr>
<tr>
<td style="text-align: center;"><p>8</p></td>
<td><p>07/12/2026 -</p>
<p>15/12/2026</p></td>
<td><p><strong>HOÀN THIỆN BÁO CÁO ĐỒ ÁN VÀ ĐÓNG GÓI SẢN PHẨM DEMO</strong></p>
<p>- Hoàn thiện toàn bộ văn bản Báo cáo Đồ án tốt nghiệp theo cấu trúc 4 chương chuẩn của Nhà trường.</p>
<p>- Đóng gói mã nguồn chương trình ứng dụng và chuẩn bị kịch bản Demo hoàn chỉnh.</p>
<p>- Báo cáo tiến độ và tiếp thu ý kiến góp ý, chỉnh sửa của Giảng viên hướng dẫn.</p>
<p>- Nộp quyển báo cáo ĐATN, hoàn tất thủ tục xét duyệt và chuẩn bị slide thuyết trình bảo vệ trước Hội đồng chấm tốt nghiệp.</p></td>
</tr>
</tbody>
</table>

<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<tbody>
<tr>
<td style="text-align: center;"><p><strong>Sinh viên thực hiện</strong></p>
<p><em>(Ký và ghi rõ họ tên)</em></p>
<br /><br /><br />
<p><strong>Lục Văn Sơn</strong></p></td>
<td style="text-align: center;"><p><strong>Giảng viên hướng dẫn</strong></p>
<p><em>(Ký và ghi rõ họ tên)</em></p>
<br /><br /><br />
<p><strong>ThS. Lê Trọng Nhất</strong></p></td>
<td style="text-align: center;"><p><strong>Xác nhận của Khoa</strong></p>
<p><em>(Ký và ghi rõ họ tên)</em></p>
<br /><br /><br />
<p><strong>ThS. </strong></p></td>
</tr>
</tbody>
</table>
