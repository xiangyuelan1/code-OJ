import { Outlet, useNavigate } from 'react-router-dom';
import { Navbar } from './Navbar';
import { useAuthStore } from '../../stores/auth.store';
import { useSocketStore } from '../../services/socket';
import { classAPI } from '../../services/api';
import { useEffect, useState } from 'react';
import { ShieldX, Users, CreditCard, Clock, Send, X } from 'lucide-react';

export function Layout() {
  const { isAuthenticated, checkAccess, accessStatus, accessLoading, user } = useAuthStore();
  const { connect, disconnect, isConnected } = useSocketStore();
  const navigate = useNavigate();
  const [showJoinClass, setShowJoinClass] = useState(false);
  const [joinClassCode, setJoinClassCode] = useState('');
  const [joinMessage, setJoinMessage] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('token');
      if (token && !isConnected) {
        connect(token);
      }
    } else {
      disconnect();
    }
  }, [isAuthenticated, isConnected, connect, disconnect]);

  useEffect(() => {
    if (isAuthenticated && !accessStatus) {
      checkAccess();
    }
  }, [isAuthenticated, accessStatus, checkAccess]);

  const handleJoinClass = async () => {
    if (!joinClassCode.trim()) {
      alert('请输入班级码');
      return;
    }
    setJoinLoading(true);
    try {
      await classAPI.joinByCode(joinClassCode, joinMessage || undefined);
      alert('加入请求已发送，请等待管理员审核');
      setShowJoinClass(false);
      setJoinClassCode('');
      setJoinMessage('');
    } catch (error: any) {
      alert(error.error?.message || '加入请求失败');
    } finally {
      setJoinLoading(false);
    }
  };

  const needsAccessCheck = isAuthenticated && accessStatus && !accessStatus.hasAccess && user?.role !== 'ADMIN';

  const getTrialDaysLeft = () => {
    if (!accessStatus?.expiresAt) return 0;
    const expires = new Date(accessStatus.expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
      <footer className="bg-slate-900 text-slate-400 py-6 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p>Code OJ - 在线评测系统 &copy; 2024</p>
        </div>
      </footer>

      {needsAccessCheck && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl border border-slate-700">
            <div className="text-center mb-6">
              <ShieldX className="h-16 w-16 text-red-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white">访问受限</h2>
              <p className="text-slate-400 mt-2">
                {accessStatus.message || '您暂无访问权限，请选择以下方式获取访问权限'}
              </p>
            </div>

            <div className="space-y-3">
              {accessStatus.accessType === 'trial' && accessStatus.expiresAt && (
                <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                  <Clock className="h-5 w-5 text-yellow-400 shrink-0" />
                  <div>
                    <p className="text-yellow-400 font-medium">试用剩余 {getTrialDaysLeft()} 天</p>
                    <p className="text-slate-400 text-sm">试用期结束后需要付费或加入班级</p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowJoinClass(true)}
                className="w-full flex items-center gap-3 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/20 transition-colors text-left"
              >
                <Users className="h-5 w-5 text-cyan-400 shrink-0" />
                <div>
                  <p className="text-cyan-400 font-medium">加入班级</p>
                  <p className="text-slate-400 text-sm">输入班级码申请加入</p>
                </div>
              </button>

              <button
                onClick={() => navigate('/payment')}
                className="w-full flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg hover:bg-green-500/20 transition-colors text-left"
              >
                <CreditCard className="h-5 w-5 text-green-400 shrink-0" />
                <div>
                  <p className="text-green-400 font-medium">付费使用</p>
                  <p className="text-slate-400 text-sm">购买付费访问权限</p>
                </div>
              </button>
            </div>
          </div>

          {showJoinClass && (
            <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <div className="bg-slate-800 rounded-xl p-6 max-w-sm w-full border border-slate-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">加入班级</h3>
                  <button onClick={() => setShowJoinClass(false)} className="text-slate-400 hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">班级码</label>
                    <input
                      type="text"
                      value={joinClassCode}
                      onChange={(e) => setJoinClassCode(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      placeholder="请输入6位班级码"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">申请说明（可选）</label>
                    <textarea
                      value={joinMessage}
                      onChange={(e) => setJoinMessage(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                      rows={2}
                      placeholder="简短说明"
                    />
                  </div>
                  <button
                    onClick={handleJoinClass}
                    disabled={joinLoading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-cyan-500 hover:bg-cyan-600 disabled:bg-slate-600 text-white rounded-lg transition-colors"
                  >
                    <Send className="h-4 w-4" />
                    {joinLoading ? '发送中...' : '发送申请'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {accessLoading && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent"></div>
        </div>
      )}
    </div>
  );
}
