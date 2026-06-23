import { useState, useEffect } from 'react';
import { paymentAPI, accessAPI, promotionAPI } from '../services/api';
import {
  CreditCard, Upload, CheckCircle2, Clock, XCircle, QrCode, ArrowLeft,
  Smartphone, Gift, Shield, MessageCircle, Users, Server,
  Crown, GraduationCap, ChevronDown, ChevronUp
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// ─── 类型定义 ───────────────────────────────────────────────────────────────────

interface PaymentMethod {
  method: string;
  label: string;
  icon: string;
  qrCodeUrl: string | null;
  channelEnabled: boolean;
  channelType: 'qr_code' | 'online';
}

type PricingTab = 'student' | 'teacher' | 'deploy';

interface FAQItem {
  question: string;
  answer: string;
}

interface PlanItem {
  id: string;
  name: string;
  priceDisplay: string;
  period: string;
  altPrice?: string | null;
  highlight: boolean;
  features: string[];
  color: string;
}

// ─── 静态兜底数据（仅在API未返回时使用） ──────────────────────────────────────────

const FALLBACK_STUDENT_PLANS: PlanItem[] = [
  { id: 'free', name: '免费版', priceDisplay: '¥0', period: '', highlight: false, color: 'cyan', features: ['3个知识树节点做题', '基础判题服务', '能力雷达（只读）', '社区浏览'] },
  { id: 'member', name: '会员', priceDisplay: '¥19.9', period: '/月', altPrice: '¥169/年', highlight: true, color: 'cyan', features: ['全量知识树无限做题', 'AI 提示 / AI 学伴 / AI 判题', '社区发帖与互动', '在线对战系统', '成就系统', '编程星途规划'] },
  { id: 'class', name: '班级会员', priceDisplay: '免费', period: '（跟随教师）', highlight: false, color: 'cyan', features: ['等同会员全部权益', '由教师开通，无需自行付费', '教师订阅失效则自动失效'] },
];

const FALLBACK_TEACHER_PLANS: PlanItem[] = [
  { id: 'entry', name: '入门版', priceDisplay: '¥998', period: '/年', highlight: false, color: 'cyan', features: ['30 学生名额', '3 个班级', 'AI 月额度 5 万 tokens', '基础数据看板', '在线作业批改'] },
  { id: 'standard', name: '标准版', priceDisplay: '¥2,998', period: '/年', highlight: true, color: 'cyan', features: ['100 学生名额', '10 个班级', 'AI 月额度 20 万 tokens', '完整数据看板', '学情分析报告', '自定义题目'] },
  { id: 'pro', name: '专业版', priceDisplay: '¥6,998', period: '/年', highlight: false, color: 'cyan', features: ['300 学生名额', '不限班级数量', 'AI 月额度 50 万 tokens', '定制考试系统', '高级学情分析', '优先技术支持'] },
  { id: 'enterprise', name: '企业/学校', priceDisplay: '面议', period: '', highlight: false, color: 'purple', features: ['不限学生名额', '私有部署可选', '定制开发服务', '专属技术支持', '数据迁移服务', 'SLA 保障'] },
];

const FALLBACK_DEPLOY_PLANS: PlanItem[] = [
  { id: 'basic-deploy', name: '基础部署', priceDisplay: '¥20,000', period: '+ ¥5,000/年维护', highlight: false, color: 'cyan', features: ['全功能系统部署', 'AI 功能需自备 API Key', '安装部署指导', '首年含基础维护'] },
  { id: 'enterprise-deploy', name: '企业部署', priceDisplay: '¥50,000+', period: '按需定制', highlight: true, color: 'cyan', features: ['全功能 + 定制开发', '专属技术支持', '数据迁移服务', 'AI 功能全集成', '持续运维保障'] },
  { id: 'community', name: '社区版', priceDisplay: '免费', period: '开源', highlight: false, color: 'cyan', features: ['核心做题判题功能', '无 AI 功能', '无高级分析', '社区支持'] },
];

const FALLBACK_FAQ_LIST: FAQItem[] = [
  { question: '班级会员何时失效？', answer: '班级会员的有效期跟随教师订阅。当教师订阅到期或取消时，其下所有班级会员将自动失效。教师续费后会自动恢复。' },
  { question: '能否中途升级套餐？', answer: '可以随时升级。升级时会按剩余天数折算差价，无需重复付费已使用的时间。' },
  { question: '学生名额用完了怎么办？', answer: '可以联系管理员升级到更高版本，也可以单独购买额外名额包。升级后已有数据完整保留。' },
  { question: '私有部署支持哪些环境？', answer: '支持 Linux 服务器部署（推荐 Ubuntu 20.04+），提供 Docker 一键部署方案。最低配置：4核8G内存，50G存储。' },
  { question: '推广码和优惠可以叠加吗？', answer: '推广码优惠与其他活动优惠不可叠加，以最优惠价格为准。推广码有有效期限制，请在有效期内使用。' },
];

// ─── 工具函数：将API返回的plan对象转为前端PlanItem ────────────────────────────────

function parsePlanFromAPI(plan: any): PlanItem {
  const features: string[] = (() => {
    try { return JSON.parse(plan.features || '[]'); } catch { return []; }
  })();
  return {
    id: plan.id,
    name: plan.name,
    priceDisplay: plan.priceDisplay || `¥${plan.price}`,
    period: plan.period || '',
    altPrice: plan.altPrice || null,
    highlight: plan.highlight ?? plan.isPopular ?? false,
    features,
    color: plan.color || 'cyan',
  };
}

// ─── 组件 ────────────────────────────────────────────────────────────────────────

export function PaymentPage() {
  const navigate = useNavigate();

  // ── 定价Tab ──
  const [activeTab, setActiveTab] = useState<PricingTab>('student');

  // ── FAQ 展开状态 ──
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  // ── 从API加载的分组方案数据 ──
  const [groupedPlans, setGroupedPlans] = useState<Record<string, PlanItem[]> | null>(null);
  const [faqList, setFaqList] = useState<FAQItem[]>(FALLBACK_FAQ_LIST);

  // ── 现有功能相关状态 ──
  const [paymentStatus, setPaymentStatus] = useState<any>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoMessage, setPromoMessage] = useState('');
  const [contactQrCode, setContactQrCode] = useState<string | null>(null);

  // ── 数据加载 ──
  useEffect(() => {
    Promise.all([
      fetchPaymentStatus(),
      fetchPaymentMethods(),
      fetchPaymentConfig(),
      fetchGroupedPlans(),
      fetchFaq(),
      fetchContactQr(),
    ]).finally(() => setLoading(false));
  }, []);

  const fetchPaymentStatus = async () => {
    try {
      const res = await paymentAPI.getAll();
      if (res.success) {
        const payments = res.data || [];
        if (payments.length > 0) {
          setPaymentStatus(payments[0]);
        }
      }
    } catch (error) {
      console.error('获取支付状态失败', error);
    }
  };

  const fetchPaymentMethods = async () => {
    try {
      const res = await paymentAPI.getMethods();
      if (res.success && res.data) {
        setMethods(res.data);
        if (res.data.length > 0 && !selectedMethod) {
          setSelectedMethod(res.data[0].method);
        }
      }
    } catch (error) {
      console.error('获取支付方式失败', error);
    }
  };

  const fetchPaymentConfig = async () => {
    try {
      const res = await accessAPI.getConfig();
      if (res.success && res.data) {
        const configs: Record<string, string> = {};
        for (const item of res.data) {
          configs[item.key] = item.value;
        }
        if (configs['payment_amount']) {
          setPaymentAmount(parseFloat(configs['payment_amount']));
        }
      }
    } catch (error) {
      console.error('获取支付配置失败', error);
    }
  };

  /** 从API获取按分类分组的活跃方案 */
  const fetchGroupedPlans = async () => {
    try {
      const res = await promotionAPI.getActivePlansGrouped();
      if (res.success && res.data) {
        const data = res.data as Record<string, any[]>;
        // 检查是否有任何分类包含数据
        const hasAnyPlans = Object.values(data).some(arr => arr.length > 0);
        if (hasAnyPlans) {
          const grouped: Record<string, PlanItem[]> = {};
          for (const [category, plans] of Object.entries(data)) {
            grouped[category] = plans.map(parsePlanFromAPI);
          }
          setGroupedPlans(grouped);
        }
      }
    } catch {
      // API失败时使用兜底数据，不报错
    }
  };

  /** 从API获取FAQ数据 */
  const fetchFaq = async () => {
    try {
      const res = await promotionAPI.getFaq();
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        setFaqList(res.data);
      }
    } catch {
      // API失败时使用兜底数据
    }
  };

  const fetchContactQr = async () => {
    try {
      const res = await paymentAPI.getContactQr();
      if (res.success && res.data?.url) {
        setContactQrCode(res.data.url);
      }
    } catch {}
  };

  // ── 文件上传与支付提交 ──
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!proofFile) {
      alert('请上传支付凭证');
      return;
    }
    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('proof', proofFile);
      formData.append('method', selectedMethod || 'QR_CODE');
      if (paymentAmount > 0) {
        formData.append('amount', String(paymentAmount));
      }
      const res = await paymentAPI.submit(formData);
      if (res.success) {
        alert('支付凭证已提交，请等待管理员审核');
        setProofFile(null);
        setProofPreview(null);
        fetchPaymentStatus();
      }
    } catch (error: any) {
      alert(error.error?.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // ── 辅助函数 ──
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return { icon: <CheckCircle2 className="h-5 w-5 text-green-400" />, label: '已通过', color: 'text-green-400' };
      case 'PENDING':
        return { icon: <Clock className="h-5 w-5 text-yellow-400" />, label: '审核中', color: 'text-yellow-400' };
      case 'REJECTED':
        return { icon: <XCircle className="h-5 w-5 text-red-400" />, label: '已拒绝', color: 'text-red-400' };
      default:
        return { icon: <Clock className="h-5 w-5 text-slate-400" />, label: status, color: 'text-slate-400' };
    }
  };

  const getMethodIcon = (icon: string) => {
    switch (icon) {
      case 'alipay':
        return <Smartphone className="h-5 w-5 text-blue-400" />;
      case 'wechat':
        return <Smartphone className="h-5 w-5 text-green-400" />;
      default:
        return <QrCode className="h-5 w-5 text-cyan-400" />;
    }
  };

  const currentMethod = methods.find(m => m.method === selectedMethod);

  // ── 获取当前tab对应的方案列表 ──
  const getPlansForTab = (tab: PricingTab): PlanItem[] => {
    if (groupedPlans) {
      return groupedPlans[tab] || [];
    }
    // 兜底数据
    switch (tab) {
      case 'student': return FALLBACK_STUDENT_PLANS;
      case 'teacher': return FALLBACK_TEACHER_PLANS;
      case 'deploy': return FALLBACK_DEPLOY_PLANS;
    }
  };

  // ── 加载态 ──
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  const currentPlans = getPlansForTab(activeTab);

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回
      </button>

      {/* ═══ Hero 区域 ═══ */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-white mb-4">选择适合您的方案</h1>
        <p className="text-lg text-slate-400 max-w-2xl mx-auto">
          无论您是学生、教师还是机构，我们都有适合您的解决方案
        </p>
      </div>

      {/* ═══ 定价方案区域：统一使用Tab分组展示 ═══ */}
      {groupedPlans && (
        <div className="mb-2 text-center">
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-400">
            <Shield className="h-4 w-4 text-cyan-400" />
            以下为平台配置的定价方案
          </span>
        </div>
      )}

      <div className="flex justify-center mb-10">
        <div className="inline-flex bg-slate-800 rounded-xl p-1.5 gap-1">
          <TabButton
            active={activeTab === 'student'}
            onClick={() => setActiveTab('student')}
            icon={<GraduationCap className="h-4 w-4" />}
            label="学生版"
          />
          <TabButton
            active={activeTab === 'teacher'}
            onClick={() => setActiveTab('teacher')}
            icon={<Users className="h-4 w-4" />}
            label="教师/机构版"
          />
          <TabButton
            active={activeTab === 'deploy'}
            onClick={() => setActiveTab('deploy')}
            icon={<Server className="h-4 w-4" />}
            label="私有部署"
          />
        </div>
      </div>

      <div className={`grid grid-cols-1 ${activeTab === 'teacher' ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'} gap-6 mb-12`}>
        {currentPlans.map(plan => (
          <PricingCard
            key={plan.id}
            name={plan.name}
            price={plan.priceDisplay}
            period={plan.period}
            altPrice={plan.altPrice || undefined}
            highlight={plan.highlight}
            features={plan.features}
            color={plan.color as 'cyan' | 'purple'}
          />
        ))}
        {currentPlans.length === 0 && (
          <div className="col-span-full text-center text-slate-400 py-12">
            暂无方案数据
          </div>
        )}
      </div>

      {/* ═══ FAQ 区域 ═══ */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-10">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-cyan-400" />
          常见问题
        </h2>
        <div className="space-y-2">
          {faqList.map((faq, idx) => (
            <div key={idx} className="border border-slate-700 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFAQ(expandedFAQ === idx ? null : idx)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-700/50 transition-colors"
              >
                <span className="text-slate-200 font-medium">{faq.question}</span>
                {expandedFAQ === idx
                  ? <ChevronUp className="h-4 w-4 text-slate-400 shrink-0" />
                  : <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                }
              </button>
              {expandedFAQ === idx && (
                <div className="px-5 pb-4 text-slate-400 text-sm leading-relaxed">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ═══ 底部 CTA：联系管理员 + 推广码 ═══ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {/* 联系管理员二维码 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-400" />
            联系管理员
          </h2>
          <div className="flex flex-col items-center text-center">
            {contactQrCode ? (
              <>
                <div className="inline-block p-3 bg-white rounded-xl">
                  <img src={contactQrCode} alt="管理员微信二维码" className="w-40 h-40 rounded-lg" />
                </div>
                <p className="text-slate-300 text-sm mt-4">扫码添加管理员微信，获取更多帮助</p>
              </>
            ) : (
              <div className="py-8">
                <QrCode className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                <p className="text-slate-400 text-sm">暂无二维码，请稍后再试</p>
              </div>
            )}
          </div>
        </div>

        {/* 推广码 */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Gift className="h-5 w-5 text-cyan-400" />
            推广码
          </h2>
          <p className="text-slate-400 text-sm mb-4">输入推广码可获取试用延长、积分或折扣优惠</p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              value={promoCode}
              onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMessage(''); }}
              placeholder="输入推广码"
              className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500 font-mono"
            />
            <button
              onClick={async () => {
                if (!promoCode.trim()) return;
                setPromoLoading(true);
                setPromoMessage('');
                try {
                  const res = await promotionAPI.useCode(promoCode.trim());
                  if (res.success) {
                    const type = res.data?.type;
                    const value = res.data?.value;
                    if (type === 'TRIAL_EXTEND') {
                      setPromoMessage(`✅ 试用已延长 ${value} 天！`);
                    } else if (type === 'POINTS') {
                      setPromoMessage(`✅ 已获得 ${value} 积分！`);
                    } else if (type === 'DISCOUNT') {
                      setPromoMessage(`✅ 已获得付费 ${value / 10} 折优惠！`);
                    } else {
                      setPromoMessage('✅ 推广码使用成功！');
                    }
                    fetchPaymentStatus();
                  }
                } catch (error: any) {
                  setPromoMessage(error.response?.data?.error?.message || '推广码使用失败');
                } finally {
                  setPromoLoading(false);
                }
              }}
              disabled={promoLoading || !promoCode.trim()}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors disabled:opacity-50 font-medium"
            >
              {promoLoading ? '使用中...' : '使用'}
            </button>
          </div>
          {promoMessage && (
            <p className={`mt-3 text-sm ${promoMessage.startsWith('✅') ? 'text-green-400' : 'text-red-400'}`}>
              {promoMessage}
            </p>
          )}
        </div>
      </div>

      {/* ═══ 立即购买区域：支付方式 + 凭证上传 ═══ */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <CreditCard className="h-6 w-6 text-cyan-400" />
          立即购买
        </h2>

        {/* 付费金额 */}
        {paymentAmount > 0 && (
          <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <p className="text-sm text-slate-400 mb-1">应付金额</p>
            <p className="text-3xl font-bold text-cyan-400">¥{paymentAmount}</p>
          </div>
        )}

        {/* 支付方式选择 */}
        {methods.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-medium text-white mb-4">选择支付方式</h3>
            <div className="flex gap-3 mb-6 flex-wrap">
              {methods.map(m => (
                <button
                  key={m.method}
                  onClick={() => setSelectedMethod(m.method)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-all ${
                    selectedMethod === m.method
                      ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                      : 'border-slate-600 bg-slate-700/50 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {getMethodIcon(m.icon)}
                  <span className="font-medium">{m.label}</span>
                  {m.channelEnabled && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-400">在线</span>
                  )}
                </button>
              ))}
            </div>

            {/* 支付二维码/在线支付 */}
            {currentMethod && (
              <div className="border-t border-slate-700 pt-4">
                {currentMethod.channelType === 'online' && currentMethod.channelEnabled ? (
                  <div className="text-center py-8">
                    <p className="text-slate-300 mb-4">
                      点击下方按钮将通过{currentMethod.label}在线支付
                    </p>
                    <button className="px-8 py-3 bg-cyan-500 hover:bg-cyan-600 text-white font-semibold rounded-lg transition-colors">
                      前往{currentMethod.label}支付
                    </button>
                  </div>
                ) : currentMethod.qrCodeUrl ? (
                  <div className="text-center">
                    <p className="text-slate-300 mb-4">
                      请使用{currentMethod.label}扫描下方二维码完成付款
                    </p>
                    <div className="inline-block p-4 bg-white rounded-xl">
                      <img src={currentMethod.qrCodeUrl} alt={`${currentMethod.label}二维码`} className="w-56 h-56 rounded-lg" />
                    </div>
                    <p className="text-slate-500 text-sm mt-3">
                      扫码支付后，请在下方上传支付凭证
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <QrCode className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <p className="text-slate-400">
                      暂无{currentMethod.label}二维码，请联系管理员获取支付信息
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {methods.length === 0 && (
          <div className="mb-6">
            <p className="text-slate-400">请联系管理员获取支付二维码，完成支付后上传凭证。</p>
          </div>
        )}

        {/* 支付状态 */}
        {paymentStatus && (
          <div className="mb-6 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
            <h3 className="text-base font-medium text-white mb-3">支付状态</h3>
            <div className="flex items-center gap-3">
              {getStatusDisplay(paymentStatus.status).icon}
              <span className={`font-medium ${getStatusDisplay(paymentStatus.status).color}`}>
                {getStatusDisplay(paymentStatus.status).label}
              </span>
            </div>
            {paymentStatus.rejectionReason && (
              <p className="text-red-400 text-sm mt-2">拒绝原因: {paymentStatus.rejectionReason}</p>
            )}
            {paymentStatus.createdAt && (
              <p className="text-slate-400 text-sm mt-2">
                提交时间: {new Date(paymentStatus.createdAt).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* 上传支付凭证 */}
        {(!paymentStatus || paymentStatus.status === 'REJECTED') && (
          <div>
            <h3 className="text-lg font-medium text-white mb-4">上传支付凭证</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">支付截图</label>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-cyan-500 transition-colors">
                  {proofPreview ? (
                    <div className="relative">
                      <img src={proofPreview} alt="凭证预览" className="max-h-48 mx-auto rounded-lg" />
                      <button
                        onClick={() => { setProofFile(null); setProofPreview(null); }}
                        className="absolute top-2 right-2 p-1 bg-slate-800 rounded-full text-slate-400 hover:text-white"
                      >
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-slate-400">点击上传支付截图</p>
                      <p className="text-slate-500 text-sm mt-1">支持 JPG、PNG 格式</p>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!proofFile || submitting}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
              >
                <CreditCard className="h-5 w-5" />
                {submitting ? '提交中...' : '提交支付凭证'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 子组件：Tab 按钮 ─────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon, label }: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20'
          : 'text-slate-400 hover:text-white hover:bg-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ─── 子组件：定价卡片 ─────────────────────────────────────────────────────────────

function PricingCard({ name, price, period, altPrice, highlight, features, color = 'cyan' }: {
  name: string;
  price: string;
  period?: string;
  altPrice?: string;
  highlight: boolean;
  features: string[];
  color?: 'cyan' | 'purple';
}) {
  // 根据颜色主题确定样式
  const borderColor = highlight
    ? color === 'purple' ? 'border-purple-500/60' : 'border-cyan-500/60'
    : 'border-slate-700';
  const bgGradient = highlight
    ? color === 'purple'
      ? 'bg-gradient-to-b from-purple-500/10 to-slate-800'
      : 'bg-gradient-to-b from-cyan-500/10 to-slate-800'
    : 'bg-slate-800';
  const ring = highlight
    ? color === 'purple' ? 'ring-1 ring-purple-500/30' : 'ring-1 ring-cyan-500/30'
    : '';
  const priceColor = color === 'purple' ? 'text-purple-400' : 'text-cyan-400';
  const badgeColor = color === 'purple'
    ? 'bg-purple-500/20 text-purple-300'
    : 'bg-cyan-500/20 text-cyan-300';
  const checkColor = color === 'purple' ? 'text-purple-400' : 'text-cyan-400';

  return (
    <div className={`relative rounded-xl border ${borderColor} ${bgGradient} ${ring} p-6 flex flex-col`}>
      {/* 推荐标签 */}
      {highlight && (
        <span className={`absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full ${badgeColor} px-3 py-1 text-xs font-semibold`}>
          <Crown className="h-3 w-3" />
          推荐
        </span>
      )}

      {/* 套餐名称 */}
      <h3 className="text-lg font-semibold text-white mt-1">{name}</h3>

      {/* 价格 */}
      <div className="mt-4 mb-1">
        <span className={`text-3xl font-bold ${priceColor}`}>{price}</span>
        {period && <span className="text-sm text-slate-400 ml-1">{period}</span>}
      </div>
      {altPrice && (
        <p className="text-sm text-slate-500 mb-4">或 {altPrice}</p>
      )}
      {!altPrice && <div className="mb-4" />}

      {/* 权益列表 */}
      <ul className="space-y-2.5 flex-1">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm text-slate-300">
            <CheckCircle2 className={`h-4 w-4 ${checkColor} mt-0.5 shrink-0`} />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
