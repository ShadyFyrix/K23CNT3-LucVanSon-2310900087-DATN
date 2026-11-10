/**
 * =========================================================================
 * EXAM SESSION DATA TRANSFER OBJECT (DTO LAYER)
 * Chuẩn hóa cấu trúc trả về cho Ca thi và Vị trí chỗ ngồi thí sinh (2D / 3D).
 * =========================================================================
 */

/**
 * Chuẩn hóa DTO ca thi cho bảng điều khiển giám thị / thí sinh
 * @param {Object} session - Mongoose ExamSession doc
 * @returns {Object} Session DTO
 */
function toSessionDetailDTO(session) {
  if (!session) return null;
  const s = typeof session.toObject === 'function' ? session.toObject() : { ...session };

  return {
    _id: s._id,
    code: s.code,
    title: s.title,
    subject: s.subject,
    examPaper: s.examPaper ? {
      _id: s.examPaper._id,
      title: s.examPaper.title,
      code: s.examPaper.code,
      durationMinutes: s.examPaper.durationMinutes,
      questionsCount: Array.isArray(s.examPaper.questions) ? s.examPaper.questions.length : 0
    } : null,
    room: s.room ? {
      _id: s.room._id,
      code: s.room.code,
      name: s.room.name,
      rows: s.room.rows,
      cols: s.room.cols,
      layoutConfig: s.room.layoutConfig,
      roomPhoto: s.room.roomPhoto,
      viewMode: s.room.viewMode
    } : null,
    startTime: s.startTime,
    endTime: s.endTime,
    durationMinutes: s.durationMinutes,
    status: s.status,
    examType: s.examType,
    proctorSettings: s.proctorSettings || {},
    createdAt: s.createdAt
  };
}

/**
 * Chuẩn hóa DTO ghế ngồi thí sinh cho Sơ đồ Phòng thi 2D/3D (Telemetry & Proctors)
 * @param {Object} examStudent 
 * @returns {Object} Candidate Seat DTO
 */
function toCandidateSeatDTO(examStudent) {
  if (!examStudent) return null;
  const es = typeof examStudent.toObject === 'function' ? examStudent.toObject() : { ...examStudent };

  return {
    _id: es._id,
    candidateCode: es.candidateCode,
    blindCode: es.blindCode,
    seatRow: es.seatRow,
    seatCol: es.seatCol,
    seatPin: es.seatPin,
    status: es.status || 'ASSIGNED',
    trustScore: es.trustScore !== undefined ? es.trustScore : 100,
    isOnline: Boolean(es.isOnline),
    extraTimeMinutes: es.extraTimeMinutes || 0,
    isLateUnlocked: Boolean(es.isLateUnlocked),
    proctorOverrideUntil: es.proctorOverrideUntil || null,
    student: es.student ? {
      _id: es.student._id,
      studentCode: es.student.studentCode,
      fullName: es.student.fullName || es.student.name,
      avatar: es.student.avatar || null,
      class: es.student.class ? {
        _id: es.student.class._id,
        name: es.student.class.name,
        code: es.student.class.code
      } : null
    } : null
  };
}

module.exports = {
  toSessionDetailDTO,
  toCandidateSeatDTO
};
