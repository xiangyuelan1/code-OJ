import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { starpathAPI } from '../services/api';
import {
  ArrowLeft, Star, Loader2, MessageSquare, Send,
  ChevronRight, Lightbulb, CheckCircle2, XCircle,
  PanelRightOpen, PanelRightClose,
} from 'lucide-react';

/* ── 类型定义 ── */

type PlanetStatus = 'UNEXPLORED' | 'EXPLORING' | 'MASTERED';
type ChallengeType = 'CHOICE' | 'FILL_BLANK' | 'PROGRAMMING';

interface ChallengeOption {
  id: string;
  label: string;
  content: string;
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: ChallengeType;
  options?: ChallengeOption[];
  hint?: string;
  order: number;
}

interface PlanetDetail {
  id: string;
  name: string;
  status: PlanetStatus;
  score: number;
  maxScore: number;
  regionId: string;
  regionName: string;
  challenges: Challenge[];
}

interface ChatMessage {
  role: 'user' | 'guide';
  content: string;
}

type SubmitResult = 'correct' | 'wrong' | null;

/* ── 工具函数 ── */

function getTypeLabel(t: ChallengeType): string {
  switch (t) {
    case 'CHOICE': return '选择题';
    case 'FILL_BLANK': return '填空题';
    case 'PROGRAMMING': return '编程题';
    default: return t;
  }
}

function getTypeBadgeStyle(t: ChallengeType): string {
  switch (t) {
    case 'CHOICE': return 'bg-cyan-500/15 text-cyan-400 border-cyan-400/25';
    case 'FILL_BLANK': return 'bg-amber-500/15 text-amber-400 border-amber-400/25';
    case 'PROGRAMMING': return 'bg-violet-500/15 text-violet-400 border-violet-400/25';
    default: return 'bg-slate-500/15 text-slate-400 border-slate-400/25';
  }
}

function getStatusLabel(s: PlanetStatus): string {
  switch (s) {
    case 'MASTERED': return '已精通';
    case 'EXPLORING': return '探索中';
    case 'UNEXPLORED': return '未探索';
    default: return s;
  }
}

function getStatusStyle(s: PlanetStatus): string {
  switch (s) {
    case 'MASTERED': return 'bg-amber-500/15 text-amber-400 border-amber-400/25';
    case 'EXPLORING': return 'bg-blue-500/15 text-blue-400 border-blue-400/25';
    case 'UNEXPLORED': return 'bg-slate-500/15 text-slate-400 border-slate-400/25';
    default: return 'bg-slate-500/15 text-slate-400 border-slate-400/25';
  }
}

/* ── 选择题组件 ── */

function ChoiceChallenge({
  challenge,
  selected,
  onSelect,
  disabled,
}: {
  challenge: Challenge;
  selected: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      {challenge.options?.map((opt) => (
        <label
          key={opt.id}
          onClick={() => !disabled && onSelect(opt.id)}
          className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
            selected === opt.id
              ? 'bg-violet-500/15 border-violet-400/40 text-white'
              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
          } ${disabled ? 'pointer-events-none opacity-70' : ''}`}
        >
          <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
            selected === opt.id
              ? 'border-violet-400 bg-violet-400/20'
              : 'border-slate-600'
          }`}>
            {selected === opt.id && <div className="w-2 h-2 rounded-full bg-violet-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-500 mr-2">{opt.label}</span>
            <span className="text-sm">{opt.content}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

/* ── 填空题组件 ── */

function FillBlankChallenge({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="在此输入答案..."
        className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 outline-none focus:border-violet-400/40 transition-colors text-sm disabled:opacity-70"
      />
    </div>
  );
}

/* ── 编程题组件 ── */

function ProgrammingChallenge({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute top-3 right-3 text-xs text-slate-600 select-none">代码编辑</div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="// 在此编写你的代码..."
        spellCheck={false}
        className="w-full min-h-[280px] px-4 py-3 rounded-xl bg-[#0d1117] border border-white/10 text-emerald-300 placeholder-slate-600 outline-none focus:border-violet-400/40 transition-colors font-mono text-sm leading-relaxed resize-y disabled:opacity-70"
      />
    </div>
  );
}

/* ── 提交结果反馈 ── */

function ResultFeedback({ result, points, onRetry, onHint, hintContent }: {
  result: SubmitResult;
  points?: number;
  onRetry: () => void;
  onHint: () => void;
  hintContent?: string;
}) {
  if (!result) return null;

  if (result === 'correct') {
    return (
      <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-5 animate-fade-in-up">
        <div className="flex items-center gap-3 mb-2">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <span className="text-lg font-semibold text-emerald-400">太棒了！</span>
        </div>
        <p className="text-slate-300 text-sm">
          你成功通过了这个挑战！
          {points !== undefined && points > 0 && (
            <span className="text-amber-400 font-medium ml-1">+{points} 积分</span>
          )}
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-rose-400/30 bg-rose-500/10 p-5 animate-shake">
      <div className="flex items-center gap-3 mb-2">
        <XCircle className="h-6 w-6 text-rose-400" />
        <span className="text-lg font-semibold text-rose-400">再试试？</span>
      </div>
      <p className="text-slate-300 text-sm mb-3">答案不太对，别灰心，再想想看！</p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all"
        >
          重新作答
        </button>
        <button
          onClick={onHint}
          className="px-4 py-2 rounded-lg bg-amber-500/15 border border-amber-400/25 text-amber-300 text-sm hover:bg-amber-500/25 transition-all flex items-center gap-1.5"
        >
          <Lightbulb className="h-3.5 w-3.5" />
          查看提示
        </button>
      </div>
      {hintContent && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-400/15 text-amber-200/80 text-sm">
          💡 {hintContent}
        </div>
      )}
    </div>
  );
}

/* ── AI 向导侧边栏 ── */

function GuideSidebar({
  open,
  onToggle,
  messages,
  onSend,
  loading,
  planetName,
}: {
  open: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSend: (msg: string) => void;
  loading: boolean;
  planetName: string;
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

  return (
    <>
      {/* 切换按钮 */}
      <button
        onClick={onToggle}
        className="fixed top-20 z-30 p-2 rounded-l-lg bg-violet-500/15 border border-r-0 border-violet-400/25 text-violet-400 hover:bg-violet-500/25 transition-all"
        style={{ right: open ? '384px' : '0' }}
      >
        {open ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </button>

      {/* 侧边栏 */}
      <div
        className={`fixed top-0 right-0 z-20 h-full w-96 starfield-bg star-nebula border-l border-white/10 transition-transform duration-300 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* 头部 */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10">
          <div className="w-8 h-8 rounded-full bg-violet-500/20 border border-violet-400/30 flex items-center justify-center">
            <Star className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm">AI 星际向导</h3>
            <p className="text-xs text-slate-400">{planetName}</p>
          </div>
        </div>

        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm mb-4">关于这道题有什么疑问吗？</p>
              <button
                onClick={() => onSend('给我提示')}
                className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/20 text-amber-300 text-sm hover:bg-amber-500/20 transition-all flex items-center gap-2 mx-auto"
              >
                <Lightbulb className="h-4 w-4" />
                给我提示
              </button>
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

        {/* 输入框 */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 focus-within:border-violet-400/40 transition-colors">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="向向导提问..."
              className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 hover:bg-violet-500/30 disabled:opacity-30 transition-all"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ── 主页面 ── */

export function StarChallengePage() {
  const { id: planetId } = useParams<{ id: string }>();
  const [planet, setPlanet] = useState<PlanetDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [submitResult, setSubmitResult] = useState<SubmitResult>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideMessages, setGuideMessages] = useState<ChatMessage[]>([]);
  const [guideLoading, setGuideLoading] = useState(false);

  /* 答题状态：按 challenge id 存储 */
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});

  const loadPlanet = useCallback(async () => {
    if (!planetId) return;
    try {
      const res = await starpathAPI.getPlanet(planetId);
      if (res.success && res.data) {
        setPlanet(res.data as PlanetDetail);
      }
    } catch {
      /* 星球数据加载失败不阻塞渲染 */
    } finally {
      setLoading(false);
    }
  }, [planetId]);

  useEffect(() => {
    if (planetId) loadPlanet();
  }, [planetId, loadPlanet]);

  const currentChallenge = planet?.challenges?.[activeTab];

  const handleSubmit = async () => {
    if (!planetId || !currentChallenge) return;

    setSubmitting(true);
    setSubmitResult(null);
    setHintVisible(false);

    const answer =
      currentChallenge.type === 'CHOICE' ? choiceAnswers[currentChallenge.id] :
      currentChallenge.type === 'FILL_BLANK' ? fillAnswers[currentChallenge.id] :
      codeAnswers[currentChallenge.id];

    try {
      const res = await starpathAPI.submitChallenge(planetId, {
        challengeId: currentChallenge.id,
        answer: answer ?? '',
      });
      if (res.success && res.data) {
        const isCorrect = (res.data as Record<string, unknown>).correct === true;
        setSubmitResult(isCorrect ? 'correct' : 'wrong');
        if (isCorrect) {
          loadPlanet();
        }
      } else {
        setSubmitResult('wrong');
      }
    } catch {
      setSubmitResult('wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSubmitResult(null);
    setHintVisible(false);
    if (currentChallenge) {
      if (currentChallenge.type === 'CHOICE') {
        setChoiceAnswers((prev) => ({ ...prev, [currentChallenge.id]: '' }));
      } else if (currentChallenge.type === 'FILL_BLANK') {
        setFillAnswers((prev) => ({ ...prev, [currentChallenge.id]: '' }));
      } else {
        setCodeAnswers((prev) => ({ ...prev, [currentChallenge.id]: '' }));
      }
    }
  };

  const handleGuideChat = useCallback(async (message: string) => {
    setGuideMessages((prev) => [...prev, { role: 'user', content: message }]);
    setGuideLoading(true);
    try {
      const res = await starpathAPI.guideChat({ planetId, message });
      if (res.success && res.data) {
        const content = (res.data as Record<string, string>).message || (res.data as Record<string, string>).content || '让我想想...';
        setGuideMessages((prev) => [...prev, { role: 'guide', content }]);
      }
    } catch {
      setGuideMessages((prev) => [...prev, { role: 'guide', content: '抱歉，暂时无法回应。' }]);
    } finally {
      setGuideLoading(false);
    }
  }, [planetId]);

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载星球...</p>
        </div>
      </div>
    );
  }

  if (!planet) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">未找到该星球</p>
          <Link to="/starpath" className="text-violet-400 hover:text-violet-300 text-sm">
            返回星图
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      {/* 星球头部 */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/starpath/region/${planet.regionId}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回{planet.regionName}
          </Link>
          <span className={`px-3 py-1 rounded-full text-xs border ${getStatusStyle(planet.status)}`}>
            {getStatusLabel(planet.status)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            planet.status === 'MASTERED' ? 'planet-mastered' :
            planet.status === 'EXPLORING' ? 'planet-exploring' :
            'planet-unexplored'
          }`}>
            <span className="text-2xl">
              {planet.status === 'MASTERED' ? '⭐' : planet.status === 'EXPLORING' ? '🔵' : '🌑'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{planet.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-400">
                得分 <span className="text-amber-400 font-medium">{planet.score}</span>/{planet.maxScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 挑战选项卡 */}
      {planet.challenges.length > 1 && (
        <div className="relative z-10 mb-6 flex gap-2 overflow-x-auto pb-2">
          {planet.challenges.map((ch, idx) => (
            <button
              key={ch.id}
              onClick={() => { setActiveTab(idx); setSubmitResult(null); setHintVisible(false); }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === idx
                  ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300'
                  : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="mr-1.5 text-xs opacity-60">#{idx + 1}</span>
              {ch.title}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] border ${getTypeBadgeStyle(ch.type)}`}>
                {getTypeLabel(ch.type)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 挑战内容 */}
      {currentChallenge && (
        <div className="relative z-10 glass-card rounded-2xl p-6 md:p-8 mb-6">
          {/* 题目标题 */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-1 rounded-lg text-xs border ${getTypeBadgeStyle(currentChallenge.type)}`}>
              {getTypeLabel(currentChallenge.type)}
            </span>
            <h2 className="text-lg font-semibold text-white">{currentChallenge.title}</h2>
          </div>

          {/* 题目描述 */}
          <div className="text-slate-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {currentChallenge.description}
          </div>

          {/* 答题区域 */}
          <div className="mb-4">
            {currentChallenge.type === 'CHOICE' && (
              <ChoiceChallenge
                challenge={currentChallenge}
                selected={choiceAnswers[currentChallenge.id] ?? ''}
                onSelect={(id) => setChoiceAnswers((prev) => ({ ...prev, [currentChallenge.id]: id }))}
                disabled={submitResult === 'correct'}
              />
            )}
            {currentChallenge.type === 'FILL_BLANK' && (
              <FillBlankChallenge
                value={fillAnswers[currentChallenge.id] ?? ''}
                onChange={(v) => setFillAnswers((prev) => ({ ...prev, [currentChallenge.id]: v }))}
                disabled={submitResult === 'correct'}
              />
            )}
            {currentChallenge.type === 'PROGRAMMING' && (
              <ProgrammingChallenge
                value={codeAnswers[currentChallenge.id] ?? ''}
                onChange={(v) => setCodeAnswers((prev) => ({ ...prev, [currentChallenge.id]: v }))}
                disabled={submitResult === 'correct'}
              />
            )}
          </div>

          {/* 提交按钮 */}
          {submitResult !== 'correct' && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-semibold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                <>
                  提交答案
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          {/* 结果反馈 */}
          <ResultFeedback
            result={submitResult}
            points={submitResult === 'correct' ? (planet.maxScore > 0 ? Math.round(planet.maxScore / planet.challenges.length) : 10) : undefined}
            onRetry={handleRetry}
            onHint={() => setHintVisible(true)}
            hintContent={hintVisible ? currentChallenge.hint : undefined}
          />

          {/* 下一题按钮 */}
          {submitResult === 'correct' && activeTab < planet.challenges.length - 1 && (
            <button
              onClick={() => {
                setActiveTab((prev) => prev + 1);
                setSubmitResult(null);
                setHintVisible(false);
              }}
              className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              下一题
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* 全部完成 */}
          {submitResult === 'correct' && activeTab === planet.challenges.length - 1 && (
            <div className="mt-4 text-center">
              <Link
                to={`/starpath/region/${planet.regionId}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/25 text-amber-300 font-medium hover:bg-amber-500/25 transition-all"
              >
                🎉 完成星球挑战！返回星域
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 无挑战状态 */}
      {planet.challenges.length === 0 && (
        <div className="relative z-10 glass-card rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">暂无挑战</h3>
          <p className="text-slate-400 text-sm mb-4">这个星球还没有挑战题目，敬请期待！</p>
          <Link
            to={`/starpath/region/${planet.regionId}`}
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            返回星域
          </Link>
        </div>
      )}

      {/* AI 向导侧边栏 */}
      <GuideSidebar
        open={guideOpen}
        onToggle={() => setGuideOpen((prev) => !prev)}
        messages={guideMessages}
        onSend={handleGuideChat}
        loading={guideLoading}
        planetName={planet.name}
      />
    </div>
  );
}
