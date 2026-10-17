

const Course = require('../models/course.model');

exports.createCourse = async(data)=>{
  return await Course.create(data);
};

exports.getCourses = async(query)=>{
  const { page = 1, limit = 20, search = '', status, category } = query;

  const filter = {};

  // 1. Tìm kiếm theo Tên HOẶC Mã khóa học
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { courseCode: { $regex: search, $options: 'i' } }
    ];
  }

  // 2. Lọc theo trạng thái (active/inactive)
  if (status) {
    filter.status = status;
  }

  // 3. Lọc theo danh mục
  if (category) {
    filter.category = category;
  }

  const courses = await Course
    .find(filter)
    .skip((page - 1) * limit)
    .limit(Number(limit))
    .sort({ createdAt: -1 });

  const total = await Course.countDocuments(filter);

  return {
    data: courses,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / limit)
    }
  };
};

exports.getCourseById = async(id)=>{
  return await Course.findById(id);
};

exports.updateCourse = async(id, data)=>{
  return await Course.findByIdAndUpdate(id, data, { returnDocument: 'after', runValidators: true });
};

exports.deleteCourse = async(id)=>{
  return await Course.findByIdAndDelete(id);
};