const classService = require('../services/class.service');

exports.createClass = async(req,res)=>{
  try{

    const data = await classService.createClass(req.body);

    res.json({
      success:true,
      data
    });

  }catch(err){
    res.status(500).json({message:err.message});
  }
};


exports.getClasses = async(req,res)=>{
  try{

    const data = await classService.getClasses(req.query);

    res.json({
      success:true,
      ...data
    });

  }catch(err){
    res.status(500).json({message:err.message});
  }
};


exports.getClassById = async(req,res)=>{
  try{

    const data = await classService.getClassById(req.params.id);

    res.json({
      success:true,
      data
    });

  }catch(err){
    res.status(500).json({message:err.message});
  }
};


exports.updateClass = async(req,res)=>{
  try{

    const data = await classService.updateClass(
      req.params.id,
      req.body
    );

    res.json({
      success:true,
      data
    });

  }catch(err){
    res.status(500).json({message:err.message});
  }
};


exports.deleteClass = async(req,res)=>{
  try{

    await classService.deleteClass(req.params.id);

    res.json({
      success:true
    });

  }catch(err){
    res.status(500).json({message:err.message});
  }
};



// ... (Các hàm cũ như create, update, delete giữ nguyên)

// Thêm học sinh vào lớp
exports.addStudent = async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        
        const updatedClass = await classService.addStudentToClass(classId, studentId);
        
        res.json({
            success: true,
            message: "Đã thêm học sinh vào lớp",
            data: updatedClass
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Xóa học sinh khỏi lớp
exports.removeStudent = async (req, res) => {
    try {
        const { classId } = req.params;
        const { studentId } = req.body;
        
        const updatedClass = await classService.removeStudentFromClass(classId, studentId);
        
        res.json({
            success: true,
            message: "Đã xóa học sinh khỏi lớp",
            data: updatedClass
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// Lấy danh sách học sinh của một lớp (với populate chi tiết và thống kê điểm danh)
exports.getClassStudents = async (req, res) => {
    try {
        const { classId } = req.params;
        const students = await classService.getClassStudentsWithAttendance(classId);
        
        res.json({
            success: true,
            data: students
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};