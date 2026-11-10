const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const authMiddleware = require('../middlewares/authMiddleware');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

// Optional auth: parse user if token present, but don't reject guests
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.token;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'examguard_super_secret_jwt_key_2026');
      const user = await User.findById(decoded.id).select('-password');
      if (user) req.user = user;
    }
  } catch (_) {
    // continue as guest
  }
  next();
};

router.get('/', optionalAuth, postController.getPosts);
router.post('/', authMiddleware, postController.createPost);
router.put('/:id', authMiddleware, postController.updatePost);
router.delete('/:id', authMiddleware, postController.deletePost);

router.post('/:id/like', authMiddleware, postController.toggleLike);
router.post('/:id/comments', authMiddleware, postController.addComment);

module.exports = router;
