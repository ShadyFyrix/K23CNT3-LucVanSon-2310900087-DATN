const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  campus: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Campus', 
    required: true 
  },
  name: { type: String, required: true },
  capacity: { type: Number, default: 20 },
  type: { 
    type: String, 
    enum: ['Theory', 'Lab', 'Meeting'], 
    default: 'Theory' 
  },
  note: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Room', RoomSchema);