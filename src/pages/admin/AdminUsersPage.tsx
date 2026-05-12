import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../services/api';
import { UserPlus, Lock, ToggleLeft, ToggleRight, Eye, EyeOff, Key, Trophy, FileText, Swords } from 'lucide-react';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [defaultPasswords] = useState<Record<string, string>>({
    admin: 'admin123',
    teacher: '123456',
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll();
      if (res.success) {
        setUsers(res.data || []);
      }
    } catch (error) {
      console.error('获取用户列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await usersAPI.toggleStatus(id);
      fetchUsers();
    } catch (error: any) {
      alert(error.error?.message || '操作失败');
    }
  };

  const handleResetPassword = async (id: string) => {
    if (!newPassword || newPassword.length < 6) {
      alert('密码长度至少6位');
      return;
    }
    try {
      await usersAPI.resetPassword(id, newPassword);
      setResettingId(null);
      setNewPassword('');
      alert('密码重置成功');
    } catch (error: any) {
      alert(error.error?.message || '重置失败');
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'ADMIN': return '管理员';
      case 'TEACHER': return '教师';
      case 'STUDENT': return '学生';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-purple-500/20 text-purple-400';
      case 'TEACHER': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-green-500/20 text-green-400';
    }
  };

  const getDefaultPassword = (username: string) => {
    return defaultPasswords[username] || '123456';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">用户管理</h1>
        <div className="text-slate-400">共 {users.length} 个用户</div>
      </div>

      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户名</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">邮箱</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">密码</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">积分/等级</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4">
                    <div className="text-white font-medium">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded ${getRoleColor(user.role)}`}>
                      {getRoleName(user.role)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-300 font-mono">
                        {showPasswords[user.id] ? getDefaultPassword(user.username) : '••••••'}
                      </span>
                      <button
                        onClick={() => setShowPasswords(prev => ({ ...prev, [user.id]: !prev[user.id] }))}
                        className="text-slate-400 hover:text-white"
                      >
                        {showPasswords[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {resettingId === user.id ? (
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="text"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm w-32"
                          placeholder="新密码"
                        />
                        <button
                          onClick={() => handleResetPassword(user.id)}
                          className="px-2 py-1 bg-cyan-500 text-white text-xs rounded hover:bg-cyan-600"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => { setResettingId(null); setNewPassword(''); }}
                          className="px-2 py-1 bg-slate-600 text-white text-xs rounded hover:bg-slate-500"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setResettingId(user.id); setNewPassword(''); }}
                        className="text-xs text-cyan-400 hover:text-cyan-300 mt-1 flex items-center gap-1"
                      >
                        <Key className="h-3 w-3" /> 重置密码
                      </button>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-cyan-400 font-semibold">{user.points || 0} 分</div>
                    <div className="text-slate-500 text-xs">Lv.{user.level || 1}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.isActive !== false ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.isActive !== false ? '正常' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleStatus(user.id)}
                        className="text-slate-400 hover:text-white"
                        title={user.isActive !== false ? '禁用账户' : '启用账户'}
                      >
                        {user.isActive !== false ? (
                          <ToggleRight className="h-5 w-5 text-green-400" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-red-400" />
                        )}
                      </button>
                      {user.role === 'STUDENT' && (
                        <>
                          <button
                            onClick={() => navigate(`/admin/submissions?userId=${user.id}`)}
                            className="text-slate-400 hover:text-cyan-400"
                            title="查看提交记录"
                          >
                            <FileText className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/admin/matches?userId=${user.id}`)}
                            className="text-slate-400 hover:text-orange-400"
                            title="查看PK记录"
                          >
                            <Swords className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
