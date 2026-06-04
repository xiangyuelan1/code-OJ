import { useEffect, useState, useCallback } from 'react';
import { classStatsAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';
import { Trophy, Users, ArrowLeft, Medal, BarChart3, TrendingUp, Crown } from 'lucide-react';

/* ── 类型定义 ── */

/** 全局班级排行榜条目 */
interface GlobalLeaderboardEntry {
  classId: string;
  name: string;
  memberCount: number;
  avgPoints: number;
  avgLevel: number;
}

/** 班级成员排行榜条目 */
interface MemberLeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string | null;
  points: number;
  level: number;
  submissionCount?: number;
}

/** 班级概览统计 */
interface ClassOverview {
  totalStudents: number;
  activeStudents: number;
  totalSubmissions: number;
  avgScore: number;
  classCode: string;
  className: string;
}

/** 成员排行榜排序方式 */
type SortBy = 'points' | 'submissions' | 'level';

/* ── 排名样式映射 ── */

const RANK_STYLES: Record<number, { bg: string; border: string; medal: string }> = {
  0: { bg: 'bg-yellow-900/30', border: 'border-yellow-600', medal: '🥇' },
  1: { bg: 'bg-slate-500/20', border: 'border-slate-400', medal: '🥈' },
  2: { bg: 'bg-orange-900/30', border: 'border-orange-600', medal: '🥉' },
};

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'points', label: '积分' },
  { key: 'submissions', label: '提交数' },
  { key: 'level', label: '等级' },
];

/* ── 组件 ── */

export function ClassLeaderboardPage() {
  const user = useAuthStore((s) => s.user);

  /* ── 视图状态：null 表示全局排行榜，有值表示班级详情 ── */
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);

  /* ── 全局排行榜 ── */
  const [globalData, setGlobalData] = useState<GlobalLeaderboardEntry[]>([]);
  const [globalLoading, setGlobalLoading] = useState(true);

  /* ── 班级详情 ── */
  const [overview, setOverview] = useState<ClassOverview | null>(null);
  const [members, setMembers] = useState<MemberLeaderboardEntry[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>('points');

  /* ── 获取全局排行榜 ── */
  const fetchGlobal = useCallback(async () => {
    setGlobalLoading(true);
    try {
      const res = await classStatsAPI.getGlobalLeaderboard();
      if (res.success && res.data) {
        setGlobalData(res.data);
      }
    } catch (err) {
      console.error('获取班级排行榜失败:', err);
    } finally {
      setGlobalLoading(false);
    }
  }, []);

  /* ── 获取班级详情（概览 + 成员排行榜） ── */
  const fetchClassDetail = useCallback(async (classId: string, sort: SortBy) => {
    setDetailLoading(true);
    try {
      const [overviewRes, leaderboardRes] = await Promise.all([
        classStatsAPI.getOverview(classId),
        classStatsAPI.getLeaderboard(classId, { sortBy: sort, limit: 50 }),
      ]);
      if (overviewRes.success && overviewRes.data) setOverview(overviewRes.data);
      if (leaderboardRes.success && leaderboardRes.data) setMembers(leaderboardRes.data);
    } catch (err) {
      console.error('获取班级详情失败:', err);
    } finally {
      setDetailLoading(false);
    }
  }, []);

  /* ── 初始化加载全局排行榜 ── */
  useEffect(() => {
    fetchGlobal();
  }, [fetchGlobal]);

  /* ── 选中班级或排序方式变化时加载详情 ── */
  useEffect(() => {
    if (selectedClassId) {
      fetchClassDetail(selectedClassId, sortBy);
    }
  }, [selectedClassId, sortBy, fetchClassDetail]);

  /* ── 返回全局排行榜 ── */
  const handleBack = () => {
    setSelectedClassId(null);
    setOverview(null);
    setMembers([]);
    setSortBy('points');
  };

  /* ── 加载中 ── */
  if (globalLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-7xl mx-auto">

        {/* ── 页面标题 ── */}
        <div className="flex items-center gap-4 mb-8">
          {selectedClassId && (
            <button
              onClick={handleBack}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
              aria-label="返回全局排行榜"
            >
              <ArrowLeft className="h-5 w-5 text-cyan-400" />
            </button>
          )}
          <h1 className="text-3xl font-bold text-cyan-400 flex items-center gap-3">
            <Trophy className="h-8 w-8" />
            {selectedClassId ? overview?.className ?? '班级详情' : '班级排行榜'}
          </h1>
        </div>

        {/* ── 全局班级排行榜视图 ── */}
        {!selectedClassId && (
          <GlobalLeaderboardView
            data={globalData}
            onSelect={setSelectedClassId}
          />
        )}

        {/* ── 班级详情视图 ── */}
        {selectedClassId && (
          <ClassDetailView
            overview={overview}
            members={members}
            sortBy={sortBy}
            onSortChange={setSortBy}
            loading={detailLoading}
            currentUserId={user?.id ?? null}
          />
        )}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  全局班级排行榜                              */
/* ──────────────────────────────────────────── */

function GlobalLeaderboardView({
  data,
  onSelect,
}: {
  data: GlobalLeaderboardEntry[];
  onSelect: (classId: string) => void;
}) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-800 rounded-lg p-12 text-center">
        <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
        <p className="text-slate-400 text-lg">暂无班级排行数据，快加入一个班级吧！</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-cyan-400" />
        全部班级排名
      </h2>

      {/* 表头 */}
      <div className="grid grid-cols-[4rem_1fr_6rem_7rem_7rem] gap-4 px-4 py-2 text-sm text-slate-400 border-b border-slate-700 mb-2">
        <span className="text-center">排名</span>
        <span>班级名称</span>
        <span className="text-center">人数</span>
        <span className="text-center">平均积分</span>
        <span className="text-center">平均等级</span>
      </div>

      {/* 排行列表 */}
      <div className="space-y-2">
        {data.map((entry, index) => {
          const style = RANK_STYLES[index];
          return (
            <button
              key={entry.classId}
              onClick={() => onSelect(entry.classId)}
              className={`w-full grid grid-cols-[4rem_1fr_6rem_7rem_7rem] gap-4 items-center px-4 py-3 rounded-lg transition-colors text-left
                ${style
                  ? `${style.bg} border ${style.border} hover:brightness-110`
                  : 'bg-slate-700/50 hover:bg-slate-700'
                }`}
            >
              {/* 排名 */}
              <span className="text-center text-2xl">
                {style ? style.medal : <span className="text-lg font-semibold text-slate-400">#{index + 1}</span>}
              </span>

              {/* 班级名称 */}
              <span className="font-semibold truncate">{entry.name}</span>

              {/* 人数 */}
              <span className="text-center text-slate-300 flex items-center justify-center gap-1">
                <Users className="h-4 w-4" />
                {entry.memberCount}
              </span>

              {/* 平均积分 */}
              <span className="text-center font-bold text-cyan-400">
                {entry.avgPoints.toFixed(1)}
              </span>

              {/* 平均等级 */}
              <span className="text-center text-slate-300">
                Lv.{entry.avgLevel.toFixed(1)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────── */
/*  班级详情视图                                */
/* ──────────────────────────────────────────── */

function ClassDetailView({
  overview,
  members,
  sortBy,
  onSortChange,
  loading,
  currentUserId,
}: {
  overview: ClassOverview | null;
  members: MemberLeaderboardEntry[];
  sortBy: SortBy;
  onSortChange: (sort: SortBy) => void;
  loading: boolean;
  currentUserId: string | null;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* ── 班级概览统计卡片 ── */}
      {overview && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Users className="h-8 w-8 text-cyan-400" />}
            value={overview.totalStudents}
            label="总学生数"
          />
          <StatCard
            icon={<TrendingUp className="h-8 w-8 text-green-400" />}
            value={overview.activeStudents}
            label="活跃学生 (7天)"
          />
          <StatCard
            icon={<Medal className="h-8 w-8 text-purple-400" />}
            value={overview.totalSubmissions}
            label="总提交数"
          />
          <StatCard
            icon={<Crown className="h-8 w-8 text-yellow-400" />}
            value={overview.avgScore.toFixed(1)}
            label="平均得分"
          />
        </div>
      )}

      {/* ── 排序切换 ── */}
      <div className="flex gap-2">
        {SORT_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => onSortChange(opt.key)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              sortBy === opt.key
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700'
            }`}
          >
            {opt.key === 'points' && <Trophy className="inline-block h-4 w-4 mr-1" />}
            {opt.key === 'submissions' && <BarChart3 className="inline-block h-4 w-4 mr-1" />}
            {opt.key === 'level' && <Crown className="inline-block h-4 w-4 mr-1" />}
            {opt.label}
          </button>
        ))}
      </div>

      {/* ── 成员排行榜 ── */}
      {members.length === 0 ? (
        <div className="bg-slate-800 rounded-lg p-12 text-center">
          <Users className="h-16 w-16 mx-auto mb-4 text-slate-600" />
          <p className="text-slate-400 text-lg">该班级暂无成员数据</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-lg p-6">
          <div className="space-y-2">
            {members.map((member) => {
              const rankIndex = member.rank - 1;
              const style = RANK_STYLES[rankIndex];
              const isMe = member.userId === currentUserId;

              return (
                <div
                  key={member.userId}
                  className={`flex items-center gap-4 p-4 rounded-lg transition-colors
                    ${style
                      ? `${style.bg} border ${style.border}`
                      : 'bg-slate-700/50'
                    }
                    ${isMe ? 'ring-2 ring-cyan-500/50' : ''}`}
                >
                  {/* 排名 */}
                  <div className="w-10 text-center text-2xl shrink-0">
                    {style ? style.medal : (
                      <span className="text-lg font-semibold text-slate-400">#{member.rank}</span>
                    )}
                  </div>

                  {/* 头像 */}
                  <div className="w-10 h-10 rounded-full bg-slate-600 flex items-center justify-center overflow-hidden shrink-0">
                    {member.avatar ? (
                      <img
                        src={member.avatar}
                        alt={member.username}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-bold text-slate-300">
                        {member.username.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>

                  {/* 用户名 */}
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">
                      {member.username}
                      {isMe && <span className="ml-2 text-xs text-cyan-400">(我)</span>}
                    </div>
                    <div className="text-sm text-slate-400">Lv.{member.level}</div>
                  </div>

                  {/* 按排序方式展示的数值 */}
                  <div className="text-right shrink-0">
                    <div className="text-xl font-bold text-cyan-400">
                      {sortBy === 'points' && member.points}
                      {sortBy === 'submissions' && (member.submissionCount ?? 0)}
                      {sortBy === 'level' && `Lv.${member.level}`}
                    </div>
                    <div className="text-sm text-slate-400">
                      {sortBy === 'points' && '积分'}
                      {sortBy === 'submissions' && '提交数'}
                      {sortBy === 'level' && '等级'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 统计卡片子组件 ── */

function StatCard({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="bg-slate-800 rounded-lg p-6 text-center">
      <div className="flex justify-center mb-2">{icon}</div>
      <div className="text-3xl font-bold text-white">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
