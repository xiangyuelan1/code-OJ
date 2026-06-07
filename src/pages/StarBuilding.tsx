import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  starpathBuildingAPI,
  pointsAPI,
  type UserBuildingData,
  type BuildingConfig,
} from '../services/api';
import {
  Building2, ArrowUpCircle, Coins, ArrowLeft, Loader2,
  Home, FlaskConical, BookOpen, Swords, Telescope, Move, Sparkles,
  X, CheckCircle2, Pickaxe, MapPin,
} from 'lucide-react';

const GRID_WIDTH = 12;
const GRID_HEIGHT = 8;

type BuildingConfigMap = Record<string, Record<number, BuildingConfig>>;
type DragState = { buildingId: string; pointerId: number } | null;
type ToastState = { type: 'success' | 'error'; message: string } | null;

const BUILDING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  HEADQUARTERS: Home,
  LABORATORY: FlaskConical,
  LIBRARY: BookOpen,
  ARENA: Swords,
  OBSERVATORY: Telescope,
};

const BUILDING_THEME: Record<string, { name: string; accent: string; emoji: string; shadow: string }> = {
  HEADQUARTERS: { name: '指挥部', accent: '#38bdf8', emoji: '🏛️', shadow: 'shadow-cyan-400/30' },
  LABORATORY: { name: '实验室', accent: '#22c55e', emoji: '🧪', shadow: 'shadow-emerald-400/30' },
  LIBRARY: { name: '图书馆', accent: '#f59e0b', emoji: '📚', shadow: 'shadow-amber-400/30' },
  ARENA: { name: '竞技场', accent: '#ef4444', emoji: '⚔️', shadow: 'shadow-red-400/30' },
  OBSERVATORY: { name: '天文台', accent: '#a78bfa', emoji: '🔭', shadow: 'shadow-violet-400/30' },
};

function TwinklingStars({ count = 90 }: { count?: number }) {
  const stars = useMemo(() => Array.from({ length: count }, (_, id) => ({
    id,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  })), [count]);

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

function LevelDots({ level, color }: { level: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3].map((n) => (
        <div
          key={n}
          className="h-2 w-2 rounded-full transition-all"
          style={{
            background: n <= level ? color : 'rgba(255,255,255,0.16)',
            boxShadow: n <= level ? `0 0 8px ${color}` : 'none',
          }}
        />
      ))}
    </div>
  );
}

function tileToPercent(posX: number, posY: number) {
  return {
    left: `${6 + posX * 7.6 + (posY % 2) * 3.6}%`,
    top: `${11 + posY * 9.2}%`,
  };
}

function clampGrid(value: number, max: number) {
  return Math.min(max - 1, Math.max(0, Math.round(value)));
}

function getConfig(configs: BuildingConfigMap, buildingType: string, level: number) {
  return configs[buildingType]?.[level] ?? null;
}

function PlanetSelector({
  planets,
  activePlanetId,
  onChange,
}: {
  planets: Array<{ planetId: string; planetName: string; regionName: string; regionColor: string }>;
  activePlanetId: string | null;
  onChange: (planetId: string) => void;
}) {
  if (planets.length <= 1) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {planets.map((planet) => (
        <button
          key={planet.planetId}
          onClick={() => onChange(planet.planetId)}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-all ${
            activePlanetId === planet.planetId
              ? 'border-cyan-300/60 bg-cyan-400/15 text-white shadow-lg shadow-cyan-500/10'
              : 'border-white/10 bg-white/5 text-slate-400 hover:border-white/20 hover:text-white'
          }`}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: planet.regionColor }} />
          {planet.planetName}
        </button>
      ))}
    </div>
  );
}

function BuildingSprite({
  building,
  config,
  selected,
  dragging,
  onSelect,
  onPointerDown,
  onCollectIncome,
}: {
  building: UserBuildingData;
  config: BuildingConfig | null;
  selected: boolean;
  dragging: boolean;
  onSelect: () => void;
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onCollectIncome: () => void;
}) {
  const theme = BUILDING_THEME[building.buildingType] ?? BUILDING_THEME.HEADQUARTERS;
  const Icon = BUILDING_ICONS[building.buildingType] ?? Building2;
  const position = tileToPercent(building.posX, building.posY);
  const sizeClass = building.level >= 3 ? 'h-24 w-24' : building.level === 2 ? 'h-20 w-20' : 'h-16 w-16';
  const canCollect = building.buildingType === 'HEADQUARTERS' && building.level >= 2;

  return (
    <button
      type="button"
      onClick={onSelect}
      onPointerDown={onPointerDown}
      className={`absolute -translate-x-1/2 -translate-y-1/2 touch-none select-none transition-all duration-200 ${
        dragging ? 'z-40 scale-110 cursor-grabbing' : 'z-20 cursor-grab hover:z-30 hover:-translate-y-[58%]'
      }`}
      style={position}
      title={`${config?.name ?? theme.name} · 拖拽可移动`}
    >
      {canCollect && (
        <span
          onClick={(event) => {
            event.stopPropagation();
            onCollectIncome();
          }}
          className="absolute -right-3 -top-5 z-50 rounded-full border border-amber-300/50 bg-amber-400/90 px-2 py-1 text-[11px] font-bold text-slate-950 shadow-lg shadow-amber-400/30 animate-bounce"
        >
          +收益
        </span>
      )}

      <span
        className={`relative flex ${sizeClass} items-center justify-center rounded-[28%] border backdrop-blur-md transition-all ${theme.shadow} ${
          selected ? 'border-white/80 shadow-2xl ring-4 ring-white/15' : 'border-white/20 shadow-xl'
        }`}
        style={{
          background: `linear-gradient(145deg, ${theme.accent}33, rgba(15,23,42,0.92) 58%, ${theme.accent}22)`,
          boxShadow: selected ? `0 0 36px ${theme.accent}55` : `0 14px 30px rgba(0,0,0,0.35), 0 0 18px ${theme.accent}33`,
        }}
      >
        <span className="absolute inset-x-3 bottom-1 h-2 rounded-full bg-black/30 blur-sm" />
        <span className="absolute -top-2 right-1 rounded-full bg-slate-950/80 px-1.5 py-0.5 text-[10px] font-bold text-white ring-1 ring-white/15">
          Lv.{building.level}
        </span>
        <span className="absolute left-2 top-2 text-lg">{theme.emoji}</span>
        <Icon className="h-8 w-8 text-white drop-shadow-lg" />
        {building.level >= 2 && <span className="absolute bottom-3 h-1.5 w-10 rounded-full" style={{ background: theme.accent, boxShadow: `0 0 12px ${theme.accent}` }} />}
        {building.level >= 3 && <Sparkles className="absolute right-2 top-2 h-4 w-4 text-white animate-pulse" />}
      </span>
    </button>
  );
}

function BuildDock({
  availableTypes,
  selectedType,
  configs,
  points,
  onSelect,
  onCancel,
}: {
  availableTypes: string[];
  selectedType: string | null;
  configs: BuildingConfigMap;
  points: number;
  onSelect: (buildingType: string) => void;
  onCancel: () => void;
}) {
  if (availableTypes.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-300/15 bg-emerald-400/10 p-4 text-sm text-emerald-200">
        当前星球所有建筑都已落成，继续升级它们来提升基地战力。
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-4 backdrop-blur-xl shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">建造蓝图</p>
          <p className="text-xs text-slate-400">选择建筑后点击基地空地确认落位</p>
        </div>
        {selectedType && (
          <button onClick={onCancel} className="rounded-full border border-white/10 p-1.5 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
        {availableTypes.map((type) => {
          const config = getConfig(configs, type, 1);
          const theme = BUILDING_THEME[type] ?? BUILDING_THEME.HEADQUARTERS;
          const Icon = BUILDING_ICONS[type] ?? Building2;
          const disabled = !config || points < config.cost;
          return (
            <button
              key={type}
              disabled={disabled}
              onClick={() => onSelect(type)}
              className={`group rounded-2xl border p-3 text-left transition-all ${
                selectedType === type
                  ? 'border-cyan-300/60 bg-cyan-400/15 shadow-lg shadow-cyan-500/10'
                  : disabled
                    ? 'border-white/5 bg-white/[0.03] opacity-50'
                    : 'border-white/10 bg-white/[0.06] hover:border-white/25 hover:bg-white/[0.09]'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}55` }}>
                  <Icon className="h-5 w-5" style={{ color: theme.accent }} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white">{config?.name ?? theme.name}</span>
                  <span className="line-clamp-2 text-xs text-slate-400">{config?.description ?? '暂无说明'}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs text-amber-300"><Coins className="h-3 w-3" />{config?.cost ?? 0}</span>
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OperationPanel({
  building,
  configs,
  points,
  actionLoading,
  onUpgrade,
  onCollectIncome,
  onClose,
}: {
  building: UserBuildingData | null;
  configs: BuildingConfigMap;
  points: number;
  actionLoading: string | null;
  onUpgrade: (building: UserBuildingData) => void;
  onCollectIncome: () => void;
  onClose: () => void;
}) {
  if (!building) {
    return (
      <div className="rounded-3xl border border-white/10 bg-slate-950/55 p-5 backdrop-blur-xl shadow-2xl">
        <p className="text-sm font-semibold text-white">基地操作</p>
        <p className="mt-2 text-xs leading-5 text-slate-400">点击建筑查看效果，拖拽建筑调整布局。选择蓝图后点击空地即可建造。</p>
      </div>
    );
  }

  const theme = BUILDING_THEME[building.buildingType] ?? BUILDING_THEME.HEADQUARTERS;
  const currentConfig = getConfig(configs, building.buildingType, building.level) ?? building.config;
  const nextConfig = getConfig(configs, building.buildingType, building.level + 1);
  const isMaxLevel = building.level >= 3;
  const isUpgrading = actionLoading === `upgrade-${building.planetId}-${building.buildingType}`;
  const canCollect = building.buildingType === 'HEADQUARTERS' && building.level >= 2;

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl shadow-2xl">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-slate-400">当前选中</p>
          <h3 className="mt-1 text-lg font-bold text-white">{currentConfig?.name ?? theme.name}</h3>
        </div>
        <button onClick={onClose} className="rounded-full border border-white/10 p-1.5 text-slate-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl" style={{ background: `${theme.accent}22`, border: `1px solid ${theme.accent}55` }}>
          {theme.emoji}
        </div>
        <div className="min-w-0">
          <LevelDots level={building.level} color={theme.accent} />
          <p className="mt-1 line-clamp-2 text-xs text-slate-400">{currentConfig?.description ?? '该建筑正在为你的学习基地提供能力加成。'}</p>
        </div>
      </div>

      <div className="mb-4 rounded-2xl border border-cyan-300/15 bg-cyan-400/10 p-3">
        <p className="text-xs font-semibold text-cyan-200">当前效果</p>
        <p className="mt-1 text-xs text-cyan-100/80">{currentConfig?.effect ?? '基础建设能力'}</p>
      </div>

      <div className="space-y-2">
        {canCollect && (
          <button
            onClick={onCollectIncome}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/15 px-4 py-2.5 text-sm font-semibold text-amber-200 transition-all hover:bg-amber-400/25"
          >
            <Pickaxe className="h-4 w-4" /> 收取建设收益
          </button>
        )}

        {isMaxLevel ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-300/20 bg-emerald-400/10 px-4 py-2.5 text-sm font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> 已达到最高等级
          </div>
        ) : (
          <button
            onClick={() => onUpgrade(building)}
            disabled={isUpgrading || !nextConfig || points < (nextConfig?.cost ?? 0)}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              !nextConfig || points < (nextConfig?.cost ?? 0)
                ? 'border border-white/10 bg-white/5 text-slate-500'
                : 'border border-violet-300/30 bg-violet-400/15 text-violet-100 hover:bg-violet-400/25'
            }`}
          >
            {isUpgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpCircle className="h-4 w-4" />}
            升级到 Lv.{building.level + 1} · {nextConfig?.cost ?? 0} 积分
          </button>
        )}
      </div>
    </div>
  );
}

export function StarBuildingPage() {
  const [buildings, setBuildings] = useState<UserBuildingData[]>([]);
  const [configs, setConfigs] = useState<BuildingConfigMap>({});
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activePlanetId, setActivePlanetId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedBuildType, setSelectedBuildType] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const baseRef = useRef<HTMLDivElement | null>(null);

  const showToast = useCallback((type: ToastState['type'], message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 2600);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [buildingsRes, configsRes, pointsRes] = await Promise.all([
        starpathBuildingAPI.getMyBuildings(),
        starpathBuildingAPI.getConfigs(),
        pointsAPI.getMyPoints(),
      ]);

      if (buildingsRes.success && buildingsRes.data) {
        const nextBuildings = buildingsRes.data as UserBuildingData[];
        setBuildings(nextBuildings);
        setActivePlanetId((current) => current ?? nextBuildings[0]?.planetId ?? null);
      }
      if (configsRes.success && configsRes.data) {
        setConfigs(configsRes.data as BuildingConfigMap);
      }
      if (pointsRes.success && pointsRes.data) {
        setPoints((pointsRes.data as { points: number }).points);
      }
    } catch {
      showToast('error', '建筑数据加载失败');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const planets = useMemo(() => {
    const map = new Map<string, { planetId: string; planetName: string; regionName: string; regionColor: string }>();
    for (const building of buildings) {
      map.set(building.planetId, {
        planetId: building.planetId,
        planetName: building.planetName,
        regionName: building.regionName,
        regionColor: building.regionColor,
      });
    }
    return Array.from(map.values());
  }, [buildings]);

  const activeBuildings = useMemo(
    () => buildings.filter((building) => building.planetId === activePlanetId),
    [buildings, activePlanetId],
  );

  const selectedBuilding = useMemo(
    () => activeBuildings.find((building) => building.id === selectedBuildingId) ?? null,
    [activeBuildings, selectedBuildingId],
  );

  const availableTypes = useMemo(() => {
    const builtTypes = new Set(activeBuildings.map((building) => building.buildingType));
    return Object.keys(configs).filter((type) => !builtTypes.has(type));
  }, [activeBuildings, configs]);

  const occupied = useMemo(() => {
    const map = new Map<string, string>();
    for (const building of activeBuildings) {
      map.set(`${building.posX}:${building.posY}`, building.id);
    }
    return map;
  }, [activeBuildings]);

  const pointToGrid = useCallback((clientX: number, clientY: number) => {
    const rect = baseRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = clampGrid(((clientX - rect.left) / rect.width) * GRID_WIDTH, GRID_WIDTH);
    const y = clampGrid(((clientY - rect.top) / rect.height) * GRID_HEIGHT, GRID_HEIGHT);
    return { posX: x, posY: y };
  }, []);

  const handleBuildAt = async (posX: number, posY: number) => {
    if (!selectedBuildType || !activePlanetId) return;
    const key = `${posX}:${posY}`;
    if (occupied.has(key)) {
      showToast('error', '这里已经有建筑了，换一块空地吧');
      return;
    }

    const config = getConfig(configs, selectedBuildType, 1);
    if (!config || points < config.cost) {
      showToast('error', '积分不足，暂时无法建造');
      return;
    }

    setActionLoading(`build-${selectedBuildType}`);
    try {
      const res = await starpathBuildingAPI.build(activePlanetId, selectedBuildType, { posX, posY });
      if (res.success) {
        setSelectedBuildType(null);
        showToast('success', `${config.name} 已落成`);
        await loadData();
      }
    } catch {
      showToast('error', '建造失败，请稍后重试');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUpgrade = async (building: UserBuildingData) => {
    const actionKey = `upgrade-${building.planetId}-${building.buildingType}`;
    setActionLoading(actionKey);
    try {
      const res = await starpathBuildingAPI.upgrade(building.planetId, building.buildingType);
      if (res.success) {
        showToast('success', '建筑升级完成，基地能量提升');
        await loadData();
      }
    } catch {
      showToast('error', '升级失败，可能是积分不足');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCollectIncome = async () => {
    setActionLoading('collect-income');
    try {
      const res = await starpathBuildingAPI.collectPassiveIncome();
      const data = res.data as { collectedPoints?: number } | undefined;
      const collected = data?.collectedPoints ?? 0;
      showToast(collected > 0 ? 'success' : 'error', collected > 0 ? `收取建设收益 +${collected} 积分` : '暂无可收取收益');
      await loadData();
    } catch {
      showToast('error', '收益收取失败');
    } finally {
      setActionLoading(null);
    }
  };

  const handleTileClick = (posX: number, posY: number) => {
    if (selectedBuildType) {
      handleBuildAt(posX, posY);
    }
  };

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const position = pointToGrid(event.clientX, event.clientY);
    if (!position) return;

    setBuildings((current) => current.map((building) => (
      building.id === dragState.buildingId ? { ...building, ...position } : building
    )));
  }, [dragState, pointToGrid]);

  const handlePointerUp = useCallback(async (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragState) return;
    const position = pointToGrid(event.clientX, event.clientY);
    const movingBuilding = buildings.find((building) => building.id === dragState.buildingId);
    setDragState(null);

    if (!position || !movingBuilding) return;
    const occupiedBy = occupied.get(`${position.posX}:${position.posY}`);
    if (occupiedBy && occupiedBy !== movingBuilding.id) {
      showToast('error', '目标地块已被占用，移动已取消');
      await loadData();
      return;
    }

    try {
      const res = await starpathBuildingAPI.updateLayout(movingBuilding.id, position.posX, position.posY);
      if (res.success) {
        showToast('success', '基地布局已保存');
        await loadData();
      }
    } catch {
      showToast('error', '布局保存失败');
      await loadData();
    }
  }, [buildings, dragState, loadData, occupied, pointToGrid, showToast]);

  if (loading) {
    return (
      <div className="starfield-bg flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-300" />
          <p className="text-sm text-slate-400">正在装载星球基地...</p>
        </div>
      </div>
    );
  }

  if (!activePlanetId) {
    return (
      <div className="starfield-bg star-nebula relative -mx-6 -mt-8 min-h-screen px-6 py-10 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
        <TwinklingStars />
        <div className="relative z-10 mx-auto max-w-xl rounded-3xl border border-white/10 bg-slate-950/70 p-8 text-center backdrop-blur-xl">
          <Building2 className="mx-auto mb-4 h-12 w-12 text-cyan-300" />
          <h1 className="text-2xl font-bold text-white">还没有可建设的星球</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">先在编程星途中精通一颗星球，系统会为它开放建设基地。</p>
          <Link to="/starpath" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-cyan-400 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-300">
            返回星途
          </Link>
        </div>
      </div>
    );
  }

  const activePlanet = planets.find((planet) => planet.planetId === activePlanetId);

  return (
    <div className="starfield-bg star-nebula relative -mx-6 -mt-8 min-h-screen overflow-hidden px-6 pb-12 pt-8 md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
      <TwinklingStars />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_48%_42%,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_72%_30%,rgba(168,85,247,0.14),transparent_26%)]" />

      {toast && (
        <div className={`fixed right-6 top-6 z-50 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xl backdrop-blur-xl ${
          toast.type === 'success'
            ? 'border-emerald-300/30 bg-emerald-500/20 text-emerald-100'
            : 'border-red-300/30 bg-red-500/20 text-red-100'
        }`}
        >
          {toast.message}
        </div>
      )}

      <div className="relative z-10">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <Link to="/starpath" className="mb-3 inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white">
              <ArrowLeft className="h-4 w-4" /> 返回星途
            </Link>
            <h1 className="text-3xl font-black tracking-tight text-white md:text-4xl">
              星球<span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-amber-200 bg-clip-text text-transparent">基地</span>
            </h1>
            <p className="mt-2 text-sm text-slate-400">拖拽建筑规划你的学习基地，升级设施会直接强化编程星途能力。</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PlanetSelector planets={planets} activePlanetId={activePlanetId} onChange={(planetId) => { setActivePlanetId(planetId); setSelectedBuildingId(null); }} />
            <div className="rounded-2xl border border-amber-300/20 bg-amber-400/10 px-4 py-3 shadow-lg shadow-amber-500/10">
              <p className="text-xs text-amber-100/70">当前积分</p>
              <p className="flex items-center gap-2 text-xl font-black text-amber-300"><Coins className="h-5 w-5" />{points}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="relative min-h-[640px] rounded-[2rem] border border-cyan-200/10 bg-slate-950/45 p-4 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between px-2">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <MapPin className="h-4 w-4 text-cyan-300" />
                {activePlanet?.planetName ?? '星球基地'} · {activePlanet?.regionName ?? '未知星域'}
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Move className="h-3.5 w-3.5" /> 拖拽建筑移动，点击空地建造
              </div>
            </div>

            <div
              ref={baseRef}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={() => setDragState(null)}
              className="relative h-[570px] overflow-hidden rounded-[1.5rem] border border-white/10 bg-[radial-gradient(ellipse_at_center,rgba(56,189,248,0.20),rgba(15,23,42,0.88)_48%,rgba(2,6,23,0.96)_78%)] shadow-inner"
            >
              <div className="absolute left-1/2 top-1/2 h-[88%] w-[86%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-cyan-200/10 bg-[linear-gradient(135deg,rgba(15,118,110,0.38),rgba(30,41,59,0.68)_45%,rgba(88,28,135,0.36))] shadow-2xl shadow-cyan-500/10" />
              <div className="absolute left-1/2 top-1/2 h-[70%] w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-white/5 bg-[radial-gradient(circle,rgba(255,255,255,0.08),transparent_65%)]" />

              {Array.from({ length: GRID_HEIGHT }, (_, y) => Array.from({ length: GRID_WIDTH }, (_, x) => {
                const position = tileToPercent(x, y);
                const occupiedBy = occupied.get(`${x}:${y}`);
                const canBuildHere = selectedBuildType && !occupiedBy;
                return (
                  <button
                    key={`${x}-${y}`}
                    type="button"
                    onClick={() => handleTileClick(x, y)}
                    className={`absolute h-10 w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-18deg] rounded-xl border transition-all ${
                      canBuildHere
                        ? 'border-cyan-300/35 bg-cyan-300/15 hover:border-cyan-200 hover:bg-cyan-300/25'
                        : 'border-white/[0.04] bg-white/[0.025]'
                    }`}
                    style={position}
                    aria-label={`地块 ${x},${y}`}
                  />
                );
              }))}

              {activeBuildings.map((building) => (
                <BuildingSprite
                  key={building.id}
                  building={building}
                  config={getConfig(configs, building.buildingType, building.level) ?? building.config}
                  selected={selectedBuildingId === building.id}
                  dragging={dragState?.buildingId === building.id}
                  onSelect={() => { setSelectedBuildingId(building.id); setSelectedBuildType(null); }}
                  onCollectIncome={handleCollectIncome}
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragState({ buildingId: building.id, pointerId: event.pointerId });
                    setSelectedBuildingId(building.id);
                    setSelectedBuildType(null);
                  }}
                />
              ))}

              {selectedBuildType && (
                <div className="pointer-events-none absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border border-cyan-300/30 bg-cyan-400/15 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-lg shadow-cyan-500/20 backdrop-blur-xl">
                  建造模式：选择一个发光空地放置 {getConfig(configs, selectedBuildType, 1)?.name}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <OperationPanel
              building={selectedBuilding}
              configs={configs}
              points={points}
              actionLoading={actionLoading}
              onUpgrade={handleUpgrade}
              onCollectIncome={handleCollectIncome}
              onClose={() => setSelectedBuildingId(null)}
            />
            <BuildDock
              availableTypes={availableTypes}
              selectedType={selectedBuildType}
              configs={configs}
              points={points}
              onSelect={(type) => { setSelectedBuildType(type); setSelectedBuildingId(null); }}
              onCancel={() => setSelectedBuildType(null)}
            />
          </aside>
        </div>
      </div>
    </div>
  );
}
