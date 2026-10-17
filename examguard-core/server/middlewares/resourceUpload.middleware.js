const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đường dẫn upload tài liệu cấu hình từ .env hoặc fallback về thư mục local
const uploadDir = process.env.RESOURCE_UPLOAD_DIR || path.join(__dirname, '..', 'uploads', 'resources');

// Đảm bảo thư mục tồn tại
try {
    if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log(`🚀 Created resource upload directory: ${uploadDir}`);
    }
} catch (e) {
    console.error(`⚠️ Warning: Could not create upload directory ${uploadDir}:`, e.message);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Đảm bảo thư mục tồn tại trước khi ghi
        try {
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }
        } catch (e) {
            console.error("Lỗi tạo thư mục lưu trữ:", e.message);
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Tạo tên tệp độc nhất để tránh bị ghi đè
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        const originalNameWithoutExt = path.basename(file.originalname, ext);
        // Thay thế khoảng trắng và ký tự đặc biệt
        const cleanName = originalNameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, '_');
        cb(null, `${uniqueSuffix}-${cleanName}${ext}`);
    }
});

const uploadMiddleware = multer({
    storage: storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // Giới hạn 100MB cho tài liệu hệ thống
    }
});

module.exports = uploadMiddleware;
