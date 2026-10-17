const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');


router.post('/', userController.createUser);

router.get('/', userController.getUsers);

router.get('/:id', userController.getUserById);

router.put('/:id', userController.updateUser);

router.delete('/:id', userController.deleteUser);

// Face registration routes
router.post('/:id/face', userController.registerFace);
router.delete('/:id/face', userController.deleteFace);

module.exports = router;