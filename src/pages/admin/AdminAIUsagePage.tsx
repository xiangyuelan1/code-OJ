import { useState, useEffect } from 'react';
import { enhancedAiAPI, classAPI, aiQuotaAPI } from '../../services/api';
import {
  BarChart3, Cpu, DollarSign, Zap, Users, Search,
  ChevronLeft, ChevronRight, Code, Lightbulb, Bug,
  FileText, CheckCircle, TreePine, Tag, FileUp, Gavel,
  GraduationCap, School, Settings, Package, AlertTriangle,
  Plus, Trash2, Edit3, Save, X, RefreshCw,
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

// 访问类型中文映射
const ACCESS_TYPE_LABELS: Record<string, string> = {
  TRIAL: '试用版',
  PAID_BASIC: '基础付费',
  PAID_STANDARD: '标准付费',
  PAID_PREMIUM: '高级付费',
  TEACHER_BASIC: '教师基础',
  TEACHER_STANDARD: '教师标准',
  TEACHER_PRO: '教师专业',
  ADMIN: '管理员',
};

type PageTab = 'overview' | 'class' | 'teacher' | 'quota' | 'packs' | 'alerts';

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

  // 配额管理数据
  const [quotaConfigs, setQuotaConfigs] = useState<any[]>([]);
  const [quotaLoading, setQuotaLoading] = useState(false);
  const [editingQuota, setEditingQuota] = useState<any>(null);

  // 加量包数据
  const [packs, setPacks] = useState<any[]>([]);
  const [packsLoading, setPacksLoading] = useState(false);
  const [editingPack, setEditingPack] = useState<any>(null);
  const [showPackForm, setShowPackForm] = useState(false);

  // 成本预警数据
  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [newAlert, setNewAlert] = useState({ threshold: '', period: 'monthly' });

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
    } else if (activeTab === 'quota') {
      loadQuotaConfigs();
    } else if (activeTab === 'packs') {
      loadPacks();
    } else if (activeTab === 'alerts') {
      loadAlerts();
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

  // ==================== 配额管理加载函数 ====================
  const loadQuotaConfigs = async () => {
    try {
      setQuotaLoading(true);
      const res = await aiQuotaAPI.getConfigs();
      if (res.success) setQuotaConfigs(res.data || []);
    } catch (error) {
      console.error('获取配额配置失败', error);
    } finally {
      setQuotaLoading(false);
    }
  };

  const handleSeedDefaults = async () => {
    try {
      await aiQuotaAPI.seedDefaults();
      loadQuotaConfigs();
    } catch (error) {
      console.error('重置默认配置失败', error);
    }
  };

  const handleSaveQuota = async (config: any) => {
    try {
      await aiQuotaAPI.updateConfig(config.accessType, {
        monthlyQuota: config.monthlyQuota,
        dailyLimit: config.dailyLimit,
        maxPerCall: config.maxPerCall,
        allowedFeatures: config.allowedFeatures,
        priority: config.priority,
      });
      setEditingQuota(null);
      loadQuotaConfigs();
    } catch (error) {
      console.error('保存配额失败', error);
    }
  };

  // ==================== 加量包加载函数 ====================
  const loadPacks = async () => {
    try {
      setPacksLoading(true);
      const res = await aiQuotaAPI.getPacks();
      if (res.success) setPacks(res.data || []);
    } catch (error) {
      console.error('获取加量包失败', error);
    } finally {
      setPacksLoading(false);
    }
  };

  const handleSavePack = async (pack: any) => {
    try {
      if (pack.id) {
        await aiQuotaAPI.updatePack(pack.id, pack);
      } else {
        await aiQuotaAPI.createPack(pack);
      }
      setEditingPack(null);
      setShowPackForm(false);
      loadPacks();
    } catch (error) {
      console.error('保存加量包失败', error);
    }
  };

  const handleDeletePack = async (id: string) => {
    if (!confirm('确认删除该加量包？')) return;
    try {
      await aiQuotaAPI.deletePack(id);
      loadPacks();
    } catch (error) {
      console.error('删除加量包失败', error);
    }
  };

  // ==================== 成本预警加载函数 ====================
  const loadAlerts = async () => {
    try {
      setAlertsLoading(true);
      const res = await aiQuotaAPI.getAlerts();
      if (res.success) setAlerts(res.data || []);
    } catch (error) {
      console.error('获取预警配置失败', error);
    } finally {
      setAlertsLoading(false);
    }
  };

  const handleAddAlert = async () => {
    const threshold = parseFloat(newAlert.threshold);
    if (isNaN(threshold) || threshold <= 0) return;
    try {
      await aiQuotaAPI.saveAlert({ threshold, period: newAlert.period });
      setNewAlert({ threshold: '', period: 'monthly' });
      loadAlerts();
    } catch (error) {
      console.error('创建预警失败', error);
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await aiQuotaAPI.deleteAlert(id);
      loadAlerts();
    } catch (error) {
      console.error('删除预警失败', error);
    }
  };

  const handleToggleAlert = async (alert: any) => {
    try {
      await aiQuotaAPI.saveAlert({ id: alert.id, threshold: alert.threshold, period: alert.period, isEnabled: !alert.isEnabled });
      loadAlerts();
    } catch (error) {
      console.error('切换预警状态失败', error);
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

  // ==================== 配额管理标签页 ====================
  const renderQuotaTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">配额管理</h2>
        </div>
        <button
          onClick={handleSeedDefaults}
          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors text-sm"
        >
          <RefreshCw className="h-4 w-4" />
          重置默认
        </button>
      </div>

      {quotaLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : quotaConfigs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <Settings className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400 mb-4">暂无配额配置，点击"重置默认"初始化</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">访问类型</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">月配额</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">日上限</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">单次上限</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">允许功能</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">优先级</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {quotaConfigs.map((config: any) => {
                  const isEditing = editingQuota?.accessType === config.accessType;
                  const current = isEditing ? editingQuota : config;
                  return (
                    <tr key={config.accessType} className="hover:bg-slate-750 transition-colors">
                      <td className="px-4 py-3 text-white text-sm font-medium">
                        {ACCESS_TYPE_LABELS[config.accessType] || config.accessType}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="number" value={current.monthlyQuota} onChange={(e) => setEditingQuota({ ...current, monthlyQuota: parseInt(e.target.value) || 0 })}
                            className="w-28 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm" />
                        ) : (
                          <span className="text-cyan-400 text-sm">{formatTokens(config.monthlyQuota)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="number" value={current.dailyLimit} onChange={(e) => setEditingQuota({ ...current, dailyLimit: parseInt(e.target.value) || 0 })}
                            className="w-24 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm" />
                        ) : (
                          <span className="text-slate-300 text-sm">{config.dailyLimit === 0 ? '不限' : formatTokens(config.dailyLimit)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="number" value={current.maxPerCall} onChange={(e) => setEditingQuota({ ...current, maxPerCall: parseInt(e.target.value) || 4096 })}
                            className="w-24 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm" />
                        ) : (
                          <span className="text-slate-300 text-sm">{formatTokens(config.maxPerCall)}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="text" value={typeof current.allowedFeatures === 'string' ? current.allowedFeatures : JSON.stringify(current.allowedFeatures)}
                            onChange={(e) => setEditingQuota({ ...current, allowedFeatures: e.target.value })}
                            className="w-40 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm" />
                        ) : (
                          <span className="text-slate-400 text-xs">
                            {(() => {
                              try {
                                const features = typeof config.allowedFeatures === 'string' ? JSON.parse(config.allowedFeatures) : config.allowedFeatures;
                                return features.includes('*') ? '全部' : features.join(', ');
                              } catch { return config.allowedFeatures; }
                            })()}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input type="number" value={current.priority} onChange={(e) => setEditingQuota({ ...current, priority: parseInt(e.target.value) || 0 })}
                            className="w-16 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm" />
                        ) : (
                          <span className="text-slate-300 text-sm">{config.priority}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleSaveQuota(current)} className="p-1.5 bg-green-600 hover:bg-green-500 rounded text-white"><Save className="h-3.5 w-3.5" /></button>
                            <button onClick={() => setEditingQuota(null)} className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <button onClick={() => setEditingQuota({ ...config })} className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white"><Edit3 className="h-3.5 w-3.5" /></button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== 加量包管理标签页 ====================
  const renderPacksTab = () => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-cyan-400" />
          <h2 className="text-xl font-semibold text-white">加量包管理</h2>
        </div>
        <button
          onClick={() => { setEditingPack({ name: '', tokens: 10000, price: 9.9, validDays: 30, isActive: true, sortOrder: 0 }); setShowPackForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors text-sm"
        >
          <Plus className="h-4 w-4" />
          新建加量包
        </button>
      </div>

      {/* 加量包表单弹窗 */}
      {showPackForm && editingPack && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6 border border-slate-600">
          <h3 className="text-lg font-semibold text-white mb-4">{editingPack.id ? '编辑加量包' : '新建加量包'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 block mb-1">名称</label>
              <input type="text" value={editingPack.name} onChange={(e) => setEditingPack({ ...editingPack, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">Token 数量</label>
              <input type="number" value={editingPack.tokens} onChange={(e) => setEditingPack({ ...editingPack, tokens: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">价格 (¥)</label>
              <input type="number" step="0.01" value={editingPack.price} onChange={(e) => setEditingPack({ ...editingPack, price: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">有效期 (天)</label>
              <input type="number" value={editingPack.validDays} onChange={(e) => setEditingPack({ ...editingPack, validDays: parseInt(e.target.value) || 30 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div>
              <label className="text-sm text-slate-400 block mb-1">排序</label>
              <input type="number" value={editingPack.sortOrder} onChange={(e) => setEditingPack({ ...editingPack, sortOrder: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={editingPack.isActive} onChange={(e) => setEditingPack({ ...editingPack, isActive: e.target.checked })}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600" />
                <span className="text-sm text-slate-300">启用</span>
              </label>
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button onClick={() => handleSavePack(editingPack)} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-lg text-sm">保存</button>
            <button onClick={() => { setShowPackForm(false); setEditingPack(null); }} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-lg text-sm">取消</button>
          </div>
        </div>
      )}

      {packsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : packs.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <Package className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">暂无加量包，点击"新建"创建</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">名称</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Token 数量</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">价格</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">有效期</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {packs.map((pack: any) => (
                  <tr key={pack.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-3 text-white text-sm">{pack.name}</td>
                    <td className="px-4 py-3 text-cyan-400 text-sm">{formatTokens(pack.tokens)}</td>
                    <td className="px-4 py-3 text-green-400 text-sm">¥{pack.price}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">{pack.validDays}天</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded ${pack.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                        {pack.isActive ? '启用' : '停用'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditingPack({ ...pack }); setShowPackForm(true); }} className="p-1.5 bg-slate-600 hover:bg-slate-500 rounded text-white"><Edit3 className="h-3.5 w-3.5" /></button>
                        <button onClick={() => handleDeletePack(pack.id)} className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  // ==================== 成本预警标签页 ====================
  const renderAlertsTab = () => (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <AlertTriangle className="h-6 w-6 text-yellow-400" />
        <h2 className="text-xl font-semibold text-white">成本预警</h2>
      </div>

      {/* 添加预警 */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">添加预警规则</h3>
        <div className="flex items-end gap-4">
          <div>
            <label className="text-sm text-slate-400 block mb-1">费用阈值 (¥)</label>
            <input type="number" step="0.01" value={newAlert.threshold}
              onChange={(e) => setNewAlert({ ...newAlert, threshold: e.target.value })}
              placeholder="例如: 100"
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm w-32" />
          </div>
          <div>
            <label className="text-sm text-slate-400 block mb-1">周期</label>
            <select value={newAlert.period} onChange={(e) => setNewAlert({ ...newAlert, period: e.target.value })}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm">
              <option value="daily">每日</option>
              <option value="weekly">每周</option>
              <option value="monthly">每月</option>
            </select>
          </div>
          <button onClick={handleAddAlert} className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm">
            <Plus className="h-4 w-4" />
            添加
          </button>
        </div>
      </div>

      {/* 预警列表 */}
      {alertsLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : alerts.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <AlertTriangle className="h-12 w-12 text-slate-500 mx-auto mb-3" />
          <p className="text-slate-400">暂无预警规则</p>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">阈值</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">周期</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">上次触发</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {alerts.map((alert: any) => (
                  <tr key={alert.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-4 py-3 text-yellow-400 text-sm font-medium">¥{alert.threshold}</td>
                    <td className="px-4 py-3 text-slate-300 text-sm">
                      {{ daily: '每日', weekly: '每周', monthly: '每月' }[alert.period as string] || alert.period}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggleAlert(alert)}
                        className={`text-xs px-2 py-1 rounded cursor-pointer ${alert.isEnabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'}`}>
                        {alert.isEnabled ? '启用' : '停用'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-sm">
                      {alert.lastTriggered ? new Date(alert.lastTriggered).toLocaleString() : '从未触发'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeleteAlert(alert.id)} className="p-1.5 bg-red-600 hover:bg-red-500 rounded text-white"><Trash2 className="h-3.5 w-3.5" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8">AI 用量统计</h1>

      {/* 标签页切换 */}
      <div className="flex border-b border-slate-700 mb-8 overflow-x-auto">
        {([
          { key: 'overview' as PageTab, label: '用量统计', icon: BarChart3 },
          { key: 'quota' as PageTab, label: '配额管理', icon: Settings },
          { key: 'packs' as PageTab, label: '加量包管理', icon: Package },
          { key: 'alerts' as PageTab, label: '成本预警', icon: AlertTriangle },
          { key: 'class' as PageTab, label: '班级AI用量', icon: GraduationCap },
          { key: 'teacher' as PageTab, label: '教师AI用量', icon: School },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center px-5 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
      {activeTab === 'quota' && renderQuotaTab()}
      {activeTab === 'packs' && renderPacksTab()}
      {activeTab === 'alerts' && renderAlertsTab()}
      {activeTab === 'class' && renderClassTab()}
      {activeTab === 'teacher' && renderTeacherTab()}
    </div>
  );
}
