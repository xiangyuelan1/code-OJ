import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { starpathAPI, starpathStoryAPI, starpathAchievementAPI, type StarMapData, type StarMapRegion, type SeasonEventData, type RecommendedPlanet } from '../services/api';
import {
  Sparkles, MessageSquare, ChevronRight,
  Globe, Flame, Trophy, Loader2,
  Building2, Users, Award, Zap,
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

function getRegionStyle(color: string) {
  return {
    iconBg: `linear-gradient(135deg, ${color}33, ${color}1A)`,
    iconBorder: `${color}4D`,
    progressFrom: color,
    progressTo: adjustColorBrightness(color, 60),
  };
}

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
  const [activeEvents, setActiveEvents] = useState<SeasonEventData[]>([]);
  const [recommend, setRecommend] = useState<RecommendedPlanet | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mapRes, eventsRes, recommendRes] = await Promise.all([
        starpathAPI.getMap(),
        starpathStoryAPI.getEvents(),
        starpathAchievementAPI.getRecommend(),
      ]);
      if (mapRes.success && mapRes.data) setMapData(mapRes.data as StarMapData);
      if (eventsRes.success && eventsRes.data) setActiveEvents(eventsRes.data as SeasonEventData[]);
      if (recommendRes.success && recommendRes.data) setRecommend(recommendRes.data as RecommendedPlanet);
    } catch {
      /* 数据加载失败不阻塞渲染 */
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
      <div className="relative z-10 mb-8">
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

      {/* 限时事件横幅 */}
      {activeEvents.length > 0 && (
        <div className="relative z-10 mb-6">
          {activeEvents.slice(0, 2).map((event) => (
            <Link
              key={event.id}
              to={`/starpath/social`}
              className="block mb-3 glass-card rounded-xl p-4 border-l-4 border-amber-400/60 hover:bg-white/[0.04] transition-all animate-fade-in-up"
            >
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-amber-300">{event.name}</span>
                    {event.bonusMultiplier > 1 && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30">
                        {event.bonusMultiplier}x积分
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{event.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* AI推荐下一个星球 */}
      {recommend && (
        <div className="relative z-10 mb-6">
          <Link
            to={`/starpath/planet/${recommend.planetId}`}
            className="block glass-card rounded-xl p-4 border-l-4 border-violet-400/60 hover:bg-white/[0.04] transition-all animate-fade-in-up"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-400/25 flex items-center justify-center shrink-0">
                <Sparkles className="h-5 w-5 text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-violet-300 mb-0.5">AI推荐</div>
                <div className="text-sm font-medium text-white">{recommend.planetName}</div>
                <div className="text-xs text-slate-400">{recommend.reason}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
            </div>
          </Link>
        </div>
      )}

      {/* 功能入口 */}
      <div className="relative z-10 grid grid-cols-3 gap-3 mb-8">
        <Link
          to="/starpath/building"
          className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group"
        >
          <Building2 className="h-6 w-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">星球建设</span>
        </Link>
        <Link
          to="/starpath/social"
          className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group"
        >
          <Users className="h-6 w-6 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">星际社交</span>
        </Link>
        <Link
          to="/starpath/achievement"
          className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group"
        >
          <Award className="h-6 w-6 text-rose-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">成就中心</span>
        </Link>
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
