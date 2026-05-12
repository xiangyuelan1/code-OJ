import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { problemsAPI, solutionsAPI, enhancedAiAPI, knowledgeTreeAPI } from '../../services/api';
import { ArrowLeft, Plus, Trash2, Save, BookOpen, Sparkles, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { MarkdownEditor } from '../../components/MarkdownEditor';

interface TestCase {
  input: string;
  output: string;
  isSample: boolean;
}

interface Choice {
  key: string;
  text: string;
}

interface SolutionForm {
  id?: string;
  title: string;
  content: string;
  code: string;
  complexity: string;
}

export function AdminProblemFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PROGRAMMING');
  const [difficulty, setDifficulty] = useState('MEDIUM');
  const [tags, setTags] = useState('');
  const [testCases, setTestCases] = useState<TestCase[]>([{ input: '', output: '', isSample: true }]);
  const [choices, setChoices] = useState<Choice[]>([
    { key: 'A', text: '' },
    { key: 'B', text: '' },
    { key: 'C', text: '' },
    { key: 'D', text: '' }
  ]);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [fillBlankCount, setFillBlankCount] = useState(1);
  const [fillBlankAnswers, setFillBlankAnswers] = useState<string[]>(['']);
  const [timeLimit, setTimeLimit] = useState(2000);
  const [memoryLimit, setMemoryLimit] = useState(256);
  const [solutions, setSolutions] = useState<SolutionForm[]>([]);
  const [deletedSolutionIds, setDeletedSolutionIds] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      loadProblem();
    }
  }, [id]);

  const loadProblem = async () => {
    try {
      setLoading(true);
      const res = await problemsAPI.getById(id!);
      if (res.success) {
        const p = res.data;
        setTitle(p.title);
        setDescription(p.description);
        setType(p.type);
        setDifficulty(p.difficulty);
        setTags(p.tags?.join(', ') || '');
        setTimeLimit(p.timeLimit || 2000);
        setMemoryLimit(p.memoryLimit || 256);

        if (p.type === 'PROGRAMMING') {
          setTestCases(p.testCases?.length > 0 ? p.testCases : [{ input: '', output: '', isSample: true }]);
        } else if (p.type === 'CHOICE') {
          setChoices(p.choices || [
            { key: 'A', text: '' },
            { key: 'B', text: '' },
            { key: 'C', text: '' },
            { key: 'D', text: '' }
          ]);
          setCorrectAnswer(p.correctAnswer || '');
        } else if (p.type === 'FILL_BLANK') {
          const blanks: string[] = p.fillBlanks || [];
          setFillBlankCount(blanks.length || 1);
          setFillBlankAnswers(blanks.length > 0 ? blanks : ['']);
        }
      }

      const solRes = await solutionsAPI.getByProblemId(id!);
      if (solRes.success && solRes.data) {
        setSolutions(
          solRes.data.map((s: any) => ({
            id: s.id,
            title: s.title || '',
            content: s.content || '',
            code: s.code || '',
            complexity: s.complexity || ''
          }))
        );
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title || !description) {
      alert('请填写标题和描述');
      return;
    }

    const data: any = {
      title,
      description,
      type,
      difficulty,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      timeLimit,
      memoryLimit
    };

    if (type === 'PROGRAMMING') {
      data.testCases = testCases.filter(tc => tc.input && tc.output);
    } else if (type === 'CHOICE') {
      data.choices = choices.filter(c => c.text);
      data.correctAnswer = correctAnswer;
    } else if (type === 'FILL_BLANK') {
      data.fillBlanks = fillBlankAnswers;
    }

    try {
      let savedProblemId = id;
      if (isEditing) {
        await problemsAPI.update(id!, data);
      } else {
        const createRes = await problemsAPI.create(data);
        if (createRes.success && createRes.data) {
          savedProblemId = createRes.data.id;
        }
      }

      if (savedProblemId) {
        for (const delId of deletedSolutionIds) {
          await solutionsAPI.delete(delId).catch(() => {});
        }
        setDeletedSolutionIds([]);

        for (const sol of solutions) {
          if (!sol.title && !sol.content) continue;
          if (sol.id) {
            await solutionsAPI.update(sol.id, {
              title: sol.title,
              content: sol.content,
              code: sol.code || null,
              complexity: sol.complexity || null
            });
          } else {
            await solutionsAPI.create({
              problemId: savedProblemId,
              title: sol.title,
              content: sol.content,
              code: sol.code || null,
              complexity: sol.complexity || null
            });
          }
        }
      }

      navigate('/admin/problems');
    } catch (error: any) {
      alert(error.error?.message || '保存失败');
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', isSample: false }]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: string | boolean) => {
    const newCases = [...testCases];
    (newCases[index] as any)[field] = value;
    setTestCases(newCases);
  };

  const removeTestCase = (index: number) => {
    if (testCases.length > 1) {
      setTestCases(testCases.filter((_, i) => i !== index));
    }
  };

  const updateChoice = (index: number, text: string) => {
    const newChoices = [...choices];
    newChoices[index].text = text;
    setChoices(newChoices);
  };

  const addChoice = () => {
    const nextKey = String.fromCharCode(65 + choices.length);
    setChoices([...choices, { key: nextKey, text: '' }]);
  };

  const removeChoice = (index: number) => {
    if (choices.length <= 2) return;
    const newChoices = choices.filter((_, i) => i !== index);
    newChoices.forEach((c, i) => {
      c.key = String.fromCharCode(65 + i);
    });
    if (correctAnswer === choices[index].key) {
      setCorrectAnswer('');
    } else if (correctAnswer && correctAnswer > choices[index].key) {
      setCorrectAnswer(String.fromCharCode(correctAnswer.charCodeAt(0) - 1));
    }
    setChoices(newChoices);
  };

  const updateFillBlankAnswer = (index: number, value: string) => {
    const newAnswers = [...fillBlankAnswers];
    newAnswers[index] = value;
    setFillBlankAnswers(newAnswers);
  };

  const addFillBlank = () => {
    setFillBlankCount(prev => prev + 1);
    setFillBlankAnswers(prev => [...prev, '']);
  };

  const removeFillBlank = (index: number) => {
    if (fillBlankCount <= 1) return;
    setFillBlankCount(prev => prev - 1);
    setFillBlankAnswers(prev => prev.filter((_, i) => i !== index));
  };

  const addSolution = () => {
    setSolutions([...solutions, { title: '', content: '', code: '', complexity: '' }]);
  };

  const updateSolution = (index: number, field: keyof SolutionForm, value: string) => {
    const newSolutions = [...solutions];
    newSolutions[index] = { ...newSolutions[index], [field]: value };
    setSolutions(newSolutions);
  };

  const removeSolution = (index: number) => {
    const sol = solutions[index];
    if (sol.id) {
      setDeletedSolutionIds([...deletedSolutionIds, sol.id]);
    }
    setSolutions(solutions.filter((_, i) => i !== index));
  };

  const handleAiGenerateTestCases = async () => {
    if (!title || !description) {
      alert('请先填写标题和描述');
      return;
    }
    setAiLoading('testcases');
    try {
      const res = await enhancedAiAPI.generateTestCases({
        problem: { title, description }
      });
      if (res.success && res.data?.testCases) {
        const newCases = res.data.testCases.map((tc: any) => ({
          input: tc.input || '',
          output: tc.output || '',
          isSample: tc.isSample || false
        }));
        setTestCases([...testCases, ...newCases]);
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI生成测试用例失败');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiGenerateSolution = async () => {
    if (!title || !description) {
      alert('请先填写标题和描述');
      return;
    }
    setAiLoading('solution');
    try {
      const res = await enhancedAiAPI.generateSolution({
        problem: { title, description, type }
      });
      if (res.success && res.data?.solution) {
        const sol = res.data.solution;
        setSolutions([...solutions, {
          title: sol.title || 'AI生成题解',
          content: sol.content || '',
          code: sol.code || '',
          complexity: sol.complexity ? `${sol.complexity.time} / ${sol.complexity.space}` : ''
        }]);
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI生成题解失败');
    } finally {
      setAiLoading(null);
    }
  };

  const handleAiClassify = async () => {
    if (!title) {
      alert('请先填写标题');
      return;
    }
    setAiLoading('classify');
    try {
      const res = await enhancedAiAPI.classifyProblem({
        problem: { title, description, type }
      });
      if (res.success && res.data) {
        const result = res.data;
        if (result.nodeIds && result.nodeIds.length > 0) {
          alert(`AI建议分类到知识树节点: ${result.reason || result.nodeIds[0]}`);
        } else {
          alert('AI未能找到合适的分类节点');
        }
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI分类失败');
    } finally {
      setAiLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/admin/problems')}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回
      </button>

      <h1 className="text-3xl font-bold text-white mb-8">
        {isEditing ? '编辑题目' : '创建题目'}
      </h1>

      <div className="space-y-6">
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">基本信息</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">题目标题</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="请输入题目标题"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">题目类型</label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="PROGRAMMING">编程题</option>
                  <option value="CHOICE">选择题</option>
                  <option value="FILL_BLANK">填空题</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">难度</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="EASY">简单</option>
                  <option value="MEDIUM">中等</option>
                  <option value="HARD">困难</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">题目描述（支持 Markdown 和图片）</label>
            <MarkdownEditor
              value={description}
              onChange={setDescription}
              placeholder="请输入题目描述，支持 Markdown 语法和图片粘贴/拖拽上传..."
              minHeight={300}
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">标签（用逗号分隔）</label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="例如: 数组, 动态规划, 简单"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">时间限制 (ms)</label>
              <input
                type="number"
                value={timeLimit}
                onChange={(e) => setTimeLimit(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">内存限制 (MB)</label>
              <input
                type="number"
                value={memoryLimit}
                onChange={(e) => setMemoryLimit(Number(e.target.value))}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="h-5 w-5 text-purple-400" />
            <h2 className="text-xl font-semibold text-white">AI 助手</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {type === 'PROGRAMMING' && (
              <button
                onClick={handleAiGenerateTestCases}
                disabled={aiLoading !== null}
                className="flex items-center px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
              >
                {aiLoading === 'testcases' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                AI生成测试用例
              </button>
            )}
            <button
              onClick={handleAiGenerateSolution}
              disabled={aiLoading !== null}
              className="flex items-center px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {aiLoading === 'solution' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI生成题解
            </button>
            <button
              onClick={handleAiClassify}
              disabled={aiLoading !== null}
              className="flex items-center px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors disabled:opacity-50"
            >
              {aiLoading === 'classify' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              AI自动分类
            </button>
          </div>
          <p className="text-slate-500 text-sm mt-3">需要配置AI API后才能使用，请在管理后台的AI配置中设置</p>
        </div>

        {type === 'PROGRAMMING' && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">测试用例</h2>
              <button
                onClick={addTestCase}
                className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加测试用例
              </button>
            </div>
            
            <div className="space-y-4">
              {testCases.map((tc, index) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">测试点 {index + 1}</span>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center text-slate-400">
                        <input
                          type="checkbox"
                          checked={tc.isSample}
                          onChange={(e) => updateTestCase(index, 'isSample', e.target.checked)}
                          className="mr-2"
                        />
                        示例
                      </label>
                      {testCases.length > 1 && (
                        <button
                          onClick={() => removeTestCase(index)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">输入</label>
                      <textarea
                        value={tc.input}
                        onChange={(e) => updateTestCase(index, 'input', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="输入"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">输出</label>
                      <textarea
                        value={tc.output}
                        onChange={(e) => updateTestCase(index, 'output', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white font-mono text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        placeholder="输出"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {type === 'CHOICE' && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">选项设置</h2>
              <button
                onClick={addChoice}
                disabled={choices.length >= 8}
                className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加选项
              </button>
            </div>
            
            <div className="space-y-4">
              {choices.map((choice, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded-lg font-bold">
                    {choice.key}
                  </span>
                  <input
                    type="text"
                    value={choice.text}
                    onChange={(e) => updateChoice(index, e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={`选项 ${choice.key}`}
                  />
                  {choices.length > 2 && (
                    <button
                      onClick={() => removeChoice(index)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">正确答案</label>
              <div className="flex gap-4 flex-wrap">
                {choices.map((choice) => (
                  <label
                    key={choice.key}
                    className={`flex items-center px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      correctAnswer === choice.key
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : 'bg-slate-700 border-2 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctAnswer"
                      value={choice.key}
                      checked={correctAnswer === choice.key}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-white font-medium">{choice.key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === 'FILL_BLANK' && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">填空题设置</h2>
              <button
                onClick={addFillBlank}
                disabled={fillBlankCount >= 10}
                className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4 mr-2" />
                添加填空
              </button>
            </div>
            <p className="text-slate-400 mb-4">
              在题目描述中使用 "_____" 表示需要填空的位置，并为每个填空设置正确答案。
            </p>
            <div className="space-y-4">
              {fillBlankAnswers.map((answer, index) => (
                <div key={index} className="flex items-center gap-4">
                  <span className="w-8 h-8 flex items-center justify-center bg-cyan-500/20 text-cyan-400 rounded-lg font-bold text-sm">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={answer}
                    onChange={(e) => updateFillBlankAnswer(index, e.target.value)}
                    className="flex-1 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder={`第 ${index + 1} 个填空的正确答案`}
                  />
                  {fillBlankCount > 1 && (
                    <button
                      onClick={() => removeFillBlank(index)}
                      className="text-red-400 hover:text-red-300 p-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">题解管理</h2>
            </div>
            <button
              onClick={addSolution}
              className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加题解
            </button>
          </div>

          {solutions.length === 0 && (
            <p className="text-slate-500 text-center py-4">暂无题解，点击"添加题解"开始编写</p>
          )}

          <div className="space-y-6">
            {solutions.map((sol, index) => (
              <div key={sol.id || index} className="bg-slate-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-white font-medium">题解 {index + 1}</span>
                  <button
                    onClick={() => removeSolution(index)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">题解标题</label>
                    <input
                      type="text"
                      value={sol.title}
                      onChange={(e) => updateSolution(index, 'title', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="题解标题"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">题解内容</label>
                    <div className="bg-slate-600 border border-slate-500 rounded overflow-hidden">
                      <Editor
                        height="200px"
                        language="markdown"
                        value={sol.content}
                        onChange={(value) => updateSolution(index, 'content', value || '')}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on'
                        }}
                      />
                    </div>
                  </div>
                  {type === 'PROGRAMMING' && (
                    <>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">参考代码</label>
                        <div className="bg-slate-600 border border-slate-500 rounded overflow-hidden">
                          <Editor
                            height="150px"
                            language="javascript"
                            value={sol.code}
                            onChange={(value) => updateSolution(index, 'code', value || '')}
                            theme="vs-dark"
                            options={{
                              minimap: { enabled: false },
                              fontSize: 13
                            }}
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm text-slate-400 mb-1">时间/空间复杂度</label>
                        <input
                          type="text"
                          value={sol.complexity}
                          onChange={(e) => updateSolution(index, 'complexity', e.target.value)}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          placeholder="例如: O(n) / O(1)"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Link
            to="/admin/problems"
            className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            取消
          </Link>
          <button
            onClick={handleSubmit}
            className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Save className="h-5 w-5 mr-2" />
            保存题目
          </button>
        </div>
      </div>
    </div>
  );
}
