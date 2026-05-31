import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  starpathSocialAPI,
  starpathAPI,
  type LeaderboardEntry,
  type FriendData,
  type TeamChallengeData,
  type StarMapData,
  type StarMapPlanet,
} from '../services/api';
import {
  Trophy, Users, Swords, UserPlus, Check, X,
  ArrowLeft, Loader2, Search, Crown,
} from 'lucide-react';

/* ── 闪烁星星背景（与其他 StarPath 页面保持一致） ── */

function TwinklingStars({ count = 80 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      });
    }
    return result;
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── 排行榜前三名排名颜色 ── */

function getRankStyle(rank: number): string {
  switch (rank) {
    case 1: return 'text-amber-400';
    case 2: return 'text-slate-300';
    case 3: return 'text-amber-600';
    default: return 'text-slate-500';
  }
}

/* ── 用户头像组件（统一头像渲染逻辑，避免重复） ── */

function UserAvatar({ avatar, username, size = 'sm' }: { avatar: string | null; username: string; size?: 'sm' | 'md' }) {
  const dim = size === 'md' ? 'w-10 h-10 text-sm' : 'w-8 h-8 text-xs';
  return (
    <div className={`${dim} rounded-full bg-violet-500/20 border border-violet-400/20 flex items-center justify-center text-violet-300 overflow-hidden shrink-0`}>
      {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : username.charAt(0).toUpperCase()}
    </div>
  );
}

/* ── 主页面 ── */

export function StarSocialPage() {
  /* 标签页索引：0=排行榜 1=好友 2=团队赛 */
  const [activeTab, setActiveTab] = useState(0);

  /* 排行榜相关状态 */
  const [lbScope, setLbScope] = useState<'global' | 'region' | 'planet'>('global');
  const [lbData, setLbData] = useState<LeaderboardEntry[]>([]);
  const [lbLoading, setLbLoading] = useState(true);
  const [mapData, setMapData] = useState<StarMapData | null>(null);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedPlanetId, setSelectedPlanetId] = useState('');

  /* 好友相关状态 */
  const [friends, setFriends] = useState<FriendData[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendData[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; avatar: string | null }>>([]);
  const [searching, setSearching] = useState(false);

  /* 团队赛相关状态 */
  const [challenges, setChallenges] = useState<TeamChallengeData[]>([]);
  const [challengesLoading, setChallengesLoading] = useState(true);

  /* 好友进度弹窗状态 */
  const [progressFriend, setProgressFriend] = useState<FriendData | null>(null);
  const [friendProgress, setFriendProgress] = useState<any>(null);
  const [progressLoading, setProgressLoading] = useState(false);

  /* ── 加载星图数据（用于排行榜的区域/星球选择器） ── */
  useEffect(() => {
    const loadMap = async () => {
      try {
        const res = await starpathAPI.getMap();
        if (res.success && res.data) {
          const data = res.data as StarMapData;
          setMapData(data);
          if (data.regions.length > 0) {
            setSelectedRegionId(data.regions[0].id);
          }
        }
      } catch {
        /* 星图数据加载失败不阻塞渲染 */
      }
    };
    loadMap();
  }, []);

  /* ── 区域变更时重置星球选择 ── */
  useEffect(() => {
    if (!mapData) return;
    const region = mapData.regions.find(r => r.id === selectedRegionId);
    if (region && region.planets.length > 0) {
      setSelectedPlanetId(region.planets[0].id);
    } else {
      setSelectedPlanetId('');
    }
  }, [selectedRegionId, mapData]);

  /* ── 加载排行榜数据 ── */
  const loadLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      let res;
      switch (lbScope) {
        case 'global':
          res = await starpathSocialAPI.getGlobalLeaderboard();
          break;
        case 'region':
          if (!selectedRegionId) { setLbLoading(false); return; }
          res = await starpathSocialAPI.getRegionLeaderboard(selectedRegionId);
          break;
        case 'planet':
          if (!selectedPlanetId) { setLbLoading(false); return; }
          res = await starpathSocialAPI.getPlanetLeaderboard(selectedPlanetId);
          break;
      }
      if (res!.success && res!.data) {
        setLbData(Array.isArray(res!.data) ? res!.data : []);
      }
    } catch {
      setLbData([]);
    } finally {
      setLbLoading(false);
    }
  }, [lbScope, selectedRegionId, selectedPlanetId]);

  useEffect(() => { loadLeaderboard(); }, [loadLeaderboard]);

  /* ── 加载好友与待处理请求 ── */
  const loadFriends = useCallback(async () => {
    setFriendsLoading(true);
    try {
      const [friendsRes, pendingRes] = await Promise.all([
        starpathSocialAPI.getFriends(),
        starpathSocialAPI.getPendingRequests(),
      ]);
      if (friendsRes.success && friendsRes.data) {
        setFriends(Array.isArray(friendsRes.data) ? friendsRes.data : []);
      }
      if (pendingRes.success && pendingRes.data) {
        setPendingRequests(Array.isArray(pendingRes.data) ? pendingRes.data : []);
      }
    } catch {
      /* 好友数据加载失败不阻塞渲染 */
    } finally {
      setFriendsLoading(false);
    }
  }, []);

  useEffect(() => { loadFriends(); }, [loadFriends]);

  /* ── 加载团队赛数据 ── */
  const loadChallenges = useCallback(async () => {
    setChallengesLoading(true);
    try {
      const res = await starpathSocialAPI.getTeamChallenges();
      if (res.success && res.data) {
        setChallenges(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setChallenges([]);
    } finally {
      setChallengesLoading(false);
    }
  }, []);

  useEffect(() => { loadChallenges(); }, [loadChallenges]);

  /* 当前选中区域的星球列表 */
  const currentRegionPlanets: StarMapPlanet[] = useMemo(() => {
    if (!mapData || !selectedRegionId) return [];
    return mapData.regions.find(r => r.id === selectedRegionId)?.planets ?? [];
  }, [mapData, selectedRegionId]);

  /* ── 搜索用户 ── */
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await starpathSocialAPI.searchUsers(searchQuery.trim());
      if (res.success && res.data) {
        setSearchResults(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  /* ── 发送好友请求 ── */
  const handleSendRequest = async (friendId: string) => {
    try {
      await starpathSocialAPI.sendFriendRequest(friendId);
      setSearchResults(prev => prev.filter(u => u.id !== friendId));
    } catch {
      /* 发送请求失败 */
    }
  };

  /* ── 接受好友请求 ── */
  const handleAcceptRequest = async (friendId: string) => {
    try {
      await starpathSocialAPI.acceptFriendRequest(friendId);
      setPendingRequests(prev => prev.filter(r => r.id !== friendId));
      loadFriends();
    } catch {
      /* 接受请求失败 */
    }
  };

  /* ── 删除好友 ── */
  const handleRemoveFriend = async (friendId: string) => {
    try {
      await starpathSocialAPI.removeFriend(friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
    } catch {
      /* 删除好友失败 */
    }
  };

  /* ── 查看好友星途进度 ── */
  const handleViewProgress = async (friend: FriendData) => {
    setProgressFriend(friend);
    setProgressLoading(true);
    try {
      const res = await starpathSocialAPI.getFriendProgress(friend.id);
      if (res.success && res.data) {
        setFriendProgress(res.data);
      }
    } catch {
      setFriendProgress(null);
    } finally {
      setProgressLoading(false);
    }
  };

  /* ── 加入团队赛 ── */
  const handleJoinChallenge = async (challengeId: string) => {
    try {
      await starpathSocialAPI.joinTeamChallenge(challengeId);
      loadChallenges();
    } catch {
      /* 加入挑战失败 */
    }
  };

  /* 标签页配置 */
  const tabs = [
    { label: '排行榜', icon: Trophy },
    { label: '好友', icon: Users },
    { label: '团队赛', icon: Swords },
  ];

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <TwinklingStars count={80} />

      {/* ── 页面头部 ── */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/starpath"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回星图
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            星际<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">社交</span>
          </h1>
        </div>

        {/* 标签页导航 */}
        <div className="flex gap-2">
          {tabs.map((tab, idx) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(idx)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === idx
                  ? 'bg-violet-500/20 border border-violet-400/30 text-violet-300'
                  : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
           排行榜标签页
         ══════════════════════════════════════ */}
      {activeTab === 0 && (
        <div className="relative z-10">
          {/* 排行榜范围切换：全局 / 星域 / 星球 */}
          <div className="flex flex-wrap items-center gap-3 mb-6">
            {(['global', 'region', 'planet'] as const).map(scope => (
              <button
                key={scope}
                onClick={() => setLbScope(scope)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  lbScope === scope
                    ? 'bg-cyan-500/15 border border-cyan-400/25 text-cyan-300'
                    : 'bg-white/[0.03] border border-white/10 text-slate-400 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {scope === 'global' ? '全局' : scope === 'region' ? '星域' : '星球'}
              </button>
            ))}

            {/* 星域选择下拉 */}
            {lbScope === 'region' && mapData && (
              <select
                value={selectedRegionId}
                onChange={e => setSelectedRegionId(e.target.value)}
                className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm outline-none focus:border-violet-400/40"
              >
                {mapData.regions.map(r => (
                  <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>
                ))}
              </select>
            )}

            {/* 星球选择需要先选星域再选星球 */}
            {lbScope === 'planet' && mapData && (
              <>
                <select
                  value={selectedRegionId}
                  onChange={e => setSelectedRegionId(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm outline-none focus:border-violet-400/40"
                >
                  {mapData.regions.map(r => (
                    <option key={r.id} value={r.id} className="bg-slate-900">{r.name}</option>
                  ))}
                </select>
                <select
                  value={selectedPlanetId}
                  onChange={e => setSelectedPlanetId(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10 text-white text-sm outline-none focus:border-violet-400/40"
                >
                  {currentRegionPlanets.map(p => (
                    <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                  ))}
                </select>
              </>
            )}
          </div>

          {/* 排行榜表格 */}
          {lbLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
          ) : lbData.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Trophy className="h-10 w-10 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">暂无排行数据</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="px-6 py-4 text-left text-xs text-slate-500 font-medium">排名</th>
                    <th className="px-6 py-4 text-left text-xs text-slate-500 font-medium">用户</th>
                    <th className="px-6 py-4 text-right text-xs text-slate-500 font-medium">
                      {lbScope === 'planet' ? '得分/尝试' : lbScope === 'global' ? '总分/精通' : '得分'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {lbData.map(entry => (
                    <tr key={entry.userId} className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {entry.rank <= 3 && <Crown className={`h-4 w-4 ${getRankStyle(entry.rank)}`} />}
                          <span className={`font-bold ${getRankStyle(entry.rank)}`}>{entry.rank}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar avatar={entry.avatar} username={entry.username} />
                          <span className="text-sm text-white font-medium">{entry.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm text-amber-400 font-medium">
                          {lbScope === 'planet'
                            ? `${entry.score ?? 0}${entry.attempts ? ` / ${entry.attempts}次` : ''}`
                            : lbScope === 'global'
                              ? `${entry.totalScore ?? entry.score ?? 0}`
                              : `${entry.score ?? 0}`}
                        </span>
                        {lbScope === 'global' && entry.masteredPlanets !== undefined && (
                          <span className="text-xs text-slate-500 ml-2">精通 {entry.masteredPlanets}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
           好友标签页
         ══════════════════════════════════════ */}
      {activeTab === 1 && (
        <div className="relative z-10 space-y-6">

          {/* 添加好友：通过用户名搜索 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-violet-400" />
              添加好友
            </h3>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder="输入用户名搜索..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 outline-none focus:border-violet-400/40 transition-colors text-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={searching}
                className="px-5 py-2.5 rounded-xl bg-violet-500/15 border border-violet-400/25 text-violet-300 text-sm font-medium hover:bg-violet-500/25 disabled:opacity-50 transition-all flex items-center gap-2"
              >
                {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                搜索
              </button>
            </div>

            {/* 搜索结果列表 */}
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2">
                {searchResults.map(user => (
                  <div key={user.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <UserAvatar avatar={user.avatar} username={user.username} />
                      <span className="text-sm text-white">{user.username}</span>
                    </div>
                    <button
                      onClick={() => handleSendRequest(user.id)}
                      className="px-3 py-1.5 rounded-lg bg-violet-500/15 border border-violet-400/25 text-violet-300 text-xs hover:bg-violet-500/25 transition-all flex items-center gap-1.5"
                    >
                      <UserPlus className="h-3 w-3" />
                      添加
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 待处理好友请求 */}
          {pendingRequests.length > 0 && (
            <div className="glass-card rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-400" />
                好友请求
                <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs">{pendingRequests.length}</span>
              </h3>
              <div className="space-y-2">
                {pendingRequests.map(req => (
                  <div key={req.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5">
                    <div className="flex items-center gap-3">
                      <UserAvatar avatar={req.avatar} username={req.username} />
                      <span className="text-sm text-white">{req.username}</span>
                    </div>
                    <button
                      onClick={() => handleAcceptRequest(req.id)}
                      className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-400/25 text-emerald-400 hover:bg-emerald-500/25 transition-all flex items-center gap-1.5"
                    >
                      <Check className="h-4 w-4" />
                      <span className="text-xs">接受</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 好友列表 */}
          <div className="glass-card rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Users className="h-5 w-5 text-cyan-400" />
              我的好友
              {friends.length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-xs">{friends.length}</span>
              )}
            </h3>

            {friendsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
            ) : friends.length === 0 ? (
              <div className="text-center py-10">
                <Users className="h-10 w-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">还没有好友，搜索添加吧！</p>
              </div>
            ) : (
              <div className="space-y-2">
                {friends.map(friend => (
                  <div
                    key={friend.id}
                    onClick={() => handleViewProgress(friend)}
                    className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.02] border border-white/5 cursor-pointer hover:bg-white/[0.05] hover:border-white/10 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <UserAvatar avatar={friend.avatar} username={friend.username} size="md" />
                      <div>
                        <span className="text-sm text-white font-medium group-hover:text-violet-300 transition-colors">{friend.username}</span>
                        <div className="text-xs text-amber-400">{friend.points} 积分</div>
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveFriend(friend.id); }}
                      className="p-2 rounded-lg bg-rose-500/10 border border-rose-400/15 text-rose-400/60 hover:text-rose-400 hover:bg-rose-500/20 transition-all opacity-0 group-hover:opacity-100"
                      title="删除好友"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════
           团队赛标签页
         ══════════════════════════════════════ */}
      {activeTab === 2 && (
        <div className="relative z-10">
          {challengesLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 text-violet-400 animate-spin" />
            </div>
          ) : challenges.length === 0 ? (
            <div className="glass-card rounded-2xl p-10 text-center">
              <Swords className="h-10 w-10 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400 text-sm">暂无团队赛</p>
              <p className="text-slate-500 text-xs mt-1">新的挑战即将到来！</p>
            </div>
          ) : (
            <div className="space-y-4">
              {challenges.map(challenge => {
                const isActive = challenge.status === 'ACTIVE';
                /* 统计所有队伍的总参与人数 */
                const totalMembers = challenge.teams?.reduce(
                  (sum: number, t: any) => sum + (t.members?.length ?? 0), 0,
                ) ?? 0;

                return (
                  <div key={challenge.id} className="glass-card glass-card-hover rounded-2xl p-6 transition-all">
                    {/* 挑战标题与状态 */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Swords className="h-5 w-5 text-violet-400" />
                          <h3 className="text-lg font-semibold text-white">{challenge.title}</h3>
                        </div>
                        <p className="text-sm text-slate-400">{challenge.description}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs border shrink-0 ml-4 ${
                        isActive
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400/25'
                          : challenge.status === 'UPCOMING'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-400/25'
                            : 'bg-slate-500/15 text-slate-400 border-slate-400/25'
                      }`}>
                        {isActive ? '进行中' : challenge.status === 'UPCOMING' ? '即将开始' : '已结束'}
                      </span>
                    </div>

                    {/* 挑战关键数据 */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                        <div className="text-xs text-slate-500">队伍上限</div>
                        <div className="text-sm text-white font-medium">{challenge.maxTeamSize}人</div>
                      </div>
                      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                        <div className="text-xs text-slate-500">参与人数</div>
                        <div className="text-sm text-white font-medium">{totalMembers}人</div>
                      </div>
                      <div className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5 text-center">
                        <div className="text-xs text-slate-500">奖励积分</div>
                        <div className="text-sm text-amber-400 font-medium">+{challenge.rewardPoints}</div>
                      </div>
                    </div>

                    {/* 起止时间 */}
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-4">
                      <span>开始: {new Date(challenge.startTime).toLocaleDateString()}</span>
                      <span>结束: {new Date(challenge.endTime).toLocaleDateString()}</span>
                    </div>

                    {/* 参赛队伍标签 */}
                    {challenge.teams && challenge.teams.length > 0 && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-2">参赛队伍</div>
                        <div className="flex flex-wrap gap-2">
                          {challenge.teams.map((team: any, idx: number) => (
                            <span key={idx} className="px-3 py-1 rounded-full bg-violet-500/10 border border-violet-400/15 text-violet-300 text-xs">
                              {team.name ?? `队伍 ${idx + 1}`} ({team.members?.length ?? 0}人)
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 加入挑战按钮（仅进行中的挑战可加入） */}
                    {isActive && (
                      <button
                        onClick={() => handleJoinChallenge(challenge.id)}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                      >
                        <Swords className="h-4 w-4" />
                        加入挑战
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════
           好友星途进度弹窗
         ══════════════════════════════════════ */}
      {progressFriend && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setProgressFriend(null)}
        >
          <div
            className="glass-card rounded-2xl p-6 w-full max-w-md mx-4 animate-fade-in-up"
            onClick={e => e.stopPropagation()}
          >
            {/* 弹窗头部：好友信息与关闭按钮 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <UserAvatar avatar={progressFriend.avatar} username={progressFriend.username} size="md" />
                <div>
                  <h3 className="text-lg font-semibold text-white">{progressFriend.username}</h3>
                  <span className="text-xs text-amber-400">{progressFriend.points} 积分</span>
                </div>
              </div>
              <button
                onClick={() => setProgressFriend(null)}
                className="p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {progressLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
              </div>
            ) : friendProgress ? (
              <div className="space-y-3">
                {/* 总体统计 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <div className="text-xs text-slate-500 mb-1">精通星球</div>
                    <div className="text-lg font-bold text-amber-400">{friendProgress.totalMastered ?? friendProgress.masteredPlanets ?? 0}</div>
                  </div>
                  <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/5 text-center">
                    <div className="text-xs text-slate-500 mb-1">总分</div>
                    <div className="text-lg font-bold text-cyan-400">{friendProgress.totalScore ?? 0}</div>
                  </div>
                </div>

                {/* 各星域探索进度 */}
                {friendProgress.regions && Array.isArray(friendProgress.regions) && (
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 mt-2">星域进度</div>
                    {friendProgress.regions.map((region: any) => {
                      const pct = region.totalPlanets > 0
                        ? Math.round((region.exploredPlanets / region.totalPlanets) * 100)
                        : 0;
                      return (
                        <div key={region.id} className="px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5">
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="text-white">{region.name}</span>
                            <span className="text-slate-400 text-xs">{region.exploredPlanets}/{region.totalPlanets}</span>
                          </div>
                          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-slate-400 text-sm">无法获取进度数据</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
