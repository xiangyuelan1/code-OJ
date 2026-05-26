import { useState, useEffect } from 'react';
import { enhancedAiAPI, classAPI } from '../../services/api';
import {
  BarChart3, Cpu, DollarSign, Zap, Users, Search,
  ChevronLeft, ChevronRight, Code, Lightbulb, Bug,
  FileText, CheckCircle, TreePine, Tag, FileUp, Gavel,
  GraduationCap, School,
} from 'lucide-react';

const FEATURE_META: Record<string, { label: string; icon: any; color: string }> = {
  'explain-code': { label: '代码解释', icon: Code, color: 'cyan' },
  'hint': { label: '解题提示', icon: Lightbulb, color: 'yellow' },
  'diagnose': { label: '错误诊断', icon: Bug, color: 'red' },
  'generate-solution': { label: '题解生成', icon: FileText, color: 'blue' },
  'generate-testcases': { label: '测试用例生成', icon: CheckCircle, color: 'green' },
  'parse-knowledge-tree': { label: '知识树解析', icon: TreePine, color: 'purple' },
  'classify-problem': { label: '题目分类', icon: Tag, color: 'orange' },
  'parse-problem-file': { label: '题目文件解析', icon: FileUp, color: 'pink' },
  'ai-judge': { label: 'AI判题', icon: Gavel, color: 'indigo' },
};

const COLOR_BAR: Record<string, string> = {
  cyan: 'bg-cyan-500',
  yellow: 'bg-yellow-500',
  red: 'bg-red-500',
  blue: 'bg-blue-500',
  green: 'bg-green-500',
  purple: 'bg-purple-500',
  orange: 'bg-orange-500',
  pink: 'bg-pink-500',
  indigo: 'bg-indigo-500',
};

const COLOR_TEXT: Record<string, string> = {
  cyan: 'text-cyan-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  blue: 'text-blue-400',
  green: 'text-green-400',
  purple: 'text-purple-400',
  orange: 'text-orange-400',
  pink: 'text-pink-400',
  indigo: 'text-indigo-400',
};

type PageTab = 'overview' | 'class' | 'teacher';

export function AdminAIUsagePage() {
  const [activeTab, setActiveTab] = useState<PageTab>('overview');

  // 概览数据
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filterUser, setFilterUser] = useState('');
  const [filterFeature, setFilterFeature] = useState('');

  // 班级用量数据
  const [classList, setClassList] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [classUsage, setClassUsage] = useState<any>(null);
  const [classUsageLoading, setClassUsageLoading] = useState(false);

  // 教师用量数据
  const [teacherUsage, setTeacherUsage] = useState<any>(null);
  const [teacherUsageLoading, setTeacherUsageLoading] = useState(false);
  const [expandedTeacherClass, setExpandedTeacherClass] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
    loadLogs();
    loadClassList();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [page, filterUser, filterFeature]);

  useEffect(() => {
    if (activeTab === 'class' && selectedClassId) {
      loadClassUsage(selectedClassId);
    }
  }, [selectedClassId]);

  useEffect(() => {
    if (activeTab === 'teacher') {
      loadTeacherUsage();
    }
  }, [activeTab]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const res = await enhancedAiAPI.getUsageStats();
      if (res.success) {
        setStats(res.data || {});
      }
    } catch (error) {
      console.error('获取AI用量统计失败', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      setLogsLoading(true);
      const params: any = { page, pageSize: 15 };
      if (filterUser) params.userId = filterUser;
      if (filterFeature) params.feature = filterFeature;
      const res = await enhancedAiAPI.getUsageLogs(params);
      if (res.success) {
        setLogs(res.data?.logs || res.data || []);
        const total = res.data?.total ?? (res.data || []).length;
        setTotalPages(Math.max(1, Math.ceil(total / 15)));
      }
    } catch (error) {
      console.error('获取AI用量日志失败', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const loadClassList = async () => {
    try {
      const res = await classAPI.getAll();
      if (res.success) {
        setClassList(res.data || []);
      }
    } catch (error) {
      console.error('获取班级列表失败', error);
    }
  };

  const loadClassUsage = async (classId: string) => {
    try {
      setClassUsageLoading(true);
      const res = await enhancedAiAPI.getClassAIUsage(classId);
      if (res.success) {
        setClassUsage(res.data);
      }
    } catch (error) {
      console.error('获取班级AI用量失败', error);
    } finally {
      setClassUsageLoading(false);
    }
  };

  const loadTeacherUsage = async () => {
    try {
      setTeacherUsageLoading(true);
      // 管理员视角：获取所有教师（TEACHER 角色）的 AI 用量
      // 由于后端 /usage/teacher 仅限 TEACHER 角色，管理员需要通过班级维度查看
      // 这里我们通过遍历所有班级来构建教师维度的数据
      const classesRes = await classAPI.getAll();
      if (!classesRes.success) return;

      const allClasses: any[] = classesRes.data || [];

      // 按教师（createdBy）分组
      const teacherMap = new Map<string, { teacherId: string; teacherName: string; classes: any[] }>();
      for (const cls of allClasses) {
        const teacherId = cls.createdBy || cls.creator?.id;
        const teacherName = cls.creator?.username || '未知教师';
        if (!teacherMap.has(teacherId)) {
          teacherMap.set(teacherId, { teacherId, teacherName, classes: [] });
        }
        teacherMap.get(teacherId)!.classes.push(cls);
      }

      // 为每个教师获取其班级的 AI 用量
      const teacherResults = [];
      for (const [, teacher] of teacherMap) {
        let overallTokens = 0;
        let overallCost = 0;
        let overallCalls = 0;
        let teacherCost = 0;
        let studentCost = 0;
        const classUsages = [];

        for (const cls of teacher.classes) {
          try {
            const usageRes = await enhancedAiAPI.getClassAIUsage(cls.id);
            if (usageRes.success && usageRes.data) {
              const data = usageRes.data;
              overallTokens += data.classTotal?.totalTokens ?? 0;
              overallCost += data.classTotal?.totalCost ?? 0;
              overallCalls += data.classTotal?.totalCalls ?? 0;

              const isTeacherPays = data.aiBillingMode === 'TEACHER_PAYS';
              const teacherPart = (data.users || [])
                .filter((u: any) => isTeacherPays || u.role === 'TEACHER')
                .reduce((s: number, u: any) => s + (u.totalCost ?? 0), 0);
              const studentPart = (data.users || [])
                .filter((u: any) => !isTeacherPays && u.role !== 'TEACHER')
                .reduce((s: number, u: any) => s + (u.totalCost ?? 0), 0);

              teacherCost += teacherPart;
              studentCost += studentPart;

              classUsages.push({
                classId: cls.id,
                className: cls.name || data.className,
                aiBillingMode: data.aiBillingMode,
                classTotal: data.classTotal,
                teacherCost: teacherPart,
                studentCost: studentPart,
                users: data.users || [],
              });
            }
          } catch {
            // 跳过无法获取用量的班级
          }
        }

        teacherResults.push({
          teacherId: teacher.teacherId,
          teacherName: teacher.teacherName,
          overallTotal: {
            totalTokens: overallTokens,
            totalCost: Math.round(overallCost * 10000) / 10000,
            totalCalls: overallCalls,
          },
          teacherCost: Math.round(teacherCost * 10000) / 10000,
          studentCost: Math.round(studentCost * 10000) / 10000,
          classes: classUsages,
        });
      }

      setTeacherUsage(teacherResults);
    } catch (error) {
      console.error('获取教师AI用量失败', error);
    } finally {
      setTeacherUsageLoading(false);
    }
  };

  const formatTokens = (n: number) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  const totalTokens = stats?.totalTokens ?? 0;
  const totalCost = stats?.totalCost ?? 0;

  const rawByFeature: Record<string, any> = stats?.byFeature ?? {};
  const rawByUser: Record<string, any> = stats?.byUser ?? {};
  const rawDaily: Record<string, any> = stats?.dailyUsage ?? stats?.daily ?? {};

  const today = new Date().toISOString().slice(0, 10);
  const totalCallsToday = rawDaily[today]?.count ?? stats?.totalCallsToday ?? stats?.callsToday ?? 0;
  const activeUsers = Object.keys(rawByUser).length || (stats?.activeUsers ?? 0);

  const featureBreakdown: Record<string, number> = Object.fromEntries(
    Object.entries(rawByFeature).map(([k, v]) => [k, v.totalTokens ?? 0])
  );

  const userBreakdown: any[] = Object.entries(rawByUser).map(([userId, v]) => ({
    userId,
    tokens: v.totalTokens ?? 0,
    calls: v.count ?? 0,
    cost: v.totalCost ?? 0,
  })).sort((a, b) => b.tokens - a.tokens);

  const dailyTrend: any[] = Object.entries(rawDaily).map(([date, v]) => ({
    date,
    tokens: v.totalTokens ?? 0,
    calls: v.count ?? 0,
    cost: v.totalCost ?? 0,
  })).sort((a, b) => a.date.localeCompare(b.date));

  const maxFeatureValue = Math.max(...Object.values(featureBreakdown), 1);

  // ==================== 概览标签页 ====================
  const renderOverviewTab = () => (
    <>
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="h-5 w-5 text-cyan-400" />
            <span className="text-slate-400 text-sm">总 Token 用量</span>
          </div>
          <div className="text-3xl font-bold text-cyan-400">{formatTokens(totalTokens)}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="h-5 w-5 text-green-400" />
            <span className="text-slate-400 text-sm">总费用</span>
          </div>
          <div className="text-3xl font-bold text-green-400">¥{totalCost.toFixed(2)}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Cpu className="h-5 w-5 text-purple-400" />
            <span className="text-slate-400 text-sm">今日调用次数</span>
          </div>
          <div className="text-3xl font-bold text-purple-400">{totalCallsToday}</div>
        </div>
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Users className="h-5 w-5 text-yellow-400" />
            <span className="text-slate-400 text-sm">活跃用户</span>
          </div>
          <div className="text-3xl font-bold text-yellow-400">{activeUsers}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 按功能用量 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">按功能用量</h2>
          </div>
          {Object.keys(featureBreakdown).length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Cpu className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>暂无数据</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Object.entries(featureBreakdown)
                .sort(([, a], [, b]) => (b as number) - (a as number))
                .map(([feature, count]) => {
                  const meta = FEATURE_META[feature] || { label: feature, icon: Cpu, color: 'slate' };
                  const Icon = meta.icon;
                  const pct = ((count as number) / maxFeatureValue) * 100;
                  return (
                    <div key={feature}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${COLOR_TEXT[meta.color] || 'text-slate-400'}`} />
                          <span className="text-sm text-slate-300">{meta.label}</span>
                        </div>
                        <span className="text-sm text-slate-400">{formatTokens(count as number)}</span>
                      </div>
                      <div className="w-full bg-slate-700 rounded-full h-2">
                        <div
                          className={`${COLOR_BAR[meta.color] || 'bg-slate-500'} h-2 rounded-full transition-all`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>

        {/* 按用户用量 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <Users className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">用户用量排行</h2>
          </div>
          {userBreakdown.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p>暂无数据</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Token 用量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">调用次数</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {userBreakdown.slice(0, 10).map((u: any, idx: number) => (
                    <tr key={u.userId || idx} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-white text-sm">{u.username || u.userId}</td>
                      <td className="px-4 py-3 text-cyan-400 text-sm">{formatTokens(u.tokens ?? 0)}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{u.calls ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 每日趋势 */}
      {dailyTrend.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-8">
          <div className="flex items-center gap-3 mb-6">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">每日用量趋势（近30天）</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">日期</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Token 用量</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">调用次数</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">费用</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {dailyTrend.map((d: any, idx: number) => (
                  <tr key={d.date || idx} className="hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-3 text-white text-sm">{d.date}</td>
                    <td className="px-4 py-3 text-cyan-400 text-sm">{formatTokens(d.tokens ?? 0)}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{d.calls ?? 0}</td>
                    <td className="px-4 py-3 text-green-400 text-sm">¥{(d.cost ?? 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 详细日志 */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Cpu className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">详细日志</h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterUser}
                onChange={(e) => { setFilterUser(e.target.value); setPage(1); }}
                placeholder="用户ID筛选"
                className="pl-9 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 w-40"
              />
            </div>
            <select
              value={filterFeature}
              onChange={(e) => { setFilterFeature(e.target.value); setPage(1); }}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              <option value="">全部功能</option>
              {Object.entries(FEATURE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
          </div>
        </div>

        {logsLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Cpu className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>暂无日志记录</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">时间</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">功能</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Token</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">费用</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {logs.map((log: any, idx: number) => {
                    const meta = FEATURE_META[log.feature] || { label: log.feature, color: 'slate' };
                    return (
                      <tr key={log.id || idx} className="hover:bg-slate-750 transition-colors">
                        <td className="px-4 py-3 text-slate-400 text-sm">
                          {log.createdAt ? new Date(log.createdAt).toLocaleString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-white text-sm">{log.username || log.userId || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${COLOR_TEXT[meta.color] || 'text-slate-400'} bg-slate-700`}>
                            {meta.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-cyan-400 text-sm">{formatTokens(log.tokens ?? 0)}</td>
                        <td className="px-4 py-3 text-green-400 text-sm">¥{(log.cost ?? 0).toFixed(4)}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded ${
                            log.success ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {log.success ? '成功' : '失败'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 分页 */}
            <div className="flex items-center justify-between mt-6">
              <span className="text-sm text-slate-400">
                第 {page} / {totalPages} 页
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  上一页
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="flex items-center px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-sm"
                >
                  下一页
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  // ==================== 班级AI用量标签页 ====================
  const renderClassTab = () => (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <GraduationCap className="h-6 w-6 text-cyan-400" />
        <h2 className="text-xl font-semibold text-white">班级AI用量</h2>
        <select
          value={selectedClassId}
          onChange={(e) => setSelectedClassId(e.target.value)}
          className="px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 min-w-[200px]"
        >
          <option value="">选择班级...</option>
          {classList.map((cls: any) => (
            <option key={cls.id} value={cls.id}>{cls.name}</option>
          ))}
        </select>
      </div>

      {!selectedClassId ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <GraduationCap className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">请选择一个班级查看AI用量</p>
        </div>
      ) : classUsageLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : !classUsage ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <Cpu className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">暂无数据</p>
        </div>
      ) : (
        <div>
          {/* 班级汇总卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span className="text-slate-400 text-sm">总Token</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400">{formatTokens(classUsage.classTotal?.totalTokens ?? 0)}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-green-400" />
                <span className="text-slate-400 text-sm">总费用</span>
              </div>
              <div className="text-2xl font-bold text-green-400">¥{(classUsage.classTotal?.totalCost ?? 0).toFixed(2)}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <Cpu className="h-4 w-4 text-purple-400" />
                <span className="text-slate-400 text-sm">总调用</span>
              </div>
              <div className="text-2xl font-bold text-purple-400">{classUsage.classTotal?.totalCalls ?? 0}</div>
            </div>
            <div className="bg-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <School className="h-4 w-4 text-yellow-400" />
                <span className="text-slate-400 text-sm">计费模式</span>
              </div>
              <div className="text-lg font-bold text-yellow-400">
                {classUsage.aiBillingMode === 'TEACHER_PAYS' ? '教师承担' : '学生自付'}
              </div>
            </div>
          </div>

          {/* 班级成员用量表 */}
          <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-white mb-4">成员用量明细</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-700">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">用户</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">角色</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Token用量</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">费用</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">调用次数</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">功能明细</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {(classUsage.users || []).map((u: any) => (
                    <tr key={u.userId} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-white text-sm">{u.username || u.userId}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          u.role === 'TEACHER' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                        }`}>
                          {u.role === 'TEACHER' ? '教师' : '学生'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-cyan-400 text-sm">{formatTokens(u.totalTokens ?? 0)}</td>
                      <td className="px-4 py-3 text-green-400 text-sm">¥{(u.totalCost ?? 0).toFixed(4)}</td>
                      <td className="px-4 py-3 text-slate-300 text-sm">{u.totalCalls ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(u.byFeature || {}).map(([feature, data]: [string, any]) => {
                            const meta = FEATURE_META[feature] || { label: feature, color: 'slate' };
                            return (
                              <span key={feature} className={`text-xs px-1.5 py-0.5 rounded ${COLOR_TEXT[meta.color] || 'text-slate-400'} bg-slate-700`}>
                                {meta.label} {formatTokens(data.totalTokens)}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== 教师AI用量标签页 ====================
  const renderTeacherTab = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <School className="h-6 w-6 text-cyan-400" />
        <h2 className="text-xl font-semibold text-white">教师AI用量</h2>
      </div>

      {teacherUsageLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : !teacherUsage || teacherUsage.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <School className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">暂无教师用量数据</p>
        </div>
      ) : (
        <div className="space-y-6">
          {teacherUsage.map((teacher: any) => (
            <div key={teacher.teacherId} className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
              {/* 教师头部 */}
              <div
                className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-slate-750 transition-colors"
                onClick={() => setExpandedTeacherClass(
                  expandedTeacherClass === teacher.teacherId ? null : teacher.teacherId
                )}
              >
                <div className="flex items-center gap-3">
                  <School className="h-5 w-5 text-cyan-400" />
                  <span className="text-lg font-semibold text-white">{teacher.teacherName}</span>
                  <span className="text-sm text-slate-400">{teacher.classes.length} 个班级</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div>
                    <span className="text-slate-400">总Token: </span>
                    <span className="text-cyan-400">{formatTokens(teacher.overallTotal?.totalTokens ?? 0)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">总费用: </span>
                    <span className="text-green-400">¥{(teacher.overallTotal?.totalCost ?? 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">教师承担: </span>
                    <span className="text-yellow-400">¥{(teacher.teacherCost ?? 0).toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">学生自付: </span>
                    <span className="text-purple-400">¥{(teacher.studentCost ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* 展开的班级明细 */}
              {expandedTeacherClass === teacher.teacherId && (
                <div className="border-t border-slate-700 px-6 py-4 space-y-4">
                  {teacher.classes.map((cls: any) => (
                    <div key={cls.classId} className="bg-slate-750 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-yellow-400" />
                          <span className="font-medium text-white">{cls.className}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            cls.aiBillingMode === 'TEACHER_PAYS'
                              ? 'bg-yellow-500/20 text-yellow-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {cls.aiBillingMode === 'TEACHER_PAYS' ? '教师承担' : '学生自付'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-cyan-400">{formatTokens(cls.classTotal?.totalTokens ?? 0)} tokens</span>
                          <span className="text-green-400">¥{(cls.classTotal?.totalCost ?? 0).toFixed(2)}</span>
                          <span className="text-yellow-400">教师 ¥{(cls.teacherCost ?? 0).toFixed(2)}</span>
                          <span className="text-purple-400">学生 ¥{(cls.studentCost ?? 0).toFixed(2)}</span>
                        </div>
                      </div>

                      {/* 班级内学生明细 */}
                      {(cls.users || []).length > 0 && (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-700">
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300">用户</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300">角色</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300">Token</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300">费用</th>
                                <th className="px-3 py-2 text-left text-xs font-semibold text-slate-300">调用</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700">
                              {cls.users.map((u: any) => (
                                <tr key={u.userId} className="hover:bg-slate-700">
                                  <td className="px-3 py-2 text-white">{u.username || u.userId}</td>
                                  <td className="px-3 py-2">
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      u.role === 'TEACHER' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                                    }`}>
                                      {u.role === 'TEACHER' ? '教师' : '学生'}
                                    </span>
                                  </td>
                                  <td className="px-3 py-2 text-cyan-400">{formatTokens(u.totalTokens ?? 0)}</td>
                                  <td className="px-3 py-2 text-green-400">¥{(u.totalCost ?? 0).toFixed(4)}</td>
                                  <td className="px-3 py-2 text-slate-300">{u.totalCalls ?? 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">AI 用量统计</h1>

      {/* 标签页切换 */}
      <div className="flex border-b border-slate-700 mb-8">
        {([
          { key: 'overview' as PageTab, label: '总览', icon: BarChart3 },
          { key: 'class' as PageTab, label: '班级AI用量', icon: GraduationCap },
          { key: 'teacher' as PageTab, label: '教师AI用量', icon: School },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-cyan-500 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'class' && renderClassTab()}
      {activeTab === 'teacher' && renderTeacherTab()}
    </div>
  );
}
