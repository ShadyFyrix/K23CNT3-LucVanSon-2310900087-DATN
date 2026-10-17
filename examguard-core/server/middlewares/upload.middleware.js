const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Đảm bảo thư mục images tồn tại
const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, '..', 'images');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Đảm bảo thư mục dự án tồn tại
const projectDir = process.env.PROJECT_DIR || path.join(__dirname, '..', 'uploads', 'projects');
try {
    if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
        console.log(`Created directory: ${projectDir}`);
    }
} catch (e) {
    console.warn(`Warning: Could not create directory ${projectDir}:`, e.message);
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'projectFiles') {
            // Đảm bảo thư mục tồn tại tại thời điểm upload
            try {
                if (!fs.existsSync(projectDir)) {
                    fs.mkdirSync(projectDir, { recursive: true });
                }
            } catch (e) {
                console.error("Lỗi khi tạo thư mục dự án:", e.message);
            }
            cb(null, projectDir);
        } else {
            cb(null, uploadDir);
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'projectFiles') {
        const ext = path.extname(file.originalname).toLowerCase();
        if (ext === '.zip' || ext === '.rar') {
            cb(null, true);
        } else {
            cb(new Error('Chỉ chấp nhận tệp nén định dạng .zip hoặc .rar cho dự án.'), false);
        }
    } else {
        // Các định dạng được phép cho ảnh/video
        const allowedTypes = [
            'image/jpeg', 
            'image/png', 
            'image/gif', 
            'image/webp',
            'video/mp4', 
            'video/quicktime', 
            'video/x-msvideo'
        ];
        
        if (allowedTypes.includes(file.mimetype) || file.fieldname === 'image') {
            cb(null, true);
        } else {
            cb(new Error('Định dạng tệp không hợp lệ! Chỉ chấp nhận ảnh và video.'), false);
        }
    }
};

const uploadMiddleware = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { 
        fileSize: 100 * 1024 * 1024 // Giới hạn 100MB cho file nén dự án 
    } 
});

/**
 * LƯU Ý QUAN TRỌNG:
 * MongoDB mặc định giới hạn một Document tối đa là 16MB.
 * Nếu bạn muốn lưu video hoặc ảnh dung lượng lớn hơn 16MB vào MongoDB, 
 * bạn phải sử dụng GridFS. 
 * Với nhu cầu ảnh thông thường, 15MB là ngưỡng an toàn.
 */

module.exports = uploadMiddleware;