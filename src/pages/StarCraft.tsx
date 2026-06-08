import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { starpathCraftAPI } from '../services/api';
import { ArrowLeft, Package, FlaskConical, Loader2, CheckCircle2 } from 'lucide-react';

/* ═══════════════════════════════════════
   稀有度颜色映射
   ═══════════════════════════════════════ */

const RARITY_COLORS: Record<string, { text: string; bg: string; border: string; glow: string }> = {
  LEGENDARY: { text: 'text-amber-300', bg: 'bg-amber-900/30', border: 'border-amber-500/50', glow: 'shadow-amber-500/20' },
  EPIC: { text: 'text-purple-300', bg: 'bg-purple-900/30', border: 'border-purple-500/50', glow: 'shadow-purple-500/20' },
  RARE: { text: 'text-blue-300', bg: 'bg-blue-900/30', border: 'border-blue-500/50', glow: 'shadow-blue-500/20' },
  UNCOMMON: { text: 'text-green-300', bg: 'bg-green-900/30', border: 'border-green-500/50', glow: 'shadow-green-500/20' },
  COMMON: { text: 'text-slate-300', bg: 'bg-slate-800/50', border: 'border-slate-600/50', glow: '' },
};

const RARITY_NAMES: Record<string, string> = {
  LEGENDARY: '传说',
  EPIC: '史诗',
  RARE: '稀有',
  UNCOMMON: '优秀',
  COMMON: '普通',
};

/* ═══════════════════════════════════════
   主页面组件
   ═══════════════════════════════════════ */

export function StarCraftPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'craft'>('inventory');
  const [inventory, setInventory] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [crafting, setCrafting] = useState<string | null>(null);
  const [craftResult, setCraftResult] = useState<any>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, recRes] = await Promise.all([
        starpathCraftAPI.getInventory(),
        starpathCraftAPI.getRecipes(),
      ]);
      if (invRes.data) setInventory(invRes.data);
      if (recRes.data) setRecipes(recRes.data);
    } catch (error) {
      console.error('加载材料合成数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCraft = async (recipeId: string) => {
    setCrafting(recipeId);
    setCraftResult(null);
    try {
      const res = await starpathCraftAPI.craft(recipeId);
      if (res.data) {
        setCraftResult(res.data);
        // 刷新数据
        await loadData();
      }
    } catch (error: any) {
      alert(error.error?.message || '合成失败');
    } finally {
      setCrafting(null);
    }
  };

  // 按稀有度分组材料
  const groupedInventory = inventory.reduce<Record<string, any[]>>((acc, item) => {
    const key = item.rarity;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const rarityOrder = ['LEGENDARY', 'EPIC', 'RARE', 'UNCOMMON', 'COMMON'];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 px-4 py-6">
      {/* 顶部导航 */}
      <div className="max-w-4xl mx-auto mb-6">
        <Link to="/starpath" className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">返回星途</span>
        </Link>
        <h1 className="text-2xl font-bold text-white">🔮 背包与合成</h1>
        <p className="text-sm text-slate-400 mt-1">收集做题掉落的材料，合成强力道具</p>
      </div>

      {/* Tab 切换 */}
      <div className="max-w-4xl mx-auto mb-6">
        <div className="flex gap-2 bg-slate-800/50 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'inventory'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Package className="h-4 w-4" />
            背包
          </button>
          <button
            onClick={() => setActiveTab('craft')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === 'craft'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <FlaskConical className="h-4 w-4" />
            合成台
          </button>
        </div>
      </div>

      {/* 内容区域 */}
      <div className="max-w-4xl mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          </div>
        ) : activeTab === 'inventory' ? (
          <InventoryPanel groupedInventory={groupedInventory} rarityOrder={rarityOrder} />
        ) : (
          <CraftPanel
            recipes={recipes}
            crafting={crafting}
            craftResult={craftResult}
            onCraft={handleCraft}
            onDismissResult={() => setCraftResult(null)}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   背包面板
   ═══════════════════════════════════════ */

function InventoryPanel({ groupedInventory, rarityOrder }: { groupedInventory: Record<string, any[]>; rarityOrder: string[] }) {
  const isEmpty = Object.keys(groupedInventory).length === 0;

  if (isEmpty) {
    return (
      <div className="text-center py-16">
        <Package className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">背包空空如也</p>
        <p className="text-slate-500 text-sm mt-2">去做题获取材料吧！答对题目即可掉落材料</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {rarityOrder.map((rarity) => {
        const items = groupedInventory[rarity];
        if (!items || items.length === 0) return null;
        const colors = RARITY_COLORS[rarity] || RARITY_COLORS.COMMON;

        return (
          <div key={rarity}>
            <h3 className={`text-sm font-semibold mb-3 ${colors.text}`}>
              {RARITY_NAMES[rarity] || rarity}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map((item: any) => (
                <div
                  key={item.id}
                  className={`rounded-xl p-3 border ${colors.bg} ${colors.border} ${colors.glow} shadow-lg transition-transform hover:scale-105`}
                >
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-sm font-medium text-white truncate">{item.name}</div>
                  <div className="text-xs text-slate-400 truncate mt-0.5">{item.description}</div>
                  <div className={`text-xs font-bold mt-1 ${colors.text}`}>×{item.quantity}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   合成台面板
   ═══════════════════════════════════════ */

function CraftPanel({
  recipes,
  crafting,
  craftResult,
  onCraft,
  onDismissResult,
}: {
  recipes: any[];
  crafting: string | null;
  craftResult: any;
  onCraft: (id: string) => void;
  onDismissResult: () => void;
}) {
  if (recipes.length === 0) {
    return (
      <div className="text-center py-16">
        <FlaskConical className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-400 text-lg">暂无可用配方</p>
        <p className="text-slate-500 text-sm mt-2">提升等级解锁更多合成配方</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 合成成功提示 */}
      {craftResult && (
        <div className="bg-emerald-900/40 border border-emerald-500/50 rounded-xl p-4 flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-medium text-emerald-300">合成成功！</div>
            <div className="text-xs text-emerald-400/80">
              {craftResult.recipeName} — {craftResult.resultEffect?.description || craftResult.resultType}
            </div>
          </div>
          <button onClick={onDismissResult} className="text-xs text-slate-400 hover:text-white">
            关闭
          </button>
        </div>
      )}

      {recipes.map((recipe: any) => {
        const isCrafting = crafting === recipe.id;
        return (
          <div
            key={recipe.id}
            className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-indigo-500/30 transition-colors"
          >
            {/* 配方标题 */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-base font-semibold text-white">{recipe.name}</h4>
                <p className="text-xs text-slate-400 mt-0.5">{recipe.description}</p>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                {getResultTypeLabel(recipe.resultType)}
              </span>
            </div>

            {/* 所需材料 */}
            <div className="flex flex-wrap gap-2 mb-3">
              {recipe.materials.map((mat: any, idx: number) => {
                const enough = mat.owned >= mat.required;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs border ${
                      enough
                        ? 'bg-slate-700/50 border-slate-600/50 text-slate-200'
                        : 'bg-red-900/20 border-red-700/40 text-red-300'
                    }`}
                  >
                    <span>{mat.icon}</span>
                    <span>{mat.name}</span>
                    <span className={enough ? 'text-green-400' : 'text-red-400'}>
                      {mat.owned}/{mat.required}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 效果说明 + 合成按钮 */}
            <div className="flex items-center justify-between">
              <div className="text-xs text-indigo-300">
                ✨ {recipe.resultEffect?.description || '获得合成奖励'}
              </div>
              <button
                onClick={() => onCraft(recipe.id)}
                disabled={!recipe.canCraft || !!isCrafting}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  recipe.canCraft
                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md hover:shadow-lg'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isCrafting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  '合成'
                )}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════
   工具函数
   ═══════════════════════════════════════ */

function getResultTypeLabel(type: string): string {
  switch (type) {
    case 'BUILDING_UPGRADE': return '建筑升级';
    case 'CONSUMABLE': return '消耗品';
    case 'EQUIPMENT': return '装备';
    case 'DECORATION': return '装饰';
    default: return type;
  }
}
