const Student = require('../models/student.model');
const Class = require('../models/class.model');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcryptjs');

exports.createStudent = async (data) => {
  const studentEmail = data.email?.toLowerCase().trim();
  const passwordToSet = data.password ? data.password.trim() : '123456';

  if (studentEmail) {
    let studentRole = await Role.findOne({ name: { $regex: /^student$/i } });
    let existingUser = await User.findOne({ email: studentEmail });
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passwordToSet, salt);
      const studentUser = await User.create({
        fullName: data.fullName,
        email: studentEmail,
        password: hashedPassword,
        role: studentRole ? studentRole._id : null,
        roles: studentRole ? [studentRole._id] : [],
        department: 'student',
        status: 'active'
      });
      data.userId = studentUser._id;
    } else {
      data.userId = existingUser._id;
      if (data.password && data.password.trim()) {
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(data.password.trim(), salt);
        await existingUser.save();
      }
    }
  }

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

  // Đồng bộ hoặc tạo User account khi Admin cập nhật mật khẩu/email
  const targetEmail = (data.email || oldStudent?.email)?.toLowerCase().trim();
  if (targetEmail) {
    let userDoc = await User.findOne({
      $or: [
        ...(oldStudent?.userId ? [{ _id: oldStudent.userId }] : []),
        { email: targetEmail }
      ]
    });

    if (data.password && data.password.trim()) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(data.password.trim(), salt);
      if (userDoc) {
        userDoc.password = hashedPassword;
        if (data.fullName) userDoc.fullName = data.fullName;
        if (data.email) userDoc.email = targetEmail;
        await userDoc.save();
        data.userId = userDoc._id;
      } else {
        let studentRole = await Role.findOne({ name: { $regex: /^student$/i } });
        const newUser = await User.create({
          fullName: data.fullName || oldStudent?.fullName,
          email: targetEmail,
          password: hashedPassword,
          role: studentRole ? studentRole._id : null,
          roles: studentRole ? [studentRole._id] : [],
          department: 'student',
          status: 'active'
        });
        data.userId = newUser._id;
      }
    } else if (!userDoc && targetEmail) {
      // Nếu chưa có tài khoản, tự động tạo tài khoản với mật khẩu mặc định 123456
      let studentRole = await Role.findOne({ name: { $regex: /^student$/i } });
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      const newUser = await User.create({
        fullName: data.fullName || oldStudent?.fullName,
        email: targetEmail,
        password: hashedPassword,
        role: studentRole ? studentRole._id : null,
        roles: studentRole ? [studentRole._id] : [],
        department: 'student',
        status: 'active'
      });
      data.userId = newUser._id;
    } else if (userDoc) {
      if (data.fullName) userDoc.fullName = data.fullName;
      if (data.email) userDoc.email = targetEmail;
      await userDoc.save();
      data.userId = userDoc._id;
    }
  }

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

exports.bulkCreateStudentAccounts = async () => {
  const students = await Student.find({});
  let studentRole = await Role.findOne({ name: { $regex: /^student$/i } });
  const salt = await bcrypt.genSalt(10);
  const defaultHash = await bcrypt.hash('123456', salt);

  let createdCount = 0;
  let linkedCount = 0;

  for (const st of students) {
    if (!st.email) continue;
    const email = st.email.toLowerCase().trim();
    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        fullName: st.fullName,
        email,
        password: defaultHash,
        role: studentRole ? studentRole._id : null,
        roles: studentRole ? [studentRole._id] : [],
        department: 'student',
        status: 'active'
      });
      createdCount++;
    }

    if (!st.userId || String(st.userId) !== String(user._id)) {
      st.userId = user._id;
      await st.save();
      linkedCount++;
    }
  }

  return { total: students.length, createdCount, linkedCount, defaultPassword: '123456' };
};

exports.deleteStudent = async (id) => {
  const student = await Student.findById(id);
  if (student?.class) {
    await Class.findByIdAndUpdate(student.class, { $pull: { students: id } });
  }
  return await Student.findByIdAndDelete(id);
};