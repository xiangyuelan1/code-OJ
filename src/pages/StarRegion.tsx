import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { starpathAPI } from '../services/api';
import {
  ArrowLeft, MessageSquare, Star, Loader2,
} from 'lucide-react';

/* ── 类型定义 ── */

type PlanetStatus = 'UNEXPLORED' | 'EXPLORING' | 'MASTERED';
type Difficulty = 'EASY' | 'MEDIUM' | 'HARD';

interface Planet {
  id: string;
  name: string;
  status: PlanetStatus;
  difficulty: Difficulty;
  order: number;
  score: number;
  maxScore: number;
}

interface RegionDetail {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  planets: Planet[];
  totalPlanets: number;
  exploredPlanets: number;
  masteredPlanets: number;
}

/* ── 区域背景色调 ── */

const REGION_BG: Record<string, string> = {
  foundation: 'linear-gradient(135deg, #0a0a2e 0%, #0d1b3e 50%, #0a0a2e 100%)',
  algorithm: 'linear-gradient(135deg, #0a0a2e 0%, #1a0d3e 50%, #0a0a2e 100%)',
  datastructure: 'linear-gradient(135deg, #0a0a2e 0%, #0d2e1b 50%, #0a0a2e 100%)',
  database: 'linear-gradient(135deg, #0a0a2e 0%, #2e1b0d 50%, #0a0a2e 100%)',
  network: 'linear-gradient(135deg, #0a0a2e 0%, #0d1b3e 50%, #0a0a2e 100%)',
  security: 'linear-gradient(135deg, #0a0a2e 0%, #2e0d1b 50%, #0a0a2e 100%)',
  design: 'linear-gradient(135deg, #0a0a2e 0%, #2e0d2e 50%, #0a0a2e 100%)',
  system: 'linear-gradient(135deg, #0a0a2e 0%, #2e1b0d 50%, #0a0a2e 100%)',
};

/* ── 闪烁星星背景 ── */

function TwinklingStars({ count = 60 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
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

/* ── 星球轨道连线 ── */

function StarTrails({ planets, containerWidth }: { planets: Planet[]; containerWidth: number }) {
  if (planets.length < 2 || containerWidth === 0) return null;

  const cols = containerWidth >= 768 ? 3 : 2;
  const cellW = containerWidth / cols;
  const cellH = 200;

  const positions = planets.map((_, idx) => ({
    x: (idx % cols) * cellW + cellW / 2,
    y: Math.floor(idx / cols) * cellH + 80,
  }));

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let i = 0; i < positions.length - 1; i++) {
    lines.push({
      x1: positions[i].x,
      y1: positions[i].y,
      x2: positions[i + 1].x,
      y2: positions[i + 1].y,
    });
  }

  return (
    <svg className="absolute inset-0 pointer-events-none z-0" width={containerWidth} height="100%">
      {lines.map((line, i) => (
        <line
          key={i}
          x1={line.x1} y1={line.y1}
          x2={line.x2} y2={line.y2}
          className="star-trail-line"
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

/* ── 星球状态样式 ── */

function getPlanetStatusClass(status: PlanetStatus): string {
  switch (status) {
    case 'MASTERED': return 'planet-mastered';
    case 'EXPLORING': return 'planet-exploring';
    case 'UNEXPLORED': default: return 'planet-unexplored';
  }
}

function getDifficultyDots(difficulty: Difficulty): number {
  switch (difficulty) {
    case 'EASY': return 1;
    case 'MEDIUM': return 2;
    case 'HARD': return 3;
    default: return 1;
  }
}

/* ── 主页面 ── */

export function StarRegionPage() {
  const { id: regionId } = useParams<{ id: string }>();
  const [region, setRegion] = useState<RegionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const gridRef = (el: HTMLDivElement | null) => {
    if (el) setContainerWidth(el.offsetWidth);
  };

  const loadRegion = useCallback(async () => {
    if (!regionId) return;
    try {
      const res = await starpathAPI.getMap();
      if (res.success && res.data) {
        const data = res.data as { regions?: Array<{ id: string }> };
        const found = (data.regions || []).find((r) => r.id === regionId);
        if (found) {
          setRegion(found as RegionDetail);
        }
      }
    } catch {
      /* 区域数据加载失败不阻塞渲染 */
    } finally {
      setLoading(false);
    }
  }, [regionId]);

  useEffect(() => {
    if (regionId) loadRegion();
  }, [regionId, loadRegion]);

  const handleGuideChat = async () => {
    const msg = chatInput.trim();
    if (!msg || chatLoading) return;
    setChatMessages((prev) => [...prev, { role: 'user', content: msg }]);
    setChatInput('');
    setChatLoading(true);
    try {
      const res = await starpathAPI.guideChat({ planetId: regionId, message: msg });
      if (res.success && res.data) {
        const content = (res.data as Record<string, string>).message || (res.data as Record<string, string>).content || '让我想想...';
        setChatMessages((prev) => [...prev, { role: 'guide', content }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'guide', content: '抱歉，暂时无法回应。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const bgStyle = { background: REGION_BG[regionId ?? ''] ?? REGION_BG.foundation };
  const progress = region
    ? region.totalPlanets > 0
      ? Math.round((region.exploredPlanets / region.totalPlanets) * 100)
      : 0
    : 0;

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载星域...</p>
        </div>
      </div>
    );
  }

  if (!region) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">未找到该星域</p>
          <Link to="/starpath" className="text-violet-400 hover:text-violet-300 text-sm">
            返回星图
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12 star-nebula" style={bgStyle}>
      <TwinklingStars count={60} />

      {/* 区域头部 */}
      <div className="relative z-10 mb-8">
        <Link
          to="/starpath"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-4 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回星图
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">{region.name}</h1>
            <p className="text-slate-400 text-sm max-w-lg">{region.description}</p>
          </div>
          <div className="glass-card rounded-xl px-4 py-2.5 text-center shrink-0 ml-4">
            <div className="text-xs text-slate-400 mb-1">探索进度</div>
            <div className="text-lg font-bold text-white">{progress}%</div>
          </div>
        </div>

        {/* 总进度条 */}
        <div className="mt-4 h-2 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
          <span>已探索 {region.exploredPlanets}/{region.totalPlanets}</span>
          <span>已精通 {region.masteredPlanets}</span>
        </div>
      </div>

      {/* 星球网格 + 连线 */}
      <div className="relative z-10" ref={gridRef}>
        <StarTrails planets={region.planets} containerWidth={containerWidth} />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 relative z-10">
          {region.planets.map((planet, idx) => (
            <Link
              key={planet.id}
              to={`/starpath/planet/${planet.id}`}
              className="group flex flex-col items-center animate-fade-in-up"
              style={{ animationDelay: `${idx * 0.06}s`, animationFillMode: 'both' }}
            >
              {/* 星球光球 */}
              <div className="relative mb-3">
                <div
                  className={`w-20 h-20 md:w-24 md:h-24 rounded-full ${getPlanetStatusClass(planet.status)} flex items-center justify-center transition-transform group-hover:scale-110 cursor-pointer`}
                >
                  {/* 星球内部光晕 */}
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-white/10 flex items-center justify-center">
                    <span className="text-lg md:text-xl">
                      {planet.status === 'MASTERED' ? '⭐' : planet.status === 'EXPLORING' ? '🔵' : '🌑'}
                    </span>
                  </div>
                </div>

                {/* 已精通的环绕光点 */}
                {planet.status === 'MASTERED' && (
                  <div className="absolute inset-0 animate-orbit">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-yellow-300 animate-sparkle" />
                  </div>
                )}

                {/* 难度指示点 */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
                  {Array.from({ length: getDifficultyDots(planet.difficulty) }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 rounded-full ${
                        planet.difficulty === 'EASY' ? 'bg-emerald-400' :
                        planet.difficulty === 'MEDIUM' ? 'bg-amber-400' :
                        'bg-rose-400'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 星球名称 */}
              <h3 className="text-sm font-medium text-white group-hover:text-violet-300 transition-colors text-center mb-0.5">
                {planet.name}
              </h3>

              {/* 状态标签 */}
              <span className={`text-xs ${
                planet.status === 'MASTERED' ? 'text-amber-400' :
                planet.status === 'EXPLORING' ? 'text-blue-400' :
                'text-slate-500'
              }`}>
                {planet.status === 'MASTERED' ? '已精通' :
                 planet.status === 'EXPLORING' ? '探索中' :
                 '未探索'}
              </span>

              {/* 分数 */}
              {planet.status !== 'UNEXPLORED' && (
                <span className="text-xs text-slate-500 mt-0.5">
                  {planet.score}/{planet.maxScore}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>

      {/* AI 向导浮动按钮 */}
      <button
        onClick={() => setChatOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center shadow-lg shadow-violet-500/20 hover:bg-violet-500/30 transition-all animate-float"
      >
        <MessageSquare className="h-6 w-6 text-violet-400" />
      </button>

      {/* AI 向导聊天面板 */}
      {chatOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => setChatOpen(false)} />
          <div className="relative w-full max-w-md h-full animate-slide-in-right flex flex-col starfield-bg star-nebula">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
                  <Star className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-semibold text-sm">AI 星际向导</h3>
                  <p className="text-xs text-slate-400">{region.name} 星域</p>
                </div>
              </div>
              <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-slate-400">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {chatMessages.length === 0 && (
                <div className="text-center py-10">
                  <p className="text-slate-400 text-sm mb-4">有什么关于「{region.name}」的问题吗？</p>
                  <button
                    onClick={() => {
                      setChatMessages([{ role: 'user', content: `给我介绍一下${region.name}星域` }]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-violet-500/15 transition-all"
                  >
                    介绍这个星域
                  </button>
                </div>
              )}
              {chatMessages.map((msg, idx) => (
                <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  {msg.role === 'guide' && (
                    <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                      <Star className="h-3.5 w-3.5 text-violet-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-violet-500/20 border border-violet-400/20 text-violet-100 rounded-tr-md'
                      : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-md'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2.5">
                  <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                    <Star className="h-3.5 w-3.5 text-violet-400" />
                  </div>
                  <div className="px-4 py-2.5 rounded-2xl rounded-tl-md bg-white/5 border border-white/10 text-slate-400 text-sm">
                    <span className="typing-cursor">思考中</span>
                  </div>
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-white/10">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-violet-400/40 transition-colors">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGuideChat(); } }}
                  placeholder="向星际向导提问..."
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
                />
                <button
                  onClick={handleGuideChat}
                  disabled={!chatInput.trim() || chatLoading}
                  className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
