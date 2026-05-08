import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI } from '../../services/api';
import { Plus, Edit, Trash2, Code, CheckCircle, PenTool, Search } from 'lucide-react';

export function AdminProblemsPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

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
        <Link
          to="/admin/problems/create"
          className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          创建题目
        </Link>
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
                    {JSON.parse(problem.tags || '[]').join(', ') || '无'}
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
    </div>
  );
}
