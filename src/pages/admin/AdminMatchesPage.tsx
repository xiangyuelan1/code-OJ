import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminMatchesAPI } from '../../services/api';
import { Swords, Trophy, Clock, Users, ChevronDown, ChevronUp } from 'lucide-react';

export function AdminMatchesPage() {
  const [searchParams] = useSearchParams();
  const [matches, setMatches] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMatches();
  }, [page]);

  const fetchMatches = async () => {
    try {
      setLoading(true);
      const res = await adminMatchesAPI.getAll({ page, pageSize: 20 });
      if (res.success && res.data) {
        setMatches(res.data.matches || []);
        setTotal(res.data.total || 0);
      }
    } catch (error) {
      console.error('获取PK记录失败', error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case '1V1_RANKED': return '排位赛';
      case '1V1_FRIENDLY': return '友谊赛';
      case 'GROUP_ARENA': return '多人竞技';
      default: return type;
    }
  };

  const getStatusName = (status: string) => {
    switch (status) {
      case 'COMPLETED': return '已结束';
      case 'IN_PROGRESS': return '进行中';
      case 'WAITING': return '等待中';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-500/20 text-green-400';
      case 'IN_PROGRESS': return 'bg-yellow-500/20 text-yellow-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const totalPages = Math.ceil(total / 20);

  if (loading && matches.length === 0) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-6">PK对战记录</h1>

      <div className="text-slate-400 text-sm mb-6">共 {total} 场对战</div>

      {matches.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <Swords className="h-16 w-16 text-slate-500 mx-auto mb-4" />
          <p className="text-slate-400 text-lg">暂无对战记录</p>
        </div>
      ) : (
        <div className="space-y-4">
          {matches.map((match) => {
            const isExpanded = expandedId === match.id;
            const participants = match.participants || [];
            const winner = participants.find((p: any) => p.isWinner);
            const loser = participants.find((p: any) => !p.isWinner);

            return (
              <div key={match.id} className="bg-slate-800 rounded-xl overflow-hidden">
                <div
                  className="p-6 cursor-pointer hover:bg-slate-750 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : match.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-orange-500/10 rounded-lg">
                        <Swords className="h-6 w-6 text-orange-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs px-2 py-1 bg-orange-500/20 text-orange-400 rounded">
                            {getTypeName(match.type)}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${getStatusColor(match.status)}`}>
                            {getStatusName(match.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2">
                          {winner && (
                            <div className="flex items-center gap-2">
                              <Trophy className="h-4 w-4 text-yellow-400" />
                              <span className="text-white font-medium">{winner.user?.username}</span>
                              <span className="text-cyan-400 text-sm">{winner.score}分</span>
                            </div>
                          )}
                          {loser && (
                            <div className="flex items-center gap-2 text-slate-400">
                              <span>VS</span>
                              <span>{loser.user?.username}</span>
                              <span className="text-sm">{loser.score}分</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500">
                        {new Date(match.createdAt).toLocaleString()}
                      </div>
                      {match.endTime && match.startTime && (
                        <div className="text-xs text-slate-400 mt-1 flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {Math.round((new Date(match.endTime).getTime() - new Date(match.startTime).getTime()) / 60000)} 分钟
                        </div>
                      )}
                      {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400 mt-1" /> : <ChevronDown className="h-5 w-5 text-slate-400 mt-1" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-700 p-6">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3">参赛详情</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400">
                            <th className="text-left pb-2">选手</th>
                            <th className="text-center pb-2">得分</th>
                            <th className="text-center pb-2">正确题数</th>
                            <th className="text-center pb-2">用时(秒)</th>
                            <th className="text-center pb-2">结果</th>
                          </tr>
                        </thead>
                        <tbody>
                          {participants.map((p: any) => (
                            <tr key={p.id} className="border-t border-slate-700">
                              <td className="py-2 text-white">{p.user?.username}</td>
                              <td className="py-2 text-center text-cyan-400">{p.score}</td>
                              <td className="py-2 text-center">{p.correctCount}</td>
                              <td className="py-2 text-center">{p.totalTime}</td>
                              <td className="py-2 text-center">
                                {p.isWinner ? (
                                  <span className="text-yellow-400 flex items-center justify-center gap-1">
                                    <Trophy className="h-3 w-3" /> 胜
                                  </span>
                                ) : (
                                  <span className="text-slate-400">负</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {match.problems && match.problems.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-300 mb-2">比赛题目</h4>
                        <div className="flex flex-wrap gap-2">
                          {match.problems.map((mp: any, idx: number) => (
                            <span key={mp.id} className="text-xs px-3 py-1 bg-slate-700 rounded text-slate-300">
                              {idx + 1}. {mp.problem?.title || '未知题目'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {match.rewards && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-slate-300 mb-1">积分奖励</h4>
                        <p className="text-xs text-slate-400">
                          {typeof match.rewards === 'string' ? match.rewards : JSON.stringify(match.rewards)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

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
