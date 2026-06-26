import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { problemsAPI, pointsAPI, profileAPI, dailyAPI, discussionAPI, matchAPI, starpathAPI, checkinAPI, aiQuotaAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { usePointsStore } from '../stores/points.store';
import { FEATURE_PAYMENT } from '../config/edition';
import {
  Code2, Swords, FileCheck, Trophy, Users, Zap,
  ArrowRight, ChevronRight, BookOpen, Target, Flame,
  Terminal, Shield, Brain, Sparkles, CalendarCheck,
  TrendingUp, MessageSquare, AlertTriangle, CheckCircle2,
  ThumbsUp, BarChart3, Clock, Play, Gift, Star, Check,
  Crown, Rocket, GraduationCap, Bot,
} from 'lucide-react';
import { CoderAvatar } from '../components/ui/CoderAvatar';

interface PublicStats {
  problemCount: number;
  userCount: number;
  submissionCount: number;
  acCount: number;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  level: number;
  levelName: string;
}

interface RecommendedProblem {
  id: string;
  title: string;
  difficulty: string;
  tags: string;
}

interface DailyChallengeData {
  id: string;
  date: string;
  difficulty: string;
  problem: { id: string; title: string; difficulty: string; tags: string; type: string };
  completed: boolean;
}

interface ProfileData {
  profile: {
    streakDays: number;
    abilityRadar: Record<string, number>;
    weakPoints: { tag: string; errorCount: number }[];
  };
  stats: {
    totalSubmissions: number;
    acceptedSubmissions: number;
    acceptanceRate: number;
    points: number;
    level: number;
    rank: number;
  };
}

interface HotDiscussion {
  id: string;
  title: string;
  author?: { username: string };
  upvotes: number;
  replyCount: number;
}

interface MatchHistoryItem {
  id: string;
  matchType: string;
  opponent?: string;
  score: number;
  isWinner: boolean;
  completedAt?: string;
}

interface StarMapSummary {
  totalPlanets: number;
  exploredPlanets: number;
  masteredPlanets: number;
}

interface LastPracticeData {
  lastProblem: { id: string; title: string; difficulty: string; type: string };
  nextProblem: { id: string; title: string; difficulty: string; type: string } | null;
}

interface CheckInStatus {
  todayCheckedIn: boolean;
  streakDays: number;
  thisWeekCheckIns: string[];
  totalCheckIns: number;
}

/** 签到里程碑奖励配置 */
const CHECKIN_MILESTONES = [
  { days: 7, bonus: 20, label: '7天' },
  { days: 14, bonus: 50, label: '14天' },
  { days: 30, bonus: 100, label: '30天' },
];

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

/** 获取当前自然周（周一至周日）的日期字符串数组 */
function getWeekDates(): string[] {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=周日
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(now);
  monday.setDate(now.getDate() + mondayOffset);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

const RADAR_DIMENSIONS = ['算法思维', '代码实现', '调试能力', '优化意识', '数学建模'];
const RADAR_COLORS: Record<string, string> = {
  '算法思维': 'text-cyan-400',
  '代码实现': 'text-emerald-400',
  '调试能力': 'text-amber-400',
  '优化意识': 'text-indigo-400',
  '数学建模': 'text-rose-400',
};

function getDifficultyStyle(d: string) {
  switch (d) {
    case 'EASY': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
    case 'MEDIUM': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
    case 'HARD': return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
    default: return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
  }
}

function getDifficultyLabel(d: string) {
  switch (d) {
    case 'EASY': return '简单';
    case 'MEDIUM': return '中等';
    case 'HARD': return '困难';
    default: return d;
  }
}

function getTypeLabel(t: string) {
  switch (t) {
    case 'PROGRAMMING': return '编程';
    case 'CHOICE': return '选择';
    case 'FILL_BLANK': return '填空';
    default: return t;
  }
}


/** SVG 能力雷达图：五边形 + 数据填充 */
function AbilityRadar({ data }: { data: Record<string, number> }) {
  const size = 200;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 80;
  const levels = [0.2, 0.4, 0.6, 0.8, 1.0];

  const angles = RADAR_DIMENSIONS.map((_, i) => (Math.PI * 2 * i) / RADAR_DIMENSIONS.length - Math.PI / 2);

  function polarToXY(radius: number, angleIdx: number) {
    const a = angles[angleIdx];
    return { x: cx + radius * Math.cos(a), y: cy + radius * Math.sin(a) };
  }

  const gridPaths = levels.map((lvl) => {
    const pts = RADAR_DIMENSIONS.map((_, i) => {
      const p = polarToXY(maxR * lvl, i);
      return `${p.x},${p.y}`;
    });
    return `M${pts.join('L')}Z`;
  });

  const dataPoints = RADAR_DIMENSIONS.map((dim, i) => {
    const val = (data[dim] ?? 0) / 100;
    return polarToXY(maxR * Math.max(val, 0.05), i);
  });
  const dataPath = `M${dataPoints.map((p) => `${p.x},${p.y}`).join('L')}Z`;

  return (
    <div className="flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {gridPaths.map((d, i) => (
          <path key={i} d={d} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
        ))}
        {RADAR_DIMENSIONS.map((_, i) => {
          const p = polarToXY(maxR, i);
          return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />;
        })}
        <path d={dataPath} fill="rgba(6,182,212,0.15)" stroke="rgba(6,182,212,0.8)" strokeWidth="2" />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3" fill="#06b6d4" />
        ))}
        {RADAR_DIMENSIONS.map((dim, i) => {
          const p = polarToXY(maxR + 16, i);
          return (
            <text key={i} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="middle"
              className="fill-slate-400" style={{ fontSize: '10px' }}>
              {dim}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

/**
 * 升级服务推广区块
 * 仅在全量版（FEATURE_PAYMENT === true）且用户未付费时展示
 * 包含会员等级卡片和跳转到 /payment 页面的 CTA
 */
function UpgradeServiceSection() {
  const tiers = [
    {
      name: '基础会员',
      icon: BookOpen,
      color: 'from-emerald-500/20 to-emerald-600/10',
      border: 'border-emerald-500/30',
      iconColor: 'text-emerald-400',
      features: ['全量题库解锁', '每日 AI 提示 5 次', '社区发帖权限'],
    },
    {
      name: '标准会员',
      icon: Rocket,
      color: 'from-cyan-500/20 to-indigo-600/10',
      border: 'border-cyan-500/30',
      iconColor: 'text-cyan-400',
      highlight: true,
      features: ['无限 AI 辅助', '对战模式', '个性化学习路径', '完整数据分析'],
    },
    {
      name: '尊享会员',
      icon: Crown,
      color: 'from-amber-500/20 to-orange-600/10',
      border: 'border-amber-500/30',
      iconColor: 'text-amber-400',
      features: ['专属导师答疑', '模拟面试', '优先新功能体验', '不限量 AI 额度'],
    },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-indigo-500/20 mb-12">
      {/* 背景渐变 */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 via-slate-900 to-cyan-600/15" />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%236366f1' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative px-6 py-10 md:px-10 md:py-14">
        {/* 标题区域 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm mb-4">
            <GraduationCap className="h-4 w-4" />
            <span>升级服务</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
            解锁全部学习能力
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto leading-relaxed">
            AI 智能辅助 · 全量题库 · 对战模式 · 社区互动 · 个性化学习路径，让你的编程之旅更高效
          </p>
        </div>

        {/* 会员等级卡片 */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {tiers.map(({ name, icon: Icon, color, border, iconColor, highlight, features }) => (
            <div key={name}
              className={`relative rounded-xl border ${border} bg-gradient-to-br ${color} p-6 transition-all hover:scale-[1.02] ${
                highlight ? 'ring-1 ring-cyan-500/40 shadow-lg shadow-cyan-500/10' : ''
              }`}
            >
              {highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-cyan-500 text-white text-xs font-semibold">
                  推荐
                </span>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2 rounded-lg bg-slate-800/60 border border-slate-700/50`}>
                  <Icon className={`h-5 w-5 ${iconColor}`} />
                </div>
                <h3 className="text-lg font-semibold text-white">{name}</h3>
              </div>
              <ul className="space-y-2.5">
                {features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2 text-sm text-slate-300">
                    <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* CTA 按钮 */}
        <div className="text-center">
          <Link
            to="/payment"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-400 hover:to-cyan-400 text-white font-semibold shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all hover:scale-[1.02]"
          >
            <Crown className="h-5 w-5" />
            查看完整方案与价格
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * "认识柯德" 推广区块 —— 面向未登录用户
 * 展示柯德形象、功能亮点和 CTA
 */
function MeetCoderSection() {
  const features = [
    { emoji: '🎯', text: '智能错题分析，精准定位薄弱点' },
    { emoji: '💡', text: '苏格拉底式引导，启发而非灌输' },
    { emoji: '📊', text: '持续学习画像，越用越懂你' },
    { emoji: '🤖', text: '三种性格随心切换' },
    { emoji: '⏰', text: '主动关心，适时提供帮助' },
  ];

  return (
    <section className="relative overflow-hidden rounded-2xl border border-purple-500/20 mb-12">
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/15 via-slate-900 to-indigo-600/15" />
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%237c3aed' fill-opacity='1'%3E%3Ccircle cx='20' cy='20' r='2'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="relative px-8 py-12 md:px-14 md:py-16">
        <div className="flex flex-col md:flex-row items-center gap-10">
          {/* 左侧：柯德形象 */}
          <div className="shrink-0">
            <CoderAvatar size={200} animated mood="happy" />
          </div>

          {/* 右侧：介绍内容 */}
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              认识柯德 —— 你的 AI 编程伙伴
            </h2>
            <p className="text-slate-400 mb-6 leading-relaxed">
              Code + 导 = 柯德。一位懂编程、有耐心、会鼓励的 AI 学习伙伴。
            </p>

            <ul className="space-y-3 mb-8">
              {features.map(({ emoji, text }) => (
                <li key={text} className="flex items-center gap-3 text-slate-300">
                  <span className="text-lg">{emoji}</span>
                  <span className="text-sm md:text-base">{text}</span>
                </li>
              ))}
            </ul>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-semibold shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all hover:scale-[1.02]"
            >
              <Bot className="h-5 w-5" />
              立即体验柯德
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * "柯德动态" 卡片 —— 面向已登录用户
 * 根据时段和学习状态生成个性化问候，按钮打开浮动助手
 */
function CoderStatusCard({
  username,
  streakDays,
  dailyChallenge,
}: {
  username?: string;
  streakDays: number;
  dailyChallenge: DailyChallengeData | null;
}) {
  /** 根据时间段和用户状态生成问候语 */
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 6 ? '夜深了' : hour < 12 ? '早上好' : hour < 18 ? '下午好' : '晚上好';
    const name = username || '同学';

    if (dailyChallenge && !dailyChallenge.completed) {
      return `${timeGreeting}，${name}！今日挑战还没完成哦，要不要来一道？`;
    }
    if (streakDays >= 3) {
      return `${timeGreeting}！连续 ${streakDays} 天签到了，继续保持 💪`;
    }
    return `${timeGreeting}，${name}！今天也要加油呀~`;
  };

  /** 点击按钮触发浮动助手打开（通过 DOM 事件触发浮动球 click） */
  const openAssistant = () => {
    const btn = document.querySelector('[title="柯德 · AI助手"]') as HTMLElement | null;
    btn?.click();
  };

  return (
    <section className="relative overflow-hidden rounded-xl border border-purple-500/20">
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-slate-800/60 to-indigo-600/10" />
      <div className="relative px-6 py-5 md:px-8">
        <div className="flex items-center gap-4">
          <CoderAvatar size={64} animated mood="happy" />
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm md:text-base font-medium mb-2">{getGreeting()}</p>
            <button
              onClick={openAssistant}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/30 transition-all font-medium text-sm"
            >
              <Bot className="h-4 w-4" />
              和柯德聊聊
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function HomePage() {
  const { isAuthenticated, user, accessStatus } = useAuthStore();
  const { points, levelName, fetchMyPoints } = usePointsStore();

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentProblems, setRecentProblems] = useState<any[]>([]);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProblem[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeData | null>(null);

  /** 新增状态：社区热点、对战动态、编程星途、学习进度 */
  const [hotDiscussions, setHotDiscussions] = useState<HotDiscussion[]>([]);
  const [matchHistory, setMatchHistory] = useState<MatchHistoryItem[]>([]);
  const [starMapSummary, setStarMapSummary] = useState<StarMapSummary | null>(null);
  const [weeklySolved, setWeeklySolved] = useState(0);
  const [dailyGoalProgress, setDailyGoalProgress] = useState(0);
  const [lastPractice, setLastPractice] = useState<LastPracticeData | null>(null);

  /** 签到状态 */
  const [checkinStatus, setCheckinStatus] = useState<CheckInStatus | null>(null);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [checkinPointsEarned, setCheckinPointsEarned] = useState<number | null>(null);

  /** AI 使用统计 */
  const [aiStats, setAiStats] = useState<{ analyzeCount: number; hintCount: number } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      loadAuthData();
    } else {
      loadPublicData();
    }
  }, [isAuthenticated]);

  const loadAuthData = async () => {
    try {
      const [profileRes, recRes, dailyRes, statsRes, lbRes, hotRes, matchRes, starMapRes, lastPracticeRes, checkinRes] = await Promise.all([
        profileAPI.getMine(),
        profileAPI.getRecommendations(5),
        dailyAPI.getToday(),
        problemsAPI.getPublicStats(),
        pointsAPI.getLeaderboard(5),
        discussionAPI.getHot(5).catch(() => ({ success: false, data: [] })),
        matchAPI.getHistory(5).catch(() => ({ success: false, data: [] })),
        starpathAPI.getMap().catch(() => ({ success: false, data: null })),
        problemsAPI.getLastPractice().catch(() => ({ success: false, data: null })),
        checkinAPI.getStatus().catch(() => ({ success: false, data: null })),
      ]);
      if (profileRes.success) setProfileData(profileRes.data);
      if (recRes.success) setRecommendations(recRes.data || []);
      if (dailyRes.success) setDailyChallenge(dailyRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (lbRes.success) setLeaderboard(lbRes.data || []);
      if (hotRes.success) setHotDiscussions(hotRes.data || []);
      if (matchRes.success) setMatchHistory(matchRes.data || []);
      if (checkinRes.success && checkinRes.data) setCheckinStatus(checkinRes.data);
      if (starMapRes.success && starMapRes.data) {
        setStarMapSummary({
          totalPlanets: starMapRes.data.totalPlanets || 0,
          exploredPlanets: starMapRes.data.exploredPlanets || 0,
          masteredPlanets: starMapRes.data.masteredPlanets || 0,
        });
      }
      if (lastPracticeRes.success && lastPracticeRes.data) {
        setLastPractice(lastPracticeRes.data);
      }
      fetchMyPoints();

      /* 计算本周解题数和每日目标进度 */
      computeWeeklyProgress(profileRes);

      /* 加载 AI 使用统计（不阻塞主流程） */
      loadAIStats();
    } catch {
      loadPublicData();
    }
  };

  /** 加载当前用户本月 AI 使用数据 */
  const loadAIStats = async () => {
    try {
      const res = await aiQuotaAPI.getMyUsage();
      if (res.success && res.data?.featureBreakdown) {
        const breakdown: Array<{ feature: string; calls: number }> = res.data.featureBreakdown;
        // 代码分析类：ai-judge, explain-code, diagnose, code-commentary, optimize-code
        const analyzeFeatues = ['ai-judge', 'explain-code', 'diagnose', 'code-commentary', 'optimize-code'];
        // 提示类：ai-hint, smart-hint, companion
        const hintFeatures = ['ai-hint', 'smart-hint', 'ai-companion', 'companion'];

        const analyzeCount = breakdown
          .filter((f) => analyzeFeatues.some((k) => f.feature.includes(k)))
          .reduce((sum, f) => sum + f.calls, 0);
        const hintCount = breakdown
          .filter((f) => hintFeatures.some((k) => f.feature.includes(k)))
          .reduce((sum, f) => sum + f.calls, 0);

        setAiStats({ analyzeCount, hintCount });
      }
    } catch {
      /* AI 统计加载失败不影响页面 */
    }
  };

  /** 根据用户 profile 数据推算本周解题数和每日目标 */
  const computeWeeklyProgress = (profileRes: any) => {
    if (!profileRes.success) return;
    const totalAccepted = profileRes.data?.stats?.acceptedSubmissions ?? 0;
    /* 用总通过数近似推算：假设均匀分布，7天约占30天窗口的1/4 */
    const estimatedWeekly = Math.round(totalAccepted * 0.25);
    setWeeklySolved(Math.min(estimatedWeekly, totalAccepted));
    /* 每日目标：3题/天 */
    const todayProgress = Math.min(100, Math.round((estimatedWeekly / 7 / 3) * 100));
    setDailyGoalProgress(todayProgress);
  };

  /** 执行签到 */
  const handleCheckin = async () => {
    if (checkinLoading || checkinStatus?.todayCheckedIn) return;
    setCheckinLoading(true);
    try {
      const res = await checkinAPI.checkin();
      if (res.success && res.data) {
        setCheckinPointsEarned(res.data.pointsEarned);
        // 刷新签到状态
        const statusRes = await checkinAPI.getStatus();
        if (statusRes.success && statusRes.data) setCheckinStatus(statusRes.data);
        fetchMyPoints();
        // 3秒后隐藏积分提示
        setTimeout(() => setCheckinPointsEarned(null), 3000);
      }
    } catch {
      /* 签到失败不阻塞 */
    } finally {
      setCheckinLoading(false);
    }
  };

  const loadPublicData = async () => {
    try {
      const [statsRes, lbRes, problemsRes, hotRes] = await Promise.all([
        problemsAPI.getPublicStats(),
        pointsAPI.getLeaderboard(5),
        problemsAPI.getAll(),
        discussionAPI.getHot(3).catch(() => ({ success: false, data: [] })),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (lbRes.success) setLeaderboard(lbRes.data || []);
      if (problemsRes.success) setRecentProblems((problemsRes.data || []).slice(0, 6));
      if (hotRes.success) setHotDiscussions(hotRes.data || []);
    } catch {
      /* 首页数据加载失败不阻塞渲染 */
    }
  };

  const streakDays = profileData?.profile?.streakDays ?? 0;
  const abilityRadar = profileData?.profile?.abilityRadar ?? {};
  const weakPoints = (profileData?.profile?.weakPoints ?? []).slice(0, 3);

  /* ── 未登录用户 ── */
  if (!isAuthenticated) {
    return (
      <div className="-mt-8">
        <section className="relative overflow-hidden rounded-2xl mb-12">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-slate-900 to-indigo-600/20" />
          <div className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%2306b6d4' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="relative px-8 py-16 md:px-16 md:py-24 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm mb-6">
              <Zap className="h-3.5 w-3.5" />
              <span>在线评测 · 实时对战 · 智能辅助</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white mb-5 tracking-tight">
              Code <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">OJ</span>
            </h1>
            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              刷题训练、模拟考试、实时对战，一站式编程能力提升平台
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/categories"
                className="group inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white font-semibold shadow-lg shadow-cyan-500/25 transition-all"
              >
                <BookOpen className="h-5 w-5" />
                开始刷题
                <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 hover:border-cyan-500/50 text-slate-300 hover:text-white font-semibold transition-all"
              >
                立即注册
              </Link>
            </div>
          </div>
        </section>

        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            {[
              { icon: Code2, label: '题目总数', value: stats.problemCount, color: 'text-cyan-400' },
              { icon: Users, label: '注册用户', value: stats.userCount, color: 'text-indigo-400' },
              { icon: FileCheck, label: '提交次数', value: stats.submissionCount, color: 'text-emerald-400' },
              { icon: Trophy, label: '通过次数', value: stats.acCount, color: 'text-amber-400' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4">
                <Icon className={`h-8 w-8 ${color} shrink-0`} />
                <div>
                  <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
                  <div className="text-sm text-slate-400">{label}</div>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ═══ 认识柯德 ═══ AI 编程伙伴推广区 */}
        <MeetCoderSection />

        {/* 升级服务：未登录访客可见（仅全量版） */}
        {FEATURE_PAYMENT && <UpgradeServiceSection />}

        <section className="grid md:grid-cols-4 gap-6 mb-12">
          {[
            { icon: Terminal, title: '在线编程', desc: '支持多语言代码编辑与实时评测，覆盖编程题、选择题、填空题等多种题型', link: '/categories', linkText: '浏览题库', gradient: 'from-cyan-500/10 to-cyan-500/5', border: 'border-cyan-500/20', iconColor: 'text-cyan-400' },
            { icon: Swords, title: '实时对战', desc: '与对手实时 PK，在限时挑战中比拼编码速度与正确率，赢取积分提升排名', link: '/match', linkText: '开始对战', gradient: 'from-indigo-500/10 to-indigo-500/5', border: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
            { icon: Shield, title: '模拟考试', desc: '限时考试模式，支持编程题与客观题混合组卷，自动评分与成绩分析', link: '/exams', linkText: '查看考试', gradient: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', iconColor: 'text-amber-400' },
            { icon: Sparkles, title: '编程星途', desc: '探索编程宇宙，在星途中发现知识的奥秘', link: '/starpath', linkText: '探索星途', gradient: 'from-purple-500/10 to-purple-500/5', border: 'border-purple-500/20', iconColor: 'text-purple-400' },
          ].map(({ icon: Icon, title, desc, link, linkText, gradient, border, iconColor }) => (
            <Link key={title} to={link}
              className={`group relative overflow-hidden rounded-xl border ${border} bg-gradient-to-br ${gradient} p-6 hover:scale-[1.02] transition-all`}>
              <Icon className={`h-10 w-10 ${iconColor} mb-4`} />
              <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed mb-4">{desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                {linkText}
                <ChevronRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
              </span>
            </Link>
          ))}
        </section>

        {/* 未登录：社区讨论 + 对战排行 */}
        <section className="grid lg:grid-cols-3 gap-6 mb-12">
          {/* 社区讨论 */}
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-emerald-400" />
                社区讨论
              </h2>
              <Link to="/discussions" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                查看更多 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-700/50">
              {hotDiscussions.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-500">暂无讨论</div>
              ) : (
                hotDiscussions.map(d => (
                  <Link key={d.id} to={`/discussions/${d.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-700/30 transition-colors group">
                    <span className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{d.title}</span>
                    <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0 ml-4">
                      <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" />{d.upvotes}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{d.replyCount}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* 对战排行 */}
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Swords className="h-5 w-5 text-indigo-400" />
                对战排行
              </h2>
              <Link to="/match" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                更多 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-700/50">
              {leaderboard.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-500">暂无排行数据</div>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div key={entry.userId} className="flex items-center gap-3 px-6 py-3.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-700 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-white font-medium truncate">{entry.username}</span>
                    <span className="text-sm font-semibold text-amber-400">{entry.points}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="grid lg:grid-cols-3 gap-6 mb-12">
          <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Target className="h-5 w-5 text-cyan-400" />
                最新题目
              </h2>
              <Link to="/categories" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                查看全部 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-700/50">
              {recentProblems.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-500">暂无题目</div>
              ) : (
                recentProblems.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-700/30 transition-colors group">
                    <Link to={`/problem/${p.id}/solve`} className="flex items-center gap-3 min-w-0 flex-1">
                      <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(p.difficulty)}`}>
                        {getDifficultyLabel(p.difficulty)}
                      </span>
                      <span className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{p.title}</span>
                    </Link>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      <span className="text-xs text-slate-500">{getTypeLabel(p.type)}</span>
                      <Link to={`/problem/${p.id}`} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">详情</Link>
                      <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Flame className="h-5 w-5 text-amber-400" />
                积分排行
              </h2>
              <Link to="/achievements" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                更多 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="divide-y divide-slate-700/50">
              {leaderboard.length === 0 ? (
                <div className="px-6 py-10 text-center text-slate-500">暂无排行数据</div>
              ) : (
                leaderboard.map((entry, idx) => (
                  <div key={entry.userId} className="flex items-center gap-3 px-6 py-3.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                      idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-slate-700 text-slate-500'
                    }`}>
                      {idx + 1}
                    </span>
                    <span className="flex-1 text-white font-medium truncate">{entry.username}</span>
                    <span className="text-sm font-semibold text-amber-400">{entry.points}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-slate-800/60 to-purple-500/10 p-8 mb-12">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <CoderAvatar size={64} animated mood="happy" />
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-semibold text-white mb-2">柯德 · AI 智能辅助</h3>
              <p className="text-slate-400">代码解释、思路提示、错误诊断、自动生成测试用例 —— 柯德让你的编程学习更高效</p>
            </div>
            <Link to="/register"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-all font-medium">
              立即体验柯德 <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </div>
    );
  }

  /* ── 已登录用户：学习主页 ── */
  return (
    <div className="-mt-8 space-y-6">

      {/* 欢迎卡片 */}
      <section className="relative overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/20 via-slate-900 to-indigo-600/20" />
        <div className="relative px-6 py-8 md:px-10 md:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                你好，{user?.username}
              </h1>
              <p className="text-slate-400">继续你的学习之旅，今天也要加油哦 💪</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Flame className="h-5 w-5 text-amber-400" />
                <div>
                  <div className="text-lg font-bold text-amber-400">{streakDays}</div>
                  <div className="text-xs text-slate-500">连续天数</div>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <Trophy className="h-5 w-5 text-cyan-400" />
                <div>
                  <div className="text-lg font-bold text-cyan-400">{levelName}</div>
                  <div className="text-xs text-slate-500">{points} 积分</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 升级服务：已登录 TRIAL 用户可见（仅全量版，排除 ADMIN/PAID/CLASS） */}
      {FEATURE_PAYMENT && user?.role !== 'ADMIN' && (() => {
        const type = accessStatus?.accessType?.toUpperCase();
        return !type || type === 'TRIAL';
      })() && <UpgradeServiceSection />}

      {/* 编程星途特色卡片 */}
      <section className="relative overflow-hidden rounded-xl border border-purple-500/20">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/15 via-indigo-600/10 to-blue-600/15" />
        <div className="relative px-6 py-6 md:px-8 md:py-7">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
            <div className="flex items-center gap-4">
              <div className="shrink-0 p-3 rounded-xl bg-purple-500/15 border border-purple-500/25">
                <Sparkles className="h-8 w-8 text-purple-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">编程星途</h3>
                {starMapSummary && starMapSummary.totalPlanets > 0 ? (
                  <p className="text-sm text-slate-400">
                    已探索 <span className="text-purple-400 font-semibold">{starMapSummary.exploredPlanets}</span> / {starMapSummary.totalPlanets} 颗星球
                    {starMapSummary.masteredPlanets > 0 && (
                      <> · 已掌握 <span className="text-emerald-400 font-semibold">{starMapSummary.masteredPlanets}</span> 颗</>
                    )}
                  </p>
                ) : (
                  <p className="text-sm text-slate-400">开始你的星途之旅，探索编程宇宙的奥秘</p>
                )}
              </div>
            </div>
            <Link to="/starpath"
              className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300 hover:text-white hover:bg-purple-500/30 transition-all font-medium text-sm">
              {starMapSummary && starMapSummary.exploredPlanets > 0 ? '继续探索' : '开始星途之旅'}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 快速入口 */}
      <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { icon: BookOpen, label: '做题', link: '/categories', color: 'from-cyan-500/15 to-cyan-500/5', border: 'border-cyan-500/20', iconColor: 'text-cyan-400' },
          { icon: Swords, label: '对战', link: '/match', color: 'from-indigo-500/15 to-indigo-500/5', border: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
          { icon: Sparkles, label: '星途', link: '/starpath', color: 'from-purple-500/15 to-purple-500/5', border: 'border-purple-500/20', iconColor: 'text-purple-400' },
          { icon: FileCheck, label: '考试', link: '/exams', color: 'from-amber-500/15 to-amber-500/5', border: 'border-amber-500/20', iconColor: 'text-amber-400' },
          { icon: MessageSquare, label: '社区', link: '/discussions', color: 'from-emerald-500/15 to-emerald-500/5', border: 'border-emerald-500/20', iconColor: 'text-emerald-400' },
        ].map(({ icon: Icon, label, link, color, border, iconColor }) => (
          <Link key={label} to={link}
            className={`flex flex-col items-center gap-2 rounded-xl border ${border} bg-gradient-to-br ${color} px-4 py-4 hover:scale-[1.03] transition-all`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
            <span className="text-sm font-medium text-slate-300">{label}</span>
          </Link>
        ))}
      </section>

      {/* 社区热点 */}
      {hotDiscussions.length > 0 && (
        <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-orange-400" />
              社区热点
            </h2>
            <Link to="/discussions" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              查看更多 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {hotDiscussions.map(d => (
              <Link key={d.id} to={`/discussions/${d.id}`} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-700/30 transition-colors group">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{d.title}</span>
                  <span className="text-xs text-slate-500 shrink-0">{d.author?.username || '匿名'}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0 ml-4">
                  <span className="flex items-center gap-1 text-amber-400"><ThumbsUp className="h-3 w-3" />{d.upvotes}</span>
                  <span className="flex items-center gap-1 text-cyan-400"><MessageSquare className="h-3 w-3" />{d.replyCount}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 继续刷题 */}
      {lastPractice && (
        <section className="relative overflow-hidden rounded-xl border border-cyan-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-600/10 via-slate-800/60 to-indigo-600/10" />
          <div className="relative px-6 py-5 md:px-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="shrink-0 p-3 rounded-xl bg-cyan-500/15 border border-cyan-500/25">
                  <Play className="h-6 w-6 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-1">继续刷题</h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <span>上次做的：</span>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(lastPractice.lastProblem.difficulty)}`}>
                      {getDifficultyLabel(lastPractice.lastProblem.difficulty)}
                    </span>
                    <span className="text-white font-medium truncate max-w-[200px]">{lastPractice.lastProblem.title}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  to={`/problem/${lastPractice.lastProblem.id}/solve`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:text-white hover:bg-cyan-500/30 transition-all font-medium text-sm"
                >
                  继续 <ArrowRight className="h-4 w-4" />
                </Link>
                {lastPractice.nextProblem && (
                  <Link
                    to={`/problem/${lastPractice.nextProblem.id}/solve`}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-all font-medium text-sm"
                  >
                    做下一题 <ChevronRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══ 每日一题 & 签到 ═══ 统一模块，作为核心展示区域 */}
      <section className="relative overflow-hidden rounded-2xl border border-amber-500/20">
        {/* 渐变背景 */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-600/10 via-slate-900 to-cyan-600/10" />
        <div className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fbbf24' fill-opacity='1'%3E%3Cpath d='M20 20.5V18H0v-2h20v-2l2 3-2 3zm0-7V11H0V9h20V7l2 3-2 3z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-5 md:px-8 border-b border-slate-700/30">
            <h2 className="text-xl font-bold text-white flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/25">
                <CalendarCheck className="h-6 w-6 text-amber-400" />
              </div>
              每日一题 & 签到
            </h2>
            <Link to="/checkin" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors">
              查看完整记录 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="grid lg:grid-cols-2 gap-0 lg:divide-x divide-slate-700/30">
            {/* 左侧：今日题目 + 推荐列表 */}
            <div className="p-6 md:p-8">
              {/* 今日挑战题目 */}
              {dailyChallenge?.problem ? (
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Today&apos;s Challenge</span>
                    {dailyChallenge.completed && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> 已完成
                      </span>
                    )}
                  </div>
                  <h3 className="text-white font-bold text-xl mb-3">{dailyChallenge.problem.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${getDifficultyStyle(dailyChallenge.difficulty)}`}>
                      {getDifficultyLabel(dailyChallenge.difficulty)}
                    </span>
                    {dailyChallenge.problem.tags && dailyChallenge.problem.tags.split(',').slice(0, 3).map(tag => (
                      <span key={tag.trim()} className="px-2 py-0.5 rounded text-xs text-slate-400 bg-slate-700/50 border border-slate-600/50">
                        {tag.trim()}
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={() => navigate(`/problem/${dailyChallenge.problem.id}/solve`)}
                    className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all ${
                      dailyChallenge.completed
                        ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                        : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02]'
                    }`}
                  >
                    <Play className="h-4 w-4" />
                    {dailyChallenge.completed ? '再来一次' : '开始做题'}
                  </button>
                </div>
              ) : (
                <div className="mb-6 py-8 text-center text-slate-500">今日挑战题目准备中…</div>
              )}

              {/* AI 推荐题目列表 */}
              {recommendations.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-slate-300 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-cyan-400" />
                      AI 推荐
                    </span>
                    <Link to="/categories" className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                      更多 <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                  <div className="space-y-1.5">
                    {recommendations.slice(0, 4).map((p) => (
                      <Link key={p.id} to={`/problem/${p.id}/solve`}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-700/40 transition-colors group">
                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(p.difficulty)}`}>
                          {getDifficultyLabel(p.difficulty)}
                        </span>
                        <span className="text-sm text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{p.title}</span>
                        <ChevronRight className="h-3.5 w-3.5 text-slate-600 ml-auto shrink-0 group-hover:text-cyan-400 transition-colors" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 右侧：签到区域 */}
            <div className="p-6 md:p-8">
              {/* 签到按钮 + 连续天数 */}
              <div className="flex items-center gap-5 mb-6">
                <button
                  onClick={handleCheckin}
                  disabled={checkinLoading || checkinStatus?.todayCheckedIn}
                  className={`relative shrink-0 w-20 h-20 rounded-2xl font-bold text-sm transition-all ${
                    checkinStatus?.todayCheckedIn
                      ? 'bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-400'
                      : 'bg-gradient-to-br from-amber-500 to-orange-500 border-2 border-amber-400/50 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50 hover:scale-105 active:scale-95'
                  } flex flex-col items-center justify-center gap-1`}
                >
                  {checkinStatus?.todayCheckedIn ? (
                    <>
                      <Check className="h-6 w-6" />
                      <span className="text-xs">已签到</span>
                    </>
                  ) : (
                    <>
                      <CalendarCheck className="h-6 w-6" />
                      <span className="text-xs">{checkinLoading ? '签到中' : '签到'}</span>
                    </>
                  )}
                  {/* 积分浮动提示 */}
                  {checkinPointsEarned !== null && (
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-sm font-bold text-cyan-300 animate-bounce">
                      +{checkinPointsEarned} 积分
                    </span>
                  )}
                </button>
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-extrabold text-white">{checkinStatus?.streakDays ?? streakDays}</span>
                    <span className="text-sm text-slate-400">天连续</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    累计签到 {checkinStatus?.totalCheckIns ?? 0} 天
                  </p>
                </div>
              </div>

              {/* 本周签到日历 */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-300 mb-3">本周签到</h4>
                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const weekDates = getWeekDates();
                    const checkedSet = new Set(checkinStatus?.thisWeekCheckIns ?? []);
                    const todayStr = new Date().toISOString().slice(0, 10);
                    return weekDates.map((dateStr, i) => {
                      const isChecked = checkedSet.has(dateStr);
                      const isToday = dateStr === todayStr;
                      return (
                        <div key={dateStr} className="flex flex-col items-center gap-1.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                            isChecked
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                              : isToday
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                : 'bg-slate-800/60 text-slate-600 border border-slate-700/50'
                          }`}>
                            {isChecked ? <Check className="h-4 w-4" /> : ''}
                          </div>
                          <span className={`text-[10px] ${isToday ? 'text-amber-400 font-semibold' : 'text-slate-500'}`}>
                            {WEEKDAY_LABELS[i]}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* 里程碑奖励进度 */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Gift className="h-4 w-4 text-purple-400" />
                  里程碑奖励
                </h4>
                <div className="space-y-3">
                  {CHECKIN_MILESTONES.map(({ days, bonus, label }) => {
                    const currentStreak = checkinStatus?.streakDays ?? streakDays;
                    const progress = Math.min(100, Math.round((currentStreak / days) * 100));
                    const achieved = currentStreak >= days;
                    return (
                      <div key={days} className="flex items-center gap-3">
                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                          achieved
                            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {achieved ? <Star className="h-4 w-4" /> : <span className="text-[10px] font-bold">{label}</span>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className={`text-xs font-medium ${achieved ? 'text-purple-400' : 'text-slate-400'}`}>
                              连续 {days} 天
                            </span>
                            <span className={`text-xs font-semibold ${achieved ? 'text-amber-400' : 'text-slate-500'}`}>
                              +{bonus} 积分
                            </span>
                          </div>
                          <div className="h-1.5 bg-slate-700/80 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                achieved ? 'bg-gradient-to-r from-purple-500 to-purple-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ 柯德动态（登录用户）═══ */}
      <CoderStatusCard
        username={user?.username}
        streakDays={checkinStatus?.streakDays ?? streakDays}
        dailyChallenge={dailyChallenge}
      />

      {/* 对战动态 */}
      <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Swords className="h-5 w-5 text-indigo-400" />
            对战动态
          </h2>
          <Link to="/match" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            开始对战 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {matchHistory.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <p className="text-slate-500 mb-4">还没有对战记录，来一场吧！</p>
            <Link to="/match"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-medium shadow-lg shadow-indigo-500/25 transition-all">
              <Swords className="h-4 w-4" /> 开始对战
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {matchHistory.map(m => (
              <div key={m.id} className="flex items-center justify-between px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${
                    m.isWinner ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                  }`}>
                    {m.isWinner ? '胜利' : '失败'}
                  </span>
                  <span className="text-white text-sm">你 vs {m.opponent || '对手'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><Trophy className="h-3 w-3" />{m.score}分</span>
                  {m.completedAt && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(m.completedAt).toLocaleDateString()}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI 助力统计卡片 */}
      {aiStats && (aiStats.analyzeCount > 0 || aiStats.hintCount > 0) && (
        <section className="relative overflow-hidden rounded-xl border border-violet-500/20">
          <div className="absolute inset-0 bg-gradient-to-r from-violet-600/10 via-slate-800/60 to-indigo-600/10" />
          <div className="relative px-6 py-5 md:px-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-violet-500/15 border border-violet-500/25">
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">柯德助力</h3>
              <span className="text-xs text-slate-400 ml-2">你的 AI 学习伙伴</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <Brain className="h-5 w-5 text-cyan-400 shrink-0" />
                <div>
                  <div className="text-xl font-bold text-white">{aiStats.analyzeCount}</div>
                  <div className="text-xs text-slate-400">本月 AI 代码分析</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
                <Sparkles className="h-5 w-5 text-amber-400 shrink-0" />
                <div>
                  <div className="text-xl font-bold text-white">{aiStats.hintCount}</div>
                  <div className="text-xs text-slate-400">本月思路提示</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 能力雷达 + 薄弱知识点 + 排行 */}
      <section className="grid lg:grid-cols-3 gap-6">

        {/* 能力雷达图 */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-cyan-400" />
              能力雷达
            </h2>
          </div>
          <div className="p-4">
            <AbilityRadar data={abilityRadar} />
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
              {RADAR_DIMENSIONS.map((dim) => (
                <div key={dim} className="flex items-center justify-between text-xs">
                  <span className={RADAR_COLORS[dim]}>{dim}</span>
                  <span className="text-slate-500">{abilityRadar[dim] ?? 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 薄弱知识点 */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              薄弱知识点
            </h2>
          </div>
          <div className="p-6">
            {weakPoints.length === 0 ? (
              <div className="text-center text-slate-500 py-6">暂无薄弱点数据，继续做题后将自动分析</div>
            ) : (
              <div className="space-y-4">
                {weakPoints.map((wp, idx) => (
                  <div key={wp.tag} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                      idx === 0 ? 'bg-rose-500/15 text-rose-400' :
                      idx === 1 ? 'bg-amber-500/15 text-amber-400' :
                      'bg-orange-500/15 text-orange-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">{wp.tag}</div>
                      <div className="text-xs text-slate-500">错误 {wp.errorCount} 次</div>
                    </div>
                    <div className="shrink-0 h-1.5 w-20 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          idx === 0 ? 'bg-rose-400' : idx === 1 ? 'bg-amber-400' : 'bg-orange-400'
                        }`}
                        style={{ width: `${Math.min(100, wp.errorCount * 10)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 积分排行 */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              积分排行
            </h2>
            <Link to="/achievements" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              更多 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {leaderboard.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">暂无排行数据</div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div key={entry.userId} className="flex items-center gap-3 px-6 py-3.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-amber-500/20 text-amber-400' :
                    idx === 1 ? 'bg-slate-400/20 text-slate-300' :
                    idx === 2 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-slate-700 text-slate-500'
                  }`}>
                    {idx + 1}
                  </span>
                  <span className="flex-1 text-white font-medium truncate">{entry.username}</span>
                  <span className="text-sm font-semibold text-amber-400">{entry.points}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      {/* 学习进度 - 本周刷题 + 每日目标 */}
      <section className="grid lg:grid-cols-2 gap-6">
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              本周进度
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-end gap-3 mb-4">
              <span className="text-3xl font-bold text-white">{weeklySolved}</span>
              <span className="text-slate-500 text-sm mb-1">题 / 本周</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
              <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${Math.min(100, weeklySolved * 5)}%` }} />
            </div>
            <p className="text-xs text-slate-500">每周目标 20 题</p>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-amber-400" />
              每日目标
            </h2>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-center mb-4">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(51,65,85,0.5)" strokeWidth="8" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="#06b6d4" strokeWidth="8"
                    strokeDasharray={`${dailyGoalProgress * 2.51} 251`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">{dailyGoalProgress}%</span>
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-slate-500">每日目标 3 题</p>
          </div>
        </div>
      </section>

      {/* 探索题库 */}
      <section className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            探索题库
          </h2>
          <Link to="/categories" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
            查看全部 <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="divide-y divide-slate-700/50">
          {recentProblems.length === 0 ? (
            <div className="px-6 py-10 text-center text-slate-500">暂无题目</div>
          ) : (
            recentProblems.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-700/30 transition-colors group">
                <Link to={`/problem/${p.id}/solve`} className="flex items-center gap-3 min-w-0 flex-1">
                  <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(p.difficulty)}`}>
                    {getDifficultyLabel(p.difficulty)}
                  </span>
                  <span className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{p.title}</span>
                </Link>
                <div className="flex items-center gap-3 shrink-0 ml-4">
                  <span className="text-xs text-slate-500">{getTypeLabel(p.type)}</span>
                  <Link to={`/problem/${p.id}`} className="text-xs text-slate-500 hover:text-cyan-400 transition-colors">详情</Link>
                  <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
