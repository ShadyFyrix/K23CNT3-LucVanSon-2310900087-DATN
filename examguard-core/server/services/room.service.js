const Room = require('../models/room.model');

exports.createRoom = async (data) => {
  return await Room.create(data);
};

exports.getRooms = async (query = {}) => {
  const filter = {};
  if (query.campus) filter.campus = query.campus;
  return await Room.find(filter).populate('campus', 'name');
};

exports.updateRoom = async (id, data) => {
  return await Room.findByIdAndUpdate(id, data, { returnDocument: 'after' });
};

exports.deleteRoom = async (id) => {
  return await Room.findByIdAndDelete(id);
};