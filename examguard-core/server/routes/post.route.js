const express = require('express');
const router = express.Router();
const postController = require('../controllers/post.controller');
const authMiddleware = require('../middlewares/authMiddleware');

router.use(authMiddleware);

router.get('/', postController.getPosts);
router.post('/', postController.createPost);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);

router.post('/:id/like', postController.toggleLike);
router.post('/:id/comments', postController.addComment);

module.exports = router;
