import { useState, useEffect } from 'react';
import { promotionAPI } from '../../services/api';
import { Tag, Plus, Trash2, ToggleLeft, ToggleRight, Copy, BarChart3, Users, Gift, Clock, CheckCircle, XCircle, RefreshCw, DollarSign, TrendingUp, ShoppingCart, Star, Edit3 } from 'lucide-react';

type TabKey = 'pricing' | 'promotions' | 'financial';

const TYPE_LABELS: Record<string, string> = { TRIAL_EXTEND: '试用延期', POINTS: '积分赠送', DISCOUNT: '付费折扣' };
const TYPE_COLORS: Record<string, string> = { TRIAL_EXTEND: 'text-blue-400 bg-blue-500/20', POINTS: 'text-yellow-400 bg-yellow-500/20', DISCOUNT: 'text-green-400 bg-green-500/20' };
const UNIT_LABELS: Record<string, string> = { DAY: '天', MONTH: '月', YEAR: '年' };

export function AdminPromotionPage() {
  const [tab, setTab] = useState<TabKey>('pricing');
  const [loading, setLoading] = useState(true);

  // 推广码
  const [promotions, setPromotions] = useState<any[]>([]);
  const [promoStats, setPromoStats] = useState<any>(null);
  const [showCreatePromo, setShowCreatePromo] = useState(false);
  const [promoForm, setPromoForm] = useState({ name: '', description: '', type: 'TRIAL_EXTEND', value: 7, maxUses: 100, expiresAt: '', code: '' });

  // 定价计划
  const [plans, setPlans] = useState<any[]>([]);
  const [showCreatePlan, setShowCreatePlan] = useState(false);
  const [editPlanId, setEditPlanId] = useState<string | null>(null);
  const [planForm, setPlanForm] = useState({ name: '', price: 0, duration: 30, unit: 'DAY', features: [''], isPopular: false, sortOrder: 0 });

  // 财务统计
  const [financial, setFinancial] = useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (tab === 'pricing') {
        const res = await promotionAPI.getPlans();
        if (res.success) setPlans(res.data || []);
      } else if (tab === 'promotions') {
        const [promoRes, statsRes] = await Promise.all([promotionAPI.getAll(), promotionAPI.getStats()]);
        if (promoRes.success) setPromotions(promoRes.data || []);
        if (statsRes.success) setPromoStats(statsRes.data);
      } else {
        const res = await promotionAPI.getFinancial();
        if (res.success) setFinancial(res.data);
      }
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [tab]);

  const copyCode = (code: string) => navigator.clipboard.writeText(code);

  // ===== 定价计划 =====

  const handleSavePlan = async () => {
    if (!planForm.name.trim()) return;
    const features = planForm.features.filter(f => f.trim());
    try {
      if (editPlanId) {
        await promotionAPI.updatePlan(editPlanId, { ...planForm, features });
      } else {
        await promotionAPI.createPlan({ ...planForm, features });
      }
      setShowCreatePlan(false);
      setEditPlanId(null);
      setPlanForm({ name: '', price: 0, duration: 30, unit: 'DAY', features: [''], isPopular: false, sortOrder: 0 });
      fetchData();
    } catch (error: any) {
      alert(error.error?.message || '操作失败');
    }
  };

  const startEditPlan = (plan: any) => {
    const features = JSON.parse(plan.features || '[]');
    setPlanForm({ name: plan.name, price: plan.price, duration: plan.duration, unit: plan.unit, features: features.length > 0 ? features : [''], isPopular: plan.isPopular, sortOrder: plan.sortOrder });
    setEditPlanId(plan.id);
    setShowCreatePlan(true);
  };

  // ===== 推广码 =====

  const handleCreatePromo = async () => {
    if (!promoForm.name.trim()) return;
    try {
      await promotionAPI.create({ ...promoForm, value: Number(promoForm.value), maxUses: Number(promoForm.maxUses), expiresAt: promoForm.expiresAt || undefined, code: promoForm.code || undefined });
      setShowCreatePromo(false);
      setPromoForm({ name: '', description: '', type: 'TRIAL_EXTEND', value: 7, maxUses: 100, expiresAt: '', code: '' });
      fetchData();
    } catch (error: any) {
      alert(error.error?.message || '创建失败');
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 text-cyan-400 animate-spin" /></div>;
  }

  const tabs: { key: TabKey; label: string; icon: any }[] = [
    { key: 'pricing', label: '定价策略', icon: DollarSign },
    { key: 'promotions', label: '推广码', icon: Tag },
    { key: 'financial', label: '财务统计', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white flex items-center gap-2">
        <TrendingUp className="h-7 w-7 text-cyan-400" />
        销售推广
      </h1>

      <div className="flex gap-2 border-b border-slate-700 pb-0">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t.key ? 'text-cyan-400 border-cyan-400' : 'text-slate-400 border-transparent hover:text-white'}`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ===== 定价策略 ===== */}
      {tab === 'pricing' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => { setEditPlanId(null); setPlanForm({ name: '', price: 0, duration: 30, unit: 'DAY', features: [''], isPopular: false, sortOrder: 0 }); setShowCreatePlan(true); }} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
              <Plus className="h-4 w-4" /> 新增定价计划
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map(plan => {
              const features = JSON.parse(plan.features || '[]');
              return (
                <div key={plan.id} className={`bg-slate-800 rounded-xl p-6 border ${plan.isPopular ? 'border-cyan-500 ring-1 ring-cyan-500/30' : 'border-slate-700'} relative`}>
                  {plan.isPopular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-cyan-500 text-white text-xs font-bold rounded-full">推荐</div>}
                  {!plan.isActive && <div className="absolute top-3 right-3 px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded">已下架</div>}
                  <h3 className="text-xl font-bold text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1 mb-4">
                    <span className="text-3xl font-bold text-cyan-400">¥{plan.price}</span>
                    <span className="text-slate-400 text-sm">/{plan.duration}{UNIT_LABELS[plan.unit] || plan.unit}</span>
                  </div>
                  <ul className="space-y-2 mb-6">
                    {features.map((f: string, i: number) => (
                      <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> {f}
                      </li>
                    ))}
                    {features.length === 0 && <li className="text-sm text-slate-500">暂无功能描述</li>}
                  </ul>
                  <div className="flex gap-2">
                    <button onClick={() => startEditPlan(plan)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                      <Edit3 className="h-3.5 w-3.5" /> 编辑
                    </button>
                    <button onClick={async () => { await promotionAPI.togglePlan(plan.id); fetchData(); }} className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors">
                      {plan.isActive ? '下架' : '上架'}
                    </button>
                    <button onClick={async () => { if (!confirm('确定删除？')) return; await promotionAPI.deletePlan(plan.id); fetchData(); }} className="px-3 py-2 bg-slate-700 hover:bg-red-600/50 text-red-400 rounded-lg text-sm transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
            {plans.length === 0 && <div className="col-span-full text-center text-slate-400 py-12">暂无定价计划，点击右上角创建</div>}
          </div>
        </div>
      )}

      {/* ===== 推广码 ===== */}
      {tab === 'promotions' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button onClick={() => setShowCreatePromo(true)} className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">
              <Plus className="h-4 w-4" /> 创建推广码
            </button>
          </div>

          {promoStats && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center"><Tag className="h-5 w-5 text-cyan-400" /></div>
                <div><p className="text-slate-400 text-sm">推广码总数</p><p className="text-2xl font-bold text-white">{promoStats.total}</p></div>
              </div>
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center"><CheckCircle className="h-5 w-5 text-green-400" /></div>
                <div><p className="text-slate-400 text-sm">活跃推广码</p><p className="text-2xl font-bold text-white">{promoStats.active}</p></div>
              </div>
              <div className="bg-slate-800 rounded-xl p-5 border border-slate-700 flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-lg flex items-center justify-center"><Users className="h-5 w-5 text-yellow-400" /></div>
                <div><p className="text-slate-400 text-sm">总使用次数</p><p className="text-2xl font-bold text-white">{promoStats.totalUsages}</p></div>
              </div>
            </div>
          )}

          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="text-left text-slate-400 text-sm border-b border-slate-700">
                  <th className="px-6 py-3">推广码</th><th className="px-6 py-3">名称</th><th className="px-6 py-3">类型</th><th className="px-6 py-3">值</th><th className="px-6 py-3">使用量</th><th className="px-6 py-3">过期</th><th className="px-6 py-3">状态</th><th className="px-6 py-3">操作</th>
                </tr>
              </thead>
              <tbody>
                {promotions.map((p: any) => (
                  <tr key={p.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                    <td className="px-6 py-4"><div className="flex items-center gap-2"><code className="px-2 py-1 bg-slate-700 rounded text-cyan-400 font-mono text-sm">{p.code}</code><button onClick={() => copyCode(p.code)} className="text-slate-400 hover:text-cyan-400"><Copy className="h-4 w-4" /></button></div></td>
                    <td className="px-6 py-4 text-white">{p.name}</td>
                    <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-medium ${TYPE_COLORS[p.type] || 'text-slate-400 bg-slate-700'}`}>{TYPE_LABELS[p.type] || p.type}</span></td>
                    <td className="px-6 py-4 text-slate-300">{p.type === 'TRIAL_EXTEND' ? `${p.value}天` : p.type === 'POINTS' ? `${p.value}积分` : p.type === 'DISCOUNT' ? `${p.value / 10}折` : p.value}</td>
                    <td className="px-6 py-4 text-slate-300">{p.currentUses}{p.maxUses > 0 ? `/${p.maxUses}` : ''}</td>
                    <td className="px-6 py-4 text-slate-300">{p.expiresAt ? new Date(p.expiresAt).toLocaleDateString() : '永不过期'}</td>
                    <td className="px-6 py-4">{p.isActive ? <span className="flex items-center gap-1 text-green-400 text-sm"><CheckCircle className="h-4 w-4" />启用</span> : <span className="flex items-center gap-1 text-red-400 text-sm"><XCircle className="h-4 w-4" />停用</span>}</td>
                    <td className="px-6 py-4"><div className="flex items-center gap-2">
                      <button onClick={async () => { await promotionAPI.toggle(p.id); fetchData(); }} className="text-slate-400 hover:text-cyan-400">{p.isActive ? <ToggleRight className="h-5 w-5" /> : <ToggleLeft className="h-5 w-5" />}</button>
                      <button onClick={async () => { if (!confirm('确定删除？')) return; await promotionAPI.delete(p.id); fetchData(); }} className="text-slate-400 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                    </div></td>
                  </tr>
                ))}
                {promotions.length === 0 && <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-400">暂无推广码</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== 财务统计 ===== */}
      {tab === 'financial' && financial && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} color="cyan" label="总收入" value={`¥${financial.totalRevenue}`} />
            <StatCard icon={TrendingUp} color="green" label="本月收入" value={`¥${financial.thisMonthRevenue}`} sub={financial.revenueGrowth !== 0 ? `${financial.revenueGrowth > 0 ? '+' : ''}${financial.revenueGrowth}%` : undefined} />
            <StatCard icon={ShoppingCart} color="yellow" label="总订单" value={financial.totalOrders} sub={`本月 ${financial.thisMonthOrders}`} />
            <StatCard icon={Users} color="purple" label="付费用户" value={financial.paidUsers} sub={`转化率 ${financial.conversionRate}%`} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">月度收入趋势</h3>
              <div className="space-y-3">
                {financial.monthlyRevenue.map((m: any) => (
                  <div key={m.month} className="flex items-center gap-3">
                    <span className="text-slate-400 text-sm w-10">{m.month}</span>
                    <div className="flex-1 bg-slate-700 rounded-full h-6 overflow-hidden">
                      <div className="bg-cyan-500 h-full rounded-full flex items-center justify-end pr-2 transition-all" style={{ width: `${Math.max(Math.min(m.revenue / Math.max(...financial.monthlyRevenue.map((r: any) => r.revenue || 1)) * 100, 100), 5)}%` }}>
                        <span className="text-xs text-white font-medium">¥{m.revenue}</span>
                      </div>
                    </div>
                    <span className="text-slate-400 text-xs w-16 text-right">{m.orders}单</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4">定价计划销量</h3>
              <div className="space-y-3">
                {financial.planSales.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                    <div><p className="text-white font-medium">{p.name}</p><p className="text-slate-400 text-sm">¥{p.price}</p></div>
                    <div className="text-right"><p className="text-cyan-400 font-bold text-lg">{p.sales}</p><p className="text-slate-400 text-xs">已售</p></div>
                  </div>
                ))}
                {financial.planSales.length === 0 && <p className="text-slate-400 text-center py-8">暂无销售数据</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={Clock} color="orange" label="待审核支付" value={financial.pendingPayments} />
            <StatCard icon={DollarSign} color="cyan" label="上月收入" value={`¥${financial.lastMonthRevenue}`} />
            <StatCard icon={Users} color="blue" label="总用户" value={financial.totalUsers} />
            <StatCard icon={Users} color="green" label="本月新用户" value={financial.thisMonthNewUsers} />
          </div>
        </div>
      )}

      {tab === 'financial' && !financial && <div className="text-center text-slate-400 py-12">加载中...</div>}

      {/* ===== 创建定价计划弹窗 ===== */}
      {showCreatePlan && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowCreatePlan(false); setEditPlanId(null); }}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full border border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">{editPlanId ? '编辑定价计划' : '新增定价计划'}</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-300 mb-1">名称 *</label><input value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" placeholder="如：月度会员" /></div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm text-slate-300 mb-1">价格 (¥)</label><input type="number" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
                <div><label className="block text-sm text-slate-300 mb-1">时长</label><input type="number" value={planForm.duration} onChange={e => setPlanForm(f => ({ ...f, duration: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
                <div><label className="block text-sm text-slate-300 mb-1">单位</label><select value={planForm.unit} onChange={e => setPlanForm(f => ({ ...f, unit: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"><option value="DAY">天</option><option value="MONTH">月</option><option value="YEAR">年</option></select></div>
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">功能特性</label>
                {planForm.features.map((f, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input value={f} onChange={e => { const nf = [...planForm.features]; nf[i] = e.target.value; setPlanForm(p => ({ ...p, features: nf })); }} className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500" placeholder="如：无限刷题" />
                    <button onClick={() => { const nf = planForm.features.filter((_, j) => j !== i); setPlanForm(p => ({ ...p, features: nf.length > 0 ? nf : [''] })); }} className="text-red-400 hover:text-red-300"><XCircle className="h-5 w-5" /></button>
                  </div>
                ))}
                <button onClick={() => setPlanForm(p => ({ ...p, features: [...p.features, ''] }))} className="text-cyan-400 text-sm hover:text-cyan-300">+ 添加特性</button>
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={planForm.isPopular} onChange={e => setPlanForm(f => ({ ...f, isPopular: e.target.checked }))} className="rounded" /><Star className="h-4 w-4 text-yellow-400" /><span className="text-slate-300 text-sm">标记为推荐</span></label>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCreatePlan(false); setEditPlanId(null); }} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                <button onClick={handleSavePlan} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">{editPlanId ? '保存' : '创建'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== 创建推广码弹窗 ===== */}
      {showCreatePromo && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowCreatePromo(false)}>
          <div className="bg-slate-800 rounded-xl p-6 max-w-lg w-full border border-slate-700" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">创建推广码</h3>
            <div className="space-y-4">
              <div><label className="block text-sm text-slate-300 mb-1">名称 *</label><input value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" placeholder="如：新用户欢迎礼包" /></div>
              <div><label className="block text-sm text-slate-300 mb-1">推广码（留空自动生成）</label><input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-500" placeholder="如：WELCOME2024" /></div>
              <div><label className="block text-sm text-slate-300 mb-1">描述</label><input value={promoForm.description} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-slate-300 mb-1">类型</label><select value={promoForm.type} onChange={e => setPromoForm(f => ({ ...f, type: e.target.value, value: e.target.value === 'TRIAL_EXTEND' ? 7 : e.target.value === 'POINTS' ? 100 : 80 }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500"><option value="TRIAL_EXTEND">试用延期</option><option value="POINTS">积分赠送</option><option value="DISCOUNT">付费折扣</option></select></div>
                <div><label className="block text-sm text-slate-300 mb-1">{promoForm.type === 'TRIAL_EXTEND' ? '延期天数' : promoForm.type === 'POINTS' ? '赠送积分' : '折扣(80=8折)'}</label><input type="number" value={promoForm.value} onChange={e => setPromoForm(f => ({ ...f, value: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm text-slate-300 mb-1">最大使用次数(0=无限)</label><input type="number" value={promoForm.maxUses} onChange={e => setPromoForm(f => ({ ...f, maxUses: Number(e.target.value) }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
                <div><label className="block text-sm text-slate-300 mb-1">过期时间(留空=永不过期)</label><input type="date" value={promoForm.expiresAt} onChange={e => setPromoForm(f => ({ ...f, expiresAt: e.target.value }))} className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-cyan-500" /></div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreatePromo(false)} className="px-4 py-2 text-slate-400 hover:text-white">取消</button>
                <button onClick={handleCreatePromo} className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg">创建</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value, sub }: { icon: any; color: string; label: string; value: string | number; sub?: string }) {
  const colorMap: Record<string, string> = { cyan: 'bg-cyan-500/20 text-cyan-400', green: 'bg-green-500/20 text-green-400', yellow: 'bg-yellow-500/20 text-yellow-400', purple: 'bg-purple-500/20 text-purple-400', orange: 'bg-orange-500/20 text-orange-400', blue: 'bg-blue-500/20 text-blue-400' };
  return (
    <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.cyan}`}><Icon className="h-5 w-5" /></div>
        <div>
          <p className="text-slate-400 text-sm">{label}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {sub && <p className="text-xs text-slate-400">{sub}</p>}
        </div>
      </div>
    </div>
  );
}
