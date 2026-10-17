const Post = require('../models/post.model');
const { getUserRoleNames, userHasAnyRole } = require('../utils/roleHelper');

// 1. Lấy danh sách tin tức (Lọc theo phân quyền người xem)
exports.getPosts = async (req, res) => {
  try {
    const { category, search, isPinned } = req.query;
    const userId = req.user._id.toString();
    const userDept = req.user.department || '';
    const userRoleNames = getUserRoleNames(req.user);
    const isAdmin = userHasAnyRole(req.user, ['admin', 'superadmin', 'manager']);

    const filter = {};

    if (category && category !== 'all') {
      filter.category = category;
    }

    if (isPinned === 'true') {
      filter.isPinned = true;
    }

    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } }
      ];
    }

    // Nếu không phải Admin, lọc tin theo Target Audience (Công khai, theo phòng ban, theo vai trò, hoặc chỉ định cá nhân)
    if (!isAdmin) {
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [
          { targetType: 'all' },
          { author: req.user._id },
          { targetType: 'department', targetDepartments: userDept },
          { targetType: 'roles', targetRoles: { $in: userRoleNames } },
          { targetType: 'users', targetUsers: req.user._id }
        ]
      });
    }

    const posts = await Post.find(filter)
      .populate('author', 'fullName email avatar department role roles')
      .populate('comments.user', 'fullName email avatar')
      .populate('targetUsers', 'fullName email')
      .sort({ isPinned: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error('Lỗi lấy bản tin:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi lấy dữ liệu bản tin',
      error: error.message
    });
  }
};

// 2. Đăng tin mới
exports.createPost = async (req, res) => {
  try {
    const {
      title,
      content,
      category = 'announcement',
      isPinned = false,
      targetType = 'all',
      targetDepartments = [],
      targetRoles = [],
      targetUsers = [],
      attachments = []
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập tiêu đề và nội dung bản tin'
      });
    }

    const post = await Post.create({
      title,
      content,
      category,
      isPinned,
      author: req.user._id,
      targetType,
      targetDepartments,
      targetRoles,
      targetUsers,
      attachments
    });

    const populated = await Post.findById(post._id)
      .populate('author', 'fullName email avatar department role roles')
      .populate('targetUsers', 'fullName email');

    return res.status(201).json({
      success: true,
      message: 'Đã đăng bản tin doanh nghiệp thành công!',
      data: populated
    });
  } catch (error) {
    console.error('Lỗi tạo bản tin:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi đăng bản tin',
      error: error.message
    });
  }
};

// 3. Cập nhật bản tin
exports.updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const isAdmin = userHasAnyRole(req.user, ['admin', 'superadmin']);
    if (post.author.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền chỉnh sửa tin bài này'
      });
    }

    const updated = await Post.findByIdAndUpdate(id, { $set: req.body }, { returnDocument: 'after' })
      .populate('author', 'fullName email avatar department role roles')
      .populate('comments.user', 'fullName email avatar');

    return res.status(200).json({
      success: true,
      message: 'Cập nhật bản tin thành công',
      data: updated
    });
  } catch (error) {
    console.error('Lỗi cập nhật bản tin:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi cập nhật bài viết',
      error: error.message
    });
  }
};

// 4. Xóa bài viết
exports.deletePost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const isAdmin = userHasAnyRole(req.user, ['admin', 'superadmin']);
    if (post.author.toString() !== req.user._id.toString() && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xóa tin bài này'
      });
    }

    await Post.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Đã xóa bản tin thành công'
    });
  } catch (error) {
    console.error('Lỗi xóa bản tin:', error);
    return res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi xóa bài viết',
      error: error.message
    });
  }
};

// 5. Thả tim / Bỏ thả tim bài viết
exports.toggleLike = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    const hasLiked = post.likes.includes(userId);
    if (hasLiked) {
      post.likes = post.likes.filter(u => u.toString() !== userId.toString());
    } else {
      post.likes.push(userId);
    }

    await post.save();
    return res.status(200).json({
      success: true,
      liked: !hasLiked,
      likesCount: post.likes.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi khi tương tác bài viết',
      error: error.message
    });
  }
};

// 6. Bình luận bài viết
exports.addComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nội dung bình luận không được để trống'
      });
    }

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy bài viết'
      });
    }

    post.comments.push({
      user: req.user._id,
      content: content.trim(),
      createdAt: new Date()
    });

    await post.save();
    const updated = await Post.findById(id).populate('comments.user', 'fullName email avatar');

    return res.status(200).json({
      success: true,
      message: 'Đã thêm bình luận',
      data: updated.comments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Lỗi thêm bình luận',
      error: error.message
    });
  }
};
