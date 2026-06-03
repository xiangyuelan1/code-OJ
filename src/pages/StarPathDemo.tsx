import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, MessageSquare, ChevronRight, ChevronDown, ChevronLeft,
  Globe, Flame, Trophy, Loader2,
  Building2, Users, Award, Zap,
  Gift, Heart, Star, Edit3, X,
  RotateCcw, Rocket, Crown, Target, Swords, TreePine,
  Lock, Unlock, Play, CheckCircle, Clock, Shield, Brain,
} from 'lucide-react';

/* ═══════════════════════════════════════
   Mock 数据 — 无需后端即可体验全部功能
   ═══════════════════════════════════════ */

const MOCK_REGIONS = [
  { id: 'r1', name: '变量星云', description: '编程的起点，掌握变量与数据类型', icon: '🌌', color: '#8b5cf6',
    planets: [
      { id: 'p1', name: '整数星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: 'int 类型的声明与运算' },
      { id: 'p2', name: '浮点星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: 'float/double 的精度世界' },
      { id: 'p3', name: '字符星', difficulty: 2, status: 'mastered' as const, reward: 15, desc: 'char 与 ASCII 码的奥秘' },
      { id: 'p4', name: '布尔星', difficulty: 1, status: 'explored' as const, reward: 10, desc: 'true/false 的逻辑基础' },
      { id: 'p5', name: '字符串星', difficulty: 2, status: 'explored' as const, reward: 15, desc: '字符串的拼接与操作' },
      { id: 'p6', name: '常量星', difficulty: 2, status: 'locked' as const, reward: 20, desc: 'const 与 #define 的抉择' },
      { id: 'p7', name: '类型转换星', difficulty: 3, status: 'locked' as const, reward: 25, desc: '隐式与显式类型转换' },
      { id: 'p8', name: '枚举星', difficulty: 3, status: 'locked' as const, reward: 25, desc: 'enum 的优雅用法' },
    ]},
  { id: 'r2', name: '循环星域', description: '在重复中寻找规律，for/while 的力量', icon: '🔄', color: '#06b6d4',
    planets: [
      { id: 'p9', name: 'for 星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: '经典 for 循环结构' },
      { id: 'p10', name: 'while 星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: '条件驱动的 while 循环' },
      { id: 'p11', name: 'do-while 星', difficulty: 2, status: 'explored' as const, reward: 15, desc: '先执行后判断' },
      { id: 'p12', name: '嵌套循环星', difficulty: 3, status: 'explored' as const, reward: 25, desc: '循环中的循环' },
      { id: 'p13', name: 'break 星', difficulty: 2, status: 'locked' as const, reward: 15, desc: '跳出循环的艺术' },
      { id: 'p14', name: 'continue 星', difficulty: 2, status: 'locked' as const, reward: 15, desc: '跳过本次迭代' },
      { id: 'p15', name: '无限循环星', difficulty: 3, status: 'locked' as const, reward: 25, desc: '何时需要死循环？' },
    ]},
  { id: 'r3', name: '条件星系', description: 'if/else 的抉择，逻辑分支的艺术', icon: '🔀', color: '#f59e0b',
    planets: [
      { id: 'p16', name: 'if 星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: '最基本的条件判断' },
      { id: 'p17', name: 'else 星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: '否则的分支' },
      { id: 'p18', name: 'else-if 星', difficulty: 2, status: 'mastered' as const, reward: 15, desc: '多重条件的选择' },
      { id: 'p19', name: 'switch 星', difficulty: 2, status: 'mastered' as const, reward: 15, desc: '多值匹配的利器' },
      { id: 'p20', name: '三元运算星', difficulty: 2, status: 'mastered' as const, reward: 15, desc: '简洁的条件表达式' },
      { id: 'p21', name: '逻辑运算星', difficulty: 3, status: 'explored' as const, reward: 25, desc: '&& || ! 的组合逻辑' },
    ]},
  { id: 'r4', name: '数组星团', description: '数据的集合，排序与查找的奥秘', icon: '📊', color: '#10b981',
    planets: [
      { id: 'p22', name: '一维数组星', difficulty: 1, status: 'mastered' as const, reward: 10, desc: '数组的声明与遍历' },
      { id: 'p23', name: '二维数组星', difficulty: 2, status: 'explored' as const, reward: 15, desc: '矩阵与表格数据' },
      { id: 'p24', name: '排序星', difficulty: 3, status: 'explored' as const, reward: 25, desc: '冒泡/选择/插入排序' },
      { id: 'p25', name: '查找星', difficulty: 2, status: 'locked' as const, reward: 20, desc: '线性查找与二分查找' },
      { id: 'p26', name: '字符串数组星', difficulty: 2, status: 'locked' as const, reward: 20, desc: '字符串数组的处理' },
      { id: 'p27', name: '动态数组星', difficulty: 3, status: 'locked' as const, reward: 30, desc: 'vector 的使用' },
      { id: 'p28', name: '栈星', difficulty: 3, status: 'locked' as const, reward: 30, desc: '后进先出的数据结构' },
      { id: 'p29', name: '队列星', difficulty: 3, status: 'locked' as const, reward: 30, desc: '先进先出的数据结构' },
      { id: 'p30', name: '链表星', difficulty: 4, status: 'locked' as const, reward: 40, desc: '指针串联的数据世界' },
    ]},
  { id: 'r5', name: '函数星球', description: '封装与复用，递归的魔法', icon: '⚡', color: '#ef4444',
    planets: [
      { id: 'p31', name: '函数定义星', difficulty: 1, status: 'explored' as const, reward: 10, desc: '函数的声明与定义' },
      { id: 'p32', name: '参数传递星', difficulty: 2, status: 'explored' as const, reward: 15, desc: '值传递与引用传递' },
      { id: 'p33', name: '返回值星', difficulty: 2, status: 'locked' as const, reward: 15, desc: '函数的输出' },
      { id: 'p34', name: '递归星', difficulty: 3, status: 'locked' as const, reward: 30, desc: '自己调用自己的魔法' },
      { id: 'p35', name: '重载星', difficulty: 3, status: 'locked' as const, reward: 25, desc: '同名函数的不同形态' },
      { id: 'p36', name: '模板星', difficulty: 4, status: 'locked' as const, reward: 40, desc: '泛型编程的起点' },
      { id: 'p37', name: 'Lambda 星', difficulty: 4, status: 'locked' as const, reward: 40, desc: '匿名函数的力量' },
      { id: 'p38', name: '回调星', difficulty: 4, status: 'locked' as const, reward: 40, desc: '函数作为参数传递' },
    ]},
  { id: 'r6', name: '指针深渊', description: '内存的真相，指针与引用的冒险', icon: '🕳️', color: '#6366f1',
    planets: [
      { id: 'p39', name: '指针基础星', difficulty: 3, status: 'explored' as const, reward: 25, desc: '什么是指针？' },
      { id: 'p40', name: '指针运算星', difficulty: 3, status: 'locked' as const, reward: 30, desc: '指针的加减与偏移' },
      { id: 'p41', name: '指针与数组星', difficulty: 3, status: 'locked' as const, reward: 30, desc: '数组名即指针' },
      { id: 'p42', name: '引用星', difficulty: 2, status: 'locked' as const, reward: 20, desc: '别名而非拷贝' },
      { id: 'p43', name: '动态内存星', difficulty: 4, status: 'locked' as const, reward: 40, desc: 'new/delete 的权力与责任' },
      { id: 'p44', name: '智能指针星', difficulty: 4, status: 'locked' as const, reward: 40, desc: '自动管理的指针' },
      { id: 'p45', name: '多级指针星', difficulty: 5, status: 'locked' as const, reward: 50, desc: '指向指针的指针' },
      { id: 'p46', name: '函数指针星', difficulty: 5, status: 'locked' as const, reward: 50, desc: '指向函数的指针' },
      { id: 'p47', name: 'const 指针星', difficulty: 3, status: 'locked' as const, reward: 30, desc: '不可变与不可改' },
      { id: 'p48', name: 'void 指针星', difficulty: 4, status: 'locked' as const, reward: 40, desc: '通用指针类型' },
    ]},
];

const MOCK_EVENTS = [
  { id: 'e1', name: '六一星际嘉年华', description: '儿童节限时双倍积分！完成任意星球挑战即享2x积分', bonusMultiplier: 2 },
  { id: 'e2', name: '新手冲刺赛', description: '首次通关3个星球额外奖励50积分', bonusMultiplier: 1.5 },
];

const MOCK_PET_TYPES: Record<string, { emoji: string; name: string; description: string; bonus: string }> = {
  star_cat: { emoji: '🐱', name: '星喵', description: '来自仙女座的可爱猫咪，喜欢在代码间穿行', bonus: '刷题积分+10%' },
  moon_bunny: { emoji: '🐰', name: '月兔', description: '月球上的精灵，擅长跳跃和递归', bonus: '递归题目积分+20%' },
  comet_fox: { emoji: '🦊', name: '彗星狐', description: '速度如彗星的聪明狐狸', bonus: '答题速度+15%' },
  nebula_owl: { emoji: '🦉', name: '星云鸮', description: '洞察力极强的智慧之鸟', bonus: '提示消耗-50%' },
  galaxy_dragon: { emoji: '🐉', name: '银河龙', description: '传说中的星际守护神', bonus: '全属性+5%' },
};

const MOCK_BUILDINGS: Record<string, { id: string; name: string; icon: string; maxLevel: number; desc: string; effects: string[]; costs: number[] }> = {
  b1: { id: 'b1', name: '知识灯塔', icon: '🗼', maxLevel: 5, desc: '提升学习效率', effects: ['经验+10%', '经验+20%', '经验+35%', '经验+50%', '经验+70%'], costs: [50, 120, 250, 500, 1000] },
  b2: { id: 'b2', name: '代码工坊', icon: '🔧', maxLevel: 5, desc: '解锁更多题目', effects: ['题目+3', '题目+8', '题目+15', '题目+25', '题目+40'], costs: [60, 150, 300, 600, 1200] },
  b3: { id: 'b3', name: '积分矿场', icon: '⛏️', maxLevel: 5, desc: '自动产出积分', effects: ['+5积分/天', '+12积分/天', '+25积分/天', '+50积分/天', '+100积分/天'], costs: [80, 200, 400, 800, 1600] },
  b4: { id: 'b4', name: '传送门', icon: '🌀', maxLevel: 3, desc: '快速跳转题目', effects: ['解锁快捷入口', '跨星域传送', '任意星球直达'], costs: [100, 300, 800] },
  b5: { id: 'b5', name: '星际图书馆', icon: '📚', maxLevel: 5, desc: '查看题解提示', effects: ['提示-20%积分', '提示-40%积分', '提示-60%积分', '提示-80%积分', '免费提示'], costs: [70, 180, 350, 700, 1500] },
};

const MOCK_ACHIEVEMENTS = [
  { id: 'a1', name: '初出茅庐', icon: '🌱', desc: '完成第一道题', unlocked: true, progress: 1, total: 1, reward: 20, claimed: false },
  { id: 'a2', name: '十题斩将', icon: '⚔️', desc: '完成10道题', unlocked: true, progress: 10, total: 10, reward: 50, claimed: false },
  { id: 'a3', name: '百题大师', icon: '👑', desc: '完成100道题', unlocked: false, progress: 37, total: 100, reward: 200, claimed: false },
  { id: 'a4', name: '连胜之星', icon: '🔥', desc: '连续7天刷题', unlocked: true, progress: 7, total: 7, reward: 80, claimed: true },
  { id: 'a5', name: '全知全能', icon: '🌟', desc: '精通所有星域', unlocked: false, progress: 1, total: 6, reward: 500, claimed: false },
  { id: 'a6', name: '社交蝴蝶', icon: '🦋', desc: '添加5位好友', unlocked: false, progress: 2, total: 5, reward: 100, claimed: false },
  { id: 'a7', name: '建筑大师', icon: '🏗️', desc: '所有建筑升到满级', unlocked: false, progress: 0, total: 5, reward: 300, claimed: false },
  { id: 'a8', name: '宠物达人', icon: '🐾', desc: '宠物达到10级', unlocked: false, progress: 3, total: 10, reward: 150, claimed: false },
];

const MOCK_FRIENDS = [
  { id: 'f1', name: '算法小王子', avatar: '🧙', level: 15, online: true, points: 2850 },
  { id: 'f2', name: '代码侠', avatar: '🦸', level: 12, online: true, points: 2340 },
  { id: 'f3', name: '递归大师', avatar: '🧑‍💻', level: 10, online: false, points: 1980 },
  { id: 'f4', name: '新手村长', avatar: '👨‍🌾', level: 5, online: true, points: 420 },
  { id: 'f5', name: 'Bug猎手', avatar: '🕵️', level: 8, online: false, points: 890 },
];

/* ═══════════════════════════════════════
   全局状态类型
   ═══════════════════════════════════════ */

interface GameState {
  points: number;
  totalExplored: number;
  totalMastered: number;
  streak: number;
  collectCount: number;
  userLevel: number;
  buildings: Record<string, number>; // buildingId -> level
  petLevel: number;
  petExp: number;
  petMood: number;
  petType: string;
  petName: string;
  achievements: Record<string, { unlocked: boolean; claimed: boolean }>;
  planetStatus: Record<string, 'locked' | 'explored' | 'mastered'>;
  mineAccumulated: number; // 矿场累积积分
}

const INITIAL_STATE: GameState = {
  points: 580,
  totalExplored: 21,
  totalMastered: 11,
  streak: 7,
  collectCount: 12,
  userLevel: 8,
  buildings: { b1: 2, b2: 1, b3: 3, b4: 1, b5: 2 },
  petLevel: 3,
  petExp: 45,
  petMood: 80,
  petType: 'star_cat',
  petName: '星喵',
  achievements: {
    a1: { unlocked: true, claimed: false },
    a2: { unlocked: true, claimed: false },
    a3: { unlocked: false, claimed: false },
    a4: { unlocked: true, claimed: true },
    a5: { unlocked: false, claimed: false },
    a6: { unlocked: false, claimed: false },
    a7: { unlocked: false, claimed: false },
    a8: { unlocked: false, claimed: false },
  },
  planetStatus: {}, // 从 MOCK_REGIONS 初始化
  mineAccumulated: 0,
};

// 从 MOCK_REGIONS 初始化星球状态
MOCK_REGIONS.forEach(r => {
  r.planets.forEach(p => {
    INITIAL_STATE.planetStatus[p.id] = p.status;
  });
});

/* ═══════════════════════════════════════
   难度标签
   ═══════════════════════════════════════ */

const DIFFICULTY_CONFIG: Record<number, { label: string; color: string; stars: number }> = {
  1: { label: '入门', color: 'text-green-400', stars: 1 },
  2: { label: '简单', color: 'text-cyan-400', stars: 2 },
  3: { label: '中等', color: 'text-amber-400', stars: 3 },
  4: { label: '困难', color: 'text-orange-400', stars: 4 },
  5: { label: '地狱', color: 'text-red-400', stars: 5 },
};

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

const STAR_STYLES: Record<string, { color: string; points: number }> = {
  common: { color: 'text-yellow-300', points: 1 },
  rare: { color: 'text-cyan-300', points: 3 },
  epic: { color: 'text-purple-300', points: 5 },
  legendary: { color: 'text-amber-400', points: 10 },
};

function FloatingStars({ onCollect }: { onCollect: (points: number) => void }) {
  const [stars, setStars] = useState<FloatingStar[]>([]);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [popups, setPopups] = useState<Array<{ id: number; x: number; y: number; text: string }>>([]);

  useEffect(() => {
    const timer = setInterval(() => {
      setStars(prev => {
        const active = prev.filter(s => !collected.has(s.id));
        if (active.length >= 5) return prev;
        const rand = Math.random();
        const type: FloatingStar['type'] = rand < 0.5 ? 'common' : rand < 0.8 ? 'rare' : rand < 0.95 ? 'epic' : 'legendary';
        return [...prev.slice(-20), {
          id: Date.now() + Math.random(),
          x: 10 + Math.random() * 80, y: 10 + Math.random() * 80, type,
          size: type === 'legendary' ? 28 : type === 'epic' ? 22 : type === 'rare' ? 18 : 14,
          wobble: Math.random() * 4 + 2,
        }];
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [collected.size]);

  const handleCollect = (star: FloatingStar) => {
    if (collected.has(star.id)) return;
    setCollected(prev => new Set([...prev, star.id]));
    const pts = STAR_STYLES[star.type].points;
    setPopups(prev => [...prev, { id: star.id, x: star.x, y: star.y, text: `+${pts}` }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== star.id)), 1000);
    onCollect(pts);
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
   浮动提示组件
   ═══════════════════════════════════════ */

function FloatMessage({ message, type = 'success' }: { message: string; type?: 'success' | 'error' | 'info' }) {
  const colors = { success: 'text-green-400', error: 'text-red-400', info: 'text-cyan-400' };
  return (
    <div className={`text-center text-sm font-medium ${colors[type]} animate-pulse mt-2`}>
      {message}
    </div>
  );
}

/* ═══════════════════════════════════════
   每日宝箱
   ═══════════════════════════════════════ */

function DailyChestDemo({ points, onReward }: { points: number; onReward: (pts: number) => void }) {
  const [opened, setOpened] = useState(false);
  const [wonPoints, setWonPoints] = useState(0);
  const [streak, setStreak] = useState(3);
  const [shake, setShake] = useState(false);
  const [opening, setOpening] = useState(false);

  const handleOpen = () => {
    if (opened || opening) return;
    setOpening(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(() => {
      // 连续天数越高奖励越多
      const base = Math.floor(Math.random() * 31) + 10;
      const bonus = Math.floor(base * streak * 0.1);
      const won = base + bonus;
      setWonPoints(won);
      setOpened(true);
      setStreak(s => s + 1);
      setOpening(false);
      onReward(won);
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
        <div className="text-center py-4">
          <div className="text-4xl mb-2 animate-bounce">🎉</div>
          <div className="text-2xl font-bold text-amber-400">+{wonPoints}积分</div>
          <p className="text-xs text-slate-400 mt-1">连续{streak}天加成已生效！明天再来</p>
        </div>
      ) : (
        <button onClick={handleOpen} disabled={opening}
          className={`w-full py-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 hover:border-amber-400/50 transition-all ${shake ? 'animate-shake' : ''}`}
        >
          <div className={`text-4xl mb-1 transition-transform ${opening ? 'scale-125' : 'hover:scale-110'}`}>🎁</div>
          <p className="text-sm text-amber-300 font-medium">{opening ? '开启中...' : '点击开箱！'}</p>
          <p className="text-[10px] text-slate-500 mt-1">连续天数越多奖励越高</p>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   太空伙伴
   ═══════════════════════════════════════ */

function SpacePetDemo({ state, onSpendPoints, onUpdateState }: {
  state: GameState;
  onSpendPoints: (cost: number) => boolean;
  onUpdateState: (partial: Partial<GameState>) => void;
}) {
  const [feeding, setFeeding] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [bounce, setBounce] = useState(false);
  const [feedMsg, setFeedMsg] = useState('');
  const [playing, setPlaying] = useState(false);

  const petInfo = MOCK_PET_TYPES[state.petType];
  const moodEmoji = state.petMood >= 80 ? '😊' : state.petMood >= 50 ? '😐' : '😟';
  const levelTitle = state.petLevel <= 2 ? '幼年' : state.petLevel <= 4 ? '成长' : state.petLevel <= 7 ? '精英' : '传奇';
  const expToNext = state.petLevel * 50;

  const handleFeed = () => {
    if (feeding) return;
    if (!onSpendPoints(10)) {
      setFeedMsg('积分不足！');
      setTimeout(() => setFeedMsg(''), 1500);
      return;
    }
    setFeeding(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    const newMood = Math.min(100, state.petMood + 20);
    const newExp = state.petExp + 15;
    if (newExp >= expToNext) {
      onUpdateState({ petMood: newMood, petExp: newExp - expToNext, petLevel: state.petLevel + 1 });
      setFeedMsg(`🎉 升级到 Lv.${state.petLevel + 1}！`);
    } else {
      onUpdateState({ petMood: newMood, petExp: newExp });
      setFeedMsg('心情 +20，经验 +15');
    }
    setTimeout(() => setFeedMsg(''), 2000);
    setFeeding(false);
  };

  const handlePlay = () => {
    if (playing) return;
    setPlaying(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 600);
    const newMood = Math.min(100, state.petMood + 10);
    const newExp = state.petExp + 25;
    if (newExp >= expToNext) {
      onUpdateState({ petMood: newMood, petExp: newExp - expToNext, petLevel: state.petLevel + 1 });
      setFeedMsg(`🎮 玩耍后升级到 Lv.${state.petLevel + 1}！`);
    } else {
      onUpdateState({ petMood: newMood, petExp: newExp });
      setFeedMsg('🎮 心情 +10，经验 +25');
    }
    setTimeout(() => setFeedMsg(''), 2000);
    setTimeout(() => setPlaying(false), 800);
  };

  const handleChangeType = (type: string) => {
    onUpdateState({ petType: type, petName: MOCK_PET_TYPES[type].name });
    setShowTypes(false);
  };

  return (
    <div className="glass-card rounded-2xl p-5 border-violet-400/20">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-5 w-5 text-pink-400" />
        <h3 className="text-base font-semibold text-white">太空伙伴</h3>
        <span className="ml-auto text-xs text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-full">Lv.{state.petLevel} {levelTitle}</span>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => { setBounce(true); setTimeout(() => setBounce(false), 400); }}
          className={`text-5xl transition-transform hover:scale-110 ${bounce ? 'animate-bounce' : ''}`}
        >{petInfo.emoji}</button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{state.petName}</span>
            <button onClick={() => { setShowRename(!showRename); setRenameValue(state.petName); }} className="text-slate-500 hover:text-violet-400"><Edit3 className="h-3 w-3" /></button>
            <span className="text-xs text-slate-400">{moodEmoji}</span>
          </div>
          <p className="text-xs text-slate-400 mb-1">{petInfo.description}</p>
          <p className="text-[10px] text-violet-400 mb-2">✨ {petInfo.bonus}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-8">心情</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${state.petMood >= 80 ? 'bg-green-400' : state.petMood >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`} style={{ width: `${state.petMood}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{state.petMood}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-8">经验</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${Math.round((state.petExp / expToNext) * 100)}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{state.petExp}/{expToNext}</span>
            </div>
          </div>
        </div>
      </div>
      {showRename && (
        <div className="flex gap-2 mb-3">
          <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" maxLength={20} />
          <button onClick={() => { onUpdateState({ petName: renameValue }); setShowRename(false); }} className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-sm">确定</button>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={handleFeed} disabled={feeding} className="flex-1 py-2 rounded-lg bg-pink-500/15 text-pink-300 text-sm hover:bg-pink-500/25 transition-colors disabled:opacity-50">
          🍖 喂食 (10积分)
        </button>
        <button onClick={handlePlay} disabled={playing} className="flex-1 py-2 rounded-lg bg-cyan-500/15 text-cyan-300 text-sm hover:bg-cyan-500/25 transition-colors disabled:opacity-50">
          🎮 玩耍 (免费)
        </button>
        <button onClick={() => setShowTypes(!showTypes)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">🔄</button>
      </div>
      {feedMsg && <FloatMessage message={feedMsg} />}
      {showTypes && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Object.entries(MOCK_PET_TYPES).map(([key, info]) => (
            <button key={key} onClick={() => handleChangeType(key)}
              className={`p-2 rounded-lg text-center transition-all ${state.petType === key ? 'bg-violet-500/20 border border-violet-400/40' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'}`}
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
   星域详情面板（点击星域后展开）
   ═══════════════════════════════════════ */

function RegionDetail({ region, state, onBack, onExplore, onChallenge }: {
  region: typeof MOCK_REGIONS[0];
  state: GameState;
  onBack: () => void;
  onExplore: (planetId: string) => void;
  onChallenge: (planetId: string) => void;
}) {
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const [challengeResult, setChallengeResult] = useState<{ planetId: string; success: boolean; points: number } | null>(null);

  const explored = region.planets.filter(p => state.planetStatus[p.id] === 'explored' || state.planetStatus[p.id] === 'mastered').length;
  const mastered = region.planets.filter(p => state.planetStatus[p.id] === 'mastered').length;

  const handleChallenge = (planetId: string, reward: number) => {
    setChallengingId(planetId);
    // 模拟挑战过程
    setTimeout(() => {
      const success = Math.random() > 0.3; // 70% 成功率
      setChallengeResult({ planetId, success, points: success ? reward : 0 });
      if (success) {
        onChallenge(planetId);
      }
      setChallengingId(null);
      setTimeout(() => setChallengeResult(null), 2000);
    }, 1500);
  };

  return (
    <div className="relative z-10">
      {/* 返回按钮和标题 */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white mb-4 transition-colors">
        <ChevronLeft className="h-5 w-5" />
        <span className="text-sm">返回星图</span>
      </button>

      <div className="glass-card rounded-2xl p-6 mb-6" style={{ borderLeft: `4px solid ${region.color}` }}>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-xl flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${region.color}33, ${region.color}1A)`, border: `1px solid ${region.color}4D` }}>
            {region.icon}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{region.name}</h2>
            <p className="text-sm text-slate-400">{region.description}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-sm text-slate-400">探索 <span className="text-white font-semibold">{explored}</span>/{region.planets.length}</div>
            <div className="text-sm text-slate-400">精通 <span className="text-amber-400 font-semibold">{mastered}</span>/{region.planets.length}</div>
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-slate-500">探索进度</span>
              <span className="text-slate-400">{Math.round((explored / region.planets.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${(explored / region.planets.length) * 100}%`, background: `linear-gradient(to right, ${region.color}, ${region.color}99)` }} />
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-amber-500">精通进度</span>
              <span className="text-amber-400">{Math.round((mastered / region.planets.length) * 100)}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${(mastered / region.planets.length) * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* 星球列表 */}
      <div className="space-y-3">
        {region.planets.map((planet) => {
          const status = state.planetStatus[planet.id] || 'locked';
          const diff = DIFFICULTY_CONFIG[planet.difficulty] || DIFFICULTY_CONFIG[1];
          const isChallenging = challengingId === planet.id;
          const result = challengeResult?.planetId === planet.id ? challengeResult : null;

          return (
            <div key={planet.id}
              className={`glass-card rounded-xl p-4 transition-all ${status === 'locked' ? 'opacity-60' : 'hover:shadow-lg'}`}
              style={{ borderLeft: `3px solid ${status === 'mastered' ? '#fbbf24' : status === 'explored' ? region.color : '#475569'}` }}
            >
              <div className="flex items-center gap-4">
                {/* 状态图标 */}
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg shrink-0"
                  style={{ background: status === 'mastered' ? 'rgba(251,191,36,0.15)' : status === 'explored' ? 'rgba(139,92,246,0.15)' : 'rgba(71,85,105,0.3)' }}>
                  {status === 'mastered' ? '⭐' : status === 'explored' ? '🌙' : '🔒'}
                </div>

                {/* 星球信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{planet.name}</span>
                    <span className={`text-[10px] ${diff.color}`}>
                      {'★'.repeat(diff.stars)} {diff.label}
                    </span>
                    {status === 'mastered' && <span className="text-[10px] text-amber-400 bg-amber-500/15 px-1.5 py-0.5 rounded">已精通</span>}
                  </div>
                  <p className="text-xs text-slate-400">{planet.desc}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] text-amber-400">奖励: {planet.reward}积分</span>
                    {status !== 'locked' && <span className="text-[10px] text-slate-500">|</span>}
                    {status === 'explored' && <span className="text-[10px] text-violet-400">挑战精通可获得额外积分</span>}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="shrink-0">
                  {status === 'locked' ? (
                    <button onClick={() => onExplore(planet.id)}
                      className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-400 text-xs hover:bg-slate-700 hover:text-white transition-colors flex items-center gap-1.5">
                      <Unlock className="h-3.5 w-3.5" />探索
                    </button>
                  ) : status === 'explored' ? (
                    <button onClick={() => handleChallenge(planet.id, planet.reward)}
                      disabled={isChallenging}
                      className="px-4 py-2 rounded-lg bg-violet-500/20 text-violet-300 text-xs hover:bg-violet-500/30 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                      {isChallenging ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Swords className="h-3.5 w-3.5" />}
                      {isChallenging ? '挑战中...' : '挑战精通'}
                    </button>
                  ) : (
                    <span className="px-4 py-2 text-xs text-amber-400 flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />已精通
                    </span>
                  )}
                </div>
              </div>

              {/* 挑战结果提示 */}
              {result && (
                <div className={`mt-2 text-center text-sm font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.success ? `🎉 挑战成功！获得 ${result.points} 积分` : '💔 挑战失败，再试一次吧！'}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   星域卡片（可点击展开）
   ═══════════════════════════════════════ */

function RegionCard({ region, state, onClick }: {
  region: typeof MOCK_REGIONS[0];
  state: GameState;
  onClick: () => void;
}) {
  const explored = region.planets.filter(p => state.planetStatus[p.id] === 'explored' || state.planetStatus[p.id] === 'mastered').length;
  const mastered = region.planets.filter(p => state.planetStatus[p.id] === 'mastered').length;
  const total = region.planets.length;
  const progress = total > 0 ? Math.round((explored / total) * 100) : 0;
  const masteredPct = total > 0 ? Math.round((mastered / total) * 100) : 0;

  return (
    <button onClick={onClick}
      className="glass-card glass-card-hover rounded-2xl p-6 transition-all duration-300 hover:shadow-lg text-left w-full group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
          style={{ background: `linear-gradient(135deg, ${region.color}33, ${region.color}1A)`, border: `1px solid ${region.color}4D` }}>
          {region.icon}
        </div>
        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-slate-400 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1">{region.name}</h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{region.description}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">探索进度</span>
          <span className="text-slate-400">{explored}/{total}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(to right, ${region.color}, ${region.color}99)` }} />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-500">精通</span>
          <span className="text-amber-400">{mastered}/{total}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-amber-400 transition-all duration-700" style={{ width: `${masteredPct}%` }} />
        </div>
      </div>
      <div className="mt-3 text-[10px] text-slate-500 group-hover:text-violet-400 transition-colors">
        点击查看 {total} 颗星球 →
      </div>
    </button>
  );
}

/* ═══════════════════════════════════════
   建筑卡片（可升级）
   ═══════════════════════════════════════ */

function BuildingCard({ buildingId, state, onUpgrade }: {
  buildingId: string;
  state: GameState;
  onUpgrade: (buildingId: string) => void;
}) {
  const b = MOCK_BUILDINGS[buildingId];
  const level = state.buildings[buildingId] || 0;
  const isMax = level >= b.maxLevel;
  const cost = isMax ? 0 : b.costs[level];
  const canAfford = state.points >= cost;
  const currentEffect = level > 0 ? b.effects[level - 1] : '未建造';
  const nextEffect = !isMax ? b.effects[level] : null;
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState('');

  const handleUpgrade = () => {
    if (upgrading || isMax || !canAfford) return;
    setUpgrading(true);
    setTimeout(() => {
      onUpgrade(buildingId);
      setUpgrading(false);
      setUpgradeMsg(`✅ ${b.name}升级到 Lv.${level + 1}！`);
      setTimeout(() => setUpgradeMsg(''), 2000);
    }, 800);
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="text-3xl">{b.icon}</div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-white">{b.name}</h3>
          <p className="text-xs text-slate-400">{b.desc}</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white">Lv.{level}</div>
          <div className="text-[10px] text-slate-500">/{b.maxLevel}</div>
        </div>
      </div>

      {/* 当前效果 */}
      <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs text-slate-400">当前效果</span>
        </div>
        <div className="text-sm text-cyan-300 font-medium">{currentEffect}</div>
      </div>

      {/* 下一级预览 */}
      {nextEffect && (
        <div className="bg-violet-500/5 border border-violet-400/10 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Rocket className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs text-slate-400">升级到 Lv.{level + 1}</span>
          </div>
          <div className="text-sm text-violet-300 font-medium">{nextEffect}</div>
        </div>
      )}

      {/* 等级进度 */}
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 transition-all duration-500" style={{ width: `${(level / b.maxLevel) * 100}%` }} />
      </div>

      {/* 升级按钮 */}
      <button onClick={handleUpgrade}
        disabled={isMax || !canAfford || upgrading}
        className={`w-full py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 flex items-center justify-center gap-2
          ${isMax ? 'bg-amber-500/15 text-amber-300' : canAfford ? 'bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30' : 'bg-slate-800/50 text-slate-500'}`}
      >
        {upgrading ? <><Loader2 className="h-4 w-4 animate-spin" />升级中...</>
          : isMax ? '✅ 已满级'
          : canAfford ? `⬆️ 升级 (${cost}积分)`
          : `🔒 积分不足 (需${cost})`}
      </button>

      {upgradeMsg && <FloatMessage message={upgradeMsg} />}
    </div>
  );
}

/* ═══════════════════════════════════════
   1v1 对战模拟
   ═══════════════════════════════════════ */

function BattleModal({ opponent, onWin, onLose, onClose }: {
  opponent: typeof MOCK_FRIENDS[0];
  onWin: (points: number) => void;
  onLose: () => void;
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<'ready' | 'coding' | 'result'>('ready');
  const [progress, setProgress] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [oppScore, setOppScore] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startBattle = () => {
    setPhase('coding');
    setProgress(0);
    setMyScore(0);
    setOppScore(0);

    timerRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + 2 + Math.random() * 3;
        if (next >= 100) {
          if (timerRef.current) clearInterval(timerRef.current);
          setTimeout(() => {
            const my = Math.floor(Math.random() * 40) + 60;
            const opp = Math.floor(Math.random() * 40) + 50;
            setMyScore(my);
            setOppScore(opp);
            setPhase('result');
            if (my >= opp) {
              onWin(Math.floor(Math.random() * 30) + 20);
            } else {
              onLose();
            }
          }, 500);
          return 100;
        }
        // 随机加分
        if (Math.random() > 0.6) setMyScore(s => s + Math.floor(Math.random() * 5) + 1);
        if (Math.random() > 0.5) setOppScore(s => s + Math.floor(Math.random() * 5) + 1);
        return next;
      });
    }, 200);
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        {phase === 'ready' && (
          <>
            <div className="text-center mb-6">
              <div className="text-5xl mb-3">⚔️</div>
              <h3 className="text-xl font-bold text-white mb-1">1v1 编程对决</h3>
              <p className="text-sm text-slate-400">与 {opponent.name} 进行实时编程比拼</p>
            </div>
            <div className="flex items-center justify-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-4xl mb-1">🧑‍💻</div>
                <div className="text-sm text-white font-medium">你</div>
                <div className="text-xs text-violet-400">Lv.8</div>
              </div>
              <div className="text-2xl text-amber-400 font-bold">VS</div>
              <div className="text-center">
                <div className="text-4xl mb-1">{opponent.avatar}</div>
                <div className="text-sm text-white font-medium">{opponent.name}</div>
                <div className="text-xs text-cyan-400">Lv.{opponent.level}</div>
              </div>
            </div>
            <button onClick={startBattle}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold text-lg hover:opacity-90 transition-opacity">
              🚀 开始对决
            </button>
          </>
        )}

        {phase === 'coding' && (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <div className="text-2xl mb-1">🧑‍💻</div>
                <div className="text-lg font-bold text-white">{myScore}</div>
              </div>
              <div className="flex-1 mx-4">
                <div className="text-center text-xs text-slate-400 mb-2">对决进行中...</div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl mb-1">{opponent.avatar}</div>
                <div className="text-lg font-bold text-white">{oppScore}</div>
              </div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-xs text-green-400 h-32 overflow-hidden">
              <p className="text-slate-500">// 正在编写代码...</p>
              <p>#include &lt;iostream&gt;</p>
              <p>using namespace std;</p>
              <p>&nbsp;</p>
              <p>int main() {'{'}</p>
              <p>&nbsp;&nbsp;int n; cin &gt;&gt; n;</p>
              <p className="animate-pulse">▌</p>
            </div>
          </>
        )}

        {phase === 'result' && (
          <>
            <div className="text-center mb-4">
              <div className="text-5xl mb-3">{myScore >= oppScore ? '🏆' : '😤'}</div>
              <h3 className="text-xl font-bold text-white">{myScore >= oppScore ? '胜利！' : '惜败！'}</h3>
            </div>
            <div className="flex items-center justify-center gap-8 mb-4">
              <div className="text-center">
                <div className="text-sm text-slate-400">你的得分</div>
                <div className={`text-2xl font-bold ${myScore >= oppScore ? 'text-green-400' : 'text-red-400'}`}>{myScore}</div>
              </div>
              <div className="text-slate-600">|</div>
              <div className="text-center">
                <div className="text-sm text-slate-400">{opponent.name}</div>
                <div className={`text-2xl font-bold ${oppScore > myScore ? 'text-green-400' : 'text-red-400'}`}>{oppScore}</div>
              </div>
            </div>
            {myScore >= oppScore && (
              <div className="text-center text-amber-400 text-sm mb-4">🎉 获得 20~50 积分奖励！</div>
            )}
            <button onClick={onClose}
              className="w-full py-2.5 rounded-lg bg-slate-700/50 text-white text-sm hover:bg-slate-700 transition-colors">
              关闭
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   主页面
   ═══════════════════════════════════════ */

export function StarPathDemoPage() {
  const [state, setState] = useState<GameState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'map' | 'building' | 'social' | 'achievement'>('map');
  const [selectedRegion, setSelectedRegion] = useState<typeof MOCK_REGIONS[0] | null>(null);
  const [battleOpponent, setBattleOpponent] = useState<typeof MOCK_FRIENDS[0] | null>(null);
  const [globalMsg, setGlobalMsg] = useState('');

  // 更新状态的辅助函数
  const updateState = useCallback((partial: Partial<GameState>) => {
    setState(prev => ({ ...prev, ...partial }));
  }, []);

  // 增加积分
  const addPoints = useCallback((pts: number) => {
    setState(prev => ({ ...prev, points: prev.points + pts }));
  }, []);

  // 消耗积分（返回是否成功）
  const spendPoints = useCallback((cost: number): boolean => {
    if (state.points < cost) return false;
    setState(prev => ({ ...prev, points: prev.points - cost }));
    return true;
  }, [state.points]);

  // 显示全局消息
  const showMsg = useCallback((msg: string) => {
    setGlobalMsg(msg);
    setTimeout(() => setGlobalMsg(''), 2500);
  }, []);

  // 收集星星
  const handleCollectStar = useCallback((pts: number) => {
    setState(prev => ({
      ...prev,
      points: prev.points + pts,
      collectCount: prev.collectCount + 1,
    }));
  }, []);

  // 探索星球
  const handleExplore = useCallback((planetId: string) => {
    setState(prev => {
      const newStatus = { ...prev.planetStatus, [planetId]: 'explored' as const };
      const newExplored = Object.values(newStatus).filter(s => s === 'explored' || s === 'mastered').length;
      return { ...prev, planetStatus: newStatus, totalExplored: newExplored };
    });
    showMsg('🌍 新星球已探索！');
  }, [showMsg]);

  // 挑战精通
  const handleChallenge = useCallback((planetId: string) => {
    setState(prev => {
      // 找到对应星球获取奖励
      let reward = 15;
      for (const r of MOCK_REGIONS) {
        const p = r.planets.find(pp => pp.id === planetId);
        if (p) { reward = p.reward; break; }
      }
      const newStatus = { ...prev.planetStatus, [planetId]: 'mastered' as const };
      const newExplored = Object.values(newStatus).filter(s => s === 'explored' || s === 'mastered').length;
      const newMastered = Object.values(newStatus).filter(s => s === 'mastered').length;
      return { ...prev, planetStatus: newStatus, totalExplored: newExplored, totalMastered: newMastered, points: prev.points + reward };
    });
  }, []);

  // 建筑升级
  const handleBuildingUpgrade = useCallback((buildingId: string) => {
    setState(prev => {
      const b = MOCK_BUILDINGS[buildingId];
      const level = prev.buildings[buildingId] || 0;
      if (level >= b.maxLevel) return prev;
      const cost = b.costs[level];
      if (prev.points < cost) return prev;
      return { ...prev, buildings: { ...prev.buildings, [buildingId]: level + 1 }, points: prev.points - cost };
    });
  }, []);

  // 领取成就奖励
  const handleClaimAchievement = useCallback((achievementId: string, reward: number) => {
    setState(prev => ({
      ...prev,
      achievements: { ...prev.achievements, [achievementId]: { ...prev.achievements[achievementId], claimed: true } },
      points: prev.points + reward,
    }));
    showMsg(`🎁 领取成就奖励 +${reward}积分！`);
  }, [showMsg]);

  // 对战胜利
  const handleBattleWin = useCallback((pts: number) => {
    addPoints(pts);
    showMsg(`🏆 对战胜利！+${pts}积分`);
  }, [addPoints, showMsg]);

  // 对战失败
  const handleBattleLose = useCallback(() => {
    showMsg('😤 惜败！下次再战');
  }, [showMsg]);

  // 矿场自动收益（每30秒模拟一天）
  useEffect(() => {
    const timer = setInterval(() => {
      setState(prev => {
        const mineLevel = prev.buildings['b3'] || 0;
        if (mineLevel === 0) return prev;
        const incomes = [0, 5, 12, 25, 50, 100];
        const income = incomes[mineLevel] || 0;
        return { ...prev, mineAccumulated: prev.mineAccumulated + income, points: prev.points + income };
      });
    }, 30000);
    return () => clearInterval(timer);
  }, []);

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
        @keyframes slideUp { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
        .animate-shake { animation: shake 0.5s ease-in-out; }
        .animate-slideUp { animation: slideUp 0.3s ease-out; }
      `}</style>

      {/* 全局消息提示 */}
      {globalMsg && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-xl bg-violet-500/90 text-white text-sm font-medium shadow-lg animate-slideUp">
          {globalMsg}
        </div>
      )}

      {/* 对战弹窗 */}
      {battleOpponent && (
        <BattleModal
          opponent={battleOpponent}
          onWin={handleBattleWin}
          onLose={handleBattleLose}
          onClose={() => setBattleOpponent(null)}
        />
      )}

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
          <div className="flex items-center gap-3">
            {/* 积分显示 */}
            <div className="glass-card rounded-xl px-4 py-2 flex items-center gap-2">
              <span className="text-amber-400 text-lg">💎</span>
              <span className="text-lg font-bold text-amber-400">{state.points}</span>
              <span className="text-xs text-slate-500">积分</span>
            </div>
            <Link to="/starpath" className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-300 hover:text-white hover:bg-slate-700 transition-all">
              <RotateCcw className="h-4 w-4" />
              <span className="text-sm hidden md:inline">返回正式版</span>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Globe className="h-4 w-4 text-cyan-400" /><span className="text-xs text-slate-400">已探索</span></div>
            <div className="text-xl font-bold text-white">{state.totalExplored}<span className="text-sm text-slate-500 font-normal">/48</span></div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Trophy className="h-4 w-4 text-amber-400" /><span className="text-xs text-slate-400">已精通</span></div>
            <div className="text-xl font-bold text-amber-400">{state.totalMastered}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Flame className="h-4 w-4 text-rose-400" /><span className="text-xs text-slate-400">连续天数</span></div>
            <div className="text-xl font-bold text-rose-400">{state.streak}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Star className="h-4 w-4 text-yellow-400" /><span className="text-xs text-slate-400">收集星星</span></div>
            <div className="text-xl font-bold text-yellow-400">{state.collectCount}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center col-span-2 md:col-span-1">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Crown className="h-4 w-4 text-violet-400" /><span className="text-xs text-slate-400">等级</span></div>
            <div className="text-xl font-bold text-violet-400">Lv.{state.userLevel}</div>
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
      <div className="relative z-10 flex gap-2 mb-6 overflow-x-auto">
        {[
          { key: 'map', label: '星际地图', icon: Globe },
          { key: 'building', label: '星球建设', icon: Building2 },
          { key: 'social', label: '星际社交', icon: Users },
          { key: 'achievement', label: '成就中心', icon: Award },
        ].map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key as typeof activeTab); setSelectedRegion(null); }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${activeTab === tab.key ? 'bg-violet-500/20 text-violet-300 border border-violet-400/30' : 'bg-slate-800/50 text-slate-400 border border-transparent hover:text-white'}`}
          >
            <tab.icon className="h-4 w-4" />{tab.label}
          </button>
        ))}
      </div>

      {/* ══════ 星际地图 Tab ══════ */}
      {activeTab === 'map' && (
        selectedRegion ? (
          <RegionDetail
            region={selectedRegion}
            state={state}
            onBack={() => setSelectedRegion(null)}
            onExplore={handleExplore}
            onChallenge={handleChallenge}
          />
        ) : (
          <>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
              <DailyChestDemo points={state.points} onReward={addPoints} />
              <SpacePetDemo state={state} onSpendPoints={(cost) => { if (state.points >= cost) { spendPoints(cost); return true; } return false; }} onUpdateState={updateState} />
            </div>
            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {MOCK_REGIONS.map((region) => (
                <RegionCard key={region.id} region={region} state={state} onClick={() => setSelectedRegion(region)} />
              ))}
            </div>
          </>
        )
      )}

      {/* ══════ 星球建设 Tab ══════ */}
      {activeTab === 'building' && (
        <>
          {/* 矿场收益提示 */}
          {state.buildings['b3'] > 0 && (
            <div className="relative z-10 mb-4 glass-card rounded-xl p-3 border-l-4 border-amber-400/40">
              <div className="flex items-center gap-2">
                <span className="text-lg">⛏️</span>
                <span className="text-sm text-amber-300">积分矿场正在运转中，每30秒自动产出积分</span>
                {state.mineAccumulated > 0 && <span className="text-xs text-slate-400 ml-auto">已累计产出: {state.mineAccumulated}</span>}
              </div>
            </div>
          )}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {Object.keys(MOCK_BUILDINGS).map(bId => (
              <BuildingCard key={bId} buildingId={bId} state={state} onUpgrade={handleBuildingUpgrade} />
            ))}
          </div>
        </>
      )}

      {/* ══════ 星际社交 Tab ══════ */}
      {activeTab === 'social' && (
        <div className="relative z-10 space-y-5">
          {/* 好友列表 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Users className="h-5 w-5 text-cyan-400" />好友列表</h3>
            <div className="space-y-2">
              {MOCK_FRIENDS.map(f => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 transition-colors">
                  <div className="relative">
                    <div className="text-2xl">{f.avatar}</div>
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-slate-900 ${f.online ? 'bg-green-400' : 'bg-slate-600'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white">{f.name}</div>
                    <div className="text-xs text-slate-400">Lv.{f.level} · {f.points}积分</div>
                  </div>
                  {f.online && (
                    <button onClick={() => setBattleOpponent(f)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 text-rose-300 text-xs hover:bg-rose-500/25 transition-colors flex items-center gap-1">
                      <Swords className="h-3 w-3" />挑战
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 排行榜 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Crown className="h-5 w-5 text-amber-400" />排行榜</h3>
            <div className="space-y-2">
              {[
                { rank: 1, name: '算法小王子', points: 2850, medal: '🥇' },
                { rank: 2, name: '代码侠', points: 2340, medal: '🥈' },
                { rank: 3, name: '递归大师', points: 1980, medal: '🥉' },
                { rank: 4, name: '你', points: state.points, medal: '' },
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

          {/* 团队挑战 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Shield className="h-5 w-5 text-rose-400" />团队挑战</h3>
            <div className="text-center py-8">
              <div className="text-4xl mb-3">⚔️</div>
              <p className="text-slate-400 text-sm mb-4">组队挑战更高难度的星球，获得双倍奖励</p>
              <button onClick={() => showMsg('🚀 正在匹配队友...')}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-medium">发起挑战</button>
            </div>
          </div>
        </div>
      )}

      {/* ══════ 成就中心 Tab ══════ */}
      {activeTab === 'achievement' && (
        <div className="relative z-10 space-y-5">
          {/* 技能雷达 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Target className="h-5 w-5 text-cyan-400" />技能雷达</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: '基础语法', pct: 85, icon: '📝' },
                { name: '循环结构', pct: 70, icon: '🔄' },
                { name: '条件判断', pct: 95, icon: '🔀' },
                { name: '数组操作', pct: 40, icon: '📊' },
                { name: '函数递归', pct: 25, icon: '⚡' },
                { name: '指针引用', pct: 10, icon: '🕳️' },
              ].map(s => (
                <div key={s.name} className="bg-slate-800/50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-sm">{s.icon}</span>
                    <span className="text-xs text-slate-300 flex-1">{s.name}</span>
                    <span className={`text-xs font-medium ${s.pct >= 80 ? 'text-green-400' : s.pct >= 50 ? 'text-amber-400' : 'text-slate-500'}`}>{s.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${s.pct >= 80 ? 'bg-green-400' : s.pct >= 50 ? 'bg-amber-400' : 'bg-violet-400'}`} style={{ width: `${s.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 成就列表 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Award className="h-5 w-5 text-amber-400" />成就列表</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MOCK_ACHIEVEMENTS.map(a => {
                const achState = state.achievements[a.id];
                const isUnlocked = achState?.unlocked ?? a.unlocked;
                const isClaimed = achState?.claimed ?? a.claimed;

                return (
                  <div key={a.id} className={`rounded-lg p-4 transition-all ${isUnlocked ? 'bg-amber-500/10 border border-amber-400/20' : 'bg-slate-800/30 border border-slate-700/30'}`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-2xl ${isUnlocked ? '' : 'grayscale opacity-40'}`}>{a.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white">{a.name}</div>
                        <div className="text-xs text-slate-400">{a.desc}</div>
                        {!isUnlocked && (
                          <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-amber-400/50" style={{ width: `${(a.progress / a.total) * 100}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        {isUnlocked && !isClaimed ? (
                          <button onClick={() => handleClaimAchievement(a.id, a.reward)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 text-xs hover:bg-amber-500/30 transition-colors animate-pulse">
                            🎁 领取 +{a.reward}
                          </button>
                        ) : isClaimed ? (
                          <span className="text-xs text-green-400">✅ 已领取</span>
                        ) : (
                          <span className="text-xs text-slate-500">{a.progress}/{a.total}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
