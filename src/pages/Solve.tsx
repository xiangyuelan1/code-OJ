import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { problemsAPI, submissionsAPI, aiAPI } from '../services/api';
import { ArrowLeft, Send, Lightbulb, Loader2, Star } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuthStore } from '../stores/auth.store';

export function SolvePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [answer, setAnswer] = useState('');
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (id) {
      loadProblem();
    }
  }, [id]);

  const loadProblem = async () => {
    try {
      setLoading(true);
      const res = await problemsAPI.getById(id!);
      if (res.success) {
        setProblem(res.data);
        if (res.data.type === 'FILL_BLANK') {
          const blankCount = (res.data.description.match(/_____/g) || []).length;
          setFillAnswers(Array(blankCount).fill(''));
        }
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setResult(null);

    try {
      let data: any = {
        problemId: id,
        type: problem.type
      };

      if (problem.type === 'PROGRAMMING') {
        data.code = code;
        data.language = language;
      } else if (problem.type === 'CHOICE') {
        data.answer = answer;
      } else if (problem.type === 'FILL_BLANK') {
        data.answers = fillAnswers;
      }

      const res = await submissionsAPI.submit(data);
      if (res.success) {
        const submission = await submissionsAPI.getById(res.data.id);
        if (submission.success) {
          setResult(submission.data);
        }
      }
    } catch (error: any) {
      console.error('提交失败', error);
      alert(error.error?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  const getHint = async () => {
    setAiLoading(true);
    setShowHint(true);
    try {
      const res = await aiAPI.getHint({
        problem: {
          title: problem.title,
          description: problem.description
        }
      });
      if (res.success) {
        setAiHint(res.data.hint);
      }
    } catch (error: any) {
      setAiHint('AI功能未启用或配置错误');
    } finally {
      setAiLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'text-green-400 bg-green-400/10';
      case 'WRONG_ANSWER':
        return 'text-red-400 bg-red-400/10';
      case 'TIME_LIMIT_EXCEEDED':
        return 'text-orange-400 bg-orange-400/10';
      case 'RUNTIME_ERROR':
        return 'text-purple-400 bg-purple-400/10';
      case 'COMPILE_ERROR':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return '通过';
      case 'WRONG_ANSWER':
        return '答案错误';
      case 'TIME_LIMIT_EXCEEDED':
        return '超时';
      case 'RUNTIME_ERROR':
        return '运行错误';
      case 'COMPILE_ERROR':
        return '编译错误';
      case 'JUDGING':
        return '判题中';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!problem) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">题目不存在</p>
        <Link to="/" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={() => navigate(`/problem/${id}`)}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回题目
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <h1 className="text-2xl font-bold text-white mb-4">{problem.title}</h1>
          <div className="prose prose-invert max-w-none mb-6">
            <div className="text-slate-300 whitespace-pre-wrap">{problem.description}</div>
          </div>

          {problem.type === 'PROGRAMMING' && problem.testCases?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">示例</h3>
              {problem.testCases.filter((tc: any) => tc.isSample).map((tc: any, index: number) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4 mb-2">
                  <div className="mb-1">
                    <span className="text-slate-400 text-sm">输入：</span>
                    <pre className="text-white mt-1 font-mono text-sm">{tc.input}</pre>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">输出：</span>
                    <pre className="text-white mt-1 font-mono text-sm">{tc.output}</pre>
                  </div>
                </div>
              ))}
            </div>
          )}

          {problem.type === 'CHOICE' && problem.choices && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">选项</h3>
              <div className="space-y-2">
                {problem.choices.map((choice: any) => (
                  <label
                    key={choice.key}
                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                      answer === choice.key
                        ? 'bg-cyan-500/20 border-2 border-cyan-500'
                        : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                  >
                    <input
                      type="radio"
                      name="choice"
                      value={choice.key}
                      checked={answer === choice.key}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="mr-3"
                    />
                    <span className="text-white">{choice.key}. {choice.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {problem.type === 'FILL_BLANK' && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">填空答案</h3>
              <div className="space-y-3">
                {fillAnswers.map((_, index) => (
                  <input
                    key={index}
                    type="text"
                    value={fillAnswers[index]}
                    onChange={(e) => {
                      const newAnswers = [...fillAnswers];
                      newAnswers[index] = e.target.value;
                      setFillAnswers(newAnswers);
                    }}
                    placeholder={`第 ${index + 1} 空`}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                ))}
              </div>
            </div>
          )}

          <button
            onClick={getHint}
            disabled={aiLoading}
            className="flex items-center px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
            AI提示
          </button>

          {showHint && aiHint && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <p className="text-yellow-300 text-sm">{aiHint}</p>
            </div>
          )}
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl flex flex-col">
          {problem.type === 'PROGRAMMING' ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">代码编辑器</h3>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                </select>
              </div>
              <div className="flex-1 min-h-[400px]">
                <Editor
                  height="100%"
                  language={language === 'python' ? 'python' : 'javascript'}
                  value={code}
                  onChange={(value) => setCode(value || '')}
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
            </>
          ) : null}

          <button
            onClick={handleSubmit}
            disabled={submitting || !user}
            className="mt-4 flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                提交答案
              </>
            )}
          </button>

          {result && (
            <div className="mt-6 p-4 bg-slate-700 rounded-lg">
              <h4 className="text-lg font-semibold text-white mb-3">判题结果</h4>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(result.status)}`}>
                  {getStatusName(result.status)}
                </span>
                {result.score !== null && (
                  <span className="text-2xl font-bold text-white">{result.score}分</span>
                )}
              </div>
              {result.pointsEarned > 0 && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold">+{result.pointsEarned} 积分</span>
                  <span className="text-yellow-400/70 text-sm">（{result.status === 'ACCEPTED' ? '首次通过额外奖励' : '答题奖励'}）</span>
                </div>
              )}
              {result.status === 'ACCEPTED' && (
                <div className="mb-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-cyan-300 text-sm mb-2">🎉 恭喜通过！现在可以查看题解了</p>
                  <Link
                    to={`/problem/${id}`}
                    className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                  >
                    返回题目详情查看题解 →
                  </Link>
                </div>
              )}
              {result.result && (
                <div className="mt-3">
                  {result.result.testResults && (
                    <div className="space-y-2">
                      {result.result.testResults.map((tr: any, index: number) => (
                        <div
                          key={index}
                          className={`p-3 rounded-lg text-sm ${
                            tr.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>测试点 {tr.testCase}</span>
                            <span>{tr.passed ? '通过' : '未通过'}</span>
                          </div>
                          {!tr.passed && (
                            <div className="mt-2 text-xs">
                              <div>期望: {tr.expected}</div>
                              <div>实际: {tr.actual || '(无输出)'}</div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {result.result.message && (
                    <p className="text-slate-300 mt-2">{result.result.message}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
