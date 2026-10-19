const mongoose = require('mongoose');
const Campus = require('../models/campus.model');
const ExamRoom = require('../models/examRoom.model');
const Room = require('../models/room.model');

async function main() {
  await mongoose.connect('mongodb://localhost:27017/examguard_ai_db');
  console.log('MongoDB connected');

  // Tìm hoặc tạo Campus Hà Nội
  let campus = await Campus.findOne();
  if (!campus) {
    campus = await Campus.create({
      name: 'Cơ sở 1 – Hà Nội',
      address: 'Số 10 Trịnh Văn Bô, Nam Từ Liêm, Hà Nội',
      phone: '024.7300.1866',
      status: 'Active'
    });
    console.log('Created Campus:', campus.name);
  } else {
    console.log('Found Campus:', campus.name, campus._id);
  }

  // Tìm phòng P302 và gắn campus
  let roomP302 = await ExamRoom.findOne({ code: 'P302' });
  if (roomP302) {
    roomP302.campus = campus._id;
    roomP302.name = 'Phòng Lab Máy tính P302';
    roomP302.layoutConfig = {
      aisles: [4],
      entrancePosition: 'TOP_LEFT',
      podiumPosition: 'TOP_CENTER',
      disabledSeats: []
    };
    await roomP302.save();
    console.log('Updated ExamRoom P302 with campus:', campus._id);
  } else {
    roomP302 = await ExamRoom.create({
      code: 'P302',
      name: 'Phòng Lab Máy tính P302',
      campus: campus._id,
      roomType: 'LAB_PC',
      rows: 5,
      cols: 8,
      capacity: 40,
      layoutConfig: {
        aisles: [4],
        entrancePosition: 'TOP_LEFT',
        podiumPosition: 'TOP_CENTER',
        disabledSeats: []
      }
    });
    console.log('Created ExamRoom P302');
  }

  // Đồng bộ tạo thêm 1 phòng phụ để người dùng thấy đa phòng phong phú: LAB01
  let roomLab01 = await ExamRoom.findOne({ code: 'LAB01' });
  if (!roomLab01) {
    roomLab01 = await ExamRoom.create({
      code: 'LAB01',
      name: 'Phòng Lab Công nghệ Cao LAB-01',
      campus: campus._id,
      roomType: 'LAB_PC',
      rows: 4,
      cols: 6,
      capacity: 24,
      layoutConfig: {
        aisles: [3],
        entrancePosition: 'TOP_RIGHT',
        podiumPosition: 'TOP_CENTER',
        disabledSeats: []
      }
    });
    console.log('Created ExamRoom LAB01');
  }

  console.log('ALL DONE!');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
