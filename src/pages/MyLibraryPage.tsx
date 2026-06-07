import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookMarked,
  CheckCircle2,
  Clock3,
  FilePlus2,
  FolderOpen,
  ListChecks,
  Loader2,
  RotateCcw,
  Star,
  Trash2,
  XCircle,
} from 'lucide-react';
import { myLibraryAPI, submissionsAPI, wrongRecordAPI } from '../services/api';
import { getDifficultyBadge, getDifficultyName, getStatusBg, getStatusName, getTypeLabel } from '../lib/labels';

type LibraryTab = 'recent' | 'solved' | 'wrong' | 'favorites' | 'lists';

interface ProblemInfo {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  knowledgeTreeName?: string;
  tags?: string[];
}

interface RecentProblem {
  problemId: string;
  latestStatus: string;
  attemptCount: number;
  lastSubmittedAt: string;
  solved: boolean;
  problem: ProblemInfo;
}

interface SolvedProblem {
  problemId: string;
  score?: number;
  problem?: ProblemInfo;
}

interface WrongRecord {
  id: string;
  problemId: string;
  problemTitle: string;
  source: string;
  difficulty: string;
  knowledgeTreeName?: string;
  retryCount: number;
  mastered: boolean;
  createdAt: string;
}

interface FavoriteProblem extends ProblemInfo {
  problemId: string;
  createdAt: string;
  note?: string | null;
}

interface ProblemListSummary {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  problemCount: number;
  solvedCount: number;
}

interface ProblemListItem {
  id: string;
  order: number;
  createdAt: string;
  solved: boolean;
  problem: ProblemInfo;
}

interface ProblemListDetail {
  id: string;
  title: string;
  description: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  items: ProblemListItem[];
}

interface WrongRecordResponse {
  records?: WrongRecord[];
}

const TABS: Array<{ key: LibraryTab; label: string; icon: typeof Clock3 }> = [
  { key: 'recent', label: '最近做过', icon: Clock3 },
  { key: 'solved', label: '已解决', icon: CheckCircle2 },
  { key: 'wrong', label: '错题本', icon: XCircle },
  { key: 'favorites', label: '我的收藏', icon: Star },
  { key: 'lists', label: '我的题单', icon: FolderOpen },
];

function formatTime(date: string): string {
  return new Date(date).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'error' in error) {
    const apiError = error as { error?: { message?: string } };
    return apiError.error?.message ?? fallback;
  }
  return fallback;
}

function EmptyBlock({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-10 text-center text-slate-400">
      <BookMarked className="mx-auto mb-3 h-10 w-10 text-slate-600" />
      {title}
    </div>
  );
}

function ProblemMeta({ problem }: { problem: ProblemInfo }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
      <span className={`rounded-full px-2 py-0.5 ${getDifficultyBadge(problem.difficulty)}`}>
        {getDifficultyName(problem.difficulty)}
      </span>
      <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">
        {getTypeLabel(problem.type)}
      </span>
      {problem.knowledgeTreeName && (
        <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-300">
          {problem.knowledgeTreeName}
        </span>
      )}
    </div>
  );
}

export function MyLibraryPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<LibraryTab>('recent');
  const [recentProblems, setRecentProblems] = useState<RecentProblem[]>([]);
  const [solvedProblems, setSolvedProblems] = useState<SolvedProblem[]>([]);
  const [wrongRecords, setWrongRecords] = useState<WrongRecord[]>([]);
  const [favoriteProblems, setFavoriteProblems] = useState<FavoriteProblem[]>([]);
  const [lists, setLists] = useState<ProblemListSummary[]>([]);
  const [selectedList, setSelectedList] = useState<ProblemListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListDescription, setNewListDescription] = useState('');

  const loadActiveTab = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (activeTab === 'recent') {
        const res = await myLibraryAPI.getRecent(50);
        if (res.success) setRecentProblems((res.data ?? []) as RecentProblem[]);
      }
      if (activeTab === 'solved') {
        const res = await submissionsAPI.getSolvedProblems();
        if (res.success) setSolvedProblems((res.data ?? []) as SolvedProblem[]);
      }
      if (activeTab === 'wrong') {
        const res = await wrongRecordAPI.getAll({ pageSize: 50, mastered: false });
        if (res.success) {
          const data = res.data as WrongRecordResponse | WrongRecord[] | undefined;
          setWrongRecords(Array.isArray(data) ? data : data?.records ?? []);
        }
      }
      if (activeTab === 'favorites') {
        const res = await myLibraryAPI.getFavorites();
        if (res.success) setFavoriteProblems((res.data ?? []) as FavoriteProblem[]);
      }
      if (activeTab === 'lists') {
        const res = await myLibraryAPI.getLists();
        if (res.success) setLists((res.data ?? []) as ProblemListSummary[]);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, '加载我的题库失败'));
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadActiveTab();
  }, [loadActiveTab]);

  const solvedStats = useMemo(() => {
    return solvedProblems.reduce(
      (acc, item) => {
        const difficulty = item.problem?.difficulty;
        if (difficulty === 'EASY') acc.easy += 1;
        if (difficulty === 'MEDIUM') acc.medium += 1;
        if (difficulty === 'HARD') acc.hard += 1;
        return acc;
      },
      { easy: 0, medium: 0, hard: 0 },
    );
  }, [solvedProblems]);

  const openSolve = (problemId: string) => navigate(`/problem/${problemId}/solve`);

  const handleRemoveFavorite = async (problemId: string) => {
    setActionLoading(problemId);
    setError(null);
    try {
      const res = await myLibraryAPI.removeFavorite(problemId);
      if (res.success) {
        setFavoriteProblems((items) => items.filter((item) => item.problemId !== problemId));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, '取消收藏失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateList = async () => {
    const title = newListTitle.trim();
    if (!title) {
      setError('题单标题不能为空');
      return;
    }

    setActionLoading('create-list');
    setError(null);
    try {
      const res = await myLibraryAPI.createList({
        title,
        description: newListDescription.trim() || undefined,
      });
      if (res.success) {
        setNewListTitle('');
        setNewListDescription('');
        await loadActiveTab();
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, '创建题单失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteList = async (id: string) => {
    if (!window.confirm('确定删除这个题单吗？')) return;
    setActionLoading(id);
    setError(null);
    try {
      const res = await myLibraryAPI.deleteList(id);
      if (res.success) {
        setLists((items) => items.filter((item) => item.id !== id));
        if (selectedList?.id === id) setSelectedList(null);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, '删除题单失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const handleViewList = async (id: string) => {
    setDetailLoading(true);
    setError(null);
    try {
      const res = await myLibraryAPI.getList(id);
      if (res.success) setSelectedList(res.data as ProblemListDetail);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '加载题单详情失败'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRemoveFromList = async (listId: string, problemId: string) => {
    setActionLoading(`${listId}:${problemId}`);
    setError(null);
    try {
      const res = await myLibraryAPI.removeProblemFromList(listId, problemId);
      if (res.success) {
        setSelectedList((current) => current
          ? { ...current, items: current.items.filter((item) => item.problem.id !== problemId) }
          : current);
        setLists((items) => items.map((item) => item.id === listId
          ? {
              ...item,
              problemCount: Math.max(0, item.problemCount - 1),
              solvedCount: selectedList?.items.find((listItem) => listItem.problem.id === problemId)?.solved
                ? Math.max(0, item.solvedCount - 1)
                : item.solvedCount,
            }
          : item));
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err, '移除题目失败'));
    } finally {
      setActionLoading(null);
    }
  };

  const renderRecent = () => recentProblems.length === 0 ? (
    <EmptyBlock title="暂无最近做题记录" />
  ) : (
    <div className="space-y-3">
      {recentProblems.map((item) => (
        <button
          key={item.problemId}
          onClick={() => openSolve(item.problemId)}
          className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition-all hover:border-cyan-500/40 hover:bg-slate-800/80"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate text-lg font-semibold text-white">{item.problem.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-xs ${getStatusBg(item.latestStatus)}`}>
                  {getStatusName(item.latestStatus)}
                </span>
                {item.solved && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-300">已解决</span>}
              </div>
              <ProblemMeta problem={item.problem} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm text-slate-400 md:text-right">
              <span>尝试 {item.attemptCount} 次</span>
              <span>{formatTime(item.lastSubmittedAt)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  const renderSolved = () => solvedProblems.length === 0 ? (
    <EmptyBlock title="还没有解决任何题目" />
  ) : (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-center"><div className="text-2xl font-bold text-white">{solvedProblems.length}</div><div className="text-xs text-slate-500">总计</div></div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 text-center"><div className="text-2xl font-bold text-green-400">{solvedStats.easy}</div><div className="text-xs text-slate-500">简单</div></div>
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4 text-center"><div className="text-2xl font-bold text-yellow-400">{solvedStats.medium}</div><div className="text-xs text-slate-500">中等</div></div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-center"><div className="text-2xl font-bold text-red-400">{solvedStats.hard}</div><div className="text-xs text-slate-500">困难</div></div>
      </div>
      <div className="space-y-3">
        {solvedProblems.map((item) => item.problem && (
          <button key={item.problemId} onClick={() => openSolve(item.problemId)} className="w-full rounded-2xl border border-slate-800 bg-slate-900/70 p-5 text-left transition-all hover:border-green-500/40 hover:bg-slate-800/80">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-white">{item.problem.title}</h3>
                <ProblemMeta problem={item.problem} />
              </div>
              <div className="flex items-center gap-1 text-green-400"><CheckCircle2 className="h-4 w-4" /><span className="text-sm">AC</span></div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderWrong = () => wrongRecords.length === 0 ? (
    <EmptyBlock title="暂无未掌握错题" />
  ) : (
    <div className="space-y-3">
      {wrongRecords.map((record) => (
        <div key={record.id} className="rounded-2xl border border-red-500/10 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-semibold text-white">{record.problemTitle}</h3>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 ${getDifficultyBadge(record.difficulty)}`}>{getDifficultyName(record.difficulty)}</span>
                <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-red-300">重试 {record.retryCount} 次</span>
                {record.knowledgeTreeName && <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">{record.knowledgeTreeName}</span>}
              </div>
            </div>
            <button onClick={() => openSolve(record.problemId)} className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400">
              <RotateCcw className="h-4 w-4" /> 重做
            </button>
          </div>
        </div>
      ))}
    </div>
  );

  const renderFavorites = () => favoriteProblems.length === 0 ? (
    <EmptyBlock title="暂无收藏题目" />
  ) : (
    <div className="space-y-3">
      {favoriteProblems.map((item) => (
        <div key={item.problemId} className="rounded-2xl border border-yellow-500/10 bg-slate-900/70 p-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold text-white">{item.title}</h3>
              <ProblemMeta problem={item} />
              <p className="mt-2 text-xs text-slate-500">收藏于 {formatTime(item.createdAt)}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openSolve(item.problemId)} className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cyan-400">刷题</button>
              <button onClick={() => handleRemoveFavorite(item.problemId)} disabled={actionLoading === item.problemId} className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-300 transition-colors hover:bg-slate-700 disabled:opacity-50">取消收藏</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderLists = () => (
    <div className="space-y-6">
      <div className="rounded-2xl border border-cyan-500/10 bg-slate-900/70 p-5">
        <div className="mb-4 flex items-center gap-2 text-white">
          <FilePlus2 className="h-5 w-5 text-cyan-400" />
          <h2 className="font-semibold">创建题单</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-[1fr_2fr_auto]">
          <input value={newListTitle} onChange={(event) => setNewListTitle(event.target.value)} placeholder="题单标题（必填）" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-cyan-500" />
          <input value={newListDescription} onChange={(event) => setNewListDescription(event.target.value)} placeholder="描述（可选）" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-white outline-none focus:border-cyan-500" />
          <button onClick={handleCreateList} disabled={actionLoading === 'create-list'} className="rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-white transition-colors hover:bg-cyan-400 disabled:opacity-50">创建</button>
        </div>
      </div>

      {lists.length === 0 ? <EmptyBlock title="暂无我的题单" /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {lists.map((list) => {
            const progress = list.problemCount > 0 ? Math.round((list.solvedCount / list.problemCount) * 100) : 0;
            return (
              <div key={list.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="truncate text-lg font-semibold text-white">{list.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-slate-400">{list.description || '暂无描述'}</p>
                  </div>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">{list.isPublic ? '公开' : '私有'}</span>
                </div>
                <div className="mt-5 space-y-2">
                  <div className="flex justify-between text-sm text-slate-400"><span>{list.solvedCount}/{list.problemCount} 已解决</span><span>{progress}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-green-400" style={{ width: `${progress}%` }} /></div>
                </div>
                <div className="mt-5 flex gap-2">
                  <button onClick={() => handleViewList(list.id)} className="rounded-xl bg-cyan-500/15 px-4 py-2 text-sm font-semibold text-cyan-300 transition-colors hover:bg-cyan-500/25">查看</button>
                  <button onClick={() => handleDeleteList(list.id)} disabled={actionLoading === list.id} className="flex items-center gap-1 rounded-xl bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-300 transition-colors hover:bg-red-500/20 disabled:opacity-50"><Trash2 className="h-4 w-4" /> 删除</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {detailLoading && <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-cyan-400" /></div>}
      {selectedList && (
        <div className="rounded-2xl border border-cyan-500/20 bg-slate-900/80 p-5">
          <div className="mb-4 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">{selectedList.title}</h2>
          </div>
          {selectedList.items.length === 0 ? <EmptyBlock title="这个题单还没有题目" /> : (
            <div className="space-y-3">
              {selectedList.items.map((item) => (
                <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4 md:flex-row md:items-center md:justify-between">
                  <button onClick={() => openSolve(item.problem.id)} className="min-w-0 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white hover:text-cyan-300">{item.problem.title}</span>
                      {item.solved && <span className="rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-300">已解决</span>}
                    </div>
                    <ProblemMeta problem={item.problem} />
                  </button>
                  <button onClick={() => handleRemoveFromList(selectedList.id, item.problem.id)} disabled={actionLoading === `${selectedList.id}:${item.problem.id}`} className="rounded-xl bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-red-500/20 hover:text-red-300 disabled:opacity-50">移除</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 px-4 py-6 text-white md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-3xl border border-cyan-500/10 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/30 p-6 shadow-2xl shadow-cyan-950/20">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-cyan-500/15 p-3"><BookMarked className="h-8 w-8 text-cyan-300" /></div>
            <div>
              <h1 className="text-3xl font-bold">我的题库</h1>
              <p className="mt-1 text-sm text-slate-400">集中管理最近练习、错题、收藏与个人题单。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/70 p-2">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${activeTab === key ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</div>}

        <div className="min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-cyan-400" /></div>
          ) : (
            <>
              {activeTab === 'recent' && renderRecent()}
              {activeTab === 'solved' && renderSolved()}
              {activeTab === 'wrong' && renderWrong()}
              {activeTab === 'favorites' && renderFavorites()}
              {activeTab === 'lists' && renderLists()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
