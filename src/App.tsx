import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
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
import { AdminSolutionsPage } from "./pages/admin/AdminSolutionsPage";
import { AdminUsersPage } from "./pages/admin/AdminUsersPage";
import { AdminAIConfigPage } from "./pages/admin/AdminAIConfigPage";
import { ProfilePage } from "./pages/Profile";
import { SolutionDetailPage } from "./pages/SolutionDetail";

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
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
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
          <Route path="solutions" element={<AdminSolutionsPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="ai-config" element={<AdminAIConfigPage />} />
        </Route>
      </Routes>
    </Router>
  );
}
