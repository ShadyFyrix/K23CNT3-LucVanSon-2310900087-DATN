/**
 * EXAMGUARD AI — TYPES DEFINITION
 * Định nghĩa kiểu dữ liệu chuẩn theo SYSTEM_BLUEPRINT.md
 */

// 1. Vai trò & Phân quyền
export type UserRole = 'admin' | 'academic' | 'teacher' | 'student';

export interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: UserRole | { _id: string; name: string };
  roles?: (string | { _id: string; name: string })[];
  department?: string;
  status: 'active' | 'inactive';
  isFaceRegistered?: boolean;
  facePhoto?: string;
  createdAt?: string;
  updatedAt?: string;
}

// 2. Cơ cấu Đào tạo theo Phân cấp
export interface Department {
  _id: string;
  name: string;
  code: string;
  phone?: string;
  description?: string;
  createdAt?: string;
}

export interface AcademicBatch {
  _id: string;
  code: string; // VD: K23
  name: string; // VD: Khóa 2023 - 2027
  startYear: number;
  endYear: number;
  department: string | Department;
  status: 'active' | 'graduated' | 'inactive';
}

export interface Class {
  _id: string;
  code: string; // VD: K23CNT3
  name: string;
  batch: string | AcademicBatch;
  department: string | Department;
  studentCount?: number;
  description?: string;
}

export interface Course {
  _id: string;
  courseCode: string; // VD: IT201
  name: string; // VD: Kỹ thuật lập trình
  credits: number; // Số tín chỉ
  department?: string | Department;
  description?: string;
  status: 'active' | 'inactive';
}

// 3. Giảng viên & Sinh viên
export interface Student {
  _id: string;
  studentCode: string; // VD: 2310900087
  fullName: string;
  email: string;
  phone?: string;
  gender: 'M' | 'F' | 'OTHER' | 'male' | 'female' | 'other';
  birthday?: string;
  avatar?: string;
  department?: string | Department;
  batch?: string | AcademicBatch;
  class?: string | Class;
  userId?: string | User;
  isFaceRegistered?: boolean;
  facePhoto?: string;
  status: 'studying' | 'graduated' | 'suspended';
}

export interface Teacher {
  _id: string;
  teacherCode: string; // VD: GV001
  fullName: string;
  email: string;
  phone?: string;
  avatar?: string;
  department?: string | Department;
  title?: string; // Thạc sĩ, Tiến sĩ...
  specialization?: string;
  userId?: string | User;
  isFaceRegistered?: boolean;
  facePhoto?: string;
  status: 'active' | 'inactive';
}

export interface ExamRoom {
  _id: string;
  code: string; // VD: P204-A1
  name: string;
  building: string;
  campus: string;
  capacity: number;
  ipSubnet?: string;
  seatingGrid?: {
    rows: number;
    cols: number;
    seats: any[];
  };
  status: 'available' | 'in_exam' | 'maintenance';
}

// 4. Ngân hàng Đề thi & Khảo thí
export interface ExamQuestion {
  _id?: string;
  questionNumber: number;
  content: string;
  options: {
    key: 'A' | 'B' | 'C' | 'D';
    text: string;
  }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  points: number;
  explanation?: string;
}

export interface ExamPaper {
  _id: string;
  title: string;
  paperCode: string;
  course: string | Course;
  durationMinutes: number;
  totalPoints: number;
  questions: ExamQuestion[];
  isApproved: boolean;
  createdBy: string | User;
  createdAt?: string;
}

// 5. Ca thi & Giám sát Khảo thí
export interface ExamSession {
  _id: string;
  sessionCode: string;
  title: string;
  course: string | Course;
  paper: string | ExamPaper;
  room: string | ExamRoom;
  proctors: (string | Teacher | User)[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  status: 'SCHEDULED' | 'CHECKING_IN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  aiProctorConfig: {
    antiCheatingStrictLevel: 'STANDARD' | 'HIGH' | 'MAXIMUM';
    faceRecognitionRequired: boolean;
    multipleFacesAlert: boolean;
    voiceDetectionAlert: boolean;
    sebLockdownRequired: boolean;
  };
}

export interface ExamStudent {
  _id: string;
  examSession: string | ExamSession;
  student: string | Student;
  seatNumber: string;
  status: 'NOT_CHECKED_IN' | 'CHECKED_IN' | 'IN_EXAM' | 'SUBMITTED' | 'DISQUALIFIED';
  faceVerified: boolean;
  faceConfidence?: number;
  checkInTime?: string;
}

export interface ExamViolation {
  _id: string;
  examSession: string | ExamSession;
  student: string | Student;
  violationType: 'MULTIPLE_PERSONS' | 'NO_FACE_DETECTED' | 'LOOKING_AWAY' | 'SUSPICIOUS_AUDIO' | 'TAB_SWITCH' | 'SEB_BREACH';
  confidence: number;
  timestamp: string;
  snapshotUrl?: string;
  proctorNote?: string;
  actionTaken?: 'WARNING' | 'DEDUCT_POINTS' | 'DISQUALIFIED' | 'DISMISSED';
}

export interface ExamSubmission {
  _id: string;
  examSession: string | ExamSession;
  student: string | Student;
  answers: {
    questionNumber: number;
    selectedAnswer: string;
    isCorrect?: boolean;
    pointsEarned?: number;
  }[];
  rawScore?: number;
  finalScore?: number;
  status: 'AUTO_GRADED' | 'REVIEWED' | 'APPROVED';
  reviewerNote?: string;
  approvedAt?: string;
}
