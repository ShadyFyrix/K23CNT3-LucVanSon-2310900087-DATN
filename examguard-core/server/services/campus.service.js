const Campus = require('../models/campus.model');

exports.createCampus = async (data) => {
  return await Campus.create(data);
};

exports.getCampuses = async () => {
  return await Campus.find().populate('manager', 'fullName email');
};

exports.updateCampus = async (id, data) => {
  return await Campus.findByIdAndUpdate(id, data, { returnDocument: 'after' });
};

exports.deleteCampus = async (id) => {
  return await Campus.findByIdAndDelete(id);
};