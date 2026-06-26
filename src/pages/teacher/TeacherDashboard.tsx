import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/auth.store';
import { classAPI, enhancedAiAPI, courseAPI } from '../../services/api';
import {
  GraduationCap, Users, Code, CheckCircle,
  Loader2, ChevronDown, ChevronRight,
  Sparkles, Tags, AlertTriangle, UserCheck,
  Plus, X, Copy, RefreshCw,
  CheckCircle2, XCircle, Zap, Cpu, DollarSign, Save,
  BookOpen, FolderOpen, BookMarked, ExternalLink,
  FileText, Download, Edit3,
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

// ==================== 课程相关类型 ====================

interface CourseOverview {
  id: string;
  name: string;
  description?: string;
  classId: string;
  className?: string;
  stageCount: number;
  sessionCount: number;
  stages: CourseStageOverview[];
}

interface CourseStageOverview {
  id: string;
  name: string;
  order: number;
  sessions: { id: string; name: string; order: number }[];
}

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
  const navigate = useNavigate();

  // 核心数据
  const [dashboard, setDashboard] = useState<DashboardData>(DEFAULT_DASHBOARD);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [aiUsage, setAiUsage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 课程资源数据
  const [courses, setCourses] = useState<CourseOverview[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const [aiSyllabusLoading, setAiSyllabusLoading] = useState<string | null>(null);

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

      let teacherClasses: any[] = [];
      if (classesRes.status === 'fulfilled' && classesRes.value.success) {
        teacherClasses = (classesRes.value.data ?? []).filter(
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

      // 获取课程数据：并行获取所有班级的课程
      if (teacherClasses.length > 0) {
        fetchCourses(teacherClasses);
      }
    } catch (err: any) {
      setError(err?.error?.message || '加载仪表盘数据失败');
    } finally {
      setLoading(false);
    }
  };

  /** 并行获取各班级课程，合并为全量课程列表 */
  const fetchCourses = async (teacherClasses: any[]) => {
    setCoursesLoading(true);
    try {
      const results = await Promise.allSettled(
        teacherClasses.map(cls => courseAPI.getByClass(cls.id))
      );
      const allCourses: CourseOverview[] = [];
      results.forEach((res, idx) => {
        if (res.status === 'fulfilled' && res.value.success) {
          const classCourses = (res.value.data || []).map((c: any) => {
            const stages = (c.stages || []).map((s: any) => ({
              id: s.id,
              name: s.name,
              order: s.order,
              sessions: (s.sessions || []).map((sess: any) => ({
                id: sess.id,
                name: sess.name,
                order: sess.order,
              })),
            }));
            return {
              id: c.id,
              name: c.name,
              description: c.description,
              classId: teacherClasses[idx].id,
              className: teacherClasses[idx].name,
              stageCount: stages.length,
              sessionCount: stages.reduce((sum: number, s: any) => sum + s.sessions.length, 0),
              stages,
            };
          });
          allCourses.push(...classCourses);
        }
      });
      setCourses(allCourses);
    } catch {
      // 课程加载失败不阻塞主面板
    } finally {
      setCoursesLoading(false);
    }
  };

  /** AI 补全大纲 */
  const handleAiCompleteSyllabus = async (courseId: string) => {
    setAiSyllabusLoading(courseId);
    try {
      await courseAPI.aiCompleteSyllabus(courseId, 12);
      alert('AI 补全大纲完成！');
      // 刷新课程列表
      if (classes.length > 0) fetchCourses(classes);
    } catch (err: any) {
      alert(err?.error?.message || 'AI 补全大纲失败');
    } finally {
      setAiSyllabusLoading(null);
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

  // ==================== AI 出题状态 ====================

  const [showAiProblemGen, setShowAiProblemGen] = useState(false);
  const [aiProblemForm, setAiProblemForm] = useState({
    topic: '', difficulty: 'MEDIUM', language: '', tags: [] as string[], requirements: '',
  });
  const [aiProblemTagInput, setAiProblemTagInput] = useState('');
  const [aiProblemGenerating, setAiProblemGenerating] = useState(false);
  const [aiGeneratedProblems, setAiGeneratedProblems] = useState<any[]>([]);
  const [aiProblemSaving, setAiProblemSaving] = useState<number | null>(null);
  const [aiProblemEditIdx, setAiProblemEditIdx] = useState<number | null>(null);

  // ==================== AI 班级报告状态 ====================

  const [classReportLoading, setClassReportLoading] = useState<string | null>(null);
  const [classReport, setClassReport] = useState<any>(null);
  const [classReportClassId, setClassReportClassId] = useState<string | null>(null);
  const [classReportTimeRange, setClassReportTimeRange] = useState<'week' | 'month'>('week');

  // ==================== AI 出题操作 ====================

  const handleGenerateProblem = async () => {
    if (!aiProblemForm.topic.trim()) { alert('请输入题目主题'); return; }
    setAiProblemGenerating(true);
    setAiGeneratedProblems([]);
    try {
      const res = await enhancedAiAPI.generateProblemEnhanced({
        topic: aiProblemForm.topic,
        difficulty: aiProblemForm.difficulty,
        language: aiProblemForm.language || undefined,
        tags: aiProblemForm.tags.length > 0 ? aiProblemForm.tags : undefined,
        requirements: aiProblemForm.requirements || undefined,
        type: 'PROGRAMMING',
      });
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setAiGeneratedProblems(res.data);
      } else {
        alert('AI 未能生成有效题目，请调整参数后重试');
      }
    } catch (err: any) {
      alert(err?.error?.message || 'AI 出题失败');
    } finally {
      setAiProblemGenerating(false);
    }
  };

  const handleSaveProblem = async (idx: number) => {
    setAiProblemSaving(idx);
    try {
      const problem = aiGeneratedProblems[idx];
      const res = await enhancedAiAPI.saveProblem(problem);
      if (res.success) {
        alert(`题目「${problem.title}」已保存到题库`);
        // 标记已保存
        setAiGeneratedProblems(prev => prev.map((p, i) => i === idx ? { ...p, _saved: true } : p));
      }
    } catch (err: any) {
      alert(err?.error?.message || '保存失败');
    } finally {
      setAiProblemSaving(null);
    }
  };

  const handleAddTag = () => {
    const tag = aiProblemTagInput.trim();
    if (tag && !aiProblemForm.tags.includes(tag)) {
      setAiProblemForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
    }
    setAiProblemTagInput('');
  };

  // ==================== AI 班级报告操作 ====================

  const handleGenerateClassReport = async (classId: string) => {
    setClassReportLoading(classId);
    setClassReportClassId(classId);
    setClassReport(null);
    try {
      const res = await enhancedAiAPI.generateClassReport({ classId, timeRange: classReportTimeRange });
      if (res.success) {
        setClassReport(res.data);
      }
    } catch (err: any) {
      alert(err?.error?.message || 'AI 班级报告生成失败');
    } finally {
      setClassReportLoading(null);
    }
  };

  const handleExportReport = () => {
    if (!classReport) return;
    const cls = classes.find(c => c.id === classReportClassId);
    const text = [
      `📊 ${cls?.name || ''} AI 班级报告`,
      '',
      `【班级总评】`,
      classReport.summary,
      '',
      `【优秀学生】`,
      ...(classReport.performers || []).map((s: string) => `• ${s}`),
      '',
      `【需关注学生】`,
      ...(classReport.struggles || []).map((s: string) => `• ${s}`),
      '',
      `【共性薄弱点】`,
      (classReport.gaps || []).join('、'),
      '',
      `【教学建议】`,
      ...(classReport.suggestions || []).map((s: string, i: number) => `${i + 1}. ${s}`),
      '',
      `【下周重点】`,
      ...(classReport.focusAreas || []).map((s: string) => `• ${s}`),
    ].join('\n');

    navigator.clipboard?.writeText(text).then(() => alert('报告已复制到剪贴板')).catch(() => {
      const w = window.open('', '_blank');
      if (w) { w.document.write(`<pre>${text}</pre>`); }
    });
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

  // 课程统计
  const totalCourses = courses.length;
  const totalStages = courses.reduce((sum, c) => sum + c.stageCount, 0);
  const totalSessions = courses.reduce((sum, c) => sum + c.sessionCount, 0);

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
                ¥{((aiUsage.myUsage?.totalCost ?? 0) + (aiUsage.studentsUsage?.totalCost ?? 0) || (aiUsage.totalCost ?? 0)).toFixed(2)}
              </div>
            </div>
            {/* 总调用次数 */}
            <div className="bg-slate-750 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-purple-400" />
                <span className="text-slate-400 text-sm">总调用次数</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">
                {(aiUsage.myUsage?.totalCalls ?? 0) + (aiUsage.studentsUsage?.totalCalls ?? 0) || (aiUsage.totalCalls ?? 0)}
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

      {/* ==================== D. 课程资源管理区域 ==================== */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">课程资源</h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/teacher/classes')}
              className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
              title="在班级管理中进行完整课程编辑"
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              完整管理
            </button>
            <button
              onClick={() => navigate('/teacher/classes')}
              className="flex items-center px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建课程
            </button>
          </div>
        </div>

        {/* 课程统计卡片 */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <div className="bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-cyan-400" />
              <span className="text-slate-400 text-sm">课程总数</span>
            </div>
            <div className="text-2xl font-bold text-cyan-400">{totalCourses}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <FolderOpen className="h-4 w-4 text-yellow-400" />
              <span className="text-slate-400 text-sm">阶段总数</span>
            </div>
            <div className="text-2xl font-bold text-yellow-400">{totalStages}</div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-1">
              <BookMarked className="h-4 w-4 text-purple-400" />
              <span className="text-slate-400 text-sm">讲次总数</span>
            </div>
            <div className="text-2xl font-bold text-purple-400">{totalSessions}</div>
          </div>
        </div>

        {/* 课程列表 */}
        {coursesLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 text-cyan-500 animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-10 text-center shadow-xl border border-slate-700">
            <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无课程</p>
            <p className="text-slate-500 mt-1 text-sm">前往班级管理的"课程体系"标签页创建课程</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map(course => {
              const isExpanded = expandedCourseId === course.id;
              return (
                <div key={course.id} className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  {/* 课程头部 */}
                  <div
                    className="px-5 py-4 cursor-pointer hover:bg-slate-750 transition-colors"
                    onClick={() => setExpandedCourseId(isExpanded ? null : course.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        {isExpanded
                          ? <ChevronDown className="h-5 w-5 text-slate-400 shrink-0" />
                          : <ChevronRight className="h-5 w-5 text-slate-400 shrink-0" />}
                        <BookOpen className="h-5 w-5 text-cyan-400 shrink-0" />
                        <h3 className="text-lg font-semibold text-white truncate">{course.name}</h3>
                        {course.className && (
                          <span className="text-xs px-2 py-0.5 bg-slate-700 text-slate-400 rounded">
                            {course.className}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-400 shrink-0 ml-4">
                        <span>{course.stageCount} 阶段</span>
                        <span>{course.sessionCount} 讲次</span>
                      </div>
                    </div>
                    {course.description && (
                      <p className="text-slate-500 text-sm mt-1 ml-8 truncate">{course.description}</p>
                    )}
                  </div>

                  {/* 展开显示阶段和讲次概览 + 操作按钮 */}
                  {isExpanded && (
                    <div className="border-t border-slate-700 px-5 py-4">
                      {/* 快捷操作 */}
                      <div className="flex items-center gap-2 mb-4">
                        <button
                          onClick={() => navigate('/teacher/classes')}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          编辑课程
                        </button>
                        <button
                          onClick={() => handleAiCompleteSyllabus(course.id)}
                          disabled={aiSyllabusLoading !== null}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-sm hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                        >
                          {aiSyllabusLoading === course.id
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : <Sparkles className="h-3.5 w-3.5" />}
                          AI补全大纲
                        </button>
                      </div>

                      {/* 阶段-讲次树形展示 */}
                      {course.stages.length === 0 ? (
                        <p className="text-slate-500 text-sm">暂无阶段，请前往完整管理页面添加</p>
                      ) : (
                        <div className="space-y-2">
                          {course.stages.map(stage => (
                            <div key={stage.id} className="bg-slate-750 rounded-lg p-3">
                              <div className="flex items-center gap-2 mb-1">
                                <FolderOpen className="h-4 w-4 text-yellow-400" />
                                <span className="font-medium text-slate-200 text-sm">
                                  阶段 {stage.order}：{stage.name}
                                </span>
                                <span className="text-xs text-slate-500">
                                  ({stage.sessions.length} 讲次)
                                </span>
                              </div>
                              {stage.sessions.length > 0 && (
                                <div className="ml-6 mt-1 space-y-0.5">
                                  {stage.sessions.map(sess => (
                                    <div key={sess.id} className="flex items-center gap-2 text-xs text-slate-400">
                                      <BookMarked className="h-3 w-3 text-purple-400" />
                                      <span>讲次 {sess.order}：{sess.name}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
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

      {/* ==================== E. 班级管理区域 ==================== */}
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
                          <div className="flex items-center gap-3 flex-wrap">
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
                            <button
                              onClick={() => handleGenerateClassReport(cls.id)}
                              disabled={classReportLoading !== null}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-500/30 transition-colors disabled:opacity-50"
                            >
                              {classReportLoading === cls.id
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <FileText className="h-3.5 w-3.5" />}
                              柯德·班级报告
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

      {/* ==================== F. AI 快捷操作 & G. 待审核提醒 ==================== */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* AI 快捷操作 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">AI 快捷操作</h2>
          <div className="space-y-4">
            <button
              onClick={() => { setShowAiProblemGen(true); setAiGeneratedProblems([]); }}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 hover:from-violet-500/20 hover:to-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-400 rounded-xl transition-colors"
            >
              <Sparkles className="h-5 w-5" />
              <span className="font-medium">AI 出题</span>
            </button>
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

      {/* ==================== AI 出题弹窗 ==================== */}
      {showAiProblemGen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-fuchsia-400" />
                柯德·智能出题
              </h2>
              <button onClick={() => setShowAiProblemGen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {aiGeneratedProblems.length === 0 ? (
              <div className="space-y-4">
                {/* 主题 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">题目主题 *</label>
                  <input
                    type="text"
                    value={aiProblemForm.topic}
                    onChange={e => setAiProblemForm(prev => ({ ...prev, topic: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    placeholder="例如：递归、二分查找、动态规划"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {/* 难度 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">难度</label>
                    <select
                      value={aiProblemForm.difficulty}
                      onChange={e => setAiProblemForm(prev => ({ ...prev, difficulty: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      <option value="EASY">简单</option>
                      <option value="MEDIUM">中等</option>
                      <option value="HARD">困难</option>
                    </select>
                  </div>
                  {/* 目标语言 */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">目标语言（可选）</label>
                    <select
                      value={aiProblemForm.language}
                      onChange={e => setAiProblemForm(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    >
                      <option value="">不限</option>
                      <option value="C++">C++</option>
                      <option value="Python">Python</option>
                      <option value="Java">Java</option>
                      <option value="JavaScript">JavaScript</option>
                      <option value="Go">Go</option>
                    </select>
                  </div>
                </div>
                {/* 标签 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">知识点标签</label>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      value={aiProblemTagInput}
                      onChange={e => setAiProblemTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                      placeholder="输入标签后回车添加"
                    />
                    <button onClick={handleAddTag} className="px-3 py-2 bg-slate-600 text-slate-300 rounded-lg text-sm hover:bg-slate-500">
                      添加
                    </button>
                  </div>
                  {aiProblemForm.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {aiProblemForm.tags.map((tag, i) => (
                        <span key={i} className="flex items-center gap-1 px-2 py-1 bg-fuchsia-500/20 text-fuchsia-300 rounded text-xs">
                          {tag}
                          <button onClick={() => setAiProblemForm(prev => ({ ...prev, tags: prev.tags.filter((_, j) => j !== i) }))} className="hover:text-white">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {/* 额外要求 */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">额外要求（可选）</label>
                  <textarea
                    value={aiProblemForm.requirements}
                    onChange={e => setAiProblemForm(prev => ({ ...prev, requirements: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500"
                    rows={2}
                    placeholder="例如：需要包含时间复杂度分析、适合初学者理解"
                  />
                </div>
                {/* 生成按钮 */}
                <button
                  onClick={handleGenerateProblem}
                  disabled={aiProblemGenerating || !aiProblemForm.topic.trim()}
                  className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-lg text-white font-semibold transition-colors disabled:opacity-50"
                >
                  {aiProblemGenerating
                    ? <><Loader2 className="h-5 w-5 mr-2 animate-spin" />AI 正在生成...</>
                    : <><Sparkles className="h-5 w-5 mr-2" />生成题目</>}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">已生成 {aiGeneratedProblems.length} 道题目，请预览并编辑后保存到题库：</p>
                {aiGeneratedProblems.map((p, idx) => (
                  <div key={idx} className="bg-slate-700/70 rounded-lg p-4 border border-slate-600">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-fuchsia-400 font-bold">#{idx + 1}</span>
                        <span className="text-white font-semibold">{p.title}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          p.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400'
                          : p.difficulty === 'HARD' ? 'bg-red-500/20 text-red-400'
                          : 'bg-yellow-500/20 text-yellow-400'
                        }`}>
                          {p.difficulty === 'EASY' ? '简单' : p.difficulty === 'HARD' ? '困难' : '中等'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setAiProblemEditIdx(aiProblemEditIdx === idx ? null : idx)}
                          className="p-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
                          title="编辑"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleSaveProblem(idx)}
                          disabled={p._saved || aiProblemSaving === idx}
                          className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30 disabled:opacity-50"
                        >
                          {aiProblemSaving === idx ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          {p._saved ? '已保存' : '保存到题库'}
                        </button>
                      </div>
                    </div>
                    <p className="text-slate-400 text-sm line-clamp-3 mb-2">{p.description?.slice(0, 200)}...</p>
                    {p.tags && (
                      <div className="flex gap-1 flex-wrap mb-2">
                        {(Array.isArray(p.tags) ? p.tags : []).map((t: string, i: number) => (
                          <span key={i} className="text-xs px-2 py-0.5 bg-cyan-500/10 text-cyan-400 rounded">{t}</span>
                        ))}
                      </div>
                    )}
                    {p.testCases && <p className="text-xs text-slate-500">{Array.isArray(p.testCases) ? p.testCases.length : 0} 个测试用例</p>}
                    {/* 简单行内编辑 */}
                    {aiProblemEditIdx === idx && (
                      <div className="mt-3 space-y-2 border-t border-slate-600 pt-3">
                        <input
                          value={p.title}
                          onChange={e => setAiGeneratedProblems(prev => prev.map((pp, i) => i === idx ? { ...pp, title: e.target.value } : pp))}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                        />
                        <textarea
                          value={p.description}
                          onChange={e => setAiGeneratedProblems(prev => prev.map((pp, i) => i === idx ? { ...pp, description: e.target.value } : pp))}
                          className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm"
                          rows={4}
                        />
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex justify-between">
                  <button
                    onClick={() => setAiGeneratedProblems([])}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
                  >
                    <RefreshCw className="h-4 w-4" />
                    重新生成
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================== AI 班级报告弹窗 ==================== */}
      {classReport && classReportClassId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                柯德·班级报告 — {classes.find(c => c.id === classReportClassId)?.name}
              </h2>
              <div className="flex items-center gap-2">
                <select
                  value={classReportTimeRange}
                  onChange={e => setClassReportTimeRange(e.target.value as 'week' | 'month')}
                  className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                >
                  <option value="week">最近一周</option>
                  <option value="month">最近一月</option>
                </select>
                <button
                  onClick={() => handleGenerateClassReport(classReportClassId)}
                  disabled={classReportLoading !== null}
                  className="p-1.5 text-slate-400 hover:text-cyan-400"
                  title="重新生成"
                >
                  {classReportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </button>
                <button onClick={() => { setClassReport(null); setClassReportClassId(null); }} className="text-slate-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 班级总评 */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-emerald-400 mb-2">📋 班级总评</h3>
              <p className="text-slate-300 text-sm leading-relaxed bg-slate-700/50 rounded-lg p-4">{classReport.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
              {/* 优秀学生 */}
              <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-400 mb-2">🌟 优秀学生</h3>
                {(classReport.performers || []).length > 0 ? (
                  <ul className="space-y-1">
                    {classReport.performers.map((s: string, i: number) => (
                      <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                        <CheckCircle className="h-3.5 w-3.5 text-green-400" />{s}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-sm">暂无数据</p>}
              </div>
              {/* 需关注学生 */}
              <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg p-4">
                <h3 className="text-sm font-medium text-orange-400 mb-2">⚠️ 需关注学生</h3>
                {(classReport.struggles || []).length > 0 ? (
                  <ul className="space-y-1">
                    {classReport.struggles.map((s: string, i: number) => (
                      <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />{s}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-slate-500 text-sm">暂无数据</p>}
              </div>
            </div>

            {/* 共性薄弱点 */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-yellow-400 mb-2">🎯 共性薄弱点</h3>
              <div className="flex flex-wrap gap-2">
                {(classReport.gaps || []).length > 0
                  ? classReport.gaps.map((g: string, i: number) => (
                      <span key={i} className="px-3 py-1 bg-yellow-500/10 text-yellow-300 rounded-full text-xs border border-yellow-500/20">{g}</span>
                    ))
                  : <p className="text-slate-500 text-sm">暂无数据</p>}
              </div>
            </div>

            {/* 教学建议 */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-cyan-400 mb-2">💡 教学建议</h3>
              <ol className="list-decimal list-inside space-y-1.5">
                {(classReport.suggestions || []).map((s: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm">{s}</li>
                ))}
              </ol>
            </div>

            {/* 下周重点 */}
            <div className="mb-5">
              <h3 className="text-sm font-medium text-purple-400 mb-2">📌 下周重点</h3>
              <ul className="space-y-1">
                {(classReport.focusAreas || []).map((s: string, i: number) => (
                  <li key={i} className="text-slate-300 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />{s}
                  </li>
                ))}
              </ul>
            </div>

            {/* 导出按钮 */}
            <div className="flex justify-end">
              <button
                onClick={handleExportReport}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
              >
                <Download className="h-4 w-4" />
                导出报告
              </button>
            </div>
          </div>
        </div>
      )}
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
