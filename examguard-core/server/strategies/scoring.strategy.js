/**
 * =========================================================================
 * SCORING STRATEGY PATTERN (Tuân thủ Open/Closed Principle - OCP & SRP)
 * Cho phép mở rộng thêm các dạng câu hỏi mới (Trắc nghiệm nhiều đáp án,
 * Tự luận AI, Kéo thả, Lập trình) mà không cần sửa đổi mã nguồn chấm thi lõi.
 * =========================================================================
 */

class BaseScoringStrategy {
  /**
   * Đánh giá câu trả lời của thí sinh
   * @param {Object} question - Đối tượng câu hỏi trong ExamPaper
   * @param {any} studentChoice - Lựa chọn/nội dung nộp của thí sinh
   * @returns {{ isCorrect: boolean|null, scoreEarned: number, status: 'CORRECT'|'WRONG'|'SKIPPED'|'PENDING' }}
   */
  evaluate(question, studentChoice) {
    throw new Error('Phương thức evaluate() phải được triển khai bởi lớp con.');
  }
}

/**
 * Chiến lược chấm điểm Trắc nghiệm nhiều lựa chọn (Multiple Choice)
 */
class MultipleChoiceScoringStrategy extends BaseScoringStrategy {
  evaluate(question, studentChoice) {
    const score = Number(question.score) || 1;

    // Trường hợp câu hỏi bị hủy / công nhận đúng toàn bộ
    if (question.correctAnswer === 'ALL_CORRECT') {
      return { isCorrect: true, scoreEarned: score, status: 'CORRECT' };
    }

    // Không làm bài
    if (studentChoice === undefined || studentChoice === null || studentChoice === '') {
      return { isCorrect: false, scoreEarned: 0, status: 'SKIPPED' };
    }

    let isCorrect = false;

    // Đáp án đúng dạng danh sách (chọn nhiều đáp án đúng)
    if (Array.isArray(question.correctAnswer)) {
      if (Array.isArray(studentChoice)) {
        const sortedOfficial = [...question.correctAnswer].map(Number).sort((a, b) => a - b);
        const sortedStudent = [...studentChoice].map(Number).sort((a, b) => a - b);
        isCorrect = JSON.stringify(sortedOfficial) === JSON.stringify(sortedStudent);
      } else {
        isCorrect = question.correctAnswer.map(Number).includes(Number(studentChoice));
      }
    } else {
      isCorrect = Number(studentChoice) === Number(question.correctAnswer);
    }

    return {
      isCorrect,
      scoreEarned: isCorrect ? score : 0,
      status: isCorrect ? 'CORRECT' : 'WRONG'
    };
  }
}

/**
 * Chiến lược chấm điểm Tự luận (Essay / File Upload / Hybrid)
 */
class EssayScoringStrategy extends BaseScoringStrategy {
  evaluate(question, studentChoice) {
    const text = typeof studentChoice === 'string' ? studentChoice : (studentChoice?.text || '');
    const hasFile = Boolean(studentChoice?.fileUrl || studentChoice?.fileVal);
    const hasAnswer = text.trim().length > 0 || hasFile;

    return {
      isCorrect: null, // Cần Giảng viên chấm tay hoặc AI thẩm định
      scoreEarned: 0,
      status: hasAnswer ? 'PENDING' : 'SKIPPED'
    };
  }
}

/**
 * Chiến lược chấm điểm Lập trình (Coding Problem & Test Cases)
 */
class CodingProblemScoringStrategy extends BaseScoringStrategy {
  evaluate(question, studentChoice) {
    const code = typeof studentChoice === 'string' ? studentChoice : (studentChoice?.code || '');
    const hasCode = code.trim().length > 0;

    return {
      isCorrect: null,
      scoreEarned: 0,
      status: hasCode ? 'PENDING' : 'SKIPPED'
    };
  }
}

/**
 * Factory quản lý và cấp phát chiến lược chấm điểm theo loại câu hỏi (Strategy Registry)
 */
class ScoringStrategyFactory {
  static strategies = {
    'MULTIPLE_CHOICE': new MultipleChoiceScoringStrategy(),
    'ESSAY': new EssayScoringStrategy(),
    'CODING_PROBLEM': new CodingProblemScoringStrategy()
  };

  /**
   * Đăng ký chiến lược chấm điểm mới (Mở rộng linh hoạt theo OCP)
   */
  static registerStrategy(type, strategyInstance) {
    if (!(strategyInstance instanceof BaseScoringStrategy)) {
      throw new Error('Chiến lược chấm điểm phải kế thừa từ BaseScoringStrategy');
    }
    this.strategies[type] = strategyInstance;
  }

  /**
   * Lấy chiến lược tương ứng với loại câu hỏi
   */
  static getStrategy(type) {
    return this.strategies[type] || this.strategies['MULTIPLE_CHOICE'];
  }
}

module.exports = {
  BaseScoringStrategy,
  MultipleChoiceScoringStrategy,
  EssayScoringStrategy,
  CodingProblemScoringStrategy,
  ScoringStrategyFactory
};
