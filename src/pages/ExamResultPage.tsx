import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { examAPI } from '../services/api';
import { ArrowLeft, CheckCircle, XCircle, Clock, FileText, Trophy, Code } from 'lucide-react';

export function ExamResultPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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

        <h2 className="text-xl font-semibold text-white mb-4">答题详情</h2>
        <div className="space-y-4">
          {questions.map((q: any, idx: number) => {
            const qr = questionResults.find((r: any) => r.problemId === q.problemId);
            const userAnswer = answers[q.problemId];
            const isCorrect = qr?.isCorrect;

            return (
              <div
                key={q.id}
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
