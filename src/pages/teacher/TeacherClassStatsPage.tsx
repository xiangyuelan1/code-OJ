import { useState, useEffect, useCallback } from 'react';
import { classStatsAPI, classAPI } from '../../services/api';
import {
  Users, TrendingUp, FileText, BarChart3,
  Trophy, GraduationCap, BookOpen, Target,
  Loader2, AlertTriangle, ChevronDown, ChevronUp,
} from 'lucide-react';

/* ==================== 类型定义 ==================== */

interface ClassItem {
  id: string;
  name: string;
  classCode?: string;
}

interface OverviewData {
  totalStudents: number;
  activeStudents: number;
  totalSubmissions: number;
  avgScore: number;
  classCode?: string;
  className?: string;
}

interface LeaderboardEntry {
  userId: string;
  username: string;
  points: number;
  level: number;
  submissionCount: number;
}

interface ExamResult {
  examId: string;
  title: string;
  avgScore: number;
  passRate: number;
  totalAttempts: number;
}

interface ExamStatsData {
  totalExams: number;
  avgScore: number;
  examResults: ExamResult[];
}

interface ProblemStat {
  problemId: string;
  title: string;
  difficulty: string;
  avgScore: number;
  attemptCount: number;
  successRate: number;
}

interface ProblemStatsData {
  totalProblems: number;
  avgCompletionRate: number;
  hardestProblems: ProblemStat[];
  easiestProblems: ProblemStat[];
}

type SortField = 'points' | 'submissions' | 'level';

/* ==================== 难度配色映射 ==================== */

const DIFFICULTY_CONFIG: Record<string, { label: string; color: string }> = {
  EASY: { label: '简单', color: 'bg-green-500/20 text-green-400' },
  MEDIUM: { label: '中等', color: 'bg-yellow-500/20 text-yellow-400' },
  HARD: { label: '困难', color: 'bg-red-500/20 text-red-400' },
};

function getDifficultyStyle(difficulty: string) {
  return DIFFICULTY_CONFIG[difficulty] ?? { label: difficulty, color: 'bg-slate-500/20 text-slate-400' };
}

/* ==================== 排序字段中文映射 ==================== */

const SORT_LABELS: Record<SortField, string> = {
  points: '积分',
  submissions: '提交数',
  level: '等级',
};

/* ==================== 主组件 ==================== */

export function TeacherClassStatsPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classesLoading, setClassesLoading] = useState(true);
  const [classesError, setClassesError] = useState<string | null>(null);

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [examStats, setExamStats] = useState<ExamStatsData | null>(null);
  const [problemStats, setProblemStats] = useState<ProblemStatsData | null>(null);

  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  const [sortBy, setSortBy] = useState<SortField>('points');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);

  /* ---- 加载班级列表 ---- */
  const fetchClasses = useCallback(async () => {
    setClassesLoading(true);
    setClassesError(null);
    try {
      const res = await classAPI.getAll();
      if (res.success) {
        const list = (res.data ?? []).map((cls: any) => ({
          id: cls.id,
          name: cls.name,
          classCode: cls.classCode,
        }));
        setClasses(list);
        // 默认选中第一个班级
        if (list.length > 0 && !selectedClassId) {
          setSelectedClassId(list[0].id);
        }
      }
    } catch (err: any) {
      setClassesError(err?.error?.message || '加载班级列表失败');
    } finally {
      setClassesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  /* ---- 加载选中班级的统计数据 ---- */
  const fetchClassData = useCallback(async (classId: string) => {
    if (!classId) return;
    setDataLoading(true);
    setDataError(null);
    try {
      const [overviewRes, leaderboardRes, examRes, problemRes] = await Promise.all([
        classStatsAPI.getOverview(classId),
        classStatsAPI.getLeaderboard(classId, { sortBy, limit: 20 }),
        classStatsAPI.getExamStats(classId),
        classStatsAPI.getProblemStats(classId),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data ?? null);
      if (leaderboardRes.success) setLeaderboard(leaderboardRes.data ?? []);
      if (examRes.success) setExamStats(examRes.data ?? null);
      if (problemRes.success) setProblemStats(problemRes.data ?? null);
    } catch (err: any) {
      setDataError(err?.error?.message || '加载班级数据失败');
    } finally {
      setDataLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassData(selectedClassId);
    }
  }, [selectedClassId, fetchClassData]);

  /* ---- 切换排序时重新拉取排行榜 ---- */
  const handleSortChange = (field: SortField) => {
    setSortBy(field);
    setSortMenuOpen(false);
  };

  /* ---- 重试加载 ---- */
  const handleRetry = () => {
    if (classesError) {
      fetchClasses();
    } else {
      fetchClassData(selectedClassId);
    }
  };

  /* ==================== 加载与错误状态 ==================== */

  if (classesLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
      </div>
    );
  }

  if (classesError) {
    return (
      <div className="bg-slate-800 rounded-xl p-12 text-center shadow-xl">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-400 text-lg mb-2">加载失败</p>
        <p className="text-slate-400 mb-6">{classesError}</p>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          重新加载
        </button>
      </div>
    );
  }

  /* ==================== 概览卡片配置 ==================== */

  const statCards = [
    {
      title: '总学生数',
      value: overview?.totalStudents ?? 0,
      icon: Users,
      color: 'text-cyan-400',
      bg: 'bg-cyan-500/10',
    },
    {
      title: '活跃学生(7天)',
      value: overview?.activeStudents ?? 0,
      icon: TrendingUp,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
    },
    {
      title: '总提交数',
      value: overview?.totalSubmissions ?? 0,
      icon: FileText,
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
    },
    {
      title: '平均得分',
      value: overview?.avgScore != null ? Math.round(overview.avgScore) : '-',
      icon: BarChart3,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
    },
  ];

  /* ==================== 渲染 ==================== */

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">班级数据看板</h1>

      {/* 班级选择器 */}
      {classes.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center shadow-xl border border-slate-700">
          <GraduationCap className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">暂无班级</p>
          <p className="text-slate-500 mt-1 text-sm">请先创建班级以查看统计数据</p>
        </div>
      ) : (
        <>
          {/* 班级下拉选择 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-slate-300 mb-2">选择班级</label>
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="w-full max-w-md px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>{cls.name}</option>
              ))}
            </select>
          </div>

          {/* 数据加载中 */}
          {dataLoading && (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-12 w-12 text-cyan-500 animate-spin" />
            </div>
          )}

          {/* 数据加载错误 */}
          {dataError && !dataLoading && (
            <div className="bg-slate-800 rounded-xl p-12 text-center shadow-xl border border-slate-700">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-400 text-lg mb-2">加载失败</p>
              <p className="text-slate-400 mb-6">{dataError}</p>
              <button
                onClick={handleRetry}
                className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                重新加载
              </button>
            </div>
          )}

          {/* 数据内容 */}
          {!dataLoading && !dataError && (
            <>
              {/* A. 概览统计卡片 */}
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* B. 学生排行榜 */}
                <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-cyan-400" />
                      <h2 className="text-xl font-semibold text-white">学生排行榜</h2>
                    </div>
                    {/* 排序切换 */}
                    <div className="relative">
                      <button
                        onClick={() => setSortMenuOpen(!sortMenuOpen)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg text-sm transition-colors"
                      >
                        <span>按{SORT_LABELS[sortBy]}排序</span>
                        {sortMenuOpen
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />
                        }
                      </button>
                      {sortMenuOpen && (
                        <div className="absolute right-0 top-full mt-1 bg-slate-700 border border-slate-600 rounded-lg shadow-xl z-10 min-w-[120px]">
                          {(['points', 'submissions', 'level'] as SortField[]).map((field) => (
                            <button
                              key={field}
                              onClick={() => handleSortChange(field)}
                              className={`w-full text-left px-4 py-2 text-sm transition-colors ${
                                sortBy === field
                                  ? 'text-cyan-400 bg-cyan-500/10'
                                  : 'text-slate-300 hover:bg-slate-600'
                              }`}
                            >
                              {SORT_LABELS[field]}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {leaderboard.length === 0 ? (
                    <div className="p-12 text-center">
                      <Trophy className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400">暂无数据</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-700/50">
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">排名</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">学生</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">积分</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">等级</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">提交数</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {leaderboard.map((entry, idx) => (
                            <tr key={entry.userId} className="hover:bg-slate-750 transition-colors">
                              <td className="px-6 py-4">
                                <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
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
                              </td>
                              <td className="px-6 py-4 text-white font-medium">{entry.username}</td>
                              <td className="px-6 py-4 text-cyan-400 font-medium">{entry.points}</td>
                              <td className="px-6 py-4">
                                <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-medium">
                                  Lv.{entry.level}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-300">{entry.submissionCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* C. 考试统计 */}
                <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-cyan-400" />
                    <h2 className="text-xl font-semibold text-white">考试统计</h2>
                  </div>

                  {!examStats || examStats.examResults.length === 0 ? (
                    <div className="p-12 text-center">
                      <GraduationCap className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400">暂无数据</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-700/50">
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">考试</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">平均分</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">通过率</th>
                            <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">参考次数</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700">
                          {examStats.examResults.map((exam) => (
                            <tr key={exam.examId} className="hover:bg-slate-750 transition-colors">
                              <td className="px-6 py-4 text-white font-medium">{exam.title}</td>
                              <td className="px-6 py-4 text-cyan-400 font-medium">
                                {exam.avgScore != null ? Math.round(exam.avgScore) : '-'}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  exam.passRate >= 60
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}>
                                  {exam.passRate != null ? `${Math.round(exam.passRate)}%` : '-'}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-300">{exam.totalAttempts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* D. 题目难度分析 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 最难题目 */}
                <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
                    <Target className="h-5 w-5 text-red-400" />
                    <h2 className="text-xl font-semibold text-white">最难题目</h2>
                    <span className="text-xs text-slate-500 ml-1">（通过率最低）</span>
                  </div>

                  {!problemStats || problemStats.hardestProblems.length === 0 ? (
                    <div className="p-12 text-center">
                      <Target className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400">暂无数据</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700">
                      {problemStats.hardestProblems.map((problem) => {
                        const diffStyle = getDifficultyStyle(problem.difficulty);
                        return (
                          <div key={problem.problemId} className="px-6 py-4 hover:bg-slate-750 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium truncate mr-3">{problem.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${diffStyle.color}`}>
                                {diffStyle.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-400">
                                通过率 <span className="text-red-400 font-medium">
                                  {problem.successRate != null ? `${Math.round(problem.successRate)}%` : '-'}
                                </span>
                              </span>
                              <span className="text-slate-400">
                                平均分 <span className="text-yellow-400 font-medium">
                                  {problem.avgScore != null ? Math.round(problem.avgScore) : '-'}
                                </span>
                              </span>
                              <span className="text-slate-400">
                                尝试 <span className="text-cyan-400">{problem.attemptCount}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 最易题目 */}
                <div className="bg-slate-800 rounded-xl shadow-xl border border-slate-700 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-700 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-green-400" />
                    <h2 className="text-xl font-semibold text-white">最易题目</h2>
                    <span className="text-xs text-slate-500 ml-1">（通过率最高）</span>
                  </div>

                  {!problemStats || problemStats.easiestProblems.length === 0 ? (
                    <div className="p-12 text-center">
                      <BookOpen className="h-10 w-10 text-slate-500 mx-auto mb-3" />
                      <p className="text-slate-400">暂无数据</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-700">
                      {problemStats.easiestProblems.map((problem) => {
                        const diffStyle = getDifficultyStyle(problem.difficulty);
                        return (
                          <div key={problem.problemId} className="px-6 py-4 hover:bg-slate-750 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-white font-medium truncate mr-3">{problem.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded shrink-0 ${diffStyle.color}`}>
                                {diffStyle.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-slate-400">
                                通过率 <span className="text-green-400 font-medium">
                                  {problem.successRate != null ? `${Math.round(problem.successRate)}%` : '-'}
                                </span>
                              </span>
                              <span className="text-slate-400">
                                平均分 <span className="text-yellow-400 font-medium">
                                  {problem.avgScore != null ? Math.round(problem.avgScore) : '-'}
                                </span>
                              </span>
                              <span className="text-slate-400">
                                尝试 <span className="text-cyan-400">{problem.attemptCount}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
