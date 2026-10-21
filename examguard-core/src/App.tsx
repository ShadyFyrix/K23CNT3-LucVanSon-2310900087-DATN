import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

// ExamGuard AI Modules
import TakeExam from './pages/exam/TakeExam';
import GradingReview from './pages/exam/GradingReview';
import ExamResult from './pages/exam/ExamResult';
import LiveProctor from './pages/exam/LiveProctor';
import ExamSessions from './pages/exam/ExamSessions';
import ExamPapers from './pages/exam/ExamPapers';

// Academic & System Modules
import Students from './pages/Students';
import Teachers from './pages/Teachers';
import Classes from './pages/Classes';
import Courses from './pages/Courses';
import Campuses from './pages/Campuses';
import Users from './pages/Users';
import FaceKyc from './pages/FaceKyc';
import Permissions from './pages/Permissions';
import Settings from './pages/Settings';
import Newsfeed from './pages/Newsfeed';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Toaster
        position="top-right"
        containerStyle={{ zIndex: 99999 }}
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(148, 163, 184, 0.25)',
            borderRadius: '0.75rem',
            fontSize: '0.875rem',
            fontWeight: 500,
            padding: '12px 18px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.35), 0 8px 10px -6px rgba(0, 0, 0, 0.35)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#ffffff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#ffffff',
            },
          },
        }}
      />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* Workspace Thí sinh Làm bài Thi — Toàn màn hình & SEB Lockdown */}
          <Route path="/exam/take" element={<ProtectedRoute><TakeExam /></ProtectedRoute>} />
          <Route path="/take-exam/:sessionStudentId" element={<ProtectedRoute><TakeExam /></ProtectedRoute>} />
          <Route path="/take-exam" element={<ProtectedRoute><TakeExam /></ProtectedRoute>} />
          
          {/* Tra cứu Kết quả & Đối chiếu Đáp án */}
          <Route path="/exam/result" element={<ProtectedRoute><ExamResult /></ProtectedRoute>} />
          <Route path="/exam-result/:sessionStudentId" element={<ProtectedRoute><ExamResult /></ProtectedRoute>} />
          <Route path="/exam-result" element={<ProtectedRoute><ExamResult /></ProtectedRoute>} />

          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    
                    {/* Khảo thí & Giám sát ExamGuard AI */}
                    <Route path="/exam-sessions" element={<ExamSessions />} />
                    <Route path="/exam-papers" element={<ExamPapers />} />
                    <Route path="/live-proctor/:sessionId" element={<LiveProctor />} />
                    <Route path="/live-proctor" element={<LiveProctor />} />
                    <Route path="/grading-review/:sessionId" element={<GradingReview />} />
                    <Route path="/grading-review" element={<GradingReview />} />

                    {/* Quản lý Đào tạo theo Phân cấp */}
                    <Route path="/students" element={<Students />} />
                    <Route path="/teachers" element={<Teachers />} />
                    <Route path="/classes" element={<Classes />} />
                    <Route path="/courses" element={<Courses />} />
                    <Route path="/campuses" element={<Campuses />} />

                    {/* Hệ thống & Phân quyền */}
                    <Route path="/users" element={<Users />} />
                    <Route path="/face-kyc" element={<FaceKyc />} />
                    <Route path="/permissions" element={<Permissions />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/newsfeed" element={<Newsfeed />} />

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

