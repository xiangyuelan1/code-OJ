import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, Briefcase, Bug, ArrowRight, Loader2,
  Brain, Code, Trophy, Zap, Target, Lightbulb,
  Shuffle, Clock, Star, ChevronRight, Play,
} from 'lucide-react';
import { starpathAPI, starpathAchievementAPI, submissionsAPI } from '../services/api';

function TwinklingStars({ count = 60 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 2 + 1, delay: Math.random() * 5, duration: Math.random() * 3 + 2 });
    }
    return result;
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div key={star.id} className="absolute rounded-full bg-white" style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }} />
      ))}
    </div>
  );
}

/* ── 快速代码挑战：随机生成一个简单的代码片段让用户预测输出 ── */
const CODE_QUIZZES = [
  { code: 'print([1,2,3][1:])', options: ['[1, 2]', '[2, 3]', '[1, 2, 3]', '[2]'], answer: 1, lang: 'Python' },
  { code: 'console.log(typeof null)', options: ['null', 'undefined', 'object', 'string'], answer: 2, lang: 'JavaScript' },
  { code: 'print(2 ** 3 ** 0)', options: ['8', '1', '2', '6'], answer: 0, lang: 'Python' },
  { code: 'console.log(0.1 + 0.2 === 0.3)', options: ['true', 'false', 'undefined', 'Error'], answer: 1, lang: 'JavaScript' },
  { code: 'print(len(set([1,1,2,2,3])))', options: ['5', '3', '6', 'Error'], answer: 1, lang: 'Python' },
  { code: 'console.log([..."hello"].length)', options: ['5', '1', '7', 'undefined'], answer: 0, lang: 'JavaScript' },
  { code: 'print(bool("") ', options: ['True', 'False', 'Error', 'None'], answer: 1, lang: 'Python' },
  { code: 'console.log(NaN === NaN)', options: ['true', 'false', 'NaN', 'Error'], answer: 1, lang: 'JavaScript' },
  { code: 'print(sorted([3,1,2], reverse=True)[0])', options: ['1', '2', '3', 'Error'], answer: 2, lang: 'Python' },
  { code: 'console.log(parseInt("0x10"))', options: ['0', '10', '16', 'NaN'], answer: 2, lang: 'JavaScript' },
];

function QuickCodeQuiz() {
  const [quizIdx, setQuizIdx] = useState(() => Math.floor(Math.random() * CODE_QUIZZES.length));
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);

  const quiz = CODE_QUIZZES[quizIdx];

  const handleSelect = (idx: number) => {
    if (showResult) return;
    setSelected(idx);
    setShowResult(true);
    if (idx === quiz.answer) setStreak((s) => s + 1);
    else setStreak(0);
  };

  const nextQuiz = () => {
    setSelected(null);
    setShowResult(false);
    setQuizIdx((prev) => (prev + 1) % CODE_QUIZZES.length);
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="h-5 w-5 text-amber-400" />
        <h3 className="text-base font-semibold text-white">快速代码挑战</h3>
        {streak > 0 && <span className="ml-auto text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">🔥 连对{streak}题</span>}
      </div>
      <div className="bg-slate-950/60 rounded-xl p-4 mb-4 font-mono text-sm">
        <span className="text-xs text-slate-500 mb-1 block">{quiz.lang}</span>
        <code className="text-cyan-300">{quiz.code}</code>
      </div>
      <p className="text-xs text-slate-400 mb-3">这段代码的输出是什么？</p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {quiz.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`px-3 py-2 rounded-lg text-sm font-mono transition-all border ${
              showResult
                ? idx === quiz.answer
                  ? 'bg-green-500/20 border-green-400/40 text-green-300'
                  : idx === selected
                  ? 'bg-red-500/20 border-red-400/40 text-red-300'
                  : 'bg-slate-800/50 border-slate-700/50 text-slate-500'
                : selected === idx
                ? 'bg-violet-500/20 border-violet-400/40 text-violet-300'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-slate-600'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
      {showResult && (
        <div className="flex items-center justify-between">
          <span className={`text-sm ${selected === quiz.answer ? 'text-green-400' : 'text-red-400'}`}>
            {selected === quiz.answer ? '✓ 正确！' : `✗ 答案是: ${quiz.options[quiz.answer]}`}
          </span>
          <button onClick={nextQuiz} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
            下一题 <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 知识闪卡：快速复习编程概念 ── */
const FLASH_CARDS = [
  { q: '时间复杂度 O(n log n) 的排序算法有哪些？', a: '归并排序、快速排序（平均）、堆排序' },
  { q: 'HTTP 状态码 304 表示什么？', a: 'Not Modified - 资源未修改，使用缓存' },
  { q: 'TCP 三次握手的目的是？', a: '确认双方收发能力正常，同步序列号，建立可靠连接' },
  { q: '什么是闭包(Closure)？', a: '函数与其词法环境的组合，内部函数可以访问外部函数的变量' },
  { q: '数据库索引的原理是什么？', a: '使用 B+树等数据结构，将查找从 O(n) 优化到 O(log n)' },
  { q: 'Git 中 rebase 和 merge 的区别？', a: 'Rebase 重写历史使提交线性，Merge 保留分支历史创建合并提交' },
  { q: '什么是 RESTful API？', a: '基于 HTTP 方法（GET/POST/PUT/DELETE）操作资源的架构风格' },
  { q: '进程和线程的区别？', a: '进程有独立内存空间，线程共享进程内存。线程更轻量但需要同步' },
  { q: '什么是死锁？产生条件？', a: '多个进程互相等待资源。条件：互斥、持有并等待、不可抢占、循环等待' },
  { q: 'DNS 解析的过程？', a: '浏览器缓存→系统缓存→路由器缓存→ISP DNS→根域名服务器→顶级域名→权威域名' },
];

function FlashCardDeck() {
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);

  const card = FLASH_CARDS[idx];

  const next = (knew: boolean) => {
    if (knew) setKnown((k) => k + 1);
    setFlipped(false);
    setIdx((prev) => (prev + 1) % FLASH_CARDS.length);
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-yellow-400" />
        <h3 className="text-base font-semibold text-white">知识闪卡</h3>
        <span className="ml-auto text-xs text-slate-400">{idx + 1}/{FLASH_CARDS.length}</span>
      </div>
      <div
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer bg-gradient-to-br from-violet-500/10 to-cyan-500/10 rounded-xl p-5 min-h-[120px] flex items-center justify-center border border-violet-400/10 hover:border-violet-400/20 transition-all mb-4"
      >
        <p className={`text-center text-sm leading-relaxed ${flipped ? 'text-cyan-300' : 'text-white'}`}>
          {flipped ? card.a : card.q}
        </p>
      </div>
      <p className="text-xs text-slate-500 text-center mb-3">点击卡片翻转查看答案</p>
      {flipped && (
        <div className="flex gap-2">
          <button onClick={() => next(false)} className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-400 text-sm hover:bg-slate-700 transition-colors">
            不熟悉
          </button>
          <button onClick={() => next(true)} className="flex-1 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30 transition-colors">
            已掌握 ✓
          </button>
        </div>
      )}
      {known > 0 && <div className="mt-3 text-center text-xs text-green-400">已掌握 {known} 个知识点</div>}
    </div>
  );
}

/* ── 打字速度挑战 ── */
const CODE_SNIPPETS = [
  'function add(a, b) { return a + b; }',
  'const arr = [1, 2, 3].map(x => x * 2);',
  'for (let i = 0; i < n; i++) { sum += i; }',
  'if (arr.length === 0) return null;',
  'const result = await fetch(url);',
  'export default function App() { return <div />; }',
  'const [state, setState] = useState(0);',
  'try { await save(); } catch (e) { log(e); }',
];

function TypingChallenge() {
  const [snippetIdx, setSnippetIdx] = useState(() => Math.floor(Math.random() * CODE_SNIPPETS.length));
  const [input, setInput] = useState('');
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpm, setWpm] = useState<number | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);

  const snippet = CODE_SNIPPETS[snippetIdx];

  const handleInput = useCallback((val: string) => {
    if (!startTime && val.length > 0) setStartTime(Date.now());
    setInput(val);

    if (val.length >= snippet.length) {
      const elapsed = (Date.now() - (startTime || Date.now())) / 1000;
      const words = snippet.length / 5;
      setWpm(Math.round((words / elapsed) * 60));
      let correct = 0;
      for (let i = 0; i < snippet.length; i++) {
        if (val[i] === snippet[i]) correct++;
      }
      setAccuracy(Math.round((correct / snippet.length) * 100));
    }
  }, [snippet, startTime]);

  const reset = () => {
    setInput('');
    setStartTime(null);
    setWpm(null);
    setAccuracy(null);
    setSnippetIdx(Math.floor(Math.random() * CODE_SNIPPETS.length));
  };

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-slate-700/50 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Code className="h-5 w-5 text-cyan-400" />
        <h3 className="text-base font-semibold text-white">代码打字速度</h3>
      </div>
      <div className="bg-slate-950/60 rounded-xl p-4 mb-3 font-mono text-sm leading-relaxed">
        {snippet.split('').map((ch, i) => (
          <span key={i} className={
            input.length > i
              ? input[i] === ch ? 'text-green-400' : 'text-red-400 bg-red-500/20'
              : 'text-slate-500'
          }>{ch}</span>
        ))}
      </div>
      {wpm === null ? (
        <input
          value={input}
          onChange={(e) => handleInput(e.target.value)}
          placeholder="开始输入..."
          className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-3 py-2 font-mono text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
          autoFocus
        />
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-cyan-500/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-cyan-400">{wpm}</div>
              <div className="text-xs text-slate-400">WPM</div>
            </div>
            <div className={`rounded-lg p-3 text-center ${accuracy === 100 ? 'bg-green-500/10' : accuracy && accuracy >= 80 ? 'bg-yellow-500/10' : 'bg-red-500/10'}`}>
              <div className={`text-2xl font-bold ${accuracy === 100 ? 'text-green-400' : accuracy && accuracy >= 80 ? 'text-yellow-400' : 'text-red-400'}`}>{accuracy}%</div>
              <div className="text-xs text-slate-400">准确率</div>
            </div>
          </div>
          <button onClick={reset} className="w-full py-2 rounded-lg bg-violet-500/15 text-violet-300 text-sm hover:bg-violet-500/25 transition-colors">
            再来一次
          </button>
        </div>
      )}
    </div>
  );
}

/* ── 每日一题：快速选择题 ── */
const DAILY_QUIZZES = [
  { q: '以下哪种数据结构适合实现"撤销"功能？', options: ['队列', '栈', '链表', '哈希表'], answer: 1 },
  { q: 'HTTP 默认端口号是？', options: ['443', '8080', '80', '3000'], answer: 2 },
  { q: '二叉搜索树查找的最坏时间复杂度？', options: ['O(1)', 'O(log n)', 'O(n)', 'O(n²)'], answer: 2 },
  { q: '以下哪个不是 JavaScript 的基本数据类型？', options: ['symbol', 'bigint', 'array', 'undefined'], answer: 2 },
  { q: 'TCP 建立连接需要几次握手？', options: ['1次', '2次', '3次', '4次'], answer: 2 },
];

function DailyQuiz() {
  const [answered, setAnswered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const dayIdx = new Date().getDate() % DAILY_QUIZZES.length;
  const quiz = DAILY_QUIZZES[dayIdx];

  return (
    <div className="bg-slate-900/60 rounded-2xl border border-amber-500/20 p-5">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-5 w-5 text-amber-400" />
        <h3 className="text-base font-semibold text-white">每日一题</h3>
        <span className="ml-auto text-[10px] text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">今日</span>
      </div>
      <p className="text-sm text-white mb-4">{quiz.q}</p>
      <div className="space-y-2">
        {quiz.options.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => { if (!answered) { setSelected(idx); setAnswered(true); } }}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-all border ${
              answered
                ? idx === quiz.answer
                  ? 'bg-green-500/20 border-green-400/40 text-green-300'
                  : idx === selected
                  ? 'bg-red-500/20 border-red-400/40 text-red-300'
                  : 'bg-slate-800/30 border-slate-700/30 text-slate-500'
                : 'bg-slate-800/50 border-slate-700/50 text-slate-300 hover:border-amber-400/30'
            }`}
          >
            {String.fromCharCode(65 + idx)}. {opt}
          </button>
        ))}
      </div>
      {answered && (
        <p className={`mt-3 text-sm ${selected === quiz.answer ? 'text-green-400' : 'text-red-400'}`}>
          {selected === quiz.answer ? '🎉 回答正确！' : `正确答案是 ${String.fromCharCode(65 + quiz.answer)}`}
        </p>
      )}
    </div>
  );
}

/* ── 主页面 ── */

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
    <Link to={link} className="group relative overflow-hidden rounded-2xl border border-white/10 p-6 transition-all duration-300 hover:scale-[1.02] hover:border-white/20" style={{ background: gradient }}>
      <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full opacity-20 blur-3xl transition-opacity duration-300 group-hover:opacity-40" style={{ background: glowColor }} />
      <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full opacity-10 blur-3xl transition-opacity duration-300 group-hover:opacity-30" style={{ background: glowColor }} />
      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-2.5 backdrop-blur-sm">{icon}</div>
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
          <span className="rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20">进入</span>
        </div>
      </div>
    </Link>
  );
}

export function LearningHub() {
  const [starStats, setStarStats] = useState({ explored: 0, total: 0, mastered: 0 });
  const [solvedCount, setSolvedCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [mapRes, solvedRes] = await Promise.allSettled([
          starpathAPI.getMap(),
          submissionsAPI.getSolvedProblems(),
        ]);
        if (mapRes.status === 'fulfilled' && mapRes.value.success) {
          const data = mapRes.value.data;
          setStarStats({ explored: data.stats.exploredPlanets, total: data.stats.totalPlanets, mastered: data.stats.masteredPlanets });
        }
        if (solvedRes.status === 'fulfilled' && solvedRes.value.success) {
          setSolvedCount(solvedRes.value.data?.length || 0);
        }
      } catch { /* 非关键数据 */ } finally { setLoading(false); }
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
      icon: <Trophy className="h-6 w-6 text-amber-300" />,
      title: '已解决题目',
      description: '查看你成功通过的所有题目，回顾成长轨迹',
      link: '/solved',
      gradient: 'linear-gradient(135deg, rgba(245,158,11,0.3) 0%, rgba(217,119,6,0.4) 50%, rgba(180,83,9,0.3) 100%)',
      glowColor: '#fbbf24',
      stats: String(solvedCount),
      statLabel: '题目已AC',
    },
    {
      icon: <Briefcase className="h-6 w-6 text-blue-300" />,
      title: 'AI面试模拟',
      description: 'AI模拟真实面试场景，提升技术面试能力',
      link: '/interview',
      gradient: 'linear-gradient(135deg, rgba(59,130,246,0.3) 0%, rgba(29,78,216,0.4) 50%, rgba(30,64,175,0.3) 100%)',
      glowColor: '#60a5fa',
      stats: '→',
      statLabel: '开始面试',
    },
    {
      icon: <Bug className="h-6 w-6 text-green-300" />,
      title: 'AI猎虫挑战',
      description: '找出代码中的Bug，锻炼调试能力',
      link: '/bug-hunter',
      gradient: 'linear-gradient(135deg, rgba(34,197,94,0.3) 0%, rgba(22,163,74,0.4) 50%, rgba(21,128,61,0.3) 100%)',
      glowColor: '#4ade80',
      stats: '→',
      statLabel: '开始猎虫',
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-hidden">
      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
      `}</style>
      <TwinklingStars />

      <div className="relative z-10 mx-auto max-w-6xl px-6 py-16">
        {/* 标题区域 */}
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-5xl font-extrabold">
            <span className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">多元学习</span>
          </h1>
          <p className="text-lg text-slate-400">用全新的方式学习编程 — 刷题、探索、挑战，总有适合你的方式</p>
        </div>

        {/* 功能卡片网格 */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4 mb-12">
          {modules.map((mod) => (
            <ModuleCard key={mod.title} {...mod} />
          ))}
        </div>

        {/* 即时互动区域 */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
            <Play className="h-5 w-5 text-violet-400" />
            即刻体验
          </h2>
          <p className="text-sm text-slate-400 mb-6">不需要刷题，直接开始玩！这些互动小游戏帮你随时提升编程素养</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 mb-8">
          <QuickCodeQuiz />
          <DailyQuiz />
          <FlashCardDeck />
          <TypingChallenge />
        </div>

        {/* 学习数据概览 */}
        <div className="bg-slate-900/40 rounded-2xl border border-slate-700/30 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            你的学习数据
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">{starStats.explored}</div>
              <div className="text-xs text-slate-400 mt-1">已探索星球</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{starStats.mastered}</div>
              <div className="text-xs text-slate-400 mt-1">已精通星球</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{solvedCount}</div>
              <div className="text-xs text-slate-400 mt-1">已解决题目</div>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{starStats.total}</div>
              <div className="text-xs text-slate-400 mt-1">总星球数</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
