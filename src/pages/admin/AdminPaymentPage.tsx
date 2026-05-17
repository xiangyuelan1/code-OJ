import { useState, useEffect, useRef } from 'react';
import { paymentAPI } from '../../services/api';
import {
  CreditCard, CheckCircle2, XCircle, Clock, Upload, QrCode, Eye,
  Trash2, Settings, Smartphone, ToggleLeft, ToggleRight,
} from 'lucide-react';

interface MethodConfig {
  method: string;
  label: string;
  icon: string;
  qrCodeUrl: string | null;
  channelEnabled: boolean;
}

export function AdminPaymentPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [methodsConfig, setMethodsConfig] = useState<MethodConfig[]>([]);
  const [uploadingMethod, setUploadingMethod] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [viewingProof, setViewingProof] = useState<string | null>(null);
  const [deletingMethod, setDeletingMethod] = useState<string | null>(null);
  const [togglingMethod, setTogglingMethod] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    Promise.all([fetchPayments(), fetchMethodsConfig()]).finally(() => setLoading(false));
  }, []);

  const fetchPayments = async () => {
    try {
      const res = await paymentAPI.getAll();
      if (res.success) {
        setPayments(res.data || []);
      }
    } catch (error) {
      console.error('获取支付列表失败', error);
    }
  };

  const fetchMethodsConfig = async () => {
    try {
      const res = await paymentAPI.getConfig();
      if (res.success && res.data) {
        setMethodsConfig(res.data);
      }
    } catch (error) {
      console.error('获取支付方式配置失败', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('确定通过此支付请求？')) return;
    setProcessingId(id);
    try {
      const res = await paymentAPI.approve(id);
      if (res.success) {
        fetchPayments();
      }
    } catch (error: any) {
      alert(error.error?.message || '操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('请输入拒绝原因:');
    if (reason === null) return;
    setProcessingId(id);
    try {
      const res = await paymentAPI.reject(id);
      if (res.success) {
        fetchPayments();
      }
    } catch (error: any) {
      alert(error.error?.message || '操作失败');
    } finally {
      setProcessingId(null);
    }
  };

  const handleQrCodeUpload = async (method: string, file: File) => {
    setUploadingMethod(method);
    try {
      const formData = new FormData();
      formData.append('qrCode', file);
      formData.append('method', method);
      const res = await paymentAPI.uploadQrCode(formData);
      if (res.success) {
        fetchMethodsConfig();
      }
    } catch (error: any) {
      alert(error.error?.message || '上传失败');
    } finally {
      setUploadingMethod(null);
    }
  };

  const handleDeleteQrCode = async (method: string) => {
    if (!confirm('确定删除此支付方式的二维码？')) return;
    setDeletingMethod(method);
    try {
      const res = await paymentAPI.deleteQrCode(method);
      if (res.success) {
        fetchMethodsConfig();
      }
    } catch (error: any) {
      alert(error.error?.message || '删除失败');
    } finally {
      setDeletingMethod(null);
    }
  };

  const handleToggleChannel = async (method: string, enabled: boolean) => {
    setTogglingMethod(method);
    try {
      const res = await paymentAPI.updateChannel(method, { enabled });
      if (res.success) {
        fetchMethodsConfig();
      }
    } catch (error: any) {
      alert(error.error?.message || '操作失败');
    } finally {
      setTogglingMethod(null);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
            <CheckCircle2 className="h-3 w-3" /> 已通过
          </span>
        );
      case 'PENDING':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
            <Clock className="h-3 w-3" /> 待审核
          </span>
        );
      case 'REJECTED':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
            <XCircle className="h-3 w-3" /> 已拒绝
          </span>
        );
      default:
        return <span className="text-xs text-slate-400">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-white">付费管理</h1>
      </div>

      <div className="bg-slate-800 rounded-xl p-6 shadow-xl mb-8">
        <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5 text-cyan-400" />
          支付方式配置
        </h2>
        <p className="text-slate-400 text-sm mb-6">
          管理各支付方式的收款二维码。默认展示二维码方式，启用在线支付渠道后将使用在线支付。
        </p>

        <div className="grid gap-4">
          {methodsConfig.map(mc => (
            <div key={mc.method} className="bg-slate-700/50 rounded-xl p-5 border border-slate-600/50">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {getMethodIcon(mc.icon)}
                  <div>
                    <h3 className="text-white font-semibold">{mc.label}</h3>
                    <p className="text-slate-400 text-xs">{mc.method}</p>
                  </div>
                </div>

                {(mc.method === 'ALIPAY' || mc.method === 'WECHAT') && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400">在线支付渠道</span>
                    <button
                      onClick={() => handleToggleChannel(mc.method, !mc.channelEnabled)}
                      disabled={togglingMethod === mc.method}
                      className="transition-colors"
                    >
                      {mc.channelEnabled ? (
                        <ToggleRight className="h-8 w-8 text-green-400" />
                      ) : (
                        <ToggleLeft className="h-8 w-8 text-slate-500" />
                      )}
                    </button>
                    {mc.channelEnabled && (
                      <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">已启用</span>
                    )}
                  </div>
                )}
              </div>

              {mc.channelEnabled && (mc.method === 'ALIPAY' || mc.method === 'WECHAT') ? (
                <div className="bg-slate-600/30 rounded-lg p-4 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-4 w-4 text-cyan-400" />
                    <span className="text-cyan-400 text-sm font-medium">在线支付渠道已启用</span>
                  </div>
                  <p className="text-slate-400 text-xs">
                    用户将使用{mc.label}在线支付，无需展示二维码。请确保已在后端配置支付渠道参数。
                  </p>
                </div>
              ) : (
                <>
                  {mc.qrCodeUrl ? (
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-white rounded-lg flex-shrink-0">
                        <img src={mc.qrCodeUrl} alt={`${mc.label}二维码`} className="w-28 h-28 rounded" />
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <p className="text-slate-300 text-sm">当前二维码已配置</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fileInputRefs.current[mc.method]?.click()}
                            disabled={uploadingMethod === mc.method}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm disabled:opacity-50"
                          >
                            <Upload className="h-4 w-4" />
                            {uploadingMethod === mc.method ? '上传中...' : '更换'}
                          </button>
                          <button
                            onClick={() => handleDeleteQrCode(mc.method)}
                            disabled={deletingMethod === mc.method}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" />
                            删除
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center hover:border-cyan-500/50 transition-colors">
                      <QrCode className="h-8 w-8 text-slate-500 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm mb-3">未上传二维码</p>
                      <button
                        onClick={() => fileInputRefs.current[mc.method]?.click()}
                        disabled={uploadingMethod === mc.method}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm disabled:opacity-50"
                      >
                        <Upload className="h-4 w-4" />
                        {uploadingMethod === mc.method ? '上传中...' : '上传二维码'}
                      </button>
                    </div>
                  )}
                  <input
                    ref={el => { fileInputRefs.current[mc.method] = el; }}
                    type="file"
                    accept="image/*"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) handleQrCodeUpload(mc.method, file);
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-white">支付请求列表</h2>
        </div>

        {payments.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="h-12 w-12 text-slate-500 mx-auto mb-3" />
            <p className="text-slate-400">暂无支付请求</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">用户</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">支付方式</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">金额</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">凭证</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">状态</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">提交时间</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-300">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-750 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-white font-medium">{payment.user?.username || payment.userId}</div>
                      <div className="text-slate-400 text-sm">{payment.user?.email || ''}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-300">{payment.method || 'QR_CODE'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-cyan-400 font-medium">
                        {payment.amount ? `¥${payment.amount}` : '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {payment.proof ? (
                        <button
                          onClick={() => setViewingProof(viewingProof === payment.id ? null : payment.id)}
                          className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 text-sm"
                        >
                          <Eye className="h-4 w-4" />
                          查看凭证
                        </button>
                      ) : (
                        <span className="text-slate-500 text-sm">无凭证</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(payment.status)}</td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {payment.createdAt ? new Date(payment.createdAt).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      {payment.status === 'PENDING' && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleApprove(payment.id)}
                            disabled={processingId === payment.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors text-sm disabled:opacity-50"
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            通过
                          </button>
                          <button
                            onClick={() => handleReject(payment.id)}
                            disabled={processingId === payment.id}
                            className="flex items-center gap-1 px-3 py-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors text-sm disabled:opacity-50"
                          >
                            <XCircle className="h-4 w-4" />
                            拒绝
                          </button>
                        </div>
                      )}
                      {payment.rejectionReason && (
                        <p className="text-red-400 text-xs mt-1">原因: {payment.rejectionReason}</p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {viewingProof && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setViewingProof(null)}
        >
          <div className="bg-slate-800 rounded-xl p-4 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <img
              src={payments.find((p) => p.id === viewingProof)?.proof}
              alt="支付凭证"
              className="max-h-[70vh] rounded-lg"
            />
            <button
              onClick={() => setViewingProof(null)}
              className="mt-4 w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
