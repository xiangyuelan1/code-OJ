import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { usePointsStore } from '../stores/points.store';
import { submissionsAPI, pointsAPI, classAPI } from '../services/api';
import {
  User, Mail, Clock, CheckCircle, XCircle, Award, Shield, GraduationCap,
  Crown, TrendingUp, Users, BookOpen, ClipboardList, Plus, LogOut, X,
  ChevronRight, ArrowLeft, Loader2, Trophy, Activity,
} from 'lucide-react';

type ProfileTab = 'submissions' | 'points' | 'classes';
type ClassDetailTab = 'members' | 'ranking' | 'activity';

interface ClassItem {
  id: string;
  name: string;
  description?: string;
  grade?: string;
  classCode?: string;
  memberCount?: number;
  teacherName?: string;
  creator?: { id: string; username: string };
  createdAt?: string;
}

interface MemberItem {
  id: string;
  userId: string;
  username: string;
  role: string;
  joinedAt: string;
}

export function ProfilePage() {
  const { user, accessStatus } = useAuthStore();
  const { points, levelName, rank, fetchMyPoints } = usePointsStore();

  const [submissions, setSubmissions] = useState<any[]>([]);
  const [pointLogs, setPointLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, accepted: 0, acceptanceRate: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ProfileTab>('submissions');

  // 班级相关状态
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null);
  const [classDetailTab, setClassDetailTab] = useState<ClassDetailTab>('members');
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  // 加入班级弹窗状态
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // 切换到班级 tab 时加载数据
  useEffect(() => {
    if (activeTab === 'classes' && classes.length === 0) {
      loadClasses();
    }
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      await fetchMyPoints();
      const [subRes, logRes] = await Promise.all([
        submissionsAPI.getMySubmissions().catch(() => ({ success: false, data: [] })),
        pointsAPI.getLogs(20).catch(() => ({ success: false, data: [] })),
      ]);
      if (subRes.success) {
        setSubmissions(subRes.data);
        const total = subRes.data.length;
        const accepted = subRes.data.filter((s: any) => s.status === 'ACCEPTED').length;
        setStats({ total, accepted, acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0 });
      }
      if (logRes.success) {
        setPointLogs(logRes.data || []);
      }
    } catch (error) {
      console.error('加载数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await classAPI.getAll();
      if (res.success) {
        const allClasses: ClassItem[] = res.data || [];
        // 学生只看自己所属的班级
        const myClasses = allClasses.filter(
          (cls: any) =>
            cls.members?.some((m: any) => m.userId === user?.id || m.user?.id === user?.id) ||
            cls.isMember === true
        );
        setClasses(myClasses);
      }
    } catch (error) {
      console.error('加载班级失败', error);
    } finally {
      setClassesLoading(false);
    }
  }, [user?.id]);

  const loadClassDetail = useCallback(async (cls: ClassItem) => {
    setSelectedClass(cls);
    setClassDetailTab('members');
    setDetailLoading(true);
    setAnalytics(null);
    try {
      const [memberRes, analyticsRes] = await Promise.all([
        classAPI.getMembers(cls.id).catch(() => ({ success: false, data: [] })),
        classAPI.getAnalytics(cls.id).catch(() => ({ success: false, data: null })),
      ]);
      if (memberRes.success) setMembers(memberRes.data || []);
      if (analyticsRes.success) setAnalytics(analyticsRes.data);
    } catch (error) {
      console.error('加载班级详情失败', error);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleJoinClass = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    try {
      const res = await classAPI.joinByCode(joinCode.trim(), joinMessage.trim() || undefined);
      if (res.success) {
        alert('加入班级请求已发送，请等待审核');
        setShowJoinModal(false);
        setJoinCode('');
        setJoinMessage('');
        loadClasses();
      }
    } catch (error: any) {
      alert(error.error?.message || '加入班级失败');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveClass = async (classId: string) => {
    if (!confirm('确定要退出该班级吗？')) return;
    try {
      const res = await classAPI.leave(classId);
      if (res.success) {
        setSelectedClass(null);
        loadClasses();
      }
    } catch (error: any) {
      alert(error.error?.message || '退出班级失败');
    }
  };

  const getTrialDaysLeft = () => {
    if (!accessStatus?.expiresAt) return 0;
    const expires = new Date(accessStatus.expiresAt);
    const diff = expires.getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-5 w-5 text-red-400" />;
      case 'TEACHER': return <GraduationCap className="h-5 w-5 text-blue-400" />;
      default: return <User className="h-5 w-5 text-green-400" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'ADMIN': return '管理员';
      case 'TEACHER': return '教师';
      default: return '学生';
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500/20 text-red-400';
      case 'TEACHER': return 'bg-blue-500/20 text-blue-400';
      default: return 'bg-green-500/20 text-green-400';
    }
  };

  const getReasonName = (reason: string) => {
    switch (reason) {
      case 'PROBLEM_COMPLETION': return '完成题目';
      case 'MATCH_RESULT': return '对战结果';
      case 'EXAM_COMPLETION': return '考试完成';
      default: return reason;
    }
  };



  // ===================== 渲染：班级列表 =====================
  const renderClassList = () => {
    if (classesLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
        </div>
      );
    }

    // 无班级时显示试用信息与引导
    if (classes.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">暂未加入任何班级</h3>
          <p className="text-slate-400 mb-6">加入班级后可以查看作业、参加考试，与同学一起学习</p>

          {/* 试用状态提示 */}
          {accessStatus?.accessType === 'trial' && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-400 text-sm">
                当前为试用模式，剩余 {getTrialDaysLeft()} 天
              </span>
            </div>
          )}

          <div>
            <button
              onClick={() => setShowJoinModal(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-5 w-5" />
              加入班级
            </button>
          </div>
        </div>
      );
    }

    return (
      <div>
        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="h-5 w-5" />
            <span>已加入 {classes.length} 个班级</span>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            加入班级
          </button>
        </div>

        {/* 试用状态提示（有班级时也可能处于试用） */}
        {accessStatus?.accessType === 'trial' && (
          <div className="flex items-center gap-2 px-4 py-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6">
            <Clock className="h-4 w-4 text-yellow-400 shrink-0" />
            <span className="text-yellow-400 text-sm">
              当前为试用模式，剩余 {getTrialDaysLeft()} 天，加入班级可获得正式访问权限
            </span>
          </div>
        )}

        {/* 班级卡片列表 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <div
              key={cls.id}
              onClick={() => loadClassDetail(cls)}
              className="p-5 bg-slate-700 rounded-xl border border-slate-600 hover:border-cyan-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/5 group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/10 rounded-lg">
                    <BookOpen className="h-5 w-5 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white group-hover:text-cyan-400 transition-colors">
                    {cls.name}
                  </h3>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
              </div>

              {cls.description && (
                <p className="text-slate-400 text-sm mb-3 line-clamp-2">{cls.description}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-slate-400">
                <div className="flex items-center gap-1">
                  <GraduationCap className="h-4 w-4" />
                  <span>{cls.teacherName || cls.creator?.username || '教师'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{cls.memberCount ?? 0} 人</span>
                </div>
                {cls.grade && (
                  <div className="flex items-center gap-1">
                    <ClipboardList className="h-4 w-4" />
                    <span>{cls.grade}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ===================== 渲染：班级详情 =====================
  const renderClassDetail = () => {
    if (!selectedClass) return null;
    if (detailLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
        </div>
      );
    }

    return (
      <div>
        {/* 返回按钮与班级标题 */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setSelectedClass(null)}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回班级列表</span>
          </button>
          <button
            onClick={() => handleLeaveClass(selectedClass.id)}
            className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
          >
            <LogOut className="h-4 w-4" />
            退出班级
          </button>
        </div>

        {/* 班级信息头 */}
        <div className="p-5 bg-slate-700 rounded-xl mb-6">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-cyan-400" />
            <h2 className="text-xl font-bold text-white">{selectedClass.name}</h2>
          </div>
          {selectedClass.description && (
            <p className="text-slate-400 text-sm mb-3">{selectedClass.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              <span>{selectedClass.teacherName || selectedClass.creator?.username || '教师'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{selectedClass.memberCount ?? members.length} 人</span>
            </div>
          </div>
        </div>

        {/* 详情子 tab */}
        <div className="flex space-x-1 mb-6 bg-slate-700 p-1 rounded-lg w-fit">
          {([
            { key: 'members' as ClassDetailTab, label: '成员', icon: <Users className="h-4 w-4" /> },
            { key: 'ranking' as ClassDetailTab, label: '排行', icon: <Trophy className="h-4 w-4" /> },
            { key: 'activity' as ClassDetailTab, label: '动态', icon: <Activity className="h-4 w-4" /> },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setClassDetailTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-md transition-colors text-sm ${
                classDetailTab === tab.key ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* 子 tab 内容 */}
        {classDetailTab === 'members' && renderMembers()}
        {classDetailTab === 'ranking' && renderRanking()}
        {classDetailTab === 'activity' && renderActivity()}
      </div>
    );
  };

  // ===================== 渲染：排行 =====================
  const renderRanking = () => {
    if (!analytics?.memberStats || analytics.memberStats.length === 0) {
      return (
        <div className="text-center py-12">
          <Trophy className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">暂无排行数据</p>
          <p className="text-slate-500 text-sm mt-1">班级成员完成题目后将在此显示排名</p>
        </div>
      );
    }

    const sortedStats = [...analytics.memberStats].sort((a: any, b: any) => {
      const scoreA = a.accepted ?? 0;
      const scoreB = b.accepted ?? 0;
      return scoreB - scoreA;
    });

    return (
      <div className="space-y-2">
        {sortedStats.map((stat: any, index: number) => {
          const rankIcon = index === 0
            ? <span className="text-yellow-400 text-lg">🥇</span>
            : index === 1
              ? <span className="text-slate-300 text-lg">🥈</span>
              : index === 2
                ? <span className="text-amber-600 text-lg">🥉</span>
                : <span className="text-slate-500 text-sm w-6 text-center">{index + 1}</span>;

          return (
            <div
              key={stat.userId}
              className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                index < 3 ? 'bg-slate-700/80 border border-slate-600' : 'bg-slate-700/40'
              }`}
            >
              <div className="w-8 flex justify-center shrink-0">{rankIcon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-medium truncate">{stat.username}</div>
                <div className="flex items-center gap-3 text-slate-400 text-sm mt-1">
                  <span>提交 {stat.submissions ?? 0}</span>
                  <span>通过 {stat.accepted ?? 0}</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-cyan-500 h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(stat.rate ?? 0, 100)}%` }}
                    />
                  </div>
                  <span className="text-sm text-slate-300 w-10 text-right">{Math.round(stat.rate ?? 0)}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ===================== 渲染：动态 =====================
  const renderActivity = () => {
    if (!analytics?.memberStats || analytics.memberStats.length === 0) {
      return (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">暂无动态数据</p>
          <p className="text-slate-500 text-sm mt-1">班级成员提交记录将在此显示</p>
        </div>
      );
    }

    const sortedByActivity = [...analytics.memberStats]
      .filter((stat: any) => stat.recentActivity)
      .sort((a: any, b: any) => new Date(b.recentActivity).getTime() - new Date(a.recentActivity).getTime());

    if (sortedByActivity.length === 0) {
      return (
        <div className="text-center py-12">
          <Activity className="h-12 w-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">暂无成员活动记录</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {sortedByActivity.map((stat: any) => (
          <div key={stat.userId} className="flex items-center gap-4 p-4 bg-slate-700/50 rounded-lg">
            <div className="w-9 h-9 bg-cyan-500/20 rounded-full flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-cyan-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium text-sm">{stat.username}</div>
              <div className="text-slate-400 text-xs mt-0.5">
                提交 {stat.submissions ?? 0} 次 · 通过 {stat.accepted ?? 0} 次
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-slate-400 text-xs">
                {stat.recentActivity
                  ? new Date(stat.recentActivity).toLocaleDateString('zh-CN', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                    })
                  : '-'}
              </div>
              <div className="text-xs mt-0.5">
                <span className={`px-1.5 py-0.5 rounded ${
                  (stat.rate ?? 0) >= 60 ? 'bg-green-500/20 text-green-400'
                  : (stat.rate ?? 0) >= 30 ? 'bg-yellow-500/20 text-yellow-400'
                  : 'bg-red-500/20 text-red-400'
                }`}>
                  通过率 {Math.round(stat.rate ?? 0)}%
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ===================== 渲染：成员列表 =====================
  const renderMembers = () => {
    if (members.length === 0) {
      return <p className="text-slate-400 text-center py-8">暂无成员</p>;
    }

    const teacher = members.find((m) => m.role === 'TEACHER');
    const students = members.filter((m) => m.role !== 'TEACHER');

    const getMemberStats = (username: string) => {
      if (!analytics?.memberStats) return null;
      return analytics.memberStats.find((s: any) => s.username === username);
    };

    return (
      <div>
        {/* 教师 */}
        {teacher && (
          <div className="mb-4">
            <div className="text-slate-400 text-sm mb-2 flex items-center gap-1">
              <GraduationCap className="h-4 w-4" />
              教师
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
              <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                <GraduationCap className="h-4 w-4 text-blue-400" />
              </div>
              <span className="text-white font-medium">{teacher.username}</span>
            </div>
          </div>
        )}

        {/* 学生列表 */}
        <div>
          <div className="text-slate-400 text-sm mb-2 flex items-center gap-1">
            <Users className="h-4 w-4" />
            学生 ({students.length})
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {students.map((member) => {
              const memberStats = getMemberStats(member.username);
              return (
                <div key={member.id} className="flex items-center gap-3 p-3 bg-slate-700 rounded-lg">
                  <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium truncate">{member.username}</div>
                    {memberStats && (
                      <div className="text-slate-500 text-xs mt-0.5">
                        通过 {memberStats.accepted ?? 0} 题
                        {memberStats.recentActivity && (
                          <> · 最近 {new Date(memberStats.recentActivity).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}</>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ===================== 渲染：加入班级弹窗 =====================
  const renderJoinModal = () => {
    if (!showJoinModal) return null;
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-700">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">加入班级</h2>
            <button
              onClick={() => { setShowJoinModal(false); setJoinCode(''); setJoinMessage(''); }}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">班级码</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="请输入班级码"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                申请留言 <span className="text-slate-500">（可选）</span>
              </label>
              <textarea
                value={joinMessage}
                onChange={(e) => setJoinMessage(e.target.value)}
                placeholder="给老师留个言..."
                rows={3}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
              />
            </div>

            <button
              onClick={handleJoinClass}
              disabled={!joinCode.trim() || joinLoading}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
            >
              {joinLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  申请加入
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ===================== 主渲染 =====================
  return (
    <div className="max-w-6xl mx-auto">
      {/* 用户信息卡片 */}
      <div className="bg-slate-800 rounded-xl p-8 shadow-xl mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center">
            <User className="h-12 w-12 text-cyan-400" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-white">{user?.username}</h1>
              <span className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${getRoleBadge(user?.role || '')}`}>
                {getRoleIcon(user?.role || '')}
                {getRoleName(user?.role || '')}
              </span>
            </div>
            <div className="flex items-center mt-2 text-slate-400">
              <Mail className="h-4 w-4 mr-2" />
              {user?.email}
            </div>
            <div className="flex items-center mt-2 text-slate-400">
              <Clock className="h-4 w-4 mr-2" />
              注册于 {user?.createdAt ? formatDate(user.createdAt) : '-'}
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-2">
              <Crown className="h-6 w-6 text-yellow-400" />
              <span className="text-2xl font-bold text-yellow-400">{levelName}</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-5 w-5 text-cyan-400" />
              <span className="text-xl font-semibold text-cyan-400">{points} 积分</span>
            </div>
            {rank > 0 && (
              <div className="flex items-center gap-2 text-slate-400">
                <TrendingUp className="h-4 w-4" />
                <span>排名 #{rank}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Award className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-slate-400 text-sm mt-1">总提交数</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.accepted}</div>
          <div className="text-slate-400 text-sm mt-1">通过数</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <XCircle className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-400">{stats.total - stats.accepted}</div>
          <div className="text-slate-400 text-sm mt-1">未通过数</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyan-400">{stats.acceptanceRate}%</div>
          <div className="text-slate-400 text-sm mt-1">通过率</div>
        </div>
      </div>

      {/* Tab 内容区 */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex space-x-1 mb-6 bg-slate-700 p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('submissions')}
            className={`px-4 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'submissions' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            最近提交
          </button>
          <button
            onClick={() => setActiveTab('points')}
            className={`px-4 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'points' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            积分记录
          </button>
          <button
            onClick={() => setActiveTab('classes')}
            className={`px-4 py-2 rounded-md transition-colors text-sm ${
              activeTab === 'classes' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            我的班级
          </button>
        </div>

        {/* 最近提交 */}
        {activeTab === 'submissions' && (
          loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
            </div>
          ) : submissions.length === 0 ? (
            <p className="text-slate-400 text-center py-8">暂无提交记录</p>
          ) : (
            <div className="space-y-3">
              {submissions.slice(0, 10).map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                  <div>
                    <div className="text-white font-medium">{submission.problem?.title || '题目'}</div>
                    <div className="text-slate-400 text-sm mt-1">
                      {new Date(submission.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${
                      submission.status === 'ACCEPTED' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {submission.status === 'ACCEPTED' ? '通过' : '未通过'}
                    </span>
                    {submission.score !== null && submission.score !== undefined && (
                      <span className="text-white font-semibold">{submission.score}分</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* 积分记录 */}
        {activeTab === 'points' && (
          pointLogs.length === 0 ? (
            <p className="text-slate-400 text-center py-8">暂无积分记录</p>
          ) : (
            <div className="space-y-3">
              {pointLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                  <div>
                    <div className="text-white font-medium">{getReasonName(log.reason)}</div>
                    <div className="text-slate-400 text-sm mt-1">
                      {new Date(log.createdAt).toLocaleString('zh-CN')}
                    </div>
                  </div>
                  <span className={`font-bold text-lg ${log.delta > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {log.delta > 0 ? '+' : ''}{log.delta}
                  </span>
                </div>
              ))}
            </div>
          )
        )}

        {/* 我的班级 */}
        {activeTab === 'classes' && (
          selectedClass ? renderClassDetail() : renderClassList()
        )}
      </div>

      {/* 加入班级弹窗 */}
      {renderJoinModal()}
    </div>
  );
}
