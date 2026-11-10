/**
 * =========================================================================
 * EXAM PAPER DATA TRANSFER OBJECT (DTO & SANITIZATION LAYER)
 * Tuân thủ Single Responsibility & Interface Segregation Principle (ISP)
 * Đảm bảo nguyên tắc bảo mật Zero-Knowledge: Không để lộ đáp án đúng,
 * lời giải thích hoặc thang điểm chi tiết cho thí sinh trước khi nộp bài.
 * =========================================================================
 */

/**
 * Lọc bỏ toàn bộ thông tin nhạy cảm của đề thi cho Thí sinh làm bài
 * @param {Object} paper - Mongoose ExamPaper doc hoặc raw object
 * @returns {Object} Sanitized Paper DTO
 */
function sanitizePaperForCandidate(paper) {
  if (!paper) return null;
  const p = typeof paper.toObject === 'function' ? paper.toObject() : { ...paper };

  const sanitizedQuestions = (p.questions || []).map((q, idx) => {
    const qObj = typeof q.toObject === 'function' ? q.toObject() : { ...q };

    // Tách bỏ đáp án đúng & lời giải
    const {
      correctAnswer,
      explanation,
      gradingRubric,
      sampleSolution,
      gradingNote,
      ...safeQuestion
    } = qObj;

    return {
      ...safeQuestion,
      order: safeQuestion.order !== undefined ? safeQuestion.order : idx + 1,
      // Đảm bảo options không chứa metadata đánh dấu đáp án đúng
      options: (safeQuestion.options || []).map(opt => {
        if (typeof opt === 'string') return opt;
        const { isCorrect, ...safeOpt } = opt;
        return safeOpt;
      })
    };
  });

  return {
    _id: p._id,
    code: p.code,
    title: p.title,
    subject: p.subject,
    durationMinutes: p.durationMinutes,
    totalPoints: p.totalPoints,
    instructions: p.instructions,
    questionsCount: sanitizedQuestions.length,
    questions: sanitizedQuestions
  };
}

/**
 * Chuẩn hóa DTO tóm tắt đề thi cho danh sách giảng viên / khảo thí
 * @param {Object} paper 
 * @returns {Object} Paper Summary DTO
 */
function toPaperSummaryDTO(paper) {
  if (!paper) return null;
  const p = typeof paper.toObject === 'function' ? paper.toObject() : { ...paper };

  return {
    _id: p._id,
    code: p.code,
    title: p.title,
    subject: p.subject,
    durationMinutes: p.durationMinutes,
    totalPoints: p.totalPoints || 10,
    questionsCount: Array.isArray(p.questions) ? p.questions.length : 0,
    hasFile: Boolean(p.fileUrl),
    fileName: p.fileName,
    author: p.author ? {
      _id: p.author._id,
      fullName: p.author.fullName || p.author.name,
      email: p.author.email
    } : null,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt
  };
}

module.exports = {
  sanitizePaperForCandidate,
  toPaperSummaryDTO
};
