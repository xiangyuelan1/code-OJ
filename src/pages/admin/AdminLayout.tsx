import { Link, useNavigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { BookOpen, List, Users, Cpu, Settings, LogOut, BarChart3 } from 'lucide-react';

export function AdminLayout() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { path: '/admin', label: '概览', icon: BarChart3, exact: true },
    { path: '/admin/problems', label: '题目管理', icon: List },
    { path: '/admin/solutions', label: '题解管理', icon: BookOpen },
    { path: '/admin/users', label: '用户管理', icon: Users },
    { path: '/admin/ai-config', label: 'AI配置', icon: Cpu },
  ];

  return (
    <div className="flex min-h-screen bg-slate-900">
      <aside className="w-64 bg-slate-800 border-r border-slate-700">
        <div className="p-6">
          <Link to="/" className="flex items-center space-x-2">
            <BookOpen className="h-8 w-8 text-cyan-400" />
            <span className="text-xl font-bold text-white">Code OJ</span>
          </Link>
        </div>

        <nav className="mt-6 px-4">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center px-4 py-3 text-slate-300 hover:bg-slate-700 hover:text-cyan-400 rounded-lg transition-colors mb-2"
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-slate-700">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              <div className="font-medium text-white">{user?.username}</div>
              <div className="text-xs">管理员</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-400 hover:text-red-400 transition-colors"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
}
