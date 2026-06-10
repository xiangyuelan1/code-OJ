import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { usePointsStore } from '../../stores/points.store';
import { useSocketStore } from '../../services/socket';
import { classAPI, featureAPI } from '../../services/api';
import {
  Award,
  BookMarked,
  BookOpen,
  BookX,
  CalendarCheck,
  ChevronDown,
  Clock,
  Crown,
  FileCheck,
  Gamepad2,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  Menu,
  MessageSquare,
  MonitorSmartphone,
  ScrollText,
  Sparkles,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

interface VisibleFeature {
  featureKey: string;
  featureName: string;
  category: string;
  order: number;
}

interface NavItem {
  label: string;
  to: string;
  icon: typeof BookOpen;
  description: string;
  auth?: boolean;
  featureKey?: string;
  roles?: Array<'ADMIN' | 'TEACHER' | 'STUDENT'>;
  badge?: number;
}

interface NavGroup {
  label: string;
  icon: typeof BookOpen;
  accent: string;
  items: NavItem[];
}

function canShowItem(
  item: NavItem,
  params: {
    isAuthenticated: boolean;
    role?: string;
    isVisible: (featureKey: string) => boolean;
  },
) {
  if (item.auth && !params.isAuthenticated) return false;
  if (item.featureKey && !params.isVisible(item.featureKey)) return false;
  if (item.roles && !item.roles.includes(params.role as 'ADMIN' | 'TEACHER' | 'STUDENT')) return false;
  return true;
}

function DesktopGroup({ group, onNavigate }: { group: NavGroup; onNavigate: () => void }) {
  const [open, setOpen] = useState(false);
  const Icon = group.icon;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="group flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800 hover:text-white"
      >
        <Icon className={`h-4 w-4 ${group.accent}`} />
        <span>{group.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full w-72 pt-3">
          <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
            <div className="border-b border-slate-800 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Icon className={`h-4 w-4 ${group.accent}`} />
                {group.label}
              </div>
            </div>
            <div className="p-2">
              {group.items.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <Link
                    key={`${group.label}-${item.to}`}
                    to={item.to}
                    onClick={() => {
                      setOpen(false);
                      onNavigate();
                    }}
                    className="group/item flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-800/90"
                  >
                    <span className="mt-0.5 rounded-lg bg-slate-800 p-2 text-cyan-300 transition group-hover/item:bg-cyan-500/15">
                      <ItemIcon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2 text-sm font-medium text-slate-100">
                        {item.label}
                        {!!item.badge && item.badge > 0 && (
                          <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                            {item.badge > 9 ? '9+' : item.badge}
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-slate-400">{item.description}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function Navbar() {
  const { user, isAuthenticated, logout, accessStatus } = useAuthStore();
  const { points, levelName, rank, fetchMyPoints } = usePointsStore();
  const { onlineCount, disconnect } = useSocketStore();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [visibleFeatures, setVisibleFeatures] = useState<string[]>([]);

  const isVisible = useCallback((featureKey: string) => {
    return visibleFeatures.length === 0 || visibleFeatures.includes(featureKey);
  }, [visibleFeatures]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMyPoints();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    async function loadVisibleFeatures() {
      try {
        const res = await featureAPI.getPublic();
        if (isMounted && res.success && res.data) {
          const keys = (res.data as VisibleFeature[]).map(f => f.featureKey);
          setVisibleFeatures(keys);
        }
      } catch {
        /* 功能开关不可用时，所有功能默认可见 */
      }
    }
    loadVisibleFeatures();
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    if (isAuthenticated && (user?.role === 'ADMIN' || user?.role === 'TEACHER')) {
      const fetchPending = async () => {
        try {
          const res = await classAPI.getPendingCount();
          if (res.success) {
            setPendingCount(res.data?.count || 0);
          }
        } catch {
          // 非关键功能，忽略错误
        }
      };
      fetchPending();
      const interval = setInterval(fetchPending, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user?.role]);

  const handleLogout = () => {
    disconnect();
    logout();
    navigate('/');
  };

  const navGroups: NavGroup[] = [
    {
      label: '学习',
      icon: GraduationCap,
      accent: 'text-cyan-300',
      items: [
        { label: '题目练习', to: '/', icon: BookOpen, description: '按难度和题型开始刷题', featureKey: 'problems' },
        { label: '知识树刷题', to: '/categories', icon: ScrollText, description: '沿知识结构系统练习' },
        { label: '多元学习', to: '/learning', icon: Sparkles, description: '项目、路径和能力训练', auth: true, featureKey: 'learning' },
        { label: '编程星途', to: '/starpath', icon: Trophy, description: '星图探索、伙伴和星球建设', auth: true, featureKey: 'starpath' },
        { label: '每日一题', to: '/checkin', icon: CalendarCheck, description: '签到、连续学习和每日挑战', auth: true },
      ],
    },
    {
      label: '题库',
      icon: LibraryBig,
      accent: 'text-emerald-300',
      items: [
        { label: '我的题库', to: '/my-library', icon: BookMarked, description: '最近做过、收藏和自建题单', auth: true },
        { label: '错题本', to: '/wrong-records', icon: BookX, description: '复盘错题和薄弱知识点', auth: true },
        { label: '我的提交', to: '/submissions', icon: FileCheck, description: '查看提交记录和判题结果', auth: true, roles: ['STUDENT', 'TEACHER'] },
        { label: '已解决题目', to: '/solved', icon: Trophy, description: '查看已经通过的题目', auth: true },
        { label: '题单广场', to: '/problem-lists', icon: LibraryBig, description: '浏览和复制公开题单', auth: true },
      ],
    },
    {
      label: '竞赛',
      icon: Gamepad2,
      accent: 'text-amber-300',
      items: [
        { label: '在线对战', to: '/match', icon: Gamepad2, description: '实时刷题对战和挑战', auth: true, featureKey: 'match' },
        { label: '考试中心', to: '/exams', icon: ScrollText, description: '参加考试和查看结果', auth: true, featureKey: 'exams' },
        { label: '成就中心', to: '/achievements', icon: Award, description: '查看徽章、积分和成长记录', auth: true },
      ],
    },
    {
      label: '社区',
      icon: MessageSquare,
      accent: 'text-violet-300',
      items: [
        { label: '讨论区', to: '/discussions', icon: MessageSquare, description: '交流题解、经验和问题', auth: true, roles: ['STUDENT', 'TEACHER'], featureKey: 'discussions' },
      ],
    },
    {
      label: '工作台',
      icon: LayoutDashboard,
      accent: 'text-rose-300',
      items: [
        { label: '管理后台', to: '/admin', icon: LayoutDashboard, description: '题目、用户、考试和系统管理', auth: true, roles: ['ADMIN'], badge: pendingCount },
        { label: '教师工作台', to: '/teacher/dashboard', icon: LayoutDashboard, description: '班级数据和教学概览', auth: true, roles: ['TEACHER', 'ADMIN'] },
        { label: '班级管理', to: '/teacher/classes', icon: Users, description: '学生、班级和加入申请', auth: true, roles: ['TEACHER', 'ADMIN'], badge: pendingCount },
      ],
    },
  ];

  const visibleGroups = navGroups
    .map(group => ({
      ...group,
      items: group.items.filter(item => canShowItem(item, {
        isAuthenticated,
        role: user?.role,
        isVisible,
      })),
    }))
    .filter(group => group.items.length > 0);

  // 计算试用/付费剩余时间
  const getTrialInfo = () => {
    if (!accessStatus || user?.role === 'ADMIN' || user?.role === 'TEACHER') return null;
    if (accessStatus.accessType === 'trial' || accessStatus.accessType === 'TRIAL') {
      if (accessStatus.expiresAt) {
        const diff = new Date(accessStatus.expiresAt).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        return { type: 'trial', days };
      }
      return { type: 'trial', days: 0 };
    }
    if (accessStatus.accessType === 'paid' || accessStatus.accessType === 'PAID') {
      if (accessStatus.expiresAt) {
        const diff = new Date(accessStatus.expiresAt).getTime() - Date.now();
        const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
        return { type: 'paid', days };
      }
      return { type: 'paid', days: -1 }; // 无限期
    }
    return null;
  };

  const userMenuItems: NavItem[] = [
    { label: '个人中心', to: '/profile', icon: User, description: '资料、能力画像和学习统计', auth: true },
    { label: '签到', to: '/checkin', icon: CalendarCheck, description: '领取连续学习奖励', auth: true },
    { label: '下载 App', to: '/app-download', icon: MonitorSmartphone, description: '移动端访问和安装说明' },
  ];

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/95 text-white shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className="flex shrink-0 items-center gap-2">
            <span className="rounded-xl bg-cyan-500/10 p-2 ring-1 ring-cyan-400/25">
              <BookOpen className="h-6 w-6 text-cyan-300" />
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-black tracking-wide">Code</span>
              <span className="block text-xs font-semibold text-slate-300">OJ</span>
            </span>
          </Link>

          <div className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {visibleGroups.map(group => (
              <DesktopGroup key={group.label} group={group} onNavigate={() => setUserMenuOpen(false)} />
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {isAuthenticated ? (
              <>
                {(() => {
                  const trialInfo = getTrialInfo();
                  if (!trialInfo) return null;
                  if (trialInfo.type === 'trial') {
                    return (
                      <Link
                        to="/payment"
                        className="flex items-center gap-1.5 rounded-full border border-amber-500/50 bg-amber-500/10 px-3 py-1.5 text-sm text-amber-300 hover:bg-amber-500/20 transition"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>试用 {trialInfo.days}天</span>
                      </Link>
                    );
                  }
                  if (trialInfo.type === 'paid' && trialInfo.days >= 0 && trialInfo.days <= 7) {
                    return (
                      <Link
                        to="/payment"
                        className="flex items-center gap-1.5 rounded-full border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-sm text-red-300 hover:bg-red-500/20 transition animate-pulse"
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>即将到期 {trialInfo.days}天</span>
                      </Link>
                    );
                  }
                  return null;
                })()}

                <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm">
                  <Award className="h-4 w-4 text-yellow-300" />
                  <span className="font-semibold text-yellow-200">{points}</span>
                  <span className="text-slate-600">/</span>
                  {levelName === '王者' ? <Crown className="h-4 w-4 text-purple-300" /> : null}
                  <span className="text-cyan-200">{levelName}</span>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserMenuOpen(value => !value)}
                    className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm transition hover:border-cyan-400/50 hover:bg-slate-800"
                  >
                    <User className="h-4 w-4 text-slate-300" />
                    <span className="max-w-24 truncate">{user?.username}</span>
                    <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition ${userMenuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 top-full w-72 pt-3">
                      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950/95 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
                        <div className="border-b border-slate-800 px-4 py-3">
                          <div className="text-sm font-semibold text-white">{user?.username}</div>
                          <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                            <span>在线 {onlineCount}</span>
                            {rank > 0 && <span>排名 #{rank}</span>}
                          </div>
                        </div>
                        <div className="p-2">
                          {userMenuItems.map(item => {
                            const ItemIcon = item.icon;
                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setUserMenuOpen(false)}
                                className="flex items-start gap-3 rounded-xl px-3 py-3 transition hover:bg-slate-800/90"
                              >
                                <ItemIcon className="mt-0.5 h-4 w-4 text-cyan-300" />
                                <span>
                                  <span className="block text-sm font-medium text-slate-100">{item.label}</span>
                                  <span className="mt-0.5 block text-xs text-slate-400">{item.description}</span>
                                </span>
                              </Link>
                            );
                          })}
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(false);
                              handleLogout();
                            }}
                            className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-red-500/10"
                          >
                            <LogOut className="mt-0.5 h-4 w-4 text-red-300" />
                            <span>
                              <span className="block text-sm font-medium text-red-200">登出</span>
                              <span className="mt-0.5 block text-xs text-slate-400">退出当前账号</span>
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="rounded-full px-4 py-2 text-sm text-slate-200 transition hover:bg-slate-800 hover:text-white">
                  登录
                </Link>
                <Link to="/register" className="rounded-full bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                  注册
                </Link>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="rounded-xl border border-slate-700 p-2 text-white hover:border-cyan-400/50 hover:text-cyan-300 lg:hidden"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="space-y-4 border-t border-slate-800 py-4 lg:hidden">
            {visibleGroups.map(group => {
              const Icon = group.icon;
              return (
                <section key={group.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white">
                    <Icon className={`h-4 w-4 ${group.accent}`} />
                    {group.label}
                  </div>
                  <div className="grid gap-1 sm:grid-cols-2">
                    {group.items.map(item => {
                      const ItemIcon = item.icon;
                      return (
                        <Link
                          key={`${group.label}-${item.to}`}
                          to={item.to}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <ItemIcon className="h-4 w-4 text-cyan-300" />
                          <span>{item.label}</span>
                          {!!item.badge && item.badge > 0 && (
                            <span className="ml-auto rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] leading-none text-white">
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {isAuthenticated ? (
              <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-white">{user?.username}</div>
                    <div className="mt-1 text-xs text-slate-400">在线 {onlineCount}{rank > 0 ? ` · 排名 #${rank}` : ''}</div>
                  </div>
                  <div className="flex items-center gap-1 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-yellow-200">
                    <Award className="h-4 w-4" />
                    {points} · {levelName}
                  </div>
                </div>
                <div className="grid gap-1 sm:grid-cols-2">
                  {userMenuItems.map(item => {
                    const ItemIcon = item.icon;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 hover:text-white"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ItemIcon className="h-4 w-4 text-cyan-300" />
                        {item.label}
                      </Link>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-red-200 hover:bg-red-500/10"
                  >
                    <LogOut className="h-4 w-4" />
                    登出
                  </button>
                </div>
              </section>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/login"
                  className="rounded-xl border border-slate-700 px-4 py-2 text-center text-sm text-slate-200"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="rounded-xl bg-cyan-500 px-4 py-2 text-center text-sm font-semibold text-slate-950"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  注册
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
