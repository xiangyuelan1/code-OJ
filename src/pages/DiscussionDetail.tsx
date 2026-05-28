import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, ThumbsDown, ArrowLeft, Send, Edit3, Pin, User, X, Check } from 'lucide-react';
import { discussionAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

interface Reply {
  id: string;
  content: string;
  author?: { username: string; avatar?: string; level?: number };
  createdAt: string;
}

interface Vote {
  userId: string;
  isUpvote: boolean;
}

interface DiscussionDetail {
  id: string;
  title: string;
  content: string;
  type: string;
  author?: { id?: string; username: string; avatar?: string; level?: number };
  createdAt: string;
  upvotes: number;
  isPinned?: boolean;
  problemId?: string;
  tags?: string[];
  replies?: Reply[];
  votes?: Vote[];
}

const LEVEL_NAMES: Record<number, string> = {
  1: '入门', 2: '初学', 3: '进阶', 4: '熟练', 5: '精通', 6: '大师', 7: '宗师', 8: '传说',
};

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

export function DiscussionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

  /** 编辑讨论相关状态 */
  const [editingDiscussion, setEditingDiscussion] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');

  /** 编辑回复相关状态 */
  const [editingReplyId, setEditingReplyId] = useState<string | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const res = await discussionAPI.getById(id);
        if (res.success) setDiscussion(res.data);
      } catch (error) {
        console.error('获取讨论详情失败:', error);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  const refreshDiscussion = async () => {
    if (!id) return;
    try {
      const res = await discussionAPI.getById(id);
      if (res.success) setDiscussion(res.data);
    } catch (error) {
      console.error('刷新讨论详情失败:', error);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim() || !id) return;
    try {
      const res = await discussionAPI.createReply(id, replyContent.trim());
      if (res.success) {
        setReplyContent('');
        await refreshDiscussion();
      }
    } catch (error: any) {
      alert(error.error?.message || '回复失败');
    }
  };

  const handleVote = async (isUpvote: boolean) => {
    if (!id) return;
    try {
      await discussionAPI.vote(id, isUpvote);
      await refreshDiscussion();
    } catch (error) {
      console.error('投票失败:', error);
    }
  };

  const handleTogglePin = async () => {
    if (!discussion) return;
    try {
      await discussionAPI.togglePin(discussion.id, !discussion.isPinned);
      await refreshDiscussion();
    } catch (error: any) {
      alert(error.error?.message || '操作失败');
    }
  };

  const startEditDiscussion = () => {
    if (!discussion) return;
    setEditTitle(discussion.title);
    setEditContent(discussion.content);
    setEditingDiscussion(true);
  };

  const saveEditDiscussion = async () => {
    if (!id || !editTitle.trim() || !editContent.trim()) return;
    try {
      await discussionAPI.updateDiscussion(id, {
        title: editTitle,
        content: editContent,
      });
      setEditingDiscussion(false);
      await refreshDiscussion();
    } catch (error: any) {
      alert(error.error?.message || '编辑失败');
    }
  };

  const startEditReply = (reply: Reply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const saveEditReply = async () => {
    if (!editingReplyId || !editReplyContent.trim()) return;
    try {
      await discussionAPI.updateReply(editingReplyId, editReplyContent.trim());
      setEditingReplyId(null);
      await refreshDiscussion();
    } catch (error: any) {
      alert(error.error?.message || '编辑回复失败');
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">加载中...</div>;
  }
  if (!discussion) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">讨论不存在</div>;
  }

  const userVote = discussion.votes?.find(v => v.userId === user?.id);
  const isAuthor = user?.id && (discussion.author as any)?.id === user?.id;
  const isAdmin = (user as any)?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回导航 */}
        <Link to="/discussions" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> 返回讨论列表
        </Link>

        {/* 讨论主体 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          {/* 标题 + 操作按钮 */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              {editingDiscussion ? (
                <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                  className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 text-xl font-bold border border-slate-600 mb-2" />
              ) : (
                <h1 className="text-xl font-bold flex items-center gap-2">
                  {discussion.isPinned && <Pin className="h-4 w-4 text-cyan-400 shrink-0" />}
                  {discussion.title}
                </h1>
              )}
            </div>

            {/* 操作按钮组 */}
            <div className="flex items-center gap-2 shrink-0">
              {isAuthor && !editingDiscussion && (
                <button onClick={startEditDiscussion}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-300 hover:text-cyan-400 transition-colors">
                  <Edit3 className="h-3.5 w-3.5" />编辑
                </button>
              )}
              {isAdmin && (
                <button onClick={handleTogglePin}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-colors ${discussion.isPinned ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-300 hover:text-cyan-400'}`}>
                  <Pin className="h-3.5 w-3.5" />{discussion.isPinned ? '取消置顶' : '置顶'}
                </button>
              )}
              {editingDiscussion && (
                <>
                  <button onClick={() => setEditingDiscussion(false)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-slate-700 text-slate-400">
                    <X className="h-3.5 w-3.5" />取消
                  </button>
                  <button onClick={saveEditDiscussion}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm bg-cyan-500 text-white hover:bg-cyan-600">
                    <Check className="h-3.5 w-3.5" />保存
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 作者信息 */}
          <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
            {discussion.author?.avatar ? (
              <img src={discussion.author.avatar} alt="" className="w-6 h-6 rounded-full" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center">
                <User className="h-3.5 w-3.5 text-slate-400" />
              </div>
            )}
            <span className="text-cyan-400">{discussion.author?.username || '匿名'}</span>
            {getLevelBadge(discussion.author?.level)}
            <span>·</span>
            <span>{new Date(discussion.createdAt).toLocaleString()}</span>
            {discussion.problemId && (
              <Link to={`/problem/${discussion.problemId}`} className="text-purple-400 hover:underline">关联题目</Link>
            )}
          </div>

          {/* 内容：Markdown 渲染 / 编辑模式 */}
          {editingDiscussion ? (
            <textarea value={editContent} onChange={e => setEditContent(e.target.value)}
              rows={8} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-4 border border-slate-600" />
          ) : (
            <div className="prose prose-invert max-w-none text-slate-300 mb-4 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: simpleMarkdown(discussion.content) }} />
          )}

          {/* 标签 */}
          {discussion.tags && discussion.tags.length > 0 && (
            <div className="flex gap-1.5 mb-4">
              {discussion.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}

          {/* 投票按钮：更醒目的设计 */}
          <div className="flex items-center gap-3">
            <button onClick={() => handleVote(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all text-sm font-medium ${
                userVote?.isUpvote
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/10'
                  : 'bg-slate-700 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/80'
              }`}>
              <ThumbsUp className="h-4 w-4" />
              <span className="text-lg font-bold">{discussion.upvotes}</span>
              <span className="text-xs">赞同</span>
            </button>
            <button onClick={() => handleVote(false)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all text-sm ${
                userVote && !userVote.isUpvote
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : 'bg-slate-700 text-slate-400 hover:text-rose-400'
              }`}>
              <ThumbsDown className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 回复列表 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">回复 ({discussion.replies?.length || 0})</h2>
          {discussion.replies?.map(reply => (
            <div key={reply.id} className="bg-slate-800/50 rounded-lg p-4 mb-3 border border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-slate-400">
                  {reply.author?.avatar ? (
                    <img src={reply.author.avatar} alt="" className="w-5 h-5 rounded-full" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-600 flex items-center justify-center">
                      <User className="h-3 w-3 text-slate-400" />
                    </div>
                  )}
                  <span className="text-cyan-400">{reply.author?.username || '匿名'}</span>
                  {getLevelBadge(reply.author?.level)}
                  <span>·</span>
                  <span>{new Date(reply.createdAt).toLocaleString()}</span>
                </div>

                {/* 回复编辑按钮 */}
                {user?.id && (reply.author as any)?.id === user?.id && editingReplyId !== reply.id && (
                  <button onClick={() => startEditReply(reply)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
                    <Edit3 className="h-3 w-3" />编辑
                  </button>
                )}
              </div>

              {editingReplyId === reply.id ? (
                <div>
                  <textarea value={editReplyContent} onChange={e => setEditReplyContent(e.target.value)}
                    rows={3} className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-2 border border-slate-600" />
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setEditingReplyId(null)}
                      className="px-3 py-1.5 bg-slate-700 rounded-lg text-sm text-slate-400">取消</button>
                    <button onClick={saveEditReply}
                      className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm text-white">保存</button>
                  </div>
                </div>
              ) : (
                <div className="text-slate-300 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: simpleMarkdown(reply.content) }} />
              )}
            </div>
          ))}
        </div>

        {/* 回复输入区 */}
        {isAuthenticated && (
          <div className="bg-slate-800 rounded-xl p-4">
            <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
              placeholder="写下你的回复（支持 Markdown）..." rows={3}
              className="w-full bg-slate-700 text-white rounded-lg px-3 py-2 mb-3 border border-slate-600" />
            <div className="flex justify-end">
              <button onClick={handleReply} disabled={!replyContent.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg disabled:opacity-50 transition-colors">
                <Send className="h-4 w-4" /> 回复
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
