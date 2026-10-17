// const imageService = require('../services/image.service');
// const path = require('path');

// class ImageController {
//     // Xử lý upload ảnh
//     async upload(req, res) {
//         try {
//             if (!req.file) {
//                 return res.status(400).json({ message: 'Vui lòng chọn một file ảnh!' });
//             }
//             const data = await imageService.createImageRecord(req.file);
//             res.status(201).json({
//                 success: true,
//                 message: 'Tải lên thành công!',
//                 image: data
//             });
//         } catch (error) {
//             res.status(500).json({ success: false, message: error.message });
//         }
//     }

//     // Xử lý lấy ảnh hiển thị
//     async getById(req, res) {
//         try {
//             const image = await imageService.findImageById(req.params.id);
//             if (!image) {
//                 return res.status(404).json({ message: 'Ảnh không tồn tại!' });
//             }
//             // Gửi file về trình duyệt
//             res.sendFile(path.resolve(image.path));
//         } catch (error) {
//             res.status(500).json({ success: false, message: error.message });
//         }
//     }
// }

// module.exports = new ImageController();

const imageService = require('../services/image.service');
const path = require('path');

class ImageController {
    // Xử lý upload ảnh
    async upload(req, res) {
        try {
            if (!req.file) {
                return res.status(400).json({ message: 'Vui lòng chọn một file ảnh!' });
            }
            const savedImage = await imageService.createImageRecord(req.file);
            
            res.status(201).json({
                success: true,
                message: 'Tải lên thư mục thành công!',
                imageUrl: savedImage.url, // URL dẫn đến file tĩnh
                image: {
                    _id: savedImage._id,
                    filename: savedImage.filename,
                    mimetype: savedImage.mimetype,
                    url: savedImage.url
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // Xử lý lấy ảnh hiển thị (hỗ trợ cả ảnh trong MongoDB cũ và ảnh trên ổ cứng mới)
    async getById(req, res) {
        try {
            const image = await imageService.findImageById(req.params.id);
            if (!image) {
                return res.status(404).json({ message: 'Ảnh không tồn tại!' });
            }

            if (image.data) {
                // Hỗ trợ ảnh cũ được lưu trong DB
                res.set('Content-Type', image.mimetype);
                return res.send(image.data);
            } else if (image.path) {
                // Hỗ trợ ảnh mới được lưu trên đĩa
                return res.sendFile(path.resolve(image.path));
            } else {
                return res.status(404).json({ message: 'Không tìm thấy dữ liệu ảnh!' });
            }
        } catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    }
}

module.exports = new ImageController();