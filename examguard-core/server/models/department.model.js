const mongoose = require('mongoose');

const DepartmentSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true, uppercase: true, trim: true }, // VD: 'CNTT', 'KTQT'
  name: { type: String, required: true, trim: true }, // VD: 'Khoa Công nghệ Thông tin'
  phone: { type: String, default: '' },
  description: { type: String, default: '' },
  head: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher' }
}, { timestamps: true });

module.exports = mongoose.model('Department', DepartmentSchema);

