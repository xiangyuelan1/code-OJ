import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  starpathAchievementAPI,
  type AchievementData,
  type SkillRadarData,
  type LearningCurvePoint,
  type RecommendedPlanet,
} from '../services/api';
import {
  Trophy, Target, TrendingUp, ArrowLeft, Loader2,
  Star, Lock, ChevronRight, Award,
} from 'lucide-react';

/* ── 闪烁星星背景 ── */

function TwinklingStars({ count = 80 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 2 + 1,
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
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── 选项卡类型 ── */

type TabKey = 'achievements' | 'radar' | 'curve';

const TABS: Array<{ key: TabKey; label: string; icon: typeof Trophy }> = [
  { key: 'achievements', label: '成就', icon: Trophy },
  { key: 'radar', label: '能力雷达', icon: Target },
  { key: 'curve', label: '学习曲线', icon: TrendingUp },
];

/* ── 能力维度定义 ── */

const RADAR_AXES = [
  { key: 'algorithm', label: '算法' },
  { key: 'dataStructure', label: '数据结构' },
  { key: 'math', label: '数学' },
  { key: 'string', label: '字符串' },
  { key: 'dp', label: '动态规划' },
  { key: 'comprehensive', label: '综合' },
];

/* ── SVG 雷达图 ── */

function RadarChart({ data }: { data: SkillRadarData }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 120;
  const axisCount = RADAR_AXES.length;

  /* 计算每个轴顶点的坐标 */
  const getVertex = (index: number, scale: number) => {
    const angle = (Math.PI * 2 * index) / axisCount - Math.PI / 2;
    return {
      x: cx + radius * scale * Math.cos(angle),
      y: cy + radius * scale * Math.sin(angle),
    };
  };

  /* 生成正多边形路径 */
  const polygonPath = (scale: number) =>
    Array.from({ length: axisCount }, (_, i) => {
      const v = getVertex(i, scale);
      return `${i === 0 ? 'M' : 'L'}${v.x},${v.y}`;
    }).join(' ') + 'Z';

  /* 数据多边形路径 */
  const dataPath = RADAR_AXES.map((axis, i) => {
    const value = (data.skillRadar[axis.key] ?? 0) / 100;
    const v = getVertex(i, value);
    return `${i === 0 ? 'M' : 'L'}${v.x},${v.y}`;
  }).join(' ') + 'Z';

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-sm mx-auto">
      {/* 三层六边形网格：33%、66%、100% */}
      {[0.33, 0.66, 1].map((scale) => (
        <path key={scale} d={polygonPath(scale)} fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth="1" />
      ))}

      {/* 轴线：从中心到每个顶点 */}
      {RADAR_AXES.map((_, i) => {
        const v = getVertex(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={v.x} y2={v.y} stroke="rgba(148,163,184,0.15)" strokeWidth="1" />;
      })}

      {/* 数据填充区域 */}
      <path d={dataPath} fill="rgba(139,92,246,0.25)" stroke="rgba(139,92,246,0.8)" strokeWidth="2" />

      {/* 数据顶点圆点 */}
      {RADAR_AXES.map((axis, i) => {
        const value = (data.skillRadar[axis.key] ?? 0) / 100;
        const v = getVertex(i, value);
        return <circle key={axis.key} cx={v.x} cy={v.y} r="4" fill="rgb(139,92,246)" />;
      })}

      {/* 轴标签：维度名称 + 百分比 */}
      {RADAR_AXES.map((axis, i) => {
        const v = getVertex(i, 1.25);
        const pct = data.skillRadar[axis.key] ?? 0;
        return (
          <text key={axis.key} x={v.x} y={v.y} textAnchor="middle" dominantBaseline="middle" fill="#94a3b8" fontSize="12">
            <tspan x={v.x} dy="-6">{axis.label}</tspan>
            <tspan x={v.x} dy="16" fill="rgb(139,92,246)" fontSize="11">{pct}%</tspan>
          </text>
        );
      })}
    </svg>
  );
}

/* ── SVG 折线图 ── */

function LineChart({ data }: { data: LearningCurvePoint[] }) {
  const width = 700;
  const height = 300;
  const padLeft = 50;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  if (data.length === 0) {
    return (
      <div className="text-center text-slate-500 py-12">暂无学习曲线数据</div>
    );
  }

  const maxPlanets = Math.max(...data.map((d) => d.totalPlanetsMastered), 1);
  const yMax = Math.ceil(maxPlanets * 1.2) || 1;

  /* 将数据点映射到 SVG 坐标 */
  const points = data.map((d, i) => ({
    x: padLeft + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2),
    y: padTop + chartH - (d.totalPlanetsMastered / yMax) * chartH,
  }));

  /* 折线路径 */
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  /* 渐变填充区域路径 */
  const fillPath = linePath
    + ` L${points[points.length - 1].x},${padTop + chartH}`
    + ` L${points[0].x},${padTop + chartH} Z`;

  /* Y 轴刻度 */
  const yTicks = 5;
  const yStep = yMax / yTicks;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
      <defs>
        <linearGradient id="curveGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(139,92,246)" stopOpacity="0.3" />
          <stop offset="100%" stopColor="rgb(139,92,246)" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* 水平网格线 + Y 轴标签 */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = Math.round(yStep * i);
        const y = padTop + chartH - (val / yMax) * chartH;
        return (
          <g key={i}>
            <line x1={padLeft} y1={y} x2={padLeft + chartW} y2={y} stroke="rgba(148,163,184,0.1)" strokeWidth="1" />
            <text x={padLeft - 8} y={y} textAnchor="end" dominantBaseline="middle" fill="#64748b" fontSize="11">{val}</text>
          </g>
        );
      })}

      {/* X 轴日期标签（间隔显示避免重叠） */}
      {data.map((d, i) => {
        const showLabel = data.length <= 10 || i % Math.ceil(data.length / 10) === 0;
        if (!showLabel) return null;
        const x = padLeft + (data.length > 1 ? (i / (data.length - 1)) * chartW : chartW / 2);
        const dateStr = d.date.slice(5);
        return (
          <text key={d.date} x={x} y={padTop + chartH + 20} textAnchor="middle" fill="#64748b" fontSize="10">
            {dateStr}
          </text>
        );
      })}

      {/* 渐变填充 */}
      <path d={fillPath} fill="url(#curveGrad)" />

      {/* 数据折线 */}
      <path d={linePath} fill="none" stroke="rgb(139,92,246)" strokeWidth="2.5" strokeLinejoin="round" />

      {/* 数据点 */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgb(139,92,246)" stroke="#0a0a2e" strokeWidth="1.5" />
      ))}
    </svg>
  );
}

/* ── 推荐星球卡片 ── */

function RecommendCard({ planet }: { planet: RecommendedPlanet }) {
  return (
    <Link
      to={`/starpath/planet/${planet.planetId}`}
      className="glass-card glass-card-hover flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 hover:shadow-lg group"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
        style={{
          background: `linear-gradient(135deg, ${planet.regionColor}33, ${planet.regionColor}1A)`,
          border: `1px solid ${planet.regionColor}4D`,
        }}
      >
        <Star className="h-6 w-6" style={{ color: planet.regionColor }} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-white group-hover:text-violet-300 transition-colors">
            {planet.planetName}
          </span>
          <span className="text-xs text-slate-500">{planet.regionName}</span>
        </div>
        <p className="text-xs text-slate-400 truncate">{planet.reason}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-violet-400 transition-colors shrink-0" />
    </Link>
  );
}

/* ── 成就卡片 ── */

function AchievementCard({ achievement, earned }: { achievement: AchievementData; earned: boolean }) {
  return (
    <div
      className={`glass-card rounded-2xl p-5 transition-all duration-300 ${
        earned
          ? 'border-amber-500/30 shadow-amber-500/5'
          : 'opacity-50'
      }`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
            earned
              ? 'bg-amber-500/15 border border-amber-500/25'
              : 'bg-slate-700/30 border border-slate-600/25'
          }`}
        >
          {earned ? achievement.icon : <Lock className="h-5 w-5 text-slate-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className={`text-sm font-semibold mb-0.5 ${earned ? 'text-amber-300' : 'text-slate-500'}`}>
            {achievement.name}
          </h3>
          <p className="text-xs text-slate-400 mb-2">{achievement.description}</p>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-violet-400">+{achievement.points} 积分</span>
            {earned && achievement.earnedAt && (
              <span className="text-slate-500">
                {new Date(achievement.earnedAt).toLocaleDateString('zh-CN')}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── 主页面 ── */

export function StarAchievementPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('achievements');
  const [loading, setLoading] = useState(true);

  /* 成就数据 */
  const [earnedAchievements, setEarnedAchievements] = useState<AchievementData[]>([]);
  const [availableAchievements, setAvailableAchievements] = useState<AchievementData[]>([]);

  /* 能力雷达数据 */
  const [radarData, setRadarData] = useState<SkillRadarData | null>(null);

  /* 学习曲线数据 */
  const [curveData, setCurveData] = useState<LearningCurvePoint[]>([]);

  /* 推荐星球 */
  const [recommend, setRecommend] = useState<RecommendedPlanet | null>(null);

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadAchievements(),
        loadRadar(),
        loadCurve(),
        loadRecommend(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  /* 加载成就列表并分类为已获得 / 未获得 */
  const loadAchievements = async () => {
    try {
      const res = await starpathAchievementAPI.getMy();
      if (res.success && res.data) {
        const all: AchievementData[] = Array.isArray(res.data) ? res.data : (res.data as any).achievements ?? [];
        const earned = all.filter((a) => a.earnedAt);
        const available = all.filter((a) => !a.earnedAt);
        setEarnedAchievements(earned);
        setAvailableAchievements(available);
      }
    } catch {
      /* 成就加载失败不阻塞页面 */
    }
  };

  /* 加载能力雷达 */
  const loadRadar = async () => {
    try {
      const res = await starpathAchievementAPI.getRadar();
      if (res.success && res.data) {
        setRadarData(res.data as SkillRadarData);
      }
    } catch {
      /* 雷达数据加载失败不阻塞 */
    }
  };

  /* 加载学习曲线 */
  const loadCurve = async () => {
    try {
      const res = await starpathAchievementAPI.getLearningCurve();
      if (res.success && res.data) {
        setCurveData(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      /* 曲线数据加载失败不阻塞 */
    }
  };

  /* 加载推荐星球 */
  const loadRecommend = async () => {
    try {
      const res = await starpathAchievementAPI.getRecommend();
      if (res.success && res.data) {
        setRecommend(res.data as RecommendedPlanet);
      }
    } catch {
      /* 推荐加载失败不阻塞 */
    }
  };

  /* 检查新成就 */
  const handleCheckAchievements = async () => {
    try {
      await starpathAchievementAPI.check();
      await loadAchievements();
    } catch {
      /* 检查失败静默处理 */
    }
  };

  /* ── 加载中状态 ── */

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载成就数据...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <TwinklingStars count={80} />

      <div className="relative z-10">
        {/* 顶部导航 */}
        <Link
          to="/starpath"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          返回星途
        </Link>

        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
            成就与<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">能力</span>
          </h1>
          <p className="text-slate-400 text-sm">追踪你的成长轨迹，解锁编程成就</p>
        </div>

        {/* 推荐星球 */}
        {recommend && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Target className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-medium text-slate-300">下一步推荐</span>
            </div>
            <RecommendCard planet={recommend} />
          </div>
        )}

        {/* 选项卡切换 */}
        <div className="flex gap-1 mb-8 bg-white/5 rounded-xl p-1 w-fit">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === key
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-400/25'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── 成就选项卡 ── */}
        {activeTab === 'achievements' && (
          <div>
            {/* 检查新成就按钮 */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-400" />
                <span className="text-sm text-slate-300">
                  已获得 <span className="text-amber-400 font-semibold">{earnedAchievements.length}</span> 项成就
                </span>
              </div>
              <button
                onClick={handleCheckAchievements}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25 hover:text-white transition-all text-sm"
              >
                <Trophy className="h-4 w-4" />
                检查新成就
              </button>
            </div>

            {/* 已获得成就 */}
            {earnedAchievements.length > 0 && (
              <div className="mb-8">
                <h2 className="text-sm font-medium text-amber-400/80 mb-4 flex items-center gap-2">
                  <Star className="h-4 w-4" /> 已解锁
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {earnedAchievements.map((a) => (
                    <AchievementCard key={a.id} achievement={a} earned={true} />
                  ))}
                </div>
              </div>
            )}

            {/* 未获得成就（锁定状态） */}
            {availableAchievements.length > 0 && (
              <div>
                <h2 className="text-sm font-medium text-slate-500 mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4" /> 待解锁
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableAchievements.map((a) => (
                    <AchievementCard key={a.id} achievement={a} earned={false} />
                  ))}
                </div>
              </div>
            )}

            {/* 无成就空状态 */}
            {earnedAchievements.length === 0 && availableAchievements.length === 0 && (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-6">
                  <Trophy className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无成就</h3>
                <p className="text-slate-400 text-sm">继续探索星球，成就将逐渐解锁</p>
              </div>
            )}
          </div>
        )}

        {/* ── 能力雷达选项卡 ── */}
        {activeTab === 'radar' && (
          <div>
            {radarData ? (
              <div>
                {/* 雷达图 */}
                <div className="glass-card rounded-2xl p-6 mb-6">
                  <RadarChart data={radarData} />
                </div>

                {/* 统计摘要 */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="glass-card rounded-xl px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Star className="h-4 w-4 text-amber-400" />
                      <span className="text-xs text-slate-400">已精通星球</span>
                    </div>
                    <div className="text-xl font-bold text-amber-400">{radarData.totalPlanetsMastered}</div>
                  </div>
                  <div className="glass-card rounded-xl px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5 mb-1">
                      <Trophy className="h-4 w-4 text-violet-400" />
                      <span className="text-xs text-slate-400">总积分</span>
                    </div>
                    <div className="text-xl font-bold text-violet-400">{radarData.totalScore}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-6">
                  <Target className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无能力数据</h3>
                <p className="text-slate-400 text-sm">完成更多星球挑战后，能力雷达将逐渐展开</p>
              </div>
            )}
          </div>
        )}

        {/* ── 学习曲线选项卡 ── */}
        {activeTab === 'curve' && (
          <div>
            {/* 推荐星球（学习曲线页顶部） */}
            {recommend && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="h-4 w-4 text-cyan-400" />
                  <span className="text-sm font-medium text-slate-300">推荐下一步</span>
                </div>
                <RecommendCard planet={recommend} />
              </div>
            )}

            {curveData.length > 0 ? (
              <div className="glass-card rounded-2xl p-6">
                <h2 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-violet-400" />
                  精通星球数趋势
                </h2>
                <LineChart data={curveData} />
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-6">
                  <TrendingUp className="h-8 w-8 text-violet-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">暂无学习曲线</h3>
                <p className="text-slate-400 text-sm">持续学习后，你的成长曲线将在这里展示</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
