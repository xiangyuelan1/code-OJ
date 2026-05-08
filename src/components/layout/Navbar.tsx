import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { BookOpen, User, LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
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
              题目列表
            </Link>
            
            {isAuthenticated ? (
              <>
                {user?.role === 'STUDENT' && (
                  <Link to="/submissions" className="hover:text-cyan-400 transition-colors">
                    我的提交
                  </Link>
                )}
                {user?.role === 'ADMIN' && (
                  <Link to="/admin" className="hover:text-cyan-400 transition-colors">
                    管理后台
                  </Link>
                )}
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
            {isAuthenticated ? (
              <>
                {user?.role === 'STUDENT' && (
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
