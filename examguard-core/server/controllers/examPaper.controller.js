/**
 * =========================================================================
 * EXAM PAPER CONTROLLER (Tuân thủ Single Responsibility Principle - SRP)
 * Quản lý vòng đời của Đề thi (Exam Papers): Upload, phân tích ma trận câu hỏi,
 * tạo đề thủ công / tự động, tra cứu và cập nhật cấu trúc đề thi.
 * =========================================================================
 */

const mongoose = require('mongoose');
const ExamPaper = require('../models/examPaper.model');
const Course = require('../models/course.model');
const User = require('../models/user.model');
const { parseExamFile } = require('../utils/examFileParser');
const { toPaperSummaryDTO } = require('../dtos/examPaper.dto');

// Tải lên file đề thi (PDF, DOCX, Ảnh) kèm phân tích câu hỏi & ma trận đáp án tự động
exports.uploadPaperFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Chưa có file đề thi nào được tải lên!' });
    }
    const fileUrl = `/uploads/exam-papers/${req.file.filename}`;

    // Tự động phân tích câu hỏi & đáp án đúng từ file
    let parsedData = null;
    try {
      parsedData = await parseExamFile(req.file.path, req.file.originalname);
    } catch (parseErr) {
      console.warn('Lỗi phân tích file đề thi tự động:', parseErr.message);
    }

    const hasParsedQuestions = parsedData && parsedData.canParseText && parsedData.detectedQuestionsCount > 0;

    return res.json({
      success: true,
      message: hasParsedQuestions
        ? `Đã nhận diện tự động ${parsedData.detectedQuestionsCount} câu hỏi (${parsedData.mcqCount} trắc nghiệm, ${parsedData.essayCount} tự luận)!`
        : 'Tải lên file đề thi thành công!',
      data: {
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        parsed: parsedData
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Tạo đề thi mới (Thủ công hoặc kèm File đề thi)
exports.createExamPaper = async (req, res) => {
  try {
    const { 
      code, 
      title, 
      subject, 
      durationMinutes, 
      totalScore = 10.0, 
      shuffleQuestions, 
      shuffleOptions, 
      questions,
      paperType = 'STRUCTURED_QUIZ',
      structureType = 'PURE_MCQ',
      mcqCount = 0,
      essayCount = 0,
      fileUrl = null,
      fileName = null,
      fileSize = 0,
      totalQuestions = 0,
      submissionMode = 'OMR_BUBBLE_SHEET',
      answerKeyString = '',
      answerKey = [] // mảng đáp án index [0, 1, 2, 3...] hoặc mảng các đáp án [[0], [1, 2], ...]
    } = req.body;

    // Kiểm tra mã trùng
    const existing = await ExamPaper.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Mã đề thi "${code}" đã tồn tại trên hệ thống!` });
    }

    // 1. Giải quyết Course / Subject an toàn tuyệt đối (tránh CastError khi truyền string name)
    let courseDoc = null;
    if (subject && mongoose.Types.ObjectId.isValid(subject)) {
      courseDoc = await Course.findById(subject);
    }
    if (!courseDoc && subject) {
      const escapedSubject = String(subject).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      courseDoc = await Course.findOne({
        $or: [
          { name: subject },
          { courseCode: subject },
          { name: { $regex: new RegExp(escapedSubject, 'i') } }
        ]
      });
    }
    if (!courseDoc) {
      courseDoc = await Course.findOne();
    }
    if (!courseDoc) {
      courseDoc = await Course.create({
        courseCode: 'INT101',
        name: 'Kỹ thuật lập trình C',
        credits: 3
      });
    }

    // 2. Giải quyết createdBy an toàn
    let createdByUserId = req.user ? req.user._id : null;
    if (!createdByUserId || !mongoose.Types.ObjectId.isValid(createdByUserId)) {
      const adminUser = await User.findOne({ email: 'admin@examguard.edu.vn' }) || await User.findOne();
      if (adminUser) {
        createdByUserId = adminUser._id;
      }
    }

    let finalQuestions = [];

    if (Array.isArray(questions) && questions.length > 0) {
      // Đã có danh sách câu hỏi chi tiết từ client (hỗ trợ cả trắc nghiệm đơn, nhiều đáp án đúng, và tự luận)
      finalQuestions = questions.map((q, idx) => {
        const isEssay = q.type === 'ESSAY' || q.type === 'CODING_PROBLEM';
        const corrAns = isEssay ? null : (q.correctAnswer !== undefined ? q.correctAnswer : 0);
        const corrList = Array.isArray(corrAns) 
          ? corrAns.map(Number) 
          : (corrAns !== null && corrAns !== undefined ? [Number(corrAns)] : []);

        return {
          stt: q.stt || (idx + 1),
          type: q.type || 'MULTIPLE_CHOICE',
          content: q.content || q.prompt || `Câu ${idx + 1}`,
          image: q.image || q.imageUrl || null,
          options: isEssay ? [] : (q.options || ['A', 'B', 'C', 'D']),
          correctAnswer: corrAns,
          correctAnswers: corrList,
          selectionMode: q.selectionMode || (corrList.length > 1 ? 'MULTIPLE' : 'SINGLE'),
          scoringMode: q.scoringMode || 'ALL_OR_NOTHING',
          score: Number(q.score) > 0 ? Number(q.score) : 0.5,
          minWords: q.minWords || 0,
          submissionMethod: q.submissionMethod || 'TEXT_EDITOR',
          allowAttachment: Boolean(q.allowAttachment),
          explanation: q.explanation || (isEssay ? 'Câu hỏi tự luận' : `Đáp án câu số ${idx + 1}`),
          timeLimitSeconds: q.timeLimitSeconds ? Number(q.timeLimitSeconds) : 20,
          blankTemplate: q.blankTemplate || '',
          blankAnswers: q.blankAnswers || [],
          audioUrl: q.audioUrl || null,
          audioName: q.audioName || null,
          playLimit: q.playLimit || 2,
          geometryData: q.geometryData || null,
          buggyCode: q.buggyCode || '',
          fixedCode: q.fixedCode || '',
          codeLanguage: q.codeLanguage || 'cpp',
          starterCode: q.starterCode || '',
          testCases: q.testCases || []
        };
      });
    } else if (fileUrl && totalQuestions > 0) {
      // Đề thi dạng File đính kèm + Phiếu trả lời trắc nghiệm (OMR Bubble Sheet)
      const count = Number(totalQuestions);
      const scorePerQ = count > 0 ? parseFloat((Number(totalScore) / count).toFixed(3)) : 0.25;

      for (let i = 0; i < count; i++) {
        let corr = 0; // Mặc định đáp án A (index 0)
        let corrList = [0];

        if (Array.isArray(answerKey) && answerKey[i] !== undefined) {
          if (Array.isArray(answerKey[i])) {
            corrList = answerKey[i].map(Number);
            corr = corrList[0];
          } else {
            corr = Number(answerKey[i]);
            corrList = [corr];
          }
        } else if (answerKeyString && answerKeyString[i]) {
          const charMap = { 'A': 0, 'B': 1, 'C': 2, 'D': 3, 'E': 4, 'F': 5 };
          const c = answerKeyString[i].toUpperCase();
          if (charMap[c] !== undefined) {
            corr = charMap[c];
            corrList = [corr];
          }
        }

        finalQuestions.push({
          stt: i + 1,
          type: 'MULTIPLE_CHOICE',
          content: `Câu ${i + 1} (Xem câu hỏi và các phương án trên đề thi PDF/Word)`,
          options: ['A', 'B', 'C', 'D'],
          correctAnswer: corr,
          correctAnswers: corrList,
          selectionMode: corrList.length > 1 ? 'MULTIPLE' : 'SINGLE',
          score: scorePerQ,
          explanation: `Đáp án chính thức câu ${i + 1} từ ma trận đáp án đề thi.`
        });
      }
    } else {
      // Mặc định tạo khung 5 câu mẫu
      finalQuestions = [
        {
          stt: 1,
          type: 'MULTIPLE_CHOICE',
          content: 'Khái niệm nào sau đây mô tả đúng nhất về tính kế thừa trong lập trình hướng đối tượng?',
          options: [
            'Cho phép một lớp thừa hưởng các thuộc tính và phương thức từ lớp khác',
            'Ẩn giấu thông tin chi tiết và chỉ hiển thị tính năng',
            'Một phương thức có nhiều hình thái thực thi khác nhau',
            'Đóng gói dữ liệu và mã nguồn vào một đơn vị duy nhất'
          ],
          correctAnswer: 0,
          correctAnswers: [0],
          score: 2.0,
          explanation: 'Kế thừa (Inheritance) cho phép lớp con tái sử dụng mã nguồn của lớp cha.'
        },
        {
          stt: 2,
          type: 'MULTIPLE_CHOICE',
          content: 'Độ phức tạp thời gian trung bình của thuật toán QuickSort là gì?',
          options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(1)'],
          correctAnswer: 1,
          correctAnswers: [1],
          score: 2.0,
          explanation: 'QuickSort có độ phức tạp trung bình là O(n log n).'
        }
      ];
    }

    const calculatedTotalScore = finalQuestions.reduce((acc, q) => acc + (Number(q.score) || 0), 0);

    const paper = await ExamPaper.create({
      code: code.trim().toUpperCase(),
      title: title.trim(),
      subject: courseDoc._id,
      durationMinutes: Number(durationMinutes) || 60,
      totalScore: calculatedTotalScore > 0 ? parseFloat(calculatedTotalScore.toFixed(2)) : Number(totalScore),
      totalQuestions: finalQuestions.length,
      shuffleQuestions: Boolean(shuffleQuestions),
      shuffleOptions: Boolean(shuffleOptions),
      paperType: paperType || (fileUrl ? 'FILE_ATTACHED_QUIZ' : 'STRUCTURED_QUIZ'),
      structureType: structureType || 'PURE_MCQ',
      mcqCount: Number(mcqCount) || finalQuestions.filter(q => q.type !== 'ESSAY' && q.type !== 'CODING_PROBLEM').length,
      essayCount: Number(essayCount) || finalQuestions.filter(q => q.type === 'ESSAY' || q.type === 'CODING_PROBLEM').length,
      fileUrl: fileUrl || null,
      fileName: fileName || null,
      fileSize: Number(fileSize) || 0,
      submissionMode: submissionMode || (fileUrl ? 'OMR_BUBBLE_SHEET' : 'HYBRID_ONLINE'),
      answerKeyString: answerKeyString || '',
      isQuizArena: Boolean(req.body.isQuizArena),
      quizSettings: req.body.quizSettings || {
        enableTimeLimitPerQuestion: false,
        timeLimitPerQuestionSeconds: 20,
        enablePointMultiplier: true,
        enableStreakBonus: true
      },
      questions: finalQuestions,
      createdBy: createdByUserId
    });

    return res.status(201).json({
      success: true,
      message: `Tạo đề thi "${paper.title}" thành công với ${paper.totalQuestions} câu hỏi!`,
      data: paper
    });
  } catch (error) {
    console.error('Lỗi createExamPaper:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy danh sách đề thi
exports.getExamPapers = async (req, res) => {
  try {
    const { subject, status, search } = req.query;
    const filter = {};
    if (subject) filter.subject = subject;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } }
      ];
    }

    const papers = await ExamPaper.find(filter)
      .populate('subject', 'name courseCode')
      .populate('createdBy', 'fullName email')
      .sort({ createdAt: -1 });

    return res.json({ success: true, count: papers.length, data: papers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Lấy chi tiết đề thi (Dành cho Giảng viên/Admin soạn đề)
exports.getExamPaperDetail = async (req, res) => {
  try {
    const paper = await ExamPaper.findById(req.params.id)
      .populate('subject', 'name courseCode')
      .populate('createdBy', 'fullName email');

    if (!paper) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi!' });
    }

    return res.json({ success: true, data: paper });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Cập nhật đề thi (Dành cho Giảng viên/Admin lưu chỉnh sửa từ Builder)
exports.updateExamPaper = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      code,
      subject,
      durationMinutes,
      totalScore,
      questions,
      shuffleQuestions,
      shuffleOptions,
      paperType,
      submissionMode
    } = req.body;

    const paper = await ExamPaper.findById(id);
    if (!paper) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi cần cập nhật!' });
    }

    if (title) paper.title = title.trim();
    if (code) paper.code = code.trim().toUpperCase();
    if (durationMinutes) paper.durationMinutes = durationMinutes;
    if (totalScore) paper.totalScore = totalScore;
    if (subject && mongoose.Types.ObjectId.isValid(subject)) paper.subject = subject;
    if (shuffleQuestions !== undefined) paper.shuffleQuestions = shuffleQuestions;
    if (shuffleOptions !== undefined) paper.shuffleOptions = shuffleOptions;
    if (paperType) paper.paperType = paperType;
    if (submissionMode) paper.submissionMode = submissionMode;
    if (req.body.isQuizArena !== undefined) paper.isQuizArena = req.body.isQuizArena;
    if (req.body.quizSettings) paper.quizSettings = req.body.quizSettings;

    if (Array.isArray(questions)) {
      paper.questions = questions.map((q, idx) => {
        const isEssay = q.type === 'ESSAY' || q.type === 'CODING_PROBLEM';
        const corrList = Array.isArray(q.correctAnswers)
          ? q.correctAnswers.map(Number)
          : (q.correctAnswer !== undefined && q.correctAnswer !== null ? [Number(q.correctAnswer)] : []);

        return {
          stt: q.stt || (idx + 1),
          type: q.type || 'MULTIPLE_CHOICE',
          score: Number(q.score) > 0 ? Number(q.score) : 1.0,
          content: q.content || q.prompt || `Câu hỏi ${idx + 1}`,
          explanation: q.explanation || '',
          timeLimitSeconds: q.timeLimitSeconds ? Number(q.timeLimitSeconds) : 20,
          options: isEssay ? [] : (q.options || ['A', 'B', 'C', 'D']),
          correctAnswers: corrList,
          correctAnswer: corrList.length > 0 ? corrList[0] : null,
          selectionMode: q.selectionMode || (corrList.length > 1 ? 'MULTIPLE' : 'SINGLE'),
          image: q.image || q.imageUrl || null,
          blankTemplate: q.blankTemplate || '',
          blankAnswers: q.blankAnswers || [],
          audioUrl: q.audioUrl || null,
          audioName: q.audioName || null,
          playLimit: q.playLimit || 2,
          geometryData: q.geometryData || null,
          buggyCode: q.buggyCode || '',
          fixedCode: q.fixedCode || '',
          codeLanguage: q.codeLanguage || 'cpp',
          starterCode: q.starterCode || '',
          testCases: q.testCases || []
        };
      });
      paper.totalQuestions = paper.questions.length;
    }

    await paper.save();
    return res.json({ success: true, message: 'Cập nhật đề thi thành công!', data: paper });
  } catch (error) {
    console.error('Lỗi updateExamPaper:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};
