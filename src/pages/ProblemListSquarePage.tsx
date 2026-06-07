import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Copy,
  Loader2,
  Search,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { myLibraryAPI } from '../services/api';
import { getDifficultyBadge, getDifficultyName, getTypeLabel } from '../lib/labels';

type PublicListSort = 'latest' | 'popular' | 'largest';

interface PublicAuthor {
  id: string;
  username: string;
  avatar?: string | null;
}

interface ProblemInfo {
  id: string;
  title: string;
  type: string;
  difficulty: string;
  knowledgeTreeName?: string;
  tags?: string[];
}

interface PublicProblemListSummary {
  id: string;
  title: string;
  description: string;
  author: PublicAuthor;
  problemCount: number;
  createdAt: string;
  updatedAt: string;
}

interface PublicProblemListItem {
  id: string;
  order: number;
  createdAt: string;
  solved: boolean;
  problem: ProblemInfo;
}

interface DifficultyStats {
  easy: number;
  medium: number;
  hard: number;
}

interface PublicProblemListDetail extends PublicProblemListSummary {
  isPublic: boolean;
  difficultyStats: DifficultyStats;
  items: PublicProblemListItem[];
}

interface CopiedListResult {
  id: string;
  title: string;
}

const SORT_OPTIONS: Array<{ key: PublicListSort; label: string }> = [
  { key: 'latest', label: '最新' },
  { key: 'popular', label: '热门' },
  { key: 'largest', label: '题量最多' },
];

function formatDate(date: string): string {
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

function AuthorBadge({ author }: { author: PublicAuthor }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-300">
      {author.avatar ? (
        <img src={author.avatar} alt={author.username} className="h-7 w-7 rounded-full border border-cyan-300/30 object-cover" />
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-300/10">
          <UserRound className="h-4 w-4 text-cyan-200" />
        </div>
      )}
      <span>{author.username}</span>
    </div>
  );
}

export function ProblemListSquarePage() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [appliedKeyword, setAppliedKeyword] = useState('');
  const [sort, setSort] = useState<PublicListSort>('latest');
  const [lists, setLists] = useState<PublicProblemListSummary[]>([]);
  const [selectedList, setSelectedList] = useState<PublicProblemListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [copying, setCopying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<CopiedListResult | null>(null);

  const loadLists = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await myLibraryAPI.getPublicLists({ keyword: appliedKeyword || undefined, sort });
      if (res.success) setLists((res.data ?? []) as PublicProblemListSummary[]);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '加载题单广场失败'));
    } finally {
      setLoading(false);
    }
  }, [appliedKeyword, sort]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const selectedProgress = useMemo(() => {
    if (!selectedList || selectedList.items.length === 0) return 0;
    const solvedCount = selectedList.items.filter((item) => item.solved).length;
    return Math.round((solvedCount / selectedList.items.length) * 100);
  }, [selectedList]);

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
  };

  const handleViewDetail = async (id: string) => {
    setDetailLoading(true);
    setCopyResult(null);
    setError(null);
    try {
      const res = await myLibraryAPI.getPublicList(id);
      if (res.success) setSelectedList(res.data as PublicProblemListDetail);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '加载公开题单详情失败'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!selectedList) return;
    setCopying(true);
    setCopyResult(null);
    setError(null);
    try {
      const res = await myLibraryAPI.copyPublicList(selectedList.id);
      if (res.success) setCopyResult(res.data as CopiedListResult);
    } catch (err: unknown) {
      setError(getErrorMessage(err, '复制题单失败'));
    } finally {
      setCopying(false);
    }
  };

  const handleStart = () => {
    const firstProblem = selectedList?.items[0]?.problem;
    if (firstProblem) navigate(`/problem/${firstProblem.id}/solve`);
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#050914] px-4 py-8 text-white md:px-8">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(34,211,238,0.20),transparent_28%),radial-gradient(circle_at_80%_0%,rgba(250,204,21,0.12),transparent_24%),radial-gradient(circle_at_70%_80%,rgba(59,130,246,0.16),transparent_30%)]" />
      <div className="relative mx-auto max-w-7xl space-y-7">
        <section className="relative overflow-hidden rounded-[2rem] border border-cyan-300/15 bg-slate-950/70 p-8 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="absolute right-10 top-8 hidden h-44 w-44 rounded-full border border-cyan-200/20 bg-cyan-300/5 md:block" />
          <div className="relative max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-100">
              <Sparkles className="h-4 w-4" /> 学习策展 · 同伴路线
            </div>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">题单广场</h1>
            <p className="mt-4 text-lg text-slate-300">发现同学和老师整理的刷题路线</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-700/70 bg-slate-950/70 p-4 shadow-xl shadow-slate-950/50 backdrop-blur">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-3 focus-within:border-cyan-300/70">
              <Search className="mt-0.5 h-5 w-5 text-slate-500" />
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') handleSearch(); }}
                placeholder="搜索标题或描述中的关键词"
                className="w-full bg-transparent text-white outline-none placeholder:text-slate-500"
              />
              <button onClick={handleSearch} className="rounded-xl bg-cyan-400 px-4 py-1.5 text-sm font-bold text-slate-950 transition-colors hover:bg-cyan-300">
                搜索
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto">
              {SORT_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSort(option.key)}
                  className={`shrink-0 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${sort === option.key ? 'bg-amber-300 text-slate-950 shadow-lg shadow-amber-300/20' : 'bg-slate-900 text-slate-300 hover:bg-slate-800'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {error && <div className="rounded-2xl border border-red-400/25 bg-red-500/10 px-5 py-4 text-sm text-red-200">{error}</div>}

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="min-h-[360px]">
            {loading ? (
              <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-cyan-300" /></div>
            ) : lists.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-950/70 p-12 text-center text-slate-400">暂未发现公开题单</div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {lists.map((list) => (
                  <article key={list.id} className="group rounded-3xl border border-slate-800 bg-slate-950/75 p-5 shadow-xl shadow-black/20 transition-all hover:-translate-y-1 hover:border-cyan-300/35 hover:bg-slate-900/90">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="line-clamp-1 text-xl font-bold text-white group-hover:text-cyan-100">{list.title}</h2>
                        <p className="mt-2 line-clamp-2 min-h-[2.5rem] text-sm leading-5 text-slate-400">{list.description || '作者暂未留下说明，但路线已经整理好。'}</p>
                      </div>
                      <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center">
                        <div className="text-lg font-black text-amber-200">{list.problemCount}</div>
                        <div className="text-[10px] text-amber-100/70">题</div>
                      </div>
                    </div>
                    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
                      <AuthorBadge author={list.author} />
                      <span className="text-xs text-slate-500">更新 {formatDate(list.updatedAt)}</span>
                    </div>
                    <button onClick={() => handleViewDetail(list.id)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-400/15 px-4 py-3 font-semibold text-cyan-100 transition-colors hover:bg-cyan-400/25">
                      查看路线 <ArrowRight className="h-4 w-4" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          <aside className="xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-[2rem] border border-cyan-300/20 bg-slate-950/85 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur">
              {detailLoading ? (
                <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div>
              ) : !selectedList ? (
                <div className="py-14 text-center text-slate-400">
                  <BookOpenCheck className="mx-auto mb-4 h-12 w-12 text-cyan-300/50" />
                  选择一个题单查看学习路线、完成进度与复制入口。
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h2 className="text-2xl font-black text-white">{selectedList.title}</h2>
                      <span className="rounded-full bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">公开</span>
                    </div>
                    <AuthorBadge author={selectedList.author} />
                    <p className="mt-3 text-sm leading-6 text-slate-400">{selectedList.description || '暂无描述'}</p>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-2xl bg-slate-900 p-3 text-center"><div className="text-xl font-bold">{selectedList.items.length}</div><div className="text-[11px] text-slate-500">总题</div></div>
                    <div className="rounded-2xl bg-green-500/10 p-3 text-center"><div className="text-xl font-bold text-green-300">{selectedList.difficultyStats.easy}</div><div className="text-[11px] text-slate-500">简单</div></div>
                    <div className="rounded-2xl bg-yellow-500/10 p-3 text-center"><div className="text-xl font-bold text-yellow-300">{selectedList.difficultyStats.medium}</div><div className="text-[11px] text-slate-500">中等</div></div>
                    <div className="rounded-2xl bg-red-500/10 p-3 text-center"><div className="text-xl font-bold text-red-300">{selectedList.difficultyStats.hard}</div><div className="text-[11px] text-slate-500">困难</div></div>
                  </div>

                  <div>
                    <div className="mb-2 flex justify-between text-sm text-slate-300"><span>完成进度</span><span>{selectedProgress}%</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-gradient-to-r from-cyan-300 via-blue-400 to-amber-300" style={{ width: `${selectedProgress}%` }} /></div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <button onClick={handleCopy} disabled={copying} className="flex items-center justify-center gap-2 rounded-2xl bg-amber-300 px-4 py-3 font-bold text-slate-950 transition-colors hover:bg-amber-200 disabled:opacity-60">
                      {copying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} 复制到我的题单
                    </button>
                    <button onClick={handleStart} disabled={selectedList.items.length === 0} className="flex items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 font-bold text-slate-950 transition-colors hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
                      开始刷题 <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>

                  {copyResult && (
                    <div className="rounded-2xl border border-green-400/25 bg-green-400/10 p-4 text-sm text-green-100">
                      已复制为「{copyResult.title}」。
                      <Link to="/my-library" className="ml-2 font-bold text-green-200 underline underline-offset-4">前往我的题库</Link>
                    </div>
                  )}

                  <div className="max-h-[440px] space-y-2 overflow-y-auto pr-1">
                    {selectedList.items.length === 0 ? (
                      <div className="rounded-2xl bg-slate-900 p-5 text-center text-sm text-slate-500">这个题单暂无题目</div>
                    ) : selectedList.items.map((item, index) => (
                      <button key={item.id} onClick={() => navigate(`/problem/${item.problem.id}/solve`)} className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 p-4 text-left transition-colors hover:border-cyan-300/40 hover:bg-slate-800">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-cyan-300">#{index + 1}</span>
                              <span className="line-clamp-1 font-semibold text-white">{item.problem.title}</span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                              <span className={`rounded-full px-2 py-0.5 ${getDifficultyBadge(item.problem.difficulty)}`}>{getDifficultyName(item.problem.difficulty)}</span>
                              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-slate-400">{getTypeLabel(item.problem.type)}</span>
                              {item.problem.knowledgeTreeName && <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-cyan-200">{item.problem.knowledgeTreeName}</span>}
                            </div>
                          </div>
                          {item.solved && <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-300" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
