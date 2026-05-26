import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ThumbsUp, ArrowLeft, Send } from 'lucide-react';
import { discussionAPI } from '../services/api';
import { useAuthStore } from '../stores/auth.store';

/** 讨论回复 */
interface Reply {
  id: string;
  content: string;
  author?: { username: string };
  createdAt: string;
}

/** 讨论投票记录 */
interface Vote {
  userId: string;
  isUpvote: boolean;
}

/** 讨论详情 */
interface DiscussionDetail {
  id: string;
  title: string;
  content: string;
  type: string;
  author?: { username: string };
  createdAt: string;
  upvotes: number;
  problemId?: string;
  tags?: string[];
  replies?: Reply[];
  votes?: Vote[];
}

export function DiscussionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuthStore();
  const [discussion, setDiscussion] = useState<DiscussionDetail | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [loading, setLoading] = useState(true);

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

  /** 刷新讨论详情数据 */
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

  if (loading) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">加载中...</div>;
  }
  if (!discussion) {
    return <div className="min-h-screen bg-slate-900 flex items-center justify-center text-slate-400">讨论不存在</div>;
  }

  const userVote = discussion.votes?.find(v => v.userId === user?.id);

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* 返回导航 */}
        <Link to="/discussions" className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> 返回讨论列表
        </Link>

        {/* 讨论主体 */}
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <h1 className="text-xl font-bold mb-3">{discussion.title}</h1>
          <div className="flex items-center gap-3 text-sm text-slate-400 mb-4">
            <span className="text-cyan-400">{discussion.author?.username}</span>
            <span>·</span>
            <span>{new Date(discussion.createdAt).toLocaleString()}</span>
            {discussion.problemId && (
              <Link to={`/problem/${discussion.problemId}`} className="text-purple-400 hover:underline">关联题目</Link>
            )}
          </div>
          <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap mb-4">{discussion.content}</div>
          {discussion.tags && discussion.tags.length > 0 && (
            <div className="flex gap-1.5 mb-4">
              {discussion.tags.map((tag, i) => (
                <span key={i} className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded">{tag}</span>
              ))}
            </div>
          )}
          {/* 投票按钮 */}
          <div className="flex items-center gap-4">
            <button onClick={() => handleVote(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${userVote?.isUpvote ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700 text-slate-400 hover:text-cyan-400'}`}>
              <ThumbsUp className="h-4 w-4" /> {discussion.upvotes}
            </button>
          </div>
        </div>

        {/* 回复列表 */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">回复 ({discussion.replies?.length || 0})</h2>
          {discussion.replies?.map(reply => (
            <div key={reply.id} className="bg-slate-800/50 rounded-lg p-4 mb-3 border border-slate-700">
              <div className="flex items-center gap-2 text-sm text-slate-400 mb-2">
                <span className="text-cyan-400">{reply.author?.username}</span>
                <span>·</span>
                <span>{new Date(reply.createdAt).toLocaleString()}</span>
              </div>
              <div className="text-slate-300 whitespace-pre-wrap">{reply.content}</div>
            </div>
          ))}
        </div>

        {/* 回复输入区 */}
        {isAuthenticated && (
          <div className="bg-slate-800 rounded-xl p-4">
            <textarea value={replyContent} onChange={e => setReplyContent(e.target.value)}
              placeholder="写下你的回复..." rows={3}
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
