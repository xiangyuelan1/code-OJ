import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { examAPI, problemsAPI } from '../../services/api';
import { Plus, Trash2, Clock, FileText, Users, ArrowLeft, Save, Eye, ChevronDown, ChevronUp, Trophy, Code, CheckCircle, XCircle } from 'lucide-react';

export function AdminExamPage() {
  const navigate = useNavigate();
  const { id: viewExamId } = useParams<{ id: string }>();
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [problems, setProblems] = useState<any[]>([]);
  const [viewingAttempts, setViewingAttempts] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(false);
  const [expandedAttempt, setExpandedAttempt] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'PRACTICE',
    duration: 60,
    startTime: '',
    endTime: '',
    enableProctoring: false,
    problemIds: [] as string[]
  });

  useEffect(() => {
    fetchExams();
  }, []);

  useEffect(() => {
    if (viewExamId) {
      handleViewAttempts(viewExamId);
    }
  }, [viewExamId]);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await examAPI.getAll();
      if (res.success) {
        setExams(res.data || []);
      }
    } catch (error) {
      console.error('获取考试列表失败', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProblems = async () => {
    try {
      const res = await problemsAPI.getAll();
      if (res.success) {
        setProblems(res.data || []);
      }
    } catch (error) {
      console.error('获取题目列表失败', error);
    }
  };

  const handleViewAttempts = async (examId: string) => {
    setViewingAttempts(examId);
    setAttemptsLoading(true);
    try {
      const res = await examAPI.getAttempts(examId);
      if (res.success) {
        setAttempts(res.data || []);
      }
    } catch (error) {
      console.error('获取提交记录失败', error);
    } finally {
      setAttemptsLoading(false);
    }
  };

  const handleCreateExam = async () => {
    if (!form.title) {
      alert('请填写考试标题');
      return;
    }
    if (form.problemIds.length === 0) {
      alert('请至少选择一道题目');
      return;
    }

    try {
      const data: any = {
        title: form.title,
        description: form.description || undefined,
        type: form.type,
        duration: form.duration,
        enableProctoring: form.enableProctoring,
        problemIds: form.problemIds
      };

      if (form.startTime) {
        data.startTime = new Date(form.startTime).toISOString();
      }
      if (form.endTime) {
        data.endTime = new Date(form.endTime).toISOString();
      }

      const res = await examAPI.create(data);
      if (res.success) {
        setShowForm(false);
        setForm({
          title: '',
          description: '',
          type: 'PRACTICE',
          duration: 60,
          startTime: '',
          endTime: '',
          enableProctoring: false,
          problemIds: []
        });
        fetchExams();
      }
    } catch (error: any) {
      alert(error.error?.message || '创建考试失败');
    }
  };

  const handleDeleteExam = async (id: string) => {
    if (!confirm('确定要删除此考试吗？所有提交记录也将被删除。')) return;
    try {
      await examAPI.delete(id);
      if (viewingAttempts === id) {
        setViewingAttempts(null);
        setAttempts([]);
      }
      fetchExams();
    } catch (error: any) {
      alert(error.error?.message || '删除失败');
    }
  };

  const toggleProblem = (problemId: string) => {
    setForm(prev => ({
      ...prev,
      problemIds: prev.problemIds.includes(problemId)
        ? prev.problemIds.filter(id => id !== problemId)
        : [...prev.problemIds, problemId]
    }));
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PRACTICE': return '练习';
      case 'EXAM': return '正式考试';
      case 'QUIZ': return '测验';
      default: return type;
    }
  };

  const getTypeNameZh = (type: string) => {
    switch (type) {
      case 'PROGRAMMING': return '编程题';
      case 'CHOICE': return '选择题';
      case 'FILL_BLANK': return '填空题';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (showForm) {
    return (
      <div>
        <button
          onClick={() => setShowForm(false)}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          返回列表
        </button>

        <h1 className="text-3xl font-bold text-white mb-8">创建考试</h1>

        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">基本信息</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">考试标题</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="请输入考试标题"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">考试描述</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows={3}
                  placeholder="考试描述（可选）"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">考试类型</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="PRACTICE">练习</option>
                    <option value="EXAM">正式考试</option>
                    <option value="QUIZ">测验</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">考试时长（分钟）</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: Number(e.target.value) })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">开始时间（可选）</label>
                  <input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">结束时间（可选）</label>
                  <input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>
              <label className="flex items-center text-slate-300">
                <input
                  type="checkbox"
                  checked={form.enableProctoring}
                  onChange={(e) => setForm({ ...form, enableProctoring: e.target.checked })}
                  className="mr-3"
                />
                启用监考（切换标签页检测）
              </label>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">选择题目</h2>
              <span className="text-slate-400">已选 {form.problemIds.length} 题</span>
            </div>

            {problems.length === 0 && (
              <button
                onClick={fetchProblems}
                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                加载题目列表
              </button>
            )}

            {problems.length > 0 && (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {problems.map((problem) => (
                  <label
                    key={problem.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      form.problemIds.includes(problem.id)
                        ? 'bg-cyan-500/20 border border-cyan-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.problemIds.includes(problem.id)}
                      onChange={() => toggleProblem(problem.id)}
                      className="mr-2"
                    />
                    <div className="flex-1">
                      <span className="text-white">{problem.title}</span>
                      <span className="text-slate-400 text-sm ml-3">
                        {problem.type === 'PROGRAMMING' ? '编程题' : problem.type === 'CHOICE' ? '选择题' : '填空题'}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      problem.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                      problem.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {problem.difficulty === 'EASY' ? '简单' : problem.difficulty === 'MEDIUM' ? '中等' : '困难'}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-4">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleCreateExam}
              className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Save className="h-5 w-5 mr-2" />
              创建考试
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (viewingAttempts) {
    const exam = exams.find(e => e.id === viewingAttempts);
    return (
      <div>
        <button
          onClick={() => {
            setViewingAttempts(null);
            setAttempts([]);
            setExpandedAttempt(null);
          }}
          className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          返回考试列表
        </button>

        <h1 className="text-3xl font-bold text-white mb-2">提交记录</h1>
        <p className="text-slate-400 mb-8">{exam?.title || '考试'}</p>

        {attemptsLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : attempts.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Users className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">暂无提交记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => {
              const isExpanded = expandedAttempt === attempt.id;
              const questionResults: any[] = attempt.questionResults || [];
              const parsedAnswers = attempt.answers ? (typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers) : {};

              return (
                <div key={attempt.id} className="bg-slate-800 rounded-xl overflow-hidden">
                  <div
                    className="p-6 cursor-pointer hover:bg-slate-750 transition-colors"
                    onClick={() => setExpandedAttempt(isExpanded ? null : attempt.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          attempt.status === 'GRADED' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                          {attempt.status === 'GRADED' ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <Clock className="h-5 w-5 text-yellow-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">{attempt.user?.username || '未知用户'}</div>
                          <div className="text-sm text-slate-400">{attempt.user?.email || ''}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div className="text-2xl font-bold text-cyan-400">{attempt.score ?? '-'}</div>
                          <div className="text-xs text-slate-400">得分</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-slate-300">
                            {attempt.endTime
                              ? `${Math.round((new Date(attempt.endTime).getTime() - new Date(attempt.startTime).getTime()) / 60000)} 分钟`
                              : '进行中'
                            }
                          </div>
                          <div className="text-xs text-slate-400">{new Date(attempt.startTime).toLocaleString()}</div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-5 w-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-700 p-6">
                      <h4 className="text-sm font-semibold text-slate-300 mb-3">答题详情</h4>
                      <div className="space-y-3">
                        {questionResults.map((qr: any, idx: number) => (
                          <div
                            key={qr.problemId}
                            className={`p-4 rounded-lg border-l-4 ${
                              qr.isCorrect ? 'border-l-green-500 bg-green-500/5' : 'border-l-red-500 bg-red-500/5'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400 text-sm">第 {idx + 1} 题</span>
                                <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                                  {getTypeNameZh(qr.type)}
                                </span>
                                {qr.isCorrect ? (
                                  <CheckCircle className="h-4 w-4 text-green-400" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-400" />
                                )}
                              </div>
                              <span className="text-sm">
                                <span className={qr.isCorrect ? 'text-green-400' : 'text-red-400'}>
                                  {qr.earnedPoints}
                                </span>
                                <span className="text-slate-400">/{qr.points} 分</span>
                              </span>
                            </div>

                            {qr.type === 'PROGRAMMING' && parsedAnswers[qr.problemId] && (
                              <div className="mt-2">
                                <div className="flex items-center gap-2 text-xs text-slate-400">
                                  <Code className="h-3 w-3" />
                                  <span>{parsedAnswers[qr.problemId].language || 'javascript'}</span>
                                </div>
                                <pre className="mt-1 bg-slate-900 p-2 rounded text-xs font-mono text-slate-300 overflow-auto max-h-24">
                                  {parsedAnswers[qr.problemId].code || '(空)'}
                                </pre>
                                {qr.detail?.passedCount !== undefined && (
                                  <span className="text-xs text-slate-400 mt-1 block">
                                    测试通过: {qr.detail.passedCount}/{qr.detail.totalCount}
                                  </span>
                                )}
                              </div>
                            )}

                            {qr.type === 'CHOICE' && (
                              <div className="text-xs text-slate-400 mt-1">
                                选择: {parsedAnswers[qr.problemId] || '未作答'}
                                {!qr.isCorrect && qr.detail?.correctAnswer && ` | 正确: ${qr.detail.correctAnswer}`}
                              </div>
                            )}

                            {qr.type === 'FILL_BLANK' && (
                              <div className="text-xs text-slate-400 mt-1">
                                答案: {Array.isArray(parsedAnswers[qr.problemId]) ? parsedAnswers[qr.problemId].join(', ') : parsedAnswers[qr.problemId] || '未作答'}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">考试管理</h1>
        <button
          onClick={() => {
            fetchProblems();
            setShowForm(true);
          }}
          className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          创建考试
        </button>
      </div>

      {exams.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <FileText className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">暂无考试</p>
          <p className="text-slate-500 mt-2">点击"创建考试"按钮开始</p>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div key={exam.id} className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">{exam.title}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <span className={`px-2 py-1 rounded text-xs ${
                      exam.type === 'EXAM' ? 'bg-red-500/20 text-red-400' :
                      exam.type === 'QUIZ' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {getTypeName(exam.type)}
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {exam.duration}分钟
                    </span>
                    <span className="flex items-center">
                      <FileText className="h-4 w-4 mr-1" />
                      {exam._count?.questions || 0} 题
                    </span>
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {exam._count?.attempts || 0} 次参加
                    </span>
                  </div>
                  {exam.description && (
                    <p className="text-slate-400 mt-2 text-sm">{exam.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewAttempts(exam.id)}
                    className="text-cyan-400 hover:text-cyan-300 p-2 transition-colors"
                    title="查看提交记录"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteExam(exam.id)}
                    className="text-red-400 hover:text-red-300 p-2"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
