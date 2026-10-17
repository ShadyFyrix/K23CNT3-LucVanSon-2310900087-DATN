const Student = require('../models/student.model');
const Class = require('../models/class.model');

exports.createStudent = async (data) => {
  const student = await Student.create(data);

  // Nếu có gán lớp học trực tiếp lúc tạo, thêm sinh viên vào danh sách lớp
  if (student.class) {
    await Class.findByIdAndUpdate(student.class, {
      $addToSet: { students: student._id }
    });
  }

  return student;
};

exports.getStudents = async (query) => {
  const { page = 1, limit = query.limit || 50, search = '', department, batch, classId, isFaceKyc, status } = query;

  const filter = {};

  if (search) {
    filter.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { studentCode: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (department) filter.department = department;
  if (batch) filter.batch = batch;
  if (classId) filter.class = classId;
  if (isFaceKyc !== undefined && isFaceKyc !== '') {
    filter.isFaceKyc = isFaceKyc === 'true' || isFaceKyc === true;
  }
  if (status) filter.status = status;

  const isLimitAll = limit === 'all' || limit === '-1' || Number(limit) === -1;
  const numLimit = isLimitAll ? 0 : Number(limit);
  const numSkip = isLimitAll ? 0 : (Number(page) - 1) * numLimit;

  let queryBuilder = Student
    .find(filter)
    .populate('department', 'name code')
    .populate('batch', 'batchCode name academicYear')
    .populate('class', 'name code')
    .populate('userId', 'fullName email avatar isFaceRegistered')
    .sort({ createdAt: -1 });

  if (numSkip > 0) queryBuilder = queryBuilder.skip(numSkip);
  if (numLimit > 0) queryBuilder = queryBuilder.limit(numLimit);

  const students = await queryBuilder;
  const total = await Student.countDocuments(filter);

  return {
    data: students,
    total
  };
};

exports.getStudentById = async (id) => {
  return await Student
    .findById(id)
    .populate('department', 'name code')
    .populate('batch', 'batchCode name academicYear')
    .populate('class', 'name code')
    .populate('userId', 'fullName email avatar isFaceRegistered');
};

exports.updateStudent = async (id, data) => {
  const oldStudent = await Student.findById(id);

  const updatedStudent = await Student.findByIdAndUpdate(
    id,
    data,
    { returnDocument: 'after' }
  );

  // Đồng bộ thay đổi lớp học
  if (data.class && String(oldStudent?.class) !== String(data.class)) {
    if (oldStudent?.class) {
      await Class.findByIdAndUpdate(oldStudent.class, { $pull: { students: id } });
    }
    await Class.findByIdAndUpdate(data.class, { $addToSet: { students: id } });
  }

  return updatedStudent;
};

exports.deleteStudent = async (id) => {
  const student = await Student.findById(id);
  if (student?.class) {
    await Class.findByIdAndUpdate(student.class, { $pull: { students: id } });
  }
  return await Student.findByIdAndDelete(id);
};