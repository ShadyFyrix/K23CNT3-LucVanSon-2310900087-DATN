/**
 * =========================================================================
 * EXAM CONTROLLER FACADE (Tuân thủ Single Responsibility & Facade Pattern)
 * Hợp nhất các controller chuyên biệt theo domain nghiệp vụ:
 *   1. ExamPaperController      -> Quản lý đề thi, upload, matrix ma trận đáp án
 *   2. ExamSessionController    -> Quản lý ca thi, phòng thi, phân bổ SBD, chỗ ngồi
 *   3. ExamSubmissionController -> Không gian làm bài thí sinh, nộp bài, tra cứu điểm
 * Đảm bảo 100% tương thích ngược (Backward Compatibility) với các Route hiện có.
 * =========================================================================
 */

const examPaperController = require('./examPaper.controller');
const examSessionController = require('./examSession.controller');
const examSubmissionController = require('./examSubmission.controller');

module.exports = {
  // 1. Quản lý đề thi (Exam Papers)
  uploadPaperFile: examPaperController.uploadPaperFile,
  createExamPaper: examPaperController.createExamPaper,
  getExamPapers: examPaperController.getExamPapers,
  getExamPaperDetail: examPaperController.getExamPaperDetail,
  updateExamPaper: examPaperController.updateExamPaper,

  // 2. Quản lý phòng thi & Ca thi (Exam Rooms & Sessions)
  getExamRooms: examSessionController.getExamRooms,
  createExamRoom: examSessionController.createExamRoom,
  createExamSession: examSessionController.createExamSession,
  getExamSessions: examSessionController.getExamSessions,
  endExamSession: examSessionController.endExamSession,
  getExamSessionDetail: examSessionController.getExamSessionDetail,
  assignStudentsToSession: examSessionController.assignStudentsToSession,
  updateExamStudent: examSessionController.updateExamStudent,
  bulkGenerateCandidateCodes: examSessionController.bulkGenerateCandidateCodes,
  addStudentToSession: examSessionController.addStudentToSession,
  bulkAddStudentsToSession: examSessionController.bulkAddStudentsToSession,
  removeStudentFromSession: examSessionController.removeStudentFromSession,

  // 3. Candidate Workspace, Nộp bài thi & Tra cứu lịch/kết quả
  getSanitizedQuestions: examSubmissionController.getSanitizedQuestions,
  saveProgress: examSubmissionController.saveProgress,
  submitExam: examSubmissionController.submitExam,
  getStudentExamResult: examSubmissionController.getStudentExamResult,
  getStudentExamSchedule: examSubmissionController.getStudentExamSchedule
};
