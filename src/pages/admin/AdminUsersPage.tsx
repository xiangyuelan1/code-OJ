import { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { Users, UserCheck, UserX, Shield, GraduationCap } from 'lucide-react';

export function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getAll();
      if (res.success) {
        setUsers(res.data);
      }
    } catch (error) {
      console.error('加载用户失败', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId: string) => {
    try {
      await usersAPI.toggleStatus(userId);
      loadUsers();
    } catch (error) {
      console.error('切换状态失败', error);
      alert('操作失败');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const getRoleIcon = (role: string) => {
    return role === 'ADMIN' ? (
      <Shield className="h-4 w-4 text-purple-400" />
    ) : (
      <GraduationCap className="h-4 w-4 text-blue-400" />
    );
  };

  const activeUsers = users.filter(u => u.isActive).length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const studentCount = users.filter(u => u.role === 'STUDENT').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">用户管理</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-white mb-1">{users.length}</div>
              <div className="text-slate-400 text-sm">总用户数</div>
            </div>
            <div className="p-3 bg-blue-500/10 rounded-lg">
              <Users className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-green-400 mb-1">{activeUsers}</div>
              <div className="text-slate-400 text-sm">活跃用户</div>
            </div>
            <div className="p-3 bg-green-500/10 rounded-lg">
              <UserCheck className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold text-purple-400 mb-1">{adminCount}</div>
              <div className="text-slate-400 text-sm">管理员</div>
            </div>
            <div className="p-3 bg-purple-500/10 rounded-lg">
              <Shield className="h-6 w-6 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">邮箱</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">角色</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">注册时间</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold">
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <div className="text-white font-medium">{user.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{user.email}</td>
                  <td className="px-6 py-4">
                    <span className="flex items-center text-slate-300">
                      {getRoleIcon(user.role)}
                      <span className="ml-2">{user.role === 'ADMIN' ? '管理员' : '学生'}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">{formatDate(user.createdAt)}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      user.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.isActive ? '活跃' : '禁用'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <button
                        onClick={() => toggleUserStatus(user.id)}
                        className={`p-2 transition-colors ${
                          user.isActive
                            ? 'text-slate-400 hover:text-red-400'
                            : 'text-slate-400 hover:text-green-400'
                        }`}
                        title={user.isActive ? '禁用用户' : '启用用户'}
                      >
                        {user.isActive ? (
                          <UserX className="h-5 w-5" />
                        ) : (
                          <UserCheck className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
