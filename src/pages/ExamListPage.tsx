import { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { examAPI } from '../services/api';
import { Clock, Users, FileText, Trophy, ArrowLeft, User } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { MarkdownRenderer } from '../components/MarkdownEditor';

export function ExamListPage() {
  const [exams, setExams] = useState<any[]>([]);
  const [myAttempts, setMyAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExams();
  }, []);

  const fetchExams = async () => {
    try {
      const response = await examAPI.getAll();
      if (response.success) {
        setExams(response.data || []);
      }
      const attemptsRes = await examAPI.getMyAttempts();
      if (attemptsRes.success) {
        setMyAttempts(attemptsRes.data || []);
      }
    } catch (error) {
      console.error('获取考试列表失败:', error);
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

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PRACTICE': return '练习';
      case 'EXAM': return '正式考试';
      case 'QUIZ': return '测验';
      default: return type;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">考试中心</h1>
        </div>

        {exams.length > 0 && (
          <div className="mb-10">
            <h2 className="text-xl font-semibold text-white mb-4">可参加的考试</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {exams.map((exam) => (
                <div
                  key={exam.id}
                  className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors"
                >
                  <h3 className="text-xl font-semibold mb-3 text-cyan-400">{exam.title}</h3>
                  {exam.description && (
                    <p className="text-slate-400 text-sm mb-4 line-clamp-2">{exam.description}</p>
                  )}

                  <div className="space-y-2 text-sm text-slate-400">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>时长: {exam.duration} 分钟</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      <span>题目数: {exam._count?.questions || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>参与人数: {exam._count?.attempts || 0}</span>
                    </div>
                    {exam.creator && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>创建者: {exam.creator.username}</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-xs px-2 py-1 bg-slate-700 rounded">
                      {getTypeName(exam.type)}
                    </span>
                    <Link
                      to={`/exam/${exam.id}`}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg text-sm transition-colors"
                    >
                      开始考试
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {myAttempts.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-4">我的考试记录</h2>
            <div className="space-y-4">
              {myAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="bg-slate-800 rounded-lg p-6 hover:bg-slate-700 transition-colors cursor-pointer"
                  onClick={() => navigate(`/exam/${attempt.examId}/result`)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{attempt.exam?.title || '考试'}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                        <span className={`px-2 py-1 rounded text-xs ${
                          attempt.status === 'GRADED'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {attempt.status === 'GRADED' ? '已批改' : '进行中'}
                        </span>
                        <span>{new Date(attempt.startTime).toLocaleString()}</span>
                      </div>
                    </div>
                    {attempt.status === 'GRADED' && attempt.score !== null && (
                      <div className="text-right">
                        <div className="text-3xl font-bold text-cyan-400">{attempt.score}</div>
                        <div className="text-sm text-slate-400">得分</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {exams.length === 0 && myAttempts.length === 0 && (
          <div className="text-center py-16 bg-slate-800 rounded-lg">
            <FileText className="h-16 w-16 mx-auto mb-4 text-slate-600" />
            <p className="text-slate-400 text-lg">暂无考试</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function ExamPage() {
  const { id: examId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);

  const answersRef = useRef(answers);
  const submittingRef = useRef(submitting);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const handleSubmit = useCallback(async (currentAnswers?: Record<string, any>) => {
    if (submittingRef.current) return;
    setSubmitting(true);
    submittingRef.current = true;
    try {
      const answersToSubmit = currentAnswers || answersRef.current;
      await examAPI.submit(examId!, answersToSubmit);
      navigate(`/exam/${examId}/result`);
    } catch (error: any) {
      console.error('提交失败:', error);
      alert(error.error?.message || '提交失败，请重试');
      setSubmitting(false);
      submittingRef.current = false;
    }
  }, [examId, navigate]);

  useEffect(() => {
    fetchExam();
  }, [examId]);

  useEffect(() => {
    if (exam && exam.duration) {
      setTimeLeft(exam.duration * 60);
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit(answersRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [exam, handleSubmit]);

  const fetchExam = async () => {
    try {
      const response = await examAPI.getById(examId!);
      if (response.success) {
        setExam(response.data);
        const startRes = await examAPI.start(examId!);
        if (startRes.success) {
          setAttemptId(startRes.data.id);
        }
      }
    } catch (error: any) {
      console.error('获取考试失败:', error);
      if (error.error?.message?.includes('已完成')) {
        navigate(`/exam/${examId}/result`);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const updateAnswer = (problemId: string, value: any) => {
    setAnswers(prev => ({ ...prev, [problemId]: value }));
  };

  if (loading || !exam) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-cyan-400 text-xl">加载中...</div>
      </div>
    );
  }

  const questions = exam.questions || [];
  const currentQ = questions[currentQuestion];
  const isTimeWarning = timeLeft < 300;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="bg-slate-800 p-4 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold text-cyan-400">{exam.title}</h1>
          <div className={`text-2xl font-mono ${isTimeWarning ? 'text-red-400' : 'text-green-400'}`}>
            {formatTime(timeLeft)}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-slate-800 rounded-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-slate-400">题目 {currentQuestion + 1} / {questions.length}</span>
                <span className="text-cyan-400">{currentQ?.points || 10} 分</span>
              </div>

              {currentQ && (
                <>
                  <h2 className="text-xl font-semibold mb-4">{currentQ.problem.title}</h2>
                  <div className="prose prose-invert max-w-none mb-6">
                    <MarkdownRenderer content={currentQ.problem.description} />
                  </div>

                  {currentQ.problem.type === 'PROGRAMMING' && (
                    <div className="space-y-4">
                      {Array.isArray(currentQ.problem.testCases) && currentQ.problem.testCases.filter((tc: any) => tc.isSample).length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-slate-300 mb-2">示例</h4>
                          <div className="space-y-2">
                            {currentQ.problem.testCases
                              .filter((tc: any) => tc.isSample)
                              .map((tc: any, idx: number) => (
                                <div key={idx} className="bg-slate-700 rounded-lg p-3 text-sm">
                                  <div className="mb-1">
                                    <span className="text-slate-400">输入：</span>
                                    <pre className="text-white mt-1 font-mono">{tc.input}</pre>
                                  </div>
                                  <div>
                                    <span className="text-slate-400">输出：</span>
                                    <pre className="text-white mt-1 font-mono">{tc.output}</pre>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-semibold text-slate-300">代码编辑器</h4>
                          <select
                            value={answers[currentQ.problem.id]?.language || 'javascript'}
                            onChange={(e) =>
                              updateAnswer(currentQ.problem.id, {
                                ...answers[currentQ.problem.id],
                                language: e.target.value,
                                code: answers[currentQ.problem.id]?.code || ''
                              })
                            }
                            className="px-3 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          >
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="cpp">C++</option>
                            <option value="c">C</option>
                          </select>
                        </div>
                        <div style={{ height: '400px' }}>
                          <Editor
                            height="100%"
                            language={
                              (answers[currentQ.problem.id]?.language || 'javascript') === 'python'
                                ? 'python'
                                : (answers[currentQ.problem.id]?.language || 'javascript') === 'cpp' || (answers[currentQ.problem.id]?.language || 'javascript') === 'c'
                                ? 'cpp'
                                : 'javascript'
                            }
                            value={answers[currentQ.problem.id]?.code || ''}
                            onChange={(value) =>
                              updateAnswer(currentQ.problem.id, {
                                ...answers[currentQ.problem.id],
                                code: value || ''
                              })
                            }
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 14,
                              lineNumbers: 'on',
                              scrollBeyondLastLine: false,
                              automaticLayout: true,
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {currentQ.problem.type === 'CHOICE' && (() => {
                    const choices = Array.isArray(currentQ.problem.choices)
                      ? currentQ.problem.choices
                      : (() => { try { return JSON.parse(currentQ.problem.choices || '[]'); } catch { return []; } })();
                    return choices.length > 0 && (
                    <div className="space-y-3">
                      {choices.map((choice: any, idx: number) => (
                        <label
                          key={idx}
                          className={`flex items-center gap-3 p-4 rounded-lg cursor-pointer transition-colors ${
                            answers[currentQ.problem.id] === choice.key
                              ? 'bg-cyan-900/50 border-2 border-cyan-500'
                              : 'bg-slate-700 hover:bg-slate-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQ.problem.id}`}
                            value={choice.key}
                            checked={answers[currentQ.problem.id] === choice.key}
                            onChange={(e) =>
                              updateAnswer(currentQ.problem.id, e.target.value)
                            }
                            className="hidden"
                          />
                          <span className="font-semibold">{choice.key}.</span>
                          <span>{choice.text}</span>
                        </label>
                      ))}
                    </div>
                    );
                  })()}

                  {currentQ.problem.type === 'FILL_BLANK' && (
                    <textarea
                      value={answers[currentQ.problem.id] || ''}
                      onChange={(e) =>
                        updateAnswer(currentQ.problem.id, e.target.value)
                      }
                      className="w-full p-4 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
                      rows={4}
                      placeholder="请输入答案..."
                    />
                  )}
                </>
              )}
            </div>

            <div className="flex justify-between items-center mt-6">
              <button
                onClick={() => setCurrentQuestion((prev) => Math.max(0, prev - 1))}
                disabled={currentQuestion === 0}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                上一题
              </button>
              <button
                onClick={() => setCurrentQuestion((prev) => Math.min(questions.length - 1, prev + 1))}
                disabled={currentQuestion === questions.length - 1}
                className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                下一题
              </button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-slate-800 rounded-lg p-4 sticky top-24">
              <h3 className="font-semibold mb-4">题目导航</h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q: any, idx: number) => {
                  const hasAnswer = q.problem.type === 'PROGRAMMING'
                    ? answers[q.problem.id]?.code?.trim()
                    : answers[q.problem.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentQuestion(idx)}
                      className={`aspect-square rounded-lg flex items-center justify-center font-semibold transition-colors ${
                        idx === currentQuestion
                          ? 'bg-cyan-600 text-white'
                          : hasAnswer
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-cyan-600 rounded"></div>
                  <span className="text-slate-400">当前题目</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-600 rounded"></div>
                  <span className="text-slate-400">已作答</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-slate-700 rounded"></div>
                  <span className="text-slate-400">未作答</span>
                </div>
              </div>

              <button
                onClick={() => {
                  if (confirm('确定要提交考试吗？提交后不可修改。')) {
                    handleSubmit();
                  }
                }}
                disabled={submitting}
                className="w-full mt-6 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {submitting ? '提交中...' : '提交考试'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
