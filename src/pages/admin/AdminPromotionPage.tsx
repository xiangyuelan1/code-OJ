import { useState, useEffect } from 'react';
import { promotionAPI } from '../../services/api';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy, BarChart3, Users, Gift, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface Promotion {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: string;
  value: number;
  maxUses: number;
  currentUses: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  usages: { id: string; userId: string; createdAt: string }[];
}

interface PromotionStats {
  total: number;
  active: number;
  totalUsages: number;
  recentUsages: {
    id: string;
    userId: string;
    createdAt: string;
    promotion: { code: string; name: string; type: string };
  }[];
}

const TYPE_LABELS: Record<string, string> = {
  TRIAL_EXTEND: '试用延期',
  POINTS: '积分赠送',
  DISCOUNT: '付费折扣',
};

const TYPE_COLORS: Record<string, string> = {
  TRIAL_EXTEND: 'text-blue-400 bg-blue-500/20',
  POINTS: 'text-yellow-400 bg-yellow-500/20',
  DISCOUNT: 'text-green-400 bg-green-500/20',
};

export function AdminPromotionPage() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [stats, setStats] = useState<PromotionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    type: 'TRIAL_EXTEND',
    value: 7,
    maxUses: 100,
    expiresAt: '',
    code: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [promoRes, statsRes] = await Promise.all([
        promotionAPI.getAll(),
        promotionAPI.getStats(),
      ]);
      if (promoRes.success) setPromotions(promoRes.data || []);
      if (statsRes.success) setStats(statsRes.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreate = async () => {
    if (!createForm.name.trim()) return;
    try {
      await promotionAPI.create({
        ...createForm,
        value: Number(createForm.value),
        maxUses: Number(createForm.maxUses),
        expiresAt: createForm.expiresAt || undefined,
        code: createForm.code || undefined,
      });
      setShowCreate(false);
      setCreateForm({ name: '', description: '', type: 'TRIAL_EXTEND', value: 7, maxUses: 100, expiresAt: '', code: '' });
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || '创建失败');
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await promotionAPI.toggle(id);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || '操作失败');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此推广码？')) return;
    try {
      await promotionAPI.delete(id);
      fetchData();
    } catch (error: any) {
      alert(error.response?.data?.error?.message || '删除失败');
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Tag className="h-7 w-7 text-cyan-400" />
          销售推广
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          创建推广码
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                <Tag className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">推广码总数</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">活跃推广码</p>
                <p className="text-2xl font-bold text-white">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">总使用次数</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsages}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-cyan-400" />
            推广码列表
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                <th className="px-6 py-3">推广码</th>
                <th className="px-6 py-3">名称</th>
                <th className="px-6 py-3">类型</th>
                <th className="px-6 py-3">值</th>
                <th className="px-6 py-3">使用量</th>
                <th className="px-6 py-3">过期时间</th>
                <th className="px-6 py-3">状态</th>
                <th className="px-6 py-3">操作</th>
              </tr>
            </thead>
            <tbody>
              {promotions.map(p => (
                <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <code className="px-2 py-1 bg-slate-700 rounded text-cyan-400 font-mono text-sm">{p.code}</code>
                      <button onClick={() => copyCode(p.code)} className="text-slate-400 hover:text-cyan-400">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-white">{p.name}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[p.type] || 'text-slate-400 bg-slate-700'}`}>
                      {TYPE_LABELS[p.type] || p.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {p.type === 'TRIAL_EXTEND' ? `${p.value}天` :
                     p.type === 'POINTS' ? `${p.value}积分` :
                     p.type === 'DISCOUNT' ? `${p.value}折` : p.value}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {p.currentUses}{p.maxUses > 0 ? `/${p.maxUses}` : ''}
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '永不过期'}
                  </td>
                  <td className="px-6 py-4">
                    {p.isActive ? (
                      <span className="flex items-center gap-1 text-green-400 text-sm">
                        <CheckCircle className="h-4 w-4" /> 启用
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-red-400 text-sm">
                        <XCircle className="h-4 w-4" /> 停用
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggle(p.id)}
                        className="text-slate-400 hover:text-cyan-400"
                        title={p.isActive ? '停用' : '启用'}
                      >
                        {p.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="text-slate-400 hover:text-red-400"
                        title="删除"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {promotions.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                    暂无推广码，点击上方按钮创建
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {stats && stats.recentUsages.length > 0 && (
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              最近使用记录
            </h2>
          </div>
          <div className="divide-y divide-slate-700/50">
            {stats.recentUsages.map(u => (
              <div key={u.id} className="px-6 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Gift className="h-4 w-4 text-cyan-400" />
                  <span className="text-white text-sm">
                    推广码 <code className="px-1 bg-slate-700 rounded text-cyan-400">{u.promotion.code}</code>
                    ({u.promotion.name}) 被使用
                  </span>
                </div>
                <span className="text-slate-400 text-xs">{new Date(u.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreate(false)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full border border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">创建推广码</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">名称 *</label>
                <input
                  value={createForm.name}
                  onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="如：新用户欢迎礼包"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">推广码（留空自动生成）</label>
                <input
                  value={createForm.code}
                  onChange={e => setCreateForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500"
                  placeholder="如：WELCOME2024"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">描述</label>
                <input
                  value={createForm.description}
                  onChange={e => setCreateForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  placeholder="推广码说明"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">类型</label>
                  <select
                    value={createForm.type}
                    onChange={e => setCreateForm(f => ({
                      ...f,
                      type: e.target.value,
                      value: e.target.value === 'TRIAL_EXTEND' ? 7 : e.target.value === 'POINTS' ? 100 : 80,
                    }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="TRIAL_EXTEND">试用延期</option>
                    <option value="POINTS">积分赠送</option>
                    <option value="DISCOUNT">付费折扣</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">
                    {createForm.type === 'TRIAL_EXTEND' ? '延期天数' :
                     createForm.type === 'POINTS' ? '赠送积分' : '折扣（如80=8折）'}
                  </label>
                  <input
                    type="number"
                    value={createForm.value}
                    onChange={e => setCreateForm(f => ({ ...f, value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-300 mb-1">最大使用次数（0=无限）</label>
                  <input
                    type="number"
                    value={createForm.maxUses}
                    onChange={e => setCreateForm(f => ({ ...f, maxUses: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-300 mb-1">过期时间（留空=永不过期）</label>
                  <input
                    type="date"
                    value={createForm.expiresAt}
                    onChange={e => setCreateForm(f => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleCreate}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
                >
                  创建
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
