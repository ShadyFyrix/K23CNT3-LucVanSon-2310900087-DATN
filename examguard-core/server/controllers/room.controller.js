const roomService = require('../services/room.service');

exports.createRoom = async (req, res) => {
  try {
    const data = await roomService.createRoom(req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getRooms = async (req, res) => {
  try {
    const data = await roomService.getRooms(req.query);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateRoom = async (req, res) => {
  try {
    const data = await roomService.updateRoom(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteRoom = async (req, res) => {
  try {
    await roomService.deleteRoom(req.params.id);
    res.json({ success: true, message: "Room deleted" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};