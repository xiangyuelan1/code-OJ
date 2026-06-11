import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { courseAPI, problemsAPI } from '../services/api';
import {
  BookOpen, ChevronDown, ChevronRight, CheckCircle2, Circle,
  PlayCircle, FileText, Code, GraduationCap, ArrowLeft, Loader2
} from 'lucide-react';

// ================== 类型定义 ==================

interface CourseSession {
  id: string;
  name: string;
  order: number;
  materialText?: string;
  problemIds?: string[];
  examId?: string;
}

interface CourseStage {
  id: string;
  name: string;
  order: number;
  sessions: CourseSession[];
}

interface CourseDetail {
  id: string;
  name: string;
  description?: string;
  classId: string;
  stages: CourseStage[];
}

interface SessionProgress {
  sessionId: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

interface CourseProgress {
  courseId: string;
  sessions: SessionProgress[];
}

interface ProblemBrief {
  id: string;
  title: string;
  difficulty?: string;
}

type ProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';

// ================== 辅助函数 ==================

/** 获取讲次的进度状态 */
function getSessionStatus(progress: CourseProgress | null, sessionId: string): ProgressStatus {
  if (!progress) return 'NOT_STARTED';
  const found = progress.sessions.find(s => s.sessionId === sessionId);
  return found?.status ?? 'NOT_STARTED';
}

/** 统计完成情况 */
function computeOverallProgress(stages: CourseStage[], progress: CourseProgress | null) {
  let total = 0;
  let completed = 0;
  for (const stage of stages) {
    for (const session of stage.sessions) {
      total++;
      if (getSessionStatus(progress, session.id) === 'COMPLETED') completed++;
    }
  }
  return { total, completed };
}

// ================== 状态图标组件 ==================

function StatusIcon({ status }: { status: ProgressStatus }) {
  switch (status) {
    case 'COMPLETED':
      return <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />;
    case 'IN_PROGRESS':
      return <PlayCircle size={18} className="text-cyan-400 shrink-0" />;
    default:
      return <Circle size={18} className="text-slate-600 shrink-0" />;
  }
}

// ================== 主组件 ==================

export function StudentCoursePage() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();

  // 核心数据
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [progress, setProgress] = useState<CourseProgress | null>(null);
  const [allProblems, setAllProblems] = useState<ProblemBrief[]>([]);

  // UI 状态
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [expandedStages, setExpandedStages] = useState<Set<string>>(new Set());
  const [markingComplete, setMarkingComplete] = useState(false);

  // 加载课程数据
  useEffect(() => {
    if (!courseId) return;

    async function loadCourseData() {
      setLoading(true);
      setError(null);

      try {
        const [courseRes, progressRes, problemsRes] = await Promise.all([
          courseAPI.getById(courseId!),
          courseAPI.getProgress(courseId!),
          problemsAPI.getAll(),
        ]);

        if (!courseRes.success || !courseRes.data) {
          setError('课程不存在或无权访问');
          return;
        }

        setCourse(courseRes.data);
        setProgress(progressRes.success ? progressRes.data : null);
        setAllProblems(problemsRes.success && Array.isArray(problemsRes.data) ? problemsRes.data : []);

        // 默认展开所有阶段，选中第一个讲次
        const stages: CourseStage[] = courseRes.data.stages || [];
        setExpandedStages(new Set(stages.map(s => s.id)));
        const firstSession = stages.flatMap(s => s.sessions).sort((a, b) => a.order - b.order)[0];
        if (firstSession) setSelectedSessionId(firstSession.id);
      } catch {
        setError('加载课程数据失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    }

    loadCourseData();
  }, [courseId]);

  // 当前选中的讲次
  const selectedSession = useMemo(() => {
    if (!course || !selectedSessionId) return null;
    for (const stage of course.stages) {
      const found = stage.sessions.find(s => s.id === selectedSessionId);
      if (found) return found;
    }
    return null;
  }, [course, selectedSessionId]);

  // 当前讲次关联的题目信息
  const sessionProblems = useMemo(() => {
    if (!selectedSession?.problemIds?.length) return [];
    return allProblems.filter(p => selectedSession.problemIds!.includes(p.id));
  }, [selectedSession, allProblems]);

  // 总体进度
  const overallProgress = useMemo(() => {
    if (!course) return { total: 0, completed: 0 };
    return computeOverallProgress(course.stages, progress);
  }, [course, progress]);

  // 切换阶段折叠
  function toggleStage(stageId: string) {
    setExpandedStages(prev => {
      const next = new Set(prev);
      if (next.has(stageId)) next.delete(stageId);
      else next.add(stageId);
      return next;
    });
  }

  // 标记当前讲次为已完成
  async function handleMarkComplete() {
    if (!courseId || !selectedSessionId) return;
    setMarkingComplete(true);
    try {
      const res = await courseAPI.updateProgress(courseId, selectedSessionId, 'COMPLETED');
      if (res.success) {
        // 重新拉取进度数据
        const progressRes = await courseAPI.getProgress(courseId);
        if (progressRes.success) setProgress(progressRes.data);
      }
    } finally {
      setMarkingComplete(false);
    }
  }

  // ================== 渲染 ==================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-cyan-400" size={40} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 text-lg">{error}</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            返回上一页
          </button>
        </div>
      </div>
    );
  }

  if (!course) return null;

  const hasNoSessions = course.stages.every(s => s.sessions.length === 0);
  const currentSessionStatus = selectedSessionId ? getSessionStatus(progress, selectedSessionId) : 'NOT_STARTED';
  const progressPercent = overallProgress.total > 0 ? Math.round((overallProgress.completed / overallProgress.total) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-900">
      {/* 顶部进度栏 */}
      <div className="bg-slate-800/60 border-b border-slate-700/50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft size={20} />
            </button>
            <BookOpen size={22} className="text-cyan-400" />
            <h1 className="text-xl font-bold text-white">{course.name}</h1>
          </div>
          {course.description && (
            <p className="text-slate-400 text-sm mb-3 ml-10">{course.description}</p>
          )}
          {/* 进度条 */}
          <div className="ml-10">
            <div className="flex items-center justify-between text-sm mb-1.5">
              <span className="text-slate-400">
                学习进度：{overallProgress.completed}/{overallProgress.total} 讲次已完成
              </span>
              <span className="text-cyan-400 font-medium">{progressPercent}%</span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 主体：左侧目录 + 右侧内容 */}
      {hasNoSessions ? (
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <BookOpen size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">该课程暂无讲次内容</p>
            <p className="text-slate-500 text-sm mt-1">请等待教师添加课程内容</p>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-0 md:gap-0 min-h-[calc(100vh-140px)]">
          {/* 左侧：课程目录树 */}
          <aside className="w-full md:w-80 lg:w-96 shrink-0 border-r border-slate-700/50 bg-slate-800/30 overflow-y-auto">
            <div className="p-4">
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">课程目录</h2>
              <nav className="space-y-1">
                {course.stages
                  .sort((a, b) => a.order - b.order)
                  .map(stage => {
                    const isExpanded = expandedStages.has(stage.id);
                    return (
                      <div key={stage.id}>
                        {/* 阶段标题 */}
                        <button
                          onClick={() => toggleStage(stage.id)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-slate-700/50 transition-colors group"
                        >
                          {isExpanded ? (
                            <ChevronDown size={16} className="text-slate-500 group-hover:text-slate-300" />
                          ) : (
                            <ChevronRight size={16} className="text-slate-500 group-hover:text-slate-300" />
                          )}
                          <GraduationCap size={16} className="text-amber-400/80" />
                          <span className="text-sm font-medium text-slate-300 group-hover:text-white truncate">
                            {stage.name}
                          </span>
                          <span className="ml-auto text-xs text-slate-500">
                            {stage.sessions.length}讲
                          </span>
                        </button>

                        {/* 讲次列表 */}
                        {isExpanded && (
                          <div className="ml-4 pl-4 border-l border-slate-700/50 space-y-0.5 mt-0.5 mb-2">
                            {stage.sessions
                              .sort((a, b) => a.order - b.order)
                              .map(session => {
                                const status = getSessionStatus(progress, session.id);
                                const isSelected = session.id === selectedSessionId;
                                return (
                                  <button
                                    key={session.id}
                                    onClick={() => setSelectedSessionId(session.id)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg transition-colors ${
                                      isSelected
                                        ? 'bg-cyan-500/10 border border-cyan-500/30'
                                        : 'hover:bg-slate-700/30'
                                    }`}
                                  >
                                    <StatusIcon status={status} />
                                    <span
                                      className={`text-sm truncate ${
                                        isSelected ? 'text-cyan-300 font-medium' :
                                        status === 'COMPLETED' ? 'text-emerald-300/80' :
                                        status === 'IN_PROGRESS' ? 'text-white' :
                                        'text-slate-400'
                                      }`}
                                    >
                                      {session.name}
                                    </span>
                                    {session.problemIds?.length ? (
                                      <span className="ml-auto text-xs text-slate-500 shrink-0">
                                        {session.problemIds.length}题
                                      </span>
                                    ) : null}
                                  </button>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </nav>
            </div>
          </aside>

          {/* 右侧：讲次内容 */}
          <main className="flex-1 overflow-y-auto p-6">
            {selectedSession ? (
              <div className="max-w-3xl">
                {/* 讲次标题和状态 */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-1">{selectedSession.name}</h2>
                    <SessionStatusBadge status={currentSessionStatus} />
                  </div>
                  {currentSessionStatus !== 'COMPLETED' && (
                    <button
                      onClick={handleMarkComplete}
                      disabled={markingComplete}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                      {markingComplete ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={16} />
                      )}
                      标记为已完成
                    </button>
                  )}
                </div>

                {/* 学习资料 */}
                {selectedSession.materialText && (
                  <section className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <FileText size={16} />
                      学习资料
                    </h3>
                    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5">
                      <div className="prose prose-invert prose-sm max-w-none text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {selectedSession.materialText}
                      </div>
                    </div>
                  </section>
                )}

                {/* 关联题目 */}
                {selectedSession.problemIds && selectedSession.problemIds.length > 0 && (
                  <section className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Code size={16} />
                      关联题目（{selectedSession.problemIds.length}）
                    </h3>
                    <div className="space-y-2">
                      {selectedSession.problemIds.map(pid => {
                        const problem = sessionProblems.find(p => p.id === pid);
                        return (
                          <button
                            key={pid}
                            onClick={() => navigate(`/problem/${pid}/solve`)}
                            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-800/60 border border-slate-700/50 rounded-lg hover:bg-slate-700/50 hover:border-cyan-500/30 transition-colors text-left group"
                          >
                            <Code size={16} className="text-slate-500 group-hover:text-cyan-400 shrink-0" />
                            <span className="text-sm text-slate-300 group-hover:text-white truncate">
                              {problem?.title || `题目 ${pid.slice(0, 8)}`}
                            </span>
                            {problem?.difficulty && (
                              <DifficultyBadge difficulty={problem.difficulty} />
                            )}
                            <ChevronRight size={16} className="ml-auto text-slate-600 group-hover:text-cyan-400 shrink-0" />
                          </button>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* 关联考试入口 */}
                {selectedSession.examId && (
                  <section className="mb-8">
                    <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <GraduationCap size={16} />
                      关联考试
                    </h3>
                    <button
                      onClick={() => navigate(`/exam/${selectedSession.examId}`)}
                      className="flex items-center gap-3 px-4 py-3 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors group"
                    >
                      <GraduationCap size={18} className="text-amber-400" />
                      <span className="text-sm font-medium text-amber-300">参加考试</span>
                      <ChevronRight size={16} className="ml-auto text-amber-500/60 group-hover:text-amber-400" />
                    </button>
                  </section>
                )}

                {/* 无内容时的提示 */}
                {!selectedSession.materialText && !selectedSession.problemIds?.length && !selectedSession.examId && (
                  <div className="flex items-center justify-center py-20">
                    <div className="text-center">
                      <FileText size={40} className="text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-400">该讲次暂无学习内容</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-slate-500">请从左侧选择一个讲次</p>
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

// ================== 子组件 ==================

/** 讲次状态标签 */
function SessionStatusBadge({ status }: { status: ProgressStatus }) {
  const config = {
    NOT_STARTED: { label: '未开始', className: 'bg-slate-700/60 text-slate-400 border-slate-600' },
    IN_PROGRESS: { label: '进行中', className: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' },
    COMPLETED: { label: '已完成', className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
  };
  const { label, className } = config[status];
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium border ${className}`}>
      {label}
    </span>
  );
}

/** 题目难度标签 */
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const normalized = difficulty.toUpperCase();
  const config: Record<string, string> = {
    EASY: 'text-emerald-400 bg-emerald-500/10',
    MEDIUM: 'text-amber-400 bg-amber-500/10',
    HARD: 'text-red-400 bg-red-500/10',
  };
  const label: Record<string, string> = { EASY: '简单', MEDIUM: '中等', HARD: '困难' };
  return (
    <span className={`ml-auto text-xs px-2 py-0.5 rounded ${config[normalized] || 'text-slate-400 bg-slate-700/50'}`}>
      {label[normalized] || difficulty}
    </span>
  );
}
