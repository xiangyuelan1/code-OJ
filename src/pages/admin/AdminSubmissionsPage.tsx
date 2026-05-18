import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminSubmissionsAPI } from '../../services/api';
import { FileText, CheckCircle, XCircle, Clock, AlertTriangle, Search, Filter } from 'lucide-react';

export function AdminSubmissionsPage() {
  const [searchParams] = useSearchParams();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterUserId, setFilterUserId] = useState(searchParams.get('userId') || '');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, [page, filterStatus, filterUserId]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params: any = { page, pageSize: 20 };
      if (filterStatus) params.status = filterStatus;
      if (filterUserId) params.userId = filterUserId;
      const res = await adminSubmissionsAPI.getAll(params);
      if (res.success && res.data) {
        setSubmissions(res.data.submissions || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('获取提交记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'WRONG_ANSWER': return <XCircle className="h-4 w-4 text-red-400" />;
      case 'TIME_LIMIT_EXCEEDED': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'RUNTIME_ERROR': return <AlertTriangle className="h-4 w-4 text-orange-400" />;
      default: return <FileText className="h-4 w-4 text-slate-400" />;
    }
  };

  const getStatusName = (status: string) => {
    const map: Record<string, string> = {
      'ACCEPTED': '通过',
      'WRONG_ANSWER': '答案错误',
      'TIME_LIMIT_EXCEEDED': '超时',
      'RUNTIME_ERROR': '运行错误',
      'COMPILE_ERROR': '编译错误',
      'JUDGING': '判题中'
    };
    return map[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-green-500/20 text-green-400';
      case 'WRONG_ANSWER': return 'bg-red-500/20 text-red-400';
      case 'TIME_LIMIT_EXCEEDED': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PROGRAMMING': return '编程';
      case 'CHOICE': return '选择';
      case 'FILL_BLANK': return '填空';
      default: return type;
    }
  };

  const totalPages = Math.ceil(total / 20);

  if (loading && submissions.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">提交记录</h1>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex items-center gap-2 bg-slate-800 rounded-lg px-4 py-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
            className="bg-transparent text-white text-sm focus:outline-none"
          >
            <option value="">全部状态</option>
            <option value="ACCEPTED">通过</option>
            <option value="WRONG_ANSWER">答案错误</option>
            <option value="TIME_LIMIT_EXCEEDED">超时</option>
            <option value="RUNTIME_ERROR">运行错误</option>
          </select>
        </div>
        {filterUserId && (
          <button
            onClick={() => { setFilterUserId(''); setPage(1); }}
            className="text-sm text-cyan-400 hover:text-cyan-300"
          >
            清除用户筛选
          </button>
        )}
        <div className="text-slate-400 text-sm ml-auto">共 {total} 条记录</div>
      </div>

      <div className="space-y-3">
        {submissions.map((sub) => (
          <div key={sub.id} className="bg-slate-800 rounded-lg overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-slate-750 transition-colors"
              onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(sub.status)}
                  <div>
                    <div className="text-white font-medium">{sub.problem?.title || '未知题目'}</div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                      <span>{sub.user?.username || '未知用户'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(sub.status)}`}>
                        {getStatusName(sub.status)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                        {getTypeName(sub.type)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-slate-700 rounded">
                        {sub.problem?.difficulty === 'EASY' ? '简单' : sub.problem?.difficulty === 'MEDIUM' ? '中等' : '困难'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-semibold">{sub.score ?? '-'} 分</div>
                  <div className="text-xs text-slate-400">
                    {sub.pointsEarned ? `+${sub.pointsEarned} 积分` : ''}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {new Date(sub.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {expandedId === sub.id && (
              <div className="border-t border-slate-700 p-4 bg-slate-850">
                {sub.type === 'PROGRAMMING' && sub.code && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-slate-300 mb-2">提交代码</h4>
                    <pre className="bg-slate-900 p-3 rounded text-sm font-mono text-slate-300 overflow-auto max-h-48">
                      {sub.code}
                    </pre>
                  </div>
                )}
                {sub.answer && sub.type !== 'PROGRAMMING' && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">提交答案</h4>
                    <p className="text-slate-400 text-sm">{sub.answer}</p>
                  </div>
                )}
                {sub.result && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-300 mb-1">判题结果</h4>
                    <pre className="bg-slate-900 p-3 rounded text-xs font-mono text-slate-400 overflow-auto max-h-32">
                      {typeof sub.result === 'string' ? sub.result : JSON.stringify(sub.result, null, 2)}
                    </pre>
                    {sub.result.testResults && (
                      <div className="mt-2 space-y-1">
                        {sub.result.testResults.map((tr: any, idx: number) => (
                          <div key={idx} className={`text-xs px-2 py-1 rounded ${tr.passed ? 'text-green-400' : 'text-red-400'}`}>
                            测试点 {tr.testCase}: {tr.passed ? '通过' : `未通过 (期望: ${tr.expected}, 实际: ${tr.actual || '(无)'})`}
                          </div>
                        ))}
                      </div>
                    )}
                    {sub.result.isCorrect !== undefined && sub.type === 'CHOICE' && (
                      <div className="mt-2 text-xs">
                        <span className="text-slate-400">正确答案：</span>
                        <span className="text-green-400">{sub.result.correctAnswer}</span>
                      </div>
                    )}
                    {sub.result.message && (
                      <div className="mt-1 text-xs text-slate-400">{sub.result.message}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-slate-700 rounded-lg text-white disabled:opacity-50 hover:bg-slate-600"
          >
            上一页
          </button>
          <span className="text-slate-400">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-slate-700 rounded-lg text-white disabled:opacity-50 hover:bg-slate-600"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
