const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const Department = require('../models/department.model');
const AcademicBatch = require('../models/academicBatch.model');
const Class = require('../models/class.model');
const Course = require('../models/course.model');
const Teacher = require('../models/teacher.model');
const Student = require('../models/student.model');
const ExamRoom = require('../models/examRoom.model');
const ExamPaper = require('../models/examPaper.model');
const ExamSession = require('../models/examSession.model');
const ExamStudent = require('../models/examStudent.model');

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      'mongodb://127.0.0.1:27017/examguard_ai_db';

    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB connected [${conn.connection.name}]:`, conn.connection.host);

    // Chạy khởi tạo danh sách Role & Admin & Dữ liệu khảo thí mặc định theo SYSTEM_BLUEPRINT.md
    await seedRolesAndBlueprintData();

  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Danh sách Vai trò (Roles) chuẩn theo SYSTEM_BLUEPRINT.md
 * Hệ thống Quản lý Thi & Giám sát Khảo thí
 */
const DEFAULT_ROLES = [
  {
    name: 'admin',
    description: 'Quản trị viên Khảo thí — Toàn quyền quản trị hệ thống, ca thi, cấu hình AI và duyệt điểm',
    permissions: ['all'],
    isSystem: true
  },
  {
    name: 'academic',
    description: 'Giáo vụ & Quản lý Đào tạo — Quản lý Khoa, Khóa, Lớp, Môn học, Phòng thi và xếp lịch thi',
    permissions: [
      'dashboard.view', 'reports.view',
      'org.manage', 'courses.view', 'courses.manage',
      'classes.view', 'classes.manage',
      'students.view', 'students.manage',
      'teachers.view', 'teachers.manage',
      'rooms.view', 'rooms.manage',
      'exams.view', 'exams.manage',
      'papers.view'
    ],
    isSystem: true
  },
  {
    name: 'teacher',
    description: 'Giảng viên — Soạn đề thi, Cán bộ Coi thi (Giám thị), Thanh tra, Rà soát và Duyệt điểm thi',
    permissions: [
      'dashboard.view',
      'papers.view', 'papers.manage',
      'exams.view', 'proctor.live', 'proctor.override',
      'grading.review', 'grading.adjust', 'grading.approve',
      'classes.view', 'students.view',
      'face.kyc'
    ],
    isSystem: true
  },
  {
    name: 'student',
    description: 'Sinh viên — Đăng ký Face ID (KYC), xem lịch thi, check-in, làm bài thi và tra cứu kết quả',
    permissions: [
      'dashboard.view',
      'exams.view',
      'exam.take',
      'exam.result',
      'face.kyc'
    ],
    isSystem: true
  }
];

const seedRolesAndBlueprintData = async () => {
  try {
    console.log("🔍 [ExamGuard AI] Khởi tạo Vai trò & Cơ sở dữ liệu Khảo thí theo SYSTEM_BLUEPRINT.md...");

    let roleMap = {};

    for (const rData of DEFAULT_ROLES) {
      let existingRole = await Role.findOne({ name: rData.name });
      if (!existingRole) {
        existingRole = await Role.create(rData);
        console.log(`✨ Đã tạo Vai trò [${rData.name}]: ${rData.description}`);
      } else {
        existingRole.permissions = rData.permissions;
        existingRole.description = rData.description;
        await existingRole.save();
      }
      roleMap[rData.name] = existingRole;
    }

    // Dọn dẹp triệt để bất kỳ vai trò thừa (CRM/Sales) không thuộc SYSTEM_BLUEPRINT.md
    await Role.deleteMany({ name: { $nin: DEFAULT_ROLES.map(r => r.name) } });

    // 1. TẠO TÀI KHOẢN ADMIN MẶC ĐỊNH
    const adminEmail = 'admin@examguard.edu.vn';
    let adminUser = await User.findOne({ email: adminEmail });
    const defaultPasswordHash = await bcrypt.hash('123456', 10);

    if (!adminUser) {
      adminUser = await User.create({
        email: adminEmail,
        password: defaultPasswordHash,
        fullName: "Quản trị viên Khảo thí",
        role: roleMap['admin']._id,
        roles: [roleMap['admin']._id],
        status: 'active'
      });
      console.log(`✅ Đã tạo tài khoản Admin Khảo thí: ${adminEmail} (pass: 123456)`);
    }

    // 2. TẠO CƠ CẤU ĐÀO TẠO THEO MỤC 15 SYSTEM_BLUEPRINT.md
    // Khoa CNTT
    let deptCNTT = await Department.findOne({ code: 'CNTT' });
    if (!deptCNTT) {
      deptCNTT = await Department.create({
        code: 'CNTT',
        name: 'Khoa Công nghệ Thông tin',
        phone: '0243.869.1234',
        description: 'Đào tạo cử nhân & kỹ sư Công nghệ Thông tin chất lượng cao'
      });
      console.log(`✨ Đã tạo Khoa: ${deptCNTT.name} (${deptCNTT.code})`);
    }

    // Khóa học K23 (2023 - 2027)
    let batchK23 = await AcademicBatch.findOne({ code: 'K23' });
    if (!batchK23) {
      batchK23 = await AcademicBatch.create({
        code: 'K23',
        name: 'Khóa 2023 - 2027',
        startYear: 2023,
        endYear: 2027,
        department: deptCNTT._id,
        status: 'active'
      });
      console.log(`✨ Đã tạo Khóa học: ${batchK23.name} (${batchK23.code})`);
    }

    // Môn học Kỹ thuật lập trình
    let courseKTLT = await Course.findOne({ $or: [{ courseCode: 'KTLT' }, { name: 'Kỹ thuật lập trình' }] });
    if (!courseKTLT) {
      courseKTLT = await Course.create({
        courseCode: 'KTLT',
        name: 'Kỹ thuật lập trình',
        description: 'Học phần cơ sở ngành CNTT: Ngôn ngữ C/C++, cấu trúc dữ liệu và giải thuật',
        credits: 3,
        department: deptCNTT._id,
        status: 'active'
      });
      console.log(`✨ Đã tạo Môn học: ${courseKTLT.name} (${courseKTLT.courseCode})`);
    }


    // Tài khoản Giảng viên / Giám thị: ThS. Nguyễn Văn A
    const teacherEmail = 'anguyen@examguard.edu.vn';
    let teacherUser = await User.findOne({ email: teacherEmail });
    if (!teacherUser) {
      teacherUser = await User.create({
        email: teacherEmail,
        password: defaultPasswordHash,
        fullName: "ThS. Nguyễn Văn A",
        role: roleMap['teacher']._id,
        roles: [roleMap['teacher']._id],
        status: 'active'
      });
    }

    let teacherObj = await Teacher.findOne({ teacherCode: 'GV_CNTT_001' });
    if (!teacherObj) {
      teacherObj = await Teacher.create({
        teacherCode: 'GV_CNTT_001',
        fullName: 'ThS. Nguyễn Văn A',
        email: teacherEmail,
        phone: '0912345678',
        department: deptCNTT._id,
        userId: teacherUser._id,
        degree: 'Thạc sĩ Khoa học Máy tính',
        specialization: ['Kỹ thuật lập trình', 'Thuật toán'],
        isFaceKyc: true,
        faceUpdatedAt: new Date(),
        status: 'active'
      });
      console.log(`✨ Đã tạo Giảng viên/Giám thị: ${teacherObj.fullName} (${teacherObj.teacherCode})`);
    }

    // Lớp học K23CNT3
    let classK23CNT3 = await Class.findOne({ code: 'K23CNT3' });
    if (!classK23CNT3) {
      classK23CNT3 = await Class.create({
        code: 'K23CNT3',
        name: 'Lớp Công nghệ Thông tin 3 - Khóa 23',
        batch: batchK23._id,
        department: deptCNTT._id,
        advisor: teacherObj._id,
        course: courseKTLT._id,
        status: 'Running'
      });
      console.log(`✨ Đã tạo Lớp: ${classK23CNT3.name} (${classK23CNT3.code})`);
    }

    // Tài khoản Sinh viên: Lục Văn Sơn (MSSV: 2310900087)
    const studentEmail = 'son.luc@sinhvien.edu.vn';
    let studentUser = await User.findOne({ email: studentEmail });
    if (!studentUser) {
      studentUser = await User.create({
        email: studentEmail,
        password: defaultPasswordHash,
        fullName: "Lục Văn Sơn",
        role: roleMap['student']._id,
        roles: [roleMap['student']._id],
        status: 'active'
      });
    }

    let studentObj = await Student.findOne({ studentCode: '2310900087' });
    if (!studentObj) {
      studentObj = await Student.create({
        studentCode: '2310900087',
        fullName: 'Lục Văn Sơn',
        gender: 'M',
        birthday: new Date('2005-08-15'),
        email: studentEmail,
        phone: '0987654321',
        department: deptCNTT._id,
        batch: batchK23._id,
        class: classK23CNT3._id,
        userId: studentUser._id,
        isFaceKyc: true,
        faceUpdatedAt: new Date(),
        status: 'active'
      });

      // Thêm sinh viên vào danh sách lớp
      await Class.updateOne({ _id: classK23CNT3._id }, { $addToSet: { students: studentObj._id } });
      console.log(`✨ Đã tạo Sinh viên: ${studentObj.fullName} (${studentObj.studentCode})`);
    }

    // 3. TẠO PHÒNG THI 3D (ExamRoom P302)
    let roomP302 = await ExamRoom.findOne({ code: 'P302' });
    if (!roomP302) {
      roomP302 = await ExamRoom.create({
        code: 'P302',
        name: 'Phòng Lab Máy tính P302',
        roomType: 'LAB_PC',
        rows: 4,
        cols: 10,
        capacity: 40,
        allowedIpSubnet: '192.168.30.0/24',
        rtspCameraUrl: 'rtsp://admin:examguard2026@192.168.30.10:554/ch1',
        isActive: true
      });
      console.log(`✨ Đã tạo Phòng thi 3D: ${roomP302.name} (${roomP302.code}) - 40 bàn`);
    }

    // 4. TẠO NGÂN HÀNG ĐỀ THI MẪU (ExamPaper kèm đáp án đúng & giải thích)
    let paperKTLT = await ExamPaper.findOne({ code: 'DE-KTLT-2026-01' });
    if (!paperKTLT) {
      paperKTLT = await ExamPaper.create({
        code: 'DE-KTLT-2026-01',
        title: 'Đề thi Kết thúc Học phần Kỹ thuật Lập trình - Đề số 1',
        subject: courseKTLT._id,
        subjectName: 'Kỹ thuật lập trình',
        createdBy: teacherUser._id,
        durationMinutes: 60,
        totalScore: 10.0,
        shuffleQuestions: true,
        shuffleOptions: true,
        status: 'APPROVED',
        questions: [
          {
            stt: 1,
            type: 'MULTIPLE_CHOICE',
            content: 'Kết quả của phép tính printf("%d", 5 / 2); trong ngôn ngữ lập trình C là gì?',
            score: 2.0,
            options: ['2.5', '2', '3', '0'],
            correctAnswer: 1, // index 1 = '2'
            explanation: 'Trong ngôn ngữ C, khi thực hiện phép chia giữa 2 số nguyên 5/2, kết quả là phép chia nguyên lấy phần nguyên 2, bỏ qua phần thập phân.'
          },
          {
            stt: 2,
            type: 'MULTIPLE_CHOICE',
            content: 'Cấu trúc dữ liệu nào dưới đây hoạt động theo nguyên lý LIFO (Last In, First Out)?',
            score: 2.0,
            options: ['Queue (Hàng đợi)', 'Stack (Ngăn xếp)', 'Linked List (Danh sách liên kết)', 'Tree (Cây)'],
            correctAnswer: 1, // index 1 = 'Stack'
            explanation: 'Stack (Ngăn xếp) hoạt động theo nguyên lý Last-In, First-Out (phần tử vào sau cùng sẽ được lấy ra đầu tiên). Queue hoạt động theo FIFO.'
          },
          {
            stt: 3,
            type: 'MULTIPLE_CHOICE',
            content: 'Độ phức tạp thời gian trung bình của thuật toán tìm kiếm nhị phân (Binary Search) là bao nhiêu?',
            score: 2.0,
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
            correctAnswer: 2, // index 2 = 'O(log n)'
            explanation: 'Thuật toán tìm kiếm nhị phân chia đôi không gian tìm kiếm sau mỗi bước, do đó có độ phức tạp thời gian là O(log n).'
          },
          {
            stt: 4,
            type: 'ESSAY',
            content: 'Trình bày sự khác biệt giữa truyền tham trị (pass by value) và truyền tham chiếu (pass by reference) trong ngôn ngữ C/C++. Cho ví dụ minh họa hàm hoán vị hai số (swap).',
            score: 2.0,
            gradingGuide: 'Giải thích đúng bản chất ô nhớ (1đ), code hàm swap đúng dùng con trỏ/reference (1đ)',
            suggestedKeywords: ['tham trị', 'tham chiếu', 'con trỏ', 'địa chỉ ô nhớ', 'swap'],
            minWords: 50
          },
          {
            stt: 5,
            type: 'CODING_PROBLEM',
            content: 'Viết hàm tính tổng các số nguyên dương từ 1 đến N (1 <= N <= 1000).',
            score: 2.0,
            languages: ['c', 'cpp', 'python'],
            testCases: [
              { input: '5', expectedOutput: '15', isHidden: false, timeoutMs: 1000 },
              { input: '10', expectedOutput: '55', isHidden: true, timeoutMs: 1000 }
            ],
            templateCode: {
              c: '#include <stdio.h>\n\nint sum_n(int n) {\n    // Code của bạn tại đây\n    return 0;\n}\n\nint main() {\n    int n;\n    scanf("%d", &n);\n    printf("%d", sum_n(n));\n    return 0;\n}'
            },
            explanation: 'Có thể dùng vòng lặp for i=1..N hoặc công thức toán học N*(N+1)/2'
          }
        ]
      });
      console.log(`✨ Đã tạo Đề thi mẫu: ${paperKTLT.title} (${paperKTLT.code})`);
    }

    // 5. TẠO CA THI ACTIVE (ExamSession)
    let sessionKTLT = await ExamSession.findOne({ code: 'CA-KTLT-20261015-P302' });
    const now = new Date();
    const startTime = new Date(now.getTime() - 15 * 60 * 1000); // Đã bắt đầu 15 phút trước
    const endTime = new Date(now.getTime() + 45 * 60 * 1000);   // Còn 45 phút làm bài

    if (!sessionKTLT) {
      sessionKTLT = await ExamSession.create({
        code: 'CA-KTLT-20261015-P302',
        title: 'Thi Kết thúc Học phần Kỹ thuật Lập trình - Ca 1',
        subject: courseKTLT._id,
        examPaper: paperKTLT._id,
        room: roomP302._id,
        startTime: startTime,
        endTime: endTime,
        durationMinutes: 60,
        examType: 'BYOD_LAPTOP',
        status: 'IN_PROGRESS',
        gradingStatus: 'NOT_GRADED',
        proctor1: teacherUser._id,
        proctor2: adminUser._id,
        inspector: teacherUser._id
      });
      console.log(`✨ Đã tạo Ca thi: ${sessionKTLT.title} (${sessionKTLT.code}) [IN_PROGRESS]`);
    }

    // 6. XẾP CHỖ CHO THÍ SINH (ExamStudent: Lục Văn Sơn tại Bàn R2-C3)
    let examCandidate = await ExamStudent.findOne({ session: sessionKTLT._id, student: studentObj._id });
    if (!examCandidate) {
      examCandidate = await ExamStudent.create({
        session: sessionKTLT._id,
        student: studentObj._id,
        user: studentUser._id,
        candidateCode: '20261015-001',
        blindCode: 'PHACH_9A2F81',
        seatRow: 2,
        seatCol: 3, // Bàn R2-C3
        seatPin: '849201',
        status: 'IN_EXAM',
        checkinAt: new Date(now.getTime() - 14 * 60 * 1000),
        checkinFaceSimilarity: 0.942,
        trustScore: 95,
        startedAt: new Date(now.getTime() - 12 * 60 * 1000)
      });
      console.log(`✨ Đã xếp chỗ Thí sinh: ${studentObj.fullName} (SBD: 20261015-001, Bàn: R2-C3, PIN: 849201)`);
    }

    console.log("==================================================================");
    console.log("🎉 HỆ THỐNG EXAMGUARD AI ĐÃ SẴN SÀNG VỚI CƠ SỞ DỮ LIỆU CHUẨN!");
    console.log("👉 Admin Khảo thí:  admin@examguard.edu.vn | Pass: 123456");
    console.log("👉 Giảng viên Coi thi: anguyen@examguard.edu.vn | Pass: 123456");
    console.log("👉 Sinh viên Dự thi:   son.luc@sinhvien.edu.vn  | Pass: 123456");
    console.log("==================================================================");

  } catch (err) {
    console.error("❌ Lỗi khởi tạo dữ liệu ExamGuard AI:", err);
  }
};

module.exports = connectDB;