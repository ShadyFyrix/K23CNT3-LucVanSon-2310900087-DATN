// const Image = require('../models/image.model');

// class ImageService {
//     async createImageRecord(file) {
//         const newImage = new Image({
//             filename: file.filename,
//             originalname: file.originalname,
//             mimetype: file.mimetype,
//             path: file.path,
//             size: file.size
//         });
//         return await newImage.save();
//     }

//     async findImageById(id) {
//         return await Image.findById(id);
//     }
// }

// module.exports = new ImageService();


const Image = require('../models/image.model');

class ImageService {
    async createImageRecord(file) {
        const newImage = new Image({
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            path: file.path,
            url: `/uploads/${file.filename}`, // Link tĩnh để frontend hiển thị trực tiếp
            size: file.size
        });
        return await newImage.save();
    }

    async findImageById(id) {
        return await Image.findById(id);
    }
}

module.exports = new ImageService();