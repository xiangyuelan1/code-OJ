import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { submissionsAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { Clock, CheckCircle, XCircle, AlertCircle, Code, Eye, PenTool } from 'lucide-react';

export function SubmissionsPage() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubmissions();
  }, []);

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      const res = await submissionsAPI.getMySubmissions();
      if (res.success) {
        setSubmissions(res.data);
      }
    } catch (error) {
      console.error('加载提交记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      case 'WRONG_ANSWER':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'RUNTIME_ERROR':
        return <AlertCircle className="h-5 w-5 text-purple-400" />;
      case 'TIME_LIMIT_EXCEEDED':
        return <Clock className="h-5 w-5 text-orange-400" />;
      case 'COMPILE_ERROR':
        return <XCircle className="h-5 w-5 text-red-300" />;
      default:
        return <AlertCircle className="h-5 w-5 text-yellow-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED':
        return 'bg-green-500/10 border-green-500/30';
      case 'WRONG_ANSWER':
        return 'bg-red-500/10 border-red-500/30';
      case 'RUNTIME_ERROR':
        return 'bg-purple-500/10 border-purple-500/30';
      case 'TIME_LIMIT_EXCEEDED':
        return 'bg-orange-500/10 border-orange-500/30';
      case 'COMPILE_ERROR':
        return 'bg-red-500/10 border-red-400/30';
      default:
        return 'bg-yellow-500/10 border-yellow-500/30';
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
        return <Eye className="h-4 w-4" />;
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

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      <h1 className="text-3xl font-bold text-white mb-8">我的提交</h1>

      {submissions.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <p className="text-slate-400 text-lg">暂无提交记录</p>
          <Link
            to="/"
            className="inline-block mt-4 text-cyan-400 hover:text-cyan-300"
          >
            去刷题
          </Link>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">题目</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">得分</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-6 py-4">
                      <div className={`flex items-center px-3 py-1 rounded-full border ${getStatusColor(submission.status)}`}>
                        {getStatusIcon(submission.status)}
                        <span className="ml-2 text-sm">
                          {submission.status === 'ACCEPTED' ? '通过' :
                           submission.status === 'WRONG_ANSWER' ? '错误' :
                           submission.status === 'RUNTIME_ERROR' ? '运行错误' :
                           submission.status === 'TIME_LIMIT_EXCEEDED' ? '超时' :
                           submission.status === 'COMPILE_ERROR' ? '编译错误' :
                           submission.status === 'JUDGING' ? '判题中' :
                           submission.status === 'PENDING' ? '等待' : submission.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        to={`/problem/${submission.problemId}`}
                        className="text-white hover:text-cyan-400 transition-colors"
                      >
                        {submission.problem?.title || '题目'}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center text-slate-400">
                        {getTypeIcon(submission.type)}
                        <span className="ml-2">{getTypeName(submission.type)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {submission.score !== null ? (
                        <span className={`font-semibold ${
                          submission.score >= 80 ? 'text-green-400' :
                          submission.score >= 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {submission.score}分
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatDate(submission.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
