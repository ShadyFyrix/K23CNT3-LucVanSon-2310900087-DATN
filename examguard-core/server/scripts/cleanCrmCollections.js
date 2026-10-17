const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const CRM_COLLECTIONS_TO_DROP = [
  'leads',
  'leadactivities',
  'leadtests',
  'leadsources',
  'appointments',
  'campaigns',
  'tuitions',
  'transactions',
  'bankaccounts',
  'operatingexpenses',
  'payrolls',
  'payrollextras',
  'receptionistattendances',
  'shiftattendances',
  'timekeepings',
  'teacherattendances',
  'teacherselfattendances',
  'graderecords',
  'gradecategories',
  'syllabuses',
  'employees',
  'salaryhistories',
  'projects',
  'tasks',
  'taskactivities',
  'taskstatuses',
  'groups',
  'workschedules',
  'banners',
  'enrollments',
  'payments'
];

async function cleanup() {
  console.log('🧹 Bắt đầu dọn dẹp các collection CRM/Sales...');
  const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/examguard_ai_db');
  console.log(`Connected to: ${conn.connection.name}`);

  const collections = await conn.connection.db.listCollections().toArray();
  const existingNames = collections.map(c => c.name);

  for (const name of CRM_COLLECTIONS_TO_DROP) {
    if (existingNames.includes(name)) {
      try {
        await conn.connection.db.dropCollection(name);
        console.log(`🗑️ Đã xóa collection CRM: ${name}`);
      } catch (e) {
        console.warn(`Không thể xóa ${name}:`, e.message);
      }
    }
  }

  // Thử drop database cũ crm_deepcode_db nếu tồn tại
  try {
    const adminDb = conn.connection.db.admin();
    const dbs = await adminDb.listDatabases();
    const hasOldDb = dbs.databases.some(d => d.name === 'crm_deepcode_db');
    if (hasOldDb) {
      console.log('⚠️ Phát hiện CSDL cũ crm_deepcode_db, tiến hành drop...');
      const oldConn = await mongoose.createConnection('mongodb://127.0.0.1:27017/crm_deepcode_db').asPromise();
      await oldConn.dropDatabase();
      await oldConn.close();
      console.log('✅ Đã DROP hoàn toàn CSDL cũ crm_deepcode_db!');
    } else {
      console.log('ℹ️ Không còn CSDL cũ crm_deepcode_db trên server.');
    }
  } catch (err) {
    console.warn('Ghi chú khi xóa DB cũ:', err.message);
  }

  const remaining = await conn.connection.db.listCollections().toArray();
  console.log('\n📋 DANH SÁCH COLLECTIONS CHÍNH THỨC CỦA EXAMGUARD AI:');
  remaining.forEach(c => console.log(`   ✨ ${c.name}`));

  await mongoose.disconnect();
  console.log('\n🎉 Hoàn tất dọn dẹp cơ sở dữ liệu!');
}

cleanup().catch(console.error);
