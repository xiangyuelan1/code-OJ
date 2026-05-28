import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { starpathAPI, type PlanetDetailData, type ProblemType, type PlanetStatus, type SubmitResult, type ProblemChoice } from '../services/api';
import {
  ArrowLeft, Loader2, MessageSquare,
  ChevronRight, Lightbulb, CheckCircle2, XCircle,
  PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import { GuideChatPanel } from '../components/GuideChatPanel';

/* ── 工具函数 ── */

function getTypeLabel(t: ProblemType): string {
  switch (t) {
    case 'CHOICE': return '选择题';
    case 'FILL_BLANK': return '填空题';
    case 'PROGRAMMING': return '编程题';
    default: return t;
  }
}

function getTypeBadgeStyle(t: ProblemType): string {
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

/** 安全解析 JSON 字符串 */
function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (!json) return fallback;
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

/* ── 选择题组件 ── */

function ChoiceProblem({
  choices,
  selected,
  onSelect,
  disabled,
}: {
  choices: ProblemChoice[];
  selected: string;
  onSelect: (key: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3">
      {choices.map((opt) => (
        <label
          key={opt.key}
          onClick={() => !disabled && onSelect(opt.key)}
          className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all ${
            selected === opt.key
              ? 'bg-violet-500/15 border-violet-400/40 text-white'
              : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
          } ${disabled ? 'pointer-events-none opacity-70' : ''}`}
        >
          <div className={`shrink-0 w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all ${
            selected === opt.key
              ? 'border-violet-400 bg-violet-400/20'
              : 'border-slate-600'
          }`}>
            {selected === opt.key && <div className="w-2 h-2 rounded-full bg-violet-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-xs text-slate-500 mr-2">{opt.key}</span>
            <span className="text-sm">{opt.text}</span>
          </div>
        </label>
      ))}
    </div>
  );
}

/* ── 填空题组件 ── */

function FillBlankProblem({
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

function ProgrammingProblem({
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

function ResultFeedback({ result, pointsEarned, pending, onRetry, onHint, hintContent }: {
  result: 'correct' | 'wrong' | null;
  pointsEarned?: number;
  pending?: boolean;
  onRetry: () => void;
  onHint: () => void;
  hintContent?: string;
}) {
  if (pending) {
    return (
      <div className="mt-6 rounded-xl border border-violet-400/30 bg-violet-500/10 p-5 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-violet-400 animate-spin" />
          <span className="text-violet-300 text-sm">代码已提交，正在判题...</span>
        </div>
      </div>
    );
  }

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
          {pointsEarned !== undefined && pointsEarned > 0 && (
            <span className="text-amber-400 font-medium ml-1">+{pointsEarned} 积分</span>
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

/* ── 主页面 ── */

export function StarChallengePage() {
  const { id: planetId } = useParams<{ id: string }>();
  const [planetData, setPlanetData] = useState<PlanetDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [submitResult, setSubmitResult] = useState<'correct' | 'wrong' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [hintVisible, setHintVisible] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [lastPointsEarned, setLastPointsEarned] = useState(0);
  const [pendingSubmission, setPendingSubmission] = useState<string | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* 答题状态：按 problem id 存储 */
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});
  const [fillAnswers, setFillAnswers] = useState<Record<string, string>>({});
  const [codeAnswers, setCodeAnswers] = useState<Record<string, string>>({});

  const loadPlanet = useCallback(async () => {
    if (!planetId) return;
    try {
      const res = await starpathAPI.getPlanet(planetId);
      if (res.success && res.data) {
        setPlanetData(res.data as PlanetDetailData);
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

  /* 编程题提交后轮询判题结果 */
  useEffect(() => {
    if (!pendingSubmission) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await starpathAPI.getPlanet(planetId!);
        if (res.success && res.data) {
          const data = res.data as PlanetDetailData;
          /* 检查 progress 是否已更新（判题完成） */
          if (data.progress.status === 'MASTERED' || data.progress.score > (planetData?.progress.score ?? 0)) {
            setPlanetData(data);
            setSubmitResult('correct');
            setPendingSubmission(null);
            if (pollingRef.current) clearInterval(pollingRef.current);
          }
        }
      } catch {
        /* 轮询失败不中断 */
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pendingSubmission, planetId, planetData?.progress.score]);

  const problems = planetData?.problems ?? [];
  const currentProblem = problems[activeTab];

  /** 解析选择题选项：后端返回 JSON 字符串 [{key, text}] */
  const parseChoices = (choicesJson: string | null | undefined): ProblemChoice[] => {
    return safeJsonParse<ProblemChoice[]>(choicesJson, []);
  };

  const handleSubmit = async () => {
    if (!planetId || !currentProblem) return;

    setSubmitting(true);
    setSubmitResult(null);
    setHintVisible(false);

    const answer =
      currentProblem.type === 'CHOICE' ? choiceAnswers[currentProblem.id] :
      currentProblem.type === 'FILL_BLANK' ? fillAnswers[currentProblem.id] :
      codeAnswers[currentProblem.id];

    try {
      const res = await starpathAPI.submitChallenge(planetId, {
        problemId: currentProblem.id,
        answer: answer ?? '',
        challengeType: currentProblem.type,
      });
      if (res.success && res.data) {
        const data = res.data as SubmitResult;

        /* 编程题返回 pending 状态，开始轮询 */
        if (data.pending) {
          setPendingSubmission(data.submissionId ?? null);
          setSubmitting(false);
          return;
        }

        /* 幂等性：已正确回答过的题目 */
        if (data.alreadyCorrect) {
          setSubmitResult('correct');
          setLastPointsEarned(0);
          setSubmitting(false);
          return;
        }

        const isCorrect = data.correct;
        setSubmitResult(isCorrect ? 'correct' : 'wrong');
        setLastPointsEarned(data.pointsEarned ?? 0);
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
    if (currentProblem) {
      if (currentProblem.type === 'CHOICE') {
        setChoiceAnswers((prev) => ({ ...prev, [currentProblem.id]: '' }));
      } else if (currentProblem.type === 'FILL_BLANK') {
        setFillAnswers((prev) => ({ ...prev, [currentProblem.id]: '' }));
      } else {
        setCodeAnswers((prev) => ({ ...prev, [currentProblem.id]: '' }));
      }
    }
  };

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

  if (!planetData) {
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

  const planet = planetData.planet;
  const progress = planetData.progress;
  const maxScore = problems.length * 10;

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      {/* 星球头部 */}
      <div className="relative z-10 mb-6">
        <div className="flex items-center justify-between mb-4">
          <Link
            to={`/starpath/region/${planet.region.id}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回{planet.region.name}
          </Link>
          <span className={`px-3 py-1 rounded-full text-xs border ${getStatusStyle(progress.status)}`}>
            {getStatusLabel(progress.status)}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
            progress.status === 'MASTERED' ? 'planet-mastered' :
            progress.status === 'EXPLORING' ? 'planet-exploring' :
            'planet-unexplored'
          }`}>
            <span className="text-2xl">
              {progress.status === 'MASTERED' ? '⭐' : progress.status === 'EXPLORING' ? '🔵' : '🌑'}
            </span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">{planet.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-400">
                得分 <span className="text-amber-400 font-medium">{progress.score}</span>/{maxScore}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 题目选项卡 */}
      {problems.length > 1 && (
        <div className="relative z-10 mb-6 flex gap-2 overflow-x-auto pb-2">
          {problems.map((prob, idx) => (
            <button
              key={prob.id}
              onClick={() => { setActiveTab(idx); setSubmitResult(null); setHintVisible(false); setPendingSubmission(null); }}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === idx
                  ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300'
                  : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <span className="mr-1.5 text-xs opacity-60">#{idx + 1}</span>
              {prob.title}
              <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] border ${getTypeBadgeStyle(prob.type as ProblemType)}`}>
                {getTypeLabel(prob.type as ProblemType)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 题目内容 */}
      {currentProblem && (
        <div className="relative z-10 glass-card rounded-2xl p-6 md:p-8 mb-6">
          {/* 题目标题 */}
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-1 rounded-lg text-xs border ${getTypeBadgeStyle(currentProblem.type as ProblemType)}`}>
              {getTypeLabel(currentProblem.type as ProblemType)}
            </span>
            <h2 className="text-lg font-semibold text-white">{currentProblem.title}</h2>
          </div>

          {/* 题目描述 */}
          <div className="text-slate-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
            {currentProblem.description}
          </div>

          {/* 答题区域 */}
          <div className="mb-4">
            {currentProblem.type === 'CHOICE' && (
              <ChoiceProblem
                choices={parseChoices(currentProblem.choices)}
                selected={choiceAnswers[currentProblem.id] ?? ''}
                onSelect={(key) => setChoiceAnswers((prev) => ({ ...prev, [currentProblem.id]: key }))}
                disabled={submitResult === 'correct'}
              />
            )}
            {currentProblem.type === 'FILL_BLANK' && (
              <FillBlankProblem
                value={fillAnswers[currentProblem.id] ?? ''}
                onChange={(v) => setFillAnswers((prev) => ({ ...prev, [currentProblem.id]: v }))}
                disabled={submitResult === 'correct'}
              />
            )}
            {currentProblem.type === 'PROGRAMMING' && (
              <ProgrammingProblem
                value={codeAnswers[currentProblem.id] ?? ''}
                onChange={(v) => setCodeAnswers((prev) => ({ ...prev, [currentProblem.id]: v }))}
                disabled={submitResult === 'correct'}
              />
            )}
          </div>

          {/* 提交按钮 */}
          {submitResult !== 'correct' && !pendingSubmission && (
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
            pointsEarned={lastPointsEarned}
            pending={!!pendingSubmission}
            onRetry={handleRetry}
            onHint={() => setHintVisible(true)}
            hintContent={hintVisible ? safeJsonParse<string[]>(currentProblem.tags, []).join(', ') : undefined}
          />

          {/* 下一题按钮 */}
          {submitResult === 'correct' && activeTab < problems.length - 1 && (
            <button
              onClick={() => {
                setActiveTab((prev) => prev + 1);
                setSubmitResult(null);
                setHintVisible(false);
                setPendingSubmission(null);
              }}
              className="mt-4 w-full py-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 font-medium hover:bg-white/10 transition-all flex items-center justify-center gap-2"
            >
              下一题
              <ChevronRight className="h-4 w-4" />
            </button>
          )}

          {/* 全部完成 */}
          {submitResult === 'correct' && activeTab === problems.length - 1 && (
            <div className="mt-4 text-center">
              <Link
                to={`/starpath/region/${planet.region.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-amber-600/10 border border-amber-400/25 text-amber-300 font-medium hover:bg-amber-500/25 transition-all"
              >
                🎉 完成星球挑战！返回星域
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* 无题目状态 */}
      {problems.length === 0 && (
        <div className="relative z-10 glass-card rounded-2xl p-10 text-center">
          <div className="w-16 h-16 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="h-7 w-7 text-violet-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">暂无挑战</h3>
          <p className="text-slate-400 text-sm mb-4">这个星球还没有挑战题目，敬请期待！</p>
          <Link
            to={`/starpath/region/${planet.region.id}`}
            className="inline-flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            返回星域
          </Link>
        </div>
      )}

      {/* AI 向导切换按钮 */}
      <button
        onClick={() => setGuideOpen((prev) => !prev)}
        className="fixed top-20 z-30 p-2 rounded-l-lg bg-violet-500/15 border border-r-0 border-violet-400/25 text-violet-400 hover:bg-violet-500/25 transition-all"
        style={{ right: guideOpen ? '384px' : '0' }}
      >
        {guideOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
      </button>

      {/* AI 向导侧边栏 */}
      <GuideChatPanel
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        context={{ planetId }}
        subtitle={planet.name}
        variant="sidebar"
      />
    </div>
  );
}
