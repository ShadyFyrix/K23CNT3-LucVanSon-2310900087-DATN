const Department = require('../models/department.model');
require('../models/teacher.model');

class DepartmentService {
  async getAllDepartments() {
    return await Department.find()
      .populate('head', 'fullName email avatar')
      .populate('members', 'fullName email avatar');
  }

  async getDepartmentById(id) {
    return await Department.findById(id)
      .populate('head', 'fullName email avatar')
      .populate('members', 'fullName email avatar');
  }

  async createDepartment(data) {
    return await new Department(data).save();
  }

  async updateDepartment(id, data) {
    return await Department.findByIdAndUpdate(id, data, { returnDocument: 'after' });
  }

  async deleteDepartment(id) {
    return await Department.findByIdAndDelete(id);
  }

  async addMember(deptId, userId) {
    return await Department.findByIdAndUpdate(
      deptId,
      { $addToSet: { members: userId } },
      { returnDocument: 'after' }
    );
  }
}

module.exports = new DepartmentService();
