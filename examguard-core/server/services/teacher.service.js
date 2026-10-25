const Teacher = require('../models/teacher.model');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const bcrypt = require('bcryptjs');

exports.createTeacher = async (data) => {
  const payload = { ...data };

  // Xóa các trường rỗng để tránh lỗi duplicate key (teacherCode) và CastError (birthday)
  if (!payload.teacherCode || payload.teacherCode.trim() === '') {
    delete payload.teacherCode;
  }
  if (!payload.birthday || (typeof payload.birthday === 'string' && payload.birthday.trim() === '')) {
    delete payload.birthday;
  }

  const teacherEmail = payload.email?.toLowerCase().trim();
  const passwordToSet = payload.password ? payload.password.trim() : '123456';

  if (teacherEmail) {
    let teacherRole = await Role.findOne({ name: { $regex: /^teacher$/i } });
    if (!teacherRole) {
      teacherRole = await Role.findOne({ code: 'teacher' });
    }
    let existingUser = await User.findOne({ email: teacherEmail });
    if (!existingUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(passwordToSet, salt);
      const teacherUser = await User.create({
        fullName: payload.fullName || payload.name,
        email: teacherEmail,
        password: hashedPassword,
        role: teacherRole ? teacherRole._id : null,
        roles: teacherRole ? [teacherRole._id] : [],
        department: payload.department || 'Giảng viên',
        status: 'active'
      });
      payload.userId = teacherUser._id;
    } else {
      payload.userId = existingUser._id;
      if (payload.password && payload.password.trim()) {
        const salt = await bcrypt.genSalt(10);
        existingUser.password = await bcrypt.hash(payload.password.trim(), salt);
        await existingUser.save();
      }
    }
  }

  return await Teacher.create(payload);
};

exports.getTeachers = async (query) => {
  const { page = 1, limit = 20, search = '' } = query;
  const filter = {};

  if (search) {
    filter.fullName = { $regex: search, $options: 'i' };
  }

  const queryBuilder = Teacher.find(filter)
    .populate('userId', 'email username status isFaceRegistered')
    .populate('department')
    .sort({ createdAt: -1 });

  if (limit !== 'all') {
    queryBuilder.skip((Number(page) - 1) * Number(limit)).limit(Number(limit));
  }

  const teachers = await queryBuilder;
  const total = await Teacher.countDocuments(filter);

  return {
    data: teachers,
    total
  };
};

exports.getTeacherById = async (id) => {
  return await Teacher.findById(id).populate('userId').populate('department');
};

exports.updateTeacher = async (id, data) => {
  const payload = { ...data };

  if (payload.teacherCode === '') {
    delete payload.teacherCode;
  }
  if (payload.birthday === '') {
    delete payload.birthday;
  }

  const teacher = await Teacher.findById(id);
  if (!teacher) {
    throw new Error('Không tìm thấy giảng viên');
  }

  // Nếu Admin đổi mật khẩu hoặc cấp tài khoản
  if (payload.password && payload.password.trim()) {
    let teacherRole = await Role.findOne({ name: { $regex: /^teacher$/i } });
    if (!teacherRole) teacherRole = await Role.findOne({ code: 'teacher' });

    let user = null;
    if (teacher.userId) {
      user = await User.findById(teacher.userId);
    }
    if (!user && (payload.email || teacher.email)) {
      user = await User.findOne({ email: (payload.email || teacher.email).toLowerCase().trim() });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(payload.password.trim(), salt);

    if (user) {
      user.password = hashedPassword;
      if (!user.role && teacherRole) user.role = teacherRole._id;
      await user.save();
      payload.userId = user._id;
    } else {
      const emailToUse = (payload.email || teacher.email).toLowerCase().trim();
      const newUser = await User.create({
        fullName: payload.fullName || teacher.fullName,
        email: emailToUse,
        password: hashedPassword,
        role: teacherRole ? teacherRole._id : null,
        roles: teacherRole ? [teacherRole._id] : [],
        department: 'Giảng viên',
        status: 'active'
      });
      payload.userId = newUser._id;
    }
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

exports.bulkCreateTeacherAccounts = async () => {
  let teacherRole = await Role.findOne({ name: { $regex: /^teacher$/i } });
  if (!teacherRole) teacherRole = await Role.findOne({ code: 'teacher' });

  const teachers = await Teacher.find();
  let createdCount = 0;
  let linkedCount = 0;

  for (const t of teachers) {
    let user = null;
    if (t.userId) {
      user = await User.findById(t.userId);
    }
    if (!user && t.email) {
      user = await User.findOne({ email: t.email.toLowerCase().trim() });
    }

    if (!user && t.email) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('123456', salt);
      user = await User.create({
        fullName: t.fullName || t.name,
        email: t.email.toLowerCase().trim(),
        password: hashedPassword,
        role: teacherRole ? teacherRole._id : null,
        roles: teacherRole ? [teacherRole._id] : [],
        department: 'Giảng viên',
        status: 'active'
      });
      t.userId = user._id;
      await t.save();
      createdCount++;
    } else if (user) {
      if (!t.userId || t.userId.toString() !== user._id.toString()) {
        t.userId = user._id;
        await t.save();
        linkedCount++;
      }
    }
  }

  return {
    totalTeachers: teachers.length,
    createdAccounts: createdCount,
    linkedAccounts: linkedCount,
    defaultPassword: '123456'
  };
};