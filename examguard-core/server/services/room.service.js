const Room = require('../models/room.model');
const ExamRoom = require('../models/examRoom.model');

exports.createRoom = async (data) => {
  const code = (data.code || data.name.replace(/\s+/g, '')).toUpperCase();
  const rows = Number(data.rows) || 5;
  const cols = Number(data.cols) || 8;
  const capacity = Number(data.capacity) || (rows * cols);

  // Tạo ExamRoom phục vụ trực tiếp cho Khảo thí và Giám sát AI
  let examRoom = await ExamRoom.findOne({ code });
  if (!examRoom) {
    examRoom = await ExamRoom.create({
      code,
      name: data.name,
      campus: data.campus,
      rows,
      cols,
      capacity,
      roomType: data.type === 'Lab' ? 'LAB_PC' : (data.roomType || 'ONLINE_QUIZ'),
      layoutConfig: {
        aisles: data.aisles || [Math.floor(cols / 2)],
        entrancePosition: data.entrancePosition || 'TOP_LEFT',
        podiumPosition: data.podiumPosition || 'TOP_CENTER',
        disabledSeats: []
      }
    });
  } else {
    examRoom.campus = data.campus;
    examRoom.name = data.name;
    examRoom.capacity = capacity;
    examRoom.rows = rows;
    examRoom.cols = cols;
    await examRoom.save();
  }

  // Lưu record vào Room model
  try {
    await Room.findOneAndUpdate(
      { name: data.name, campus: data.campus },
      { campus: data.campus, name: data.name, capacity, type: data.type || 'Lab', note: data.note || '' },
      { upsert: true, new: true }
    );
  } catch (e) {}

  return examRoom;
};

exports.getRooms = async (query = {}) => {
  const filter = { isActive: { $ne: false } };
  if (query.campus) filter.campus = query.campus;

  const examRooms = await ExamRoom.find(filter).populate('campus', 'name address');
  
  // Format để tương thích cả trang Quản lý Cơ sở lẫn Khảo thí
  return examRooms.map(r => ({
    _id: r._id,
    code: r.code,
    name: r.name,
    capacity: r.capacity || (r.rows * r.cols),
    rows: r.rows || 5,
    cols: r.cols || 8,
    type: r.roomType || 'LAB_PC',
    campus: r.campus ? (r.campus._id || r.campus) : null,
    campusDetail: r.campus,
    layoutConfig: r.layoutConfig || {
      aisles: [4],
      entrancePosition: 'TOP_LEFT',
      podiumPosition: 'TOP_CENTER',
      disabledSeats: []
    }
  }));
};

exports.updateRoom = async (id, data) => {
  if (data.rows && data.cols) {
    data.capacity = data.rows * data.cols;
  }
  const examRoom = await ExamRoom.findByIdAndUpdate(id, data, { new: true });
  try {
    await Room.findByIdAndUpdate(id, data);
  } catch (e) {}
  return examRoom;
};

exports.deleteRoom = async (id) => {
  await ExamRoom.findByIdAndUpdate(id, { isActive: false });
  try {
    await Room.findByIdAndDelete(id);
  } catch (e) {}
  return { success: true };
};