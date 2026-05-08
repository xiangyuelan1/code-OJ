import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { solutionsAPI } from '../../services/api';
import { Plus, Edit, Trash2, Eye, BookOpen } from 'lucide-react';

export function AdminSolutionsPage() {
  const [solutions, setSolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSolutions();
  }, []);

  const loadSolutions = async () => {
    try {
      setLoading(true);
      const res = await solutionsAPI.getAll();
      if (res.success) {
        setSolutions(res.data);
      }
    } catch (error) {
      console.error('加载题解失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题解吗？')) return;
    
    try {
      await solutionsAPI.delete(id);
      loadSolutions();
    } catch (error) {
      console.error('删除失败', error);
      alert('删除失败');
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">题解管理</h1>
        <Link
          to="/admin/solutions/create"
          className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
        >
          <Plus className="h-5 w-5 mr-2" />
          创建题解
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          {solutions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              暂无题解，点击上方按钮创建
            </div>
          ) : (
            <div className="divide-y divide-slate-700">
              {solutions.map((solution) => (
                <div key={solution.id} className="p-6 hover:bg-slate-750 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{solution.title}</h3>
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs">
                          {solution.problem?.title || '未知题目'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-sm mb-2">
                        {solution.content.substring(0, 150)}...
                      </p>
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        {solution.code && (
                          <span className="flex items-center">
                            <BookOpen className="h-4 w-4 mr-1" />
                            包含代码
                          </span>
                        )}
                        {solution.complexity && (
                          <span>复杂度: {solution.complexity}</span>
                        )}
                        <span>创建于 {formatDate(solution.createdAt)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Link
                        to={`/solutions/${solution.id}`}
                        className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                      >
                        <Eye className="h-5 w-5" />
                      </Link>
                      <button
                        onClick={() => handleDelete(solution.id)}
                        className="p-2 text-slate-400 hover:text-red-400 transition-colors"
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
      )}
    </div>
  );
}
