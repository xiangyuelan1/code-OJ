import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI } from '../services/api';
import { Search, Code, CheckCircle, PenTool, FileText } from 'lucide-react';

export function HomePage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');

  useEffect(() => {
    loadProblems();
  }, [filterType, filterDifficulty]);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType) params.type = filterType;
      if (filterDifficulty) params.difficulty = filterDifficulty;
      if (searchTerm) params.search = searchTerm;
      
      const res = await problemsAPI.getAll(params);
      if (res.success) {
        setProblems(res.data);
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadProblems();
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
        return <FileText className="h-4 w-4" />;
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
    <div className="max-w-7xl mx-auto">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold text-white mb-4">
          在线评测系统
        </h1>
        <p className="text-xl text-slate-300">
          练习编程，提升技能，挑战自我
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 mb-8 shadow-xl">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="搜索题目..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </form>
          
          <div className="flex gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">所有类型</option>
              <option value="PROGRAMMING">编程题</option>
              <option value="CHOICE">选择题</option>
              <option value="FILL_BLANK">填空题</option>
            </select>
            
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className="px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">所有难度</option>
              <option value="EASY">简单</option>
              <option value="MEDIUM">中等</option>
              <option value="HARD">困难</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <>
          <div className="grid gap-4">
            {problems.length === 0 ? (
              <div className="text-center py-20 text-slate-400">
                <p className="text-xl">暂无题目</p>
              </div>
            ) : (
              problems.map((problem) => (
                <Link
                  key={problem.id}
                  to={`/problem/${problem.id}`}
                  className="bg-slate-800 rounded-xl p-6 hover:bg-slate-750 transition-all hover:shadow-xl group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-xl font-semibold text-white group-hover:text-cyan-400 transition-colors">
                          {problem.title}
                        </h3>
                        <span className="flex items-center space-x-1 text-slate-400">
                          {getTypeIcon(problem.type)}
                          <span className="text-sm">{getTypeName(problem.type)}</span>
                        </span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-slate-400">
                        <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(problem.difficulty)}`}>
                          {getDifficultyName(problem.difficulty)}
                        </span>
                        <span>标签: {JSON.parse(problem.tags || '[]').join(', ') || '无'}</span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
