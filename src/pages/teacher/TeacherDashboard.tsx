import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { classAPI, enhancedAiAPI } from '../../services/api';
import {
  GraduationCap, Users, Code, CheckCircle,
  Loader2, ChevronDown, ChevronRight,
  Sparkles, Tags, AlertTriangle, ArrowRight,
} from 'lucide-react';

interface DashboardData {
  totalClasses: number;
  totalStudents: number;
  totalSubmissions: number;
  acceptanceRate: number;
  weeklyTrend: DayTrend[];
  difficultyDistribution: DifficultyDist[];
  pendingRequests: number;
}

interface DayTrend {
  date: string;
  submissions: number;
  accepted: number;
}

interface DifficultyDist {
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  accepted: number;
  total: number;
}

interface ClassItem {
  id: string;
  name: string;
  memberCount: number;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number;
  topStudents: TopStudent[];
}

interface TopStudent {
  userId: string;
  username: string;
  acceptedCount: number;
  submissionCount: number;
}

const DIFFICULTY_CONFIG = {
  EASY: { label: '简单', color: 'bg-green-500', textColor: 'text-green-400' },
  MEDIUM: { label: '中等', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  HARD: { label: '困难', color: 'bg-red-500', textColor: 'text-red-400' },
} as const;

const DEFAULT_DASHBOARD: DashboardData = {
  totalClasses: 0,
  totalStudents: 0,
  totalSubmissions: 0,
  acceptanceRate: 0,
  weeklyTrend: [],
  difficultyDistribution: [
    { difficulty: 'EASY', accepted: 0, total: 0 },
    { difficulty: 'MEDIUM', accepted: 0, total: 0 },
    { difficulty: 'HARD', accepted: 0, total: 0 },
  ],
  pendingRequests: 0,
};

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function TeacherDashboard() {
  const { user } = useAuthStore();

  const [dashboard, setDashboard] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const [aiLoading, setAiLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardRes, classesRes] = await Promise.all([
        classAPI.getTeacherDashboard(),
        classAPI.getAll(),
      ]);

      if (dashboardRes.success) {
        setDashboard(dashboardRes.data ?? DEFAULT_DASHBOARD);
      }

      if (classesRes.success) {
        const teacherClasses = (classesRes.data ?? []).filter(
          (cls: any) => cls.createdBy === user?.id || cls.creator?.id === user?.id
        );
        setClasses(
          teacherClasses.map((cls: any) => ({
            id: cls.id,
            name: cls.name,
            memberCount: cls._count?.members ?? cls.memberCount ?? 0,
            totalSubmissions: cls.totalSubmissions ?? 0,
            acceptedSubmissions: cls.acceptedSubmissions ?? 0,
            acceptanceRate: cls.acceptanceRate ?? 0,
            topStudents: cls.topStudents ?? [],
          }))
        );
      }
    } catch (err: any) {
      setError(err?.error?.message || '加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleAiAction = async (action: 'generateExam' | 'batchClassify') => {
    setAiLoading(action);
    try {
      if (action === 'generateExam') {
        const res = await enhancedAiAPI.generateExam({
          classIds: classes.map((c) => c.id),
        });
        if (res.success) {
          alert('AI 试卷生成任务已提交，请稍后在考试管理中查看');
        }
      } else {
        const res = await enhancedAiAPI.batchClassify({
          classIds: classes.map((c) => c.id),
        });
        if (res.success) {
          alert('AI 批量分类任务已提交，请稍后查看结果');
        }
      }
    } catch (err: any) {
      alert(err?.error?.message || 'AI 操作失败，请稍后重试');
    } finally {
      setAiLoading(null);
    }
  };

  const toggleClassExpand = (classId: string) => {
    setExpandedClassId((prev) => (prev === classId ? null : classId));
  };

  /* ==================== 加载与错误状态 ==================== */

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-slate-800 rounded-xl p-12 text-center shadow-xl">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg mb-2">加载失败</p>
        <p className="text-slate-400 mb-6">{error}</p>
        <button
          onClick={fetchData}
          className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  /* ==================== A. 顶部统计卡片 ==================== */

  const statCards = [
    {
      title: '总班级数',
      value: dashboard.totalClasses,
      icon: GraduationCap,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      title: '总学生数',
      value: dashboard.totalStudents,
      icon: Users,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      title: '总提交数',
      value: dashboard.totalSubmissions,
      icon: Code,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      title: '通过率',
      value: `${Math.round(dashboard.acceptanceRate)}%`,
      icon: CheckCircle,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  /* ==================== B. 周趋势图数据计算 ==================== */

  const weeklyTrend = dashboard.weeklyTrend.length > 0
    ? dashboard.weeklyTrend
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().slice(0, 10), submissions: 0, accepted: 0 };
      });

  const maxTrendValue = Math.max(
    ...weeklyTrend.map((d) => Math.max(d.submissions, d.accepted)),
    1
  );

  const CHART_WIDTH = 600;
  const CHART_HEIGHT = 200;
  const CHART_PADDING_LEFT = 40;
  const CHART_PADDING_BOTTOM = 30;
  const CHART_PADDING_TOP = 10;
  const CHART_PADDING_RIGHT = 10;
  const plotWidth = CHART_WIDTH - CHART_PADDING_LEFT - CHART_PADDING_RIGHT;
  const plotHeight = CHART_HEIGHT - CHART_PADDING_TOP - CHART_PADDING_BOTTOM;
  const barGroupWidth = plotWidth / weeklyTrend.length;
  const barWidth = barGroupWidth * 0.3;
  const barGap = barGroupWidth * 0.1;

  /* ==================== 渲染 ==================== */

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">教师工作台</h1>

      {/* A. 顶部统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700"
          >
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* B. 周趋势图 */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">近 7 天提交趋势</h2>

          {weeklyTrend.every((d) => d.submissions === 0 && d.accepted === 0) ? (
            <div className="flex items-center justify-center h-48 text-slate-500">
              暂无提交数据
            </div>
          ) : (
            <svg
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              className="w-full h-auto"
              preserveAspectRatio="xMidYMid meet"
            >
              {/* Y 轴刻度线 */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                const y = CHART_PADDING_TOP + plotHeight * (1 - ratio);
                const label = Math.round(maxTrendValue * ratio);
                return (
                  <g key={ratio}>
                    <line
                      x1={CHART_PADDING_LEFT}
                      y1={y}
                      x2={CHART_WIDTH - CHART_PADDING_RIGHT}
                      y2={y}
                      stroke="#334155"
                      strokeWidth={1}
                    />
                    <text
                      x={CHART_PADDING_LEFT - 6}
                      y={y + 4}
                      textAnchor="end"
                      fill="#94a3b8"
                      fontSize={11}
                    >
                      {label}
                    </text>
                  </g>
                );
              })}

              {/* 柱状图 */}
              {weeklyTrend.map((day, i) => {
                const groupX = CHART_PADDING_LEFT + i * barGroupWidth;
                const subBarH = (day.submissions / maxTrendValue) * plotHeight;
                const accBarH = (day.accepted / maxTrendValue) * plotHeight;

                return (
                  <g key={day.date}>
                    {/* 提交柱 */}
                    <rect
                      x={groupX + barGap}
                      y={CHART_PADDING_TOP + plotHeight - subBarH}
                      width={barWidth}
                      height={subBarH}
                      fill="#22d3ee"
                      rx={2}
                      opacity={0.8}
                    />
                    {/* 通过柱 */}
                    <rect
                      x={groupX + barGap + barWidth + 2}
                      y={CHART_PADDING_TOP + plotHeight - accBarH}
                      width={barWidth}
                      height={accBarH}
                      fill="#4ade80"
                      rx={2}
                      opacity={0.8}
                    />
                    {/* X 轴日期标签 */}
                    <text
                      x={groupX + barGroupWidth / 2}
                      y={CHART_HEIGHT - 8}
                      textAnchor="middle"
                      fill="#94a3b8"
                      fontSize={11}
                    >
                      {formatDateLabel(day.date)}
                    </text>
                  </g>
                );
              })}

              {/* 图例 */}
              <rect x={CHART_WIDTH - 140} y={6} width={12} height={12} fill="#22d3ee" rx={2} />
              <text x={CHART_WIDTH - 124} y={16} fill="#94a3b8" fontSize={11}>提交</text>
              <rect x={CHART_WIDTH - 72} y={6} width={12} height={12} fill="#4ade80" rx={2} />
              <text x={CHART_WIDTH - 56} y={16} fill="#94a3b8" fontSize={11}>通过</text>
            </svg>
          )}
        </div>

        {/* C. 难度分布 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">难度分布</h2>

          <div className="space-y-5">
            {dashboard.difficultyDistribution.map((dist) => {
              const config = DIFFICULTY_CONFIG[dist.difficulty];
              const percentage = dist.total > 0 ? Math.round((dist.accepted / dist.total) * 100) : 0;

              return (
                <div key={dist.difficulty}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${config.textColor}`}>
                      {config.label}
                    </span>
                    <span className="text-sm text-slate-400">
                      {dist.accepted}/{dist.total} 通过
                    </span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-xs text-slate-500">{percentage}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* D. 班级列表与分析 */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-white mb-4">班级概览</h2>

        {classes.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center shadow-xl border border-slate-700">
            <GraduationCap className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无班级</p>
            <p className="text-slate-500 mt-1 text-sm">请先创建班级以查看分析数据</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {classes.map((cls) => {
              const isExpanded = expandedClassId === cls.id;
              const rate = cls.acceptanceRate > 0
                ? Math.round(cls.acceptanceRate)
                : cls.totalSubmissions > 0
                  ? Math.round((cls.acceptedSubmissions / cls.totalSubmissions) * 100)
                  : 0;

              return (
                <div
                  key={cls.id}
                  className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden"
                >
                  {/* 班级卡片头部 */}
                  <div
                    className="px-6 py-4 cursor-pointer hover:bg-slate-750 transition-colors"
                    onClick={() => toggleClassExpand(cls.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />
                        )}
                        <GraduationCap className="h-5 w-5 text-cyan-400 shrink-0" />
                        <h3 className="text-lg font-semibold text-white truncate">{cls.name}</h3>
                      </div>
                      <span className="text-sm text-slate-400 shrink-0 ml-4">
                        {cls.memberCount} 名成员
                      </span>
                    </div>

                    <div className="flex items-center gap-6 mt-3 ml-8 text-sm">
                      <span className="text-slate-400">
                        提交 <span className="text-yellow-400 font-medium">{cls.totalSubmissions}</span>
                      </span>
                      <span className="text-slate-400">
                        通过 <span className="text-green-400 font-medium">{cls.acceptedSubmissions}</span>
                      </span>
                      <span className="text-slate-400">
                        通过率 <span className="text-purple-400 font-medium">{rate}%</span>
                      </span>
                    </div>
                  </div>

                  {/* 展开的班级详情：Top 学生 */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 px-6 py-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">活跃学生 TOP</h4>
                      {cls.topStudents.length === 0 ? (
                        <p className="text-slate-500 text-sm">暂无学生提交记录</p>
                      ) : (
                        <div className="space-y-2">
                          {cls.topStudents.map((student, idx) => (
                            <div
                              key={student.userId}
                              className="flex items-center justify-between p-3 bg-slate-700 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  idx === 0
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : idx === 1
                                      ? 'bg-slate-400/20 text-slate-300'
                                      : idx === 2
                                        ? 'bg-orange-500/20 text-orange-400'
                                        : 'bg-slate-600 text-slate-400'
                                }`}>
                                  {idx + 1}
                                </span>
                                <span className="text-white font-medium">{student.username}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm">
                                <span className="text-slate-400">
                                  通过 <span className="text-green-400">{student.acceptedCount}</span>
                                </span>
                                <span className="text-slate-400">
                                  提交 <span className="text-cyan-400">{student.submissionCount}</span>
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* E. AI 快捷操作 & F. 待审核提醒 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* E. AI 快捷操作 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">AI 快捷操作</h2>

          <div className="space-y-4">
            <button
              onClick={() => handleAiAction('generateExam')}
              disabled={aiLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading === 'generateExam' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Sparkles className="h-5 w-5" />
              )}
              <span className="font-medium">AI 智能组卷</span>
            </button>

            <button
              onClick={() => handleAiAction('batchClassify')}
              disabled={aiLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading === 'batchClassify' ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Tags className="h-5 w-5" />
              )}
              <span className="font-medium">AI 批量分类</span>
            </button>
          </div>
        </div>

        {/* F. 待审核加入请求 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">待处理事项</h2>

          {dashboard.pendingRequests > 0 ? (
            <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
                <div>
                  <p className="text-white font-medium">
                    {dashboard.pendingRequests} 条待审核加入请求
                  </p>
                  <p className="text-slate-400 text-sm mt-0.5">请及时处理学生的班级加入申请</p>
                </div>
              </div>
              <a
                href="/teacher/classes"
                className="flex items-center gap-1 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors text-sm font-medium"
              >
                去处理
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-white font-medium">一切就绪</p>
                <p className="text-slate-400 text-sm mt-0.5">暂无待审核的加入请求</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
