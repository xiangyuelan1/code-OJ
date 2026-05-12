import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { matchAPI, pointsAPI } from '../services/api';
import { useSocketStore } from '../services/socket';
import { Trophy, Users, Swords, History, Crown, TrendingUp, X } from 'lucide-react';

export function MatchPage() {
  const navigate = useNavigate();
  const { isConnected, matchStatus, matchFound, emitMatchJoin, emitMatchCancel, clearMatchFound } = useSocketStore();
  const [activeTab, setActiveTab] = useState<'match' | 'leaderboard' | 'history'>('match');
  const [matchType, setMatchType] = useState<'1V1_RANKED' | '1V1_FRIENDLY'>('1V1_RANKED');
  const [isMatching, setIsMatching] = useState(false);
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [myStats, setMyStats] = useState<any>(null);

  useEffect(() => {
    if (matchFound) {
      setIsMatching(false);
      navigate(`/match/${matchFound.matchId}`);
      clearMatchFound();
    }
  }, [matchFound]);

  useEffect(() => {
    if (activeTab === 'leaderboard') {
      fetchLeaderboard();
    } else if (activeTab === 'history') {
      fetchHistory();
    } else {
      fetchMyStats();
    }
  }, [activeTab]);

  const fetchLeaderboard = async () => {
    try {
      const response = await matchAPI.getLeaderboard(matchType, 20);
      if (response.success) {
        setLeaderboard(response.data);
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await matchAPI.getHistory(20);
      if (response.success) {
        setHistory(response.data);
      }
    } catch (error) {
      console.error('获取历史记录失败:', error);
    }
  };

  const fetchMyStats = async () => {
    try {
      const response = await pointsAPI.getMyPoints();
      if (response.success) {
        setMyStats(response.data);
      }
    } catch (error) {
      console.error('获取我的数据失败:', error);
    }
  };

  const handleStartMatch = () => {
    if (!isConnected) {
      alert('WebSocket未连接，请刷新页面重试');
      return;
    }
    setIsMatching(true);
    emitMatchJoin(matchType);
  };

  const handleCancelMatch = () => {
    setIsMatching(false);
    emitMatchCancel();
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-cyan-400">⚔️ 对战中心</h1>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('match')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'match'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Swords className="inline-block h-4 w-4 mr-2" />
            开始对战
          </button>
          <button
            onClick={() => setActiveTab('leaderboard')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <Trophy className="inline-block h-4 w-4 mr-2" />
            排行榜
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'history'
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            <History className="inline-block h-4 w-4 mr-2" />
            历史记录
          </button>
        </div>

        {activeTab === 'match' && (
          <div className="space-y-6">
            <div className="bg-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">选择对战模式</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                  onClick={() => setMatchType('1V1_RANKED')}
                  className={`p-6 rounded-lg border-2 transition-colors ${
                    matchType === '1V1_RANKED'
                      ? 'border-cyan-500 bg-cyan-900/30'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Trophy className="h-6 w-6 text-yellow-400" />
                    <span className="text-xl font-semibold">排位赛</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    5道题，获胜获得15分，失败扣除5分
                  </p>
                </button>

                <button
                  onClick={() => setMatchType('1V1_FRIENDLY')}
                  className={`p-6 rounded-lg border-2 transition-colors ${
                    matchType === '1V1_FRIENDLY'
                      ? 'border-cyan-500 bg-cyan-900/30'
                      : 'border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-6 w-6 text-green-400" />
                    <span className="text-xl font-semibold">友谊赛</span>
                  </div>
                  <p className="text-slate-400 text-sm">
                    3道题，获胜获得5分，不扣分
                  </p>
                </button>
              </div>

              {isMatching ? (
                <div className="space-y-4">
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-slate-300 text-lg">正在匹配对手...</p>
                    {matchStatus && (
                      <p className="text-slate-400 text-sm mt-2">
                        当前等待人数: {matchStatus.waiting || 0}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleCancelMatch}
                    className="w-full px-6 py-4 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold text-lg transition-all flex items-center justify-center gap-2"
                  >
                    <X className="h-5 w-5" />
                    取消匹配
                  </button>
                </div>
              ) : (
              <button
                onClick={handleStartMatch}
                disabled={!isConnected}
                className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-lg font-semibold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🎯 开始匹配
              </button>
              )}
            </div>

            {myStats && (
              <div className="bg-slate-800 rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">我的数据</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-400" />
                    <div className="text-2xl font-bold text-yellow-400">{myStats.points}</div>
                    <div className="text-sm text-slate-400">总积分</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <Crown className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                    <div className="text-2xl font-bold text-purple-400">#{myStats.rank || '-'}</div>
                    <div className="text-sm text-slate-400">排名</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 text-green-400" />
                    <div className="text-2xl font-bold text-green-400">{myStats.levelName}</div>
                    <div className="text-sm text-slate-400">等级</div>
                  </div>
                  <div className="bg-slate-700 rounded-lg p-4 text-center">
                    <Swords className="h-8 w-8 mx-auto mb-2 text-cyan-400" />
                    <div className="text-2xl font-bold text-cyan-400">Lv.{myStats.level}</div>
                    <div className="text-sm text-slate-400">段位</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">🏆 {matchType === '1V1_RANKED' ? '排位赛' : '友谊赛'} 排行榜</h2>
              <select
                value={matchType}
                onChange={(e) => {
                  setMatchType(e.target.value as any);
                  fetchLeaderboard();
                }}
                className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg focus:outline-none focus:border-cyan-500"
              >
                <option value="1V1_RANKED">排位赛</option>
                <option value="1V1_FRIENDLY">友谊赛</option>
              </select>
            </div>

            {leaderboard.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Trophy className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>暂无排行数据</p>
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <div
                    key={entry.user?.id || index}
                    className={`flex items-center gap-4 p-4 rounded-lg ${
                      index === 0
                        ? 'bg-yellow-900/30 border border-yellow-600'
                        : index === 1
                        ? 'bg-slate-600/30 border border-slate-500'
                        : index === 2
                        ? 'bg-orange-900/30 border border-orange-600'
                        : 'bg-slate-700'
                    }`}
                  >
                    <div className="w-12 text-center">
                      {index === 0 && <span className="text-2xl">🥇</span>}
                      {index === 1 && <span className="text-2xl">🥈</span>}
                      {index === 2 && <span className="text-2xl">🥉</span>}
                      {index > 2 && <span className="text-lg font-semibold text-slate-400">#{index + 1}</span>}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{entry.user?.username || '未知用户'}</div>
                      <div className="text-sm text-slate-400">
                        {entry.wins}胜 {entry.losses}负 · 胜率{entry.winRate}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-yellow-400">{entry.totalScore}</div>
                      <div className="text-sm text-slate-400">总积分</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">📜 对战历史</h2>

            {history.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <History className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>暂无对战记录</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.map((record, index) => (
                  <div
                    key={record.id || index}
                    className="flex items-center gap-4 p-4 bg-slate-700 rounded-lg"
                  >
                    <div className={`w-12 text-center text-2xl`}>
                      {record.isWinner ? '🏆' : '❌'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">
                        {record.matchType === '1V1_RANKED' ? '排位赛' : '友谊赛'}
                      </div>
                      <div className="text-sm text-slate-400">
                        对手: {record.opponent || '未知'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-lg font-bold ${record.isWinner ? 'text-green-400' : 'text-red-400'}`}>
                        {record.isWinner ? '胜' : '负'}
                      </div>
                      <div className="text-sm text-slate-400">
                        {record.score}分
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
