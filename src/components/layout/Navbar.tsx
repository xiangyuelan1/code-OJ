import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { usePointsStore } from '../../stores/points.store';
import { useSocketStore } from '../../services/socket';
import { BookOpen, User, LogOut, Menu, X, Award, Crown, Users, Smartphone } from 'lucide-react';
import { useState, useEffect } from 'react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const { points, levelName, rank, fetchMyPoints } = usePointsStore();
  const { onlineCount, disconnect } = useSocketStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyPoints();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/');
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-cyan-400" />
              <span className="text-xl font-bold">Code OJ</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="hover:text-cyan-400 transition-colors">
              题目
            </Link>
            <Link to="/categories" className="hover:text-cyan-400 transition-colors">
              题单
            </Link>
            {isAuthenticated && (
              <Link to="/match" className="hover:text-cyan-400 transition-colors">
                对战
              </Link>
            )}
            {isAuthenticated && (
              <Link to="/exams" className="hover:text-cyan-400 transition-colors">
                考试
              </Link>
            )}
            <Link to="/app-download" className="hover:text-cyan-400 transition-colors flex items-center space-x-1">
              <Smartphone className="h-4 w-4" />
              <span>下载App</span>
            </Link>
            {isAuthenticated && (user?.role === 'STUDENT' || user?.role === 'TEACHER') && (
              <Link to="/submissions" className="hover:text-cyan-400 transition-colors">
                我的提交
              </Link>
            )}
            {user?.role === 'ADMIN' && (
              <Link to="/admin" className="hover:text-cyan-400 transition-colors">
                管理后台
              </Link>
            )}
            {isAuthenticated && user?.role === 'TEACHER' && (
              <Link to="/teacher/classes" className="hover:text-cyan-400 transition-colors">
                班级管理
              </Link>
            )}

            {isAuthenticated ? (
              <>
                <div className="flex items-center space-x-3 px-3 py-1.5 bg-slate-800 rounded-lg border border-slate-700">
                  <div className="flex items-center space-x-1">
                    <Users className="h-4 w-4 text-green-400" />
                    <span className="text-xs text-green-400">{onlineCount}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-600"></div>
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">{points}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-600"></div>
                  <div className="flex items-center space-x-1">
                    {levelName === '王者' ? (
                      <Crown className="h-4 w-4 text-purple-400" />
                    ) : (
                      <span className="text-sm">🏅</span>
                    )}
                    <span className="text-sm font-medium text-cyan-400">{levelName}</span>
                  </div>
                  {rank > 0 && (
                    <>
                      <div className="w-px h-4 bg-slate-600"></div>
                      <span className="text-xs text-slate-400">排名 #{rank}</span>
                    </>
                  )}
                </div>

                <Link to="/profile" className="hover:text-cyan-400 transition-colors flex items-center space-x-1">
                  <User className="h-4 w-4" />
                  <span>{user?.username}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hover:text-red-400 transition-colors flex items-center space-x-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span>登出</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="hover:text-cyan-400 transition-colors"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="bg-cyan-500 hover:bg-cyan-600 px-4 py-2 rounded-lg transition-colors"
                >
                  注册
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-white hover:text-cyan-400"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-3">
            <Link
              to="/"
              className="block hover:text-cyan-400"
              onClick={() => setMobileMenuOpen(false)}
            >
              题目列表
            </Link>
            <Link
              to="/categories"
              className="block hover:text-cyan-400"
              onClick={() => setMobileMenuOpen(false)}
            >
              题单
            </Link>
            {isAuthenticated && (
              <Link
                to="/match"
                className="block hover:text-cyan-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                对战
              </Link>
            )}
            {isAuthenticated && (
              <Link
                to="/exams"
                className="block hover:text-cyan-400"
                onClick={() => setMobileMenuOpen(false)}
              >
                考试
              </Link>
            )}
            <Link
              to="/app-download"
              className="block hover:text-cyan-400 flex items-center space-x-1"
              onClick={() => setMobileMenuOpen(false)}
            >
              <Smartphone className="h-4 w-4" />
              <span>下载App</span>
            </Link>
            {isAuthenticated ? (
              <>
                {(user?.role === 'STUDENT' || user?.role === 'TEACHER') && (
                  <Link
                    to="/submissions"
                    className="block hover:text-cyan-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    我的提交
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <Link
                    to="/admin"
                    className="block hover:text-cyan-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    管理后台
                  </Link>
                )}
                {user?.role === 'TEACHER' && (
                  <Link
                    to="/teacher/classes"
                    className="block hover:text-cyan-400"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    班级管理
                  </Link>
                )}
                <div className="flex items-center space-x-4 px-3 py-2 bg-slate-800 rounded-lg">
                  <div className="flex items-center space-x-1">
                    <Award className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm font-medium text-yellow-400">{points} 积分</span>
                  </div>
                  <span className="text-sm">🏅 {levelName}</span>
                </div>
                <Link
                  to="/profile"
                  className="block hover:text-cyan-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  个人中心
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="block text-red-400 hover:text-red-300"
                >
                  登出
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="block hover:text-cyan-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="block hover:text-cyan-400"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  注册
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
