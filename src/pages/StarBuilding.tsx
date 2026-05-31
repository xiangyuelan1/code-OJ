import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  starpathBuildingAPI,
  pointsAPI,
  type UserBuildingData,
  type BuildingConfig,
} from '../services/api';
import {
  Building2, ArrowUpCircle, Plus, Coins, ArrowLeft, Loader2,
  Home, FlaskConical, BookOpen, Swords, Telescope,
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
            animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ── 建筑类型 → 图标映射 ── */

const BUILDING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HEADQUARTERS: Home,
  LABORATORY: FlaskConical,
  LIBRARY: BookOpen,
  ARENA: Swords,
  OBSERVATORY: Telescope,
};

/* ── 按星域分组的建筑数据结构 ── */

interface RegionGroup {
  regionName: string;
  regionColor: string;
  buildings: UserBuildingData[];
}

/* ── 等级指示器（1-3 个圆点） ── */

function LevelDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="w-2 h-2 rounded-full transition-all"
          style={{
            background: n <= level ? color : 'rgba(255,255,255,0.1)',
            boxShadow: n <= level ? `0 0 6px ${color}66` : 'none',
          }}
        />
      ))}
      <span className="ml-1 text-xs text-slate-400">Lv.{level}</span>
    </div>
  );
}

/* ── 主页面 ── */

export function StarBuildingPage() {
  const [buildings, setBuildings] = useState<UserBuildingData[]>([]);
  const [configs, setConfigs] = useState<Record<string, BuildingConfig>>({});
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  /* 加载建筑数据、配置与积分 */
  const loadData = useCallback(async () => {
    try {
      const [buildingsRes, configsRes, pointsRes] = await Promise.all([
        starpathBuildingAPI.getMyBuildings(),
        starpathBuildingAPI.getConfigs(),
        pointsAPI.getMyPoints(),
      ]);

      if (buildingsRes.success && buildingsRes.data) {
        setBuildings(buildingsRes.data as UserBuildingData[]);
      }
      if (configsRes.success && configsRes.data) {
        setConfigs(configsRes.data as Record<string, BuildingConfig>);
      }
      if (pointsRes.success && pointsRes.data) {
        setPoints((pointsRes.data as { points: number }).points);
      }
    } catch {
      /* 数据加载失败时保持空状态，不阻塞渲染 */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  /* 按星域名称分组，保留星域颜色 */
  const buildingsByRegion = useMemo<RegionGroup[]>(() => {
    const map = new Map<string, RegionGroup>();
    for (const b of buildings) {
      const key = b.regionName;
      if (!map.has(key)) {
        map.set(key, { regionName: b.regionName, regionColor: b.regionColor, buildings: [] });
      }
      map.get(key)!.buildings.push(b);
    }
    return Array.from(map.values());
  }, [buildings]);

  /* 尚未建造的建筑类型（从配置中减去已建造类型） */
  const availableTypes = useMemo(() => {
    const builtTypes = new Set(buildings.map((b) => b.buildingType));
    return Object.entries(configs).filter(([type]) => !builtTypes.has(type));
  }, [buildings, configs]);

  /* 建造新建筑 */
  const handleBuild = async (buildingType: string) => {
    if (buildings.length === 0) return;
    const planetId = buildings[0].planetId;
    const key = `build-${buildingType}`;
    setActionLoading(key);
    try {
      const res = await starpathBuildingAPI.build(planetId, buildingType);
      if (res.success) {
        await loadData();
      }
    } catch {
      /* 建造失败不中断页面 */
    } finally {
      setActionLoading(null);
    }
  };

  /* 升级已有建筑 */
  const handleUpgrade = async (planetId: string, buildingType: string) => {
    const key = `upgrade-${planetId}-${buildingType}`;
    setActionLoading(key);
    try {
      const res = await starpathBuildingAPI.upgrade(planetId, buildingType);
      if (res.success) {
        await loadData();
      }
    } catch {
      /* 升级失败不中断页面 */
    } finally {
      setActionLoading(null);
    }
  };

  /* ── 加载状态 ── */

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载建筑数据...</p>
        </div>
      </div>
    );
  }

  /* ── 正式渲染 ── */

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12">
      <TwinklingStars count={80} />

      <div className="relative z-10">
        {/* 顶部导航与标题 */}
        <div className="flex items-center justify-between mb-6">
          <Link
            to="/starpath"
            className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回星途
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold text-white">
            星球<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">建设</span>
          </h1>
        </div>

        {/* 积分余额展示 */}
        <div className="glass-card rounded-xl px-5 py-4 mb-8 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-400/25 flex items-center justify-center">
            <Coins className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-400">当前积分</p>
            <p className="text-xl font-bold text-amber-400">{points}</p>
          </div>
        </div>

        {/* 按星域分组的已有建筑 */}
        {buildingsByRegion.map((region) => (
          <section key={region.regionName} className="mb-8">
            {/* 星域标题 */}
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-3 h-3 rounded-full"
                style={{ background: region.regionColor, boxShadow: `0 0 8px ${region.regionColor}66` }}
              />
              <h2 className="text-lg font-semibold text-white">{region.regionName}</h2>
              <span className="text-xs text-slate-500">{region.buildings.length} 座建筑</span>
            </div>

            {/* 该星域下的建筑卡片 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {region.buildings.map((building) => {
                const Icon = BUILDING_ICONS[building.buildingType] ?? Building2;
                const config = building.config ?? configs[building.buildingType];
                const upgradeCost = config ? config.cost * building.level : 0;
                const isMaxLevel = building.level >= 3;
                const actionKey = `upgrade-${building.planetId}-${building.buildingType}`;
                const isUpgrading = actionLoading === actionKey;

                return (
                  <div
                    key={building.id}
                    className="glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg"
                  >
                    {/* 建筑图标与等级 */}
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className="w-11 h-11 rounded-xl flex items-center justify-center"
                        style={{
                          background: `linear-gradient(135deg, ${region.regionColor}33, ${region.regionColor}1A)`,
                          border: `1px solid ${region.regionColor}4D`,
                        }}
                      >
                        <Icon className="h-5 w-5" style={{ color: region.regionColor }} />
                      </div>
                      <LevelDots level={building.level} color={region.regionColor} />
                    </div>

                    {/* 建筑名称与描述 */}
                    <h3 className="text-base font-semibold text-white mb-1">
                      {config?.name ?? building.buildingType}
                    </h3>
                    <p className="text-xs text-slate-400 mb-1 line-clamp-2">
                      {config?.description ?? '暂无描述'}
                    </p>
                    {config?.effect && (
                      <p className="text-xs text-cyan-400/70 mb-3">✦ {config.effect}</p>
                    )}

                    {/* 所在星球 */}
                    <p className="text-xs text-slate-500 mb-3">📍 {building.planetName}</p>

                    {/* 升级按钮 */}
                    {isMaxLevel ? (
                      <div className="text-xs text-emerald-400/80 flex items-center gap-1.5">
                        <ArrowUpCircle className="h-3.5 w-3.5" />
                        已满级
                      </div>
                    ) : (
                      <button
                        onClick={() => handleUpgrade(building.planetId, building.buildingType)}
                        disabled={isUpgrading || points < upgradeCost}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          points < upgradeCost
                            ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                            : 'bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25 hover:text-white'
                        }`}
                      >
                        {isUpgrading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ArrowUpCircle className="h-3.5 w-3.5" />
                        )}
                        升级 · {upgradeCost} 积分
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))}

        {/* 可建造的建筑类型 */}
        {availableTypes.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Plus className="h-4 w-4 text-violet-400" />
              <h2 className="text-lg font-semibold text-white">可建造建筑</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableTypes.map(([type, config]) => {
                const Icon = BUILDING_ICONS[type] ?? Building2;
                const actionKey = `build-${type}`;
                const isBuilding = actionLoading === actionKey;

                return (
                  <div
                    key={type}
                    className="glass-card rounded-2xl p-5 transition-all duration-300 hover:shadow-lg border-dashed border-white/10"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-11 h-11 rounded-xl bg-violet-500/10 border border-violet-400/20 flex items-center justify-center">
                        <Icon className="h-5 w-5 text-violet-400" />
                      </div>
                      <span className="text-xs text-slate-500 px-2 py-0.5 rounded-full bg-white/5">未建造</span>
                    </div>

                    <h3 className="text-base font-semibold text-white mb-1">{config.name}</h3>
                    <p className="text-xs text-slate-400 mb-1 line-clamp-2">{config.description}</p>
                    {config.effect && (
                      <p className="text-xs text-cyan-400/70 mb-3">✦ {config.effect}</p>
                    )}

                    <button
                      onClick={() => handleBuild(type)}
                      disabled={isBuilding || points < config.cost || buildings.length === 0}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                        points < config.cost || buildings.length === 0
                          ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                          : 'bg-emerald-500/15 border border-emerald-400/25 text-emerald-300 hover:bg-emerald-500/25 hover:text-white'
                      }`}
                    >
                      {isBuilding ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Plus className="h-3.5 w-3.5" />
                      )}
                      建造 · {config.cost} 积分
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 空状态：尚无任何建筑 */}
        {buildingsByRegion.length === 0 && availableTypes.length === 0 && (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-6">
              <Building2 className="h-8 w-8 text-violet-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">暂无建筑</h3>
            <p className="text-slate-400 text-sm mb-6">探索星球后即可开始建设你的星际基地</p>
            <Link
              to="/starpath"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity"
            >
              前往星途
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
