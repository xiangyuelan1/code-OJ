import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { learningAPI } from '../services/api';
import {
  Plus, Trash2, RefreshCw, CheckCircle2, Circle, Loader2,
  Map, Trophy, Flame, Target, ChevronRight, Sparkles, ArrowRight, ArrowLeft,
  Globe, BookOpen,
} from 'lucide-react';

interface LearningPathItem {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  status: string;
  totalSteps: number;
  completedSteps: number;
  generatedBy: string;
  createdAt: string;
}

interface AchievementItem {
  id: string;
  type: string;
  title: string;
  description: string;
  icon: string;
  earnedAt: string;
}

interface LearningStatsData {
  streakDays: number;
  planetProgress: { explored: number; mastered: number; total: number };
  submissionStats: { total: number; accepted: number; rate: number };
  dailyCompleted: number;
  examCount: number;
  pathStats: { total: number; completed: number };
  recentActivity: Array<{ date: string; count: number }>;
  abilityRadar: Record<string, number>;
}

const ACHIEVEMENT_DEFINITIONS: Array<{ type: string; title: string; description: string; icon: string }> = [
  { type: 'FIRST_PLANET', title: '初探星辰', description: '探索第一个星球', icon: '🌟' },
  { type: 'REGION_MASTER', title: '星域征服者', description: '精通一个星域的所有星球', icon: '👑' },
  { type: 'STREAK_7', title: '坚持不懈', description: '连续学习7天', icon: '🔥' },
  { type: 'STREAK_30', title: '学习达人', description: '连续学习30天', icon: '💪' },
  { type: 'EXPLORER_10', title: '星际探索者', description: '探索10个星球', icon: '🚀' },
  { type: 'MASTER_5', title: '知识大师', description: '精通5个星球', icon: '⭐' },
  { type: 'PATH_COMPLETE', title: '路径终结者', description: '完成一条学习路径', icon: '🏁' },
  { type: 'DAILY_7', title: '每日挑战者', description: '完成7次每日挑战', icon: '📅' },
  { type: 'SUBMISSION_100', title: '百题斩', description: '提交100次代码', icon: '💯' },
  { type: 'PERFECT_EXAM', title: '满分考生', description: '考试获得满分', icon: '🎯' },
];

function getDifficultyColor(d: string): string {
  switch (d) {
    case 'EASY': return 'text-emerald-400 bg-emerald-500/15';
    case 'MEDIUM': return 'text-amber-400 bg-amber-500/15';
    case 'HARD': return 'text-rose-400 bg-rose-500/15';
    default: return 'text-slate-400 bg-slate-500/15';
  }
}

function getDifficultyLabel(d: string): string {
  switch (d) {
    case 'EASY': return '基础';
    case 'MEDIUM': return '进阶';
    case 'HARD': return '挑战';
    default: return d;
  }
}

export function LearningPathPage() {
  const navigate = useNavigate();
  const [paths, setPaths] = useState<LearningPathItem[]>([]);
  const [achievements, setAchievements] = useState<AchievementItem[]>([]);
  const [stats, setStats] = useState<LearningStatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [genForm, setGenForm] = useState({ title: '', difficulty: 'MEDIUM', description: '' });

  const loadData = useCallback(async () => {
    try {
      const [pathsRes, achievementsRes, statsRes] = await Promise.all([
        learningAPI.getPaths(),
        learningAPI.getAchievements(),
        learningAPI.getStats(),
      ]);
      if (pathsRes.success) setPaths(pathsRes.data || []);
      if (achievementsRes.success) setAchievements(achievementsRes.data || []);
      if (statsRes.success) setStats(statsRes.data || null);
    } catch {
      /* 加载失败静默处理 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await learningAPI.generatePath({
        title: genForm.title || undefined,
        description: genForm.description || undefined,
        difficulty: genForm.difficulty,
      });
      if (res.success) {
        setShowGenerateForm(false);
        setGenForm({ title: '', difficulty: 'MEDIUM', description: '' });
        loadData();
      }
    } catch (error: any) {
      alert(error.error?.message || '生成学习路径失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条学习路径吗？')) return;
    try {
      await learningAPI.deletePath(id);
      loadData();
    } catch (error: any) {
      alert(error.error?.message || '删除失败');
    }
  };

  const handleRefresh = async (id: string) => {
    try {
      await learningAPI.refreshPath(id);
      loadData();
    } catch (error: any) {
      alert(error.error?.message || '刷新失败');
    }
  };

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载学习数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
              多元<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">学习</span>
            </h1>
            <p className="text-slate-400 text-sm">个性化学习路径 · 成就系统 · 学习统计</p>
          </div>
          <button
            onClick={() => setShowGenerateForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25 hover:text-white transition-all"
          >
            <Plus className="h-4 w-4" />
            <span className="text-sm font-medium">生成学习路径</span>
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <div className="glass-card rounded-xl px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Flame className="h-4 w-4 text-rose-400" />
                <span className="text-xs text-slate-400">连续天数</span>
              </div>
              <div className="text-xl font-bold text-rose-400">{stats.streakDays}</div>
            </div>
            <div className="glass-card rounded-xl px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Globe className="h-4 w-4 text-cyan-400" />
                <span className="text-xs text-slate-400">已探索</span>
              </div>
              <div className="text-xl font-bold text-cyan-400">
                {stats.planetProgress.explored}<span className="text-sm text-slate-500">/{stats.planetProgress.total}</span>
              </div>
            </div>
            <div className="glass-card rounded-xl px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <Target className="h-4 w-4 text-emerald-400" />
                <span className="text-xs text-slate-400">通过率</span>
              </div>
              <div className="text-xl font-bold text-emerald-400">{stats.submissionStats.rate}%</div>
            </div>
            <div className="glass-card rounded-xl px-4 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5 mb-1">
                <BookOpen className="h-4 w-4 text-amber-400" />
                <span className="text-xs text-slate-400">每日挑战</span>
              </div>
              <div className="text-xl font-bold text-amber-400">{stats.dailyCompleted}</div>
            </div>
          </div>
        )}
      </div>

      <div className="relative z-10 mb-10">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Map className="h-5 w-5 text-violet-400" />
          学习路径
        </h2>

        {paths.length > 0 ? (
          <div className="space-y-4">
            {paths.map((path) => {
              const progress = path.totalSteps > 0
                ? Math.round((path.completedSteps / path.totalSteps) * 100)
                : 0;
              return (
                <div
                  key={path.id}
                  className="glass-card rounded-xl p-5 hover:border-violet-400/30 transition-all cursor-pointer"
                  onClick={() => navigate(`/learning/path/${path.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{path.title}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(path.difficulty)}`}>
                          {getDifficultyLabel(path.difficulty)}
                        </span>
                        {path.status === 'COMPLETED' && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">
                            已完成
                          </span>
                        )}
                      </div>
                      {path.description && <p className="text-slate-400 text-sm">{path.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRefresh(path.id); }}
                        className="p-1.5 text-slate-400 hover:text-violet-400 transition-colors"
                        title="刷新路径"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(path.id); }}
                        className="p-1.5 text-slate-400 hover:text-rose-400 transition-colors"
                        title="删除路径"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">进度</span>
                      <span className="text-slate-400">{path.completedSteps}/{path.totalSteps} 步 · {progress}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-500">
                      由 {path.generatedBy} 生成 · {new Date(path.createdAt).toLocaleDateString()}
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-600" />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-10 text-center">
            <Map className="h-12 w-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">还没有学习路径</h3>
            <p className="text-slate-400 text-sm mb-4">AI 会根据你的薄弱点自动生成个性化学习路径</p>
            <button
              onClick={() => setShowGenerateForm(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              <Sparkles className="h-4 w-4" />
              生成我的学习路径
            </button>
          </div>
        )}
      </div>

      <div className="relative z-10">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-400" />
          学习成就
          <span className="text-sm font-normal text-slate-500">{achievements.length}/{ACHIEVEMENT_DEFINITIONS.length}</span>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {ACHIEVEMENT_DEFINITIONS.map((def) => {
            const earned = achievements.find(a => a.type === def.type);
            return (
              <div
                key={def.type}
                className={`glass-card rounded-xl p-4 text-center transition-all ${
                  earned ? 'border-amber-400/30 bg-amber-500/5' : 'opacity-50'
                }`}
              >
                <div className="text-3xl mb-2">{earned ? def.icon : '🔒'}</div>
                <h4 className={`text-sm font-semibold mb-1 ${earned ? 'text-white' : 'text-slate-500'}`}>
                  {def.title}
                </h4>
                <p className="text-xs text-slate-400">{def.description}</p>
                {earned && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {new Date(earned.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {showGenerateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-card rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-400" />
              生成学习路径
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">路径标题（可选）</label>
                <input
                  type="text"
                  value={genForm.title}
                  onChange={(e) => setGenForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="AI 将根据你的薄弱点自动命名"
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 outline-none focus:border-violet-400/40 transition-colors text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">目标难度</label>
                <select
                  value={genForm.difficulty}
                  onChange={(e) => setGenForm(prev => ({ ...prev, difficulty: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white outline-none focus:border-violet-400/40 transition-colors text-sm"
                >
                  <option value="EASY">基础 - 巩固基础知识</option>
                  <option value="MEDIUM">进阶 - 提升综合能力</option>
                  <option value="HARD">挑战 - 突破难点瓶颈</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">描述（可选）</label>
                <textarea
                  value={genForm.description}
                  onChange={(e) => setGenForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="告诉 AI 你想重点学习什么..."
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white placeholder-slate-500 outline-none focus:border-violet-400/40 transition-colors text-sm resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setShowGenerateForm(false); setGenForm({ title: '', difficulty: 'MEDIUM', description: '' }); }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />生成中...</>
                ) : (
                  <><Sparkles className="h-4 w-4" />开始生成</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LearningPathDetailPage() {
  const { id: pathId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pathData, setPathData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStep, setUpdatingStep] = useState<string | null>(null);

  const loadPath = useCallback(async () => {
    if (!pathId) return;
    try {
      const res = await learningAPI.getPathDetail(pathId);
      if (res.success) setPathData(res.data);
    } catch {
      /* 加载失败 */
    } finally {
      setLoading(false);
    }
  }, [pathId]);

  useEffect(() => {
    loadPath();
  }, [loadPath]);

  const handleToggleStep = async (stepId: string, currentCompleted: boolean) => {
    setUpdatingStep(stepId);
    try {
      await learningAPI.updateStep(pathId!, stepId, !currentCompleted);
      loadPath();
    } catch (error: any) {
      alert(error.error?.message || '更新失败');
    } finally {
      setUpdatingStep(null);
    }
  };

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
      </div>
    );
  }

  if (!pathData) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">未找到该学习路径</p>
          <Link to="/learning" className="text-violet-400 hover:text-violet-300">返回学习中心</Link>
        </div>
      </div>
    );
  }

  const path = pathData.path;
  const steps = pathData.steps || [];
  const progress = path.totalSteps > 0 ? Math.round((path.completedSteps / path.totalSteps) * 100) : 0;

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <div className="relative z-10">
        <Link
          to="/learning"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回学习中心
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-white">{path.title}</h1>
            <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(path.difficulty)}`}>
              {getDifficultyLabel(path.difficulty)}
            </span>
          </div>
          {path.description && <p className="text-slate-400 text-sm mb-4">{path.description}</p>}

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">总体进度</span>
              <span className="text-slate-400">{path.completedSteps}/{path.totalSteps} 步 · {progress}%</span>
            </div>
            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step: any, idx: number) => {
            const isUpdating = updatingStep === step.id;
            const stepTypeIcon = step.type === 'REGION' ? '🌌' : step.type === 'PLANET' ? '🪐' : '📝';
            const stepLink = step.type === 'REGION' ? `/starpath/region/${step.referenceId}`
              : step.type === 'PLANET' ? `/starpath/planet/${step.referenceId}`
              : `/solve/${step.referenceId}`;

            return (
              <div
                key={step.id}
                className={`glass-card rounded-xl p-4 flex items-center gap-4 transition-all ${
                  step.completed ? 'border-emerald-400/20 bg-emerald-500/5' : ''
                }`}
              >
                <button
                  onClick={() => handleToggleStep(step.id, step.completed)}
                  disabled={isUpdating}
                  className="shrink-0"
                >
                  {isUpdating ? (
                    <Loader2 className="h-6 w-6 text-violet-400 animate-spin" />
                  ) : step.completed ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  ) : (
                    <Circle className="h-6 w-6 text-slate-600 hover:text-violet-400 transition-colors" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm">{stepTypeIcon}</span>
                    <span className="text-xs text-slate-500">第 {idx + 1} 步</span>
                  </div>
                  <h4 className={`text-sm font-medium ${step.completed ? 'text-slate-400 line-through' : 'text-white'}`}>
                    {step.title}
                  </h4>
                  {step.description && (
                    <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
                  )}
                </div>

                <Link
                  to={stepLink}
                  className="shrink-0 p-2 text-slate-400 hover:text-violet-400 transition-colors"
                  title="前往挑战"
                >
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
