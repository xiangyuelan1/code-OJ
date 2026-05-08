import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { problemsAPI } from '../../services/api';
import { ArrowLeft, Plus, Trash2, Save } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface TestCase {
  input: string;
  output: string;
  isSample: boolean;
}

interface Choice {
  key: string;
  text: string;
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
  const [fillBlankCount, setFillBlankCount] = useState(3);
  const [timeLimit, setTimeLimit] = useState(2000);
  const [memoryLimit, setMemoryLimit] = useState(256);

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
          setFillBlankCount(p.fillBlanks?.length || 3);
        }
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
      data.fillBlanks = Array(fillBlankCount).fill('');
    }

    try {
      if (isEditing) {
        await problemsAPI.update(id!, data);
      } else {
        await problemsAPI.create(data);
      }
      navigate('/admin/problems');
    } catch (error: any) {
      alert(error.error?.message || '保存失败');
    }
  };

  const addTestCase = () => {
    setTestCases([...testCases, { input: '', output: '', isSample: false }]);
  };

  const updateTestCase = (index: number, field: keyof TestCase, value: any) => {
    const newCases = [...testCases];
    newCases[index][field] = value;
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
            <label className="block text-sm font-medium text-slate-300 mb-2">题目描述</label>
            <div className="bg-slate-700 border border-slate-600 rounded-lg overflow-hidden">
              <Editor
                height="300px"
                language="markdown"
                value={description}
                onChange={(value) => setDescription(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  wordWrap: 'on'
                }}
              />
            </div>
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
            <h2 className="text-xl font-semibold text-white mb-4">选项设置</h2>
            
            <div className="space-y-4">
              {choices.map((choice, index) => (
                <div key={choice.key} className="flex items-center gap-4">
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
                </div>
              ))}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-slate-300 mb-2">正确答案</label>
              <div className="flex gap-4">
                {['A', 'B', 'C', 'D'].map((key) => (
                  <label
                    key={key}
                    className={`flex items-center px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      correctAnswer === key
                        ? 'bg-green-500/20 border-2 border-green-500'
                        : 'bg-slate-700 border-2 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    <input
                      type="radio"
                      name="correctAnswer"
                      value={key}
                      checked={correctAnswer === key}
                      onChange={(e) => setCorrectAnswer(e.target.value)}
                      className="sr-only"
                    />
                    <span className="text-white font-medium">{key}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {type === 'FILL_BLANK' && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <h2 className="text-xl font-semibold text-white mb-4">填空题设置</h2>
            <p className="text-slate-400 mb-4">
              在题目描述中使用 "_____" 表示需要填空的位置。系统将自动识别填空数量。
            </p>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">预估填空数量</label>
              <input
                type="number"
                min="1"
                max="10"
                value={fillBlankCount}
                onChange={(e) => setFillBlankCount(Number(e.target.value))}
                className="w-32 px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              <p className="text-slate-500 text-sm mt-2">
                注意：实际填空数量由题目描述中的 "_____" 数量决定
              </p>
            </div>
          </div>
        )}

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
