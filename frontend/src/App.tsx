import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminAssessmentsPage } from './pages/admin/AdminAssessmentsPage';
import { AssessmentDetailsPage } from './pages/admin/AssessmentDetailsPage';
import { CreateAssessmentPage } from './pages/admin/CreateAssessmentPage';
import { AdminQuestionsPage } from './pages/admin/AdminQuestionsPage';
import { CreateQuestionPage } from './pages/admin/CreateQuestionPage';
import { EditQuestionPage } from './pages/admin/EditQuestionPage';
import { QuestionDetailsPage } from './pages/admin/QuestionDetailsPage';
import { AdminSubmissionsPage } from './pages/admin/AdminSubmissionsPage';
import { CandidateDashboard } from './pages/candidate/CandidateDashboard';
import { AppLayout } from './components/AppLayout';
import { ProtectedRoute } from './components/ProtectedRoute';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<AppLayout />}>
          <Route
            path="/admin"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/assessments"
            element={<ProtectedRoute role="ADMIN"><AdminAssessmentsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/assessments/new"
            element={<ProtectedRoute role="ADMIN"><CreateAssessmentPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/assessments/:id"
            element={<ProtectedRoute role="ADMIN"><AssessmentDetailsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/questions"
            element={<ProtectedRoute role="ADMIN"><AdminQuestionsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/questions/new"
            element={<ProtectedRoute role="ADMIN"><CreateQuestionPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/questions/:id/edit"
            element={<ProtectedRoute role="ADMIN"><EditQuestionPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/questions/:id"
            element={<ProtectedRoute role="ADMIN"><QuestionDetailsPage /></ProtectedRoute>}
          />
          <Route
            path="/admin/submissions"
            element={<ProtectedRoute role="ADMIN"><AdminSubmissionsPage /></ProtectedRoute>}
          />
          <Route
            path="/candidate"
            element={
              <ProtectedRoute role="CANDIDATE">
                <CandidateDashboard />
              </ProtectedRoute>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
