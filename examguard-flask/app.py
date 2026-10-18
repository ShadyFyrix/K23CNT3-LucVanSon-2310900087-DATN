# ==============================================================================
# EXAMGUARD AI - FLASK CORE GOVERNANCE & REGISTRY MICROSERVICE
# ĐỒ ÁN TỐT NGHIỆP: Sinh viên Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3
# Nền tảng: Python Flask + MySQL 8.0 + MongoDB 7.0 + RESTful API
# ==============================================================================

import os
import sys
import datetime
from decimal import Decimal

# Đảm bảo UTF-8 output trên Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass
from flask import Flask, jsonify, request
from flask_cors import CORS
from dotenv import load_dotenv
import pymysql
import pymysql.cursors
from pymongo import MongoClient
from bson import ObjectId

# Nạp cấu hình môi trường
load_dotenv()

app = Flask(__name__)
CORS(app)

# Cấu hình kết nối
MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_PORT = int(os.getenv("MYSQL_PORT", 3306))
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "lvson2005")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "examguard_db")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/examguard_ai_db")
FLASK_PORT = int(os.getenv("FLASK_PORT", 5000))

# Custom JSON Encoder để xử lý datetime, Decimal và ObjectId
def serialize_data(data):
    if isinstance(data, list):
        return [serialize_data(item) for item in data]
    elif isinstance(data, dict):
        return {key: serialize_data(val) for key, val in data.items()}
    elif isinstance(data, (datetime.datetime, datetime.date, datetime.time)):
        return data.isoformat()
    elif isinstance(data, Decimal):
        return float(data)
    elif isinstance(data, ObjectId):
        return str(data)
    return data

def get_mysql_connection():
    """Tạo kết nối tới cơ sở dữ liệu MySQL"""
    return pymysql.connect(
        host=MYSQL_HOST,
        port=MYSQL_PORT,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DATABASE,
        cursorclass=pymysql.cursors.DictCursor,
        charset='utf8mb4',
        autocommit=True
    )

def get_mongo_db():
    """Tạo kết nối tới cơ sở dữ liệu MongoDB"""
    client = MongoClient(MONGO_URI)
    return client.get_database()

# ------------------------------------------------------------------------------
# 1. ROOT & HEALTHCHECK ENDPOINTS
# ------------------------------------------------------------------------------
@app.route("/", methods=["GET"])
def index():
    return jsonify({
        "success": True,
        "service": "ExamGuard AI - Flask Core Service",
        "author": "Lục Văn Sơn - MSV: 2310900087 - Lớp: K23CNT3",
        "stack": {
            "backend": "Python Flask",
            "relational_db": "MySQL 8.0 (examguard_db)",
            "document_db": "MongoDB 7.0 (examguard_ai_db)",
            "frontend": "ReactJS (React 19) + TailwindCSS v4"
        },
        "endpoints": [
            "/api/flask/health",
            "/api/flask/departments",
            "/api/flask/classes",
            "/api/flask/students",
            "/api/flask/teachers",
            "/api/flask/exam-sessions",
            "/api/flask/rooms",
            "/api/flask/stats",
            "/api/flask/sync-from-mongo"
        ]
    })

@app.route("/api/flask/health", methods=["GET"])
def healthcheck():
    mysql_status = "DISCONNECTED"
    mysql_version = None
    mongo_status = "DISCONNECTED"

    # Kiểm tra MySQL
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT VERSION() AS ver, DATABASE() AS db;")
            res = cursor.fetchone()
            mysql_status = "CONNECTED"
            mysql_version = f"MySQL {res['ver']} (DB: {res['db']})"
        conn.close()
    except Exception as e:
        mysql_status = f"ERROR: {str(e)}"

    # Kiểm tra MongoDB
    try:
        db = get_mongo_db()
        db.command("ping")
        mongo_status = "CONNECTED"
    except Exception as e:
        mongo_status = f"ERROR: {str(e)}"

    return jsonify({
        "success": True,
        "service": "ExamGuard AI - Flask Backend Service",
        "port": FLASK_PORT,
        "status": "HEALTHY" if (mysql_status == "CONNECTED" and mongo_status == "CONNECTED") else "DEGRADED",
        "mysql": {
            "status": mysql_status,
            "version": mysql_version,
            "host": f"{MYSQL_HOST}:{MYSQL_PORT}"
        },
        "mongodb": {
            "status": mongo_status,
            "uri": MONGO_URI
        },
        "server_time": datetime.datetime.now().isoformat()
    })

# ------------------------------------------------------------------------------
# 2. QUẢN LÝ KHOA (DEPARTMENTS) - MYSQL
# ------------------------------------------------------------------------------
@app.route("/api/flask/departments", methods=["GET"])
def get_departments():
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM khoa ORDER BY id ASC;")
            rows = cursor.fetchall()
        conn.close()
        return jsonify({
            "success": True,
            "count": len(rows),
            "data": serialize_data(rows)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------------------------------------------------------------------
# 3. QUẢN LÝ LỚP HỌC (CLASSES) - MYSQL
# ------------------------------------------------------------------------------
@app.route("/api/flask/classes", methods=["GET"])
def get_classes():
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT l.*, k.ten_khoa, k.ma_khoa 
                FROM lop l 
                LEFT JOIN khoa k ON l.khoa_id = k.id 
                ORDER BY l.id ASC;
            """)
            rows = cursor.fetchall()
        conn.close()
        return jsonify({
            "success": True,
            "count": len(rows),
            "data": serialize_data(rows)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------------------------------------------------------------------
# 4. QUẢN LÝ SINH VIÊN (STUDENTS) - MYSQL
# ------------------------------------------------------------------------------
@app.route("/api/flask/students", methods=["GET"])
def get_students():
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT s.id, s.ma_sv, s.ho_ten, s.ngay_sinh, s.gioi_tinh, s.email, 
                       s.face_status, s.face_quality_score, s.face_enrolled_at,
                       l.ma_lop, l.ten_lop, k.ten_khoa
                FROM sinh_vien s
                LEFT JOIN lop l ON s.lop_id = l.id
                LEFT JOIN khoa k ON l.khoa_id = k.id
                ORDER BY s.id ASC;
            """)
            rows = cursor.fetchall()
        conn.close()
        return jsonify({
            "success": True,
            "count": len(rows),
            "data": serialize_data(rows)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------------------------------------------------------------------
# 5. QUẢN LÝ GIẢNG VIÊN (TEACHERS) - MYSQL
# ------------------------------------------------------------------------------
@app.route("/api/flask/teachers", methods=["GET"])
def get_teachers():
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT g.id, g.ma_gv, g.ho_ten, g.email, g.face_status, k.ten_khoa
                FROM giang_vien g
                LEFT JOIN khoa k ON g.khoa_id = k.id
                ORDER BY g.id ASC;
            """)
            rows = cursor.fetchall()
        conn.close()
        return jsonify({
            "success": True,
            "count": len(rows),
            "data": serialize_data(rows)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------------------------------------------------------------------
# 6. QUẢN LÝ CA THI & LỊCH THI (EXAM SESSIONS) - MYSQL
# ------------------------------------------------------------------------------
@app.route("/api/flask/exam-sessions", methods=["GET"])
def get_exam_sessions():
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT ct.id, ct.ma_ca_thi, ct.ten_ca_thi, ct.hinh_thuc_thi, ct.de_thi_mongo_id,
                       ct.ngay_thi, ct.gio_bat_dau, ct.gio_ket_thuc, ct.trang_thai_ca,
                       mh.ma_mon, mh.ten_mon, pt.ma_phong, pt.ten_phong
                FROM ca_thi ct
                LEFT JOIN mon_hoc mh ON ct.mon_hoc_id = mh.id
                LEFT JOIN phong_thi pt ON ct.phong_thi_id = pt.id
                ORDER BY ct.id ASC;
            """)
            rows = cursor.fetchall()
        conn.close()
        return jsonify({
            "success": True,
            "count": len(rows),
            "data": serialize_data(rows)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------------------------------------------------------------------
# 7. QUẢN LÝ PHÒNG THI & CAMERA (ROOMS) - MYSQL
# ------------------------------------------------------------------------------
@app.route("/api/flask/rooms", methods=["GET"])
def get_rooms():
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT * FROM phong_thi ORDER BY id ASC;")
            rooms = cursor.fetchall()
            for r in rooms:
                cursor.execute("SELECT * FROM camera_phong_thi WHERE phong_thi_id = %s;", (r["id"],))
                r["cameras"] = cursor.fetchall()
        conn.close()
        return jsonify({
            "success": True,
            "count": len(rooms),
            "data": serialize_data(rooms)
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ------------------------------------------------------------------------------
# 8. THỐNG KÊ TỔNG HỢP POLYGLOT (MYSQL + MONGODB)
# ------------------------------------------------------------------------------
@app.route("/api/flask/stats", methods=["GET"])
def get_stats():
    stats = {
        "mysql": {},
        "mongodb": {},
        "timestamp": datetime.datetime.now().isoformat()
    }

    # Thống kê từ MySQL
    try:
        conn = get_mysql_connection()
        with conn.cursor() as cursor:
            cursor.execute("SELECT COUNT(*) AS total FROM khoa;")
            stats["mysql"]["departments"] = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM lop;")
            stats["mysql"]["classes"] = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM sinh_vien;")
            stats["mysql"]["students"] = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM giang_vien;")
            stats["mysql"]["teachers"] = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM ca_thi;")
            stats["mysql"]["exam_sessions"] = cursor.fetchone()["total"]
            cursor.execute("SELECT COUNT(*) AS total FROM phong_thi;")
            stats["mysql"]["rooms"] = cursor.fetchone()["total"]
        conn.close()
    except Exception as e:
        stats["mysql"]["error"] = str(e)

    # Thống kê từ MongoDB
    try:
        db = get_mongo_db()
        stats["mongodb"]["exam_papers"] = db.exampapers.count_documents({})
        stats["mongodb"]["face_kyc"] = db.facekycs.count_documents({})
        stats["mongodb"]["proctoring_logs"] = db.proctoringlogs.count_documents({})
        stats["mongodb"]["users"] = db.users.count_documents({})
    except Exception as e:
        stats["mongodb"]["error"] = str(e)

    return jsonify({
        "success": True,
        "data": stats
    })

# ------------------------------------------------------------------------------
# 9. ĐỒNG BỘ DỮ LIỆU TỪ MONGODB SANG MYSQL (POLYGLOT PERSISTENCE SYNC)
# ------------------------------------------------------------------------------
@app.route("/api/flask/sync-from-mongo", methods=["POST"])
def sync_from_mongo():
    synced_items = {"users": 0, "students": 0, "teachers": 0, "classes": 0}
    try:
        db = get_mongo_db()
        conn = get_mysql_connection()

        # Đồng bộ Sinh viên từ MongoDB
        mongo_students = list(db.students.find({}))
        with conn.cursor() as cursor:
            for s in mongo_students:
                msv = s.get("studentCode") or s.get("msv")
                name = s.get("fullName") or s.get("ho_ten") or "Sinh viên"
                email = s.get("email") or f"{msv}@sinhvien.edu.vn"
                if msv:
                    # Kiểm tra hoặc tạo user trước
                    cursor.execute("SELECT id FROM users WHERE username = %s;", (email,))
                    u = cursor.fetchone()
                    if not u:
                        cursor.execute("""
                            INSERT INTO users (username, password_hash, role, ho_ten, email)
                            VALUES (%s, '$2b$10$w85xN.22U3QzJzU6i92tCOp4KjP4BskrJq3M1c4fO/y0n8R2sD/Vq', 'student', %s, %s);
                        """, (email, name, email))
                        user_id = cursor.lastrowid
                        synced_items["users"] += 1
                    else:
                        user_id = u["id"]

                    # Cập nhật hoặc thêm vào bảng sinh_vien
                    cursor.execute("""
                        INSERT INTO sinh_vien (user_id, ma_sv, ho_ten, email, lop_id, face_status)
                        VALUES (%s, %s, %s, %s, 1, 'APPROVED')
                        ON DUPLICATE KEY UPDATE ho_ten = VALUES(ho_ten), email = VALUES(email);
                    """, (user_id, msv, name, email))
                    synced_items["students"] += 1

        conn.close()
        return jsonify({
            "success": True,
            "message": "Đồng bộ dữ liệu từ MongoDB sang MySQL thành công!",
            "synced": synced_items
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    print("=" * 70)
    print("[INIT] EXAMGUARD AI - FLASK CORE REGISTRY SERVICE STARTING...")
    print(f"[*] Flask Service URL:   http://127.0.0.1:{FLASK_PORT}")
    print(f"[*] MySQL Database:      {MYSQL_USER}@{MYSQL_HOST}:{MYSQL_PORT}/{MYSQL_DATABASE}")
    print(f"[*] MongoDB Database:    {MONGO_URI}")
    print("=" * 70)
    app.run(host="0.0.0.0", port=FLASK_PORT, debug=True)
