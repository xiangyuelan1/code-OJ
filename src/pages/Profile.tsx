import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/auth.store';
import { submissionsAPI } from '../services/api';
import { User, Mail, Clock, CheckCircle, XCircle, Award } from 'lucide-react';

export function ProfilePage() {
  const { user } = useAuthStore();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    accepted: 0,
    acceptanceRate: 0
  });
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
        
        const total = res.data.length;
        const accepted = res.data.filter((s: any) => s.status === 'ACCEPTED').length;
        setStats({
          total,
          accepted,
          acceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0
        });
      }
    } catch (error) {
      console.error('加载提交记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-slate-800 rounded-xl p-8 shadow-xl mb-8">
        <div className="flex items-center space-x-6">
          <div className="w-24 h-24 bg-cyan-500/20 rounded-full flex items-center justify-center">
            <User className="h-12 w-12 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">{user?.username}</h1>
            <div className="flex items-center mt-2 text-slate-400">
              <Mail className="h-4 w-4 mr-2" />
              {user?.email}
            </div>
            <div className="flex items-center mt-2 text-slate-400">
              <Clock className="h-4 w-4 mr-2" />
              注册于 {user?.createdAt ? formatDate(user.createdAt) : '-'}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <Award className="h-6 w-6 text-blue-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-white">{stats.total}</div>
          <div className="text-slate-400 text-sm mt-1">总提交数</div>
        </div>
        
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-green-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-400">{stats.accepted}</div>
          <div className="text-slate-400 text-sm mt-1">通过数</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <XCircle className="h-6 w-6 text-purple-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-purple-400">{stats.total - stats.accepted}</div>
          <div className="text-slate-400 text-sm mt-1">未通过数</div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <CheckCircle className="h-6 w-6 text-cyan-400" />
            </div>
          </div>
          <div className="text-3xl font-bold text-cyan-400">{stats.acceptanceRate}%</div>
          <div className="text-slate-400 text-sm mt-1">通过率</div>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
        <h2 className="text-xl font-semibold text-white mb-4">最近提交</h2>
        
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : submissions.length === 0 ? (
          <p className="text-slate-400 text-center py-8">暂无提交记录</p>
        ) : (
          <div className="space-y-3">
            {submissions.slice(0, 5).map((submission) => (
              <div
                key={submission.id}
                className="flex items-center justify-between p-4 bg-slate-700 rounded-lg"
              >
                <div>
                  <div className="text-white font-medium">
                    {submission.problem?.title || '题目'}
                  </div>
                  <div className="text-slate-400 text-sm mt-1">
                    {new Date(submission.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    submission.status === 'ACCEPTED'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}>
                    {submission.status === 'ACCEPTED' ? '通过' : '未通过'}
                  </span>
                  {submission.score !== null && (
                    <span className="text-white font-semibold">
                      {submission.score}分
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
