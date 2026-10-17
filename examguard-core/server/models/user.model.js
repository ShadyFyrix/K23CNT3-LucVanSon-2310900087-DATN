
// const mongoose = require('mongoose');

// const UserSchema = new mongoose.Schema({
//     // Xóa bỏ trường username nếu còn
//     email: {
//         type: String,
//         required: true,
//         unique: true, // Chỉ email là duy nhất
//         trim: true,
//         lowercase: true
//     },
//     password: { type: String, required: true },
//     fullName: { type: String, default: '' },
//     roles: [{
//         type: String,
//         enum: [
//             'admin',
//             'director',
//             'manager',
//             'team_leader',
//             'sales',
//             'collaborator',
//             'teacher',
//             'accountant',
//             'support',
//             'staff'
//         ]
//     }],

//     department: {
//         type: String,
//         enum: [
//             'sales',
//             'training',
//             'accounting',
//             'marketing',
//             'operation'
//         ]
//     },
//     status: {
//         type: String,
//         enum: ['active', 'inactive'],
//         default: 'active'
//     },

//     lastLogin: Date,

//     avatar: { type: String, default: '' }
// }, { timestamps: true });

// module.exports = mongoose.model('User', UserSchema);



const mongoose = require('mongoose');

// Xóa cache model cũ để Mongoose nạp lại schema có trường roles
if (mongoose.models && mongoose.models.User) {
    delete mongoose.models.User;
}
if (mongoose.modelSchemas && mongoose.modelSchemas.User) {
    delete mongoose.modelSchemas.User;
}

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    password: { type: String, required: true },
    fullName: { type: String, default: '' },
    phone: { type: String, default: '' },
    hometown: { type: String, default: '' },
    yearOfBirth: { type: Number, default: null },
    gender: { type: String, default: '' },
    bankName: { type: String, default: '' },
    bankAccountNumber: { type: String, default: '' },
    
    // Hỗ trợ 1 tài khoản có nhiều vai trò trong hệ thống
    roles: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    }],
    role: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Role'
    },

    department: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    baseSalary: { type: Number, default: 0 },
    hourlyRate: { type: Number, default: 0 },
    slotRate: { type: Number, default: 150000 },
    avatar: { type: String, default: '' },

    // Dữ liệu đăng ký khuôn mặt (Face Recognition)
    isFaceRegistered: { type: Boolean, default: false },
    faceRegisteredAt: { type: Date, default: null },
    facePhoto: { type: String, default: '' },
    // Lưu vector 5 góc khuôn mặt (512D ArcFace/YuNet)
    faceAngles: {
      straight: { type: [Number], default: [] },
      left: { type: [Number], default: [] },
      right: { type: [Number], default: [] },
      up: { type: [Number], default: [] },
      down: { type: [Number], default: [] }
    },
    // Lưu URL/tên tệp ảnh các góc chụp
    faceAnglePhotos: {
      straight: { type: String, default: '' },
      left: { type: String, default: '' },
      right: { type: String, default: '' },
      up: { type: String, default: '' },
      down: { type: String, default: '' }
    },
    faceDescriptor: { type: [Number], default: [] }
}, { timestamps: true });

// Tự động chuẩn hóa roles và role trước khi Mongoose validate để tránh lỗi CastError
UserSchema.pre('validate', async function() {
  try {
    const Role = mongoose.models.Role || require('./role.model');

    // 1. Sanitize field 'role'
    if (this.role && typeof this.role === 'string') {
      const cleanRole = String(this.role).replace(/[\[\]'"`]/g, '').trim();
      if (!/^[0-9a-fA-F]{24}$/.test(cleanRole)) {
        const found = await Role.findOne({ name: { $regex: new RegExp(`^${cleanRole}$`, 'i') } });
        if (found) {
          this.role = found._id;
        } else {
          this.role = undefined;
        }
      }
    }

    // 2. Sanitize field 'roles'
    if (this.roles) {
      let rawArr = [];
      if (Array.isArray(this.roles)) {
        rawArr = this.roles;
      } else if (typeof this.roles === 'string') {
        const clean = String(this.roles).replace(/[\[\]'"`]/g, '').trim();
        rawArr = clean ? clean.split(',').map(s => s.trim()) : [];
      }

      const validRoleIds = [];
      for (let item of rawArr) {
        if (!item) continue;
        const rStr = (typeof item === 'object' && item._id ? String(item._id) : String(item)).replace(/[\[\]'"`]/g, '').trim();
        if (/^[0-9a-fA-F]{24}$/.test(rStr)) {
          validRoleIds.push(new mongoose.Types.ObjectId(rStr));
        } else if (rStr) {
          // Thử tìm role theo name
          const found = await Role.findOne({ name: { $regex: new RegExp(`^${rStr}$`, 'i') } });
          if (found) {
            validRoleIds.push(found._id);
          }
        }
      }

      this.roles = validRoleIds;
      if (!this.role && validRoleIds.length > 0) {
        this.role = validRoleIds[0];
      }
    }
  } catch (_) {}
});

module.exports = mongoose.model('User', UserSchema);

