const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });
const connectDB = require('../configs/db');

async function main() {
  console.log('🚀 Đang khởi động tiến trình tạo và khởi tạo CSDL mới cho ExamGuard AI...');
  console.log(`📌 MONGO_URI mục tiêu: ${process.env.MONGO_URI}`);
  
  await connectDB();

  const collections = await mongoose.connection.db.listCollections().toArray();
  console.log('📋 Danh sách Collections hiện tại trong CSDL mới:');
  collections.forEach(c => console.log(`   - ${c.name}`));

  console.log('✨ Khởi tạo cơ sở dữ liệu ExamGuard AI thành công 100%!');
  process.exit(0);
}

main().catch(err => {
  console.error('❌ Lỗi khởi tạo DB:', err);
  process.exit(1);
});
