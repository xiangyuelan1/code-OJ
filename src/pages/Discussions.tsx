import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Search, Plus, Pin } from 'lucide-react';
import { discussionAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

/** 讨论类型枚举 */
type DiscussionType = 'QUESTION' | 'SOLUTION' | 'SHARE';

/** 讨论列表项 */
interface DiscussionItem {
  id: string;
  title: string;
  type: DiscussionType;
  content: string;
  author?: { username: string };
  createdAt: string;
  upvotes: number;
  replyCount: number;
  isPinned?: boolean;
  problemId?: string;
  tags?: string[];
}

/** 创建讨论表单 */
interface CreateFormState {
  title: string;
  content: string;
  type: DiscussionType;
  tags: string;
}

const TYPE_LABELS: Record<DiscussionType | '', string> = {
  '': '全部',
  QUESTION: '提问',
  SOLUTION: '题解',
  SHARE: '分享',
};

const TYPE_COLORS: Record<DiscussionType, string> = {
  QUESTION: 'bg-yellow-500/20 text-yellow-400',
  SOLUTION: 'bg-green-500/20 text-green-400',
  SHARE: 'bg-blue-500/20 text-blue-400',
};

const PAGE_SIZE = 20;

const EMPTY_FORM: CreateFormState = { title: '', content: '', type: 'QUESTION', tags: '' };

export function DiscussionsPage() {
  const { isAuthenticated } = useAuthStore();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<DiscussionType | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_FORM);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await discussionAPI.getAll({
        page,
        pageSize: PAGE_SIZE,
        type: typeFilter || undefined,
        search: searchQuery || undefined,
      });
      if (res.success) {
        setDiscussions(res.data?.discussions || []);
        setTotal(res.data?.total || 0);
      }
    } catch (error) {
      console.error('获取讨论列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, searchQuery]);

  useEffect(() => { fetchDiscussions(); }, [fetchDiscussions]);

  const handleCreate = async () => {
    if (!createForm.title.trim() || !createForm.content.trim()) return;
    try {
      await discussionAPI.create({
        title: createForm.title,
        content: createForm.content,
        type: createForm.type,
        tags: createForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setShowCreate(false);
      setCreateForm(EMPTY_FORM);
      fetchDiscussions();
    } catch (error: any) {
      alert(error.error?.message || '创建失败');
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchDiscussions();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 页面标题与创建按钮 */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">社区讨论</h1>
          {isAuthenticated && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg transition-colors">
              <Plus className="h-4 w-4" /> 发起讨论
            </button>
          )}
        </div>

        {/* 筛选栏：类型 + 搜索 */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="flex gap-2">
            {(['', 'QUESTION', 'SOLUTION', 'SHARE'] as const).map(type => (
              <button key={type} onClick={() => { setTypeFilter(type); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${typeFilter === type ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                {TYPE_LABELS[type]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="搜索讨论..."
                className="pl-9 pr-3 py-1.5 bg-slate-700 text-white rounded-lg text-sm border border-slate-600 focus:border-cyan-500 focus:outline-none w-48"
              />
            </div>
          </div>
        </div>

        {/* 讨论列表 */}
        {loading ? (
          <div className="text-center py-12 text-slate-400">加载中...</div>
        ) : discussions.length === 0 ? (
          <div className="text-center py-12 text-slate-400">暂无讨论</div>
        ) : (
          <div className="space-y-3">
            {discussions.map(d => (
              <Link key={d.id} to={`/discussions/${d.id}`} className="block bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition-colors border border-slate-700 hover:border-cyan-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {d.isPinned && <Pin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[d.type] || 'bg-slate-600 text-slate-300'}`}>
                        {TYPE_LABELS[d.type] || d.type}
                      </span>
                      <h3 className="text-white font-medium truncate">{d.title}</h3>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span>{d.author?.username || '匿名'}</span>
                      <span>·</span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      {d.problemId && <span className="text-cyan-400">关联题目</span>}
                    </div>
                    {d.tags && d.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {d.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-400 shrink-0">
                    <span className="flex items-center gap-1"><ThumbsUp className="h-3.5 w-3.5" />{d.upvotes}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" />{d.replyCount}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 bg-slate-700 rounded-lg disabled:opacity-50">上一页</button>
            <span className="px-3 py-1.5 text-slate-400">第 {page} / {totalPages} 页</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-3 py-1.5 bg-slate-700 rounded-lg disabled:opacity-50">下一页</button>
          </div>
        )}

        {/* 创建讨论弹窗 */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">发起讨论</h2>
              <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as DiscussionType }))}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600">
                <option value="QUESTION">提问</option>
                <option value="SOLUTION">题解</option>
                <option value="SHARE">分享</option>
              </select>
              <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="标题" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />
              <textarea value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))}
                placeholder="内容（支持Markdown）" rows={6} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />
              <input value={createForm.tags} onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="标签（逗号分隔）" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-4 border border-slate-600" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-slate-600 rounded-lg">取消</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg">发布</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
