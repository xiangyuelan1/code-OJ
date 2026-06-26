import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen, CheckCircle, XCircle, Trash2, RotateCcw,
  Filter, BarChart3, Lightbulb, ChevronLeft, ChevronRight,
  Sparkles, Brain, Target, TrendingUp,
} from 'lucide-react';
import { wrongRecordAPI, knowledgeTreeAPI, enhancedAiAPI } from '../services/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorDisplay } from '../components/ui/ErrorDisplay';
import { StatCard } from '../components/ui/StatCard';
import { getDifficultyBadge, getDifficultyName } from '../lib/labels';

/* ── 常量与类型 ── */

const PAGE_SIZE = 10;

/** 错题来源枚举及中文映射 */
const SOURCE_LABELS: Record<string, string> = {
  EXAM: '考试',
  PRACTICE: '练习',
  MATCH: '对战',
  DAILY: '每日',
};

/** 筛选 Tab 类型 */
type FilterTab = 'all' | 'unmastered' | 'mastered';

/** 错题记录条目（来自 API） */
interface WrongRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  source: string;
  difficulty: string;
  knowledgeTreeId: string;
  knowledgeTreeName: string;
  wrongAnswer: string;
  retryCount: number;
  mastered: boolean;
  createdAt: string;
}

/** 统计数据（来自 API） */
interface WrongStats {
  total: number;
  mastered: number;
  unmastered: number;
  byKnowledge: Array<{
    knowledgeTreeId: string;
    knowledgeTreeName: string;
    wrongCount: number;
    masteredCount: number;
  }>;
}

/** 推荐题目（来自 API） */
interface RecommendedProblem {
  id: string;
  title: string;
  difficulty: string;
  knowledgeTreeName: string;
}

/** AI 错题分析结果 */
interface MistakeAnalysis {
  weakPoints: string[];
  patterns: string[];
  suggestions: string[];
  practiceRecommendations: Array<{ problemId?: string; title?: string; reason: string }>;
}

/** 知识树节点（用于下拉筛选） */
interface KnowledgeTreeNode {
  id: string;
  name: string;
  children?: KnowledgeTreeNode[];
}

/* ── 工具函数 ── */

/** 将扁平知识树节点列表提取为一维选项 */
function flattenKnowledgeTree(nodes: KnowledgeTreeNode[]): Array<{ id: string; name: string }> {
  const result: Array<{ id: string; name: string }> = [];
  const walk = (list: KnowledgeTreeNode[]) => {
    for (const node of list) {
      result.push({ id: node.id, name: node.name });
      if (node.children?.length) walk(node.children);
    }
  };
  walk(nodes);
  return result;
}

/** 相对时间格式化 */
function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}个月前`;
  return `${Math.floor(months / 12)}年前`;
}

/** 截断文本 */
function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text;
}

/** 根据错误数量返回渐变色（多=红，少=绿） */
function getBarColor(count: number, maxCount: number): string {
  if (maxCount === 0) return '#22d3ee'; // cyan-400
  const ratio = count / maxCount;
  if (ratio > 0.7) return '#f87171'; // red-400
  if (ratio > 0.4) return '#fbbf24'; // yellow-400
  return '#4ade80'; // green-400
}

/* ── 主组件 ── */

export function WrongRecordPage() {
  const navigate = useNavigate();

  /* ── 核心数据 ── */
  const [records, setRecords] = useState<WrongRecord[]>([]);
  const [stats, setStats] = useState<WrongStats | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendedProblem[]>([]);
  const [knowledgeTreeOptions, setKnowledgeTreeOptions] = useState<Array<{ id: string; name: string }>>([]);

  /* ── AI 错题分析相关 ── */
  const [aiAnalysis, setAiAnalysis] = useState<MistakeAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);
  const [aiAnalysisVisible, setAiAnalysisVisible] = useState(false);

  /* ── UI 状态（均从核心数据推导，不另存冗余状态） ── */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('');
  const [knowledgeTreeFilter, setKnowledgeTreeFilter] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [statsExpanded, setStatsExpanded] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* ── 数据获取 ── */

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = { page: currentPage, pageSize: PAGE_SIZE };
      if (activeTab === 'mastered') params.mastered = true;
      if (activeTab === 'unmastered') params.mastered = false;
      if (sourceFilter) params.source = sourceFilter;
      if (knowledgeTreeFilter) params.knowledgeTreeId = knowledgeTreeFilter;

      const [recordsRes, statsRes, recRes] = await Promise.all([
        wrongRecordAPI.getAll(params as any),
        wrongRecordAPI.getStats(),
        wrongRecordAPI.getRecommendations(),
      ]);

      if (recordsRes.success) {
        setRecords(recordsRes.data?.records ?? []);
        setTotalCount(recordsRes.data?.total ?? 0);
      }
      if (statsRes.success) setStats(statsRes.data ?? null);
      if (recRes.success) setRecommendations(recRes.data ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : '获取错题数据失败，请稍后重试';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, activeTab, sourceFilter, knowledgeTreeFilter]);

  /** 获取知识树选项（仅首次加载） */
  useEffect(() => {
    knowledgeTreeAPI.getTree().then((res) => {
      if (res.success && res.data) {
        setKnowledgeTreeOptions(flattenKnowledgeTree(res.data));
      }
    }).catch(() => { /* 非关键路径，静默处理 */ });
  }, []);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  /* ── 筛选条件变更时重置页码 ── */
  useEffect(() => { setCurrentPage(1); }, [activeTab, sourceFilter, knowledgeTreeFilter]);

  /* ── 操作 ── */

  const handleMarkMastered = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await wrongRecordAPI.markMastered(id);
      if (res.success) await fetchRecords();
    } catch { /* 错误由全局拦截器处理 */ }
    finally { setActionLoading(null); }
  };

  const handleRetry = async (id: string, problemId: string) => {
    setActionLoading(id);
    try {
      const res = await wrongRecordAPI.retry(id);
      if (res.success) navigate(`/problem/${problemId}/solve`);
    } catch { /* 错误由全局拦截器处理 */ }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定删除该错题记录吗？')) return;
    setActionLoading(id);
    try {
      const res = await wrongRecordAPI.delete(id);
      if (res.success) await fetchRecords();
    } catch { /* 错误由全局拦截器处理 */ }
    finally { setActionLoading(null); }
  };

  /** AI 分析错题 - 带缓存，避免重复调用 */
  const handleAiAnalyze = async () => {
    // 如果已有缓存结果，直接显示
    if (aiAnalysis) {
      setAiAnalysisVisible(true);
      return;
    }
    setAiAnalysisLoading(true);
    setAiAnalysisError(null);
    setAiAnalysisVisible(true);
    try {
      const res = await enhancedAiAPI.analyzeMistakes({ timeRange: 'month' });
      if (res.success && res.data) {
        setAiAnalysis(res.data as MistakeAnalysis);
      } else {
        setAiAnalysisError(res.error?.message || 'AI 分析失败');
      }
    } catch (err: any) {
      setAiAnalysisError(err?.error?.message || err?.message || '请求失败，请稍后重试');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  /* ── 分页计算 ── */
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* ── 渲染 ── */

  if (loading && records.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <LoadingSpinner size="lg" text="加载中..." />
      </div>
    );
  }

  if (error && records.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <ErrorDisplay message={error} onRetry={fetchRecords} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── 页头：标题 + AI 分析按钮 + 统计概览 ── */}
        <div>
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-8 w-8 text-cyan-400" />
            <h1 className="text-3xl font-bold text-cyan-400">错题本</h1>
            <button
              onClick={handleAiAnalyze}
              disabled={aiAnalysisLoading}
              className="ml-auto flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-cyan-600 text-white font-medium text-sm hover:from-purple-500 hover:to-cyan-500 transition-all disabled:opacity-60 shadow-lg shadow-purple-500/20"
            >
              <Sparkles className="h-4 w-4" />
              {aiAnalysisLoading ? '柯德分析中...' : '柯德·分析错题'}
            </button>
          </div>

          {stats && (
            <div className="grid grid-cols-3 gap-4">
              <StatCard
                icon={<XCircle className="h-6 w-6" />}
                label="总错题"
                value={stats.total}
                color="text-red-400"
              />
              <StatCard
                icon={<CheckCircle className="h-6 w-6" />}
                label="已掌握"
                value={stats.mastered}
                color="text-green-400"
              />
              <StatCard
                icon={<BookOpen className="h-6 w-6" />}
                label="未掌握"
                value={stats.unmastered}
                color="text-yellow-400"
              />
            </div>
          )}
        </div>

        {/* ── 统计图表（可折叠） ── */}
        {stats && stats.byKnowledge.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-5">
            <button
              onClick={() => setStatsExpanded((v) => !v)}
              className="flex items-center gap-2 text-lg font-semibold text-white hover:text-cyan-400 transition-colors w-full text-left"
            >
              <BarChart3 className="h-5 w-5 text-cyan-400" />
              知识点错题分布
              <span className="text-xs text-slate-400 ml-auto">
                {statsExpanded ? '收起' : '展开'}
              </span>
            </button>

            {statsExpanded && (
              <div className="mt-4 space-y-3">
                {stats.byKnowledge.slice(0, 8).map((item) => {
                  const maxCount = Math.max(...stats.byKnowledge.map((k) => k.wrongCount), 1);
                  const barWidth = Math.max(8, (item.wrongCount / maxCount) * 100);
                  const color = getBarColor(item.wrongCount, maxCount);
                  return (
                    <div key={item.knowledgeTreeId} className="flex items-center gap-3">
                      <span className="text-sm text-slate-300 w-28 shrink-0 truncate" title={item.knowledgeTreeName}>
                        {item.knowledgeTreeName}
                      </span>
                      <div className="flex-1 h-6 bg-slate-700/50 rounded overflow-hidden">
                        <div
                          className="h-full rounded transition-all duration-500"
                          style={{ width: `${barWidth}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-sm font-mono text-slate-300 w-8 text-right">{item.wrongCount}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── AI 错题分析结果卡片 ── */}
        {aiAnalysisVisible && (
          <div className="bg-slate-800 rounded-xl border border-purple-500/30 shadow-lg shadow-purple-500/5">
            {/* 卡片头部 */}
            <div className="px-5 py-4 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">柯德·错题分析报告</h2>
              </div>
              <button
                onClick={() => setAiAnalysisVisible(false)}
                className="text-sm text-slate-400 hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700"
              >
                收起
              </button>
            </div>

            <div className="p-5">
              {/* 加载态 */}
              {aiAnalysisLoading && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-3 border-purple-500 border-t-transparent" />
                  <span className="text-slate-400">AI 正在分析你的错题数据...</span>
                </div>
              )}

              {/* 错误态 */}
              {aiAnalysisError && !aiAnalysisLoading && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                  {aiAnalysisError}
                </div>
              )}

              {/* 分析结果 */}
              {aiAnalysis && !aiAnalysisLoading && (
                <div className="space-y-5">
                  {/* 薄弱知识点 */}
                  {aiAnalysis.weakPoints.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4 text-red-400" />
                        薄弱知识点
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {aiAnalysis.weakPoints.map((point, i) => (
                          <span
                            key={i}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/30"
                          >
                            {point}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 错误模式分析 */}
                  {aiAnalysis.patterns.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-orange-400" />
                        错误模式分析
                      </h3>
                      <ul className="space-y-1.5">
                        {aiAnalysis.patterns.map((pattern, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="text-orange-400 shrink-0 mt-0.5">•</span>
                            {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* AI 建议 */}
                  {aiAnalysis.suggestions.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-400" />
                        AI 建议
                      </h3>
                      <ol className="space-y-2">
                        {aiAnalysis.suggestions.map((suggestion, i) => (
                          <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                            <span className="bg-green-500/20 text-green-400 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            {suggestion}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* 推荐练习 */}
                  {aiAnalysis.practiceRecommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-400" />
                        推荐练习方向
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiAnalysis.practiceRecommendations.map((rec, i) => (
                          <div
                            key={i}
                            className="bg-slate-700/50 rounded-lg p-3 border border-slate-600/50 cursor-pointer hover:bg-slate-700 transition-colors"
                            onClick={() => rec.problemId && navigate(`/problem/${rec.problemId}`)}
                          >
                            {rec.title && (
                              <div className="text-white text-sm font-medium mb-1">{rec.title}</div>
                            )}
                            <div className="text-slate-400 text-xs">{rec.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── 筛选栏 ── */}
        <div className="bg-slate-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
          <Filter className="h-5 w-5 text-cyan-400 shrink-0" />

          {/* Tab 按钮 */}
          {([
            { key: 'all', label: '全部' },
            { key: 'unmastered', label: '未掌握' },
            { key: 'mastered', label: '已掌握' },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === key
                  ? 'bg-cyan-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              {label}
            </button>
          ))}

          <div className="h-5 w-px bg-slate-600 mx-1" />

          {/* 来源筛选 */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="bg-slate-700 text-sm text-white rounded-lg px-3 py-1.5 border border-slate-600 focus:border-cyan-500 focus:outline-none"
          >
            <option value="">全部来源</option>
            {Object.entries(SOURCE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* 知识树筛选 */}
          <select
            value={knowledgeTreeFilter}
            onChange={(e) => setKnowledgeTreeFilter(e.target.value)}
            className="bg-slate-700 text-sm text-white rounded-lg px-3 py-1.5 border border-slate-600 focus:border-cyan-500 focus:outline-none max-w-48"
          >
            <option value="">全部知识点</option>
            {knowledgeTreeOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>

        {/* ── 错题列表 ── */}
        {records.length === 0 ? (
          <EmptyState
            icon={<BookOpen className="h-16 w-16" />}
            title="暂无错题记录"
            description="继续保持，你做得很棒！"
          />
        ) : (
          <div className="space-y-3">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-slate-800 rounded-xl p-5 hover:bg-slate-750 transition-colors border border-slate-700/50"
              >
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                  {/* 左侧：题目信息 */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* 题目标题（可点击） */}
                      <button
                        onClick={() => navigate(`/problem/${record.problemId}`)}
                        className="text-lg font-semibold text-white hover:text-cyan-400 transition-colors truncate"
                      >
                        {record.problemTitle}
                      </button>

                      {/* 来源徽章 */}
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-500/20 text-purple-400">
                        {SOURCE_LABELS[record.source] ?? record.source}
                      </span>

                      {/* 难度徽章 */}
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyBadge(record.difficulty)}`}>
                        {getDifficultyName(record.difficulty)}
                      </span>

                      {/* 掌握状态 */}
                      {record.mastered && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
                          已掌握
                        </span>
                      )}
                    </div>

                    {/* 知识点 + 重试次数 + 时间 */}
                    <div className="flex items-center gap-4 text-sm text-slate-400 flex-wrap">
                      {record.knowledgeTreeName && (
                        <span>知识点：{record.knowledgeTreeName}</span>
                      )}
                      <span>重试 {record.retryCount} 次</span>
                      <span>{formatRelativeTime(record.createdAt)}</span>
                    </div>

                    {/* 错误答案预览 */}
                    {record.wrongAnswer && (
                      <div className="text-sm text-red-400/80 bg-red-500/5 rounded px-3 py-1.5 font-mono">
                        {truncate(record.wrongAnswer, 80)}
                      </div>
                    )}
                  </div>

                  {/* 右侧：操作按钮 */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRetry(record.id, record.problemId)}
                      disabled={actionLoading === record.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw className="h-4 w-4" />
                      重做
                    </button>

                    {!record.mastered && (
                      <button
                        onClick={() => handleMarkMastered(record.id)}
                        disabled={actionLoading === record.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600/20 text-green-400 hover:bg-green-600/30 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle className="h-4 w-4" />
                        标记掌握
                      </button>
                    )}

                    <button
                      onClick={() => handleDelete(record.id)}
                      disabled={actionLoading === record.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── 分页 ── */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              上一页
            </button>
            <span className="text-sm text-slate-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              下一页
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ── 推荐练习 ── */}
        {recommendations.length > 0 && (
          <div className="bg-slate-800 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="h-5 w-5 text-yellow-400" />
              <h2 className="text-lg font-semibold text-white">推荐练习</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recommendations.map((rec) => (
                <button
                  key={rec.id}
                  onClick={() => navigate(`/problem/${rec.id}/solve`)}
                  className="text-left bg-slate-700/50 rounded-lg p-4 hover:bg-slate-700 transition-colors border border-slate-600/50"
                >
                  <div className="font-medium text-white truncate mb-2">{rec.title}</div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getDifficultyBadge(rec.difficulty)}`}>
                      {getDifficultyName(rec.difficulty)}
                    </span>
                    {rec.knowledgeTreeName && (
                      <span className="text-slate-400 truncate">{rec.knowledgeTreeName}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
