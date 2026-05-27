import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { starpathAPI } from '../services/api';
import {
  Sparkles, MessageSquare, Send, Star, ChevronRight,
  Globe, Flame, Trophy, X, Loader2,
} from 'lucide-react';

/* ── 类型定义 ── */

interface StarRegion {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  totalPlanets: number;
  exploredPlanets: number;
  order: number;
}

interface StarMapStats {
  explored: number;
  total: number;
  mastered: number;
  streakDays: number;
}

interface StarMapData {
  regions: StarRegion[];
  stats: StarMapStats;
}

interface ChatMessage {
  role: 'user' | 'guide';
  content: string;
}

/* ── 区域图标映射 ── */

const REGION_ICONS: Record<string, string> = {
  foundation: '🏗️',
  algorithm: '🧠',
  datastructure: '🌳',
  database: '🗄️',
  network: '🌐',
  security: '🛡️',
  design: '🎨',
  system: '⚙️',
};

/* ── 区域颜色映射 ── */

const REGION_COLORS: Record<string, { from: string; to: string; border: string; glow: string }> = {
  foundation: { from: 'from-cyan-500/20', to: 'to-cyan-600/10', border: 'border-cyan-500/30', glow: 'shadow-cyan-500/20' },
  algorithm: { from: 'from-violet-500/20', to: 'to-violet-600/10', border: 'border-violet-500/30', glow: 'shadow-violet-500/20' },
  datastructure: { from: 'from-emerald-500/20', to: 'to-emerald-600/10', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
  database: { from: 'from-amber-500/20', to: 'to-amber-600/10', border: 'border-amber-500/30', glow: 'shadow-amber-500/20' },
  network: { from: 'from-blue-500/20', to: 'to-blue-600/10', border: 'border-blue-500/30', glow: 'shadow-blue-500/20' },
  security: { from: 'from-rose-500/20', to: 'to-rose-600/10', border: 'border-rose-500/30', glow: 'shadow-rose-500/20' },
  design: { from: 'from-pink-500/20', to: 'to-pink-600/10', border: 'border-pink-500/30', glow: 'shadow-pink-500/20' },
  system: { from: 'from-orange-500/20', to: 'to-orange-600/10', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
};

const DEFAULT_COLORS = { from: 'from-slate-500/20', to: 'to-slate-600/10', border: 'border-slate-500/30', glow: 'shadow-slate-500/20' };

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

/* ── AI 向导聊天面板 ── */

function GuideChatPanel({
  open,
  onClose,
  messages,
  onSend,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
}) {
  const [input, setInput] = useState('');

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const quickSuggestions = [
    '我该学什么？',
    '我的薄弱点是什么？',
    '推荐一个挑战',
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-md h-full animate-slide-in-right flex flex-col starfield-bg star-nebula">
        {/* 头部 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
              <Star className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">AI 星际向导</h3>
              <p className="text-xs text-slate-400">你的编程学习伙伴</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="h-5 w-5 text-slate-400" />
          </button>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-violet-500/15 border border-violet-400/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-6 w-6 text-violet-400" />
              </div>
              <p className="text-slate-400 text-sm mb-6">你好！我是你的星际向导 ✨</p>
              <div className="flex flex-col gap-2">
                {quickSuggestions.map((s) => (
                  <button
                    key={s}
                    onClick={() => onSend(s)}
                    className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-violet-500/15 hover:border-violet-400/30 hover:text-white transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {msg.role === 'guide' && (
                <div className="shrink-0 w-7 h-7 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center mt-1">
                  <Star className="h-3.5 w-3.5 text-violet-400" />
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-violet-500/20 border border-violet-400/20 text-violet-100 rounded-tr-md'
                    : 'bg-white/5 border border-white/10 text-slate-200 rounded-tl-md'
                }`}
              >
                {msg.content}
                {msg.role === 'guide' && loading && idx === messages.length - 1 && (
                  <span className="typing-cursor" />
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'guide' && (
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

        {/* 快捷建议 */}
        {messages.length > 0 && (
          <div className="px-5 py-2 flex gap-2 overflow-x-auto border-t border-white/5">
            {quickSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => onSend(s)}
                className="shrink-0 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-400 text-xs hover:bg-violet-500/15 hover:text-white transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* 输入框 */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-violet-400/40 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="向星际向导提问..."
              className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 主页面 ── */

export function StarPathPage() {
  const [mapData, setMapData] = useState<StarMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

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

  const handleGuideChat = useCallback(async (message: string) => {
    setChatMessages((prev) => [...prev, { role: 'user', content: message }]);
    setChatLoading(true);
    try {
      const res = await starpathAPI.guideChat({ message });
      if (res.success && res.data) {
        const guideContent = (res.data as Record<string, string>).message || (res.data as Record<string, string>).content || '让我想想...';
        setChatMessages((prev) => [...prev, { role: 'guide', content: guideContent }]);
      }
    } catch {
      setChatMessages((prev) => [...prev, { role: 'guide', content: '抱歉，我暂时无法回应，请稍后再试。' }]);
    } finally {
      setChatLoading(false);
    }
  }, []);

  const stats = mapData?.stats ?? { explored: 0, total: 0, mastered: 0, streakDays: 0 };
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
              {stats.explored}<span className="text-sm text-slate-500 font-normal">/{stats.total}</span>
            </div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <Trophy className="h-4 w-4 text-amber-400" />
              <span className="text-xs text-slate-400">已精通</span>
            </div>
            <div className="text-xl font-bold text-amber-400">{stats.mastered}</div>
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
        {regions.map((region, idx) => {
          const colors = REGION_COLORS[region.id] ?? DEFAULT_COLORS;
          const icon = REGION_ICONS[region.id] ?? '🌌';
          const progress = region.totalPlanets > 0
            ? Math.round((region.exploredPlanets / region.totalPlanets) * 100)
            : 0;

          return (
            <Link
              key={region.id}
              to={`/starpath/region/${region.id}`}
              className={`group glass-card glass-card-hover rounded-2xl p-6 transition-all duration-300 animate-fade-in-up hover:shadow-lg ${colors.glow}`}
              style={{ animationDelay: `${idx * 0.08}s`, animationFillMode: 'both' }}
            >
              {/* 区域头部 */}
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.from} ${colors.to} border ${colors.border} flex items-center justify-center text-2xl`}>
                  {icon}
                </div>
                <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-violet-400 transition-colors" />
              </div>

              {/* 区域名称 */}
              <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-violet-300 transition-colors">
                {region.name}
              </h3>
              <p className="text-xs text-slate-400 mb-4 line-clamp-2">{region.description}</p>

              {/* 进度条 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">探索进度</span>
                  <span className="text-slate-400">{region.exploredPlanets}/{region.totalPlanets}</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </Link>
          );
        })}
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
      <GuideChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        messages={chatMessages}
        onSend={handleGuideChat}
        loading={chatLoading}
      />
    </div>
  );
}
