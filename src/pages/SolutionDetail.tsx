import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { solutionsAPI, submissionsAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { ArrowLeft, Code, Clock, TrendingUp, Lock } from 'lucide-react';
import Editor from '@monaco-editor/react';

export function SolutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const [solution, setSolution] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasAC, setHasAC] = useState(false);

  useEffect(() => {
    loadSolution();
  }, [id]);

  const loadSolution = async () => {
    try {
      setLoading(true);
      const res = await solutionsAPI.getById(id!);
      if (res.success) {
        setSolution(res.data);
        if (isAuthenticated && res.data.problem?.id) {
          try {
            const acRes = await submissionsAPI.checkAC(res.data.problem.id);
            if (acRes.success) {
              setHasAC(acRes.data.hasAC);
            }
          } catch {}
        }
      }
    } catch (error) {
      console.error('加载题解失败', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!solution) {
    return (
      <div className="text-center py-20">
        <p className="text-xl text-slate-400">题解不存在</p>
        <Link to="/" className="text-cyan-400 hover:text-cyan-300 mt-4 inline-block">
          返回首页
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回
      </button>

      <div className="bg-slate-800 rounded-xl p-8 shadow-xl mb-8">
        {!hasAC ? (
          <div className="text-center py-12">
            <Lock className="h-16 w-16 text-slate-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">题解已锁定</h2>
            <p className="text-slate-400 mb-4">请先通过本题后再查看题解</p>
            <Link
              to={`/problem/${solution.problem?.id}/solve`}
              className="inline-block bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              前往答题
            </Link>
          </div>
        ) : (
        <>
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-white mb-4">{solution.title}</h1>
          <div className="flex items-center space-x-4 text-slate-400">
            <Link
              to={`/problem/${solution.problem?.id}`}
              className="text-cyan-400 hover:text-cyan-300"
            >
              {solution.problem?.title || '关联题目'}
            </Link>
            {solution.complexity && (
              <span className="flex items-center">
                <TrendingUp className="h-4 w-4 mr-1" />
                {solution.complexity}
              </span>
            )}
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(solution.createdAt).toLocaleString('zh-CN')}
            </span>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-6">
          <h2 className="text-xl font-semibold text-white mb-4">解题思路</h2>
          <div className="prose prose-invert max-w-none">
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed">
              {solution.content}
            </div>
          </div>
        </div>

        {solution.code && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center">
              <Code className="h-5 w-5 mr-2 text-cyan-400" />
              参考代码
            </h2>
            <div className="rounded-lg overflow-hidden">
              <Editor
                height="400px"
                language="javascript"
                value={solution.code}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  readOnly: true,
                  scrollBeyondLastLine: false
                }}
              />
            </div>
          </div>
        )}
        </>
        )}
      </div>

      <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-white mb-4">相关题目</h3>
        <Link
          to={`/problem/${solution.problem?.id}`}
          className="block bg-slate-700 hover:bg-slate-600 rounded-lg p-4 transition-colors"
        >
          <div className="text-white font-medium">{solution.problem?.title}</div>
          <div className="text-slate-400 text-sm mt-1">
            点击前往题目页面，开始练习
          </div>
        </Link>
      </div>
    </div>
  );
}
