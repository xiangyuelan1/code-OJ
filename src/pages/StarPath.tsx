import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { starpathAPI, starpathStoryAPI, starpathAchievementAPI, starpathFunAPI, starpathBuildingAPI, starpathExplorationAPI, type StarMapData, type StarMapRegion, type SeasonEventData, type RecommendedPlanet } from '../services/api';
import {
  Sparkles, MessageSquare, ChevronRight,
  Globe, Flame, Trophy, Loader2,
  Building2, Users, Award, Zap,
  Gift, Heart, Star, Edit3,
  Rocket, Pickaxe, Dumbbell, Clock, Lock,
} from 'lucide-react';
import { GuideChatPanel } from '../components/GuideChatPanel';
import { CoderAvatar } from '../components/ui/CoderAvatar';

/* ═══════════════════════════════════════
   流星雨动画
   ═══════════════════════════════════════ */

function ShootingStars() {
  const stars = useMemo(() => {
    const result: Array<{ id: number; delay: number; duration: number; top: number; angle: number }> = [];
    for (let i = 0; i < 6; i++) {
      result.push({
        id: i,
        delay: Math.random() * 12 + i * 3,
        duration: Math.random() * 1.5 + 0.8,
        top: Math.random() * 50,
        angle: Math.random() * 20 + 20,
      });
    }
    return result;
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute h-[1px] opacity-0"
          style={{
            top: `${s.top}%`,
            left: '-10%',
            width: '120px',
            background: 'linear-gradient(to right, transparent, rgba(255,255,255,0.8), transparent)',
            transform: `rotate(${s.angle}deg)`,
            animation: `shootingStar ${s.duration}s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   漂浮可收集星星
   ═══════════════════════════════════════ */

interface FloatingStar {
  id: number;
  x: number;
  y: number;
  type: 'common' | 'rare' | 'epic' | 'legendary';
  size: number;
  wobble: number;
}

const STAR_STYLES: Record<string, { color: string; glow: string; points: string }> = {
  common: { color: 'text-yellow-300', glow: 'shadow-yellow-300/50', points: '+1' },
  rare: { color: 'text-cyan-300', glow: 'shadow-cyan-300/50', points: '+3' },
  epic: { color: 'text-purple-300', glow: 'shadow-purple-300/50', points: '+5' },
  legendary: { color: 'text-amber-400', glow: 'shadow-amber-400/60', points: '+10' },
};

function FloatingStars({ onCollect }: { onCollect: (type: string) => void }) {
  const [stars, setStars] = useState<FloatingStar[]>([]);
  const [collected, setCollected] = useState<Set<number>>(new Set());
  const [popups, setPopups] = useState<Array<{ id: number; x: number; y: number; text: string }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (stars.filter(s => !collected.has(s.id)).length < 5) {
        const rand = Math.random();
        const type: FloatingStar['type'] = rand < 0.5 ? 'common' : rand < 0.8 ? 'rare' : rand < 0.95 ? 'epic' : 'legendary';
        const newStar: FloatingStar = {
          id: Date.now() + Math.random(),
          x: 10 + Math.random() * 80,
          y: 10 + Math.random() * 80,
          type,
          size: type === 'legendary' ? 28 : type === 'epic' ? 22 : type === 'rare' ? 18 : 14,
          wobble: Math.random() * 4 + 2,
        };
        setStars(prev => [...prev.slice(-20), newStar]);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [stars.length, collected.size]);

  const handleCollect = (star: FloatingStar) => {
    if (collected.has(star.id)) return;
    setCollected(prev => new Set([...prev, star.id]));
    const style = STAR_STYLES[star.type];
    setPopups(prev => [...prev, { id: star.id, x: star.x, y: star.y, text: style.points }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== star.id)), 1000);
    onCollect(star.type);
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => {
        if (collected.has(star.id)) return null;
        const style = STAR_STYLES[star.type];
        return (
          <button
            key={star.id}
            onClick={() => handleCollect(star)}
            className={`absolute pointer-events-auto cursor-pointer ${style.color} hover:scale-150 transition-transform`}
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              animation: `floatWobble ${star.wobble}s ease-in-out infinite, starAppear 0.5s ease-out`,
              filter: star.type === 'legendary' ? 'drop-shadow(0 0 8px rgba(251,191,36,0.6))' : star.type === 'epic' ? 'drop-shadow(0 0 6px rgba(196,181,253,0.5))' : 'none',
            }}
          >
            <Star className="h-4 w-4" style={{ width: star.size, height: star.size }} fill="currentColor" />
          </button>
        );
      })}
      {popups.map(p => (
        <div
          key={p.id}
          className="absolute text-sm font-bold text-amber-400 pointer-events-none"
          style={{ left: `${p.x}%`, top: `${p.y}%`, animation: 'popUpFade 1s ease-out forwards' }}
        >
          {p.text}
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   闪烁星星背景
   ═══════════════════════════════════════ */

function TwinklingStars({ count = 80 }: { count?: number }) {
  const stars = useMemo(() => {
    const result: Array<{ id: number; x: number; y: number; size: number; delay: number; duration: number }> = [];
    for (let i = 0; i < count; i++) {
      result.push({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 2 + 1, delay: Math.random() * 5, duration: Math.random() * 3 + 2 });
    }
    return result;
  }, [count]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white"
          style={{ left: `${star.x}%`, top: `${star.y}%`, width: `${star.size}px`, height: `${star.size}px`, animation: `twinkle ${star.duration}s ease-in-out ${star.delay}s infinite` }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════
   每日宝箱
   ═══════════════════════════════════════ */

function DailyChest({ onOpen }: { onOpen: () => void }) {
  const [status, setStatus] = useState<{ opened: boolean; pointsWon: number; streak: number } | null>(null);
  const [opening, setOpening] = useState(false);
  const [result, setResult] = useState<{ pointsWon: number } | null>(null);
  const [shake, setShake] = useState(false);

  useEffect(() => { loadStatus(); }, []);

  const loadStatus = async () => {
    try {
      const res = await starpathFunAPI.getChestStatus();
      if (res.success && res.data) setStatus(res.data as any);
    } catch { /* ignore */ }
  };

  const handleOpen = async () => {
    if (status?.opened || opening) return;
    setOpening(true);
    setShake(true);
    setTimeout(() => setShake(false), 500);
    setTimeout(async () => {
      try {
        const res = await starpathFunAPI.openChest();
        if (res.success && res.data) {
          setResult(res.data as any);
          setStatus({ opened: true, pointsWon: (res.data as any).pointsWon, streak: (status?.streak || 0) + 1 });
          onOpen();
        }
      } catch { /* ignore */ } finally { setOpening(false); }
    }, 600);
  };

  return (
    <div className="glass-card rounded-2xl p-5 border-amber-400/20">
      <div className="flex items-center gap-2 mb-3">
        <Gift className="h-5 w-5 text-amber-400" />
        <h3 className="text-base font-semibold text-white">每日宝箱</h3>
        {status && status.streak > 0 && (
          <span className="ml-auto text-xs text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full">🔥 连续{status.streak}天</span>
        )}
      </div>

      {result ? (
        <div className="text-center py-4 animate-bounce">
          <div className="text-4xl mb-2">🎉</div>
          <div className="text-2xl font-bold text-amber-400">+{result.pointsWon}积分</div>
          <p className="text-xs text-slate-400 mt-1">已收入囊中！</p>
        </div>
      ) : status?.opened ? (
        <div className="text-center py-4">
          <div className="text-3xl mb-2">📦</div>
          <p className="text-sm text-slate-400">今天的宝箱已开启</p>
          <p className="text-xs text-amber-400 mt-1">获得了 {status.pointsWon} 积分</p>
        </div>
      ) : (
        <button
          onClick={handleOpen}
          disabled={opening}
          className={`w-full py-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-400/30 hover:border-amber-400/50 transition-all ${shake ? 'animate-shake' : ''}`}
        >
          <div className={`text-4xl mb-1 transition-transform ${opening ? 'scale-125' : 'hover:scale-110'}`}>🎁</div>
          <p className="text-sm text-amber-300 font-medium">{opening ? '开启中...' : '点击开箱！'}</p>
        </button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   太空宠物伙伴
   ═══════════════════════════════════════ */

function SpacePet() {
  const [pet, setPet] = useState<any>(null);
  const [petTypes, setPetTypes] = useState<Record<string, any>>({});
  const [feeding, setFeeding] = useState(false);
  const [training, setTraining] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [feedResult, setFeedResult] = useState<any>(null);
  const [trainResult, setTrainResult] = useState<any>(null);
  const [bounce, setBounce] = useState(false);

  useEffect(() => { loadPet(); loadTypes(); }, []);

  const loadPet = async () => {
    try {
      const res = await starpathFunAPI.getPet();
      if (res.success && res.data) setPet(res.data);
    } catch { /* ignore */ }
  };

  const loadTypes = async () => {
    try {
      const res = await starpathFunAPI.getPetTypes();
      if (res.success && res.data) setPetTypes(res.data);
    } catch { /* ignore */ }
  };

  const handleFeed = async () => {
    if (feeding) return;
    setFeeding(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    try {
      const res = await starpathFunAPI.feedPet();
      if (res.success && res.data) {
        setFeedResult(res.data);
        setTimeout(() => setFeedResult(null), 2000);
        loadPet();
      }
    } catch (e: any) {
      alert(e.error?.message || e.response?.data?.error?.message || '喂食失败');
    } finally { setFeeding(false); }
  };

  const handleTrain = async () => {
    if (training || !canTrain) return;
    setTraining(true);
    setBounce(true);
    setTimeout(() => setBounce(false), 400);
    try {
      const res = await starpathFunAPI.trainPet();
      if (res.success && res.data) {
        setTrainResult(res.data);
        setTimeout(() => setTrainResult(null), 3000);
        loadPet();
      }
    } catch (e: any) {
      alert(e.error?.message || e.response?.data?.error?.message || '训练失败');
    } finally { setTraining(false); }
  };

  const handleChangeType = async (type: string) => {
    try {
      await starpathFunAPI.changePetType(type);
      setShowTypes(false);
      loadPet();
    } catch { /* ignore */ }
  };

  const handleRename = async () => {
    if (!renameValue.trim()) return;
    try {
      await starpathFunAPI.renamePet(renameValue.trim());
      setShowRename(false);
      loadPet();
    } catch { /* ignore */ }
  };

  if (!pet) return null;

  const moodBar = pet.mood >= 80 ? 'bg-green-400' : pet.mood >= 50 ? 'bg-yellow-400' : 'bg-red-400';
  const expPct = Math.min(100, Math.round((pet.exp / pet.expToNext) * 100));
  const canTrain = pet.stage?.unlocks?.includes('训练') ?? false;
  const abilities = Array.isArray(pet.abilities) ? pet.abilities : [];
  const unlocks = Array.isArray(pet.stage?.unlocks) ? pet.stage.unlocks : [];

  return (
    <div className="glass-card rounded-2xl p-5 border-violet-400/20">
      <div className="flex items-center gap-2 mb-3">
        <Heart className="h-5 w-5 text-pink-400" />
        <h3 className="text-base font-semibold text-white">太空伙伴</h3>
        <span className="ml-auto text-xs text-violet-300 bg-violet-500/15 px-2 py-0.5 rounded-full">Lv.{pet.level} {pet.levelTitle}</span>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={() => { setBounce(true); setTimeout(() => setBounce(false), 400); }}
          className={`text-5xl transition-transform hover:scale-110 ${bounce ? 'animate-bounce' : ''}`}
        >
          {pet.typeInfo.emoji}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-white">{pet.petName}</span>
            <button onClick={() => { setShowRename(!showRename); setRenameValue(pet.petName); }} className="text-slate-500 hover:text-violet-400">
              <Edit3 className="h-3 w-3" />
            </button>
            <span className="text-xs text-slate-400">{pet.moodEmoji}</span>
          </div>
          <p className="text-xs text-slate-400 mb-2">{pet.typeInfo.description}</p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-8">心情</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${moodBar}`} style={{ width: `${pet.mood}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{pet.mood}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 w-8">经验</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-violet-400 transition-all" style={{ width: `${expPct}%` }} />
              </div>
              <span className="text-[10px] text-slate-400">{pet.exp}/{pet.expToNext}</span>
            </div>
          </div>
        </div>
      </div>

      {showRename && (
        <div className="flex gap-2 mb-3">
          <input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white" maxLength={20} />
          <button onClick={handleRename} className="px-3 py-1.5 rounded-lg bg-violet-500/20 text-violet-300 text-sm">确定</button>
        </div>
      )}

      <div className="mb-3 rounded-xl bg-violet-500/10 border border-violet-400/15 p-3">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-violet-200">
          <Sparkles className="h-3.5 w-3.5" /> 宠物能力
        </div>
        {abilities.length > 0 ? (
          <div className="space-y-2">
            {abilities.map((ability: any, index: number) => (
              <div key={`${ability.name}-${index}`} className="flex items-start justify-between gap-3 text-xs">
                <div>
                  <div className="text-white">{ability.name}</div>
                  <div className="text-slate-400">{ability.description}</div>
                </div>
                <span className="shrink-0 rounded-full bg-cyan-500/15 px-2 py-0.5 text-cyan-300">+{ability.effectiveValue}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">当前阶段暂无可生效能力</p>
        )}
      </div>

      <div className="mb-3 rounded-xl bg-slate-900/50 border border-white/10 p-3">
        <div className="flex items-center gap-2 mb-2 text-xs font-medium text-slate-200">
          <Lock className="h-3.5 w-3.5 text-amber-300" /> {pet.stage?.name || pet.levelTitle}阶段解锁
        </div>
        {unlocks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {unlocks.map((unlock: string) => (
              <span key={unlock} className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-300">{unlock}</span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">Lv5 进入成长阶段后解锁训练</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={handleFeed} disabled={feeding} className="flex-1 py-2 rounded-lg bg-pink-500/15 text-pink-300 text-sm hover:bg-pink-500/25 transition-colors disabled:opacity-50">
          {feeding ? '喂食中...' : '🍖 喂食 (10积分)'}
        </button>
        <button onClick={handleTrain} disabled={!canTrain || training} title={canTrain ? '消耗5积分训练宠物' : 'Lv5 解锁训练'} className="flex-1 py-2 rounded-lg bg-cyan-500/15 text-cyan-300 text-sm hover:bg-cyan-500/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <span className="inline-flex items-center justify-center gap-1"><Dumbbell className="h-3.5 w-3.5" />{training ? '训练中...' : canTrain ? '训练 (5积分)' : 'Lv5 解锁训练'}</span>
        </button>
        <button onClick={() => setShowTypes(!showTypes)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">
          🔄 换宠
        </button>
      </div>

      {feedResult && (
        <div className={`mt-3 text-center text-sm ${feedResult.leveledUp ? 'text-amber-400 animate-bounce' : 'text-green-400'}`}>
          {feedResult.leveledUp ? `🎉 升级到 Lv.${feedResult.level}！` : `心情 +20，经验 +15`}
        </div>
      )}

      {trainResult && (
        <div className={`mt-3 text-center text-sm ${trainResult.leveledUp ? 'text-amber-400 animate-bounce' : 'text-cyan-300'}`}>
          训练完成：经验 +{trainResult.expGained}{trainResult.isEpiphany ? '，触发顿悟！' : ''}{trainResult.leveledUp ? ` 升级到 Lv.${trainResult.level}！` : ''}
        </div>
      )}

      {showTypes && (
        <div className="mt-3 grid grid-cols-5 gap-2">
          {Object.entries(petTypes).map(([key, info]: [string, any]) => (
            <button
              key={key}
              onClick={() => handleChangeType(key)}
              className={`p-2 rounded-lg text-center transition-all ${pet.petType === key ? 'bg-violet-500/20 border border-violet-400/40' : 'bg-slate-800/50 border border-slate-700/50 hover:border-slate-600'}`}
            >
              <div className="text-2xl mb-1">{info.emoji}</div>
              <div className="text-[10px] text-slate-300">{info.name}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   建筑收益汇总
   ═══════════════════════════════════════ */

function BuildingIncomeCard() {
  const [effects, setEffects] = useState<any>(null);
  const [collecting, setCollecting] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { loadEffects(); }, []);

  const loadEffects = async () => {
    try {
      const res = await starpathBuildingAPI.getEffects();
      if (res.success && res.data) setEffects(res.data);
    } catch { /* ignore */ }
  };

  const handleCollect = async () => {
    if (collecting) return;
    setCollecting(true);
    try {
      const res = await starpathBuildingAPI.collectPassiveIncome();
      if (res.success && res.data) {
        setResult(res.data);
        loadEffects();
      }
    } catch (e: any) {
      alert(e.error?.message || e.response?.data?.error?.message || '收取建设收益失败');
    } finally { setCollecting(false); }
  };

  const effectItems = effects ? [
    { label: '每日被动收入', value: `+${effects.dailyPassiveIncome || 0} 积分/天`, active: (effects.dailyPassiveIncome || 0) > 0 },
    { label: '额外题目', value: `+${effects.extraProblems || 0} 题`, active: (effects.extraProblems || 0) > 0 },
    { label: '提示', value: effects.hasHints ? '已解锁' : '未解锁', active: effects.hasHints },
    { label: 'AI题解', value: effects.hasAISolution ? '已解锁' : '未解锁', active: effects.hasAISolution },
    { label: '题解', value: effects.hasSolutions ? '已解锁' : '未解锁', active: effects.hasSolutions },
    { label: '赛季积分加成', value: `+${effects.seasonPointsBonus || 0}%`, active: (effects.seasonPointsBonus || 0) > 0 },
  ] : [];

  return (
    <div className="glass-card rounded-2xl p-5 border-cyan-400/20">
      <div className="flex items-center gap-2 mb-4">
        <Pickaxe className="h-5 w-5 text-cyan-400" />
        <h3 className="text-base font-semibold text-white">建设收益</h3>
        <span className="ml-auto text-xs text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-full">建筑加成</span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {effectItems.length > 0 ? effectItems.map((item) => (
          <div key={item.label} className={`rounded-xl border p-3 ${item.active ? 'bg-cyan-500/10 border-cyan-400/20' : 'bg-slate-900/40 border-white/10'}`}>
            <div className="text-[11px] text-slate-400 mb-1">{item.label}</div>
            <div className={`text-sm font-medium ${item.active ? 'text-cyan-200' : 'text-slate-500'}`}>{item.value}</div>
          </div>
        )) : (
          <div className="col-span-2 rounded-xl bg-slate-900/40 border border-white/10 p-4 text-sm text-slate-400">正在同步建筑效果...</div>
        )}
      </div>

      <button onClick={handleCollect} disabled={collecting} className="w-full py-2.5 rounded-xl bg-cyan-500/15 text-cyan-300 text-sm hover:bg-cyan-500/25 transition-colors disabled:opacity-50">
        {collecting ? '收取中...' : '收取建设收益'}
      </button>

      {result && (
        <div className={`mt-3 text-center text-sm ${result.collectedPoints > 0 ? 'text-amber-400 animate-bounce' : 'text-slate-400'}`}>
          {result.collectedPoints > 0
            ? `获得 ${result.collectedPoints} 积分，累计 ${result.daysAccumulated} 天收益`
            : '暂无可收取收益，指挥部 Lv2+ 每天产出积分'}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   宠物探险
   ═══════════════════════════════════════ */

function ExplorationCard() {
  const [missions, setMissions] = useState<any[]>([]);
  const [status, setStatus] = useState<any>({ state: 'idle' });
  const [reward, setReward] = useState<any>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => { loadExploration(); }, []);

  const loadExploration = async () => {
    try {
      const [statusRes, missionsRes] = await Promise.all([
        starpathExplorationAPI.getStatus(),
        starpathExplorationAPI.getMissions(),
      ]);
      if (statusRes.success && statusRes.data) setStatus(statusRes.data);
      if (missionsRes.success && missionsRes.data) setMissions(missionsRes.data as any[]);
    } catch { /* ignore */ }
  };

  const handleStart = async (mission: any) => {
    if (!mission.unlocked || actingId) return;
    setActingId(mission.id);
    setReward(null);
    try {
      const res = await starpathExplorationAPI.start(mission.id);
      if (res.success) loadExploration();
    } catch (e: any) {
      alert(e.error?.message || e.response?.data?.error?.message || '开始探险失败');
    } finally { setActingId(null); }
  };

  const handleClaim = async () => {
    if (actingId) return;
    setActingId('claim');
    try {
      const res = await starpathExplorationAPI.claim();
      if (res.success && res.data) {
        setReward(res.data);
        loadExploration();
      }
    } catch (e: any) {
      alert(e.error?.message || e.response?.data?.error?.message || '收取探险奖励失败');
    } finally { setActingId(null); }
  };

  const currentMission = status?.mission;

  return (
    <div className="glass-card rounded-2xl p-5 border-indigo-400/20">
      <div className="flex items-center gap-2 mb-4">
        <Rocket className="h-5 w-5 text-indigo-400" />
        <h3 className="text-base font-semibold text-white">星际探险</h3>
        <span className="ml-auto text-xs text-indigo-300 bg-indigo-500/15 px-2 py-0.5 rounded-full">宠物行动</span>
      </div>

      {status?.state === 'in_progress' && currentMission ? (
        <div className="rounded-xl bg-indigo-500/10 border border-indigo-400/20 p-4 text-center">
          <Clock className="h-6 w-6 text-indigo-300 mx-auto mb-2" />
          <div className="text-sm font-medium text-white mb-1">{currentMission.name}</div>
          <div className="text-xs text-slate-400">剩余约 {status.remainingMinutes} 分钟</div>
        </div>
      ) : status?.state === 'claimable' && currentMission ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-400/20 p-4 text-center">
          <div className="text-sm font-medium text-white mb-1">{currentMission.name}</div>
          <p className="text-xs text-slate-400 mb-3">探险完成，奖励等待收取</p>
          <button onClick={handleClaim} disabled={actingId === 'claim'} className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-300 text-sm hover:bg-amber-500/30 transition-colors disabled:opacity-50">
            {actingId === 'claim' ? '收取中...' : '收取探险奖励'}
          </button>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {missions.map((mission) => (
            <button
              key={mission.id}
              onClick={() => handleStart(mission)}
              disabled={!mission.unlocked || !!actingId}
              className={`w-full text-left rounded-xl border p-3 transition-all ${mission.unlocked ? 'bg-indigo-500/10 border-indigo-400/20 hover:border-indigo-300/40' : 'bg-slate-900/40 border-white/10 opacity-60 cursor-not-allowed'}`}
            >
              <div className="flex items-start justify-between gap-3 mb-1">
                <div className="text-sm font-medium text-white">{mission.name}</div>
                <span className="shrink-0 text-[11px] text-slate-400">{mission.duration}分钟</span>
              </div>
              <p className="text-xs text-slate-400 mb-2">{mission.description}</p>
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="text-amber-300">{mission.rewards.points[0]}-{mission.rewards.points[1]}积分</span>
                <span className="text-violet-300">宠物经验 +{mission.rewards.petExp}</span>
                {!mission.unlocked && <span className="text-slate-500">{mission.lockReason}</span>}
                {actingId === mission.id && <span className="text-indigo-300">出发中...</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {reward && (
        <div className="mt-3 rounded-xl bg-emerald-500/10 border border-emerald-400/20 p-3 text-sm text-emerald-300">
          <div className="font-medium mb-1">奖励已收取：总积分 +{reward.totalPoints}</div>
          <div className="text-xs text-slate-300">宠物经验 +{reward.petExp}{reward.bonusTriggered ? `，触发额外奖励 +${reward.bonusPoints}` : '，未触发额外奖励'}</div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════
   星域卡片
   ═══════════════════════════════════════ */

function getRegionStyle(color: string) {
  return {
    iconBg: `linear-gradient(135deg, ${color}33, ${color}1A)`,
    iconBorder: `${color}4D`,
    progressFrom: color,
    progressTo: adjustColorBrightness(color, 60),
  };
}

function adjustColorBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = Math.min(255, ((num >> 16) & 0xFF) + amount);
  const g = Math.min(255, ((num >> 8) & 0xFF) + amount);
  const b = Math.min(255, (num & 0xFF) + amount);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

function RegionCard({ region, index }: { region: StarMapRegion; index: number }) {
  const style = getRegionStyle(region.color);
  const progress = region.totalPlanets > 0 ? Math.round((region.exploredPlanets / region.totalPlanets) * 100) : 0;

  return (
    <Link
      to={`/starpath/region/${region.id}`}
      className="group glass-card glass-card-hover rounded-2xl p-6 transition-all duration-300 hover:shadow-lg"
      style={{ animationDelay: `${index * 0.08}s`, animationFillMode: 'both' }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: style.iconBg, border: `1px solid ${style.iconBorder}` }}>
          {region.icon}
        </div>
        <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-violet-400 transition-colors" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-1 group-hover:text-violet-300 transition-colors">{region.name}</h3>
      <p className="text-xs text-slate-400 mb-4 line-clamp-2">{region.description}</p>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">探索进度</span>
          <span className="text-slate-400">{region.exploredPlanets}/{region.totalPlanets}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: `linear-gradient(to right, ${style.progressFrom}, ${style.progressTo})` }} />
        </div>
      </div>
    </Link>
  );
}

/* ═══════════════════════════════════════
   主页面
   ═══════════════════════════════════════ */

export function StarPathPage() {
  const [mapData, setMapData] = useState<StarMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeEvents, setActiveEvents] = useState<SeasonEventData[]>([]);
  const [recommend, setRecommend] = useState<RecommendedPlanet | null>(null);
  const [collectCount, setCollectCount] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [mapRes, eventsRes, recommendRes] = await Promise.all([
        starpathAPI.getMap(),
        starpathStoryAPI.getEvents(),
        starpathAchievementAPI.getRecommend(),
      ]);
      if (mapRes.success && mapRes.data) setMapData(mapRes.data as StarMapData);
      if (eventsRes.success && eventsRes.data) setActiveEvents(eventsRes.data as SeasonEventData[]);
      if (recommendRes.success && recommendRes.data) setRecommend(recommendRes.data as RecommendedPlanet);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  const handleCollectStar = useCallback(async (type: string) => {
    setCollectCount(c => c + 1);
    try { await starpathFunAPI.collectStar(type); } catch { /* ignore */ }
  }, []);

  const stats = mapData?.stats ?? { totalPlanets: 0, exploredPlanets: 0, masteredPlanets: 0, streakDays: 0 };
  const regions = mapData?.regions ?? [];

  if (loading) {
    return (
      <div className="starfield-bg min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 text-violet-400 animate-spin" />
          <p className="text-slate-400 text-sm">正在加载星图...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="starfield-bg star-nebula relative min-h-screen -mt-8 -mx-6 md:-mx-8 lg:-mx-12 px-6 md:px-8 lg:px-12 pt-8 pb-12 overflow-hidden">
      <TwinklingStars count={80} />
      <ShootingStars />
      <FloatingStars onCollect={handleCollectStar} />

      {/* 动画样式 */}
      <style>{`
        @keyframes twinkle { 0%, 100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes shootingStar {
          0% { transform: translateX(0) rotate(30deg); opacity: 0; }
          5% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateX(120vw) rotate(30deg); opacity: 0; }
        }
        @keyframes floatWobble {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes starAppear {
          0% { transform: scale(0); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes popUpFade {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-30px); opacity: 0; }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px) rotate(-2deg); }
          75% { transform: translateX(5px) rotate(2deg); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>

      {/* 顶部统计栏 */}
      <div className="relative z-10 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <CoderAvatar size={48} animated mood="excited" />
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-1">
                编程<span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-cyan-400">星途</span>
              </h1>
              <p className="text-slate-400 text-sm">柯德带你探索知识的星辰大海 ✨</p>
            </div>
          </div>
          <button onClick={() => setChatOpen(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-500/15 border border-violet-400/25 text-violet-300 hover:bg-violet-500/25 hover:text-white transition-all">
            <MessageSquare className="h-4 w-4" />
            <span className="text-sm font-medium">AI向导</span>
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Globe className="h-4 w-4 text-cyan-400" /><span className="text-xs text-slate-400">已探索</span></div>
            <div className="text-xl font-bold text-white">{stats.exploredPlanets}<span className="text-sm text-slate-500 font-normal">/{stats.totalPlanets}</span></div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Trophy className="h-4 w-4 text-amber-400" /><span className="text-xs text-slate-400">已精通</span></div>
            <div className="text-xl font-bold text-amber-400">{stats.masteredPlanets}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Flame className="h-4 w-4 text-rose-400" /><span className="text-xs text-slate-400">连续天数</span></div>
            <div className="text-xl font-bold text-rose-400">{stats.streakDays}</div>
          </div>
          <div className="glass-card rounded-xl px-4 py-3 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-1"><Star className="h-4 w-4 text-yellow-400" /><span className="text-xs text-slate-400">收集星星</span></div>
            <div className="text-xl font-bold text-yellow-400">{collectCount}</div>
          </div>
        </div>
      </div>

      {/* 限时事件横幅 */}
      {activeEvents.length > 0 && (
        <div className="relative z-10 mb-6">
          {activeEvents.slice(0, 2).map((event) => (
            <Link key={event.id} to="/starpath/social" className="block mb-3 glass-card rounded-xl p-4 border-l-4 border-amber-400/60 hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-3">
                <Zap className="h-5 w-5 text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-amber-300">{event.name}</span>
                    {event.bonusMultiplier > 1 && <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-400/30">{event.bonusMultiplier}x积分</span>}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{event.description}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* AI推荐 */}
      {recommend && (
        <div className="relative z-10 mb-6">
          <Link to={`/starpath/planet/${recommend.planetId}`} className="block glass-card rounded-xl p-4 border-l-4 border-violet-400/60 hover:bg-white/[0.04] transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-violet-500/15 border border-violet-400/25 flex items-center justify-center shrink-0"><Sparkles className="h-5 w-5 text-violet-400" /></div>
              <div className="flex-1 min-w-0">
                <div className="text-xs text-violet-300 mb-0.5">AI推荐</div>
                <div className="text-sm font-medium text-white">{recommend.planetName}</div>
                <div className="text-xs text-slate-400">{recommend.reason}</div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500 shrink-0" />
            </div>
          </Link>
        </div>
      )}

      {/* 功能入口 */}
      <div className="relative z-10 grid grid-cols-4 gap-3 mb-8">
        <Link to="/starpath/building" className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group">
          <Building2 className="h-6 w-6 text-cyan-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">星球建设</span>
        </Link>
        <Link to="/starpath/social" className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group">
          <Users className="h-6 w-6 text-amber-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">星际社交</span>
        </Link>
        <Link to="/starpath/achievement" className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group">
          <Award className="h-6 w-6 text-rose-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">成就中心</span>
        </Link>
        <Link to="/starpath/craft" className="glass-card glass-card-hover rounded-xl p-4 text-center transition-all hover:shadow-lg group">
          <Pickaxe className="h-6 w-6 text-violet-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-xs text-slate-300 group-hover:text-white transition-colors">背包合成</span>
        </Link>
      </div>

      {/* 🎈 儿童节特别区域：宝箱 + 宠物 */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <DailyChest onOpen={loadData} />
        <SpacePet />
      </div>

      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-5 mb-8">
        <BuildingIncomeCard />
        <ExplorationCard />
      </div>

      {/* 星域卡片网格 */}
      <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {regions.map((region, idx) => (
          <RegionCard key={region.id} region={region} index={idx} />
        ))}
      </div>

      {/* 空状态 */}
      {regions.length === 0 && !loading && (
        <div className="relative z-10 text-center py-20">
          <div className="w-20 h-20 rounded-full bg-violet-500/10 border border-violet-400/20 flex items-center justify-center mx-auto mb-6">
            <Sparkles className="h-8 w-8 text-violet-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">星图正在生成中</h3>
          <p className="text-slate-400 text-sm mb-6">开始做题后，你的专属星图将逐渐展开</p>
          <Link to="/categories" className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white font-medium hover:opacity-90 transition-opacity">
            开始探索 <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <GuideChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
