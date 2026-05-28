import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, ThumbsUp, Search, Plus, Pin, Edit3, Eye, EyeOff, Flame, Star, User } from 'lucide-react';
import { discussionAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

type DiscussionType = 'QUESTION' | 'SOLUTION' | 'SHARE';
type SortMode = 'latest' | 'hot' | 'pinned';

interface DiscussionItem {
  id: string;
  title: string;
  type: DiscussionType;
  content: string;
  author?: { username: string; avatar?: string; level?: number };
  createdAt: string;
  upvotes: number;
  replyCount: number;
  isPinned?: boolean;
  problemId?: string;
  tags?: string[];
}

interface TagItem {
  name: string;
  count: number;
}

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

const SORT_OPTIONS: { key: SortMode; label: string; icon: typeof Flame }[] = [
  { key: 'latest', label: '最新', icon: MessageSquare },
  { key: 'hot', label: '最热', icon: Flame },
  { key: 'pinned', label: '精华', icon: Star },
];

const LEVEL_NAMES: Record<number, string> = {
  1: '入门', 2: '初学', 3: '进阶', 4: '熟练', 5: '精通', 6: '大师', 7: '宗师', 8: '传说',
};

const PAGE_SIZE = 20;
const EMPTY_FORM: CreateFormState = { title: '', content: '', type: 'QUESTION', tags: '' };

/**
 * 简易 Markdown → HTML 转换器
 * 仅支持标题、粗体、斜体、行内代码、代码块、链接、列表等基础语法
 */
function simpleMarkdown(text: string): string {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-slate-900 rounded p-3 my-2 overflow-x-auto text-sm"><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="bg-slate-700 px-1.5 py-0.5 rounded text-sm text-cyan-300">$1</code>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-white mt-3 mb-1">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-white mt-4 mb-2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mt-4 mb-2">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong class="text-white">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-cyan-400 hover:underline" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-slate-300">$1</li>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-slate-300">$2</li>');
  html = html.replace(/\n/g, '<br/>');

  return html;
}

function getLevelBadge(level?: number) {
  if (!level || level < 1) return null;
  const name = LEVEL_NAMES[level] || `Lv.${level}`;
  const colors = level >= 7 ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
    : level >= 5 ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    : level >= 3 ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    : 'bg-slate-600/30 text-slate-400 border-slate-500/30';
  return <span className={`text-[10px] px-1.5 py-0.5 rounded border ${colors}`}>{name}</span>;
}

export function DiscussionsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<DiscussionType | ''>('');
  const [sortMode, setSortMode] = useState<SortMode>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(EMPTY_FORM);
  const [showPreview, setShowPreview] = useState(false);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedTag, setSelectedTag] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<CreateFormState>(EMPTY_FORM);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = {
        page,
        pageSize: PAGE_SIZE,
        type: typeFilter || undefined,
        search: searchQuery || undefined,
        tag: selectedTag || undefined,
      };

      if (sortMode === 'hot') {
        const res = await discussionAPI.getHot(PAGE_SIZE);
        if (res.success) {
          setDiscussions(res.data || []);
          setTotal((res.data || []).length);
        }
      } else if (sortMode === 'pinned') {
        params.sort = 'pinned';
        const res = await discussionAPI.getAll(params);
        if (res.success) {
          const pinned = (res.data?.discussions || []).filter((d: DiscussionItem) => d.isPinned);
          setDiscussions(pinned);
          setTotal(pinned.length);
        }
      } else {
        const res = await discussionAPI.getAll(params);
        if (res.success) {
          setDiscussions(res.data?.discussions || []);
          setTotal(res.data?.total || 0);
        }
      }
    } catch (error) {
      console.error('获取讨论列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, sortMode, searchQuery, selectedTag]);

  const fetchTags = useCallback(async () => {
    try {
      const res = await discussionAPI.getTags();
      if (res.success) setTags(res.data || []);
    } catch {
      /* 标签加载失败不阻塞页面 */
    }
  }, []);

  useEffect(() => { fetchDiscussions(); }, [fetchDiscussions]);
  useEffect(() => { fetchTags(); }, [fetchTags]);

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
      setShowPreview(false);
      fetchDiscussions();
      fetchTags();
    } catch (error: any) {
      alert(error.error?.message || '创建失败');
    }
  };

  const handleEdit = async () => {
    if (!editingId) return;
    try {
      await discussionAPI.updateDiscussion(editingId, {
        title: editForm.title,
        content: editForm.content,
        tags: editForm.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      setEditingId(null);
      setEditForm(EMPTY_FORM);
      fetchDiscussions();
    } catch (error: any) {
      alert(error.error?.message || '编辑失败');
    }
  };

  const startEdit = (d: DiscussionItem) => {
    setEditingId(d.id);
    setEditForm({
      title: d.title,
      content: d.content,
      type: d.type,
      tags: (d.tags || []).join(', '),
    });
  };

  const handleSearch = () => {
    setPage(1);
    fetchDiscussions();
  };

  const totalPages = sortMode === 'hot' || sortMode === 'pinned' ? 1 : Math.ceil(total / PAGE_SIZE);

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

        {/* 标签云 */}
        {tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            <button onClick={() => { setSelectedTag(''); setPage(1); }}
              className={`px-3 py-1 rounded-full text-xs transition-colors ${!selectedTag ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
              全部标签
            </button>
            {tags.slice(0, 15).map(tag => (
              <button key={tag.name} onClick={() => { setSelectedTag(tag.name); setPage(1); }}
                className={`px-3 py-1 rounded-full text-xs transition-colors ${selectedTag === tag.name ? 'bg-cyan-500 text-white' : 'bg-slate-700/80 text-slate-300 hover:bg-slate-600'}`}>
                {tag.name} <span className="text-slate-500 ml-0.5">{tag.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* 筛选栏：排序 + 类型 + 搜索 */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          {/* 排序选项 */}
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setSortMode(key); setPage(1); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${sortMode === key ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </button>
            ))}
          </div>

          {/* 类型筛选 */}
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
              <div key={d.id} className="block bg-slate-800 rounded-lg p-4 hover:bg-slate-750 transition-colors border border-slate-700 hover:border-cyan-500/30">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {/* 标题行：置顶图标 + 类型标签 + 标题 */}
                    <div className="flex items-center gap-2 mb-1">
                      {d.isPinned && <Pin className="h-3.5 w-3.5 text-cyan-400 shrink-0" />}
                      <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[d.type] || 'bg-slate-600 text-slate-300'}`}>
                        {TYPE_LABELS[d.type] || d.type}
                      </span>
                      <h3 className="text-white font-medium truncate">{d.title}</h3>
                    </div>

                    {/* 作者信息行：头像 + 用户名 + 等级徽章 + 时间 */}
                    <div className="flex items-center gap-2 text-sm text-slate-400">
                      {d.author?.avatar ? (
                        <img src={d.author.avatar} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center">
                          <User className="h-3 w-3 text-slate-400" />
                        </div>
                      )}
                      <span className="text-cyan-400">{d.author?.username || '匿名'}</span>
                      {getLevelBadge(d.author?.level)}
                      <span>·</span>
                      <span>{new Date(d.createdAt).toLocaleDateString()}</span>
                      {d.problemId && <span className="text-purple-400">关联题目</span>}
                    </div>

                    {/* 标签 */}
                    {d.tags && d.tags.length > 0 && (
                      <div className="flex gap-1.5 mt-2">
                        {d.tags.slice(0, 3).map((tag, i) => (
                          <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 右侧：投票数 + 回复数 + 编辑按钮 */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-amber-400">
                        <ThumbsUp className="h-4 w-4" />{d.upvotes}
                      </span>
                      <span className="flex items-center gap-1 text-cyan-400">
                        <MessageSquare className="h-4 w-4" />{d.replyCount}
                      </span>
                    </div>
                    {isAuthenticated && user?.id && d.author?.username && (
                      <button onClick={(e) => { e.preventDefault(); startEdit(d); }}
                        className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                        <Edit3 className="h-3 w-3" />编辑
                      </button>
                    )}
                  </div>
                </div>
              </div>
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
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); setShowPreview(false); }}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">发起讨论</h2>
              <select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value as DiscussionType }))}
                className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600">
                <option value="QUESTION">提问</option>
                <option value="SOLUTION">题解</option>
                <option value="SHARE">分享</option>
              </select>
              <input value={createForm.title} onChange={e => setCreateForm(f => ({ ...f, title: e.target.value }))}
                placeholder="标题" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />

              {/* Markdown 预览切换 */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-slate-400">内容（支持 Markdown）</span>
                <button onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-400 transition-colors">
                  {showPreview ? <><EyeOff className="h-3.5 w-3.5" />编辑</> : <><Eye className="h-3.5 w-3.5" />预览</>}
                </button>
              </div>
              {showPreview ? (
                <div className="w-full bg-slate-700/50 rounded-lg px-3 py-2 mb-3 min-h-[150px] text-slate-300 prose prose-invert text-sm"
                  dangerouslySetInnerHTML={{ __html: simpleMarkdown(createForm.content) }} />
              ) : (
                <textarea value={createForm.content} onChange={e => setCreateForm(f => ({ ...f, content: e.target.value }))}
                  placeholder="内容（支持Markdown）" rows={6} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />
              )}
              <input value={createForm.tags} onChange={e => setCreateForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="标签（逗号分隔）" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-4 border border-slate-600" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowCreate(false); setShowPreview(false); }} className="px-4 py-2 bg-slate-600 rounded-lg">取消</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg">发布</button>
              </div>
            </div>
          </div>
        )}

        {/* 编辑讨论弹窗 */}
        {editingId && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={() => setEditingId(null)}>
            <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <h2 className="text-lg font-bold mb-4">编辑讨论</h2>
              <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="标题" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />
              <textarea value={editForm.content} onChange={e => setEditForm(f => ({ ...f, content: e.target.value }))}
                placeholder="内容" rows={6} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />
              <input value={editForm.tags} onChange={e => setEditForm(f => ({ ...f, tags: e.target.value }))}
                placeholder="标签（逗号分隔）" className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-4 border border-slate-600" />
              <div className="flex gap-3 justify-end">
                <button onClick={() => setEditingId(null)} className="px-4 py-2 bg-slate-600 rounded-lg">取消</button>
                <button onClick={handleEdit} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg">保存</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
