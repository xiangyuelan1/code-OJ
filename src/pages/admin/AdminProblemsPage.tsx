import { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { problemsAPI, enhancedAiAPI } from '../../services/api';
import { Plus, Edit, Trash2, Code, CheckCircle, PenTool, Search, Upload, Loader2, X, Tags, ChevronDown, Calendar, AlertTriangle, Clock, Filter } from 'lucide-react';

type BatchDeleteMode = 'selected' | 'byTimeGroup' | 'all' | null;
type TimeGroupKey = 'today' | 'last7days' | 'last30days' | 'last90days' | 'older' | 'custom';

interface TimeGroup {
  key: TimeGroupKey;
  label: string;
  count: number;
  ids: string[];
}

function getStartOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function computeTimeGroups(problems: any[]): TimeGroup[] {
  const now = new Date();
  const todayStart = getStartOfDay(now);
  const sevenDaysAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(todayStart.getTime() - 90 * 24 * 60 * 60 * 1000);

  const groups: Record<TimeGroupKey, { label: string; ids: string[] }> = {
    today: { label: '今天', ids: [] },
    last7days: { label: '最近7天', ids: [] },
    last30days: { label: '最近30天', ids: [] },
    last90days: { label: '最近90天', ids: [] },
    older: { label: '更早', ids: [] },
    custom: { label: '自定义时间', ids: [] },
  };

  for (const p of problems) {
    const created = new Date(p.createdAt);
    if (created >= todayStart) {
      groups.today.ids.push(p.id);
    } else if (created >= sevenDaysAgo) {
      groups.last7days.ids.push(p.id);
    } else if (created >= thirtyDaysAgo) {
      groups.last30days.ids.push(p.id);
    } else if (created >= ninetyDaysAgo) {
      groups.last90days.ids.push(p.id);
    } else {
      groups.older.ids.push(p.id);
    }
  }

  return (Object.entries(groups) as [TimeGroupKey, { label: string; ids: string[] }][])
    .map(([key, val]) => ({ key, label: val.label, count: val.ids.length, ids: val.ids }));
}

function getIdsInDateRange(problems: any[], start: string, end: string): string[] {
  const startDate = new Date(start);
  const endDate = new Date(end);
  endDate.setHours(23, 59, 59, 999);
  return problems
    .filter(p => {
      const created = new Date(p.createdAt);
      return created >= startDate && created <= endDate;
    })
    .map(p => p.id);
}

function formatCreatedAt(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (60 * 60 * 1000));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (60 * 1000));
      return diffMinutes <= 1 ? '刚刚' : `${diffMinutes}分钟前`;
    }
    return `${diffHours}小时前`;
  }
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export function AdminProblemsPage() {
  const [problems, setProblems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [importContent, setImportContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [classifyLoading, setClassifyLoading] = useState(false);

  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  const [deleteMode, setDeleteMode] = useState<BatchDeleteMode>(null);
  const [beforeDate, setBeforeDate] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const deleteMenuRef = useRef<HTMLDivElement>(null);

  const [activeTimeFilter, setActiveTimeFilter] = useState<TimeGroupKey | null>(null);
  const [customDateStart, setCustomDateStart] = useState('');
  const [customDateEnd, setCustomDateEnd] = useState('');

  const timeGroups = useMemo(() => computeTimeGroups(problems), [problems]);

  const selectedTimeGroupIds = useMemo(() => {
    if (!activeTimeFilter) return new Set<string>();
    if (activeTimeFilter === 'custom') {
      if (!customDateStart || !customDateEnd) return new Set<string>();
      return new Set(getIdsInDateRange(problems, customDateStart, customDateEnd));
    }
    const group = timeGroups.find(g => g.key === activeTimeFilter);
    return new Set(group?.ids ?? []);
  }, [activeTimeFilter, timeGroups, problems, customDateStart, customDateEnd]);

  useEffect(() => {
    loadProblems();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(e.target as Node)) {
        setShowDeleteMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadProblems = async () => {
    try {
      setLoading(true);
      const res = await problemsAPI.getAll({ search: searchTerm });
      if (res.success) {
        setProblems(res.data);
      }
    } catch (error) {
      console.error('加载题目失败', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这道题目吗？')) return;
    try {
      await problemsAPI.delete(id);
      loadProblems();
    } catch (error) {
      console.error('删除失败', error);
      alert('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    let params: { ids?: string[]; beforeDate?: string; deleteAll?: boolean } = {};

    if (deleteMode === 'selected') {
      const idsToDelete = activeTimeFilter
        ? Array.from(selectedIds).filter(id => selectedTimeGroupIds.has(id))
        : Array.from(selectedIds);
      if (idsToDelete.length === 0) {
        alert('请先选择要删除的题目');
        return;
      }
      params = { ids: idsToDelete };
    } else if (deleteMode === 'byTimeGroup') {
      const idsToDelete = Array.from(selectedTimeGroupIds);
      if (idsToDelete.length === 0) {
        alert('该时间段内没有题目');
        return;
      }
      params = { ids: idsToDelete };
    } else if (deleteMode === 'all') {
      params = { deleteAll: true };
    } else {
      return;
    }

    setDeleting(true);
    try {
      const res = await problemsAPI.batchDelete(params);
      if (res.success) {
        alert(`成功删除 ${res.data.deletedCount} 道题目`);
        setDeleteMode(null);
        setBeforeDate('');
        setConfirmText('');
        setSelectedIds(new Set());
        setBatchMode(false);
        setShowDeleteMenu(false);
        setActiveTimeFilter(null);
        setCustomDateStart('');
        setCustomDateEnd('');
        loadProblems();
      }
    } catch (error: any) {
      alert(error.error?.message || '批量删除失败');
    } finally {
      setDeleting(false);
    }
  };

  const openDeleteConfirm = (mode: BatchDeleteMode) => {
    if (mode === 'selected') {
      const idsToDelete = activeTimeFilter
        ? Array.from(selectedIds).filter(id => selectedTimeGroupIds.has(id))
        : Array.from(selectedIds);
      if (idsToDelete.length === 0) {
        alert('请先选择要删除的题目');
        return;
      }
    }
    if (mode === 'byTimeGroup' && selectedTimeGroupIds.size === 0) {
      alert('该时间段内没有题目');
      return;
    }
    setDeleteMode(mode);
    setConfirmText('');
    setShowDeleteMenu(false);
  };

  const closeDeleteConfirm = () => {
    setDeleteMode(null);
    setBeforeDate('');
    setConfirmText('');
  };

  const handleSelectTimeGroup = (key: TimeGroupKey) => {
    if (key === 'custom') {
      setActiveTimeFilter('custom');
      return;
    }
    setActiveTimeFilter(prev => prev === key ? null : key);
  };

  const handleSelectAllInTimeFilter = () => {
    if (!activeTimeFilter) return;
    const newSelected = new Set(selectedIds);
    for (const id of selectedTimeGroupIds) {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleImport = async () => {
    if (!importContent.trim()) {
      alert('请输入题目内容');
      return;
    }
    setImporting(true);
    setImportResult(null);
    try {
      const res = await enhancedAiAPI.parseProblemFile(importContent, 'txt');
      if (res.success && res.data?.problems) {
        const problems = res.data.problems;
        let created = 0;
        for (const p of problems) {
          try {
            await problemsAPI.create({
              title: p.title,
              description: p.description,
              type: p.type || 'PROGRAMMING',
              difficulty: p.difficulty || 'MEDIUM',
              tags: p.tags || [],
              testCases: p.testCases || [],
              choices: p.choices || undefined,
              correctAnswer: p.correctAnswer || undefined,
              fillBlanks: p.fillBlanks || undefined,
              timeLimit: p.timeLimit || 2000,
              memoryLimit: p.memoryLimit || 256
            });
            created++;
          } catch (e) {
            console.error('导入题目失败:', p.title, e);
          }
        }
        setImportResult({ total: problems.length, created });
        loadProblems();
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI解析失败');
    } finally {
      setImporting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setImportContent(event.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleBatchClassify = async () => {
    if (selectedIds.size === 0) return;
    setClassifyLoading(true);
    try {
      const res = await enhancedAiAPI.batchClassify({ problemIds: Array.from(selectedIds) });
      if (res.success) {
        alert(`AI分类完成！成功 ${res.data.classified}/${res.data.total} 题`);
        setSelectedIds(new Set());
        setBatchMode(false);
        setActiveTimeFilter(null);
        loadProblems();
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI分类失败');
    } finally {
      setClassifyLoading(false);
    }
  };

  const handleClassifyUntagged = async () => {
    setClassifyLoading(true);
    try {
      const res = await enhancedAiAPI.batchClassify({ untaggedOnly: true });
      if (res.success) {
        alert(`AI分类完成！成功 ${res.data.classified}/${res.data.total} 题`);
        loadProblems();
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI分类失败');
    } finally {
      setClassifyLoading(false);
    }
  };

  const handleClassifyRandom = async () => {
    setClassifyLoading(true);
    try {
      const res = await enhancedAiAPI.batchClassify({ randomCount: 10 });
      if (res.success) {
        alert(`AI分类完成！成功 ${res.data.classified}/${res.data.total} 题`);
        loadProblems();
      }
    } catch (error: any) {
      alert(error.error?.message || 'AI分类失败');
    } finally {
      setClassifyLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'PROGRAMMING':
        return <Code className="h-4 w-4" />;
      case 'CHOICE':
        return <CheckCircle className="h-4 w-4" />;
      case 'FILL_BLANK':
        return <PenTool className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'PROGRAMMING':
        return '编程题';
      case 'CHOICE':
        return '选择题';
      case 'FILL_BLANK':
        return '填空题';
      default:
        return type;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return 'bg-green-100 text-green-800';
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800';
      case 'HARD':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDifficultyName = (difficulty: string) => {
    switch (difficulty) {
      case 'EASY':
        return '简单';
      case 'MEDIUM':
        return '中等';
      case 'HARD':
        return '困难';
      default:
        return difficulty;
    }
  };

  const getTimeGroupLabel = (key: TimeGroupKey): string => {
    const group = timeGroups.find(g => g.key === key);
    return group?.label ?? '';
  };

  const deleteTargetCount = useMemo(() => {
    if (deleteMode === 'selected') {
      if (activeTimeFilter) {
        return Array.from(selectedIds).filter(id => selectedTimeGroupIds.has(id)).length;
      }
      return selectedIds.size;
    }
    if (deleteMode === 'byTimeGroup') {
      return selectedTimeGroupIds.size;
    }
    if (deleteMode === 'all') {
      return problems.length;
    }
    return 0;
  }, [deleteMode, selectedIds, activeTimeFilter, selectedTimeGroupIds, problems.length]);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">题目管理</h1>
        <div className="flex gap-3">
          <div className="relative" ref={deleteMenuRef}>
            <button
              onClick={() => setShowDeleteMenu(!showDeleteMenu)}
              className="flex items-center bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Trash2 className="h-5 w-5 mr-2" />
              批量删除
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
            {showDeleteMenu && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-700 rounded-lg shadow-xl z-50 border border-slate-600 overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-600">
                  <span className="text-sm font-medium text-slate-300">按时间段选择</span>
                </div>
                {timeGroups.filter(g => g.key !== 'custom').map(group => (
                  <button
                    key={group.key}
                    onClick={() => {
                      if (!batchMode) setBatchMode(true);
                      handleSelectTimeGroup(group.key);
                    }}
                    className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between ${
                      activeTimeFilter === group.key
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-200 hover:bg-slate-600'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {group.label}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      group.count > 0
                        ? 'bg-slate-500/50 text-slate-300'
                        : 'bg-slate-600 text-slate-500'
                    }`}>
                      {group.count} 题
                    </span>
                  </button>
                ))}
                <button
                  onClick={() => {
                    if (!batchMode) setBatchMode(true);
                    handleSelectTimeGroup('custom');
                  }}
                  className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between ${
                    activeTimeFilter === 'custom'
                      ? 'bg-cyan-500/20 text-cyan-300'
                      : 'text-slate-200 hover:bg-slate-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    自定义时间
                  </span>
                </button>
                {activeTimeFilter === 'custom' && (
                  <div className="px-4 py-3 bg-slate-600/50 space-y-2">
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">开始日期</label>
                      <input
                        type="date"
                        value={customDateStart}
                        onChange={(e) => setCustomDateStart(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 mb-1 block">结束日期</label>
                      <input
                        type="date"
                        value={customDateEnd}
                        onChange={(e) => setCustomDateEnd(e.target.value)}
                        className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      />
                    </div>
                    {customDateStart && customDateEnd && (
                      <p className="text-xs text-slate-400">
                        选中 {selectedTimeGroupIds.size} 道题目
                      </p>
                    )}
                  </div>
                )}
                <div className="border-t border-slate-600">
                  <button
                    onClick={() => {
                      if (!batchMode) setBatchMode(true);
                      openDeleteConfirm('selected');
                    }}
                    className="w-full text-left px-4 py-3 text-slate-200 hover:bg-slate-600 transition-colors flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    删除已选题目
                  </button>
                  <button
                    onClick={() => openDeleteConfirm('all')}
                    className="w-full text-left px-4 py-3 text-red-400 hover:bg-slate-600 transition-colors flex items-center gap-2"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    删除全部
                  </button>
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Upload className="h-5 w-5 mr-2" />
            批量导入
          </button>
          <Link
            to="/admin/problems/create"
            className="flex items-center bg-cyan-500 hover:bg-cyan-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            创建题目
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button
          onClick={() => {
            setBatchMode(!batchMode);
            setSelectedIds(new Set());
            setActiveTimeFilter(null);
            setCustomDateStart('');
            setCustomDateEnd('');
          }}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors ${batchMode ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
        >
          <Tags className="h-4 w-4 mr-2" />
          {batchMode ? '取消选择' : '批量选择'}
        </button>
        {batchMode && (
          <>
            <button
              onClick={() => {
                const allIds = problems.map((p: any) => p.id);
                setSelectedIds(new Set(selectedIds.size === allIds.length ? [] : allIds));
              }}
              className="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600"
            >
              {selectedIds.size === problems.length ? '取消全选' : '全选'}
            </button>
            {activeTimeFilter && (
              <button
                onClick={handleSelectAllInTimeFilter}
                className="flex items-center px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors"
              >
                <Calendar className="h-4 w-4 mr-2" />
                全选「{getTimeGroupLabel(activeTimeFilter)}」({selectedTimeGroupIds.size} 题)
              </button>
            )}
            <button
              onClick={handleBatchClassify}
              disabled={classifyLoading || selectedIds.size === 0}
              className="flex items-center px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {classifyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tags className="h-4 w-4 mr-2" />}
              {classifyLoading ? 'AI分类中...' : `AI打标签 (${selectedIds.size})`}
            </button>
            <button
              onClick={() => openDeleteConfirm('selected')}
              disabled={selectedIds.size === 0}
              className="flex items-center px-4 py-2 bg-red-500/80 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              删除所选 ({selectedIds.size})
            </button>
          </>
        )}
        {!batchMode && (
          <>
            <button
              onClick={handleClassifyUntagged}
              disabled={classifyLoading}
              className="flex items-center px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 disabled:opacity-50"
            >
              {classifyLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Tags className="h-4 w-4 mr-2" />}
              {classifyLoading ? '处理中...' : 'AI分类未标签题目'}
            </button>
            <button
              onClick={handleClassifyRandom}
              disabled={classifyLoading}
              className="flex items-center px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 disabled:opacity-50"
            >
              随机10题AI分类
            </button>
          </>
        )}
        {activeTimeFilter && batchMode && (
          <button
            onClick={() => {
              setActiveTimeFilter(null);
              setCustomDateStart('');
              setCustomDateEnd('');
            }}
            className="flex items-center px-3 py-2 bg-slate-600 text-slate-300 rounded-lg hover:bg-slate-500 transition-colors"
          >
            <X className="h-4 w-4 mr-1" />
            清除时间筛选
          </button>
        )}
      </div>

      {activeTimeFilter && batchMode && (
        <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex items-center gap-3">
          <Calendar className="h-5 w-5 text-cyan-400" />
          <span className="text-cyan-300 text-sm">
            时间筛选：{getTimeGroupLabel(activeTimeFilter)}
            {activeTimeFilter === 'custom' && customDateStart && customDateEnd && (
              <span className="ml-1">({customDateStart} ~ {customDateEnd})</span>
            )}
            — 共 <strong>{selectedTimeGroupIds.size}</strong> 道题目
          </span>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-6 shadow-lg mb-6">
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="搜索题目..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProblems()}
              className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <button
            onClick={loadProblems}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
          >
            搜索
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-700">
                {batchMode && (
                  <th className="px-4 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === problems.length && problems.length > 0}
                      onChange={() => {
                        const allIds = problems.map((p: any) => p.id);
                        setSelectedIds(new Set(selectedIds.size === allIds.length ? [] : allIds));
                      }}
                      className="rounded border-slate-500 bg-slate-600 text-cyan-500 focus:ring-cyan-500"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">题目</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">类型</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">难度</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">标签</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    创建时间
                  </span>
                </th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-slate-300">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {problems.map((problem) => {
                const isInTimeFilter = activeTimeFilter ? selectedTimeGroupIds.has(problem.id) : true;
                const rowOpacity = activeTimeFilter && !isInTimeFilter ? 'opacity-40' : '';
                return (
                  <tr key={problem.id} className={`hover:bg-slate-750 transition-colors ${rowOpacity}`}>
                    {batchMode && (
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(problem.id)}
                            onChange={() => {
                              const next = new Set(selectedIds);
                              if (next.has(problem.id)) next.delete(problem.id);
                              else next.add(problem.id);
                              setSelectedIds(next);
                            }}
                            className="rounded border-slate-500 bg-slate-600 text-cyan-500 focus:ring-cyan-500"
                          />
                          <span className="text-xs text-slate-500">{formatCreatedAt(problem.createdAt)}</span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <Link
                        to={`/problem/${problem.id}`}
                        className="text-white hover:text-cyan-400 font-medium transition-colors"
                      >
                        {problem.title}
                      </Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className="flex items-center text-slate-400">
                        {getTypeIcon(problem.type)}
                        <span className="ml-2">{getTypeName(problem.type)}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${getDifficultyColor(problem.difficulty)}`}>
                        {getDifficultyName(problem.difficulty)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {(Array.isArray(problem.tags) ? problem.tags : JSON.parse(problem.tags || '[]')).join(', ') || '无'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {formatCreatedAt(problem.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end space-x-2">
                        <Link
                          to={`/admin/problems/${problem.id}/edit`}
                          className="p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                        >
                          <Edit className="h-5 w-5" />
                        </Link>
                        <button
                          onClick={() => handleDelete(problem.id)}
                          className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {problems.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              暂无题目，点击上方按钮创建
            </div>
          )}
        </div>
      )}
      {showImport && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">批量导入题目</h2>
              <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">上传文件</label>
                <label className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg cursor-pointer transition-colors w-fit">
                  <Upload className="h-4 w-4" />
                  <span>选择文件</span>
                  <input type="file" accept=".txt,.md,.csv" onChange={handleFileUpload} className="hidden" />
                </label>
                <p className="text-slate-500 text-sm mt-1">支持 txt、md、csv 文件</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">或直接粘贴内容</label>
                <textarea
                  value={importContent}
                  onChange={(e) => setImportContent(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  rows={8}
                  placeholder="粘贴题目内容，AI将自动解析并创建题目。格式示例：&#10;&#10;题目：两数之和&#10;描述：给定一个整数数组...&#10;类型：PROGRAMMING&#10;难度：EASY&#10;---&#10;题目：二叉树遍历&#10;描述：...&#10;类型：CHOICE&#10;难度：MEDIUM"
                />
              </div>
              {importResult && (
                <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400">
                  成功导入 {importResult.created}/{importResult.total} 道题目
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowImport(false); setImportContent(''); setImportResult(null); }}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  关闭
                </button>
                <button
                  onClick={handleImport}
                  disabled={importing || !importContent.trim()}
                  className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {importing ? '导入中...' : '开始导入'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 批量删除确认对话框 */}
      {deleteMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-red-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                确认批量删除
              </h2>
              <button onClick={closeDeleteConfirm} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {deleteMode === 'selected' && (
                <div className="space-y-2">
                  <p className="text-slate-300">
                    确定要删除选中的 <span className="text-red-400 font-bold">{deleteTargetCount}</span> 道题目吗？
                  </p>
                  {activeTimeFilter && (
                    <p className="text-sm text-slate-400">
                      筛选范围：{getTimeGroupLabel(activeTimeFilter)}（仅删除此时间段内已选中的题目）
                    </p>
                  )}
                  <p className="text-slate-500 text-sm">此操作不可撤销。</p>
                </div>
              )}

              {deleteMode === 'byTimeGroup' && (
                <div className="space-y-2">
                  <p className="text-slate-300">
                    确定要删除「<span className="text-cyan-400 font-medium">{getTimeGroupLabel(activeTimeFilter!)}</span>」时间段内的所有题目吗？
                  </p>
                  <p className="text-slate-300">
                    共 <span className="text-red-400 font-bold">{deleteTargetCount}</span> 道题目将被删除，此操作不可撤销。
                  </p>
                </div>
              )}

              {deleteMode === 'all' && (
                <div className="space-y-3">
                  <p className="text-red-400 font-medium">
                    ⚠️ 此操作将删除系统中所有题目，不可撤销！
                  </p>
                  <p className="text-slate-300">
                    请输入 <span className="text-red-400 font-mono font-bold">确认删除</span> 以继续：
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="确认删除"
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={closeDeleteConfirm}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleBatchDelete}
                  disabled={
                    deleting ||
                    (deleteMode === 'byTimeGroup' && deleteTargetCount === 0) ||
                    (deleteMode === 'all' && confirmText !== '确认删除')
                  }
                  className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                  {deleting ? '删除中...' : `确认删除 (${deleteTargetCount})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
