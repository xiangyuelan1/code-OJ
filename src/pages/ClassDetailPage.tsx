import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { classAPI, classStatsAPI } from '../services/api';
import {
  Activity, MessageSquare, Megaphone, Users, BookOpen, Trophy,
  Pin, Trash2, Send, Plus, ChevronRight, Clock, Award, Target
} from 'lucide-react';

// ================== 类型定义 ==================

interface ClassInfo {
  id: string;
  name: string;
  description?: string;
  grade?: string;
  creator: { id: string; username: string };
  members: { userId: string; role: string; user: { id: string; username: string; avatar?: string } }[];
}

interface DiscussionItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
  _count: { replies: number };
}

interface DiscussionDetail {
  id: string;
  classId: string;
  title: string;
  content: string;
  isPinned: boolean;
  userId: string;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
  replies: { id: string; content: string; createdAt: string; user: { id: string; username: string; avatar?: string } }[];
}

interface ActivityItem {
  id: string;
  type: string;
  content: string;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
}

interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  user: { id: string; username: string; avatar?: string };
}

interface MemberItem {
  userId: string;
  role: string;
  user: { id: string; username: string; avatar?: string };
}

interface MemberProfile {
  username: string;
  avatar?: string;
  points: number;
  level: number;
  totalSubmissions: number;
  acceptedCount: number;
  acceptanceRate: number;
  difficultyStats: { easy: number; medium: number; hard: number };
  lastActiveAt?: string;
  strongAreas: string[];
  recentAC: { title: string; difficulty: string; time: string }[];
}

interface HomeworkItem {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: string;
  createdAt: string;
  creator: { id: string; username: string };
  _count: { submissions: number };
}

// ================== Tab 定义 ==================

type TabKey = 'activities' | 'discussions' | 'announcements' | 'members' | 'homework' | 'leaderboard';

const TABS: { key: TabKey; label: string; icon: typeof Activity }[] = [
  { key: 'activities', label: '动态', icon: Activity },
  { key: 'discussions', label: '讨论', icon: MessageSquare },
  { key: 'announcements', label: '公告', icon: Megaphone },
  { key: 'members', label: '成员', icon: Users },
  { key: 'homework', label: '作业', icon: BookOpen },
  { key: 'leaderboard', label: '排行', icon: Trophy },
];

// ================== 主组件 ==================

export function ClassDetailPage() {
  const { id: classId } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('activities');
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    classAPI.getById(classId).then(res => {
      if (res.success) setClassInfo(res.data);
    }).finally(() => setLoading(false));
  }, [classId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">班级不存在或无权访问</p>
      </div>
    );
  }

  // 判断当前用户角色
  const currentMember = classInfo.members.find(m => m.userId === user?.id);
  const isTeacher = currentMember?.role === 'TEACHER' || user?.role === 'ADMIN';

  return (
    <div className="min-h-screen bg-slate-900 p-4 md:p-6">
      {/* 班级头部 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">{classInfo.name}</h1>
        {classInfo.description && <p className="text-slate-400 mt-1">{classInfo.description}</p>}
        <p className="text-slate-500 text-sm mt-1">
          教师：{classInfo.creator.username} · {classInfo.members.length} 名成员
        </p>
      </div>

      {/* Tab 切换 */}
      <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 内容 */}
      {classId && (
        <div>
          {activeTab === 'activities' && <ActivitiesTab classId={classId} />}
          {activeTab === 'discussions' && <DiscussionsTab classId={classId} isTeacher={isTeacher} userId={user?.id} />}
          {activeTab === 'announcements' && <AnnouncementsTab classId={classId} isTeacher={isTeacher} />}
          {activeTab === 'members' && <MembersTab classId={classId} />}
          {activeTab === 'homework' && <HomeworkTab classId={classId} isTeacher={isTeacher} />}
          {activeTab === 'leaderboard' && <LeaderboardTab classId={classId} />}
        </div>
      )}
    </div>
  );
}

// ================== 动态 Tab ==================

function ActivitiesTab({ classId }: { classId: string }) {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchActivities = useCallback(async (p: number) => {
    setLoading(true);
    const res = await classAPI.getActivities(classId, { page: p, limit: 20 });
    if (res.success) {
      setActivities(res.data.activities);
      setTotal(res.data.total);
      setPage(p);
    }
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetchActivities(1); }, [fetchActivities]);

  /** 解析动态内容展示 */
  const renderActivityContent = (item: ActivityItem) => {
    try {
      const data = JSON.parse(item.content);
      if (item.type === 'PROBLEM_AC') {
        return (
          <span>
            通过了题目 <span className="text-cyan-400 font-medium">{data.problemTitle}</span>
            <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
              data.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
              data.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>{data.difficulty}</span>
          </span>
        );
      }
    } catch { /* 解析失败，展示原始内容 */ }
    return <span>{item.content}</span>;
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <EmptyState text="暂无班级动态" />
      ) : (
        activities.map(item => (
          <div key={item.id} className="bg-slate-800 rounded-lg p-4 flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white shrink-0">
              {item.user.avatar ? <img src={item.user.avatar} className="w-8 h-8 rounded-full" /> : item.user.username[0]}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm">{item.user.username}</span>
                <span className="text-slate-500 text-xs">{formatTime(item.createdAt)}</span>
              </div>
              <div className="text-slate-300 text-sm mt-1">{renderActivityContent(item)}</div>
            </div>
          </div>
        ))
      )}
      {/* 分页 */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-4">
          <button disabled={page <= 1} onClick={() => fetchActivities(page - 1)}
            className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-50 text-sm">上一页</button>
          <span className="text-slate-400 text-sm py-1">第 {page} 页</span>
          <button disabled={page * 20 >= total} onClick={() => fetchActivities(page + 1)}
            className="px-3 py-1 rounded bg-slate-700 text-slate-300 disabled:opacity-50 text-sm">下一页</button>
        </div>
      )}
    </div>
  );
}

// ================== 讨论 Tab ==================

function DiscussionsTab({ classId, isTeacher, userId }: { classId: string; isTeacher: boolean; userId?: string }) {
  const [discussions, setDiscussions] = useState<DiscussionItem[]>([]);
  const [selectedDiscussion, setSelectedDiscussion] = useState<DiscussionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDiscussions = useCallback(async () => {
    setLoading(true);
    const res = await classAPI.getDiscussions(classId);
    if (res.success) setDiscussions(res.data);
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetchDiscussions(); }, [fetchDiscussions]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    const res = await classAPI.createDiscussion(classId, { title: newTitle, content: newContent });
    if (res.success) {
      setShowCreateForm(false);
      setNewTitle('');
      setNewContent('');
      fetchDiscussions();
    }
    setSubmitting(false);
  };

  const handleViewDetail = async (discussionId: string) => {
    const res = await classAPI.getDiscussionDetail(discussionId);
    if (res.success) setSelectedDiscussion(res.data);
  };

  const handleReply = async () => {
    if (!selectedDiscussion || !replyContent.trim()) return;
    setSubmitting(true);
    const res = await classAPI.replyDiscussion(selectedDiscussion.id, replyContent);
    if (res.success) {
      setReplyContent('');
      handleViewDetail(selectedDiscussion.id);
    }
    setSubmitting(false);
  };

  const handlePin = async (discussionId: string) => {
    await classAPI.pinDiscussion(discussionId);
    fetchDiscussions();
    if (selectedDiscussion?.id === discussionId) handleViewDetail(discussionId);
  };

  const handleDelete = async (discussionId: string) => {
    if (!confirm('确定删除此讨论？')) return;
    await classAPI.deleteDiscussion(discussionId);
    if (selectedDiscussion?.id === discussionId) setSelectedDiscussion(null);
    fetchDiscussions();
  };

  if (loading) return <LoadingSpinner />;

  // 讨论详情视图
  if (selectedDiscussion) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedDiscussion(null)} className="text-cyan-400 hover:text-cyan-300 text-sm flex items-center gap-1">
          ← 返回列表
        </button>
        <div className="bg-slate-800 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {selectedDiscussion.isPinned && <Pin size={14} className="text-yellow-400" />}
              <h3 className="text-white font-bold text-lg">{selectedDiscussion.title}</h3>
            </div>
            <div className="flex items-center gap-2">
              {isTeacher && (
                <button onClick={() => handlePin(selectedDiscussion.id)} className="text-slate-400 hover:text-yellow-400 p-1">
                  <Pin size={16} />
                </button>
              )}
              {(isTeacher || selectedDiscussion.userId === userId) && (
                <button onClick={() => handleDelete(selectedDiscussion.id)} className="text-slate-400 hover:text-red-400 p-1">
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="text-slate-300 whitespace-pre-wrap">{selectedDiscussion.content}</p>
          <div className="text-slate-500 text-xs mt-3">
            {selectedDiscussion.user.username} · {formatTime(selectedDiscussion.createdAt)}
          </div>
        </div>
        {/* 回复列表 */}
        <div className="space-y-2">
          {selectedDiscussion.replies.map(reply => (
            <div key={reply.id} className="bg-slate-800/60 rounded-lg p-4 ml-4 border-l-2 border-slate-700">
              <p className="text-slate-300 text-sm">{reply.content}</p>
              <div className="text-slate-500 text-xs mt-2">
                {reply.user.username} · {formatTime(reply.createdAt)}
              </div>
            </div>
          ))}
        </div>
        {/* 回复输入 */}
        <div className="flex gap-2">
          <input
            value={replyContent}
            onChange={e => setReplyContent(e.target.value)}
            placeholder="写下你的回复..."
            className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
          />
          <button onClick={handleReply} disabled={submitting || !replyContent.trim()}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-sm">
            <Send size={16} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-medium">讨论区</h3>
        <button onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm">
          <Plus size={14} /> 发帖
        </button>
      </div>

      {/* 创建讨论表单 */}
      {showCreateForm && (
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="讨论标题"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="讨论内容..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="px-3 py-1.5 text-slate-400 hover:text-white text-sm">取消</button>
            <button onClick={handleCreate} disabled={submitting}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-sm">发布</button>
          </div>
        </div>
      )}

      {/* 讨论列表 */}
      {discussions.length === 0 ? (
        <EmptyState text="暂无讨论，发起第一个话题吧" />
      ) : (
        discussions.map(d => (
          <div key={d.id} onClick={() => handleViewDetail(d.id)}
            className="bg-slate-800 rounded-lg p-4 cursor-pointer hover:bg-slate-750 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              {d.isPinned && <Pin size={12} className="text-yellow-400" />}
              <h4 className="text-white font-medium text-sm">{d.title}</h4>
              <ChevronRight size={14} className="text-slate-500 ml-auto" />
            </div>
            <p className="text-slate-400 text-xs line-clamp-1">{d.content}</p>
            <div className="flex items-center gap-3 mt-2 text-slate-500 text-xs">
              <span>{d.user.username}</span>
              <span>{formatTime(d.createdAt)}</span>
              <span className="flex items-center gap-1"><MessageSquare size={12} />{d._count.replies}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ================== 公告 Tab ==================

function AnnouncementsTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    const res = await classAPI.getAnnouncements(classId);
    if (res.success) setAnnouncements(res.data);
    setLoading(false);
  }, [classId]);

  useEffect(() => { fetchAnnouncements(); }, [fetchAnnouncements]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setSubmitting(true);
    const res = await classAPI.createAnnouncement(classId, { title: newTitle, content: newContent });
    if (res.success) {
      setShowCreateForm(false);
      setNewTitle('');
      setNewContent('');
      fetchAnnouncements();
    }
    setSubmitting(false);
  };

  const handlePin = async (id: string) => {
    await classAPI.pinAnnouncement(id);
    fetchAnnouncements();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此公告？')) return;
    await classAPI.deleteAnnouncement(id);
    fetchAnnouncements();
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-white font-medium">班级公告</h3>
        {isTeacher && (
          <button onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm">
            <Plus size={14} /> 发布公告
          </button>
        )}
      </div>

      {showCreateForm && (
        <div className="bg-slate-800 rounded-lg p-4 space-y-3">
          <input
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="公告标题"
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <textarea
            value={newContent}
            onChange={e => setNewContent(e.target.value)}
            placeholder="公告内容..."
            rows={4}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCreateForm(false)} className="px-3 py-1.5 text-slate-400 hover:text-white text-sm">取消</button>
            <button onClick={handleCreate} disabled={submitting}
              className="px-4 py-1.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg text-sm">发布</button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <EmptyState text="暂无公告" />
      ) : (
        announcements.map(a => (
          <div key={a.id} className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {a.isPinned && <Pin size={12} className="text-yellow-400" />}
                <h4 className="text-white font-medium">{a.title}</h4>
              </div>
              {isTeacher && (
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePin(a.id)} className="text-slate-400 hover:text-yellow-400 p-1"><Pin size={14} /></button>
                  <button onClick={() => handleDelete(a.id)} className="text-slate-400 hover:text-red-400 p-1"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            <p className="text-slate-300 text-sm whitespace-pre-wrap">{a.content}</p>
            <div className="text-slate-500 text-xs mt-2">
              {a.user.username} · {formatTime(a.createdAt)}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ================== 成员 Tab ==================

function MembersTab({ classId }: { classId: string }) {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    classAPI.getMembers(classId).then(res => {
      if (res.success) setMembers(res.data);
      setLoading(false);
    });
  }, [classId]);

  const handleViewProfile = async (userId: string) => {
    setProfileLoading(true);
    const res = await classAPI.getMemberProfile(classId, userId);
    if (res.success) setSelectedProfile(res.data);
    setProfileLoading(false);
  };

  if (loading) return <LoadingSpinner />;

  // 成员概况视图
  if (selectedProfile) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedProfile(null)} className="text-cyan-400 hover:text-cyan-300 text-sm">
          ← 返回成员列表
        </button>
        {profileLoading ? <LoadingSpinner /> : (
          <div className="bg-slate-800 rounded-lg p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-xl text-white">
                {selectedProfile.avatar ? <img src={selectedProfile.avatar} className="w-12 h-12 rounded-full" /> : selectedProfile.username[0]}
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">{selectedProfile.username}</h3>
                <p className="text-slate-400 text-sm">Lv.{selectedProfile.level} · {selectedProfile.points} 积分</p>
              </div>
            </div>

            {/* 统计概览 */}
            <div className="grid grid-cols-3 gap-3">
              <StatCard label="总提交" value={selectedProfile.totalSubmissions} />
              <StatCard label="通过数" value={selectedProfile.acceptedCount} />
              <StatCard label="通过率" value={`${selectedProfile.acceptanceRate}%`} />
            </div>

            {/* 难度分布 */}
            <div>
              <h4 className="text-white text-sm font-medium mb-2">难度分布</h4>
              <div className="flex gap-3">
                <span className="text-green-400 text-sm">简单 {selectedProfile.difficultyStats.easy}</span>
                <span className="text-yellow-400 text-sm">中等 {selectedProfile.difficultyStats.medium}</span>
                <span className="text-red-400 text-sm">困难 {selectedProfile.difficultyStats.hard}</span>
              </div>
            </div>

            {/* 强项 */}
            {selectedProfile.strongAreas.length > 0 && (
              <div>
                <h4 className="text-white text-sm font-medium mb-2">强项标签</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProfile.strongAreas.map(area => (
                    <span key={area} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs">{area}</span>
                  ))}
                </div>
              </div>
            )}

            {/* 最近AC */}
            {selectedProfile.recentAC.length > 0 && (
              <div>
                <h4 className="text-white text-sm font-medium mb-2">最近通过</h4>
                <div className="space-y-1">
                  {selectedProfile.recentAC.map((ac, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-slate-300">{ac.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        ac.difficulty === 'EASY' ? 'bg-green-500/20 text-green-400' :
                        ac.difficulty === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>{ac.difficulty}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedProfile.lastActiveAt && (
              <p className="text-slate-500 text-xs flex items-center gap-1">
                <Clock size={12} /> 最近活跃：{formatTime(selectedProfile.lastActiveAt)}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {members.map(m => (
        <div key={m.userId} onClick={() => handleViewProfile(m.userId)}
          className="bg-slate-800 rounded-lg p-3 flex items-center gap-3 cursor-pointer hover:bg-slate-750 transition-colors">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm text-white shrink-0">
            {m.user.avatar ? <img src={m.user.avatar} className="w-9 h-9 rounded-full" /> : m.user.username[0]}
          </div>
          <div className="flex-1">
            <span className="text-white text-sm">{m.user.username}</span>
            {m.role === 'TEACHER' && <span className="ml-2 text-xs bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">教师</span>}
          </div>
          <ChevronRight size={16} className="text-slate-500" />
        </div>
      ))}
    </div>
  );
}

// ================== 作业 Tab ==================

function HomeworkTab({ classId, isTeacher }: { classId: string; isTeacher: boolean }) {
  const [homeworkList, setHomeworkList] = useState<HomeworkItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    classAPI.getHomework(classId).then(res => {
      if (res.success) setHomeworkList(res.data);
      setLoading(false);
    });
  }, [classId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      {homeworkList.length === 0 ? (
        <EmptyState text="暂无作业" />
      ) : (
        homeworkList.map(hw => (
          <div key={hw.id} className="bg-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium">{hw.title}</h4>
              <span className={`text-xs px-2 py-0.5 rounded ${
                hw.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-400'
              }`}>{hw.status === 'ACTIVE' ? '进行中' : '已结束'}</span>
            </div>
            {hw.description && <p className="text-slate-400 text-sm mb-2">{hw.description}</p>}
            <div className="flex items-center gap-4 text-slate-500 text-xs">
              <span className="flex items-center gap-1"><Target size={12} />{hw._count.submissions} 次提交</span>
              {hw.dueDate && <span className="flex items-center gap-1"><Clock size={12} />截止 {new Date(hw.dueDate).toLocaleDateString()}</span>}
              <span>发布于 {formatTime(hw.createdAt)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ================== 排行 Tab ==================

function LeaderboardTab({ classId }: { classId: string }) {
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    classStatsAPI.getLeaderboard(classId, { limit: 50 }).then(res => {
      if (res.success) setLeaderboard(res.data);
      setLoading(false);
    });
  }, [classId]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-2">
      {leaderboard.length === 0 ? (
        <EmptyState text="暂无排行数据" />
      ) : (
        leaderboard.map((entry: any, index: number) => (
          <div key={entry.userId || index} className="bg-slate-800 rounded-lg p-3 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              index === 0 ? 'bg-yellow-500/20 text-yellow-400' :
              index === 1 ? 'bg-slate-400/20 text-slate-300' :
              index === 2 ? 'bg-orange-500/20 text-orange-400' :
              'bg-slate-700 text-slate-400'
            }`}>
              {index + 1}
            </div>
            <div className="flex-1">
              <span className="text-white text-sm">{entry.username}</span>
            </div>
            <div className="flex items-center gap-1 text-cyan-400 text-sm">
              <Award size={14} />
              <span>{entry.acceptedCount ?? entry.score ?? 0}</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// ================== 工具组件 ==================

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400" />
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-slate-500">{text}</p>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-slate-900 rounded-lg p-3 text-center">
      <div className="text-cyan-400 font-bold text-lg">{value}</div>
      <div className="text-slate-500 text-xs mt-1">{label}</div>
    </div>
  );
}

/** 格式化时间显示 */
function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString();
}
