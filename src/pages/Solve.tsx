import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { problemsAPI, submissionsAPI, aiAPI, enhancedAiAPI } from '../services/api';
import { ArrowLeft, Send, Lightbulb, Loader2, Star, Settings, X, Sparkles, Wand2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useAuthStore } from '../stores/auth.store';
import { MarkdownRenderer } from '../components/MarkdownEditor';

const EDITOR_SETTINGS_KEY = 'oj_editor_settings';

interface EditorSettings {
  fontSize: number;
  theme: string;
  tabSize: number;
  wordWrap: 'on' | 'off' | 'wordWrapColumn';
  minimap: boolean;
}

const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  theme: 'vs-dark',
  tabSize: 2,
  wordWrap: 'on',
  minimap: false,
};

function loadEditorSettings(): EditorSettings {
  try {
    const saved = localStorage.getItem(EDITOR_SETTINGS_KEY);
    if (saved) return { ...DEFAULT_EDITOR_SETTINGS, ...JSON.parse(saved) };
  } catch {}
  return { ...DEFAULT_EDITOR_SETTINGS };
}

function saveEditorSettings(settings: EditorSettings) {
  localStorage.setItem(EDITOR_SETTINGS_KEY, JSON.stringify(settings));
}

function renderHintContent(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^━{6,}$/.test(line.trim())) {
      elements.push(<div key={key++} className="border-t border-yellow-500/30 my-3" />);
      i++;
      continue;
    }

    if (line.startsWith('# ')) {
      elements.push(<h2 key={key++} className="text-lg font-bold text-yellow-300 mt-3 mb-2">{line.slice(2)}</h2>);
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={key++} className="text-base font-semibold text-yellow-200 mt-4 mb-2 flex items-center gap-1">
          <span className="text-yellow-400">▸</span>
          <span>{line.slice(3).replace(/^▸\s*/, '')}</span>
        </h3>
      );
      i++;
      continue;
    }

    if (line.trim().startsWith('```')) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      elements.push(
        <pre key={key++} className="bg-slate-900/80 border border-yellow-500/20 rounded-lg p-3 my-2 overflow-x-auto text-sm">
          <code className="text-yellow-100/90 font-mono whitespace-pre">{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    if (line.startsWith('> ')) {
      elements.push(<div key={key++} className="pl-3 border-l-2 border-yellow-500/50 text-yellow-200/80 text-sm my-2 italic">{line.slice(2)}</div>);
      i++;
      continue;
    }

    if (line.match(/^- /)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^- /)) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={key++} className="space-y-1 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-yellow-200/90">
              <span className="text-yellow-400 mt-0.5 shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    if (line.match(/^\d+\.\s/)) {
      const listItems: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s/)) {
        listItems.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="space-y-1 my-2">
          {listItems.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-yellow-200/90">
              <span className="text-yellow-400 font-semibold shrink-0">{idx + 1}.</span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    if (line.trim() === '') {
      i++;
      continue;
    }

    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('- ') &&
      !lines[i].match(/^\d+\.\s/) &&
      !lines[i].startsWith('> ') &&
      !/^━{6,}$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i]);
      i++;
    }
    if (paragraphLines.length > 0) {
      elements.push(<p key={key++} className="text-sm text-yellow-200/90 my-1 leading-relaxed">{paragraphLines.join('\n')}</p>);
    }
  }

  return elements;
}

export function SolvePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [problem, setProblem] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('cpp');
  const [answer, setAnswer] = useState('');
  const [fillAnswers, setFillAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHint, setAiHint] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const [optimizeSuggestion, setOptimizeSuggestion] = useState('');
  const [showOptimize, setShowOptimize] = useState(false);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarProblems, setSimilarProblems] = useState<any[]>([]);
  const [showSimilar, setShowSimilar] = useState(false);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>(loadEditorSettings);
  const [showEditorSettings, setShowEditorSettings] = useState(false);
  const [smartHintLoading, setSmartHintLoading] = useState(false);
  const [smartHintData, setSmartHintData] = useState<{ hint: string; level: string; nextAttemptSuggestion: string } | null>(null);
  const [showSmartHint, setShowSmartHint] = useState(false);
  const [smartHintAttemptCount, setSmartHintAttemptCount] = useState(1);
  const [smartHintHistory, setSmartHintHistory] = useState<string[]>([]);

  useEffect(() => {
    if (id) loadProblem();
  }, [id]);

  const loadProblem = async () => {
    try {
      setLoading(true);
      const res = await problemsAPI.getById(id!);
      if (res.success) {
        const data = res.data;
        setProblem(data);
        if (data.type === 'FILL_BLANK') {
          let blankCount = 0;
          try {
            const blanks = data.fillBlanks ? JSON.parse(data.fillBlanks) : [];
            blankCount = Array.isArray(blanks) ? blanks.length : 0;
          } catch {
            blankCount = (data.description.match(/_____/g) || []).length;
          }
          blankCount = Math.max(blankCount, 1);
          setFillAnswers(Array(blankCount).fill(''));
        }
        if (data.type === 'CHOICE') {
          try {
            const choices = data.choices ? (typeof data.choices === 'string' ? JSON.parse(data.choices) : data.choices) : [];
            if (Array.isArray(choices) && choices.length > 0) {
              setAnswer('');
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (problem.type === 'PROGRAMMING' && !code.trim()) {
      alert('请编写代码后再提交');
      return;
    }
    if (problem.type === 'CHOICE' && !answer) {
      alert('请选择答案后再提交');
      return;
    }
    if (problem.type === 'FILL_BLANK' && fillAnswers.every(a => !a.trim())) {
      alert('请填写答案后再提交');
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      let data: any = { problemId: id, type: problem.type };

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
      const msg = error?.error?.message || error?.message || '提交失败';
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const getHint = async () => {
    setAiLoading(true);
    setShowHint(true);
    try {
      const res = await aiAPI.getHint({
        problem: { title: problem.title, description: problem.description }
      });
      if (res.success) {
        setAiHint(res.data.hint);
      }
    } catch {
      setAiHint('AI功能未启用或配置错误');
    } finally {
      setAiLoading(false);
    }
  };

  const getOptimizeSuggestion = async () => {
    if (!code.trim()) {
      alert('请先编写代码');
      return;
    }
    setOptimizeLoading(true);
    setShowOptimize(true);
    try {
      const res = await enhancedAiAPI.optimizeCode(code, language);
      if (res.success) {
        setOptimizeSuggestion(res.data.suggestion);
      }
    } catch {
      setOptimizeSuggestion('AI功能未启用或配置错误');
    } finally {
      setOptimizeLoading(false);
    }
  };

  const getSimilarProblems = async () => {
    if (!id) return;
    setSimilarLoading(true);
    setShowSimilar(true);
    try {
      const res = await enhancedAiAPI.recommendSimilar(id);
      if (res.success && res.data?.problemIds?.length > 0) {
        const problemsRes = await problemsAPI.getAll();
        if (problemsRes.success) {
          const allProblems = problemsRes.data || [];
          const similar = allProblems.filter((p: any) => res.data.problemIds.includes(p.id));
          setSimilarProblems(similar);
        }
      } else {
        setSimilarProblems([]);
      }
    } catch {
      setSimilarProblems([]);
    } finally {
      setSimilarLoading(false);
    }
  };

  const getSmartHint = async () => {
    if (!problem) return;
    setSmartHintLoading(true);
    setShowSmartHint(true);
    try {
      const res = await enhancedAiAPI.smartHint({
        problem: { title: problem.title, description: problem.description },
        userCode: code,
        attemptCount: smartHintAttemptCount,
        previousHints: smartHintHistory,
      });
      if (res.success && res.data) {
        setSmartHintData(res.data);
        setSmartHintHistory(prev => [...prev, res.data.hint]);
        setSmartHintAttemptCount(prev => prev + 1);
      }
    } catch {
      setSmartHintData({
        hint: 'AI功能未启用或配置错误',
        level: '未知',
        nextAttemptSuggestion: '请稍后重试',
      });
    } finally {
      setSmartHintLoading(false);
    }
  };

  const updateEditorSetting = useCallback(<K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    setEditorSettings(prev => {
      const next = { ...prev, [key]: value };
      saveEditorSettings(next);
      return next;
    });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'text-green-400 bg-green-400/10';
      case 'WRONG_ANSWER': return 'text-red-400 bg-red-400/10';
      case 'TIME_LIMIT_EXCEEDED': return 'text-orange-400 bg-orange-400/10';
      case 'RUNTIME_ERROR': return 'text-purple-400 bg-purple-400/10';
      case 'COMPILE_ERROR': return 'text-red-400 bg-red-400/10';
      default: return 'text-yellow-400 bg-yellow-400/10';
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return '通过';
      case 'WRONG_ANSWER': return '答案错误';
      case 'TIME_LIMIT_EXCEEDED': return '超时';
      case 'RUNTIME_ERROR': return '运行错误';
      case 'COMPILE_ERROR': return '编译错误';
      case 'JUDGING': return '判题中';
      default: return status;
    }
  };

  const getDifficultyBadge = (d: string) => {
    switch (d) {
      case 'EASY': return 'bg-green-500/20 text-green-400';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400';
      case 'HARD': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getDifficultyName = (d: string) => {
    switch (d) {
      case 'EASY': return '简单';
      case 'MEDIUM': return '中等';
      case 'HARD': return '困难';
      default: return d;
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
        <Link to="/" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">返回首页</Link>
      </div>
    );
  }

  const parsedChoices = (() => {
    try {
      const raw = problem.choices;
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    } catch { return []; }
  })();

  const parsedTestCases = (() => {
    try {
      const raw = problem.testCases;
      return raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
    } catch { return []; }
  })();

  return (
    <div className="max-w-7xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 左侧：题目描述 + 答题区 */}
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-2xl font-bold text-white">{problem.title}</h1>
              <span className={`text-xs px-2 py-0.5 rounded ${getDifficultyBadge(problem.difficulty)}`}>
                {getDifficultyName(problem.difficulty)}
              </span>
            </div>
            <div className="prose prose-invert max-w-none mb-6">
              <MarkdownRenderer content={problem.description} />
            </div>

            {problem.type === 'PROGRAMMING' && parsedTestCases.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">示例</h3>
                {parsedTestCases.filter((tc: any) => tc.isSample).slice(0, 2).map((tc: any, index: number) => (
                  <div key={index} className="bg-slate-700 rounded-lg p-4 mb-2">
                    <div className="mb-1">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">输入：</span>
                        <button
                          onClick={() => navigator.clipboard?.writeText(tc.input || '')}
                          className="text-slate-500 hover:text-cyan-400 text-xs transition-colors"
                        >
                          复制
                        </button>
                      </div>
                      <pre className="text-white mt-1 font-mono text-sm whitespace-pre-wrap break-all max-h-32 overflow-hidden">
                        {(tc.input || '').length > 500 ? (tc.input || '').substring(0, 500) + '...' : (tc.input || '')}
                      </pre>
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 text-sm">输出：</span>
                        <button
                          onClick={() => navigator.clipboard?.writeText(tc.output || '')}
                          className="text-slate-500 hover:text-cyan-400 text-xs transition-colors"
                        >
                          复制
                        </button>
                      </div>
                      <pre className="text-white mt-1 font-mono text-sm whitespace-pre-wrap break-all max-h-32 overflow-hidden">
                        {(tc.output || '').length > 500 ? (tc.output || '').substring(0, 500) + '...' : (tc.output || '')}
                      </pre>
                    </div>
                    {tc.explanation && (
                      <div className="mt-2 pt-2 border-t border-slate-600">
                        <span className="text-slate-400 text-sm">提示：</span>
                        <p className="text-slate-300 mt-1 text-sm">{tc.explanation}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 选择题答题区 */}
          {problem.type === 'CHOICE' && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">选择答案</h3>
              <div className="space-y-3">
                {parsedChoices.map((choice: any) => (
                  <label
                    key={choice.key}
                    className={`flex items-center p-4 rounded-lg cursor-pointer transition-all ${
                      answer === choice.key
                        ? 'bg-cyan-500/20 border-2 border-cyan-500 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-700 hover:bg-slate-600 border-2 border-transparent'
                    }`}
                  >
                    <input
                      type="radio"
                      name="choice"
                      value={choice.key}
                      checked={answer === choice.key}
                      onChange={(e) => setAnswer(e.target.value)}
                      className="mr-3 accent-cyan-500"
                    />
                    <span className="font-semibold text-cyan-400 mr-2">{choice.key}.</span>
                    <span className="text-white">{choice.text}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 填空题答题区 */}
          {problem.type === 'FILL_BLANK' && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <h3 className="text-lg font-semibold text-white mb-4">填写答案</h3>
              <div className="space-y-4">
                {fillAnswers.map((val, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-cyan-400 font-semibold min-w-[60px]">第 {index + 1} 空</span>
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const next = [...fillAnswers];
                        next[index] = e.target.value;
                        setFillAnswers(next);
                      }}
                      placeholder={`请输入第 ${index + 1} 空的答案`}
                      className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI 提示 */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={getHint}
                disabled={aiLoading}
                className="flex items-center px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
              >
                {aiLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                AI提示
              </button>
              {problem.type === 'PROGRAMMING' && (
                <button
                  onClick={getOptimizeSuggestion}
                  disabled={optimizeLoading}
                  className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
                >
                  {optimizeLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Wand2 className="h-4 w-4 mr-2" />}
                  AI优化建议
                </button>
              )}
              <button
                onClick={getSimilarProblems}
                disabled={similarLoading}
                className="flex items-center px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                {similarLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                相似题目
              </button>
              <button
                onClick={getSmartHint}
                disabled={smartHintLoading}
                className="flex items-center px-4 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
              >
                {smartHintLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Lightbulb className="h-4 w-4 mr-2" />}
                智能提示
                {smartHintAttemptCount > 1 && (
                  <span className="ml-1.5 text-xs bg-emerald-500/30 px-1.5 py-0.5 rounded">第{smartHintAttemptCount}次</span>
                )}
              </button>
            </div>

            {showHint && aiHint && (
              <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                {renderHintContent(aiHint)}
              </div>
            )}

            {showOptimize && optimizeSuggestion && (
              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-cyan-400 font-semibold text-sm">AI优化建议</h4>
                  <button onClick={() => setShowOptimize(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
                <div className="prose prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: optimizeSuggestion.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900 p-3 rounded-lg overflow-x-auto"><code>$2</code></pre>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>') }} />
              </div>
            )}

            {showSimilar && (
              <div className="mt-4 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-purple-400 font-semibold text-sm">相似题目推荐</h4>
                  <button onClick={() => setShowSimilar(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
                {similarLoading ? (
                  <div className="flex items-center gap-2 text-slate-400 text-sm"><Loader2 className="h-4 w-4 animate-spin" />正在推荐...</div>
                ) : similarProblems.length > 0 ? (
                  <div className="space-y-2">
                    {similarProblems.map((p: any) => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/solve/${p.id}`)}
                        className="w-full text-left flex items-center justify-between p-3 bg-slate-700/50 rounded-lg hover:bg-slate-600/50 transition-colors"
                      >
                        <span className="text-white text-sm">{p.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          p.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                          p.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                        }`}>{p.difficulty === 'EASY' ? '简单' : p.difficulty === 'MEDIUM' ? '中等' : '困难'}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-sm">暂无相似题目推荐</p>
                )}
              </div>
            )}

            {showSmartHint && smartHintData && (
              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="text-emerald-400 font-semibold text-sm">智能提示</h4>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      smartHintData.level === '方向性提示' ? 'bg-blue-500/20 text-blue-400' :
                      smartHintData.level === '算法建议' ? 'bg-yellow-500/20 text-yellow-400' :
                      smartHintData.level === '代码骨架' ? 'bg-red-500/20 text-red-400' :
                      'bg-slate-500/20 text-slate-400'
                    }`}>
                      {smartHintData.level}
                    </span>
                  </div>
                  <button onClick={() => setShowSmartHint(false)} className="text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
                </div>
                <div className="prose prose-invert max-w-none text-sm text-emerald-100/90">
                  {renderHintContent(smartHintData.hint)}
                </div>
                {smartHintData.nextAttemptSuggestion && (
                  <div className="mt-3 pt-3 border-t border-emerald-500/20">
                    <p className="text-xs text-emerald-300/70">
                      💡 下一步建议：{smartHintData.nextAttemptSuggestion}
                    </p>
                  </div>
                )}
                {smartHintHistory.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500">
                    已获取 {smartHintHistory.length} 次提示 · 点击"智能提示"获取更具体的帮助
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 右侧：代码编辑器 / 提交 / 结果 */}
        <div className="space-y-6">
          {problem.type === 'PROGRAMMING' && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-semibold text-white">代码编辑器</h3>
                  <button
                    onClick={() => setShowEditorSettings(!showEditorSettings)}
                    className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                    title="编辑器设置"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="c">C</option>
                </select>
              </div>

              {showEditorSettings && (
                <div className="mb-4 p-4 bg-slate-700 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-slate-300">编辑器设置</h4>
                    <button onClick={() => setShowEditorSettings(false)} className="text-slate-400 hover:text-white">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">字体大小</label>
                      <select
                        value={editorSettings.fontSize}
                        onChange={(e) => updateEditorSetting('fontSize', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      >
                        {[12, 13, 14, 15, 16, 18, 20, 22].map(s => (
                          <option key={s} value={s}>{s}px</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">主题</label>
                      <select
                        value={editorSettings.theme}
                        onChange={(e) => updateEditorSetting('theme', e.target.value)}
                        className="w-full px-2 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      >
                        <option value="vs-dark">深色</option>
                        <option value="vs">浅色</option>
                        <option value="hc-black">高对比度</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Tab 大小</label>
                      <select
                        value={editorSettings.tabSize}
                        onChange={(e) => updateEditorSetting('tabSize', Number(e.target.value))}
                        className="w-full px-2 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      >
                        <option value={2}>2 空格</option>
                        <option value={4}>4 空格</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">自动换行</label>
                      <select
                        value={editorSettings.wordWrap}
                        onChange={(e) => updateEditorSetting('wordWrap', e.target.value as any)}
                        className="w-full px-2 py-1.5 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                      >
                        <option value="on">开启</option>
                        <option value="off">关闭</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="sm:!h-[400px] lg:!h-[500px]" style={{ height: '300px' }}>
                <Editor
                  height="100%"
                  language={language === 'python' ? 'python' : language === 'cpp' || language === 'c' ? 'cpp' : 'javascript'}
                  value={code}
                  onChange={(value) => setCode(value || '')}
                  theme={editorSettings.theme}
                  loading={<div className="flex items-center justify-center h-full bg-slate-900"><div className="text-slate-400 text-sm">编辑器加载中...</div></div>}
                  options={{
                    minimap: { enabled: editorSettings.minimap },
                    fontSize: editorSettings.fontSize,
                    tabSize: editorSettings.tabSize,
                    wordWrap: editorSettings.wordWrap,
                    lineNumbers: 'on',
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    padding: { top: 12 },
                    renderLineHighlight: 'gutter',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    bracketPairColorization: { enabled: true },
                  }}
                />
              </div>
            </div>
          )}

          {/* 提交按钮 */}
          <button
            onClick={handleSubmit}
            disabled={submitting || !user}
            className="w-full flex items-center justify-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <><Loader2 className="h-5 w-5 mr-2 animate-spin" />提交中...</>
            ) : (
              <><Send className="h-5 w-5 mr-2" />提交答案</>
            )}
          </button>

          {/* 判题结果 */}
          {result && (
            <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
              <h4 className="text-lg font-semibold text-white mb-3">判题结果</h4>
              <div className="flex items-center justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(result.status)}`}>
                  {getStatusName(result.status)}
                </span>
                {result.score !== null && result.score !== undefined && (
                  <span className="text-2xl font-bold text-white">{result.score}分</span>
                )}
              </div>
              {result.pointsEarned > 0 && (
                <div className="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-400" />
                  <span className="text-yellow-300 font-semibold">+{result.pointsEarned} 积分</span>
                </div>
              )}
              {result.status === 'ACCEPTED' && (
                <div className="mb-3 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
                  <p className="text-cyan-300 text-sm mb-2">🎉 恭喜通过！现在可以查看题解了</p>
                  <button
                    onClick={() => navigate(-1)}
                    className="text-cyan-400 hover:text-cyan-300 text-sm underline"
                  >
                    返回题目详情查看题解 →
                  </button>
                </div>
              )}
              {result.result && (
                <div className="mt-3">
                  {result.result.testResults && (
                    <div className="space-y-2">
                      {result.result.testResults.map((tr: any, index: number) => (
                        <div key={index} className={`p-3 rounded-lg text-sm ${tr.passed ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
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
                  {result.result.isCorrect !== undefined && problem.type === 'CHOICE' && (
                    <div className="mt-2 text-sm">
                      <span className="text-slate-400">正确答案：</span>
                      <span className="text-green-400 font-semibold">{result.result.correctAnswer}</span>
                    </div>
                  )}
                  {result.result.correctAnswers && problem.type === 'FILL_BLANK' && (
                    <div className="mt-2 text-sm space-y-1">
                      {result.result.correctAnswers.map((ans: string, idx: number) => (
                        <div key={idx}>
                          <span className="text-slate-400">第 {idx + 1} 空：</span>
                          <span className="text-green-400 font-semibold">{ans}</span>
                          {result.result.userAnswers?.[idx] !== undefined && result.result.userAnswers[idx] !== ans && (
                            <span className="text-red-400 ml-2">（你的答案：{result.result.userAnswers[idx]}）</span>
                          )}
                        </div>
                      ))}
                    </div>
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
