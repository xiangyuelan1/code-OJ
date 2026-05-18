import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { examAPI, aiAPI } from '../services/api';
import {
  ArrowLeft, CheckCircle, XCircle, Clock, FileText, Trophy, Code,
  Lightbulb, Loader2, ChevronDown, ChevronUp
} from 'lucide-react';

export function ExamResultPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [aiAnalyses, setAiAnalyses] = useState<Record<string, string>>({});
  const [aiLoadingMap, setAiLoadingMap] = useState<Record<string, boolean>>({});
  const [expandedAnalysis, setExpandedAnalysis] = useState<Record<string, boolean>>({});
  const [expandedAi, setExpandedAi] = useState<Record<string, boolean>>({});
  const [wrongSectionExpanded, setWrongSectionExpanded] = useState(true);
  const [batchAiLoading, setBatchAiLoading] = useState(false);

  useEffect(() => {
    fetchResult();
  }, [examId]);

  const fetchResult = async () => {
    try {
      const res = await examAPI.getResult(examId!);
      if (res.success && res.data) {
        setResult(res.data);
      }
    } catch (error) {
      console.error('获取考试结果失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAIAnalysis = useCallback(async (problemId: string, title: string, description: string) => {
    if (aiAnalyses[problemId]) return;
    setAiLoadingMap(prev => ({ ...prev, [problemId]: true }));
    try {
      const res = await aiAPI.getHint({ problem: { title, description } });
      if (res.success) {
        setAiAnalyses(prev => ({ ...prev, [problemId]: res.data.hint }));
      }
    } catch {
      setAiAnalyses(prev => ({ ...prev, [problemId]: 'AI解析暂时不可用' }));
    } finally {
      setAiLoadingMap(prev => ({ ...prev, [problemId]: false }));
    }
  }, [aiAnalyses]);

  const fetchBatchAIAnalysis = useCallback(async () => {
    if (!result) return;
    const exam = result.exam;
    const questions = exam?.questions || [];
    const questionResults: any[] = result.questionResults || [];
    const wrongQuestions = questions.filter((q: any) => {
      const qr = questionResults.find((r: any) => r.problemId === q.problemId);
      return qr && !qr.isCorrect;
    });

    const pending = wrongQuestions.filter((q: any) => !aiAnalyses[q.problemId] && !aiLoadingMap[q.problemId]);
    if (pending.length === 0) return;

    setBatchAiLoading(true);
    for (const q of pending) {
      await fetchAIAnalysis(q.problemId, q.problem?.title || '', q.problem?.description || '');
    }
    setBatchAiLoading(false);
  }, [result, aiAnalyses, aiLoadingMap, fetchAIAnalysis]);

  const toggleAnalysis = (problemId: string) => {
    setExpandedAnalysis(prev => ({ ...prev, [problemId]: !prev[problemId] }));
  };

  const toggleAi = (problemId: string) => {
    setExpandedAi(prev => ({ ...prev, [problemId]: !prev[problemId] }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">加载中...</div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-xl mb-4">未找到考试记录</p>
          <Link to="/exams" className="text-cyan-400 hover:text-cyan-300">
            返回考试列表
          </Link>
        </div>
      </div>
    );
  }

  const exam = result.exam;
  const questions = exam?.questions || [];
  const questionResults: any[] = result.questionResults || [];
  const answers = result.answers || {};
  const totalScore = questions.reduce((sum: number, q: any) => sum + q.points, 0);
  const earnedScore = result.score || 0;
  const timeSpent = result.endTime
    ? Math.round((new Date(result.endTime).getTime() - new Date(result.startTime).getTime()) / 1000)
    : 0;
  const correctCount = questionResults.filter((r: any) => r.isCorrect).length;
  const wrongCount = questionResults.filter((r: any) => !r.isCorrect).length;

  const wrongQuestions = questions.filter((q: any) => {
    const qr = questionResults.find((r: any) => r.problemId === q.problemId);
    return qr && !qr.isCorrect;
  });

  const getScoreColor = () => {
    const ratio = totalScore > 0 ? earnedScore / totalScore : 0;
    if (ratio >= 0.8) return 'text-green-400';
    if (ratio >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = () => {
    const ratio = totalScore > 0 ? earnedScore / totalScore : 0;
    if (ratio >= 0.8) return 'bg-green-500/10 border-green-500/30';
    if (ratio >= 0.6) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-red-500/10 border-red-500/30';
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs}秒`;
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PROGRAMMING': return '编程题';
      case 'CHOICE': return '选择题';
      case 'FILL_BLANK': return '填空题';
      default: return type;
    }
  };

  const getKnowledgePoint = (q: any): string => {
    const tags = q.problem?.tags;
    if (Array.isArray(tags) && tags.length > 0) return tags[0];
    if (typeof tags === 'string') {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
      } catch { /* ignore */ }
    }
    return q.problem?.knowledgeTree?.name || '未分类';
  };

  const wrongByKnowledge = wrongQuestions.reduce((acc: Record<string, any[]>, q: any) => {
    const kp = getKnowledgePoint(q);
    if (!acc[kp]) acc[kp] = [];
    acc[kp].push(q);
    return acc;
  }, {});

  const renderAnalysisContent = (q: any, qr: any) => {
    const type = q.problem?.type;
    const description = q.problem?.description;

    return (
      <div className="mt-4 p-4 bg-slate-900/60 rounded-lg border border-slate-700 space-y-3">
        {description && (
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-1">题目描述</h4>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{description}</p>
          </div>
        )}

        {type === 'CHOICE' && qr?.detail?.correctAnswer && (
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-1">正确答案解析</h4>
            <p className="text-sm text-slate-300">
              正确答案为 <span className="text-green-400 font-medium">{qr.detail.correctAnswer}</span>。
              {q.problem?.choices && Array.isArray(q.problem.choices) && (
                <>
                  {' '}该选项是唯一符合题意的正确选择，请注意区分各选项之间的关键差异。
                </>
              )}
            </p>
          </div>
        )}

        {type === 'FILL_BLANK' && qr?.detail?.correctAnswers && (
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-1">正确答案解析</h4>
            <p className="text-sm text-slate-300">
              正确答案为 <span className="text-green-400 font-medium">{qr.detail.correctAnswers.join('、')}</span>。
              填空题需要精确匹配，注意大小写、空格和标点符号。
            </p>
          </div>
        )}

        {type === 'PROGRAMMING' && (
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-1">解题思路</h4>
            <p className="text-sm text-slate-300">
              {qr?.detail?.testResults
                ? `当前通过了 ${qr.detail.passedCount}/${qr.detail.totalCount} 个测试用例。建议检查边界条件、特殊输入处理以及算法的时间/空间复杂度是否满足要求。`
                : '建议先理清题目要求，确定合适的算法与数据结构，再逐步实现并验证。'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderAiSection = (problemId: string) => {
    const isLoading = aiLoadingMap[problemId];
    const analysis = aiAnalyses[problemId];
    const isExpanded = expandedAi[problemId];

    return (
      <div className="mt-3">
        <button
          onClick={() => {
            toggleAi(problemId);
            if (!analysis && !isLoading) {
              const q = questions.find((item: any) => item.problemId === problemId);
              if (q?.problem) {
                fetchAIAnalysis(problemId, q.problem.title || '', q.problem.description || '');
              }
            }
          }}
          className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Lightbulb className="h-4 w-4" />
          <span>AI解析</span>
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-lg">
            {isLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>AI 正在分析中...</span>
              </div>
            ) : analysis ? (
              <div>
                <h4 className="text-sm font-medium text-amber-400 mb-2 flex items-center gap-1">
                  <Lightbulb className="h-4 w-4" />
                  AI 解析结果
                </h4>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{analysis}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">点击上方按钮获取 AI 解析</p>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/exams')}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          返回考试列表
        </button>

        {/* 成绩总览 */}
        <div className={`rounded-xl p-8 border ${getScoreBg()} mb-8`}>
          <div className="text-center">
            <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-400" />
            <h1 className="text-2xl font-bold text-white mb-2">{exam?.title || '考试结果'}</h1>
            <div className={`text-6xl font-bold ${getScoreColor()} mb-2`}>
              {earnedScore}
              <span className="text-2xl text-slate-400">/{totalScore}</span>
            </div>
            <p className="text-slate-400">总分</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
              <div className="text-2xl font-bold text-white">{correctCount}/{questions.length}</div>
              <div className="text-sm text-slate-400">正确题数</div>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <Clock className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
              <div className="text-2xl font-bold text-white">{formatTime(timeSpent)}</div>
              <div className="text-sm text-slate-400">用时</div>
            </div>
            <div className="text-center p-4 bg-slate-800/50 rounded-lg">
              <FileText className="h-8 w-8 mx-auto mb-2 text-purple-400" />
              <div className="text-2xl font-bold text-white">{questions.length}</div>
              <div className="text-sm text-slate-400">总题数</div>
            </div>
          </div>
        </div>

        {/* 错题解析汇总区域 */}
        {wrongCount > 0 && (
          <div className="mb-8 bg-slate-800 rounded-xl border border-red-500/20 overflow-hidden">
            <button
              onClick={() => setWrongSectionExpanded(!wrongSectionExpanded)}
              className="w-full flex items-center justify-between p-6 hover:bg-slate-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <XCircle className="h-6 w-6 text-red-400" />
                <h2 className="text-xl font-semibold text-white">错题解析</h2>
                <span className="text-sm px-2 py-0.5 bg-red-500/20 text-red-400 rounded">
                  {wrongCount} 道错题
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    fetchBatchAIAnalysis();
                  }}
                  disabled={batchAiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  {batchAiLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Lightbulb className="h-4 w-4" />
                  )}
                  一键AI解析
                </button>
                {wrongSectionExpanded ? (
                  <ChevronUp className="h-5 w-5 text-slate-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-slate-400" />
                )}
              </div>
            </button>

            {wrongSectionExpanded && (
              <div className="px-6 pb-6 space-y-6">
                {Object.entries(wrongByKnowledge).map(([knowledge, items]) => (
                  <div key={knowledge}>
                    <h3 className="text-sm font-medium text-cyan-400 mb-3 flex items-center gap-2">
                      <span className="w-1 h-4 bg-cyan-400 rounded-full" />
                      {knowledge}
                      <span className="text-slate-500">({(items as any[]).length}题)</span>
                    </h3>
                    <div className="space-y-3">
                      {(items as any[]).map((q: any) => {
                        const qr = questionResults.find((r: any) => r.problemId === q.problemId);
                        const userAnswer = answers[q.problemId];
                        const problemId = q.problemId;

                        return (
                          <div
                            key={q.id}
                            className="bg-slate-900/60 rounded-lg p-4 border-l-4 border-l-red-500"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-red-400" />
                                <span className="text-white font-medium text-sm">{q.problem?.title}</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded text-slate-400">
                                  {getTypeName(q.problem?.type || '')}
                                </span>
                              </div>
                              <span className="text-sm text-red-400">
                                {qr?.earnedPoints || 0}/{q.points} 分
                              </span>
                            </div>

                            <div className="text-sm text-slate-400 space-y-1">
                              {q.problem?.type === 'CHOICE' && (
                                <>
                                  <div>你的答案: <span className="text-white">{userAnswer || '未作答'}</span></div>
                                  {qr?.detail?.correctAnswer && (
                                    <div>正确答案: <span className="text-green-400">{qr.detail.correctAnswer}</span></div>
                                  )}
                                </>
                              )}
                              {q.problem?.type === 'FILL_BLANK' && (
                                <>
                                  <div>你的答案: <span className="text-white">
                                    {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || '未作答'}
                                  </span></div>
                                  {qr?.detail?.correctAnswers && (
                                    <div>正确答案: <span className="text-green-400">{qr.detail.correctAnswers.join(', ')}</span></div>
                                  )}
                                </>
                              )}
                              {q.problem?.type === 'PROGRAMMING' && (
                                <div>
                                  测试通过: {qr?.detail?.passedCount || 0}/{qr?.detail?.totalCount || 0}
                                </div>
                              )}
                            </div>

                            {/* 查看解析 */}
                            <div className="mt-3">
                              <button
                                onClick={() => toggleAnalysis(problemId)}
                                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                              >
                                <FileText className="h-4 w-4" />
                                <span>查看解析</span>
                                {expandedAnalysis[problemId] ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <ChevronDown className="h-4 w-4" />
                                )}
                              </button>
                              {expandedAnalysis[problemId] && renderAnalysisContent(q, qr)}
                            </div>

                            {/* AI解析 */}
                            {renderAiSection(problemId)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 题号导航 */}
        <div className="mb-6 bg-slate-800 rounded-xl p-4 shadow-xl">
          <h2 className="text-sm font-semibold text-slate-400 mb-3">题号导航</h2>
          <div className="flex flex-wrap gap-2">
            {questions.map((q: any, idx: number) => {
              const qr = questionResults.find((r: any) => r.problemId === q.problemId);
              const isCorrect = qr?.isCorrect;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    const el = document.getElementById(`question-${idx}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold transition-colors ${
                    isCorrect
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30'
                      : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                  }`}
                  title={q.problem?.title || `第 ${idx + 1} 题`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>

        {/* 答题详情 */}
        <h2 className="text-xl font-semibold text-white mb-4">答题详情</h2>
        <div className="space-y-4">
          {questions.map((q: any, idx: number) => {
            const qr = questionResults.find((r: any) => r.problemId === q.problemId);
            const userAnswer = answers[q.problemId];
            const isCorrect = qr?.isCorrect;
            const problemId = q.problemId;

            return (
              <div
                key={q.id}
                id={`question-${idx}`}
                className={`bg-slate-800 rounded-lg p-6 border-l-4 ${
                  isCorrect ? 'border-l-green-500' : 'border-l-red-500'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400">第 {idx + 1} 题</span>
                    <span className="text-xs px-2 py-1 bg-slate-700 rounded">
                      {getTypeName(q.problem?.type || qr?.type || '')}
                    </span>
                    {isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400" />
                    )}
                  </div>
                  <div className="text-sm">
                    <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                      {qr?.earnedPoints || 0}
                    </span>
                    <span className="text-slate-400">/{q.points} 分</span>
                  </div>
                </div>

                <h3 className="text-white font-medium mb-3">{q.problem?.title}</h3>

                {q.problem?.type === 'PROGRAMMING' && userAnswer && typeof userAnswer === 'object' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      <Code className="h-4 w-4" />
                      <span>语言: {userAnswer.language || 'javascript'}</span>
                    </div>
                    <pre className="bg-slate-900 p-3 rounded text-sm font-mono text-slate-300 overflow-auto max-h-40">
                      {userAnswer.code || '(未作答)'}
                    </pre>
                    {qr?.detail?.testResults && (
                      <div className="mt-2">
                        <span className="text-sm text-slate-400">
                          测试结果: {qr.detail.passedCount}/{qr.detail.totalCount} 通过
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {q.problem?.type === 'CHOICE' && (
                  <div className="space-y-1 text-sm">
                    <div className="text-slate-400">
                      你的答案: <span className="text-white">{userAnswer || '未作答'}</span>
                    </div>
                    {!isCorrect && qr?.detail?.correctAnswer && (
                      <div className="text-slate-400">
                        正确答案: <span className="text-green-400">{qr.detail.correctAnswer}</span>
                      </div>
                    )}
                  </div>
                )}

                {q.problem?.type === 'FILL_BLANK' && (
                  <div className="space-y-1 text-sm">
                    <div className="text-slate-400">
                      你的答案: <span className="text-white">
                        {Array.isArray(userAnswer) ? userAnswer.join(', ') : userAnswer || '未作答'}
                      </span>
                    </div>
                    {!isCorrect && qr?.detail?.correctAnswers && (
                      <div className="text-slate-400">
                        正确答案: <span className="text-green-400">{qr.detail.correctAnswers.join(', ')}</span>
                      </div>
                    )}
                  </div>
                )}

                {!userAnswer && (
                  <p className="text-slate-500 text-sm italic">未作答</p>
                )}

                {/* 错题查看解析与AI解析 */}
                {!isCorrect && (
                  <>
                    <div className="mt-4 border-t border-slate-700 pt-4">
                      <button
                        onClick={() => toggleAnalysis(problemId)}
                        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <FileText className="h-4 w-4" />
                        <span>查看解析</span>
                        {expandedAnalysis[problemId] ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </button>
                      {expandedAnalysis[problemId] && renderAnalysisContent(q, qr)}
                    </div>

                    {renderAiSection(problemId)}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Link
            to="/exams"
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            返回考试列表
          </Link>
        </div>
      </div>
    </div>
  );
}
