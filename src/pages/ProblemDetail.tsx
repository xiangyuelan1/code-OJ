import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { problemsAPI, solutionsAPI, submissionsAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { ArrowLeft, Clock, MemoryStick, BookOpen, CheckCircle, Code, Lightbulb, Lock } from 'lucide-react';
import { MarkdownRenderer } from '../components/MarkdownEditor';

export function ProblemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();
  const [problem, setProblem] = useState<any>(null);
  const [solutions, setSolutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAC, setHasAC] = useState(false);

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
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }

    if (isAuthenticated && id) {
      try {
        const acRes = await submissionsAPI.checkAC(id);
        if (acRes.success) {
          setHasAC(acRes.data.hasAC);
        }
      } catch {}

      try {
        const solutionsRes = await solutionsAPI.getByProblemId(id);
        if (solutionsRes.success) {
          setSolutions(solutionsRes.data || []);
        }
      } catch {}
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
    <div className="max-w-6xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回
      </button>

      <div className="bg-slate-800 rounded-xl p-8 shadow-xl mb-8">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white mb-4">{problem.title}</h1>
            <div className="flex items-center space-x-4">
              <span className={`px-3 py-1 rounded-full text-sm ${getDifficultyColor(problem.difficulty)}`}>
                {getDifficultyName(problem.difficulty)}
              </span>
              <span className="text-slate-400">{getTypeName(problem.type)}</span>
              <span className="text-slate-400 flex items-center">
                <BookOpen className="h-4 w-4 mr-1" />
                {problem.submissionCount || 0} 次提交
              </span>
            </div>
          </div>
          
          {isAuthenticated && (
            <Link
              to={`/problem/${id}/solve`}
              className="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              开始答题
            </Link>
          )}
        </div>

        <div className="flex items-center space-x-6 text-sm text-slate-400 mb-6">
          <span className="flex items-center">
            <Clock className="h-4 w-4 mr-1" />
            时间限制: {problem.timeLimit}ms
          </span>
          <span className="flex items-center">
            <MemoryStick className="h-4 w-4 mr-1" />
            内存限制: {problem.memoryLimit}MB
          </span>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h2 className="text-xl font-semibold text-white mb-4">题目描述</h2>
          <div className="prose prose-invert max-w-none">
            <MarkdownRenderer content={problem.description} />
          </div>
        </div>

        {problem.type === 'PROGRAMMING' && Array.isArray(problem.testCases) && problem.testCases.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">示例</h2>
            <div className="space-y-4">
              {problem.testCases.filter((tc: any) => tc.isSample).map((tc: any, index: number) => (
                <div key={index} className="bg-slate-700 rounded-lg p-4">
                  <div className="mb-2">
                    <span className="text-slate-400 text-sm">输入：</span>
                    <pre className="text-white mt-1 font-mono">{tc.input}</pre>
                  </div>
                  <div>
                    <span className="text-slate-400 text-sm">输出：</span>
                    <pre className="text-white mt-1 font-mono">{tc.output}</pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {problem.type === 'CHOICE' && Array.isArray(problem.choices) && problem.choices.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">选项</h2>
            <div className="space-y-2">
              {problem.choices.map((choice: any) => (
                <div key={choice.key} className="bg-slate-700 rounded-lg p-4 text-slate-300">
                  {choice.key}. {choice.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {problem.type === 'FILL_BLANK' && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">填空</h2>
            <p className="text-slate-400">
              请在下方填写答案（每空一个答案，使用逗号分隔多个空格的答案）
            </p>
          </div>
        )}

        {Array.isArray(problem.tags) && problem.tags.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-semibold text-white mb-4">标签</h2>
            <div className="flex flex-wrap gap-2">
              {problem.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-full text-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {isAuthenticated && solutions.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
            <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
            相关题解
          </h2>
          {hasAC ? (
            <div className="space-y-4">
              {solutions.map((solution) => (
                <Link
                  key={solution.id}
                  to={`/solutions/${solution.id}`}
                  className="block bg-slate-700 hover:bg-slate-600 rounded-lg p-4 transition-colors"
                >
                  <h3 className="text-white font-medium">{solution.title}</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    {solution.content.substring(0, 100)}...
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Lock className="h-12 w-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400 mb-2">通过本题后即可查看题解</p>
              <Link
                to={`/problem/${id}/solve`}
                className="inline-block bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                前往答题
              </Link>
            </div>
          )}
        </div>
      )}

      {!isAuthenticated && (
        <div className="bg-slate-800 rounded-xl p-8 shadow-xl text-center">
          <p className="text-slate-400 mb-4">登录后即可开始答题和查看题解</p>
          <Link
            to="/login"
            className="inline-block bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            登录
          </Link>
        </div>
      )}
    </div>
  );
}
