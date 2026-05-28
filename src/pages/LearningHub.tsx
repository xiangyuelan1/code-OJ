import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Briefcase, Bug, ArrowRight, Loader2 } from 'lucide-react';
import { starpathAPI, enhancedAiAPI } from '../services/api';

/* ── 闪烁星星背景 ── */
function TwinklingStars({ count = 60 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      });
    }
    return result;
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

interface ModuleCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  link: string;
  gradient: string;
  glowColor: string;
  stats: string;
  statLabel: string;
}

function ModuleCard({ icon, title, description, link, gradient, glowColor, stats, statLabel }: ModuleCardProps) {
  return (
    <Link
      to={link}
      className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20"
      style={{ background: gradient }}
    >
      {/* 光晕效果 */}
      <div
        className="absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-40"
        style={{ background: glowColor }}
      />
      <div
        className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full opacity-10 blur-3xl transition-opacity duration-300 group-hover:opacity-30"
        style={{ background: glowColor }}
      />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">
              {icon}
            </div>
            <h3 className="text-xl font-bold text-white">{title}</h3>
          </div>
          <ArrowRight className="h-5 w-5 text-white/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-white/80" />
        </div>

        <p className="mb-6 text-sm leading-relaxed text-white/60">{description}</p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{stats}</span>
            <span className="text-xs text-white/50">{statLabel}</span>
          </div>
          <span className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20">
            进入
          </span>
        </div>
      </div>
    </Link>
  );
}

export function LearningHub() {
  const [starStats, setStarStats] = useState({ explored: 0, total: 0 });
  const [interviewCount, setInterviewCount] = useState(0);
  const [bugsFound, setBugsFound] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [mapRes] = await Promise.allSettled([
          starpathAPI.getMap(),
        ]);

        if (mapRes.status === 'fulfilled' && mapRes.value.success) {
          const data = mapRes.value.data;
          setStarStats({
            explored: data.stats.exploredPlanets,
            total: data.stats.totalPlanets,
          });
        }
      } catch {
        // 非关键数据，加载失败不影响页面
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const modules: ModuleCardProps[] = [
    {
      icon: <Sparkles className="h-6 w-6 text-purple-300" />,
      title: '编程星途',
      description: '探索编程宇宙，在星途中发现知识的奥秘',
      link: '/starpath',
      gradient: 'linear-gradient(135deg, rgba(139,92,246,0.3) 0%, rgba(88,28,135,0.4) 50%, rgba(59,7,100,0.3) 100%)',
      glowColor: '#a78bfa',
      stats: loading ? '...' : `${starStats.explored}/${starStats.total}`,
      statLabel: '星球已探索',
    },
    {
      icon: <Briefcase className="h-6 w-6 text-blue-300" />,
      title: 'AI面试模拟',
      description: 'AI模拟真实面试场景，提升技术面试能力',
      link: '/interview',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(29,78,216,0.4) 50%, rgba(30,64,175,0.3) 100%)',
      glowColor: '#60a5fa',
      stats: String(interviewCount),
      statLabel: '面试次数',
    },
    {
      icon: <Bug className="h-6 w-6 text-green-300" />,
      title: 'AI猎虫挑战',
      description: '找出代码中的Bug，锻炼调试能力',
      link: '/bug-hunter',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(22,163,74,0.4) 50%, rgba(21,128,61,0.3) 100%)',
      glowColor: '#4ade80',
      stats: String(bugsFound),
      statLabel: 'Bug已发现',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      {/* CSS 动画 */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 1; }
        }
      `}</style>

      <TwinklingStars />

      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16">
        {/* 标题区域 */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-extrabold">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              多元学习
            </span>
          </h1>
          <p className="text-lg text-slate-400">用全新的方式学习编程</p>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid gap-6 md:grid-cols-3">
          {modules.map((mod) => (
            <ModuleCard key={mod.title} {...mod} />
          ))}
        </div>

        {/* 底部提示 */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-500">
            更多学习模块即将上线，敬请期待 ✨
          </p>
        </div>
      </div>
    </div>
  );
}
