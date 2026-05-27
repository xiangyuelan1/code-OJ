import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchAPI, submissionsAPI } from '../services/api';
import { useSocketStore } from '../services/socket';
import { useAuthStore } from '../stores/auth.store';
import {
  ArrowLeft, Clock, CheckCircle, XCircle, Loader2,
  Flag, Handshake, MessageCircle,
  RotateCcw, Timer, AlertTriangle
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { MarkdownRenderer } from '../components/MarkdownEditor';

/** 题型中文标签 */
const TYPE_LABELS: Record<string, string> = {
  CHOICE: '选择题',
  FILL_BLANK: '填空题',
  PROGRAMMING: '编程题'
};

/** 难度样式映射 */
const DIFFICULTY_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  EASY: { bg: 'bg-green-500/20', text: 'text-green-400', label: '简单' },
  MEDIUM: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '中等' },
  HARD: { bg: 'bg-red-500/20', text: 'text-red-400', label: '困难' }
};

/** 结算动画阶段 */
type SettlementPhase = 'hidden' | 'animating' | 'result';

/** 根据胜负结果返回动画配置 */
function getResultConfig(outcome: 'win' | 'lose' | 'draw') {
  switch (outcome) {
    case 'win':
      return {
        title: '胜 利',
        titleClass: 'text-yellow-400',
        glowClass: 'shadow-[0_0_60px_rgba(234,179,8,0.5)]',
        bgGradient: 'from-yellow-500/10 via-transparent to-transparent',
        rewardLabel: '积分奖励'
      };
    case 'lose':
      return {
        title: '惜 败',
        titleClass: 'text-blue-400',
        glowClass: 'shadow-[0_0_60px_rgba(96,165,250,0.4)]',
        bgGradient: 'from-blue-500/10 via-transparent to-transparent',
        rewardLabel: '积分变化'
      };
    case 'draw':
      return {
        title: '平 局',
        titleClass: 'text-slate-300',
        glowClass: 'shadow-[0_0_60px_rgba(148,163,184,0.4)]',
        bgGradient: 'from-slate-400/10 via-transparent to-transparent',
        rewardLabel: '积分变化'
      };
  }
}

/** 结算动画覆盖层 */
function SettlementOverlay({
  phase,
  outcome,
  matchResult,
  user,
  onReturn
}: {
  phase: SettlementPhase;
  outcome: 'win' | 'lose' | 'draw';
  matchResult: any;
  user: any;
  onReturn: () => void;
}) {
  const config = getResultConfig(outcome);
  const myParticipant = (matchResult?.participants || []).find((p: any) => p.userId === user?.id);
  const opponentParticipant = (matchResult?.participants || []).find((p: any) => p.userId !== user?.id);
  const rewardPoints = outcome === 'win' ? matchResult?.rewards?.winnerPoints : matchResult?.rewards?.loserPoints;

  if (phase === 'hidden') return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${phase === 'animating' ? 'opacity-80' : 'opacity-90'}`} />

      {/* 粒子效果（仅胜利时） */}
      {outcome === 'win' && phase === 'animating' && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1.5 h-1.5 rounded-full bg-yellow-400"
              style={{
                left: '50%',
                top: '45%',
                animation: `sparkle-${i % 4} ${1.2 + Math.random() * 0.8}s ease-out forwards`,
                animationDelay: `${Math.random() * 0.5}s`,
                opacity: 0
              }}
            />
          ))}
        </div>
      )}

      {/* 主内容区 */}
      <div className={`relative z-10 text-center transition-all duration-700 ${phase === 'animating' ? 'scale-100 opacity-100' : 'scale-100 opacity-100'}`}>
        {/* 大标题动画 */}
        <div
          className={`text-7xl font-black tracking-[0.3em] mb-8 ${config.titleClass}`}
          style={{ animation: phase === 'animating' ? 'resultTitleIn 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards' : 'none' }}
        >
          {config.title}
        </div>

        {/* 发光效果 */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-32 rounded-full ${config.glowClass} pointer-events-none`}
          style={{ animation: phase === 'animating' ? 'glowPulse 2s ease-in-out infinite' : 'none' }}
        />

        {/* 分数对比卡片 */}
        <div
          className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-6 mb-6 border border-slate-600/50 min-w-[400px]"
          style={{ animation: phase === 'animating' ? 'slideInUp 0.8s ease-out 0.8s both' : 'none' }}
        >
          <div className="grid grid-cols-2 gap-6">
            <div className={`p-4 rounded-lg ${myParticipant?.isWinner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-700/80'}`}>
              <div className="text-sm text-slate-400 mb-1">我</div>
              <div className="text-lg font-semibold text-white">{user?.username}</div>
              <div className="text-3xl font-bold text-cyan-400 mt-1">{myParticipant?.score ?? 0}</div>
              <div className="text-xs text-slate-400 mt-1">正确 {myParticipant?.correctCount ?? 0} 题</div>
            </div>
            <div className={`p-4 rounded-lg ${opponentParticipant?.isWinner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-700/80'}`}>
              <div className="text-sm text-slate-400 mb-1">对手</div>
              <div className="text-lg font-semibold text-white">{opponentParticipant?.username || '未知'}</div>
              <div className="text-3xl font-bold text-cyan-400 mt-1">{opponentParticipant?.score ?? 0}</div>
              <div className="text-xs text-slate-400 mt-1">正确 {opponentParticipant?.correctCount ?? 0} 题</div>
            </div>
          </div>
        </div>

        {/* 积分变化 */}
        <div
          style={{ animation: phase === 'animating' ? 'floatUp 0.6s ease-out 1.5s both' : 'none' }}
        >
          <div className={`text-lg font-semibold mb-6 ${rewardPoints > 0 ? 'text-green-400' : rewardPoints < 0 ? 'text-red-400' : 'text-slate-400'}`}>
            {config.rewardLabel}：{rewardPoints > 0 ? '+' : ''}{rewardPoints ?? 0} 积分
          </div>
        </div>

        {/* 返回按钮（动画结束后显示） */}
        {phase === 'result' && (
          <div style={{ animation: 'fadeIn 0.5s ease-out forwards' }}>
            <button
              onClick={onReturn}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
            >
              返回对战列表
            </button>
            {outcome === 'lose' && (
              <button
                onClick={onReturn}
                className="ml-4 bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors text-lg"
              >
                再来一局
              </button>
            )}
          </div>
        )}
      </div>

      {/* CSS 关键帧动画 */}
      <style>{`
        @keyframes resultTitleIn {
          0% { transform: scale(0); opacity: 0; }
          60% { transform: scale(1.2); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes slideInUp {
          0% { transform: translateY(60px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes floatUp {
          0% { transform: translateY(20px); opacity: 0; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes glowPulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.8; }
        }
        @keyframes sparkle-0 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-120px, -80px) scale(0); opacity: 0; }
        }
        @keyframes sparkle-1 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(100px, -100px) scale(0); opacity: 0; }
        }
        @keyframes sparkle-2 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-80px, 100px) scale(0); opacity: 0; }
        }
        @keyframes sparkle-3 {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(110px, 70px) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function MatchBattlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    matchEvents, opponentProgress,
    emitSurrender, emitSettlementRequest, emitSettlementAgree, emitSettlementReject,
    clearMatchEvents
  } = useSocketStore();

  const [match, setMatch] = useState<any>(null);
  const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<any>(null);
  const [matchEnded, setMatchEnded] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [problemStartTime, setProblemStartTime] = useState(Date.now());
  const [countdown, setCountdown] = useState(600);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [settlementFrom, setSettlementFrom] = useState('');
  const [notifications, setNotifications] = useState<string[]>([]);
  const [programmingCode, setProgrammingCode] = useState('');
  const [programmingLanguage, setProgrammingLanguage] = useState('javascript');
  const [programmingSubmitting, setProgrammingSubmitting] = useState(false);

  // 结算冷却相关状态
  const [settlementCooldown, setSettlementCooldown] = useState(0);
  const [settlementCooldownTimer, setSettlementCooldownTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  // 对手进度（从 Socket 推送中提取非自己的进度）
  const [opponentProgressState, setOpponentProgressState] = useState<any>(null);

  // 我的提交记录：problemId -> submission
  const [mySubmissions, setMySubmissions] = useState<Record<string, any>>({});

  // 投降确认对话框
  const [showSurrenderDialog, setShowSurrenderDialog] = useState(false);

  // 结算动画状态
  const [settlementPhase, setSettlementPhase] = useState<SettlementPhase>('hidden');
  const [settlementOutcome, setSettlementOutcome] = useState<'win' | 'lose' | 'draw'>('draw');

  // 结算中加载状态
  const [settling, setSettling] = useState(false);

  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [...prev.slice(-4), msg]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== msg));
    }, 4000);
  }, []);

  // 初始化加载比赛
  useEffect(() => {
    if (id) loadMatch();
    return () => { clearMatchEvents(); };
  }, [id]);

  // 倒计时
  useEffect(() => {
    if (!match || matchEnded) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleEndMatch();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [match, matchEnded]);

  // 切换题目时重置作答状态（保留已提交的答案）
  useEffect(() => {
    const prob = getCurrentProblem();
    if (!prob?.problem) return;

    const existingSubmission = mySubmissions[prob.problem.id];

    if (prob.problem.type === 'FILL_BLANK') {
      let blankCount = 1;
      try {
        const parsed = typeof prob.problem.fillBlanks === 'string'
          ? JSON.parse(prob.problem.fillBlanks)
          : prob.problem.fillBlanks;
        blankCount = parsed?.blankCount || parsed?.length || 1;
      } catch { /* 保持默认 1 */ }

      if (existingSubmission) {
        try {
          const prev = JSON.parse(existingSubmission.answer);
          setFillAnswers(Array.isArray(prev) ? prev : Array(blankCount).fill(''));
        } catch {
          setFillAnswers(Array(blankCount).fill(''));
        }
      } else {
        setFillAnswers(Array(blankCount).fill(''));
      }
      setSelectedAnswer('');
    } else if (prob.problem.type === 'CHOICE') {
      if (existingSubmission) {
        setSelectedAnswer(existingSubmission.answer || '');
      } else {
        setSelectedAnswer('');
      }
      setFillAnswers([]);
    } else {
      if (existingSubmission?.answer && existingSubmission.answer !== 'ACCEPTED' && existingSubmission.answer !== 'WRONG_ANSWER') {
        setProgrammingCode(existingSubmission.answer);
      } else {
        setProgrammingCode('');
      }
      setSelectedAnswer('');
      setFillAnswers([]);
    }

    setProblemStartTime(Date.now());
    setLastResult(null);
    setProgrammingSubmitting(false);
  }, [currentProblemIndex, match, mySubmissions]);

  // 处理 Socket 事件
  useEffect(() => {
    for (const event of matchEvents) {
      if (event.type === 'answer' && event.userId !== user?.id) {
        addNotification(`对手完成了第 ${event.problemIndex + 1} 题`);
      }
      if (event.type === 'surrender' && event.userId !== user?.id) {
        addNotification(`${event.username} 投降了！`);
        handleEndMatch();
      }
      if (event.type === 'settlement-request') {
        if (event.userId !== user?.id) {
          setSettlementFrom(event.username);
          setShowSettlementDialog(true);
          addNotification(`${event.username} 请求提前结算`);
        }
      }
      if (event.type === 'settlement-agreed') {
        addNotification('双方同意结算！');
        handleEndMatch();
      }
      if (event.type === 'settlement-rejected') {
        addNotification('结算请求被拒绝');
        setShowSettlementDialog(false);
      }
    }
  }, [matchEvents]);

  // 处理对手进度推送
  useEffect(() => {
    if (opponentProgress && opponentProgress.userId !== user?.id) {
      setOpponentProgressState(opponentProgress);
    }
  }, [opponentProgress, user?.id]);

  // 结算冷却倒计时
  useEffect(() => {
    if (settlementCooldown <= 0) {
      if (settlementCooldownTimer) {
        clearInterval(settlementCooldownTimer);
        setSettlementCooldownTimer(null);
      }
      return;
    }
    if (!settlementCooldownTimer) {
      const timer = setInterval(() => {
        setSettlementCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setSettlementCooldownTimer(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      setSettlementCooldownTimer(timer);
    }
    return () => {
      if (settlementCooldownTimer) {
        clearInterval(settlementCooldownTimer);
      }
    };
  }, [settlementCooldown > 0]);

  // 结算动画阶段推进：animating -> result（3 秒后）
  useEffect(() => {
    if (settlementPhase !== 'animating') return;
    const timer = setTimeout(() => {
      setSettlementPhase('result');
    }, 3000);
    return () => clearTimeout(timer);
  }, [settlementPhase]);

  const loadMatch = async () => {
    try {
      setLoading(true);
      const res = await matchAPI.getById(id!);
      if (res.success) {
        const matchData = res.data;

        if (matchData.problems) {
          matchData.problems = matchData.problems.map((mp: any) => ({
            ...mp,
            problem: mp.problem
              ? {
                  ...mp.problem,
                  choices: typeof mp.problem.choices === 'string' ? JSON.parse(mp.problem.choices) : mp.problem.choices,
                  fillBlanks: typeof mp.problem.fillBlanks === 'string' ? JSON.parse(mp.problem.fillBlanks) : mp.problem.fillBlanks
                }
              : null
          }));
        }

        const submissionsMap: Record<string, any> = {};
        if (matchData.participants) {
          const me = matchData.participants.find((p: any) => p.userId === user?.id);
          if (me?.submissions) {
            for (const sub of me.submissions) {
              submissionsMap[sub.problemId] = sub;
            }
          }
        }
        setMySubmissions(submissionsMap);

        setMatch(matchData);
        if (matchData.status === 'COMPLETED') {
          setMatchEnded(true);
          try {
            const endRes = await matchAPI.endMatch(id!);
            if (endRes.success) {
              setMatchResult(endRes.data);
              triggerSettlementAnimation(endRes.data);
            }
          } catch { /* 比赛已结束 */ }
        } else {
          const timeLimit = matchData.type === '1V1_RANKED' ? 600 : 900;
          setCountdown(timeLimit);
        }
      }
    } catch (error) {
      console.error('加载比赛失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentProblem = () => {
    if (!match?.problems?.length) return null;
    return match.problems[currentProblemIndex];
  };

  /** 根据比赛结果触发结算动画 */
  const triggerSettlementAnimation = (result: any) => {
    const isWinner = result.winnerId === user?.id;
    const isDraw = !result.winnerId;
    const outcome: 'win' | 'lose' | 'draw' = isDraw ? 'draw' : isWinner ? 'win' : 'lose';
    setSettlementOutcome(outcome);
    setSettlementPhase('animating');
  };

  // 通用答案提交（CHOICE / FILL_BLANK）
  const handleSubmitAnswer = async () => {
    if (!match || submitting || matchEnded) return;
    setSubmitting(true);
    setLastResult(null);
    const time = Date.now() - problemStartTime;
    try {
      const res = await matchAPI.submitAnswer(id!, {
        problemIndex: currentProblemIndex,
        answer: selectedAnswer || JSON.stringify(fillAnswers),
        time
      });
      if (res.success) {
        setLastResult(res.data);
        const problemId = getCurrentProblem()?.problem?.id;
        if (problemId) {
          setMySubmissions(prev => ({
            ...prev,
            [problemId]: {
              problemId,
              answer: selectedAnswer || JSON.stringify(fillAnswers),
              status: res.data.isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
              score: res.data.points
            }
          }));
        }
        if (match.participants) {
          const me = match.participants.find((p: any) => p.userId === user?.id);
          if (me) {
            me.score = res.data.currentScore;
            me.correctCount = res.data.correctCount;
          }
          setMatch({ ...match });
        }
      }
    } catch (error: any) {
      console.error('提交答案失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  // 编程题提交
  const handleSubmitProgramming = async () => {
    if (!match || programmingSubmitting || !programmingCode.trim() || matchEnded) return;
    setProgrammingSubmitting(true);
    setLastResult(null);
    const time = Date.now() - problemStartTime;
    try {
      const submitRes = await submissionsAPI.submit({
        problemId: getCurrentProblem()?.problem?.id,
        type: 'PROGRAMMING',
        code: programmingCode,
        language: programmingLanguage
      });
      if (submitRes.success) {
        const resultRes = await submissionsAPI.getById(submitRes.data.id);
        const status = resultRes.success ? resultRes.data.status : '';
        const res = await matchAPI.submitAnswer(id!, {
          problemIndex: currentProblemIndex,
          answer: status,
          time
        });
        if (res.success) {
          setLastResult({
            ...res.data,
            judgeStatus: status,
            isCorrect: status === 'ACCEPTED'
          });
          const problemId = getCurrentProblem()?.problem?.id;
          if (problemId) {
            setMySubmissions(prev => ({
              ...prev,
              [problemId]: {
                problemId,
                answer: status,
                status: res.data.isCorrect ? 'ACCEPTED' : 'WRONG_ANSWER',
                score: res.data.points
              }
            }));
          }
          if (match.participants) {
            const me = match.participants.find((p: any) => p.userId === user?.id);
            if (me) {
              me.score = res.data.currentScore;
              me.correctCount = res.data.correctCount;
            }
            setMatch({ ...match });
          }
        }
      }
    } catch (error: any) {
      console.error('提交编程题失败', error);
    } finally {
      setProgrammingSubmitting(false);
    }
  };

  /** 正常结束比赛（超时、双方同意结算等） */
  const handleEndMatch = async (surrendered = false) => {
    if (matchEnded) return;
    setMatchEnded(true);
    setSettling(true);
    try {
      const res = await matchAPI.endMatch(id!, surrendered ? { surrendered: true } : undefined);
      if (res.success) {
        setMatchResult(res.data);
        triggerSettlementAnimation(res.data);
      }
    } catch (error) {
      console.error('结束比赛失败', error);
    } finally {
      setSettling(false);
    }
  };

  /** 确认投降 */
  const handleConfirmSurrender = async () => {
    setShowSurrenderDialog(false);
    emitSurrender(id!);
    addNotification('你已投降');
    await handleEndMatch(true);
  };

  /** 请求结算：冷却通过后自动发送 socket 请求 */
  const handleRequestSettlement = async () => {
    if (settlementCooldown > 0) return;
    try {
      const res = await matchAPI.requestSettlement(id!);
      if (res.success) {
        if (res.data.canSettle) {
          emitSettlementRequest(id!);
          addNotification('已发送结算请求，等待对手同意...');
          setSettlementCooldown(60);
        } else {
          const remaining = Math.ceil(res.data.remainingCooldown / 1000);
          setSettlementCooldown(remaining);
          addNotification(`请等待 ${remaining} 秒后再请求结算`);
        }
      }
    } catch (error: any) {
      console.error('请求结算失败', error);
    }
  };

  const handleAcceptSettlement = () => {
    emitSettlementAgree(id!);
    setShowSettlementDialog(false);
  };

  const handleRejectSettlement = () => {
    emitSettlementReject(id!);
    setShowSettlementDialog(false);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getMyScore = () => {
    if (!match?.participants || !user) return 0;
    const me = match.participants.find((p: any) => p.userId === user.id);
    return me?.score || 0;
  };

  const getOpponent = () => {
    if (!match?.participants || !user) return null;
    return match.participants.find((p: any) => p.userId !== user.id);
  };

  const getOpponentProblemStatus = (problemIndex: number): { answered: boolean; isCorrect: boolean } => {
    if (!opponentProgressState?.problemProgress) return { answered: false, isCorrect: false };
    const prog = opponentProgressState.problemProgress.find((p: any) => p.problemIndex === problemIndex);
    return { answered: prog?.answered || false, isCorrect: prog?.isCorrect || false };
  };

  const getMyProblemStatus = (problemIndex: number): { answered: boolean; isCorrect: boolean } => {
    const problemId = match?.problems?.[problemIndex]?.problem?.id;
    if (!problemId) return { answered: false, isCorrect: false };
    const sub = mySubmissions[problemId];
    return { answered: !!sub, isCorrect: sub?.status === 'ACCEPTED' };
  };

  const opponentData = getOpponent();
  const opponentScore = opponentProgressState?.score ?? opponentData?.score ?? 0;

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">比赛不存在</p>
        <button onClick={() => navigate('/match')} className="text-cyan-400 hover:text-cyan-300 mt-4">
          返回对战中心
        </button>
      </div>
    );
  }

  const problem = getCurrentProblem();
  const problemData = problem?.problem;

  return (
    <div className="max-w-7xl mx-auto relative">
      {/* 结算动画覆盖层 */}
      {matchResult && settlementPhase !== 'hidden' && (
        <SettlementOverlay
          phase={settlementPhase}
          outcome={settlementOutcome}
          matchResult={matchResult}
          user={user}
          onReturn={() => navigate('/match')}
        />
      )}

      {/* 通知浮层 */}
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((msg, i) => (
            <div key={i} className="bg-slate-700 border border-cyan-500/30 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse text-sm">
              {msg}
            </div>
          ))}
        </div>
      )}

      {/* 投降确认对话框 */}
      {showSurrenderDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-400" />
              <h2 className="text-xl font-semibold text-white">确认投降</h2>
            </div>
            <p className="text-slate-300 mb-6">
              确定要投降吗？这将结束比赛并判定对手获胜。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSurrenderDialog(false)}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmSurrender}
                className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                确认投降
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 结算请求对话框 */}
      {showSettlementDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <Handshake className="h-6 w-6 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">结算请求</h2>
            </div>
            <p className="text-slate-300 mb-6">
              <span className="text-cyan-400 font-semibold">{settlementFrom}</span> 请求提前结算比赛。
              同意后将按当前得分判定胜负。
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRejectSettlement}
                className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                拒绝
              </button>
              <button
                onClick={handleAcceptSettlement}
                className="flex-1 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                同意结算
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 顶部栏：退出、倒计时、分数对比 */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          退出
        </button>
        <div className={`flex items-center gap-2 ${countdown < 60 ? 'text-red-400 animate-pulse' : countdown < 180 ? 'text-yellow-400' : 'text-green-400'}`}>
          <Clock className="h-5 w-5" />
          <span className="text-2xl font-mono font-bold">{formatTime(countdown)}</span>
        </div>
      </div>

      {/* 分数对比栏 */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-sm text-slate-400">我</div>
          <div className="text-lg font-semibold text-cyan-400">{user?.username}</div>
          <div className="text-2xl font-bold text-white">{getMyScore()}分</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center flex flex-col items-center justify-center">
          <div className="text-slate-500 text-xs mb-1">VS</div>
          <div className="text-lg font-bold text-cyan-400">{getMyScore()} <span className="text-slate-500">:</span> {opponentScore}</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-3 text-center">
          <div className="text-sm text-slate-400">对手</div>
          <div className="text-lg font-semibold text-orange-400">{opponentData?.user?.username || '等待中'}</div>
          <div className="text-2xl font-bold text-white">{opponentScore}分</div>
        </div>
      </div>

      {/* 主体：左侧题目列表 + 中间题目内容 + 右侧操作面板 */}
      <div className="grid grid-cols-12 gap-4">
        {/* 左侧：题目导航列表 */}
        <div className="col-span-2">
          <div className="bg-slate-800 rounded-xl p-3 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 text-center">题目列表</h3>
            <div className="space-y-2">
              {match.problems?.map((mp: any, i: number) => {
                const myStatus = getMyProblemStatus(i);
                const oppStatus = getOpponentProblemStatus(i);
                const isActive = i === currentProblemIndex;

                return (
                  <button
                    key={i}
                    onClick={() => !matchEnded && setCurrentProblemIndex(i)}
                    disabled={matchEnded}
                    className={`w-full p-2 rounded-lg text-left transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border border-cyan-500/50'
                        : 'bg-slate-700/50 border border-transparent hover:bg-slate-700'
                    } ${matchEnded ? 'cursor-not-allowed opacity-60' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {i + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        {myStatus.answered && (
                          myStatus.isCorrect
                            ? <CheckCircle className="h-3 w-3 text-green-400" />
                            : <XCircle className="h-3 w-3 text-red-400" />
                        )}
                        {oppStatus.answered && (
                          <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" title="对手已作答" />
                        )}
                      </div>
                    </div>
                    <div className={`text-xs mt-1 truncate ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      {TYPE_LABELS[mp.problem?.type] || '题目'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 中间：题目内容 + 作答区域 */}
        <div className="col-span-7">
          {/* 比赛已结束遮罩 */}
          {matchEnded && (
            <div className="bg-slate-800/90 rounded-xl p-12 shadow-xl text-center mb-4 border border-slate-600/50">
              <div className="text-4xl mb-4">🏁</div>
              <h2 className="text-2xl font-bold text-slate-300 mb-2">比赛已结束</h2>
              <p className="text-slate-400 mb-4">
                {settling ? '结算中...' : '等待结算动画...'}
              </p>
              {settlementPhase === 'result' && (
                <button
                  onClick={() => navigate('/match')}
                  className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
                >
                  返回对战列表
                </button>
              )}
            </div>
          )}

          {problemData && !matchEnded ? (
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              {/* 题目标题栏 */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">{problemData.title || `题目 ${currentProblemIndex + 1}`}</h2>
                  <span className={`text-xs px-2 py-1 rounded ${DIFFICULTY_STYLES[problemData.difficulty]?.bg || ''} ${DIFFICULTY_STYLES[problemData.difficulty]?.text || 'text-slate-400'}`}>
                    {DIFFICULTY_STYLES[problemData.difficulty]?.label || problemData.difficulty}
                  </span>
                  <span className="text-xs px-2 py-1 rounded bg-slate-700 text-slate-300">
                    {TYPE_LABELS[problemData.type] || problemData.type}
                  </span>
                </div>
                {mySubmissions[problemData.id] && (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <RotateCcw className="h-3 w-3" />
                    可重提交
                  </span>
                )}
              </div>

              {/* 题目描述 */}
              <div className="prose prose-invert max-w-none mb-6">
                <MarkdownRenderer content={problemData.description} />
              </div>

              {/* 选择题作答 */}
              {problemData.type === 'CHOICE' && problemData.choices && (
                <div className="space-y-3">
                  {problemData.choices.map((choice: any) => (
                    <label
                      key={choice.key}
                      className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                        selectedAnswer === choice.key
                          ? 'bg-cyan-500/20 border-2 border-cyan-500'
                          : 'bg-slate-700 hover:bg-slate-600 border-2 border-transparent'
                      }`}
                    >
                      <input
                        type="radio"
                        name="matchAnswer"
                        value={choice.key}
                        checked={selectedAnswer === choice.key}
                        onChange={(e) => setSelectedAnswer(e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-white">{choice.key}. {choice.text}</span>
                    </label>
                  ))}
                </div>
              )}

              {/* 填空题作答 */}
              {problemData.type === 'FILL_BLANK' && (
                <div className="space-y-3">
                  {fillAnswers.map((_, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded-lg font-bold text-sm">{index + 1}</span>
                      <input
                        type="text"
                        value={fillAnswers[index]}
                        onChange={(e) => {
                          const newAnswers = [...fillAnswers];
                          newAnswers[index] = e.target.value;
                          setFillAnswers(newAnswers);
                        }}
                        placeholder={`第 ${index + 1} 空`}
                        className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* 编程题作答 */}
              {problemData.type === 'PROGRAMMING' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-slate-300">代码编辑器</h4>
                    <select
                      value={programmingLanguage}
                      onChange={(e) => setProgrammingLanguage(e.target.value)}
                      className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                    </select>
                  </div>
                  <div style={{ height: '350px' }}>
                    <Editor
                      height="100%"
                      language={
                        programmingLanguage === 'python' ? 'python'
                        : programmingLanguage === 'cpp' || programmingLanguage === 'c' ? 'cpp'
                        : 'javascript'
                      }
                      value={programmingCode}
                      onChange={(value) => setProgrammingCode(value || '')}
                      theme="vs-dark"
                      options={{
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineNumbers: 'on',
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 8 },
                        readOnly: matchEnded,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* 提交按钮 */}
              {problemData.type === 'PROGRAMMING' ? (
                <button
                  onClick={handleSubmitProgramming}
                  disabled={programmingSubmitting || !programmingCode.trim() || matchEnded}
                  className="mt-6 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {programmingSubmitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> 判题中...</>
                  ) : (
                    <><CheckCircle className="h-5 w-5" /> {mySubmissions[problemData.id] ? '重新提交' : '提交代码'}</>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleSubmitAnswer}
                  disabled={submitting || (!selectedAnswer && fillAnswers.every(a => !a)) || matchEnded}
                  className="mt-6 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="h-5 w-5 animate-spin" /> 提交中...</>
                  ) : (
                    <>
                      <CheckCircle className="h-5 w-5" />
                      {mySubmissions[problemData.id] ? '重新提交' : '提交答案'}
                    </>
                  )}
                </button>
              )}

              {/* 提交结果反馈 */}
              {lastResult && (
                <div className={`mt-4 p-4 rounded-lg ${lastResult.isCorrect ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                  <div className="flex items-center gap-2">
                    {lastResult.isCorrect ? <CheckCircle className="h-5 w-5 text-green-400" /> : <XCircle className="h-5 w-5 text-red-400" />}
                    <span className={`font-semibold ${lastResult.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      {lastResult.isCorrect ? '回答正确！' : '回答错误'}
                    </span>
                    {lastResult.isCorrect && lastResult.points > 0 && (
                      <span className="text-yellow-400 ml-2">+{lastResult.points}分</span>
                    )}
                    {lastResult.isResubmission && (
                      <span className="text-slate-400 text-xs ml-2">（重提交）</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : !matchEnded ? (
            <div className="text-center py-20 text-slate-400">题目数据加载中...</div>
          ) : null}
        </div>

        {/* 右侧：操作面板 + 对手进度 */}
        <div className="col-span-3 space-y-4">
          {/* 对手进度面板 */}
          <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              对手进度
            </h3>
            <div className="space-y-2">
              {match.problems?.map((mp: any, i: number) => {
                const oppStatus = getOpponentProblemStatus(i);
                const myStatus = getMyProblemStatus(i);
                return (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="text-slate-500 w-6">P{i + 1}</span>
                    <span className="text-slate-400 flex-1 truncate">{TYPE_LABELS[mp.problem?.type] || ''}</span>
                    <div className="flex items-center gap-2">
                      {myStatus.answered ? (
                        myStatus.isCorrect
                          ? <span className="text-green-400" title="我：正确">✓</span>
                          : <span className="text-red-400" title="我：错误">✗</span>
                      ) : (
                        <span className="text-slate-600" title="我：未答">—</span>
                      )}
                      <span className="text-slate-600">|</span>
                      {oppStatus.answered ? (
                        oppStatus.isCorrect
                          ? <span className="text-green-400" title="对手：正确">✓</span>
                          : <span className="text-red-400" title="对手：错误">✗</span>
                      ) : (
                        <span className="text-slate-600" title="对手：未答">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 操作面板 */}
          <div className="bg-slate-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-sm font-semibold text-slate-400 mb-3">操作</h3>
            <div className="space-y-2">
              {matchEnded ? (
                /* 比赛结束后显示返回按钮 */
                <button
                  onClick={() => navigate('/match')}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors border border-cyan-500/30 text-sm"
                >
                  <ArrowLeft className="h-4 w-4" />
                  返回对战列表
                </button>
              ) : (
                <>
                  {/* 申请结算按钮 */}
                  <button
                    onClick={handleRequestSettlement}
                    disabled={settlementCooldown > 0 || settling}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors border border-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {settling ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        结算中...
                      </>
                    ) : settlementCooldown > 0 ? (
                      <>
                        <Timer className="h-4 w-4" />
                        冷却中 {settlementCooldown}s
                      </>
                    ) : (
                      <>
                        <Handshake className="h-4 w-4" />
                        申请结算
                      </>
                    )}
                  </button>

                  {/* 投降按钮 */}
                  <button
                    onClick={() => setShowSurrenderDialog(true)}
                    disabled={settling}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Flag className="h-4 w-4" />
                    投降
                  </button>
                </>
              )}
            </div>

            {/* 对战动态 */}
            <div className="border-t border-slate-700 pt-3 mt-3">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="h-4 w-4 text-slate-400" />
                <span className="text-xs text-slate-400">对战动态</span>
              </div>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {matchEvents.filter(e => e.type === 'answer' || e.type === 'surrender').map((event, i) => (
                  <div key={i} className="text-xs text-slate-500">
                    {event.type === 'answer' && `${event.username} 完成了第 ${event.problemIndex + 1} 题`}
                    {event.type === 'surrender' && `${event.username} 投降了`}
                  </div>
                ))}
                {matchEvents.filter(e => e.type === 'answer' || e.type === 'surrender').length === 0 && (
                  <p className="text-xs text-slate-600">暂无动态</p>
                )}
              </div>
            </div>

            <div className="border-t border-slate-700 pt-3 mt-3">
              <p className="text-xs text-slate-500">
                提示：可自由切换题目，支持重提交。申请结算需双方同意，60秒冷却。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
