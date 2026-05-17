import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI, pointsAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import {
  Code2, Swords, FileCheck, Trophy, Users, Zap,
  ArrowRight, ChevronRight, BookOpen, Target, Flame,
  Terminal, Shield, Brain
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

export function HomePage() {
  const { isAuthenticated } = useAuthStore();
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [recentProblems, setRecentProblems] = useState<any[]>([]);

  useEffect(() => {
    loadHomeData();
  }, []);

  const loadHomeData = async () => {
    try {
      const [statsRes, lbRes, problemsRes] = await Promise.all([
        problemsAPI.getPublicStats(),
        pointsAPI.getLeaderboard(5),
        problemsAPI.getAll(),
      ]);
      if (statsRes.success) setStats(statsRes.data);
      if (lbRes.success) setLeaderboard(lbRes.data || []);
      if (problemsRes.success) {
        setRecentProblems((problemsRes.data || []).slice(0, 6));
      }
    } catch {
      /* 首页数据加载失败不阻塞渲染 */
    }
  };

  const getDifficultyStyle = (d: string) => {
    switch (d) {
      case 'EASY': return 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10';
      case 'MEDIUM': return 'text-amber-400 border-amber-400/30 bg-amber-400/10';
      case 'HARD': return 'text-rose-400 border-rose-400/30 bg-rose-400/10';
      default: return 'text-slate-400 border-slate-400/30 bg-slate-400/10';
    }
  };

  const getDifficultyLabel = (d: string) => {
    switch (d) {
      case 'EASY': return '简单';
      case 'MEDIUM': return '中等';
      case 'HARD': return '困难';
      default: return d;
    }
  };

  const getTypeLabel = (t: string) => {
    switch (t) {
      case 'PROGRAMMING': return '编程';
      case 'CHOICE': return '选择';
      case 'FILL_BLANK': return '填空';
      default: return t;
    }
  };

  return (
    <div className="-mt-8">
      {/* ── Hero Section ── */}
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
            {!isAuthenticated && (
              <Link
                to="/register"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl border border-slate-600 hover:border-cyan-500/50 text-slate-300 hover:text-white font-semibold transition-all"
              >
                立即注册
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* ── Stats Bar ── */}
      {stats && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {[
            { icon: Code2, label: '题目总数', value: stats.problemCount, color: 'text-cyan-400' },
            { icon: Users, label: '注册用户', value: stats.userCount, color: 'text-indigo-400' },
            { icon: FileCheck, label: '提交次数', value: stats.submissionCount, color: 'text-emerald-400' },
            { icon: Trophy, label: '通过次数', value: stats.acCount, color: 'text-amber-400' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div
              key={label}
              className="flex items-center gap-4 bg-slate-800/60 border border-slate-700/50 rounded-xl px-5 py-4"
            >
              <Icon className={`h-8 w-8 ${color} shrink-0`} />
              <div>
                <div className="text-2xl font-bold text-white">{value.toLocaleString()}</div>
                <div className="text-sm text-slate-400">{label}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── Feature Cards ── */}
      <section className="grid md:grid-cols-3 gap-6 mb-12">
        {[
          {
            icon: Terminal,
            title: '在线编程',
            desc: '支持多语言代码编辑与实时评测，覆盖编程题、选择题、填空题等多种题型',
            link: '/categories',
            linkText: '浏览题库',
            gradient: 'from-cyan-500/10 to-cyan-500/5',
            border: 'border-cyan-500/20',
            iconColor: 'text-cyan-400',
          },
          {
            icon: Swords,
            title: '实时对战',
            desc: '与对手实时 PK，在限时挑战中比拼编码速度与正确率，赢取积分提升排名',
            link: '/match',
            linkText: '开始对战',
            gradient: 'from-indigo-500/10 to-indigo-500/5',
            border: 'border-indigo-500/20',
            iconColor: 'text-indigo-400',
          },
          {
            icon: Shield,
            title: '模拟考试',
            desc: '限时考试模式，支持编程题与客观题混合组卷，自动评分与成绩分析',
            link: '/exams',
            linkText: '查看考试',
            gradient: 'from-amber-500/10 to-amber-500/5',
            border: 'border-amber-500/20',
            iconColor: 'text-amber-400',
          },
        ].map(({ icon: Icon, title, desc, link, linkText, gradient, border, iconColor }) => (
          <Link
            key={title}
            to={isAuthenticated ? link : '/login'}
            className={`group relative overflow-hidden rounded-xl border ${border} bg-gradient-to-br ${gradient} p-6 hover:scale-[1.02] transition-all`}
          >
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

      {/* ── Recent Problems + Leaderboard ── */}
      <section className="grid lg:grid-cols-3 gap-6 mb-12">
        {/* Recent Problems */}
        <div className="lg:col-span-2 bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-400" />
              最新题目
            </h2>
            <Link
              to="/categories"
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              查看全部 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {recentProblems.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">暂无题目</div>
            ) : (
              recentProblems.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-700/30 transition-colors group"
                >
                  <Link
                    to={`/problem/${p.id}/solve`}
                    className="flex items-center gap-3 min-w-0 flex-1"
                  >
                    <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium border ${getDifficultyStyle(p.difficulty)}`}>
                      {getDifficultyLabel(p.difficulty)}
                    </span>
                    <span className="text-white font-medium truncate group-hover:text-cyan-400 transition-colors">
                      {p.title}
                    </span>
                  </Link>
                  <div className="flex items-center gap-3 shrink-0 ml-4">
                    <span className="text-xs text-slate-500">{getTypeLabel(p.type)}</span>
                    <Link
                      to={`/problem/${p.id}`}
                      className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
                    >
                      详情
                    </Link>
                    <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-cyan-400 transition-colors" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-400" />
              积分排行
            </h2>
            <Link
              to="/achievements"
              className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              更多 <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-slate-700/50">
            {leaderboard.length === 0 ? (
              <div className="px-6 py-10 text-center text-slate-500">暂无排行数据</div>
            ) : (
              leaderboard.map((entry, idx) => (
                <div
                  key={entry.userId}
                  className="flex items-center gap-3 px-6 py-3.5"
                >
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

      {/* ── AI Feature Banner ── */}
      <section className="relative overflow-hidden rounded-xl border border-indigo-500/20 bg-gradient-to-r from-indigo-500/10 via-slate-800/60 to-purple-500/10 p-8 mb-12">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="shrink-0 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <Brain className="h-10 w-10 text-indigo-400" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h3 className="text-xl font-semibold text-white mb-2">AI 智能辅助</h3>
            <p className="text-slate-400">
              代码解释、思路提示、错误诊断、自动生成测试用例，AI 助手让学习更高效
            </p>
          </div>
          <Link
            to={isAuthenticated ? '/categories' : '/register'}
            className="shrink-0 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 hover:text-white hover:bg-indigo-500/30 transition-all font-medium"
          >
            立即体验
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}
