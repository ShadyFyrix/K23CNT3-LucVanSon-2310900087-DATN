const mongoose = require('mongoose');

const CampusSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  address: { type: String, required: true },
  phone: { type: String },
  manager: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  status: { 
    type: String, 
    enum: ['Active', 'Inactive'], 
    default: 'Active' 
  }
}, { timestamps: true });

module.exports = mongoose.model('Campus', CampusSchema);