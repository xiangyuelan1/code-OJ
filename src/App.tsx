import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Component, type ReactNode, lazy } from "react";
import { useAuthStore } from "./stores/auth.store";
import { Layout } from "./components/layout/Layout";
import { AdminLayout } from "./pages/admin/AdminLayout";

const HomePage = lazy(() => import("./pages/Home").then(m => ({ default: m.HomePage })));
const LoginPage = lazy(() => import("./pages/Login").then(m => ({ default: m.LoginPage })));
const RegisterPage = lazy(() => import("./pages/Register").then(m => ({ default: m.RegisterPage })));
const ProblemDetailPage = lazy(() => import("./pages/ProblemDetail").then(m => ({ default: m.ProblemDetailPage })));
const SolvePage = lazy(() => import("./pages/Solve").then(m => ({ default: m.SolvePage })));
const SubmissionsPage = lazy(() => import("./pages/Submissions").then(m => ({ default: m.SubmissionsPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then(m => ({ default: m.ProfilePage })));
const SolutionDetailPage = lazy(() => import("./pages/SolutionDetail").then(m => ({ default: m.SolutionDetailPage })));
const KnowledgeTreePage = lazy(() => import("./pages/KnowledgeTreePage").then(m => ({ default: m.KnowledgeTreePage })));
const ExamListPage = lazy(() => import("./pages/ExamListPage").then(m => ({ default: m.ExamListPage })));
const ExamPage = lazy(() => import("./pages/ExamListPage").then(m => ({ default: m.ExamPage })));
const ExamResultPage = lazy(() => import("./pages/ExamResultPage").then(m => ({ default: m.ExamResultPage })));
const MatchPage = lazy(() => import("./pages/MatchPage").then(m => ({ default: m.MatchPage })));
const MatchBattlePage = lazy(() => import("./pages/MatchBattlePage").then(m => ({ default: m.MatchBattlePage })));
const ProblemCategoriesPage = lazy(() => import("./pages/ProblemCategoriesPage").then(m => ({ default: m.ProblemCategoriesPage })));
const AchievementPage = lazy(() => import("./pages/AchievementPage").then(m => ({ default: m.AchievementPage })));
const PaymentPage = lazy(() => import("./pages/PaymentPage").then(m => ({ default: m.PaymentPage })));
const AppDownloadPage = lazy(() => import("./pages/AppDownload").then(m => ({ default: m.AppDownloadPage })));
const TeacherClassesPage = lazy(() => import("./pages/teacher/TeacherClassesPage").then(m => ({ default: m.TeacherClassesPage })));
const TeacherDashboardPage = lazy(() => import("./pages/teacher/TeacherDashboard").then(m => ({ default: m.TeacherDashboard })));
const DiscussionsPage = lazy(() => import("./pages/Discussions").then(m => ({ default: m.DiscussionsPage })));
const DiscussionDetailPage = lazy(() => import("./pages/DiscussionDetail").then(m => ({ default: m.DiscussionDetailPage })));
const StarPathPage = lazy(() => import("./pages/StarPath").then(m => ({ default: m.StarPathPage })));
const StarRegionPage = lazy(() => import("./pages/StarRegion").then(m => ({ default: m.StarRegionPage })));
const StarChallengePage = lazy(() => import("./pages/StarChallenge").then(m => ({ default: m.StarChallengePage })));
const InterviewSimulatorPage = lazy(() => import("./pages/InterviewSimulator").then(m => ({ default: m.InterviewSimulator })));
const BugHunterPage = lazy(() => import("./pages/BugHunter").then(m => ({ default: m.BugHunter })));
const LearningHub = lazy(() => import("./pages/LearningHub").then(m => ({ default: m.LearningHub })));

const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard").then(m => ({ default: m.AdminDashboard })));
const AdminProblemsPage = lazy(() => import("./pages/admin/AdminProblemsPage").then(m => ({ default: m.AdminProblemsPage })));
const AdminProblemFormPage = lazy(() => import("./pages/admin/AdminProblemFormPage").then(m => ({ default: m.AdminProblemFormPage })));
const AdminBatchImportPage = lazy(() => import("./pages/admin/AdminBatchImportPage").then(m => ({ default: m.AdminBatchImportPage })));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminAIConfigPage = lazy(() => import("./pages/admin/AdminAIConfigPage").then(m => ({ default: m.AdminAIConfigPage })));
const AdminExamPage = lazy(() => import("./pages/admin/AdminExamPage").then(m => ({ default: m.AdminExamPage })));
const AdminSubmissionsPage = lazy(() => import("./pages/admin/AdminSubmissionsPage").then(m => ({ default: m.AdminSubmissionsPage })));
const AdminMatchesPage = lazy(() => import("./pages/admin/AdminMatchesPage").then(m => ({ default: m.AdminMatchesPage })));
const AdminKnowledgeTreePage = lazy(() => import("./pages/admin/AdminKnowledgeTreePage").then(m => ({ default: m.AdminKnowledgeTreePage })));
const AdminClassesPage = lazy(() => import("./pages/admin/AdminClassesPage").then(m => ({ default: m.AdminClassesPage })));
const AdminPaymentPage = lazy(() => import("./pages/admin/AdminPaymentPage").then(m => ({ default: m.AdminPaymentPage })));
const AdminAccessConfigPage = lazy(() => import("./pages/admin/AdminAccessConfigPage").then(m => ({ default: m.AdminAccessConfigPage })));
const AdminAIUsagePage = lazy(() => import("./pages/admin/AdminAIUsagePage").then(m => ({ default: m.AdminAIUsagePage })));
const AdminPromotionPage = lazy(() => import("./pages/admin/AdminPromotionPage").then(m => ({ default: m.AdminPromotionPage })));
const AdminLearningPage = lazy(() => import("./pages/admin/AdminLearningPage").then(m => ({ default: m.AdminLearningPage })));
const AdminFeaturesPage = lazy(() => import("./pages/admin/AdminFeaturesPage").then(m => ({ default: m.AdminFeaturesPage })));

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
                  <ProtectedRoute>
                    <SolvePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/submissions"
                element={
                  <ProtectedRoute>
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
              <Route
                path="/payment"
                element={
                  <ProtectedRoute>
                    <PaymentPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/app-download" element={<AppDownloadPage />} />
              <Route
                path="/teacher/classes"
                element={
                  <ProtectedRoute allowedRole="TEACHER">
                    <TeacherClassesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/dashboard"
                element={
                  <ProtectedRoute allowedRole="TEACHER">
                    <TeacherDashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/discussions" element={<DiscussionsPage />} />
              <Route path="/discussions/:id" element={<DiscussionDetailPage />} />
              <Route
                path="/learning"
                element={
                  <ProtectedRoute>
                    <LearningHub />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/starpath"
                element={
                  <ProtectedRoute>
                    <StarPathPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/starpath/region/:id"
                element={
                  <ProtectedRoute>
                    <StarRegionPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/starpath/planet/:id"
                element={
                  <ProtectedRoute>
                    <StarChallengePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/interview"
                element={
                  <ProtectedRoute>
                    <InterviewSimulatorPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/bug-hunter"
                element={
                  <ProtectedRoute>
                    <BugHunterPage />
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
              <Route path="problems/batch-import" element={<AdminBatchImportPage />} />
              <Route path="knowledge-tree" element={<AdminKnowledgeTreePage />} />
              <Route path="exams" element={<AdminExamPage />} />
              <Route path="exams/:id/attempts" element={<AdminExamPage />} />
              <Route path="submissions" element={<AdminSubmissionsPage />} />
              <Route path="matches" element={<AdminMatchesPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="classes" element={<AdminClassesPage />} />
              <Route path="ai-config" element={<AdminAIConfigPage />} />
              <Route path="ai-usage" element={<AdminAIUsagePage />} />
              <Route path="payments" element={<AdminPaymentPage />} />
              <Route path="promotions" element={<AdminPromotionPage />} />
              <Route path="access-config" element={<AdminAccessConfigPage />} />
              <Route path="learning" element={<AdminLearningPage />} />
              <Route path="features" element={<AdminFeaturesPage />} />
            </Route>
          </Routes>
      </Router>
    </ErrorBoundary>
  );
}
