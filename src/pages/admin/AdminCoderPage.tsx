import { useState, useEffect, useCallback } from 'react';
import { coderAPI } from '../../services/api';
import {
  Loader2, Save, Bot, Settings2, Zap, BarChart3, MessageSquare,
  Plus, Trash2, GripVertical, ToggleLeft, ToggleRight
} from 'lucide-react';

// ── 类型定义 ──

interface ConfigItem {
  key: string;
  value: string;
}

interface QuickAction {
  label: string;
  command: string;
  icon: string;
}

interface ProactiveRule {
  trigger_type: string;
  condition_value: number;
  message_template: string;
  enabled: boolean;
}

interface AdminStats {
  conversationsToday: number;
  conversationsWeek: number;
  conversationsMonth: number;
  activeUsers: number;
  messagesPerUser: number;
  topQuickActions: { action: string; count: number }[];
  personalityDistribution: Record<string, number>;
  modeDistribution: Record<string, number>;
}

// ── 配置分组定义 ──

const CONFIG_GROUPS = [
  {
    title: '身份设置',
    keys: ['coder_name', 'coder_allowed_topics'],
    type: 'text' as const,
  },
  {
    title: '问候语',
    keys: ['coder_greeting_mentor', 'coder_greeting_lively', 'coder_greeting_gentle'],
    type: 'textarea' as const,
  },
  {
    title: '主动提示',
    keys: ['coder_proactive_enabled', 'coder_proactive_idle_minutes', 'coder_proactive_consecutive_failures'],
    type: 'mixed' as const,
  },
  {
    title: '其他',
    keys: ['coder_max_history_per_user', 'coder_profile_update_interval'],
    type: 'number' as const,
  },
];

// 主动触发类型选项
const TRIGGER_TYPE_OPTIONS = [
  { value: 'idle_on_solve', label: '做题页面停留', description: '用户在做题页面停留X分钟' },
  { value: 'consecutive_failures', label: '连续提交失败', description: '连续X次提交错误' },
  { value: 'inactive_days', label: '长时间未访问', description: '用户X天未访问' },
  { value: 'streak_broken', label: '断签', description: '用户错过签到日' },
];

// 快捷操作模式
const QUICK_ACTION_MODES = [
  { key: 'coder_quick_actions_companion', label: '伴学模式' },
  { key: 'coder_quick_actions_assistant', label: '助手模式' },
  { key: 'coder_quick_actions_management', label: '管理模式' },
];

// ── Tab 定义 ──

const TABS = [
  { key: 'config', label: '基本配置', icon: Settings2 },
  { key: 'quick_actions', label: '快捷操作管理', icon: MessageSquare },
  { key: 'stats', label: '使用统计', icon: BarChart3 },
  { key: 'proactive', label: '主动触发规则', icon: Zap },
] as const;

type TabKey = typeof TABS[number]['key'];

// ── 主组件 ──

export function AdminCoderPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('config');

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Bot className="h-7 w-7 text-cyan-400" />
        <h1 className="text-2xl font-bold text-white">柯德配置</h1>
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 mb-6 bg-slate-800 p-1 rounded-lg w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'config' && <ConfigTab />}
      {activeTab === 'quick_actions' && <QuickActionsTab />}
      {activeTab === 'stats' && <StatsTab />}
      {activeTab === 'proactive' && <ProactiveTab />}
    </div>
  );
}

// ── Tab 1: 基本配置 ──

function ConfigTab() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await coderAPI.getAdminConfig();
      if (res.success && res.data) {
        setConfigs(res.data);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // 获取配置值
  const getConfigValue = (key: string): string => {
    return configs.find(c => c.key === key)?.value || '';
  };

  // 更新本地配置值
  const setConfigValue = (key: string, value: string) => {
    setConfigs(prev => {
      const existing = prev.find(c => c.key === key);
      if (existing) {
        return prev.map(c => c.key === key ? { ...c, value } : c);
      }
      return [...prev, { key, value }];
    });
  };

  // 保存所有配置
  const handleSaveAll = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      // 仅保存分组中定义的配置项
      const allKeys = CONFIG_GROUPS.flatMap(g => g.keys);
      const toSave = configs.filter(c => allKeys.includes(c.key));

      await Promise.all(
        toSave.map(c => coderAPI.updateAdminConfig(c.key, c.value))
      );
      setSaveMessage('保存成功');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  // 判断字段输入类型
  const getInputType = (groupType: string, key: string): 'text' | 'textarea' | 'number' | 'toggle' => {
    if (groupType === 'textarea') return 'textarea';
    if (groupType === 'number') return 'number';
    if (groupType === 'mixed') {
      if (key.includes('enabled')) return 'toggle';
      return 'number';
    }
    return 'text';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {CONFIG_GROUPS.map(group => (
        <div key={group.title} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{group.title}</h3>
          <div className="space-y-4">
            {group.keys.map(key => {
              const inputType = getInputType(group.type, key);
              const value = getConfigValue(key);
              const label = key.replace('coder_', '').split('_').join(' ');

              return (
                <div key={key} className="flex flex-col gap-1.5">
                  <label className="text-sm text-slate-300 font-medium">{key}</label>
                  <span className="text-xs text-slate-500">{label}</span>
                  {inputType === 'toggle' ? (
                    <button
                      onClick={() => setConfigValue(key, value === 'true' ? 'false' : 'true')}
                      className="flex items-center gap-2 w-fit"
                    >
                      {value === 'true' ? (
                        <ToggleRight className="h-6 w-6 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-500" />
                      )}
                      <span className={`text-sm ${value === 'true' ? 'text-cyan-400' : 'text-slate-500'}`}>
                        {value === 'true' ? '已启用' : '已禁用'}
                      </span>
                    </button>
                  ) : inputType === 'textarea' ? (
                    <textarea
                      value={value}
                      onChange={e => setConfigValue(key, e.target.value)}
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 resize-y"
                    />
                  ) : (
                    <input
                      type={inputType}
                      value={value}
                      onChange={e => setConfigValue(key, e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSaveAll}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存所有
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Tab 2: 快捷操作管理 ──

function QuickActionsTab() {
  const [configs, setConfigs] = useState<ConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  // 每个模式的快捷操作列表
  const [actionsByMode, setActionsByMode] = useState<Record<string, QuickAction[]>>({});

  const fetchConfigs = useCallback(async () => {
    try {
      const res = await coderAPI.getAdminConfig();
      if (res.success && res.data) {
        setConfigs(res.data);
        // 解析各模式的快捷操作
        const parsed: Record<string, QuickAction[]> = {};
        for (const mode of QUICK_ACTION_MODES) {
          const item = (res.data as ConfigItem[]).find(c => c.key === mode.key);
          try {
            parsed[mode.key] = item ? JSON.parse(item.value) : [];
          } catch {
            parsed[mode.key] = [];
          }
        }
        setActionsByMode(parsed);
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  // 添加操作项
  const addAction = (modeKey: string) => {
    setActionsByMode(prev => ({
      ...prev,
      [modeKey]: [...(prev[modeKey] || []), { label: '', command: '', icon: 'MessageSquare' }],
    }));
  };

  // 删除操作项
  const removeAction = (modeKey: string, index: number) => {
    setActionsByMode(prev => ({
      ...prev,
      [modeKey]: prev[modeKey].filter((_, i) => i !== index),
    }));
  };

  // 更新操作项字段
  const updateAction = (modeKey: string, index: number, field: keyof QuickAction, value: string) => {
    setActionsByMode(prev => ({
      ...prev,
      [modeKey]: prev[modeKey].map((a, i) => i === index ? { ...a, [field]: value } : a),
    }));
  };

  // 上移操作项
  const moveAction = (modeKey: string, index: number, direction: 'up' | 'down') => {
    setActionsByMode(prev => {
      const list = [...prev[modeKey]];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      [list[index], list[targetIdx]] = [list[targetIdx], list[index]];
      return { ...prev, [modeKey]: list };
    });
  };

  // 保存所有快捷操作
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      await Promise.all(
        QUICK_ACTION_MODES.map(mode =>
          coderAPI.updateAdminConfig(mode.key, JSON.stringify(actionsByMode[mode.key] || []))
        )
      );
      setSaveMessage('保存成功');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {QUICK_ACTION_MODES.map(mode => (
        <div key={mode.key} className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">{mode.label}</h3>
            <button
              onClick={() => addAction(mode.key)}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
            >
              <Plus className="h-3.5 w-3.5" />
              添加
            </button>
          </div>

          {(actionsByMode[mode.key] || []).length === 0 ? (
            <p className="text-slate-500 text-sm">暂无快捷操作</p>
          ) : (
            <div className="space-y-3">
              {(actionsByMode[mode.key] || []).map((action, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg">
                  {/* 拖拽手柄（用按钮实现排序） */}
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveAction(mode.key, idx, 'up')}
                      disabled={idx === 0}
                      className="text-slate-500 hover:text-white disabled:opacity-30 text-xs"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveAction(mode.key, idx, 'down')}
                      disabled={idx === (actionsByMode[mode.key] || []).length - 1}
                      className="text-slate-500 hover:text-white disabled:opacity-30 text-xs"
                    >
                      ▼
                    </button>
                  </div>

                  <GripVertical className="h-4 w-4 text-slate-600 shrink-0" />

                  {/* 标签 */}
                  <input
                    type="text"
                    value={action.label}
                    onChange={e => updateAction(mode.key, idx, 'label', e.target.value)}
                    placeholder="显示标签"
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />

                  {/* 命令 */}
                  <input
                    type="text"
                    value={action.command}
                    onChange={e => updateAction(mode.key, idx, 'command', e.target.value)}
                    placeholder="触发命令"
                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />

                  {/* 图标名 */}
                  <input
                    type="text"
                    value={action.icon}
                    onChange={e => updateAction(mode.key, idx, 'icon', e.target.value)}
                    placeholder="图标名"
                    className="w-32 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  />

                  {/* 删除 */}
                  <button
                    onClick={() => removeAction(mode.key, idx)}
                    className="text-slate-500 hover:text-red-400 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存所有
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Tab 3: 使用统计 ──

function StatsTab() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await coderAPI.getAdminStats();
        if (res.success && res.data) {
          setStats(res.data);
        }
      } catch {
        // 静默处理
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-slate-400">暂无统计数据</p>;
  }

  return (
    <div className="space-y-6">
      {/* 对话量统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="今日对话数" value={stats.conversationsToday} />
        <StatCard label="本周对话数" value={stats.conversationsWeek} />
        <StatCard label="本月对话数" value={stats.conversationsMonth} />
        <StatCard label="活跃用户数" value={stats.activeUsers} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard label="人均消息数" value={stats.messagesPerUser?.toFixed(1) || '0'} />
      </div>

      {/* 热门快捷操作 */}
      <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">热门快捷操作</h3>
        {(stats.topQuickActions || []).length === 0 ? (
          <p className="text-slate-500 text-sm">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {stats.topQuickActions.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                <span className="text-white text-sm">{item.action}</span>
                <span className="text-cyan-400 font-medium">{item.count} 次</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 性格分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">性格分布</h3>
          {Object.keys(stats.personalityDistribution || {}).length === 0 ? (
            <p className="text-slate-500 text-sm">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.personalityDistribution).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-white text-sm">{key}</span>
                  <span className="text-purple-400 font-medium">{count} 人</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 模式分布 */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">模式分布</h3>
          {Object.keys(stats.modeDistribution || {}).length === 0 ? (
            <p className="text-slate-500 text-sm">暂无数据</p>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.modeDistribution).map(([key, count]) => (
                <div key={key} className="flex items-center justify-between p-3 bg-slate-900/50 rounded-lg">
                  <span className="text-white text-sm">{key}</span>
                  <span className="text-green-400 font-medium">{count} 人</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 统计数据卡片
function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="bg-slate-800 rounded-xl border border-slate-700 p-5">
      <div className="text-sm text-slate-400 mb-1">{label}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
    </div>
  );
}

// ── Tab 4: 主动触发规则 ──

function ProactiveTab() {
  const [rules, setRules] = useState<ProactiveRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const fetchRules = useCallback(async () => {
    try {
      const res = await coderAPI.getAdminConfig();
      if (res.success && res.data) {
        const item = (res.data as ConfigItem[]).find(c => c.key === 'coder_proactive_rules');
        try {
          setRules(item ? JSON.parse(item.value) : []);
        } catch {
          setRules([]);
        }
      }
    } catch {
      // 静默处理
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // 添加规则
  const addRule = () => {
    setRules(prev => [
      ...prev,
      { trigger_type: 'idle_on_solve', condition_value: 5, message_template: '', enabled: true },
    ]);
  };

  // 删除规则
  const removeRule = (index: number) => {
    setRules(prev => prev.filter((_, i) => i !== index));
  };

  // 更新规则字段
  const updateRule = (index: number, field: keyof ProactiveRule, value: any) => {
    setRules(prev => prev.map((r, i) => i === index ? { ...r, [field]: value } : r));
  };

  // 保存规则
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');
    try {
      await coderAPI.updateAdminConfig('coder_proactive_rules', JSON.stringify(rules));
      setSaveMessage('保存成功');
      setTimeout(() => setSaveMessage(''), 3000);
    } catch {
      setSaveMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-slate-400 text-sm">定义柯德在不同场景下主动触发消息的规则</p>
        <button
          onClick={addRule}
          className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30"
        >
          <Plus className="h-3.5 w-3.5" />
          添加规则
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-slate-500 mb-4">暂无主动触发规则</p>
          <button
            onClick={addRule}
            className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 text-sm"
          >
            添加第一条规则
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {rules.map((rule, idx) => {
            const triggerInfo = TRIGGER_TYPE_OPTIONS.find(t => t.value === rule.trigger_type);
            return (
              <div key={idx} className="bg-slate-800 rounded-xl border border-slate-700 p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* 启用/禁用开关 */}
                    <button onClick={() => updateRule(idx, 'enabled', !rule.enabled)}>
                      {rule.enabled ? (
                        <ToggleRight className="h-6 w-6 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-slate-500" />
                      )}
                    </button>
                    <span className={`text-sm font-medium ${rule.enabled ? 'text-white' : 'text-slate-500'}`}>
                      {triggerInfo?.label || rule.trigger_type}
                    </span>
                  </div>
                  <button
                    onClick={() => removeRule(idx)}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 触发类型 */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">触发类型</label>
                    <select
                      value={rule.trigger_type}
                      onChange={e => updateRule(idx, 'trigger_type', e.target.value)}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    >
                      {TRIGGER_TYPE_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label} - {opt.description}</option>
                      ))}
                    </select>
                  </div>

                  {/* 条件值 */}
                  <div>
                    <label className="text-xs text-slate-400 mb-1 block">条件值</label>
                    <input
                      type="number"
                      value={rule.condition_value}
                      onChange={e => updateRule(idx, 'condition_value', Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* 消息模板 */}
                <div className="mt-4">
                  <label className="text-xs text-slate-400 mb-1 block">消息模板</label>
                  <textarea
                    value={rule.message_template}
                    onChange={e => updateRule(idx, 'message_template', e.target.value)}
                    rows={2}
                    placeholder="柯德将发送的主动消息内容，支持变量: {username}, {problem_title} 等"
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-cyan-500 resize-y"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 保存按钮 */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          保存规则
        </button>
        {saveMessage && (
          <span className={`text-sm ${saveMessage.includes('成功') ? 'text-green-400' : 'text-red-400'}`}>
            {saveMessage}
          </span>
        )}
      </div>
    </div>
  );
}
