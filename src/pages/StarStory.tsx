import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { starpathStoryAPI, type StoryArcData, type StoryChapterData } from '../services/api';
import {
  BookOpen, Lock, CheckCircle2, ChevronRight,
  ArrowLeft, Loader2, Swords,
} from 'lucide-react';

/* ── 闪烁星星背景 ── */

function TwinklingStars({ count = 60 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 0.5,
        delay: Math.random() * 5,
        duration: Math.random() * 3 + 2,
      });
    }
    return result;
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── 章节状态图标 ── */

function ChapterIcon({ chapter }: { chapter: StoryChapterData }) {
  if (chapter.completed) {
    return <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />;
  }
  if (!chapter.isUnlocked) {
    return <Lock className="h-5 w-5 text-slate-500 shrink-0" />;
  }
  if (chapter.isBoss) {
    return <Swords className="h-5 w-5 text-rose-400 shrink-0" />;
  }
  return <BookOpen className="h-5 w-5 text-violet-400 shrink-0" />;
}

/* ── 单个章节卡片 ── */

function ChapterCard({ chapter, index }: { chapter: StoryChapterData; index: number }) {
  const isCompleted = chapter.completed;
  const isLocked = !chapter.isUnlocked;
  const isBoss = chapter.isBoss;

  const cardClass = isCompleted
    ? 'glass-card border-emerald-400/20 bg-emerald-500/5'
    : isLocked
      ? 'glass-card opacity-50'
      : isBoss
        ? 'glass-card border-rose-400/20 bg-rose-500/5'
        : 'glass-card';

  return (
    <div
      className={`${cardClass} rounded-xl p-5 transition-all duration-300 animate-fade-in-up`}
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
    >
      <div className="flex items-start gap-4">
        {/* 左侧：章节序号 + 状态图标 */}
        <div className="flex flex-col items-center gap-1 pt-0.5">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/30'
              : isLocked
                ? 'bg-slate-700/50 text-slate-500 border border-slate-600/30'
                : isBoss
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-400/30'
                  : 'bg-violet-500/20 text-violet-400 border border-violet-400/30'
          }`}>
            {chapter.order}
          </div>
          <ChapterIcon chapter={chapter} />
        </div>

        {/* 右侧：章节内容 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`text-base font-semibold ${
              isCompleted ? 'text-emerald-300' :
              isLocked ? 'text-slate-500' :
              isBoss ? 'text-rose-300' :
              'text-white'
            }`}>
              {chapter.title}
            </h3>
            {/* Boss 章节特殊标签 */}
            {isBoss && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-500/20 text-rose-400 border border-rose-400/30">
                BOSS
              </span>
            )}
          </div>

          {/* 叙事文本 */}
          <p className={`text-sm leading-relaxed mb-3 ${
            isLocked ? 'text-slate-600' : 'text-slate-400'
          }`}>
            {chapter.narrative}
          </p>

          {/* 已完成：显示完成文本 */}
          {isCompleted && chapter.completionText && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-400/15">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-sm text-emerald-300">{chapter.completionText}</p>
            </div>
          )}

          {/* 已解锁但未完成：显示前往星球链接 */}
          {!isCompleted && !isLocked && chapter.planetId && (
            <Link
              to={`/starpath/planet/${chapter.planetId}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25 hover:text-white transition-all"
            >
              前往星球
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}

          {/* 奖励信息 */}
          {chapter.rewardPoints > 0 && (
            <div className={`mt-2 text-xs ${
              isCompleted ? 'text-emerald-400/60' : 'text-amber-400/60'
            }`}>
              奖励 +{chapter.rewardPoints} 积分
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── 主页面 ── */

export function StarStoryPage() {
  const { regionId } = useParams<{ regionId: string }>();
  const [arcData, setArcData] = useState<StoryArcData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadArc = useCallback(async () => {
    if (!regionId) return;
    try {
      const res = await starpathStoryAPI.getArc(regionId);
      if (res.success && res.data) {
        setArcData(res.data as StoryArcData);
      }
    } catch {
      /* 故事数据加载失败不阻塞渲染 */
    } finally {
      setLoading(false);
    }
  }, [regionId]);

  useEffect(() => {
    if (regionId) loadArc();
  }, [regionId, loadArc]);

  /* 加载中 */
  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载故事...</p>
        </div>
      </div>
    );
  }

  /* 数据为空 */
  if (!arcData) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-400 mb-4">未找到该星域的故事</p>
          <Link to="/starpath" className="text-violet-400 hover:text-violet-300 text-sm">
            返回星图
          </Link>
        </div>
      </div>
    );
  }

  const chapters = arcData.chapters;
  const completedCount = chapters.filter((c) => c.completed).length;
  const progress = chapters.length > 0
    ? Math.round((completedCount / chapters.length) * 100)
    : 0;

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <TwinklingStars count={80} />

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* 返回按钮 */}
        <Link
          to={`/starpath/region/${regionId}`}
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回星域
        </Link>

        {/* 故事标题 */}
        <div className="mb-8 animate-fade-in-up">
          <div className="flex items-center gap-3 mb-2">
            <BookOpen className="h-6 w-6 text-violet-400" />
            <h1 className="text-2xl md:text-3xl font-bold text-white">
              {arcData.title}
            </h1>
          </div>

          {/* 进度条 */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 shrink-0">
              {completedCount}/{chapters.length} 章节
            </span>
          </div>
        </div>

        {/* 序章：未全部完成时显示 */}
        {!arcData.allCompleted && arcData.prologue && (
          <div className="glass-card rounded-xl p-5 mb-6 animate-fade-in-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center">
                <BookOpen className="h-3.5 w-3.5 text-violet-400" />
              </div>
              <h2 className="text-sm font-semibold text-violet-300">序章</h2>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">{arcData.prologue}</p>
          </div>
        )}

        {/* 章节列表 */}
        <div className="space-y-4">
          {chapters.map((chapter, idx) => (
            <ChapterCard key={chapter.id} chapter={chapter} index={idx} />
          ))}
        </div>

        {/* 终章：全部完成时显示 */}
        {arcData.allCompleted && arcData.epilogue && (
          <div className="glass-card rounded-xl p-6 mt-8 border-amber-400/20 bg-amber-500/5 animate-fade-in-up">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-lg font-semibold text-amber-300">终章</h2>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{arcData.epilogue}</p>
          </div>
        )}
      </div>
    </div>
  );
}
