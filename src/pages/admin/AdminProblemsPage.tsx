import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI, enhancedAiAPI } from '../../services/api';
import { Plus, Edit, Trash2, Code, CheckCircle, PenTool, Search, Upload, Loader2, X } from 'lucide-react';

export function AdminProblemsPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  useEffect(() => {
    loadProblems();
  }, []);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const res = await problemsAPI.getAll({ search: searchTerm });
      if (res.success) {
        setProblems(res.data);
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;
    try {
      await problemsAPI.delete(id);
      loadProblems();
    } catch (error) {
      console.error('删除失败', error);
      alert('删除失败');
    }
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      alert('请输入题目内容');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await enhancedAiAPI.parseProblemFile(importContent, 'txt');
      if (res.success && res.data?.problems) {
        const problems = res.data.problems;
        let created = 0;
        for (const p of problems) {
          try {
            await problemsAPI.create({
              title: p.title,
              description: p.description,
              type: p.type || 'PROGRAMMING',
              difficulty: p.difficulty || 'MEDIUM',
              tags: p.tags || [],
              testCases: p.testCases || [],
              choices: p.choices || undefined,
              correctAnswer: p.correctAnswer || undefined,
              fillBlanks: p.fillBlanks || undefined,
              timeLimit: p.timeLimit || 2000,
              memoryLimit: p.memoryLimit || 256
            });
            created++;
          } catch (e) {
            console.error('导入题目失败:', p.title, e);
          }
        }
        setImportResult({ total: problems.length, created });
        loadProblems();
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI解析失败');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROGRAMMING':
        return <Code className="h-4 w-4" />;
      case 'CHOICE':
        return <CheckCircle className="h-4 w-4" />;
      case 'FILL_BLANK':
        return <PenTool className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PROGRAMMING':
        return '编程题';
      case 'CHOICE':
        return '选择题';
      case 'FILL_BLANK':
        return '填空题';
      default:
        return type;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyName = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return '简单';
      case 'MEDIUM':
        return '中等';
      case 'HARD':
        return '困难';
      default:
        return difficulty;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">题目管理</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            批量导入
          </button>
          <Link
            to="/admin/problems/create"
            className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            创建题目
          </Link>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索题目..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProblems()}
              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={loadProblems}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">题目</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">难度</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">标签</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {problems.map((problem) => (
                <tr key={problem.id} className="hover:bg-slate-750 transition-colors">
                  <td className="px-6 py-4">
                    <Link
                      to={`/problem/${problem.id}`}
                      className="text-white hover:text-cyan-400 font-medium transition-colors"
                    >
                      {problem.title}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="flex items-center text-slate-400">
                      {getTypeIcon(problem.type)}
                      <span className="ml-2">{getTypeName(problem.type)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(problem.difficulty)}`}>
                      {getDifficultyName(problem.difficulty)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm">
                    {(Array.isArray(problem.tags) ? problem.tags : JSON.parse(problem.tags || '[]')).join(', ') || '无'}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end space-x-2">
                      <Link
                        to={`/admin/problems/${problem.id}/edit`}
                        className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Edit className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(problem.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {problems.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              暂无题目，点击上方按钮创建
            </div>
          )}
        </div>
      )}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">批量导入题目</h2>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">上传文件</label>
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg cursor-pointer transition-colors w-fit">
                  <Upload className="h-4 w-4" />
                  <span>选择文件</span>
                  <input type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <p className="text-slate-500 text-sm mt-1">支持 txt、md、csv 文件</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">或直接粘贴内容</label>
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows={8}
                  placeholder="粘贴题目内容，AI将自动解析并创建题目。格式示例：&#10;&#10;题目：两数之和&#10;描述：给定一个整数数组...&#10;类型：PROGRAMMING&#10;难度：EASY&#10;---&#10;题目：二叉树遍历&#10;描述：...&#10;类型：CHOICE&#10;难度：MEDIUM"
                />
              </div>
              {importResult && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                  成功导入 {importResult.created}/{importResult.total} 道题目
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowImport(false); setImportContent(''); setImportResult(null); }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !importContent.trim()}
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {importing ? '导入中...' : '开始导入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
