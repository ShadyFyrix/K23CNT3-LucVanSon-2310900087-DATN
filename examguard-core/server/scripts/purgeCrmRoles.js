const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

async function purgeRoles() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/examguard_ai_db');
  const rolesCollection = mongoose.connection.db.collection('roles');
  const usersCollection = mongoose.connection.db.collection('users');

  const crmRoles = ['receptionist', 'counselor', 'accountant', 'investor', 'Nhân sự thời vụ', 'sales', 'cskh'];
  const res = await rolesCollection.deleteMany({ name: { $in: crmRoles } });
  console.log('✅ Đã xóa các Role CRM:', res.deletedCount);

  // Tìm role academic để gán cho các user cũ bị mất role
  const academicRole = await rolesCollection.findOne({ name: 'academic' });
  const remainingRoles = await rolesCollection.find({}).toArray();
  const validRoleIds = remainingRoles.map(r => r._id);

  // Cập nhật các user đang trỏ vào role không hợp lệ
  if (academicRole) {
    const updateRes = await usersCollection.updateMany(
      { role: { $nin: validRoleIds } },
      { $set: { role: academicRole._id, roles: [academicRole._id] } }
    );
    console.log('✅ Đã chuẩn hóa người dùng sang vai trò hợp lệ:', updateRes.modifiedCount);
  }

  const finalRoles = await rolesCollection.find({}).toArray();
  console.log('📋 DANH SÁCH VAI TRÒ CHUẨN CỦA EXAMGUARD AI:');
  for (const r of finalRoles) {
    const uCount = await usersCollection.countDocuments({ role: r._id });
    console.log(`   - [${r.name}] (${r.description}) -> ${uCount} nhân sự`);
  }

  await mongoose.disconnect();
}

purgeRoles().catch(console.error);
