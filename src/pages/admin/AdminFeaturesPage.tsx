import { useState, useEffect, useCallback } from 'react';
import { featureAPI } from '../../services/api';
import { Loader2, RefreshCw, ChevronUp, ChevronDown } from 'lucide-react';

interface FeatureItem {
  id: string;
  featureKey: string;
  featureName: string;
  description: string;
  category: string;
  enabled: boolean;
  visible: boolean;
  order: number;
}

const CATEGORY_LABELS: Record<string, { label: string; color: string }> = {
  core: { label: '核心功能', color: 'cyan' },
  learning: { label: '学习模块', color: 'purple' },
  ai: { label: 'AI功能', color: 'green' },
};

export function AdminFeaturesPage() {
  const [features, setFeatures] = useState<FeatureItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  const fetchFeatures = useCallback(async () => {
    try {
      const res = await featureAPI.getAll();
      if (res.success && res.data) {
        setFeatures(res.data);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await featureAPI.initialize();
      await fetchFeatures();
    } catch {
      // 静默处理
    } finally {
      setInitializing(false);
    }
  };

  const handleToggle = async (featureKey: string, field: 'enabled' | 'visible', value: boolean) => {
    try {
      await featureAPI.update(featureKey, { [field]: value });
      setFeatures(prev =>
        prev.map(f => f.featureKey === featureKey ? { ...f, [field]: value } : f),
      );
    } catch {
      // 静默处理
    }
  };

  const handleMoveOrder = async (featureKey: string, direction: 'up' | 'down') => {
    const sorted = [...features].sort((a, b) => {
      if (a.category !== b.category) return a.category.localeCompare(b.category);
      return a.order - b.order;
    });
    const idx = sorted.findIndex(f => f.featureKey === featureKey);
    if (idx < 0) return;

    const sameCategory = sorted.filter(f => f.category === sorted[idx].category);
    const catIdx = sameCategory.findIndex(f => f.featureKey === featureKey);

    if (direction === 'up' && catIdx <= 0) return;
    if (direction === 'down' && catIdx >= sameCategory.length - 1) return;

    const swapWith = direction === 'up' ? sameCategory[catIdx - 1] : sameCategory[catIdx + 1];
    if (!swapWith) return;

    try {
      await Promise.all([
        featureAPI.update(featureKey, { order: swapWith.order }),
        featureAPI.update(swapWith.featureKey, { order: sorted[idx].order }),
      ]);
      await fetchFeatures();
    } catch {
      // 静默处理
    }
  };

  const groupedFeatures = features.reduce<Record<string, FeatureItem[]>>((acc, f) => {
    const cat = f.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(f);
    return acc;
  }, {});

  const categoryOrder = ['core', 'learning', 'ai', 'general'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">功能开关管理</h1>
        <button
          onClick={handleInitialize}
          disabled={initializing}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 disabled:opacity-50"
        >
          {initializing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          初始化默认功能
        </button>
      </div>

      {features.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-slate-400 mb-4">尚未初始化功能配置</p>
          <button
            onClick={handleInitialize}
            className="px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
          >
            初始化默认功能
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {categoryOrder.map(category => {
            const items = groupedFeatures[category];
            if (!items || items.length === 0) return null;

            const catInfo = CATEGORY_LABELS[category] || { label: category, color: 'slate' };
            const colorClass: Record<string, string> = {
              cyan: 'border-cyan-500/30 bg-cyan-500/5',
              purple: 'border-purple-500/30 bg-purple-500/5',
              green: 'border-green-500/30 bg-green-500/5',
              slate: 'border-slate-500/30 bg-slate-500/5',
            };

            return (
              <div key={category} className={`rounded-xl border p-4 ${colorClass[catInfo.color] || colorClass.slate}`}>
                <h2 className="text-lg font-semibold text-white mb-4">{catInfo.label}</h2>
                <div className="space-y-2">
                  {items
                    .sort((a, b) => a.order - b.order)
                    .map(feature => (
                      <div
                        key={feature.id}
                        className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-white">{feature.featureName}</div>
                            <div className="text-xs text-slate-400 truncate">{feature.description}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 shrink-0">
                          {/* 排序按钮 */}
                          <div className="flex flex-col">
                            <button
                              onClick={() => handleMoveOrder(feature.featureKey, 'up')}
                              className="p-0.5 text-slate-500 hover:text-white"
                            >
                              <ChevronUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleMoveOrder(feature.featureKey, 'down')}
                              className="p-0.5 text-slate-500 hover:text-white"
                            >
                              <ChevronDown className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          {/* 启用开关 */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">启用</span>
                            <button
                              onClick={() => handleToggle(feature.featureKey, 'enabled', !feature.enabled)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                feature.enabled ? 'bg-cyan-500' : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  feature.enabled ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>

                          {/* 可见开关 */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">可见</span>
                            <button
                              onClick={() => handleToggle(feature.featureKey, 'visible', !feature.visible)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                                feature.visible ? 'bg-green-500' : 'bg-slate-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                                  feature.visible ? 'translate-x-4.5' : 'translate-x-0.5'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            );
          })}

          {/* 未分类的功能 */}
          {Object.keys(groupedFeatures)
            .filter(c => !categoryOrder.includes(c))
            .map(category => {
              const items = groupedFeatures[category];
              if (!items || items.length === 0) return null;
              return (
                <div key={category} className="rounded-xl border border-slate-500/30 bg-slate-500/5 p-4">
                  <h2 className="text-lg font-semibold text-white mb-4">{category}</h2>
                  <div className="space-y-2">
                    {items.sort((a, b) => a.order - b.order).map(feature => (
                      <div key={feature.id} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                        <div>
                          <div className="text-sm font-medium text-white">{feature.featureName}</div>
                          <div className="text-xs text-slate-400">{feature.description}</div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">启用</span>
                            <button
                              onClick={() => handleToggle(feature.featureKey, 'enabled', !feature.enabled)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${feature.enabled ? 'bg-cyan-500' : 'bg-slate-600'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${feature.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-400">可见</span>
                            <button
                              onClick={() => handleToggle(feature.featureKey, 'visible', !feature.visible)}
                              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${feature.visible ? 'bg-green-500' : 'bg-slate-600'}`}
                            >
                              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${feature.visible ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
