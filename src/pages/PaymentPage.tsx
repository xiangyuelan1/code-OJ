import { useState, useEffect } from 'react';
import { paymentAPI, accessAPI, promotionAPI } from '../services/api';
import { CreditCard, Upload, CheckCircle2, Clock, XCircle, QrCode, ArrowLeft, Smartphone, Gift, Star, Zap, Shield, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaymentMethod {
  method: string;
  label: string;
  icon: string;
  qrCodeUrl: string | null;
  channelEnabled: boolean;
  channelType: 'qr_code' | 'online';
}

export function PaymentPage() {
  const navigate = useNavigate();
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
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [contactQrCode, setContactQrCode] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchPaymentStatus(),
      fetchPaymentMethods(),
      fetchPaymentConfig(),
      fetchPlans(),
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

  const fetchPlans = async () => {
    try {
      const res = await promotionAPI.getActivePlans();
      if (res.success) setPricingPlans(res.data || []);
    } catch {}
  };

  const fetchContactQr = async () => {
    try {
      const res = await paymentAPI.getContactQr();
      if (res.success && res.data?.url) {
        setContactQrCode(res.data.url);
      }
    } catch {}
  };

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

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center text-slate-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="h-5 w-5 mr-2" />
        返回
      </button>

      <h1 className="text-3xl font-bold text-white mb-8">付费使用</h1>

      {/* 付费权益介绍区域 */}
      <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
        <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-cyan-400" />
          功能对比
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 试用版 */}
          <div className="rounded-xl border border-slate-600 bg-slate-700/30 p-5">
            <h3 className="text-lg font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-400" />
              免费试用
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-400">
              <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" /><span>有限题目访问</span></li>
              <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" /><span>限时使用期限</span></li>
              <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" /><span>无高级功能</span></li>
              <li className="flex items-start gap-2"><XCircle className="h-4 w-4 text-slate-500 mt-0.5 shrink-0" /><span>基础判题服务</span></li>
            </ul>
          </div>
          {/* 付费版 */}
          <div className="rounded-xl border border-cyan-500/50 bg-cyan-500/5 p-5 ring-1 ring-cyan-500/20">
            <h3 className="text-lg font-semibold text-cyan-300 mb-4 flex items-center gap-2">
              <Star className="h-4 w-4 text-cyan-400" />
              付费版
            </h3>
            <ul className="space-y-2.5 text-sm text-slate-300">
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" /><span>全部题目无限访问</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" /><span>完整使用期限</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" /><span>所有高级功能（对战、考试等）</span></li>
              <li className="flex items-start gap-2"><CheckCircle2 className="h-4 w-4 text-cyan-400 mt-0.5 shrink-0" /><span>优先判题 & 技术支持</span></li>
            </ul>
          </div>
        </div>
      </div>

      {/* 定价计划 */}
      {pricingPlans.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            定价计划
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingPlans.map((plan: any) => (
              <div
                key={plan.id}
                className={`rounded-xl border p-5 transition ${
                  plan.recommended
                    ? 'border-cyan-500/60 bg-cyan-500/5 ring-1 ring-cyan-500/20'
                    : 'border-slate-600 bg-slate-700/30'
                }`}
              >
                {plan.recommended && (
                  <span className="inline-block mb-2 rounded-full bg-cyan-500/20 px-2.5 py-0.5 text-xs font-medium text-cyan-300">
                    推荐
                  </span>
                )}
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                {plan.description && <p className="text-sm text-slate-400 mt-1">{plan.description}</p>}
                <div className="mt-3">
                  <span className="text-2xl font-bold text-cyan-400">¥{plan.price}</span>
                  {plan.duration && (
                    <span className="text-sm text-slate-400 ml-1">/ {plan.duration}天</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 联系管理员 */}
      {contactQrCode && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-cyan-400" />
            联系管理员
          </h2>
          <div className="flex flex-col items-center text-center">
            <div className="inline-block p-3 bg-white rounded-xl">
              <img src={contactQrCode} alt="管理员微信二维码" className="w-40 h-40 rounded-lg" />
            </div>
            <p className="text-slate-300 text-sm mt-4">扫码添加管理员微信，获取更多帮助</p>
          </div>
        </div>
      )}

      <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Gift className="h-5 w-5 text-cyan-400" />
          推广码
        </h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            value={promoCode}
            onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoMessage(''); }}
            placeholder="输入推广码获取优惠"
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

      {paymentAmount > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-400" />
            付费金额
          </h2>
          <p className="text-3xl font-bold text-cyan-400">¥{paymentAmount}</p>
        </div>
      )}

      {methods.length > 0 && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <QrCode className="h-5 w-5 text-cyan-400" />
            选择支付方式
          </h2>

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
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-cyan-400" />
            支付方式
          </h2>
          <p className="text-slate-400">请联系管理员获取支付二维码，完成支付后上传凭证。</p>
        </div>
      )}

      {paymentStatus && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">支付状态</h2>
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

      {(!paymentStatus || paymentStatus.status === 'REJECTED') && (
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl">
          <h2 className="text-xl font-semibold text-white mb-4">上传支付凭证</h2>

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
  );
}
