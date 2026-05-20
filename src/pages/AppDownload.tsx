import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Download, Smartphone, Monitor, Apple, Chrome, QrCode, X } from 'lucide-react';

export function AppDownloadPage() {
  const [showQR, setShowQR] = useState(false);
  const currentUrl = window.location.origin;

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;

  const installSteps = isIOS
    ? [
        '1. 点击 Safari 浏览器底部的"分享"按钮',
        '2. 在弹出的菜单中选择"添加到主屏幕"',
        '3. 点击"添加"即可完成安装',
      ]
    : [
        '1. 点击浏览器菜单（右上角三个点）',
        '2. 选择"安装应用"或"添加到主屏幕"',
        '3. 确认安装即可完成',
      ];

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {isStandalone && (
          <div className="mb-8 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-center">
            ✅ 您已在 App 模式中运行，享受原生般的体验！
          </div>
        )}

        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/20 rounded-2xl mb-6">
            <Smartphone className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">下载 OJ 系统 App</h1>
          <p className="text-slate-400 text-lg">
            安装到手机或桌面，享受更流畅的编程练习体验
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                <AndroidIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Android 安卓</h3>
                <p className="text-sm text-slate-400">Chrome 浏览器安装</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-slate-300">
              {installSteps.map((step, i) => (
                <li key={i} className="flex items-start">
                  <span className="text-cyan-400 mr-2 shrink-0">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <button
              onClick={() => setShowQR(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors text-sm font-medium"
            >
              <QrCode className="w-4 h-4" />
              扫码安装
            </button>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                <Apple className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">iOS 苹果</h3>
                <p className="text-sm text-slate-400">Safari 浏览器安装</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2 shrink-0">•</span>
                <span>1. 使用 Safari 浏览器打开本页面</span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2 shrink-0">•</span>
                <span>2. 点击底部分享按钮，选择"添加到主屏幕"</span>
              </li>
              <li className="flex items-start">
                <span className="text-cyan-400 mr-2 shrink-0">•</span>
                <span>3. 点击"添加"即可在桌面看到 App 图标</span>
              </li>
            </ol>
            <button
              onClick={() => setShowQR(true)}
              className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg transition-colors text-sm font-medium"
            >
              <QrCode className="w-4 h-4" />
              扫码安装
            </button>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
              <Monitor className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">桌面端安装</h3>
              <p className="text-sm text-slate-400">Chrome / Edge 浏览器</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start">
              <span className="text-cyan-400 mr-2 shrink-0">•</span>
              <span>1. 使用 Chrome 或 Edge 浏览器访问本站</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-400 mr-2 shrink-0">•</span>
              <span>2. 地址栏右侧出现安装图标时点击，或在菜单中选择"安装 OJ系统"</span>
            </li>
            <li className="flex items-start">
              <span className="text-cyan-400 mr-2 shrink-0">•</span>
              <span>3. 确认安装后即可像桌面应用一样使用</span>
            </li>
          </ol>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="font-semibold mb-3 text-center">App 特性</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div className="p-3">
              <Download className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300">离线缓存</p>
            </div>
            <div className="p-3">
              <Smartphone className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300">全屏体验</p>
            </div>
            <div className="p-3">
              <Chrome className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300">消息推送</p>
            </div>
            <div className="p-3">
              <Monitor className="w-6 h-6 text-cyan-400 mx-auto mb-2" />
              <p className="text-slate-300">桌面快捷</p>
            </div>
          </div>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">扫码安装 App</h3>
              <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-4">
              <QRCodeSVG
                value={currentUrl}
                size={200}
                level="H"
                includeMargin={false}
              />
            </div>
            <p className="text-center text-slate-400 text-sm">
              使用手机浏览器扫描二维码，打开后按提示添加到主屏幕
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function AndroidIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 2.227l1.39-1.39a.5.5 0 00-.707-.707l-1.57 1.57A8.048 8.048 0 0012 .5a8.048 8.048 0 00-4.636 1.2l-1.57-1.57a.5.5 0 00-.707.707l1.39 1.39A7.986 7.986 0 004 8h16a7.986 7.986 0 00-2.477-5.773zM9 6a1 1 0 110-2 1 1 0 010 2zm6 0a1 1 0 110-2 1 1 0 010 2zM4 9v8a2 2 0 002 2h1v3.5a1.5 1.5 0 003 0V19h4v3.5a1.5 1.5 0 003 0V19h1a2 2 0 002-2V9H4zm-3 1.5a1.5 1.5 0 013 0v5a1.5 1.5 0 01-3 0v-5zm20 0a1.5 1.5 0 013 0v5a1.5 1.5 0 01-3 0v-5z" />
    </svg>
  );
}
