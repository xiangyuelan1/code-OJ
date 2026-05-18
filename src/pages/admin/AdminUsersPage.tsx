import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usersAPI } from '../../services/api';
import { useAuthStore } from '../../stores/auth.store';
import {
  Lock, ToggleLeft, ToggleRight, Eye, EyeOff, Key, Trophy, FileText, Swords,
  ChevronDown, X, Shield, Clock, CreditCard, Users, BookOpen, Award,
  Calendar, CheckCircle, XCircle, AlertCircle,
} from 'lucide-react';

const ROLES = ['STUDENT', 'TEACHER'] as const;
type ChangeableRole = (typeof ROLES)[number];

const ACCESS_TYPES = ['TRIAL', 'PAID', 'CLASS', 'ADMIN'] as const;
const ACCESS_TYPE_LABELS: Record<string, string> = {
  TRIAL: '试用',
  PAID: '付费',
  CLASS: '班级',
  ADMIN: '管理员',
};
const ACCESS_TYPE_COLORS: Record<string, string> = {
  TRIAL: 'bg-yellow-500/20 text-yellow-400',
  PAID: 'bg-blue-500/20 text-blue-400',
  CLASS: 'bg-green-500/20 text-green-400',
  ADMIN: 'bg-purple-500/20 text-purple-400',
};

type DetailTab = 'access' | 'submissions' | 'points' | 'payments';

export function AdminUsersPage() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [roleDropdownOpen, setRoleDropdownOpen] = useState<string | null>(null);
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [defaultPasswords] = useState<Record<string, string>>({
    admin: 'admin123',
    teacher: '123456',
  });

  // 用户详情对话框状态
  const [detailUser, setDetailUser] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<DetailTab>('access');
  const [accessData, setAccessData] = useState<any>(null);

  // 访问权限编辑状态
  const [editAccessType, setEditAccessType] = useState<string>('');
  const [editAccessExpiresAt, setEditAccessExpiresAt] = useState<string>('');
  const [editTrialStartsAt, setEditTrialStartsAt] = useState<string>('');
  const [savingAccess, setSavingAccess] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setRoleDropdownOpen(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  const handleChangeRole = async (id: string, role: ChangeableRole) => {
    setChangingRoleId(id);
    setRoleDropdownOpen(null);
    try {
      await usersAPI.changeRole(id, role);
      fetchUsers();
    } catch (error: any) {
      alert(error.error?.message || '角色变更失败');
    } finally {
      setChangingRoleId(null);
    }
  };

  const openUserDetail = async (userId: string) => {
    setDetailLoading(true);
    setDetailTab('access');
    setDetailUser(userId);
    try {
      const res = await usersAPI.getAccess(userId);
      if (res.success && res.data) {
        setAccessData(res.data);
        setEditAccessType(res.data.user.accessType || 'TRIAL');
        setEditAccessExpiresAt(res.data.user.accessExpiresAt
          ? new Date(res.data.user.accessExpiresAt).toISOString().slice(0, 16)
          : '');
        setEditTrialStartsAt(res.data.user.trialStartsAt
          ? new Date(res.data.user.trialStartsAt).toISOString().slice(0, 16)
          : '');
      }
    } catch (error) {
      console.error('获取用户详情失败', error);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeUserDetail = () => {
    setDetailUser(null);
    setAccessData(null);
  };

  const handleSaveAccess = async () => {
    if (!detailUser) return;
    setSavingAccess(true);
    try {
      const data: Record<string, any> = {};
      if (editAccessType !== accessData.user.accessType) {
        data.accessType = editAccessType;
      }
      const newExpires = editAccessExpiresAt || null;
      const oldExpires = accessData.user.accessExpiresAt
        ? new Date(accessData.user.accessExpiresAt).toISOString().slice(0, 16)
        : '';
      if (newExpires !== oldExpires) {
        data.accessExpiresAt = newExpires;
      }
      const newTrial = editTrialStartsAt || null;
      const oldTrial = accessData.user.trialStartsAt
        ? new Date(accessData.user.trialStartsAt).toISOString().slice(0, 16)
        : '';
      if (newTrial !== oldTrial) {
        data.trialStartsAt = newTrial;
      }

      if (Object.keys(data).length === 0) {
        alert('没有需要保存的更改');
        setSavingAccess(false);
        return;
      }

      await usersAPI.updateAccess(detailUser, data);
      alert('访问权限已更新');
      await openUserDetail(detailUser);
      fetchUsers();
    } catch (error: any) {
      alert(error.error?.message || '更新失败');
    } finally {
      setSavingAccess(false);
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

  const isSelf = (userId: string) => currentUser?.id === userId;

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '未设置';
    return new Date(date).toLocaleString('zh-CN');
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'text-green-400';
      case 'REJECTED': return 'text-red-400';
      default: return 'text-yellow-400';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'APPROVED': return '已通过';
      case 'REJECTED': return '已拒绝';
      default: return '待审核';
    }
  };

  const getSubmissionStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'text-green-400';
      case 'WRONG_ANSWER': return 'text-red-400';
      case 'TIME_LIMIT_EXCEEDED': return 'text-yellow-400';
      case 'COMPILE_ERROR': return 'text-orange-400';
      case 'RUNTIME_ERROR': return 'text-pink-400';
      default: return 'text-slate-400';
    }
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
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">访问类型</th>
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
                    <div className="relative" ref={roleDropdownOpen === user.id ? dropdownRef : undefined}>
                      {isSelf(user.id) || user.role === 'ADMIN' ? (
                        <span className={`text-xs px-2 py-1 rounded ${getRoleColor(user.role)}`}>
                          {getRoleName(user.role)}
                        </span>
                      ) : (
                        <div className="relative">
                          <button
                            onClick={() =>
                              setRoleDropdownOpen(roleDropdownOpen === user.id ? null : user.id)
                            }
                            disabled={changingRoleId === user.id}
                            className="flex items-center gap-1 text-xs px-2 py-1 rounded hover:opacity-80 transition-opacity disabled:opacity-50"
                          >
                            <span className={`px-1.5 py-0.5 rounded ${getRoleColor(user.role)}`}>
                              {changingRoleId === user.id ? '变更中...' : getRoleName(user.role)}
                            </span>
                            <ChevronDown className="h-3 w-3 text-slate-400" />
                          </button>
                          {roleDropdownOpen === user.id && (
                            <div className="absolute top-full left-0 mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10 min-w-[100px]">
                              {ROLES.map((role) => (
                                <button
                                  key={role}
                                  onClick={() => handleChangeRole(user.id, role)}
                                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-600 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                                    user.role === role ? 'text-cyan-400' : 'text-slate-300'
                                  }`}
                                >
                                  {getRoleName(role)}
                                  {user.role === role && ' ✓'}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-1 rounded ${ACCESS_TYPE_COLORS[user.accessType] || 'bg-slate-500/20 text-slate-400'}`}>
                      {ACCESS_TYPE_LABELS[user.accessType] || user.accessType}
                    </span>
                    {user.accessExpiresAt && (
                      <div className="text-slate-500 text-xs mt-1">
                        到期: {new Date(user.accessExpiresAt).toLocaleDateString('zh-CN')}
                      </div>
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
                      <button
                        onClick={() => openUserDetail(user.id)}
                        className="text-slate-400 hover:text-cyan-400"
                        title="查看详情"
                      >
                        <Shield className="h-4 w-4" />
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

      {/* 用户详情对话框 */}
      {detailUser && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* 对话框头部 */}
            <div className="flex items-center justify-between p-6 border-b border-slate-700">
              <div className="flex items-center gap-3">
                <Shield className="h-6 w-6 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {accessData?.user?.username || '用户详情'}
                  </h2>
                  <p className="text-slate-400 text-sm">{accessData?.user?.email}</p>
                </div>
              </div>
              <button
                onClick={closeUserDetail}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* 标签页 */}
            <div className="flex border-b border-slate-700 px-6">
              {([
                { key: 'access', label: '访问权限', icon: Shield },
                { key: 'submissions', label: '提交记录', icon: FileText },
                { key: 'points', label: '积分记录', icon: Award },
                { key: 'payments', label: '支付记录', icon: CreditCard },
              ] as const).map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setDetailTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    detailTab === tab.key
                      ? 'border-cyan-400 text-cyan-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              {detailLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
                </div>
              ) : (
                <>
                  {/* 访问权限标签页 */}
                  {detailTab === 'access' && accessData && (
                    <div className="space-y-6">
                      {/* 重置密码 */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          重置密码
                        </h3>
                        <div className="flex items-center gap-3">
                          <input
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="flex-1 px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                            placeholder="输入新密码（至少6位）"
                          />
                          <button
                            onClick={() => {
                              if (detailUser && newPassword.length >= 6) {
                                handleResetPassword(detailUser);
                              }
                            }}
                            disabled={!newPassword || newPassword.length < 6}
                            className="px-4 py-2 bg-red-500/20 text-red-400 text-sm rounded-lg hover:bg-red-500/30 disabled:opacity-50 transition-colors"
                          >
                            重置密码
                          </button>
                        </div>
                        <p className="text-slate-500 text-xs mt-2">密码在数据库中加密存储，无法查看原始密码，只能重置为新密码</p>
                      </div>

                      {/* 当前访问状态 */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3">当前访问状态</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="text-xs text-slate-500">访问类型</div>
                              <span className={`text-xs px-2 py-0.5 rounded ${ACCESS_TYPE_COLORS[accessData.user.accessType] || ''}`}>
                                {ACCESS_TYPE_LABELS[accessData.user.accessType] || accessData.user.accessType}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="text-xs text-slate-500">试用开始</div>
                              <div className="text-sm text-white">{formatDate(accessData.user.trialStartsAt)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-slate-400" />
                            <div>
                              <div className="text-xs text-slate-500">访问到期</div>
                              <div className="text-sm text-white">{formatDate(accessData.user.accessExpiresAt)}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {accessData.accessCheck?.hasAccess ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                            <div>
                              <div className="text-xs text-slate-500">访问状态</div>
                              <div className={`text-sm ${accessData.accessCheck?.hasAccess ? 'text-green-400' : 'text-red-400'}`}>
                                {accessData.accessCheck?.hasAccess ? '有权限' : '无权限'}
                                {accessData.accessCheck?.message && ` (${accessData.accessCheck.message})`}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 班级成员关系 */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          班级成员关系
                        </h3>
                        {accessData.classMemberships?.length > 0 ? (
                          <div className="space-y-2">
                            {accessData.classMemberships.map((m: any) => (
                              <div key={m.id} className="flex items-center justify-between bg-slate-600/50 rounded px-3 py-2">
                                <div>
                                  <span className="text-white text-sm">{m.class.name}</span>
                                  {m.class.description && (
                                    <span className="text-slate-400 text-xs ml-2">{m.class.description}</span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-400">
                                  {m.role === 'TEACHER' ? '教师' : '学生'} · 加入于 {new Date(m.joinedAt).toLocaleDateString('zh-CN')}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-sm">不属于任何班级</p>
                        )}
                      </div>

                      {/* 编辑访问权限 */}
                      <div className="bg-slate-700/50 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          修改访问权限
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">访问类型</label>
                            <select
                              value={editAccessType}
                              onChange={(e) => setEditAccessType(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                            >
                              {ACCESS_TYPES.map((t) => (
                                <option key={t} value={t}>{ACCESS_TYPE_LABELS[t]}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">试用开始时间</label>
                            <input
                              type="datetime-local"
                              value={editTrialStartsAt}
                              onChange={(e) => setEditTrialStartsAt(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-slate-400 mb-1">访问到期时间</label>
                            <input
                              type="datetime-local"
                              value={editAccessExpiresAt}
                              onChange={(e) => setEditAccessExpiresAt(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-400"
                            />
                          </div>
                        </div>
                        <div className="mt-4 flex items-center gap-3">
                          <button
                            onClick={handleSaveAccess}
                            disabled={savingAccess}
                            className="px-4 py-2 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
                          >
                            {savingAccess ? '保存中...' : '保存更改'}
                          </button>
                          <button
                            onClick={() => {
                              setEditAccessType(accessData.user.accessType || 'TRIAL');
                              setEditAccessExpiresAt(accessData.user.accessExpiresAt
                                ? new Date(accessData.user.accessExpiresAt).toISOString().slice(0, 16)
                                : '');
                              setEditTrialStartsAt(accessData.user.trialStartsAt
                                ? new Date(accessData.user.trialStartsAt).toISOString().slice(0, 16)
                                : '');
                            }}
                            className="px-4 py-2 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-500 transition-colors"
                          >
                            重置
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 提交记录标签页 */}
                  {detailTab === 'submissions' && accessData && (
                    <div>
                      {accessData.submissions?.length > 0 ? (
                        <div className="space-y-2">
                          {accessData.submissions.map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-medium ${getSubmissionStatusColor(s.status)}`}>
                                  {s.status}
                                </span>
                                <div>
                                  <span className="text-white text-sm">{s.problem?.title || s.problemId}</span>
                                  <span className="text-slate-500 text-xs ml-2">{s.problem?.type}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                {s.score !== null && <span className="text-slate-300">得分: {s.score}</span>}
                                {s.pointsEarned > 0 && <span className="text-cyan-400">+{s.pointsEarned}分</span>}
                                <span className="text-slate-500 text-xs">{new Date(s.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-8">暂无提交记录</p>
                      )}
                    </div>
                  )}

                  {/* 积分记录标签页 */}
                  {detailTab === 'points' && accessData && (
                    <div>
                      <div className="bg-slate-700/50 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-6">
                          <div>
                            <span className="text-xs text-slate-500">当前积分</span>
                            <div className="text-2xl font-bold text-cyan-400">{accessData.user.points || 0}</div>
                          </div>
                          <div>
                            <span className="text-xs text-slate-500">等级</span>
                            <div className="text-2xl font-bold text-white">Lv.{accessData.user.level || 1}</div>
                          </div>
                        </div>
                      </div>
                      {accessData.pointLogs?.length > 0 ? (
                        <div className="space-y-2">
                          {accessData.pointLogs.map((log: any) => (
                            <div key={log.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                              <div>
                                <span className={`text-sm font-medium ${log.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {log.delta > 0 ? '+' : ''}{log.delta}
                                </span>
                                <span className="text-white text-sm ml-3">{log.reason}</span>
                                {log.details && <span className="text-slate-500 text-xs ml-2">{log.details}</span>}
                              </div>
                              <span className="text-slate-500 text-xs">{new Date(log.createdAt).toLocaleString('zh-CN')}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-8">暂无积分记录</p>
                      )}
                    </div>
                  )}

                  {/* 支付记录标签页 */}
                  {detailTab === 'payments' && accessData && (
                    <div>
                      {accessData.payments?.length > 0 ? (
                        <div className="space-y-2">
                          {accessData.payments.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between bg-slate-700/50 rounded-lg px-4 py-3">
                              <div className="flex items-center gap-3">
                                <CreditCard className="h-4 w-4 text-slate-400" />
                                <div>
                                  <span className="text-white text-sm">¥{p.amount}</span>
                                  <span className="text-slate-400 text-xs ml-2">{p.method}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`text-xs font-medium ${getPaymentStatusColor(p.status)}`}>
                                  {getPaymentStatusLabel(p.status)}
                                </span>
                                <span className="text-slate-500 text-xs">{new Date(p.createdAt).toLocaleString('zh-CN')}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-slate-500 text-center py-8">暂无支付记录</p>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
