const userService = require('../services/user.service');


exports.createUser = async(req,res)=>{
  try{

    const user = await userService.createUser(req.body);

    res.json({
      success:true,
      data:user
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};


exports.getUsers = async(req,res)=>{
  try{

    const data = await userService.getUsers(req.query);

    res.json({
      success:true,
      ...data
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};


exports.getUserById = async(req,res)=>{
  try{

    const data = await userService.getUserById(req.params.id);

    res.json({
      success:true,
      data
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};


exports.updateUser = async(req,res)=>{
  try{

    const data = await userService.updateUser(
      req.params.id,
      req.body
    );

    res.json({
      success:true,
      data
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};


exports.deleteUser = async(req,res)=>{
  try{

    await userService.deleteUser(req.params.id);

    res.json({
      success:true
    });

  }catch(err){
    res.status(500).json({
      success:false,
      message:err.message
    });
  }
};


exports.registerFace = async (req, res) => {
  try {
    const data = await userService.registerFace(req.params.id, req.body);
    // Đồng bộ lại danh sách khuôn mặt trong bộ nhớ của Python Face AI
    try {
      const faceAiService = require('../services/faceAi.service');
      await faceAiService.clearAllFaces();
    } catch (_) {}
    res.json({
      success: true,
      message: 'Đăng ký khuôn mặt thành công',
      data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};


exports.deleteFace = async (req, res) => {
  try {
    const data = await userService.deleteFace(req.params.id);
    // Đồng thời gọi sang faceAiService để xoá vector trong Python Face AI
    try {
      const faceAiService = require('../services/faceAi.service');
      await faceAiService.deleteFace(req.params.id);
    } catch (_) {}
    res.json({
      success: true,
      message: 'Đã xóa dữ liệu khuôn mặt',
      data
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};