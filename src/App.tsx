import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Component, type ReactNode } from "react";
import { useAuthStore } from "./stores/auth.store";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { HomePage } from "./pages/Home";
import { LoginPage } from "./pages/Login";
import { RegisterPage } from "./pages/Register";
import { ProblemDetailPage } from "./pages/ProblemDetail";
import { SolvePage } from "./pages/Solve";
import { SubmissionsPage } from "./pages/Submissions";
import { AdminDashboard } from "./pages/admin/AdminDashboard";
import { AdminProblemsPage } from "./pages/admin/AdminProblemsPage";
import { AdminProblemFormPage } from "./pages/admin/AdminProblemFormPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminAIConfigPage } from "./pages/admin/AdminAIConfigPage";
import { AdminExamPage } from "./pages/admin/AdminExamPage";
import { AdminSubmissionsPage } from "./pages/admin/AdminSubmissionsPage";
import { AdminMatchesPage } from "./pages/admin/AdminMatchesPage";
import { AdminKnowledgeTreePage } from "./pages/admin/AdminKnowledgeTreePage";
import { ProfilePage } from "./pages/Profile";
import { SolutionDetailPage } from "./pages/SolutionDetail";
import { KnowledgeTreePage } from "./pages/KnowledgeTreePage";
import { ExamListPage, ExamPage } from "./pages/ExamListPage";
import { ExamResultPage } from "./pages/ExamResultPage";
import { MatchPage } from "./pages/MatchPage";
import { MatchBattlePage } from "./pages/MatchBattlePage";
import { ProblemCategoriesPage } from "./pages/ProblemCategoriesPage";
import { AchievementPage } from "./pages/AchievementPage";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
          <div className="bg-slate-800 rounded-xl p-8 max-w-lg w-full text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold text-white mb-4">页面出错了</h2>
            <p className="text-slate-400 mb-2">发生了意外错误，请刷新页面重试</p>
            {this.state.error && (
              <pre className="text-left text-sm text-red-400 bg-slate-900 p-4 rounded-lg mt-4 overflow-auto max-h-40">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ProtectedRoute({ children, allowedRole }: { children: React.ReactNode; allowedRole?: string }) {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && user?.role !== allowedRole) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/categories" element={<ProblemCategoriesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/problem/:id" element={<ProblemDetailPage />} />
            <Route
              path="/problem/:id/solve"
              element={
                <ProtectedRoute allowedRole="STUDENT">
                  <SolvePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/submissions"
              element={
                <ProtectedRoute allowedRole="STUDENT">
                  <SubmissionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/solutions/:id"
              element={
                <ProtectedRoute>
                  <SolutionDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/knowledge-tree"
              element={
                <ProtectedRoute allowedRole="ADMIN">
                  <KnowledgeTreePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exams"
              element={
                <ProtectedRoute>
                  <ExamListPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:id"
              element={
                <ProtectedRoute>
                  <ExamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:id/result"
              element={
                <ProtectedRoute>
                  <ExamResultPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match"
              element={
                <ProtectedRoute>
                  <MatchPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/match/:id"
              element={
                <ProtectedRoute>
                  <MatchBattlePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/achievements"
              element={
                <ProtectedRoute>
                  <AchievementPage />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRole="ADMIN">
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="problems" element={<AdminProblemsPage />} />
            <Route path="problems/create" element={<AdminProblemFormPage />} />
            <Route path="problems/:id/edit" element={<AdminProblemFormPage />} />
            <Route path="knowledge-tree" element={<AdminKnowledgeTreePage />} />
            <Route path="exams" element={<AdminExamPage />} />
            <Route path="exams/:id/attempts" element={<AdminExamPage />} />
            <Route path="submissions" element={<AdminSubmissionsPage />} />
            <Route path="matches" element={<AdminMatchesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="ai-config" element={<AdminAIConfigPage />} />
          </Route>
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}
