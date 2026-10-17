const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const User = require('./models/user.model');
const Student = require('./models/student.model');
const Teacher = require('./models/teacher.model');
const Course = require('./models/course.model');
const Class = require('./models/class.model');
const Department = require('./models/department.model');
const AcademicBatch = require('./models/academicBatch.model');
const ExamRoom = require('./models/examRoom.model');
const ExamPaper = require('./models/examPaper.model');
const ExamSession = require('./models/examSession.model');
const ExamStudent = require('./models/examStudent.model');

const Role = require('./models/role.model');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/examguard_ai_db';

async function seedExamGuardData() {
  try {
    console.log('Connecting to MongoDB:', MONGO_URI);
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected successfully!');

    // 1. KHOA (Department / Faculty)
    let dept = await Department.findOne({ name: 'Khoa Công nghệ Thông tin' });
    if (!dept) {
      dept = await Department.create({
        name: 'Khoa Công nghệ Thông tin',
        description: 'Khoa đào tạo Công nghệ thông tin & Khoa học máy tính'
      });
      console.log('Created Khoa CNTT');
    }

    // 2. KHÓA HỌC (Academic Batch)
    let batch = await AcademicBatch.findOne({ code: 'K23' });
    if (!batch) {
      batch = await AcademicBatch.create({
        code: 'K23',
        name: 'Khóa 2023 - 2027',
        startYear: 2023,
        endYear: 2027,
        department: dept._id
      });
      console.log('Created Khóa K23');
    }

    // 3. MÔN HỌC (Subject / Course)
    let subject = await Course.findOne({ courseCode: 'INT101' });
    if (!subject) {
      subject = await Course.create({
        name: 'Kỹ thuật lập trình C',
        courseCode: 'INT101',
        totalSessions: 45,
        hoursPerSession: 3,
        description: 'Học phần Kỹ thuật lập trình C/C++ nền tảng',
        category: 'CNTT',
        status: 'active'
      });
      console.log('Created Môn học INT101');
    }

    // 4. PHÒNG THI (Exam Room P302)
    let room = await ExamRoom.findOne({ code: 'P302' });
    if (!room) {
      room = await ExamRoom.create({
        code: 'P302',
        name: 'Phòng Lab Máy tính P302 (Tầng 3)',
        roomType: 'LAB_PC',
        rows: 5,
        cols: 8,
        capacity: 40,
        allowedIpSubnet: '192.168.30.0/24',
        rtspCameraUrl: 'rtsp://192.168.30.10:554/cam_p302'
      });
      console.log('Created Phòng thi P302 (40 chỗ)');
    }

    // 5. GIẢNG VIÊN & ADMIN
    let adminUser = await User.findOne({ email: 'admin@examguard.edu.vn' });
    let teacherRole = await Role.findOne({ name: 'teacher' });

    let teacherUser = await User.findOne({ email: 'teacher@examguard.edu.vn' });
    if (!teacherUser) {
      teacherUser = await User.create({
        email: 'teacher@examguard.edu.vn',
        password: '$2a$10$7zU0zX5.n5E.CjS/4wXkge9q0q5NnU4xH0wD1Uu0zX5.n5E.CjS/4', // hash 123456
        fullName: 'ThS. Nguyễn Văn Giảng',
        role: teacherRole ? teacherRole._id : null,
        roles: teacherRole ? [teacherRole._id] : [],
        department: 'teacher',
        status: 'active'
      });
      console.log('Created Teacher teacher@examguard.edu.vn');
    }

    // 6. SINH VIÊN (Lục Văn Sơn & các bạn)
    let mainStudent = await Student.findOne({ studentCode: '2310900087' });
    if (!mainStudent) {
      mainStudent = await Student.create({
        fullName: 'Lục Văn Sơn',
        studentCode: '2310900087',
        email: 'lucvanson@student.edu.vn',
        phone: '0987654321',
        status: 'active'
      });
      console.log('Created Sinh viên Lục Văn Sơn (2310900087)');
    }

    // Tạo thêm 19 sinh viên khác để đủ 20 thí sinh mẫu
    const sampleStudents = [mainStudent];
    const studentNames = [
      'Trần Văn Quang', 'Lê Thị Thu', 'Nguyễn Hoàng Long', 'Phạm Minh Đức',
      'Đặng Thanh Hằng', 'Bùi Ngọc Anh', 'Vũ Đức Thịnh', 'Hoàng Gia Bảo',
      'Đỗ Khánh Linh', 'Ngô Quốc Huy', 'Dương Thảo My', 'Phan Văn Hậu',
      'Trịnh Đình Quang', 'Lý Hải Đăng', 'Cao Thị Lan', 'Mai Văn Chiến',
      'Hồ Nhật Minh', 'Tô Ánh Nguyệt', 'Võ Hoài Nam'
    ];

    for (let i = 0; i < studentNames.length; i++) {
      const sCode = `23109000${String(i + 1).padStart(2, '0')}`;
      let st = await Student.findOne({ studentCode: sCode });
      if (!st) {
        st = await Student.create({
          fullName: studentNames[i],
          studentCode: sCode,
          email: `${sCode}@student.edu.vn`,
          phone: `09123456${String(i).padStart(2, '0')}`,
          status: 'active'
        });
      }
      sampleStudents.push(st);
    }
    console.log(`Ready ${sampleStudents.length} students for testing.`);

    // 7. ĐỀ THI MẪU (Exam Paper: 20 câu hỏi có ĐÁP ÁN ĐÚNG + GIẢI THÍCH CHI TIẾT)
    let examPaper = await ExamPaper.findOne({ code: 'DE-C-2026-01' });
    if (!examPaper) {
      examPaper = await ExamPaper.create({
        code: 'DE-C-2026-01',
        title: 'Đề thi Kết thúc Học phần: Kỹ thuật Lập trình C (HK1 2026-2027)',
        subject: subject._id,
        subjectName: subject.name,
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
            content: 'Trong ngôn ngữ C, kết quả của biểu thức printf("%d", 5 / 2); là gì?',
            score: 0.5,
            options: ['1', '2', '2.5', '0'],
            correctAnswer: 1, // index 1 là '2'
            explanation: 'Trong ngôn ngữ C, phép chia giữa hai số nguyên (5 và 2) là phép chia lấy phần nguyên (integer division), kết quả sẽ bỏ phần thập phân và cho ra 2.'
          },
          {
            stt: 2,
            type: 'MULTIPLE_CHOICE',
            content: 'Cấu trúc dữ liệu nào hoạt động theo nguyên lý Last-In, First-Out (LIFO)?',
            score: 0.5,
            options: ['Queue (Hàng đợi)', 'Array (Mảng)', 'Stack (Ngăn xếp)', 'Linked List (Danh sách liên kết)'],
            correctAnswer: 2,
            explanation: 'Stack hoạt động theo cơ chế LIFO (phần tử thêm vào cuối cùng sẽ được lấy ra đầu tiên). Ngược lại Queue hoạt động theo FIFO.'
          },
          {
            stt: 3,
            type: 'MULTIPLE_CHOICE',
            content: 'Toán tử nào trong C được sử dụng để lấy địa chỉ vùng nhớ của một biến?',
            score: 0.5,
            options: ['*', '&', '->', '%'],
            correctAnswer: 1,
            explanation: 'Toán tử & (address-of operator) dùng để lấy địa chỉ ô nhớ của một biến. Toán tử * dùng để truy xuất giá trị qua con trỏ (dereference).'
          },
          {
            stt: 4,
            type: 'MULTIPLE_CHOICE',
            content: 'Kích thước bộ nhớ chuẩn của kiểu dữ liệu char trong ngôn ngữ C là bao nhiêu byte?',
            score: 0.5,
            options: ['1 byte', '2 bytes', '4 bytes', '8 bytes'],
            correctAnswer: 0,
            explanation: 'Kiểu dữ liệu char trong C luôn luôn có kích thước đúng bằng 1 byte (8 bits), biểu diễn các ký tự theo bảng mã ASCII.'
          },
          {
            stt: 5,
            type: 'MULTIPLE_CHOICE',
            content: 'Hàm nào trong thư viện chuẩn <stdlib.h> dùng để cấp phát động vùng nhớ?',
            score: 0.5,
            options: ['alloc()', 'malloc()', 'create()', 'new()'],
            correctAnswer: 1,
            explanation: 'Hàm malloc() (Memory Allocation) trong <stdlib.h> cấp phát khối bộ nhớ động với kích thước byte chỉ định và trả về con trỏ void*.'
          },
          {
            stt: 6,
            type: 'MULTIPLE_CHOICE',
            content: 'Hàm nào sau đây dùng để giải phóng vùng nhớ đã cấp phát động?',
            score: 0.5,
            options: ['delete()', 'free()', 'release()', 'clear()'],
            correctAnswer: 1,
            explanation: 'Hàm free(ptr) dùng để trả lại vùng nhớ động cho hệ điều hành nhằm tránh hiện tượng rò rỉ bộ nhớ (memory leak).'
          },
          {
            stt: 7,
            type: 'MULTIPLE_CHOICE',
            content: 'Giá trị trả về của hàm strcmp(str1, str2) khi hai chuỗi hoàn toàn giống nhau là gì?',
            score: 0.5,
            options: ['1', '-1', '0', 'true'],
            correctAnswer: 2,
            explanation: 'Hàm strcmp trả về 0 nếu chuỗi 1 bằng chuỗi 2; trả về số âm nếu str1 < str2; trả về số dương nếu str1 > str2.'
          },
          {
            stt: 8,
            type: 'MULTIPLE_CHOICE',
            content: 'Từ khóa nào dùng để định nghĩa kiểu dữ liệu có thể chứa nhiều thành phần khác kiểu trong C?',
            score: 0.5,
            options: ['struct', 'class', 'enum', 'typedef'],
            correctAnswer: 0,
            explanation: 'struct (Structure) cho phép nhóm các biến có kiểu dữ liệu khác nhau dưới một tên gọi duy nhất.'
          },
          {
            stt: 9,
            type: 'MULTIPLE_CHOICE',
            content: 'Chỉ thị tiền xử lý nào dùng để nhúng nội dung của file header vào mã nguồn?',
            score: 0.5,
            options: ['#define', '#include', '#pragma', '#import'],
            correctAnswer: 1,
            explanation: '#include cho trình tiền xử lý biết cần chèn toàn bộ nội dung của tệp tiêu đề (header) vào vị trí đó trước khi biên dịch.'
          },
          {
            stt: 10,
            type: 'MULTIPLE_CHOICE',
            content: 'Vòng lặp nào đảm bảo khối lệnh bên trong luôn được thực thi ít nhất một lần?',
            score: 0.5,
            options: ['for', 'while', 'do...while', 'foreach'],
            correctAnswer: 2,
            explanation: 'Vòng lặp do...while kiểm tra điều kiện lặp ở cuối vòng lặp, do đó khối lệnh luôn được chạy ít nhất một lần.'
          },
          {
            stt: 11,
            type: 'MULTIPLE_CHOICE',
            content: 'Phép toán bitwise XOR trong ngôn ngữ C sử dụng ký hiệu nào?',
            score: 0.5,
            options: ['|', '&', '^', '~'],
            correctAnswer: 2,
            explanation: 'Ký hiệu ^ là toán tử bitwise XOR (cho kết quả 1 khi hai bit khác nhau, 0 khi hai bit giống nhau).'
          },
          {
            stt: 12,
            type: 'MULTIPLE_CHOICE',
            content: 'Độ phức tạp thời gian trung bình của thuật toán tìm kiếm nhị phân (Binary Search) là gì?',
            score: 0.5,
            options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'],
            correctAnswer: 2,
            explanation: 'Thuật toán tìm kiếm nhị phân chia đôi không gian tìm kiếm sau mỗi bước, nên độ phức tạp là O(log n).'
          },
          {
            stt: 13,
            type: 'MULTIPLE_CHOICE',
            content: 'Khai báo int a[10]; chiếm bao nhiêu byte bộ nhớ (giả sử int = 4 bytes)?',
            score: 0.5,
            options: ['10 bytes', '20 bytes', '40 bytes', '80 bytes'],
            correctAnswer: 2,
            explanation: 'Mảng 10 phần tử kiểu int, mỗi phần tử chiếm 4 bytes, tổng kích thước là 10 * 4 = 40 bytes.'
          },
          {
            stt: 14,
            type: 'MULTIPLE_CHOICE',
            content: 'Độ phức tạp thời gian trong trường hợp xấu nhất (Worst-case) của thuật toán QuickSort là gì?',
            score: 0.5,
            options: ['O(n log n)', 'O(n^2)', 'O(n)', 'O(log n)'],
            correctAnswer: 1, // index 1 là 'O(n^2)'
            explanation: 'Trường hợp xấu nhất của QuickSort xảy ra khi phần tử chốt (pivot) luôn là phần tử nhỏ nhất hoặc lớn nhất, khiến mảng phân chia mất cân bằng và độ phức tạp đạt O(n^2).'
          },
          {
            stt: 15,
            type: 'MULTIPLE_CHOICE',
            content: 'Trong hàm đệ quy, điều kiện nào bắt buộc phải có để tránh lỗi tràn ngăn xếp (Stack Overflow)?',
            score: 0.5,
            options: ['Vòng lặp vô hạn', 'Điều kiện dừng (Base case)', 'Hàm con', 'Biến toàn cục'],
            correctAnswer: 1,
            explanation: 'Mọi hàm đệ quy bắt buộc phải có điều kiện dừng (base case) để chuỗi gọi hàm kết thúc và trả về giá trị, tránh tràn bộ nhớ call stack.'
          },
          {
            stt: 16,
            type: 'MULTIPLE_CHOICE',
            content: 'Hàm nào trong C được dùng để đọc một dòng ký tự bao gồm cả khoảng trắng từ bàn phím an toàn?',
            score: 0.5,
            options: ['gets()', 'scanf("%s")', 'fgets()', 'cin'],
            correctAnswer: 2,
            explanation: 'Hàm fgets() kiểm soát số lượng ký tự tối đa được đọc, ngăn chặn lỗi tràn bộ đệm (buffer overflow) mà hàm gets() thường gặp.'
          },
          {
            stt: 17,
            type: 'MULTIPLE_CHOICE',
            content: 'Giá trị NULL trong con trỏ C đại diện cho điều gì?',
            score: 0.5,
            options: ['Ô nhớ số 1', 'Con trỏ không trỏ tới bất kỳ địa chỉ hợp lệ nào', 'Giá trị 0xFF', 'Lỗi bộ nhớ'],
            correctAnswer: 1,
            explanation: 'NULL là con trỏ đặc biệt (thường có giá trị 0 hoặc (void*)0), biểu thị con trỏ hiện không trỏ tới ô nhớ hợp lệ nào.'
          },
          {
            stt: 18,
            type: 'MULTIPLE_CHOICE',
            content: 'Từ khóa const đặt trước khai báo biến có tác dụng gì?',
            score: 0.5,
            options: ['Tăng tốc độ biến', 'Ngăn không cho giá trị của biến bị sửa đổi', 'Lưu biến vào RAM nhanh', 'Biến dùng chung toàn file'],
            correctAnswer: 1,
            explanation: 'const (constant) khai báo một hằng số, trình biên dịch sẽ báo lỗi nếu có bất kỳ lệnh nào cố tình ghi đè giá trị của biến này.'
          },
          {
            stt: 19,
            type: 'ESSAY',
            content: 'Phân tích sự khác biệt giữa truyền tham trị (pass by value) và truyền tham chiếu/con trỏ (pass by reference) trong hàm C. Cho ví dụ hàm hoán vị swap.',
            score: 0.5,
            gradingGuide: 'Nêu được bản chất sao chép giá trị (0.25đ), nêu được cách truyền địa chỉ con trỏ để thay đổi giá trị gốc kèm code swap minh họa (0.25đ).'
          },
          {
            stt: 20,
            type: 'CODING_PROBLEM',
            content: 'Viết hàm đếm số lượng số chẵn trong một mảng số nguyên gồm n phần tử.',
            score: 0.5,
            languages: ['c'],
            templateCode: {
              c: '#include <stdio.h>\n\nint countEven(int a[], int n) {\n  // TODO: Viết code tại đây\n}\n'
            },
            explanation: 'Duyệt qua mảng từ 0 đến n-1, nếu a[i] % 2 == 0 thì tăng biến đếm.'
          }
        ]
      });
      console.log('Created Đề thi mẫu DE-C-2026-01 với 20 câu hỏi có đáp án & giải thích');
    }

    // 8. CA THI (Exam Session)
    let session = await ExamSession.findOne({ code: 'CA-20261015-01' });
    if (!session) {
      const now = new Date();
      const end = new Date(now.getTime() + 90 * 60 * 1000); // 90 phút

      session = await ExamSession.create({
        code: 'CA-20261015-01',
        title: 'Ca 1: Thi Kết thúc Học phần Kỹ thuật Lập trình C — P302',
        subject: subject._id,
        examPaper: examPaper._id,
        room: room._id,
        startTime: now,
        endTime: end,
        durationMinutes: 60,
        examType: 'LAB_PC',
        proctor1: teacherUser._id,
        status: 'IN_PROGRESS',
        gradingStatus: 'NOT_GRADED'
      });
      console.log('Created Ca thi CA-20261015-01');

      // 9. XẾP CHỖ CHO 20 SINH VIÊN VÀO PHÒNG P302
      let curRow = 1;
      let curCol = 1;

      for (let i = 0; i < sampleStudents.length; i++) {
        const st = sampleStudents[i];
        const sbd = `20261015-${String(i + 1).padStart(3, '0')}`;
        const pin = String(1000 + i * 37).padStart(4, '0');
        const blind = `PHACH_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await ExamStudent.create({
          session: session._id,
          student: st._id,
          candidateCode: sbd,
          blindCode: blind,
          seatRow: curRow,
          seatCol: curCol,
          seatPin: pin,
          status: i === 0 ? 'IN_EXAM' : 'ASSIGNED',
          trustScore: 100,
          startedAt: i === 0 ? now : null
        });

        curCol++;
        if (curCol > room.cols) {
          curCol = 1;
          curRow++;
        }
      }
      console.log(`Assigned ${sampleStudents.length} students into seats for session CA-20261015-01`);
    }

    console.log('========================================================');
    console.log('✅ SEEDING EXAMGUARD AI MASTER DATA HOÀN TẤT!');
    console.log(`Ca thi mẫu: ${session.code} (${session.title})`);
    console.log(`Phòng thi: ${room.code} (${room.capacity} chỗ)`);
    console.log(`Đề thi: ${examPaper.code} (20 câu hỏi có đáp án & giải thích)`);
    console.log('Thí sinh chính: Lục Văn Sơn (2310900087) — SBD: 20261015-001 — Bàn: Dãy 1 Cột 1');
    console.log('========================================================');

    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedExamGuardData();
