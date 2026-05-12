import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { matchAPI } from '../services/api';
import { useSocketStore } from '../services/socket';
import { useAuthStore } from '../stores/auth.store';
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2, Flag, Handshake, X, MessageCircle } from 'lucide-react';

export function MatchBattlePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { matchEvents, emitSurrender, emitSettlementRequest, emitSettlementReject, clearMatchEvents } = useSocketStore();

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
  const [opponentAnswered, setOpponentAnswered] = useState<Record<number, boolean>>({});
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = useCallback((msg: string) => {
    setNotifications(prev => [...prev.slice(-4), msg]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n !== msg));
    }, 4000);
  }, []);

  useEffect(() => {
    if (id) loadMatch();
    return () => { clearMatchEvents(); };
  }, [id]);

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

  useEffect(() => {
    const prob = getCurrentProblem();
    if (prob?.problem?.type === 'FILL_BLANK') {
      const blanks = prob.problem.fillBlanks ? (typeof prob.problem.fillBlanks === 'string' ? JSON.parse(prob.problem.fillBlanks) : prob.problem.fillBlanks) : [];
      const count = blanks.length || (prob.problem.description?.match(/_____/g) || []).length || 1;
      setFillAnswers(Array(count).fill(''));
    } else {
      setSelectedAnswer('');
    }
    setProblemStartTime(Date.now());
    setLastResult(null);
  }, [currentProblemIndex, match]);

  useEffect(() => {
    for (const event of matchEvents) {
      if (event.type === 'answer' && event.userId !== user?.id) {
        setOpponentAnswered(prev => ({ ...prev, [event.problemIndex]: true }));
        addNotification(`对手完成了第 ${event.problemIndex + 1} 题`);
      }
      if (event.type === 'surrender' && event.userId !== user?.id) {
        addNotification(`${event.username} 投降了！`);
        setTimeout(() => handleEndMatch(), 2000);
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
        setTimeout(() => handleEndMatch(), 1000);
      }
      if (event.type === 'settlement-rejected') {
        addNotification('结算请求被拒绝');
        setShowSettlementDialog(false);
      }
    }
  }, [matchEvents]);

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
        setMatch(matchData);
        if (matchData.status === 'COMPLETED') {
          setMatchEnded(true);
          try {
            const endRes = await matchAPI.endMatch(id!);
            if (endRes.success) setMatchResult(endRes.data);
          } catch {}
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

  const handleSubmitAnswer = async () => {
    if (!match || submitting) return;
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
        if (res.data && match.problems && currentProblemIndex < match.problems.length - 1) {
          setTimeout(() => {
            setCurrentProblemIndex(prev => prev + 1);
          }, 1500);
        } else {
          setTimeout(() => handleEndMatch(), 1500);
        }
      }
    } catch (error: any) {
      console.error('提交答案失败', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndMatch = async () => {
    if (matchEnded) return;
    setMatchEnded(true);
    try {
      const res = await matchAPI.endMatch(id!);
      if (res.success) setMatchResult(res.data);
    } catch (error) {
      console.error('结束比赛失败', error);
    }
  };

  const handleSurrender = () => {
    if (!confirm('确定要投降吗？这将结束比赛并判定对手获胜。')) return;
    emitSurrender(id!);
    addNotification('你已投降');
    setTimeout(() => handleEndMatch(), 1000);
  };

  const handleRequestSettlement = () => {
    emitSettlementRequest(id!);
    addNotification('已发送结算请求，等待对手同意...');
  };

  const handleAcceptSettlement = () => {
    emitSettlementRequest(id!);
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

  if (matchEnded && matchResult) {
    const isWinner = matchResult.winnerId === user?.id;
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="text-6xl mb-6">{isWinner ? '🏆' : '💪'}</div>
        <h1 className={`text-4xl font-bold mb-4 ${isWinner ? 'text-yellow-400' : 'text-slate-300'}`}>
          {isWinner ? '恭喜获胜！' : '再接再厉！'}
        </h1>
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="grid grid-cols-2 gap-6">
            {(matchResult.participants || []).map((p: any) => (
              <div
                key={p.userId}
                className={`p-4 rounded-lg ${p.isWinner ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-slate-700'}`}
              >
                <div className="text-lg font-semibold text-white">{p.user?.username || p.username || '未知'}</div>
                <div className="text-3xl font-bold text-cyan-400 mt-2">{p.score}</div>
                <div className="text-sm text-slate-400">正确 {p.correctCount} 题</div>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={() => navigate('/match')}
          className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          返回对战中心
        </button>
      </div>
    );
  }

  const problem = getCurrentProblem();
  const problemData = problem?.problem;
  const totalProblems = match.problems?.length || 0;

  return (
    <div className="max-w-7xl mx-auto relative">
      {notifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2">
          {notifications.map((msg, i) => (
            <div key={i} className="bg-slate-700 border border-cyan-500/30 text-white px-4 py-2 rounded-lg shadow-lg animate-pulse text-sm">
              {msg}
            </div>
          ))}
        </div>
      )}

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

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/match')}
          className="flex items-center text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          退出
        </button>
        <div className="flex items-center gap-6">
          <div className={`flex items-center gap-2 ${countdown < 60 ? 'text-red-400 animate-pulse' : countdown < 180 ? 'text-yellow-400' : 'text-green-400'}`}>
            <Clock className="h-5 w-5" />
            <span className="text-2xl font-mono font-bold">{formatTime(countdown)}</span>
          </div>
          <span className="text-slate-400">
            第 {currentProblemIndex + 1}/{totalProblems} 题
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-400">我</div>
          <div className="text-lg font-semibold text-cyan-400">{user?.username}</div>
          <div className="text-2xl font-bold text-white">{getMyScore()}分</div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center flex flex-col items-center justify-center">
          <div className="text-slate-500 text-xs mb-1">VS</div>
          <div className="flex gap-2">
            {match.problems?.map((_: any, i: number) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i === currentProblemIndex
                    ? 'bg-cyan-500 text-white'
                    : opponentAnswered[i]
                    ? 'bg-orange-500/20 text-orange-400'
                    : i < currentProblemIndex
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-slate-700 text-slate-500'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-800 rounded-lg p-4 text-center">
          <div className="text-sm text-slate-400">对手</div>
          <div className="text-lg font-semibold text-orange-400">{getOpponent()?.user?.username || '等待中'}</div>
          <div className="text-2xl font-bold text-white">{getOpponent()?.score || 0}分</div>
        </div>
      </div>

      {problemData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">{problemData.title || `题目 ${currentProblemIndex + 1}`}</h2>
              <span className={`text-xs px-2 py-1 rounded ${
                problemData.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                problemData.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                {problemData.difficulty === 'EASY' ? '简单' : problemData.difficulty === 'MEDIUM' ? '中等' : '困难'}
              </span>
            </div>
            <div className="text-slate-300 whitespace-pre-wrap mb-6">{problemData.description}</div>

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

            <button
              onClick={handleSubmitAnswer}
              disabled={submitting || (!selectedAnswer && fillAnswers.every(a => !a))}
              className="mt-6 w-full bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <><Loader2 className="h-5 w-5 animate-spin" /> 提交中...</>
              ) : (
                <><CheckCircle className="h-5 w-5" /> 提交答案</>
              )}
            </button>

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
                </div>
              </div>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-xl flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-4">操作面板</h3>

            <div className="space-y-3 flex-1">
              <button
                onClick={handleRequestSettlement}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors border border-blue-500/30"
              >
                <Handshake className="h-4 w-4" />
                申请结算
              </button>

              <button
                onClick={handleSurrender}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors border border-red-500/30"
              >
                <Flag className="h-4 w-4" />
                投降
              </button>

              <div className="border-t border-slate-700 pt-3 mt-3">
                <div className="flex items-center gap-2 mb-3">
                  <MessageCircle className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-400">对战动态</span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto">
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

              <div className="border-t border-slate-700 pt-3">
                <p className="text-xs text-slate-500">
                  💡 提示：申请结算需双方同意后才生效。投降将直接判负。
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-20 text-slate-400">题目数据加载中...</div>
      )}
    </div>
  );
}
