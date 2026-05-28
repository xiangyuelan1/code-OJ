import { useState, useEffect } from 'react';
import { enhancedAiAPI } from '../services/api';
import {
  Bug, Loader2, Search, CheckCircle, XCircle, AlertTriangle,
  Timer, Trophy, RotateCcw, ChevronDown,
} from 'lucide-react';

type BugHunterPhase = 'setup' | 'hunting' | 'verifying' | 'result';

interface BugHuntResult {
  allFixed: boolean;
  remainingBugs: number;
  score: number;
  explanation: string;
}

const TOPICS = [
  { value: 'array', label: '数组与链表', icon: '📊' },
  { value: 'sort', label: '排序算法', icon: '🔄' },
  { value: 'recursion', label: '递归与回溯', icon: '🔁' },
  { value: 'string', label: '字符串处理', icon: '📝' },
  { value: 'tree', label: '树与图', icon: '🌳' },
  { value: 'dp', label: '动态规划', icon: '🧩' },
];

const DIFFICULTIES = [
  { value: 'easy', label: '简单', bugCount: 1, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  { value: 'medium', label: '中等', bugCount: 2, color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  { value: 'hard', label: '困难', bugCount: 3, color: 'text-rose-400 border-rose-400/30 bg-rose-400/10' },
];

export function BugHunter() {
  const [phase, setPhase] = useState<BugHunterPhase>('setup');
  const [topic, setTopic] = useState('array');
  const [difficulty, setDifficulty] = useState('easy');
  const [buggyCode, setBuggyCode] = useState('');
  const [fixedCode, setFixedCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [bugCount, setBugCount] = useState(1);
  const [hints, setHints] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [result, setResult] = useState<BugHuntResult | null>(null);
  const [correctCode, setCorrectCode] = useState('');
  const [bugExplanations, setBugExplanations] = useState<string[]>([]);
  const [showAnswer, setShowAnswer] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => setElapsed(prev => prev + 1), 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const startHunting = async () => {
    setLoading(true);
    setPhase('hunting');
    setElapsed(0);
    setTimerRunning(true);
    setResult(null);
    setShowAnswer(false);
    setShowHints(false);

    try {
      const res = await enhancedAiAPI.generateBuggyCode({ topic, difficulty });
      if (res.success && res.data) {
        const data = res.data;
        setBuggyCode(data.buggyCode || '');
        setFixedCode(data.buggyCode || '');
        setLanguage(data.language || 'python');
        setBugCount(data.bugCount || 1);
        setHints(data.hints || []);
        setCorrectCode(data.correctCode || '');
        setBugExplanations(data.bugExplanations || []);
      }
    } catch (error: any) {
      alert(error.error?.message || '生成失败，请稍后重试');
      setPhase('setup');
    } finally {
      setLoading(false);
    }
  };

  const verifyFix = async () => {
    if (fixedCode === buggyCode) {
      alert('你还没有修改代码哦！');
      return;
    }

    setLoading(true);
    setPhase('verifying');
    setTimerRunning(false);

    try {
      const res = await enhancedAiAPI.verifyBugFix({
        buggyCodeId: `bug-${Date.now()}`,
        fixedCode,
      });
      if (res.success && res.data) {
        const data = res.data as BugHuntResult;
        setResult(data);
        setTotalScore(prev => prev + data.score);
        setRoundsPlayed(prev => prev + 1);
        setPhase('result');
      }
    } catch (error: any) {
      alert(error.error?.message || '验证失败');
      setPhase('hunting');
    } finally {
      setLoading(false);
    }
  };

  const renderSetup = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-500/20 to-red-500/20 rounded-2xl mb-4">
          <Bug className="h-10 w-10 text-amber-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">AI Bug 猎手 🔍</h2>
        <p className="text-slate-400">找出代码中的隐藏 Bug，修复它们！</p>
      </div>

      {roundsPlayed > 0 && (
        <div className="flex justify-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{totalScore}</div>
            <div className="text-xs text-slate-400">累计得分</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-cyan-400">{roundsPlayed}</div>
            <div className="text-xs text-slate-400">已玩轮数</div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">代码主题</label>
          <div className="grid grid-cols-3 gap-3">
            {TOPICS.map(t => (
              <button
                key={t.value}
                onClick={() => setTopic(t.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-sm ${
                  topic === t.value
                    ? 'border-amber-500 bg-amber-500/10 text-white'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="text-lg">{t.icon}</span>
                <span className="font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">难度等级</label>
          <div className="flex gap-3">
            {DIFFICULTIES.map(d => (
              <button
                key={d.value}
                onClick={() => setDifficulty(d.value)}
                className={`flex-1 py-3 px-4 rounded-xl border transition-all font-medium ${
                  difficulty === d.value
                    ? d.color + ' border-current'
                    : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                <div>{d.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{d.bugCount} 个 Bug</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startHunting}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-red-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
          开始猎虫
        </button>
      </div>
    </div>
  );

  const renderHunting = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-300">
            <Bug className="h-5 w-5 text-amber-400" />
            <span className="font-medium">找出 {bugCount} 个 Bug</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <Timer className="h-4 w-4" />
            <span className="font-mono">{formatTime(elapsed)}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
          >
            💡 提示
          </button>
        </div>
      </div>

      {showHints && hints.length > 0 && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
          <div className="text-xs text-yellow-400 font-medium mb-2">💡 线索</div>
          <div className="space-y-1">
            {hints.map((hint, idx) => (
              <div key={idx} className="text-sm text-yellow-200/80 flex items-start gap-2">
                <span className="text-yellow-400 shrink-0">{idx + 1}.</span>
                <span>{hint}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-slate-800 rounded-xl overflow-hidden">
          <div className="px-4 py-2 bg-slate-700/50 border-b border-slate-600 flex items-center gap-2">
            <Bug className="h-4 w-4 text-red-400" />
            <span className="text-sm text-slate-300">有 Bug 的代码</span>
            <span className="text-xs px-2 py-0.5 bg-red-500/20 text-red-400 rounded">{bugCount} 个 Bug</span>
          </div>
          <pre className="p-4 text-sm text-red-300/90 font-mono overflow-auto max-h-[60vh] whitespace-pre-wrap">
            {buggyCode}
          </pre>
        </div>

        <div className="bg-slate-800 rounded-xl overflow-hidden flex flex-col">
          <div className="px-4 py-2 bg-slate-700/50 border-b border-slate-600 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-sm text-slate-300">你的修复</span>
          </div>
          <textarea
            value={fixedCode}
            onChange={e => setFixedCode(e.target.value)}
            className="flex-1 w-full bg-slate-900 text-emerald-300 font-mono text-sm p-4 resize-none focus:outline-none min-h-[300px]"
            spellCheck={false}
            placeholder="在这里修改代码，修复所有 Bug..."
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={verifyFix}
          disabled={loading || fixedCode === buggyCode}
          className="flex-1 py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
          检查修复
        </button>
        <button
          onClick={() => setPhase('setup')}
          className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors"
        >
          退出
        </button>
      </div>
    </div>
  );

  const renderResult = () => {
    if (!result) return null;

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full ${
            result.allFixed ? 'bg-emerald-500/20' : 'bg-amber-500/20'
          }`}>
            {result.allFixed ? (
              <Trophy className="h-10 w-10 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-10 w-10 text-amber-400" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mt-4">
            {result.allFixed ? '🎉 全部修复！' : `还有 ${result.remainingBugs} 个 Bug`}
          </h2>
          <div className={`text-4xl font-bold mt-2 ${
            result.score >= 80 ? 'text-emerald-400' : result.score >= 50 ? 'text-amber-400' : 'text-rose-400'
          }`}>
            {result.score} 分
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-3">评估详情</h3>
          <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">
            {result.explanation}
          </div>
        </div>

        {!result.allFixed && (
          <div className="flex gap-3">
            <button
              onClick={() => {
                setPhase('hunting');
                setTimerRunning(true);
                setResult(null);
              }}
              className="flex-1 py-3 bg-amber-500 text-white font-semibold rounded-xl hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-5 w-5" />
              继续修复
            </button>
            <button
              onClick={() => setShowAnswer(!showAnswer)}
              className="px-6 py-3 bg-slate-700 text-slate-300 rounded-xl hover:bg-slate-600 transition-colors flex items-center gap-2"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showAnswer ? 'rotate-180' : ''}`} />
              查看答案
            </button>
          </div>
        )}

        {showAnswer && correctCode && (
          <div className="bg-slate-800 rounded-xl overflow-hidden">
            <div className="px-4 py-2 bg-emerald-500/10 border-b border-emerald-500/20">
              <span className="text-sm text-emerald-400 font-medium">正确代码</span>
            </div>
            <pre className="p-4 text-sm text-emerald-300 font-mono overflow-auto whitespace-pre-wrap">
              {correctCode}
            </pre>
          </div>
        )}

        {showAnswer && bugExplanations.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-amber-400 mb-3">Bug 解释</h3>
            <div className="space-y-2">
              {bugExplanations.map((exp, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-slate-200">
                  <Bug className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{exp}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={startHunting}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-red-500 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-red-600 transition-all flex items-center justify-center gap-2"
        >
          下一题
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {phase === 'setup' && renderSetup()}
        {phase === 'hunting' && renderHunting()}
        {phase === 'verifying' && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-amber-400 mx-auto mb-4" />
              <p className="text-slate-400">正在验证你的修复...</p>
            </div>
          </div>
        )}
        {phase === 'result' && renderResult()}
      </div>
    </div>
  );
}
