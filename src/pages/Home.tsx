import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI, pointsAPI, profileAPI, dailyAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { usePointsStore } from '../stores/points.store';
import {
  Code2, Swords, FileCheck, Trophy, Users, Zap,
  ArrowRight, ChevronRight, BookOpen, Target, Flame,
  Terminal, Shield, Brain, Sparkles, CalendarCheck,
  TrendingUp, MessageSquare, AlertTriangle, CheckCircle2,
} from 'lucide-react';

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

export function HomePage() {
  const { isAuthenticated, user } = useAuthStore();
  const { points, levelName, fetchMyPoints } = usePointsStore();

  const [stats, setStats] = useState<PublicStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentProblems, setRecentProblems] = useState<any[]>([]);

  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProblem[]>([]);
  const [dailyChallenge, setDailyChallenge] = useState<DailyChallengeData | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadAuthData();
    } else {
      loadPublicData();
    }
  }, [isAuthenticated]);

  const loadAuthData = async () => {
    try {
      const [profileRes, recRes, dailyRes, statsRes, lbRes] = await Promise.all([
        profileAPI.getMine(),
        profileAPI.getRecommendations(5),
        dailyAPI.getToday(),
        problemsAPI.getPublicStats(),
        pointsAPI.getLeaderboard(5),
      ]);
      if (profileRes.success) setProfileData(profileRes.data);
      if (recRes.success) setRecommendations(recRes.data || []);
      if (dailyRes.success) setDailyChallenge(dailyRes.data);
      if (statsRes.success) setStats(statsRes.data);
      if (lbRes.success) setLeaderboard(lbRes.data || []);
      fetchMyPoints();
    } catch {
      loadPublicData();
    }
  };

  const loadPublicData = async () => {
    try {
      const [statsRes, lbRes, problemsRes] = await Promise.all([
        problemsAPI.getPublicStats(),
        pointsAPI.getLeaderboard(5),
        problemsAPI.getAll(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (lbRes.success) setLeaderboard(lbRes.data || []);
      if (problemsRes.success) setRecentProblems((problemsRes.data || []).slice(0, 6));
    } catch {
      /* 首页数据加载失败不阻塞渲染 */
    }
  };

  const streakDays = profileData?.profile?.streakDays ?? 0;
  const abilityRadar = profileData?.profile?.abilityRadar ?? {};
  const weakPoints = (profileData?.profile?.weakPoints ?? []).slice(0, 3);

  /* ── 未登录用户：保留原有题库列表 ── */
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

        <section className="grid md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Terminal, title: '在线编程', desc: '支持多语言代码编辑与实时评测，覆盖编程题、选择题、填空题等多种题型', link: '/categories', linkText: '浏览题库', gradient: 'from-cyan-500/10 to-cyan-500/5', border: 'border-cyan-500/20', iconColor: 'text-cyan-400' },
            { icon: Swords, title: '实时对战', desc: '与对手实时 PK，在限时挑战中比拼编码速度与正确率，赢取积分提升排名', link: '/match', linkText: '开始对战', gradient: 'from-indigo-500/10 to-indigo-500/5', border: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
            { icon: Shield, title: '模拟考试', desc: '限时考试模式，支持编程题与客观题混合组卷，自动评分与成绩分析', link: '/exams', linkText: '查看考试', gradient: 'from-amber-500/10 to-amber-500/5', border: 'border-amber-500/20', iconColor: 'text-amber-400' },
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
            <div className="shrink-0 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
              <Brain className="h-10 w-10 text-indigo-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h3 className="text-xl font-semibold text-white mb-2">AI 智能辅助</h3>
              <p className="text-slate-400">代码解释、思路提示、错误诊断、自动生成测试用例，AI 助手让学习更高效</p>
            </div>
            <Link to="/register"
              className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-all font-medium">
              立即体验 <ArrowRight className="h-4 w-4" />
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

      {/* 快速入口 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { icon: BookOpen, label: '做题', link: '/categories', color: 'from-cyan-500/15 to-cyan-500/5', border: 'border-cyan-500/20', iconColor: 'text-cyan-400' },
          { icon: Swords, label: '对战', link: '/match', color: 'from-indigo-500/15 to-indigo-500/5', border: 'border-indigo-500/20', iconColor: 'text-indigo-400' },
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

      {/* 今日任务 + 每日一题 */}
      <section className="grid lg:grid-cols-5 gap-6">

        {/* AI 推荐题目 */}
        <div className="lg:col-span-3 bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-cyan-400" />
              今日推荐
            </h2>
            <Link to="/categories" className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
              更多题目 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {recommendations.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">暂无推荐题目，先做几道题吧</div>
            ) : (
              recommendations.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-700/30 transition-colors group">
                  <Link to={`/problem/${p.id}/solve`} className="flex items-center gap-3 min-w-0 flex-1">
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(p.difficulty)}`}>
                      {getDifficultyLabel(p.difficulty)}
                    </span>
                    <span className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">{p.title}</span>
                  </Link>
                  <Link to={`/problem/${p.id}/solve`}
                    className="shrink-0 ml-3 text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    开始 <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 每日一题 */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CalendarCheck className="h-5 w-5 text-amber-400" />
              每日一题
            </h2>
          </div>
          {dailyChallenge?.problem ? (
            <div className="p-6">
              <div className="flex items-center gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(dailyChallenge.difficulty)}`}>
                  {getDifficultyLabel(dailyChallenge.difficulty)}
                </span>
                {dailyChallenge.completed && (
                  <span className="flex items-center gap-1 text-xs text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" /> 已完成
                  </span>
                )}
              </div>
              <h3 className="text-white font-semibold text-lg mb-4">{dailyChallenge.problem.title}</h3>
              <Link
                to={`/problem/${dailyChallenge.problem.id}/solve`}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-all ${
                  dailyChallenge.completed
                    ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 text-white shadow-lg shadow-cyan-500/25'
                }`}
              >
                {dailyChallenge.completed ? '再来一次' : '开始挑战'}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500">今日挑战题目准备中…</div>
          )}
        </div>
      </section>

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
