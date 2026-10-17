const mongoose = require('mongoose');
const Class = require('../models/class.model');
const Student = require('../models/student.model');

exports.createClass = async (data) => {
  return await Class.create(data);
};

exports.getClasses = async (query) => {
  const { page = 1, limit = 50, department, batch, course, status, search = '' } = query;
  const filter = {};

  if (department) filter.department = department;
  if (batch) filter.batch = batch;
  if (course) filter.course = course;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { code: { $regex: search, $options: 'i' } }
    ];
  }

  const isLimitAll = limit === 'all' || limit === '-1' || Number(limit) === -1;
  const numLimit = isLimitAll ? 0 : Number(limit);
  const numSkip = isLimitAll ? 0 : (Number(page) - 1) * numLimit;

  let queryBuilder = Class
    .find(filter)
    .populate('batch', 'batchCode name academicYear')
    .populate('department', 'name code')
    .populate('advisor', 'fullName email teacherCode')
    .populate('course', 'name courseCode credits')
    .sort({ createdAt: -1 });

  if (numSkip > 0) queryBuilder = queryBuilder.skip(numSkip);
  if (numLimit > 0) queryBuilder = queryBuilder.limit(numLimit);

  const classes = await queryBuilder;
  const total = await Class.countDocuments(filter);

  const dataWithCount = classes.map((cls) => {
    const obj = cls.toObject ? cls.toObject() : cls;
    return {
      ...obj,
      studentCount: Array.isArray(obj.students) ? obj.students.length : 0,
      completedSessions: 0
    };
  });

  return {
    data: dataWithCount,
    total
  };
};

exports.getClassById = async (id) => {
  return await Class
    .findById(id)
    .populate('batch', 'batchCode name academicYear')
    .populate('department', 'name code')
    .populate('advisor', 'fullName email teacherCode')
    .populate('course', 'name courseCode credits')
    .populate('students', 'studentCode fullName email phone avatar isFaceKyc status');
};

exports.updateClass = async (id, data) => {
  return await Class.findByIdAndUpdate(id, data, { returnDocument: 'after' });
};

exports.deleteClass = async (id) => {
  return await Class.findByIdAndDelete(id);
};

// Thêm sinh viên vào lớp học
exports.addStudentToClass = async (classId, studentId) => {
  const updatedClass = await Class.findByIdAndUpdate(
    classId,
    { $addToSet: { students: studentId } },
    { returnDocument: 'after' }
  );

  // Cập nhật lớp học cho sinh viên tương ứng
  await Student.findByIdAndUpdate(studentId, { class: classId });

  return updatedClass;
};

// Xóa sinh viên khỏi lớp học
exports.removeStudentFromClass = async (classId, studentId) => {
  const updatedClass = await Class.findByIdAndUpdate(
    classId,
    { $pull: { students: studentId } },
    { returnDocument: 'after' }
  );

  await Student.findByIdAndUpdate(studentId, { $unset: { class: 1 } });

  return updatedClass;
};

// Chi tiết lớp học
exports.getClassDetails = async (classId) => {
  return await Class.findById(classId)
    .populate('batch')
    .populate('department')
    .populate('advisor')
    .populate('course')
    .populate('students', 'studentCode fullName email phone avatar isFaceKyc status');
};

// Danh sách sinh viên thuộc lớp
exports.getClassStudentsWithAttendance = async (classId) => {
  const cls = await Class.findById(classId).populate({
    path: 'students',
    select: 'studentCode fullName email phone avatar isFaceKyc status note gender birthday'
  });

  if (!cls || !cls.students) return [];

  return cls.students.map(st => {
    const sObj = st.toObject ? st.toObject() : st;
    return {
      ...sObj,
      attendance: {
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        excusedCount: 0,
        totalSessions: 0
      }
    };
  });
};