


const mongoose = require('mongoose');

const imageSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    originalname: String,
    mimetype: String, // Rất quan trọng để biết đây là ảnh png, jpg hay gif
    data: { type: Buffer, required: false }, // Dữ liệu nhị phân của ảnh (không bắt buộc nữa)
    path: String, // Đường dẫn tương đối trên đĩa
    url: String,  // Đường dẫn link URL tĩnh
    size: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Image', imageSchema);