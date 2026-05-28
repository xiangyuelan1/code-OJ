import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { starpathAPI, type StarMapData, type StarMapRegion } from '../services/api';
import {
  Sparkles, MessageSquare, ChevronRight,
  Globe, Flame, Trophy, Loader2,
} from 'lucide-react';
import { GuideChatPanel } from '../components/GuideChatPanel';

/* ── 闪烁星星背景 ── */

function TwinklingStars({ count = 80 }: { count?: number }) {
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
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 根据后端返回的 region.color 生成 Tailwind 渐变色类名
 * 由于 Tailwind 需要编译时确定类名，这里使用内联 style 方案
 */
function getRegionStyle(color: string) {
  return {
    iconBg: `linear-gradient(135deg, ${color}33, ${color}1A)`,
    iconBorder: `${color}4D`,
    progressFrom: color,
    progressTo: adjustColorBrightness(color, 60),
  };
}

/** 调整颜色亮度，用于渐变终点色 */
function adjustColorBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + amount);
  const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
  const b = Math.min(255, (num & 0xFF) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/* ── 星域卡片 ── */

function RegionCard({ region, index }: { region: StarMapRegion; index: number }) {
  const style = getRegionStyle(region.color);
  const progress = region.totalPlanets > 0
    ? Math.round((region.exploredPlanets / region.totalPlanets) * 100)
    : 0;

  return (
    <Link
      to={`/starpath/region/${region.id}`}
      className="group glass-card glass-card-hover rounded-2xl p-6 transition-all duration-300 animate-fade-in-up hover:shadow-lg"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: style.iconBg, border: `1px solid ${style.iconBorder}` }}
        >
          {region.icon}
        </div>
        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-violet-400 transition-colors" />
      </div>

      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-violet-300 transition-colors">
        {region.name}
      </h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{region.description}</p>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">探索进度</span>
          <span className="text-slate-400">{region.exploredPlanets}/{region.totalPlanets}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(to right, ${style.progressFrom}, ${style.progressTo})`,
            }}
          />
        </div>
      </div>
    </Link>
  );
}

/* ── 主页面 ── */

export function StarPathPage() {
  const [mapData, setMapData] = useState<StarMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    loadMapData();
  }, []);

  const loadMapData = async () => {
    try {
      const res = await starpathAPI.getMap();
      if (res.success && res.data) {
        setMapData(res.data as StarMapData);
      }
    } catch {
      /* 地图数据加载失败时使用空状态，不阻塞渲染 */
    } finally {
      setLoading(false);
    }
  };

  const stats = mapData?.stats ?? { totalPlanets: 0, exploredPlanets: 0, masteredPlanets: 0, streakDays: 0 };
  const regions = mapData?.regions ?? [];

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载星图...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <TwinklingStars count={80} />

      {/* 顶部统计栏 */}
      <div className="relative z-10 mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              编程<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">星途</span>
            </h1>
            <p className="text-slate-400 text-sm">探索知识的星辰大海</p>
          </div>
          <button
            onClick={() => setChatOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25 hover:text-white transition-all"
          >
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">AI向导</span>
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span className="text-xs text-slate-400">已探索</span>
            </div>
            <div className="text-xl font-bold text-white">
              {stats.exploredPlanets}<span className="text-sm text-slate-500 font-normal">/{stats.totalPlanets}</span>
            </div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">已精通</span>
            </div>
            <div className="text-xl font-bold text-amber-400">{stats.masteredPlanets}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Flame className="h-4 w-4 text-rose-400" />
              <span className="text-xs text-slate-400">连续天数</span>
            </div>
            <div className="text-xl font-bold text-rose-400">{stats.streakDays}</div>
          </div>
        </div>
      </div>

      {/* 星域卡片网格 */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {regions.map((region, idx) => (
          <RegionCard key={region.id} region={region} index={idx} />
        ))}
      </div>

      {/* 空状态 */}
      {regions.length === 0 && !loading && (
        <div className="relative z-10 text-center py-20">
          <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">星图正在生成中</h3>
          <p className="text-slate-400 text-sm mb-6">开始做题后，你的专属星图将逐渐展开</p>
          <Link
            to="/categories"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity"
          >
            开始探索 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* AI 向导聊天面板 */}
      <GuideChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
