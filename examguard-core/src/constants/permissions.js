// src/constants/permissions.js
/**
 * EXAMGUARD AI — HỆ THỐNG QUẢN LÝ THI TRỰC TUYẾN & GIÁM SÁT THÔNG MINH
 * Ma trận phân quyền RBAC chuẩn theo SYSTEM_BLUEPRINT.md
 */

export const SUPER_ADMIN = 'all';

export const PERMISSIONS = {
  SUPER_ADMIN: 'all',

  // 1. Nhóm Tổng quan & Báo cáo Khảo thí
  DASHBOARD: {
    VIEW: 'dashboard.view',
    REPORTS: 'reports.view',
  },
  POSTS: {
    VIEW: 'posts.view',
    MANAGE: 'posts.manage',
  },

  // 2. Nhóm Quản lý Đào tạo (Khoa - Khóa - Lớp - Môn - Sinh viên - Giảng viên)
  ORG: {
    MANAGE: 'org.manage',
  },
  DEPARTMENTS: {
    MANAGE: 'departments.manage',
  },
  BATCHES: {
    MANAGE: 'batches.manage',
  },
  CLASSES: {
    VIEW: 'classes.view',
    MANAGE: 'classes.manage',
  },
  COURSES: {
    VIEW: 'courses.view',
    MANAGE: 'courses.manage',
  },
  STUDENTS: {
    VIEW: 'students.view',
    MANAGE: 'students.manage',
  },
  TEACHERS: {
    VIEW: 'teachers.view',
    MANAGE: 'teachers.manage',
  },
  ROOMS: {
    VIEW: 'rooms.view',
    MANAGE: 'rooms.manage',
  },

  // 3. Nhóm Khảo thí & Tổ chức Thi
  EXAMS: {
    VIEW: 'exams.view',
    MANAGE: 'exams.manage',
  },
  PAPERS: {
    VIEW: 'papers.view',
    MANAGE: 'papers.manage',
  },
  STUDENT_EXAM: {
    TAKE: 'exam.take',
    RESULT: 'exam.result',
  },

  // 4. Nhóm Giám sát AI & Coi thi
  PROCTOR: {
    LIVE: 'proctor.live',
    OVERRIDE: 'proctor.override',
  },
  FACE: {
    KYC: 'face.kyc',
  },

  // 5. Nhóm Chấm thi & Duyệt điểm
  GRADING: {
    REVIEW: 'grading.review',
    ADJUST: 'grading.adjust',
    APPROVE: 'grading.approve',
  },

  // 6. Nhóm Hệ thống
  USERS: {
    MANAGE: 'users.manage',
  },
  PERMISSIONS: {
    MANAGE: 'permissions.manage',
  },
  SETTINGS: {
    EDIT: 'settings.edit',
  }
};

export const PERMISSION_GROUPS = [
  {
    title: 'Tổng quan & Báo cáo Khảo thí',
    permissions: [
      { id: PERMISSIONS.DASHBOARD.VIEW, name: 'Xem Dashboard khảo thí tổng quan' },
      { id: PERMISSIONS.DASHBOARD.REPORTS, name: 'Xem báo cáo vi phạm & phổ điểm thi' },
      { id: PERMISSIONS.POSTS.VIEW, name: 'Xem bản tin & thông báo khảo thí' },
      { id: PERMISSIONS.POSTS.MANAGE, name: 'Đăng & quản lý thông báo khảo thí' },
    ]
  },
  {
    title: 'Khảo thí & Tổ chức Thi',
    permissions: [
      { id: PERMISSIONS.EXAMS.VIEW, name: 'Xem lịch thi & danh sách ca thi' },
      { id: PERMISSIONS.EXAMS.MANAGE, name: 'Tạo lập, lập lịch ca thi & gán phòng thi' },
      { id: PERMISSIONS.PAPERS.VIEW, name: 'Xem ngân hàng đề thi' },
      { id: PERMISSIONS.PAPERS.MANAGE, name: 'Soạn thảo đề thi trắc nghiệm & cấu hình đáp án' },
      { id: PERMISSIONS.STUDENT_EXAM.TAKE, name: 'Thí sinh vào phòng thi & làm bài thi trực tuyến' },
      { id: PERMISSIONS.STUDENT_EXAM.RESULT, name: 'Thí sinh tra cứu kết quả thi & xem đối chiếu đáp án' },
    ]
  },
  {
    title: 'Giám sát AI & Coi thi Trực tiếp',
    permissions: [
      { id: PERMISSIONS.PROCTOR.LIVE, name: 'Giám thị theo dõi Camera & Phòng thi 3D Realtime' },
      { id: PERMISSIONS.PROCTOR.OVERRIDE, name: 'Giám thị xử lý vi phạm, đình chỉ thi & ghi chú thanh tra' },
      { id: PERMISSIONS.FACE.KYC, name: 'Đăng ký khuôn mặt (Face ID KYC) & kiểm tra danh tính' },
    ]
  },
  {
    title: 'Chấm thi & Phê duyệt Điểm',
    permissions: [
      { id: PERMISSIONS.GRADING.REVIEW, name: 'Rà soát 1 lần kết quả bài thi sau khi AI chấm tự động' },
      { id: PERMISSIONS.GRADING.ADJUST, name: 'Cán bộ chấm thi điều chỉnh điểm sau rà soát' },
      { id: PERMISSIONS.GRADING.APPROVE, name: 'Phê duyệt & công bố điểm thi chính thức kèm đáp án' },
    ]
  },
  {
    title: 'Quản lý Đào tạo (Khoa - Khóa - Lớp - Môn - Sinh viên - Giảng viên)',
    permissions: [
      { id: PERMISSIONS.CLASSES.VIEW, name: 'Xem danh sách lớp học' },
      { id: PERMISSIONS.CLASSES.MANAGE, name: 'Quản lý lớp học & phân bổ sinh viên' },
      { id: PERMISSIONS.COURSES.VIEW, name: 'Xem danh mục học phần / môn thi' },
      { id: PERMISSIONS.COURSES.MANAGE, name: 'Quản lý học phần, số tín chỉ & đề cương' },
      { id: PERMISSIONS.STUDENTS.VIEW, name: 'Xem danh sách sinh viên / thí sinh' },
      { id: PERMISSIONS.STUDENTS.MANAGE, name: 'Quản lý hồ sơ & thông tin sinh viên' },
      { id: PERMISSIONS.TEACHERS.VIEW, name: 'Xem danh sách giảng viên & giám thị' },
      { id: PERMISSIONS.TEACHERS.MANAGE, name: 'Quản lý thông tin giảng viên & phân công coi thi' },
      { id: PERMISSIONS.ROOMS.VIEW, name: 'Xem danh sách phòng thi & cơ sở' },
      { id: PERMISSIONS.ROOMS.MANAGE, name: 'Quản lý phòng thi, cơ sở & sơ đồ chỗ ngồi 3D' },
    ]
  },
  {
    title: 'Hệ thống & Cấu hình',
    permissions: [
      { id: PERMISSIONS.USERS.MANAGE, name: 'Quản trị danh sách tài khoản người dùng' },
      { id: PERMISSIONS.PERMISSIONS.MANAGE, name: 'Cấu hình phân quyền vai trò (Roles & Permissions)' },
      { id: PERMISSIONS.SETTINGS.EDIT, name: 'Cấu hình tham số AI, ngưỡng cảnh báo & SEB Lockdown' },
    ]
  }
];

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PERMISSIONS, PERMISSION_GROUPS, SUPER_ADMIN };
}