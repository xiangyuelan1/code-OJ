import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { classAPI, enhancedAiAPI } from '../../services/api';
import {
  GraduationCap, Users, Code, CheckCircle,
  Loader2, ChevronDown, ChevronRight,
  Sparkles, Tags, AlertTriangle, UserCheck,
  Plus, X, Copy, RefreshCw,
  CheckCircle2, XCircle, Zap, Cpu, DollarSign, Save,
} from 'lucide-react';

// ==================== 类型定义 ====================

interface DashboardData {
  totalClasses: number;
  totalStudents: number;
  totalSubmissions: number;
  acceptanceRate: number;
  weeklyTrend: DayTrend[];
  difficultyDistribution: DifficultyDist[] | Record<string, { total: number; accepted: number }>;
  pendingRequests: number;
}

interface DayTrend {
  date: string;
  submissions: number;
  accepted: number;
}

interface DifficultyDist {
  difficulty: string;
  accepted: number;
  total: number;
}

interface ClassItem {
  id: string;
  name: string;
  grade?: string;
  description?: string;
  classCode?: string;
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

interface ClassForm {
  name: string;
  description: string;
  grade: string;
}

// ==================== 常量 ====================

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string; textColor: string }> = {
  EASY: { label: '简单', color: 'bg-green-500', textColor: 'text-green-400' },
  MEDIUM: { label: '中等', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  HARD: { label: '困难', color: 'bg-red-500', textColor: 'text-red-400' },
};

const DEFAULT_DASHBOARD: DashboardData = {
  totalClasses: 0,
  totalStudents: 0,
  totalSubmissions: 0,
  acceptanceRate: 0,
  weeklyTrend: [],
  difficultyDistribution: [],
  pendingRequests: 0,
};

const EMPTY_CLASS_FORM: ClassForm = { name: '', description: '', grade: '' };

// ==================== 工具函数 ====================

/** 将后端返回的 difficultyDistribution 统一转为数组格式 */
function normalizeDifficultyDistribution(
  dist: DifficultyDist[] | Record<string, { total: number; accepted: number }> | undefined
): DifficultyDist[] {
  if (!dist) {
    return [
      { difficulty: 'EASY', accepted: 0, total: 0 },
      { difficulty: 'MEDIUM', accepted: 0, total: 0 },
      { difficulty: 'HARD', accepted: 0, total: 0 },
    ];
  }
  if (Array.isArray(dist)) return dist;
  // 对象格式: { EASY: { total, accepted }, MEDIUM: {...}, HARD: {...} }
  return Object.entries(dist).map(([difficulty, data]) => ({
    difficulty,
    total: data?.total ?? 0,
    accepted: data?.accepted ?? 0,
  }));
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatTokenCount(tokens: number): string {
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

// ==================== 组件 ====================

export function TeacherDashboard() {
  const { user } = useAuthStore();

  // 核心数据
  const [dashboard, setDashboard] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 班级管理交互状态
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classMembers, setClassMembers] = useState<Record<string, any[]>>({});
  const [classJoinRequests, setClassJoinRequests] = useState<Record<string, any[]>>({});
  const [classMembersLoading, setClassMembersLoading] = useState<string | null>(null);

  // 创建班级
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [classForm, setClassForm] = useState<ClassForm>(EMPTY_CLASS_FORM);
  const [creating, setCreating] = useState(false);

  // AI 操作
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  // ==================== 数据获取 ====================

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 并行获取三个数据源
      const [dashboardRes, classesRes, aiUsageRes] = await Promise.allSettled([
        classAPI.getTeacherDashboard(),
        classAPI.getAll(),
        enhancedAiAPI.getTeacherAIUsage(),
      ]);

      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.success) {
        setDashboard(dashboardRes.value.data ?? DEFAULT_DASHBOARD);
      }

      if (classesRes.status === 'fulfilled' && classesRes.value.success) {
        const teacherClasses = (classesRes.value.data ?? []).filter(
          (cls: any) => cls.createdBy === user?.id || cls.creator?.id === user?.id
        );
        setClasses(teacherClasses.map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          grade: cls.grade,
          description: cls.description,
          classCode: cls.classCode,
          memberCount: cls._count?.members ?? cls.memberCount ?? 0,
          totalSubmissions: cls.totalSubmissions ?? 0,
          acceptedSubmissions: cls.acceptedSubmissions ?? 0,
          acceptanceRate: cls.acceptanceRate ?? 0,
          topStudents: cls.topStudents ?? [],
        })));
      }

      if (aiUsageRes.status === 'fulfilled' && aiUsageRes.value.success) {
        setAiUsage(aiUsageRes.value.data);
      }
    } catch (err: any) {
      setError(err?.error?.message || '加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  /** 展开班级时加载成员和加入请求 */
  const loadClassDetails = useCallback(async (classId: string) => {
    setClassMembersLoading(classId);
    try {
      const [membersRes, requestsRes] = await Promise.allSettled([
        classAPI.getMembers(classId),
        classAPI.getJoinRequests(classId),
      ]);

      if (membersRes.status === 'fulfilled' && membersRes.value.success) {
        setClassMembers(prev => ({ ...prev, [classId]: membersRes.value.data ?? [] }));
      }
      if (requestsRes.status === 'fulfilled' && requestsRes.value.success) {
        setClassJoinRequests(prev => ({ ...prev, [classId]: requestsRes.value.data ?? [] }));
      }
    } catch (err) {
      console.error('加载班级详情失败', err);
    } finally {
      setClassMembersLoading(null);
    }
  }, []);

  // ==================== 班级操作 ====================

  const toggleClassExpand = (classId: string) => {
    if (expandedClassId === classId) {
      setExpandedClassId(null);
    } else {
      setExpandedClassId(classId);
      // 首次展开时加载成员数据
      if (!classMembers[classId]) {
        loadClassDetails(classId);
      }
    }
  };

  const handleCreateClass = async () => {
    if (!classForm.name.trim()) { alert('请填写班级名称'); return; }
    setCreating(true);
    try {
      const res = await classAPI.create({
        name: classForm.name,
        description: classForm.description || undefined,
        grade: classForm.grade || undefined,
      });
      if (res.success) {
        setClassForm(EMPTY_CLASS_FORM);
        setShowCreateForm(false);
        fetchData();
      }
    } catch (err: any) {
      alert(err?.error?.message || '创建班级失败');
    } finally {
      setCreating(false);
    }
  };

  const handleReviewJoinRequest = async (classId: string, requestId: string, approved: boolean) => {
    try {
      const res = await classAPI.reviewJoinRequest(requestId, approved);
      if (res.success) {
        // 刷新该班级的请求和成员
        loadClassDetails(classId);
      }
    } catch (err: any) {
      alert(err?.error?.message || (approved ? '审批通过失败' : '拒绝申请失败'));
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      alert('复制失败，请手动复制');
    }
  };

  const handleGenerateCode = async (classId: string) => {
    try {
      const res = await classAPI.generateClassCode(classId);
      if (res.success) {
        alert(`班级码已生成: ${res.data.classCode}`);
        fetchData();
      }
    } catch (err: any) {
      alert(err?.error?.message || '生成班级码失败');
    }
  };

  // ==================== AI 操作 ====================

  const handleAiAction = async (action: 'generateExam' | 'batchClassify') => {
    setAiLoading(action);
    try {
      if (action === 'generateExam') {
        const res = await enhancedAiAPI.generateExam({ classIds: classes.map(c => c.id) });
        if (res.success) alert('AI 试卷生成任务已提交，请稍后在考试管理中查看');
      } else {
        const res = await enhancedAiAPI.batchClassify({ classIds: classes.map(c => c.id) });
        if (res.success) alert('AI 批量分类任务已提交，请稍后查看结果');
      }
    } catch (err: any) {
      alert(err?.error?.message || 'AI 操作失败，请稍后重试');
    } finally {
      setAiLoading(null);
    }
  };

  // ==================== 加载 / 错误状态 ====================

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
        <button onClick={fetchData} className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
          重新加载
        </button>
      </div>
    );
  }

  // ==================== 数据推导 ====================

  // 难度分布：兼容对象和数组两种后端返回格式
  const difficultyArr = normalizeDifficultyDistribution(dashboard.difficultyDistribution);

  // 名额信息
  const studentQuota = (user as any)?.studentQuota ?? 0;
  const classQuota = (user as any)?.classQuota ?? 0;
  const studentQuotaPct = studentQuota > 0 ? Math.min(Math.round((dashboard.totalStudents / studentQuota) * 100), 100) : 0;
  const classQuotaPct = classQuota > 0 ? Math.min(Math.round((dashboard.totalClasses / classQuota) * 100), 100) : 0;

  // 周趋势
  const weeklyTrend = dashboard.weeklyTrend.length > 0
    ? dashboard.weeklyTrend
    : Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { date: d.toISOString().slice(0, 10), submissions: 0, accepted: 0 };
      });

  const maxTrendValue = Math.max(...weeklyTrend.map(d => Math.max(d.submissions, d.accepted)), 1);

  // 图表尺寸
  const CHART_W = 600, CHART_H = 200;
  const PL = 40, PR = 10, PT = 10, PB = 30;
  const plotW = CHART_W - PL - PR;
  const plotH = CHART_H - PT - PB;
  const barGroupW = plotW / weeklyTrend.length;
  const barW = barGroupW * 0.3;
  const barGap = barGroupW * 0.1;

  // 待审核总数
  const totalPendingRequests = Object.values(classJoinRequests).reduce(
    (sum, reqs) => sum + (reqs || []).filter((r: any) => r.status === 'PENDING').length,
    dashboard.pendingRequests
  );

  // ==================== 渲染 ====================

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">教师工作台</h1>

      {/* ==================== A. 顶部统计卡片 ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4 mb-8">
        {/* 总班级 */}
        <StatCard icon={GraduationCap} color="text-cyan-400" bg="bg-cyan-500/10" title="总班级" value={dashboard.totalClasses} />
        {/* 总学生 */}
        <StatCard icon={Users} color="text-green-400" bg="bg-green-500/10" title="总学生" value={dashboard.totalStudents} />
        {/* 总提交 */}
        <StatCard icon={Code} color="text-yellow-400" bg="bg-yellow-500/10" title="总提交" value={dashboard.totalSubmissions} />
        {/* 通过率 */}
        <StatCard icon={CheckCircle} color="text-purple-400" bg="bg-purple-500/10" title="通过率" value={`${Math.round(dashboard.acceptanceRate)}%`} />
        {/* 学生名额 */}
        <div className="bg-slate-800 rounded-xl p-5 shadow-xl border border-slate-700">
          <div className="p-2.5 rounded-lg bg-orange-500/10 w-fit mb-3">
            <UserCheck className="h-5 w-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {dashboard.totalStudents}{studentQuota > 0 ? `/${studentQuota}` : ''}
          </div>
          <div className="text-slate-400 text-sm mb-2">学生名额</div>
          {studentQuota > 0 && (
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${studentQuotaPct >= 90 ? 'bg-red-500' : studentQuotaPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${studentQuotaPct}%` }}
              />
            </div>
          )}
        </div>
        {/* 班级名额 */}
        <div className="bg-slate-800 rounded-xl p-5 shadow-xl border border-slate-700">
          <div className="p-2.5 rounded-lg bg-indigo-500/10 w-fit mb-3">
            <GraduationCap className="h-5 w-5 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">
            {dashboard.totalClasses}{classQuota > 0 ? `/${classQuota}` : ''}
          </div>
          <div className="text-slate-400 text-sm mb-2">班级名额</div>
          {classQuota > 0 && (
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${classQuotaPct >= 90 ? 'bg-red-500' : classQuotaPct >= 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${classQuotaPct}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ==================== B. AI/Token 用量总览 ==================== */}
      {aiUsage && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Zap className="h-5 w-5 text-cyan-400" />
              <h2 className="text-xl font-semibold text-white">AI / Token 用量总览</h2>
            </div>
            <button
              onClick={fetchData}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              刷新
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            {/* 我的 Token */}
            <div className="bg-slate-750 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Cpu className="h-4 w-4 text-cyan-400" />
                <span className="text-slate-400 text-sm">我的 Token 用量</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400">
                {formatTokenCount(aiUsage.myUsage?.totalTokens ?? aiUsage.teacherTokens ?? 0)}
              </div>
            </div>
            {/* 学生总 Token */}
            <div className="bg-slate-750 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Users className="h-4 w-4 text-green-400" />
                <span className="text-slate-400 text-sm">学生总 Token</span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {formatTokenCount(aiUsage.studentsUsage?.totalTokens ?? aiUsage.studentTokens ?? 0)}
              </div>
            </div>
            {/* 总费用 */}
            <div className="bg-slate-750 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-yellow-400" />
                <span className="text-slate-400 text-sm">总费用</span>
              </div>
              <div className="text-2xl font-bold text-yellow-400">
                ¥{((aiUsage.myUsage?.totalCost ?? 0) + (aiUsage.studentsUsage?.totalCost ?? 0) || aiUsage.totalCost ?? 0).toFixed(2)}
              </div>
            </div>
            {/* 总调用次数 */}
            <div className="bg-slate-750 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-purple-400" />
                <span className="text-slate-400 text-sm">总调用次数</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {(aiUsage.myUsage?.totalCalls ?? 0) + (aiUsage.studentsUsage?.totalCalls ?? 0) || aiUsage.totalCalls ?? 0}
              </div>
            </div>
          </div>

          {/* 按功能分类统计 */}
          {aiUsage.byFeature && Object.keys(aiUsage.byFeature).length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">按功能分布</h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(aiUsage.byFeature).map(([feature, data]: [string, any]) => (
                  <div key={feature} className="px-3 py-2 bg-slate-700 rounded-lg">
                    <div className="text-xs text-slate-400">{feature}</div>
                    <div className="text-sm font-medium text-white">
                      {data?.calls ?? data ?? 0} 次
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 班级维度 AI 用量 */}
          {aiUsage.classUsage && Array.isArray(aiUsage.classUsage) && aiUsage.classUsage.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-medium text-slate-300 mb-3">各班级学生 AI 用量</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-700">
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">班级</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">Token</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">调用次数</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">费用</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {aiUsage.classUsage.map((cu: any) => (
                      <tr key={cu.classId} className="hover:bg-slate-750">
                        <td className="px-4 py-2 text-white text-sm">{cu.className || cu.classId}</td>
                        <td className="px-4 py-2 text-cyan-400 text-sm">{formatTokenCount(cu.totalTokens ?? 0)}</td>
                        <td className="px-4 py-2 text-slate-300 text-sm">{cu.totalCalls ?? 0}</td>
                        <td className="px-4 py-2 text-green-400 text-sm">¥{(cu.totalCost ?? 0).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================== C. 趋势图 + 难度分布 ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 周趋势图 */}
        <div className="lg:col-span-2 bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">近 7 天提交趋势</h2>
          {weeklyTrend.every(d => d.submissions === 0 && d.accepted === 0) ? (
            <div className="flex items-center justify-center h-48 text-slate-500">暂无提交数据</div>
          ) : (
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} className="w-full h-auto" preserveAspectRatio="xMidYMid meet">
              {/* Y 轴刻度 */}
              {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
                const y = PT + plotH * (1 - ratio);
                return (
                  <g key={ratio}>
                    <line x1={PL} y1={y} x2={CHART_W - PR} y2={y} stroke="#334155" strokeWidth={1} />
                    <text x={PL - 6} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize={11}>
                      {Math.round(maxTrendValue * ratio)}
                    </text>
                  </g>
                );
              })}
              {/* 柱状图 */}
              {weeklyTrend.map((day, i) => {
                const gx = PL + i * barGroupW;
                const subH = (day.submissions / maxTrendValue) * plotH;
                const accH = (day.accepted / maxTrendValue) * plotH;
                return (
                  <g key={day.date}>
                    <rect x={gx + barGap} y={PT + plotH - subH} width={barW} height={subH} fill="#22d3ee" rx={2} opacity={0.8} />
                    <rect x={gx + barGap + barW + 2} y={PT + plotH - accH} width={barW} height={accH} fill="#4ade80" rx={2} opacity={0.8} />
                    <text x={gx + barGroupW / 2} y={CHART_H - 8} textAnchor="middle" fill="#94a3b8" fontSize={11}>
                      {formatDateLabel(day.date)}
                    </text>
                  </g>
                );
              })}
              {/* 图例 */}
              <rect x={CHART_W - 140} y={6} width={12} height={12} fill="#22d3ee" rx={2} />
              <text x={CHART_W - 124} y={16} fill="#94a3b8" fontSize={11}>提交</text>
              <rect x={CHART_W - 72} y={6} width={12} height={12} fill="#4ade80" rx={2} />
              <text x={CHART_W - 56} y={16} fill="#94a3b8" fontSize={11}>通过</text>
            </svg>
          )}
        </div>

        {/* 难度分布 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">难度分布</h2>
          <div className="space-y-5">
            {difficultyArr.map(dist => {
              const config = DIFFICULTY_CONFIG[dist.difficulty] ?? { label: dist.difficulty, color: 'bg-slate-500', textColor: 'text-slate-400' };
              const pct = dist.total > 0 ? Math.round((dist.accepted / dist.total) * 100) : 0;
              return (
                <div key={dist.difficulty}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
                    <span className="text-sm text-slate-400">{dist.accepted}/{dist.total} 通过</span>
                  </div>
                  <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                    <div className={`h-full ${config.color} transition-all duration-500`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="text-right mt-1">
                    <span className="text-xs text-slate-500">{pct}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ==================== D. 班级管理区域 ==================== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">班级管理</h2>
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建班级
          </button>
        </div>

        {/* 创建班级表单 */}
        {showCreateForm && (
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">创建新班级</h3>
            <div className="space-y-4 max-w-2xl">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">班级名称 *</label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="请输入班级名称"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">班级描述</label>
                <textarea
                  value={classForm.description}
                  onChange={e => setClassForm({ ...classForm, description: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows={2}
                  placeholder="班级描述（可选）"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">年级</label>
                <input
                  type="text"
                  value={classForm.grade}
                  onChange={e => setClassForm({ ...classForm, grade: e.target.value })}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  placeholder="如：高一、2024级（可选）"
                />
              </div>
            </div>
            <div className="flex justify-end gap-4 mt-6">
              <button
                onClick={() => { setShowCreateForm(false); setClassForm(EMPTY_CLASS_FORM); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateClass}
                disabled={creating}
                className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                创建班级
              </button>
            </div>
          </div>
        )}

        {/* 班级列表 */}
        {classes.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center shadow-xl border border-slate-700">
            <GraduationCap className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无班级</p>
            <p className="text-slate-500 mt-1 text-sm">点击"创建班级"按钮开始</p>
          </div>
        ) : (
          <div className="space-y-4">
            {classes.map(cls => {
              const isExpanded = expandedClassId === cls.id;
              const members = classMembers[cls.id] || [];
              const requests = (classJoinRequests[cls.id] || []).filter((r: any) => r.status === 'PENDING');
              const isLoadingDetail = classMembersLoading === cls.id;

              return (
                <div key={cls.id} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  {/* 班级头部 */}
                  <div
                    className="px-6 py-4 cursor-pointer hover:bg-slate-750 transition-colors"
                    onClick={() => toggleClassExpand(cls.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded
                          ? <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                          : <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />}
                        <GraduationCap className="h-5 w-5 text-cyan-400 shrink-0" />
                        <h3 className="text-lg font-semibold text-white truncate">{cls.name}</h3>
                        {cls.grade && <span className="text-sm text-slate-500 shrink-0">({cls.grade})</span>}
                        {requests.length > 0 && (
                          <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-medium">
                            {requests.length} 待审
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 shrink-0 ml-4">
                        <span>{cls.memberCount} 成员</span>
                        <span>提交 {cls.totalSubmissions}</span>
                        <span>通过率 {cls.acceptanceRate > 0 ? Math.round(cls.acceptanceRate) : cls.totalSubmissions > 0 ? Math.round((cls.acceptedSubmissions / cls.totalSubmissions) * 100) : 0}%</span>
                      </div>
                    </div>

                    {/* 班级码 */}
                    {cls.classCode && (
                      <div className="flex items-center gap-2 mt-2 ml-8">
                        <span className="text-xs text-slate-500">班级码:</span>
                        <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-400 rounded font-mono text-sm">{cls.classCode}</span>
                        <button
                          onClick={e => { e.stopPropagation(); handleCopyCode(cls.classCode!); }}
                          className="text-slate-400 hover:text-cyan-400 transition-colors"
                          title="复制班级码"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {copySuccess && <span className="text-green-400 text-xs">已复制</span>}
                      </div>
                    )}
                  </div>

                  {/* 展开的班级详情 */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 px-6 py-4">
                      {isLoadingDetail ? (
                        <div className="flex justify-center py-8">
                          <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
                        </div>
                      ) : (
                        <div className="space-y-6">
                          {/* 操作按钮 */}
                          <div className="flex items-center gap-3">
                            {!cls.classCode && (
                              <button
                                onClick={() => handleGenerateCode(cls.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                                生成班级码
                              </button>
                            )}
                            <button
                              onClick={() => loadClassDetails(cls.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              刷新数据
                            </button>
                          </div>

                          {/* 待审核加入请求 */}
                          {requests.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-yellow-400 mb-3 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4" />
                                待审核加入请求 ({requests.length})
                              </h4>
                              <div className="space-y-2">
                                {requests.map((req: any) => (
                                  <div key={req.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                                    <div className="min-w-0">
                                      <div className="text-white font-medium text-sm">{req.user?.username || '未知用户'}</div>
                                      <div className="text-slate-400 text-xs">{req.user?.email || ''}</div>
                                      {req.message && (
                                        <div className="text-slate-300 text-xs mt-0.5 italic truncate">"{req.message}"</div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-4">
                                      <button
                                        onClick={() => handleReviewJoinRequest(cls.id, req.id, true)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-xs"
                                      >
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                        通过
                                      </button>
                                      <button
                                        onClick={() => handleReviewJoinRequest(cls.id, req.id, false)}
                                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-xs"
                                      >
                                        <XCircle className="h-3.5 w-3.5" />
                                        拒绝
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 成员列表 */}
                          <div>
                            <h4 className="text-sm font-medium text-slate-300 mb-3">
                              成员列表 ({members.length})
                            </h4>
                            {members.length === 0 ? (
                              <p className="text-slate-500 text-sm">暂无成员</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full">
                                  <thead>
                                    <tr className="bg-slate-700">
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">用户名</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">邮箱</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">角色</th>
                                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-300">加入时间</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-700">
                                    {members.map((member: any) => {
                                      const mu = member.user || member;
                                      return (
                                        <tr key={member.id || mu.id} className="hover:bg-slate-750">
                                          <td className="px-4 py-2 text-white text-sm">{mu.username}</td>
                                          <td className="px-4 py-2 text-slate-400 text-xs">{mu.email}</td>
                                          <td className="px-4 py-2">
                                            <span className={`text-xs px-2 py-0.5 rounded ${
                                              member.role === 'TEACHER' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                            }`}>
                                              {member.role === 'TEACHER' ? '教师' : '学生'}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2 text-slate-400 text-xs">
                                            {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString() : '-'}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>

                          {/* 活跃学生 Top */}
                          {cls.topStudents.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium text-slate-300 mb-3">活跃学生 TOP</h4>
                              <div className="space-y-2">
                                {cls.topStudents.map((student, idx) => (
                                  <div key={student.userId} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                                    <div className="flex items-center gap-3">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        idx === 0 ? 'bg-yellow-500/20 text-yellow-400'
                                        : idx === 1 ? 'bg-slate-400/20 text-slate-300'
                                        : idx === 2 ? 'bg-orange-500/20 text-orange-400'
                                        : 'bg-slate-600 text-slate-400'
                                      }`}>
                                        {idx + 1}
                                      </span>
                                      <span className="text-white font-medium text-sm">{student.username}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs">
                                      <span className="text-slate-400">通过 <span className="text-green-400">{student.acceptedCount}</span></span>
                                      <span className="text-slate-400">提交 <span className="text-cyan-400">{student.submissionCount}</span></span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
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

      {/* ==================== E. AI 快捷操作 & F. 待审核提醒 ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI 快捷操作 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">AI 快捷操作</h2>
          <div className="space-y-4">
            <button
              onClick={() => handleAiAction('generateExam')}
              disabled={aiLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading === 'generateExam'
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Sparkles className="h-5 w-5" />}
              <span className="font-medium">AI 智能组卷</span>
            </button>
            <button
              onClick={() => handleAiAction('batchClassify')}
              disabled={aiLoading !== null}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {aiLoading === 'batchClassify'
                ? <Loader2 className="h-5 w-5 animate-spin" />
                : <Tags className="h-5 w-5" />}
              <span className="font-medium">AI 批量分类</span>
            </button>
          </div>
        </div>

        {/* 待审核提醒 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">待处理事项</h2>
          {totalPendingRequests > 0 ? (
            <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
                <div>
                  <p className="text-white font-medium">{totalPendingRequests} 条待审核加入请求</p>
                  <p className="text-slate-400 text-sm mt-0.5">请在上方班级中展开查看并处理</p>
                </div>
              </div>
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

// ==================== 子组件 ====================

/** 通用统计卡片 */
function StatCard({ icon: Icon, color, bg, title, value }: {
  icon: any;
  color: string;
  bg: string;
  title: string;
  value: string | number;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 shadow-xl border border-slate-700">
      <div className={`p-2.5 rounded-lg ${bg} w-fit mb-3`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      <div className="text-slate-400 text-sm">{title}</div>
    </div>
  );
}
