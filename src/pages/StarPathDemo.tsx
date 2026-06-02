import { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, MessageSquare, ChevronRight,
  Globe, Flame, Trophy, Loader2,
  Building2, Users, Award, Zap,
  Gift, Heart, Star, Edit3, X,
  RotateCcw, Rocket, Crown, Target, Swords, TreePine,
} from 'lucide-react';

/* ═══════════════════════════════════════
   Mock 数据 — 无需后端即可体验全部功能
   ═══════════════════════════════════════ */

const MOCK_REGIONS = [
  { id: 'r1', name: '变量星云', description: '编程的起点，掌握变量与数据类型', icon: '🌌', color: '#8b5cf6', exploredPlanets: 5, totalPlanets: 8, masteredPlanets: 3 },
  { id: 'r2', name: '循环星域', description: '在重复中寻找规律，for/while 的力量', icon: '🔄', color: '#06b6d4', exploredPlanets: 4, totalPlanets: 7, masteredPlanets: 2 },
  { id: 'r3', name: '条件星系', description: 'if/else 的抉择，逻辑分支的艺术', icon: '🔀', color: '#f59e0b', exploredPlanets: 6, totalPlanets: 6, masteredPlanets: 5 },
  { id: 'r4', name: '数组星团', description: '数据的集合，排序与查找的奥秘', icon: '📊', color: '#10b981', exploredPlanets: 3, totalPlanets: 9, masteredPlanets: 1 },
  { id: 'r5', name: '函数星球', description: '封装与复用，递归的魔法', icon: '⚡', color: '#ef4444', exploredPlanets: 2, totalPlanets: 8, masteredPlanets: 0 },
  { id: 'r6', name: '指针深渊', description: '内存的真相，指针与引用的冒险', icon: '🕳️', color: '#6366f1', exploredPlanets: 1, totalPlanets: 10, masteredPlanets: 0 },
];

const MOCK_EVENTS = [
  { id: 'e1', name: '六一星际嘉年华', description: '儿童节限时双倍积分！完成任意星球挑战即享2x积分', bonusMultiplier: 2 },
  { id: 'e2', name: '新手冲刺赛', description: '首次通关3个星球额外奖励50积分', bonusMultiplier: 1.5 },
];

const MOCK_PET_TYPES: Record<string, any> = {
  star_cat: { emoji: '🐱', name: '星喵', description: '来自仙女座的可爱猫咪，喜欢在代码间穿行' },
  moon_bunny: { emoji: '🐰', name: '月兔', description: '月球上的精灵，擅长跳跃和递归' },
  comet_fox: { emoji: '🦊', name: '彗星狐', description: '速度如彗星的聪明狐狸' },
  nebula_owl: { emoji: '🦉', name: '星云鸮', description: '洞察力极强的智慧之鸟' },
  galaxy_dragon: { emoji: '🐉', name: '银河龙', description: '传说中的星际守护神' },
};

const MOCK_BUILDINGS = [
  { id: 'b1', name: '知识灯塔', icon: '🗼', level: 2, maxLevel: 3, desc: '提升学习效率', effect: '经验+20%' },
  { id: 'b2', name: '代码工坊', icon: '🔧', level: 1, maxLevel: 3, desc: '解锁更多题目', effect: '题目+5' },
  { id: 'b3', name: '积分矿场', icon: '⛏️', level: 3, maxLevel: 3, desc: '自动产出积分', effect: '+10积分/天' },
  { id: 'b4', name: '传送门', icon: '🌀', level: 1, maxLevel: 3, desc: '快速跳转题目', effect: '解锁快捷入口' },
  { id: 'b5', name: '星际图书馆', icon: '📚', level: 2, maxLevel: 3, desc: '查看题解提示', effect: '提示-50%积分' },
];

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', name: '初出茅庐', icon: '🌱', desc: '完成第一道题', unlocked: true, progress: 1, total: 1 },
  { id: 'a2', name: '十题斩将', icon: '⚔️', desc: '完成10道题', unlocked: true, progress: 10, total: 10 },
  { id: 'a3', name: '百题大师', icon: '👑', desc: '完成100道题', unlocked: false, progress: 37, total: 100 },
  { id: 'a4', name: '连胜之星', icon: '🔥', desc: '连续7天刷题', unlocked: true, progress: 7, total: 7 },
  { id: 'a5', name: '全知全能', icon: '🌟', desc: '精通所有星域', unlocked: false, progress: 1, total: 6 },
  { id: 'a6', name: '社交蝴蝶', icon: '🦋', desc: '添加5位好友', unlocked: false, progress: 2, total: 5 },
];

/* ═══════════════════════════════════════
   动画组件
   ═══════════════════════════════════════ */

function ShootingStars() {
  const stars = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => ({
      id: i, delay: Math.random() * 12 + i * 3,
      duration: Math.random() * 1.5 + 0.8, top: Math.random() * 50, angle: Math.random() * 20 + 20,
    })), []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div key={s.id} className="absolute h-[1px] opacity-0"
          style={{ top: `${s.top}%`, left: '-10%', width: '120px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)',
            transform: `rotate(${s.angle}deg)`, animation: `shootingStar ${s.duration}s ease-out ${s.delay}s infinite` }}
        />
      ))}
    </div>
  );
}

interface FloatingStar { id: number; x: number; y: number; type: 'common'|'rare'|'epic'|'legendary'; size: number; wobble: number; }

const STAR_STYLES: Record<string, { color: string; points: string }> = {
  common: { color: 'text-yellow-300', points: '+1' },
  rare: { color: 'text-cyan-300', points: '+3' },
  epic: { color: 'text-purple-300', points: '+5' },
  legendary: { color: 'text-amber-400', points: '+10' },
};

function FloatingStars({ onCollect }: { onCollect: (type: string) => void }) {
  const [stars, setStars] = useState<FloatingStar[]>([]);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [popups, setPopups] = useState<Array<{ id: number; x: number; y: number; text: string }>>([]);

  const addStar = useCallback(() => {
    if (stars.filter(s => !collected.has(s.id)).length < 5) {
      const rand = Math.random();
      const type: FloatingStar['type'] = rand < 0.5 ? 'common' : rand < 0.8 ? 'rare' : rand < 0.95 ? 'epic' : 'legendary';
      setStars(prev => [...prev.slice(-20), { id: Date.now() + Math.random(), x: 10 + Math.random() * 80, y: 10 + Math.random() * 80, type, size: type === 'legendary' ? 28 : type === 'epic' ? 22 : type === 'rare' ? 18 : 14, wobble: Math.random() * 4 + 2 }]);
    }
  }, [stars.length, collected.size]);

  useState(() => { const t = setInterval(addStar, 3000); return () => clearInterval(t); });

  const handleCollect = (star: FloatingStar) => {
    if (collected.has(star.id)) return;
    setCollected(prev => new Set([...prev, star.id]));
    setPopups(prev => [...prev, { id: star.id, x: star.x, y: star.y, text: STAR_STYLES[star.type].points }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== star.id)), 1000);
    onCollect(star.type);
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => {
        if (collected.has(star.id)) return null;
        const style = STAR_STYLES[star.type];
        return (
          <button key={star.id} onClick={() => handleCollect(star)}
            className={`absolute pointer-events-auto cursor-pointer ${style.color} hover:scale-150 transition-transform`}
            style={{ left: `${star.x}%`, top: `${star.y}%`, animation: `floatWobble ${star.wobble}s ease-in-out infinite, starAppear 0.5s ease-out`,
              filter: star.type === 'legendary' ? 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' : star.type === 'epic' ? 'drop-shadow(0 0 6px rgba(196,181,253,0.5))' : 'none' }}
          >
            <Star className="h-4 w-4" style={{ width: star.size, height: star.size }} fill="currentColor" />
          </button>
        );
      })}
      {popups.map(p => (
        <div key={p.id} className="absolute text-sm font-bold text-amber-400 pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, animation: 'popUpFade 1s ease-out forwards' }}>{p.text}</div>
      ))}
    </div>
  );
}

function TwinklingStars({ count = 80 }: { count?: number }) {
  const stars = useMemo(() =>
    Array.from({ length: count }, (_, i) => ({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 2 + 1, delay: Math.random() * 5, duration: Math.random() * 3 + 2 })),
  [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div key={star.id} className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   交互式组件（本地状态，不调后端）
   ═══════════════════════════════════════ */

function DailyChestDemo() {
  const [opened, setOpened] = useState(false);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(3);
  const [shake, setShake] = useState(false);
  const [opening, setOpening] = useState(false);

  const handleOpen = () => {
    if (opened || opening) return;
    setOpening(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => {
      const won = Math.floor(Math.random() * 31) + 10;
      setPoints(won);
      setOpened(true);
      setStreak(s => s + 1);
      setOpening(false);
    }, 600);
  };

  return (
    <div className="glass-card rounded-2xl p-5 border-amber-400/20">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-5 w-5 text-amber-400" />
        <h3 className="text-base font-semibold text-white">每日宝箱</h3>
        <span className="ml-auto text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">🔥 连续{streak}天</span>
      </div>
      {opened ? (
        <div className="text-center py-4 animate-bounce">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-2xl font-bold text-amber-400">+{points}积分</div>
          <p className="text-xs text-slate-400 mt-1">已收入囊中！</p>
        </div>
      ) : (
        <button onClick={handleOpen} disabled={opening}
          className={`w-full py-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 hover:border-amber-400/50 transition-all ${shake ? 'animate-shake' : ''}`}
        >
          <div className={`text-4xl mb-1 transition-transform ${opening ? 'scale-125' : 'hover:scale-110'}`}>🎁</div>
          <p className="text-sm text-amber-300 font-medium">{opening ? '开启中...' : '点击开箱！'}</p>
        </button>
      )}
    </div>
  );
}

function SpacePetDemo() {
  const [petType, setPetType] = useState('star_cat');
  const [petName, setPetName] = useState('星喵');
  const [mood, setMood] = useState(80);
  const [level, setLevel] = useState(3);
  const [exp, setExp] = useState(45);
  const [expToNext] = useState(150);
  const [feeding, setFeeding] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [bounce, setBounce] = useState(false);
  const [feedMsg, setFeedMsg] = useState('');

  const petInfo = MOCK_PET_TYPES[petType];
  const moodEmoji = mood >= 80 ? '😊' : mood >= 50 ? '😐' : '😟';
  const levelTitle = level <= 2 ? '幼年' : level <= 4 ? '成长' : level <= 7 ? '精英' : '传奇';

  const handleFeed = () => {
    if (feeding) return;
    setFeeding(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    const newMood = Math.min(100, mood + 20);
    const newExp = exp + 15;
    setMood(newMood);
    if (newExp >= expToNext) {
      setExp(newExp - expToNext);
      setLevel(l => l + 1);
      setFeedMsg(`🎉 升级到 Lv.${level + 1}！`);
    } else {
      setExp(newExp);
      setFeedMsg('心情 +20，经验 +15');
    }
    setTimeout(() => setFeedMsg(''), 2000);
    setFeeding(false);
  };

  const handleChangeType = (type: string) => {
    setPetType(type);
    setPetName(MOCK_PET_TYPES[type].name);
    setShowTypes(false);
  };

  return (
    <div className="glass-card rounded-2xl p-5 border-violet-400/20">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-5 w-5 text-pink-400" />
        <h3 className="text-base font-semibold text-white">太空伙伴</h3>
        <span className="ml-auto text-xs text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-full">Lv.{level} {levelTitle}</span>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => { setBounce(true); setTimeout(() => setBounce(false), 400); }}
          className={`text-5xl transition-transform hover:scale-110 ${bounce ? 'animate-bounce' : ''}`}
        >{petInfo.emoji}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{petName}</span>
            <button onClick={() => { setShowRename(!showRename); setRenameValue(petName); }} className="text-slate-500 hover:text-violet-400"><Edit3 className="h-3 w-3" /></button>
            <span className="text-xs text-slate-400">{moodEmoji}</span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{petInfo.description}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-8">心情</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${mood >= 80 ? 'bg-green-400' : mood >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${mood}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{mood}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-8">经验</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.round((exp / expToNext) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{exp}/{expToNext}</span>
            </div>
          </div>
        </div>
      </div>
      {showRename && (
        <div className="flex gap-2 mb-3">
          <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" maxLength={20} />
          <button onClick={() => { setPetName(renameValue); setShowRename(false); }} className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-sm">确定</button>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={handleFeed} disabled={feeding} className="flex-1 py-2 rounded-lg bg-pink-500/15 text-pink-300 text-sm hover:bg-pink-500/25 transition-colors disabled:opacity-50">
          {feeding ? '喂食中...' : '🍖 喂食 (10积分)'}
        </button>
        <button onClick={() => setShowTypes(!showTypes)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">🔄 换宠</button>
      </div>
      {feedMsg && <div className="mt-3 text-center text-sm text-green-400">{feedMsg}</div>}
      {showTypes && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Object.entries(MOCK_PET_TYPES).map(([key, info]: [string, any]) => (
            <button key={key} onClick={() => handleChangeType(key)}
              className={`p-2 rounded-lg text-center transition-all ${petType === key ? 'bg-violet-500/20 border border-violet-400/40' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'}`}
            >
              <div className="text-2xl mb-1">{info.emoji}</div>
              <div className="text-[10px] text-slate-300">{info.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   星域卡片
   ═══════════════════════════════════════ */

function RegionCard({ region, index }: { region: typeof MOCK_REGIONS[0]; index: number }) {
  const progress = region.totalPlanets > 0 ? Math.round((region.exploredPlanets / region.totalPlanets) * 100) : 0;
  const mastered = region.totalPlanets > 0 ? Math.round((region.masteredPlanets / region.totalPlanets) * 100) : 0;

  return (
    <div className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-300 hover:shadow-lg"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: `linear-gradient(135deg, ${region.color}33, ${region.color}1A)`, border: `1px solid ${region.color}4D` }}>
          {region.icon}
        </div>
        <span className="text-xs text-slate-500">{progress}%</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{region.name}</h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{region.description}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">探索进度</span>
          <span className="text-slate-400">{region.exploredPlanets}/{region.totalPlanets}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(to right, ${region.color}, ${region.color}99)` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-500">精通</span>
          <span className="text-amber-400">{region.masteredPlanets}/{region.totalPlanets}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${mastered}%` }} />
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   主页面
   ═══════════════════════════════════════ */

export function StarPathDemoPage() {
  const [collectCount, setCollectCount] = useState(12);
  const [activeTab, setActiveTab] = useState<'map' | 'building' | 'social' | 'achievement'>('map');
  const [totalPoints] = useState(580);
  const [userLevel] = useState(8);

  const handleCollectStar = useCallback((type: string) => { setCollectCount(c => c + 1); }, []);

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12 overflow-hidden">
      <TwinklingStars count={80} />
      <ShootingStars />
      <FloatingStars onCollect={handleCollectStar} />

      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes shootingStar {
          0% { transform: translateX(0) rotate(30deg); opacity: 0; }
          5% { opacity: 1; } 70% { opacity: 1; }
          100% { transform: translateX(120vw) rotate(30deg); opacity: 0; }
        }
        @keyframes floatWobble { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        @keyframes starAppear { 0% { transform: scale(0); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes popUpFade { 0% { transform: translateY(0); opacity: 1; } 100% { transform: translateY(-30px); opacity: 0; } }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px) rotate(-2deg); } 75% { transform: translateX(5px) rotate(2deg); } }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>

      {/* 顶部 */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              编程<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">星途</span>
              <span className="ml-2 text-sm bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">体验版</span>
            </h1>
            <p className="text-slate-400 text-sm">所有数据为模拟，可直接交互体验 ✨ 儿童节快乐！🎈</p>
          </div>
          <Link to="/starpath" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-all">
            <RotateCcw className="h-4 w-4" />
            <span className="text-sm">返回正式版</span>
          </Link>
        </div>

        <div className="grid grid-cols-5 gap-3">
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Globe className="h-4 w-4 text-cyan-400" /><span className="text-xs text-slate-400">已探索</span></div>
            <div className="text-xl font-bold text-white">21<span className="text-sm text-slate-500 font-normal">/48</span></div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Trophy className="h-4 w-4 text-amber-400" /><span className="text-xs text-slate-400">已精通</span></div>
            <div className="text-xl font-bold text-amber-400">11</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Flame className="h-4 w-4 text-rose-400" /><span className="text-xs text-slate-400">连续天数</span></div>
            <div className="text-xl font-bold text-rose-400">7</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Star className="h-4 w-4 text-yellow-400" /><span className="text-xs text-slate-400">收集星星</span></div>
            <div className="text-xl font-bold text-yellow-400">{collectCount}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Crown className="h-4 w-4 text-violet-400" /><span className="text-xs text-slate-400">等级</span></div>
            <div className="text-xl font-bold text-violet-400">Lv.{userLevel}</div>
          </div>
        </div>
      </div>

      {/* 限时事件 */}
      <div className="relative z-10 mb-6">
        {MOCK_EVENTS.map((event) => (
          <div key={event.id} className="mb-3 glass-card rounded-xl p-4 border-l-4 border-amber-400/60">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-amber-300">{event.name}</span>
                  {event.bonusMultiplier > 1 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30">{event.bonusMultiplier}x积分</span>}
                </div>
                <p className="text-xs text-slate-400">{event.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tab 切换 */}
      <div className="relative z-10 flex gap-2 mb-6">
        {[
          { key: 'map', label: '星际地图', icon: Globe },
          { key: 'building', label: '星球建设', icon: Building2 },
          { key: 'social', label: '星际社交', icon: Users },
          { key: 'achievement', label: '成就中心', icon: Award },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30' : 'bg-slate-800/50 text-slate-400 border border-transparent hover:text-white'}`}
          >
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'map' && (
        <>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
            <DailyChestDemo />
            <SpacePetDemo />
          </div>
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {MOCK_REGIONS.map((region, idx) => (
              <RegionCard key={region.id} region={region} index={idx} />
            ))}
          </div>
        </>
      )}

      {activeTab === 'building' && (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {MOCK_BUILDINGS.map(b => (
            <div key={b.id} className="glass-card rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">{b.icon}</div>
                <div>
                  <h3 className="text-base font-semibold text-white">{b.name}</h3>
                  <p className="text-xs text-slate-400">{b.desc}</p>
                </div>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500">等级 {b.level}/{b.maxLevel}</span>
                <span className="text-xs text-cyan-400">{b.effect}</span>
              </div>
              <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500" style={{ width: `${(b.level / b.maxLevel) * 100}%` }} />
              </div>
              <button className="w-full py-2 rounded-lg bg-cyan-500/15 text-cyan-300 text-sm hover:bg-cyan-500/25 transition-colors disabled:opacity-50"
                disabled={b.level >= b.maxLevel}
              >
                {b.level >= b.maxLevel ? '✅ 已满级' : `⬆️ 升级 (需${b.level * 50}积分)`}
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'social' && (
        <div className="relative z-10 space-y-5">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" />排行榜</h3>
            <div className="space-y-2">
              {[
                { rank: 1, name: '算法小王子', points: 2850, medal: '🥇' },
                { rank: 2, name: '代码侠', points: 2340, medal: '🥈' },
                { rank: 3, name: '递归大师', points: 1980, medal: '🥉' },
                { rank: 4, name: '你', points: totalPoints, medal: '' },
                { rank: 5, name: '新手村长', points: 420, medal: '' },
              ].map(u => (
                <div key={u.rank} className={`flex items-center gap-3 p-3 rounded-lg ${u.name === '你' ? 'bg-violet-500/10 border border-violet-400/20' : 'bg-slate-800/30'}`}>
                  <span className={`text-lg font-bold w-8 text-center ${u.rank <= 3 ? 'text-amber-400' : 'text-slate-500'}`}>{u.medal || u.rank}</span>
                  <span className={`flex-1 text-sm ${u.name === '你' ? 'text-violet-300 font-semibold' : 'text-white'}`}>{u.name}</span>
                  <span className="text-sm text-amber-400">{u.points} 积分</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Swords className="h-5 w-5 text-rose-400" />团队挑战</h3>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⚔️</div>
              <p className="text-slate-400 text-sm mb-4">组队挑战更高难度的星球</p>
              <button className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium">发起挑战</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'achievement' && (
        <div className="relative z-10 space-y-5">
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-cyan-400" />技能雷达</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: '基础语法', pct: 85 }, { name: '循环结构', pct: 70 },
                { name: '条件判断', pct: 95 }, { name: '数组操作', pct: 40 },
                { name: '函数递归', pct: 25 }, { name: '指针引用', pct: 10 },
              ].map(s => (
                <div key={s.name} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-300">{s.name}</span>
                    <span className="text-slate-500">{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all" style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-amber-400" />成就列表</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MOCK_ACHIEVEMENTS.map(a => (
                <div key={a.id} className={`rounded-lg p-4 ${a.unlocked ? 'bg-amber-500/10 border border-amber-400/20' : 'bg-slate-800/30 border border-slate-700/30'}`}>
                  <div className="flex items-center gap-3">
                    <span className={`text-2xl ${a.unlocked ? '' : 'grayscale opacity-40'}`}>{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">{a.name}</div>
                      <div className="text-xs text-slate-400">{a.desc}</div>
                      {!a.unlocked && (
                        <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400/50" style={{ width: `${(a.progress / a.total) * 100}%` }} />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs ${a.unlocked ? 'text-amber-400' : 'text-slate-500'}`}>
                      {a.unlocked ? '✅' : `${a.progress}/${a.total}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
