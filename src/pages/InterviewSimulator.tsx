import { useState, useRef, useEffect } from 'react';
import { enhancedAiAPI } from '../services/api';
import {
  Briefcase, Loader2, Send, ChevronRight, Star, AlertCircle,
  CheckCircle, XCircle, MessageSquare, Code, Trophy,
} from 'lucide-react';

type InterviewPhase = 'setup' | 'questioning' | 'coding' | 'evaluating' | 'followup' | 'finished';

interface ChatMessage {
  role: 'ai' | 'user';
  content: string;
  isTyping?: boolean;
}

interface InterviewResult {
  score: number;
  feedback: string;
  followUpQuestion: string;
  passed: boolean;
}

const ROLES = [
  { value: 'frontend', label: '前端开发', icon: '🎨' },
  { value: 'backend', label: '后端开发', icon: '⚙️' },
  { value: 'fullstack', label: '全栈开发', icon: '🔧' },
  { value: 'algorithm', label: '算法工程师', icon: '🧮' },
];

const DIFFICULTIES = [
  { value: 'easy', label: '初级', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
  { value: 'medium', label: '中级', color: 'text-amber-400 border-amber-400/30 bg-amber-400/10' },
  { value: 'hard', label: '高级', color: 'text-rose-400 border-rose-400/30 bg-rose-400/10' },
];

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
];

export function InterviewSimulator() {
  const [phase, setPhase] = useState<InterviewPhase>('setup');
  const [role, setRole] = useState('frontend');
  const [difficulty, setDifficulty] = useState('medium');
  const [language, setLanguage] = useState('javascript');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState('');
  const [hints, setHints] = useState<string[]>([]);
  const [showHints, setShowHints] = useState(false);
  const [results, setResults] = useState<InterviewResult[]>([]);
  const [finalScore, setFinalScore] = useState(0);
  const [round, setRound] = useState(1);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const codeRef = useRef<HTMLTextAreaElement>(null);

  const MAX_ROUNDS = 3;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const addAIMessage = (content: string) => {
    setChatMessages(prev => [...prev, { role: 'ai', content, isTyping: true }]);
    setTimeout(() => {
      setChatMessages(prev =>
        prev.map((msg, idx) =>
          idx === prev.length - 1 && msg.isTyping ? { ...msg, isTyping: false } : msg
        )
      );
    }, 800);
  };

  const addUserMessage = (content: string) => {
    setChatMessages(prev => [...prev, { role: 'user', content }]);
  };

  const startInterview = async () => {
    setLoading(true);
    setPhase('questioning');
    setChatMessages([]);
    setResults([]);
    setRound(1);

    addAIMessage(`你好！我是你的${ROLES.find(r => r.value === role)?.label}面试官。让我们开始面试吧！🎯`);

    try {
      const res = await enhancedAiAPI.simulateInterview({ role, difficulty });
      if (res.success && res.data) {
        const data = res.data;
        setCurrentQuestionId(`q-${Date.now()}`);
        setHints(data.hints || []);
        setTimeout(() => {
          addAIMessage(data.question);
          setPhase('coding');
        }, 1200);
      }
    } catch (error: any) {
      addAIMessage('抱歉，面试系统暂时不可用，请稍后再试。');
      setPhase('setup');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async () => {
    if (!code.trim()) return;

    addUserMessage(`我提交了以下代码：\n\`\`\`${language}\n${code}\n\`\`\``);
    setPhase('evaluating');
    setLoading(true);

    try {
      const res = await enhancedAiAPI.evaluateInterviewAnswer({
        questionId: currentQuestionId,
        code,
        language,
      });
      if (res.success && res.data) {
        const result = res.data as InterviewResult;
        setResults(prev => [...prev, result]);

        const scoreEmoji = result.score >= 80 ? '🎉' : result.score >= 60 ? '👍' : '💪';
        addAIMessage(
          `${scoreEmoji} 评估完成！得分：${result.score}/100\n\n${result.feedback}${
            result.passed ? '\n\n✅ 通过！' : '\n\n❌ 未通过，继续加油！'
          }`
        );

        if (result.followUpQuestion && round < MAX_ROUNDS) {
          setTimeout(() => {
            addAIMessage(`追问：${result.followUpQuestion}`);
            setPhase('followup');
          }, 1500);
        } else if (round < MAX_ROUNDS) {
          setTimeout(() => {
            loadNextQuestion();
          }, 1500);
        } else {
          setTimeout(() => {
            finishInterview();
          }, 1500);
        }
      }
    } catch (error: any) {
      addAIMessage('评估时出现错误，请重试。');
      setPhase('coding');
    } finally {
      setLoading(false);
    }
  };

  const loadNextQuestion = async () => {
    setLoading(true);
    setRound(prev => prev + 1);
    setCode('');

    try {
      const res = await enhancedAiAPI.simulateInterview({ role, difficulty });
      if (res.success && res.data) {
        const data = res.data;
        setCurrentQuestionId(`q-${Date.now()}`);
        setHints(data.hints || []);
        addAIMessage(`第 ${round + 1} 轮面试题：\n\n${data.question}`);
        setPhase('coding');
      }
    } catch {
      addAIMessage('加载下一题失败。');
      setPhase('coding');
    } finally {
      setLoading(false);
    }
  };

  const finishInterview = () => {
    const total = results.reduce((sum, r) => sum + r.score, 0);
    const avg = results.length > 0 ? Math.round(total / results.length) : 0;
    setFinalScore(avg);
    setPhase('finished');

    const gradeEmoji = avg >= 80 ? '🏆' : avg >= 60 ? '🌟' : '📚';
    addAIMessage(
      `面试结束！${gradeEmoji}\n\n最终得分：${avg}/100\n${
        avg >= 80 ? '表现优秀！你有很强的编程能力。' :
        avg >= 60 ? '表现不错！继续练习会更好。' :
        '别灰心，多练习一定能进步！'
      }`
    );
  };

  const handleFollowupSubmit = () => {
    setPhase('coding');
    if (round < MAX_ROUNDS) {
      loadNextQuestion();
    } else {
      finishInterview();
    }
  };

  const renderSetup = () => (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-purple-500/20 rounded-2xl mb-4">
          <Briefcase className="h-10 w-10 text-cyan-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">AI 面试模拟器</h2>
        <p className="text-slate-400">模拟真实技术面试，AI出题并评估你的代码</p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">面试岗位</label>
          <div className="grid grid-cols-2 gap-3">
            {ROLES.map(r => (
              <button
                key={r.value}
                onClick={() => setRole(r.value)}
                className={`flex items-center gap-3 p-4 rounded-xl border transition-all ${
                  role === r.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-white'
                    : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                }`}
              >
                <span className="text-2xl">{r.icon}</span>
                <span className="font-medium">{r.label}</span>
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
                {d.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-3">编程语言</label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map(l => (
              <button
                key={l.value}
                onClick={() => setLanguage(l.value)}
                className={`px-4 py-2 rounded-lg border transition-all text-sm ${
                  language === l.value
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={startInterview}
          disabled={loading}
          className="w-full py-4 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ChevronRight className="h-5 w-5" />}
          开始面试
        </button>
      </div>
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'ai' ? 'justify-start' : 'justify-end'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                msg.role === 'ai'
                  ? 'bg-slate-700 text-slate-200 rounded-tl-sm'
                  : 'bg-cyan-500/20 text-cyan-100 rounded-tr-sm'
              }`}
            >
              {msg.role === 'ai' && (
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                  <span className="text-xs text-cyan-400 font-medium">面试官</span>
                </div>
              )}
              <div className="text-sm whitespace-pre-wrap">
                {msg.isTyping ? (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  </span>
                ) : (
                  msg.content
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {showHints && hints.length > 0 && (
        <div className="px-4 py-2 bg-yellow-500/10 border-t border-yellow-500/20">
          <div className="text-xs text-yellow-400 font-medium mb-1">💡 提示</div>
          <div className="space-y-1">
            {hints.map((hint, idx) => (
              <div key={idx} className="text-xs text-yellow-200/80">
                {idx + 1}. {hint}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderCodeEditor = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-700/50 border-b border-slate-600">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-cyan-400" />
          <span className="text-sm text-slate-300">代码编辑器</span>
          <span className="text-xs px-2 py-0.5 bg-slate-600 rounded text-slate-400">
            {LANGUAGES.find(l => l.value === language)?.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHints(!showHints)}
            className="text-xs px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
          >
            💡 提示
          </button>
          <span className="text-xs text-slate-500">第 {round}/{MAX_ROUNDS} 轮</span>
        </div>
      </div>
      <textarea
        ref={codeRef}
        value={code}
        onChange={e => setCode(e.target.value)}
        className="flex-1 w-full bg-slate-900 text-green-300 font-mono text-sm p-4 resize-none focus:outline-none"
        placeholder={`// 在这里编写你的 ${LANGUAGES.find(l => l.value === language)?.label} 代码...\n// 面试官正在等待你的回答`}
        spellCheck={false}
      />
      <div className="px-4 py-3 bg-slate-700/50 border-t border-slate-600">
        <button
          onClick={submitCode}
          disabled={loading || !code.trim()}
          className="w-full py-2.5 bg-cyan-500 text-white font-medium rounded-lg hover:bg-cyan-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          提交代码
        </button>
      </div>
    </div>
  );

  const renderFinished = () => (
    <div className="max-w-lg mx-auto text-center space-y-6">
      <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
        finalScore >= 80 ? 'bg-emerald-500/20' : finalScore >= 60 ? 'bg-amber-500/20' : 'bg-rose-500/20'
      }`}>
        <Trophy className={`h-12 w-12 ${
          finalScore >= 80 ? 'text-emerald-400' : finalScore >= 60 ? 'text-amber-400' : 'text-rose-400'
        }`} />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2">面试结束</h2>
        <div className={`text-5xl font-bold ${
          finalScore >= 80 ? 'text-emerald-400' : finalScore >= 60 ? 'text-amber-400' : 'text-rose-400'
        }`}>
          {finalScore}
        </div>
        <p className="text-slate-400 mt-1">/ 100 分</p>
      </div>

      <div className="space-y-2">
        {results.map((result, idx) => (
          <div key={idx} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
            <span className="text-slate-300 text-sm">第 {idx + 1} 轮</span>
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${
                result.score >= 60 ? 'text-emerald-400' : 'text-rose-400'
              }`}>
                {result.score}分
              </span>
              {result.passed ? (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setPhase('setup');
          setChatMessages([]);
          setCode('');
          setResults([]);
        }}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-purple-600 transition-all"
      >
        再来一次
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {phase === 'setup' ? (
          renderSetup()
        ) : phase === 'finished' ? (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-xl overflow-hidden" style={{ height: '400px' }}>
              {renderChat()}
            </div>
            {renderFinished()}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" style={{ height: 'calc(100vh - 120px)' }}>
            <div className="bg-slate-800 rounded-xl overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-slate-700/50 border-b border-slate-600 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-cyan-400" />
                <span className="text-sm font-medium text-white">面试官</span>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-400" />}
              </div>
              <div className="flex-1 overflow-hidden">
                {renderChat()}
              </div>
            </div>
            <div className="bg-slate-800 rounded-xl overflow-hidden flex flex-col">
              {renderCodeEditor()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
