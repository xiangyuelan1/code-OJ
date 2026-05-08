import { useState, useEffect } from 'react';
import { problemsAPI } from '../../services/api';
import { problemsAPI as adminProblemsAPI } from '../../services/api';
import { usersAPI } from '../../services/api';
import { Code, CheckCircle, PenTool, Users, TrendingUp, Clock } from 'lucide-react';

export function AdminDashboard() {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const statsRes = await adminProblemsAPI.getStats();
      const usersRes = await usersAPI.getAll();
      
      if (statsRes.success) {
        setStats(statsRes.data);
      }
      if (usersRes.success) {
        setUsers(usersRes.data);
      }
    } catch (error) {
      console.error('加载统计数据失败', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: '总题目数',
      value: stats?.total || 0,
      icon: Code,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10'
    },
    {
      title: '编程题',
      value: stats?.byType?.find((t: any) => t.type === 'PROGRAMMING')?._count?.type || 0,
      icon: Code,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10'
    },
    {
      title: '选择题',
      value: stats?.byType?.find((t: any) => t.type === 'CHOICE')?._count?.type || 0,
      icon: CheckCircle,
      color: 'text-green-400',
      bg: 'bg-green-500/10'
    },
    {
      title: '填空题',
      value: stats?.byType?.find((t: any) => t.type === 'FILL_BLANK')?._count?.type || 0,
      icon: PenTool,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10'
    },
    {
      title: '总用户数',
      value: users.length,
      icon: Users,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10'
    }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">管理后台概览</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {statCards.map((stat) => (
          <div key={stat.title} className="bg-slate-800 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
            <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
            <div className="text-slate-400 text-sm">{stat.title}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">难度分布</h2>
          <div className="space-y-4">
            {['EASY', 'MEDIUM', 'HARD'].map((diff) => {
              const count = stats?.byDifficulty?.find((d: any) => d.difficulty === diff)?._count?.difficulty || 0;
              const percentage = stats?.total ? Math.round((count / stats.total) * 100) : 0;
              const colors = {
                EASY: 'bg-green-500',
                MEDIUM: 'bg-yellow-500',
                HARD: 'bg-red-500'
              };
              const labels = {
                EASY: '简单',
                MEDIUM: '中等',
                HARD: '困难'
              };
              return (
                <div key={diff}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-300">{labels[diff as keyof typeof labels]}</span>
                    <span className="text-slate-400">{count} 题 ({percentage}%)</span>
                  </div>
                  <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors[diff as keyof typeof colors]} transition-all`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 shadow-lg">
          <h2 className="text-xl font-semibold text-white mb-4">最近注册用户</h2>
          <div className="space-y-3">
            {users.slice(0, 5).map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                <div>
                  <div className="text-white font-medium">{u.username}</div>
                  <div className="text-slate-400 text-sm">{u.email}</div>
                </div>
                <span className={`px-2 py-1 rounded text-xs ${
                  u.role === 'ADMIN' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>
                  {u.role === 'ADMIN' ? '管理员' : '学生'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
