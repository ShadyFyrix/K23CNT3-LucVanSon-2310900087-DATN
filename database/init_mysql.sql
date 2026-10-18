-- ==============================================================================
-- EXAMGUARD AI - CƠ SỞ DỮ LIỆU QUAN HỆ CHUẨN HÓA (MYSQL 8.0)
-- ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS examguard_db 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE examguard_db;

-- 1. BẢNG users
CREATE TABLE IF NOT EXISTS users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  username      VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          ENUM('admin','teacher','student') NOT NULL,
  ho_ten        VARCHAR(100),
  email         VARCHAR(100),
  sdt           VARCHAR(20),
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. BẢNG khoa
CREATE TABLE IF NOT EXISTS khoa (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ma_khoa       VARCHAR(20) UNIQUE NOT NULL,
  ten_khoa      VARCHAR(100) NOT NULL,
  so_dien_thoai VARCHAR(15),
  mo_ta         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. BẢNG lop
CREATE TABLE IF NOT EXISTS lop (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ma_lop        VARCHAR(20) UNIQUE NOT NULL,
  ten_lop       VARCHAR(100) NOT NULL,
  khoa_hoc      VARCHAR(20),
  khoa_id       INT NOT NULL,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (khoa_id) REFERENCES khoa(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 4. BẢNG sinh_vien
CREATE TABLE IF NOT EXISTS sinh_vien (
  id                 INT PRIMARY KEY AUTO_INCREMENT,
  user_id            INT UNIQUE NOT NULL,
  ma_sv              VARCHAR(20) UNIQUE NOT NULL,
  ho_ten             VARCHAR(100) NOT NULL,
  ngay_sinh          DATE,
  gioi_tinh          ENUM('M','F','OTHER') DEFAULT 'M',
  email              VARCHAR(100),
  lop_id             INT,
  avatar_url         VARCHAR(255),
  face_status        ENUM('NOT_ENROLLED','PENDING_APPROVAL','APPROVED','REJECTED') DEFAULT 'APPROVED',
  face_image_url     VARCHAR(255),
  face_embedding     JSON,
  face_angles        JSON,
  face_quality_score FLOAT DEFAULT 0.95,
  face_enrolled_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (lop_id)  REFERENCES lop(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. BẢNG giang_vien
CREATE TABLE IF NOT EXISTS giang_vien (
  id                 INT PRIMARY KEY AUTO_INCREMENT,
  user_id            INT UNIQUE NOT NULL,
  ma_gv              VARCHAR(20) UNIQUE NOT NULL,
  ho_ten             VARCHAR(100) NOT NULL,
  email              VARCHAR(100),
  khoa_id            INT,
  avatar_url         VARCHAR(255),
  face_status        ENUM('NOT_ENROLLED','PENDING_APPROVAL','APPROVED','REJECTED') DEFAULT 'APPROVED',
  face_image_url     VARCHAR(255),
  face_embedding     JSON,
  created_at         DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (khoa_id) REFERENCES khoa(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 6. BẢNG mon_hoc
CREATE TABLE IF NOT EXISTS mon_hoc (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ma_mon        VARCHAR(20) UNIQUE NOT NULL,
  ten_mon       VARCHAR(150) NOT NULL,
  so_tin_chi    INT DEFAULT 3,
  khoa_id       INT,
  mo_ta         TEXT,
  created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (khoa_id) REFERENCES khoa(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 7. BẢNG hoc_ky
CREATE TABLE IF NOT EXISTS hoc_ky (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ten_hoc_ky    VARCHAR(50) NOT NULL,
  nam_hoc       VARCHAR(20),
  ngay_bat_dau  DATE,
  ngay_ket_thuc DATE
) ENGINE=InnoDB;

-- 8. BẢNG phong_thi
CREATE TABLE IF NOT EXISTS phong_thi (
  id                  INT PRIMARY KEY AUTO_INCREMENT,
  ma_phong            VARCHAR(20) UNIQUE NOT NULL,
  ten_phong           VARCHAR(100),
  loai_phong_mac_dinh ENUM('LAB_PC','HALL_ROOM') DEFAULT 'LAB_PC',
  so_day              INT NOT NULL DEFAULT 6,
  so_cot              INT NOT NULL DEFAULT 5,
  allowed_ip_subnet   VARCHAR(50),
  created_at          DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 9. BẢNG camera_phong_thi
CREATE TABLE IF NOT EXISTS camera_phong_thi (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  phong_thi_id      INT NOT NULL,
  ma_camera         VARCHAR(30) NOT NULL,
  vi_tri_lap_dat    ENUM('FRONT_LEFT','FRONT_RIGHT','BACK_LEFT','BACK_RIGHT','CENTER_CEILING','KIOSK_DOOR') DEFAULT 'CENTER_CEILING',
  rtsp_url          VARCHAR(255),
  do_phan_giai      VARCHAR(20) DEFAULT '1920x1080',
  roi_polygons_json JSON,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (phong_thi_id) REFERENCES phong_thi(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 10. BẢNG ca_thi
CREATE TABLE IF NOT EXISTS ca_thi (
  id                   INT PRIMARY KEY AUTO_INCREMENT,
  ma_ca_thi            VARCHAR(30) UNIQUE NOT NULL,
  ten_ca_thi           VARCHAR(150) NOT NULL,
  mon_hoc_id           INT NOT NULL,
  hoc_ky_id            INT,
  phong_thi_id         INT NOT NULL,
  hinh_thuc_thi        ENUM('LAB_PC','BYOD_LAPTOP','ONLINE_QUIZ') DEFAULT 'ONLINE_QUIZ',
  de_thi_mongo_id      VARCHAR(50) NOT NULL,
  require_seb_lockdown BOOLEAN DEFAULT TRUE,
  ngay_thi             DATE NOT NULL,
  gio_bat_dau          TIME NOT NULL,
  gio_ket_thuc         TIME NOT NULL,
  trang_thai_ca        ENUM('UPCOMING','ACTIVE','FINISHED') DEFAULT 'UPCOMING',
  created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (mon_hoc_id)   REFERENCES mon_hoc(id) ON DELETE RESTRICT,
  FOREIGN KEY (phong_thi_id) REFERENCES phong_thi(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 11. BẢNG phan_cong_coi_thi
CREATE TABLE IF NOT EXISTS phan_cong_coi_thi (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  ca_thi_id     INT NOT NULL,
  giang_vien_id INT NOT NULL,
  vai_tro       ENUM('GIAM_THI_1','GIAM_THI_2','THANH_TRA') DEFAULT 'GIAM_THI_1',
  FOREIGN KEY (ca_thi_id)     REFERENCES ca_thi(id) ON DELETE CASCADE,
  FOREIGN KEY (giang_vien_id) REFERENCES giang_vien(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ct_gv (ca_thi_id, giang_vien_id)
) ENGINE=InnoDB;

-- 12. BẢNG sinh_vien_ca_thi
CREATE TABLE IF NOT EXISTS sinh_vien_ca_thi (
  id                          BIGINT PRIMARY KEY AUTO_INCREMENT,
  ca_thi_id                   INT NOT NULL,
  sinh_vien_id                INT NOT NULL,
  so_bao_danh                 VARCHAR(20) NOT NULL,
  vi_tri_ngoi                 VARCHAR(20) NOT NULL,
  seat_pin_code               VARCHAR(10),
  client_ip_address           VARCHAR(45),
  device_fingerprint          VARCHAR(255),
  thoi_gian_checkin           DATETIME,
  similarity_score            FLOAT,
  captured_image_url          VARCHAR(255),
  last_continuous_verified_at DATETIME,
  continuous_similarity       FLOAT,
  impersonation_flag          BOOLEAN DEFAULT FALSE,
  trang_thai                  ENUM('not_checkin','checkin','checkout','suspicious','suspended') DEFAULT 'not_checkin',
  diem_uy_tin                 INT DEFAULT 100,
  diem_thi                    FLOAT DEFAULT NULL,
  created_at                  DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (ca_thi_id)    REFERENCES ca_thi(id) ON DELETE CASCADE,
  FOREIGN KEY (sinh_vien_id) REFERENCES sinh_vien(id) ON DELETE CASCADE,
  UNIQUE KEY uq_ca_sv (ca_thi_id, sinh_vien_id)
) ENGINE=InnoDB;

-- 13. BẢNG nhat_ky_vi_pham (Dự phòng đối soát MySQL kết hợp MongoDB)
CREATE TABLE IF NOT EXISTS nhat_ky_vi_pham (
  id                   BIGINT PRIMARY KEY AUTO_INCREMENT,
  sinh_vien_ca_thi_id  BIGINT NOT NULL,
  loai_vi_pham         VARCHAR(50) NOT NULL,
  muc_do               ENUM('INFO','WARNING','CRITICAL') DEFAULT 'WARNING',
  mo_ta                TEXT,
  anh_bang_chung       VARCHAR(255),
  diem_tru             INT DEFAULT 5,
  thoi_gian_ghi_nhan   DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sinh_vien_ca_thi_id) REFERENCES sinh_vien_ca_thi(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ==============================================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA CHUẨN HOÁ CHO BẢO VỆ ĐATN)
-- ==============================================================================

-- 1. Thêm Khoa CNTT
INSERT INTO khoa (id, ma_khoa, ten_khoa, so_dien_thoai, mo_ta) 
VALUES (1, 'CNTT', 'Khoa Công nghệ Thông tin & Truyền thông', '024.37654321', 'Khoa đào tạo CNTT, Kỹ thuật phần mềm & AI')
ON DUPLICATE KEY UPDATE ten_khoa=VALUES(ten_khoa);

-- 2. Thêm Lớp K23CNT3
INSERT INTO lop (id, ma_lop, ten_lop, khoa_hoc, khoa_id)
VALUES (1, 'K23CNT3', 'Lớp K23 Công nghệ Thông tin 3', '2023-2027', 1)
ON DUPLICATE KEY UPDATE ten_lop=VALUES(ten_lop);

-- 3. Thêm Môn học Toán rời rạc & Kỹ thuật lập trình C
INSERT INTO mon_hoc (id, ma_mon, ten_mon, so_tin_chi, khoa_id, mo_ta)
VALUES 
(1, 'INT101', 'Kỹ thuật lập trình C', 3, 1, 'Môn cơ sở lập trình cấu trúc và giải thuật'),
(2, 'MATH201', 'Toán rời rạc & Đại số Boole', 3, 1, 'Lý thuyết tập hợp, hàm Boole, đồ thị và mạch logic')
ON DUPLICATE KEY UPDATE ten_mon=VALUES(ten_mon);

-- 4. Thêm Phòng thi P302 & Lab 1
INSERT INTO phong_thi (id, ma_phong, ten_phong, loai_phong_mac_dinh, so_day, so_cot, allowed_ip_subnet)
VALUES 
(1, 'P302', 'Phòng máy Lab 302', 'LAB_PC', 6, 5, '192.168.30.0/24'),
(2, 'LAB01', 'Phòng Lab Chuyên đề AI', 'LAB_PC', 5, 6, '192.168.10.0/24')
ON DUPLICATE KEY UPDATE ten_phong=VALUES(ten_phong);

-- 5. Thêm Học kỳ
INSERT INTO hoc_ky (id, ten_hoc_ky, nam_hoc, ngay_bat_dau, ngay_ket_thuc)
VALUES (1, 'Học kỳ 1 (2026 - 2027)', '2026-2027', '2026-09-01', '2027-01-15')
ON DUPLICATE KEY UPDATE ten_hoc_ky=VALUES(ten_hoc_ky);

-- 6. Thêm Tài khoản Users (Mật khẩu hash của 123456)
-- Hash bcrypt 10 vòng cho '123456': $2b$10$w85xN.22U3QzJzU6i92tCOp4KjP4BskrJq3M1c4fO/y0n8R2sD/Vq
INSERT INTO users (id, username, password_hash, role, ho_ten, email, sdt)
VALUES 
(1, 'admin@examguard.edu.vn', '$2b$10$w85xN.22U3QzJzU6i92tCOp4KjP4BskrJq3M1c4fO/y0n8R2sD/Vq', 'admin', 'Hội Đồng Khảo Thí Admin', 'admin@examguard.edu.vn', '0912345678'),
(2, 'anguyen@examguard.edu.vn', '$2b$10$w85xN.22U3QzJzU6i92tCOp4KjP4BskrJq3M1c4fO/y0n8R2sD/Vq', 'teacher', 'TS. Nguyễn Văn An', 'anguyen@examguard.edu.vn', '0987654321'),
(3, 'son.luc@sinhvien.edu.vn', '$2b$10$w85xN.22U3QzJzU6i92tCOp4KjP4BskrJq3M1c4fO/y0n8R2sD/Vq', 'student', 'Lục Văn Sơn', 'son.luc@sinhvien.edu.vn', '0388999888')
ON DUPLICATE KEY UPDATE ho_ten=VALUES(ho_ten);

-- 7. Thêm Giảng viên
INSERT INTO giang_vien (id, user_id, ma_gv, ho_ten, email, khoa_id, face_status)
VALUES (1, 2, 'GV001', 'TS. Nguyễn Văn An', 'anguyen@examguard.edu.vn', 1, 'APPROVED')
ON DUPLICATE KEY UPDATE ho_ten=VALUES(ho_ten);

-- 8. Thêm Sinh viên Lục Văn Sơn (MSV: 2310900087)
INSERT INTO sinh_vien (id, user_id, ma_sv, ho_ten, ngay_sinh, gioi_tinh, email, lop_id, face_status)
VALUES (1, 3, '2310900087', 'Lục Văn Sơn', '2005-01-01', 'M', 'son.luc@sinhvien.edu.vn', 1, 'APPROVED')
ON DUPLICATE KEY UPDATE ho_ten=VALUES(ho_ten);

-- 9. Thêm Ca thi mẫu
INSERT INTO ca_thi (id, ma_ca_thi, ten_ca_thi, mon_hoc_id, hoc_ky_id, phong_thi_id, hinh_thuc_thi, de_thi_mongo_id, ngay_thi, gio_bat_dau, gio_ket_thuc, trang_thai_ca)
VALUES (1, 'CA_TOANROIRAC_20261018', 'Thi Kết Thúc Học Phần: Toán Rời Rạc & Mạch Logic', 2, 1, 1, 'ONLINE_QUIZ', 'default_exam_mongo_id', '2026-10-18', '08:00:00', '10:00:00', 'ACTIVE')
ON DUPLICATE KEY UPDATE ten_ca_thi=VALUES(ten_ca_thi);

-- 10. Phân công Giám thị
INSERT INTO phan_cong_coi_thi (id, ca_thi_id, giang_vien_id, vai_tro)
VALUES (1, 1, 1, 'GIAM_THI_1')
ON DUPLICATE KEY UPDATE vai_tro=VALUES(vai_tro);

-- 11. Đăng ký Sinh viên vào Ca thi
INSERT INTO sinh_vien_ca_thi (id, ca_thi_id, sinh_vien_id, so_bao_danh, vi_tri_ngoi, trang_thai, diem_uy_tin, diem_thi)
VALUES (1, 1, 1, 'SBD-2310900087', 'R1-C1', 'checkin', 100, 9.5)
ON DUPLICATE KEY UPDATE vi_tri_ngoi=VALUES(vi_tri_ngoi);
