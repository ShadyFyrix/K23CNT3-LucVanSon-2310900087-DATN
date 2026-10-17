const Teacher = require('../models/teacher.model');

exports.createTeacher = async (data) => {

  const payload = { ...data };

  // Xóa các trường rỗng để tránh lỗi duplicate key (teacherCode) và CastError (birthday)
  if (!payload.teacherCode || payload.teacherCode.trim() === '') {
    delete payload.teacherCode;
  }
  if (!payload.birthday || payload.birthday.trim() === '') {
    delete payload.birthday;
  }

  return await Teacher.create(payload);

};


exports.getTeachers = async (query) => {

  const { page = 1, limit = 20, search = '' } = query;

  const filter = {};

  if (search) {
    filter.fullName = { $regex: search, $options: 'i' };
  }

  const teachers = await Teacher
    .find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Teacher.countDocuments(filter);

  return {
    data: teachers,
    total
  };

};


exports.getTeacherById = async (id) => {

  return await Teacher.findById(id);

};


exports.updateTeacher = async (id, data) => {

  const payload = { ...data };

  if (payload.teacherCode === '') {
    // Để an toàn, thay vì delete (không update), ta có thể delete để bỏ qua nếu nó rỗng
    // Hoặc $unset nếu muốn xóa hoàn toàn (tuỳ logic, nhưng với sparse thì xoá khỏi payload là an toàn nhất)
    delete payload.teacherCode;
  }
  if (payload.birthday === '') {
    delete payload.birthday;
  }

  return await Teacher.findByIdAndUpdate(
    id,
    payload,
    { returnDocument: 'after' }
  );

};


exports.deleteTeacher = async (id) => {

  return await Teacher.findByIdAndDelete(id);

};