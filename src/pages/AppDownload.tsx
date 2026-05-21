import { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Smartphone, Monitor, Apple, QrCode, X, Download, Chrome, Cpu } from 'lucide-react';

export function AppDownloadPage() {
  const [showQR, setShowQR] = useState(false);
  const currentUrl = window.location.origin;

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-cyan-500/20 rounded-2xl mb-6">
            <Smartphone className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">下载 OJ 系统 App</h1>
          <p className="text-slate-400 text-lg">
            安装到手机或桌面，享受更流畅的编程练习体验
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-purple-500/10 rounded-2xl p-8 border border-cyan-500/30 mb-8">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-3 flex items-center gap-2">
                <Download className="h-6 w-6 text-cyan-400" />
                下载安卓 APK
              </h2>
              <p className="text-slate-300 mb-4">
                直接下载 APK 安装包到手机，或扫码下载。APK 大小约 4.3MB。
              </p>
              <div className="space-y-3">
                <a
                  href="/code-oj.apk"
                  download="code-oj.apk"
                  className="flex items-center justify-center gap-3 px-5 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors font-medium"
                >
                  <Download className="h-5 w-5" />
                  直接下载 APK
                </a>
                <button
                  onClick={() => setShowQR(true)}
                  className="flex items-center justify-center gap-3 px-5 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors w-full md:w-auto"
                >
                  <QrCode className="h-5 w-5" />
                  扫码下载
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl p-3 shrink-0">
              <QRCodeSVG value={`${currentUrl}/code-oj.apk`} size={160} level="H" />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-400" />
            APK 安装步骤
          </h2>
          <ol className="space-y-3 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">1</span>
              <span>点击上方"直接下载 APK"按钮，或扫码下载</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">2</span>
              <span>下载完成后，在手机上找到 APK 文件</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">3</span>
              <span>如果提示"未知来源"，请在设置中允许安装未知来源应用</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 font-bold text-sm shrink-0">4</span>
              <span>点击 APK 文件安装即可</span>
            </li>
          </ol>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center mr-3">
                <AndroidIcon className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold">Android 快捷安装</h3>
                <p className="text-sm text-slate-400">Chrome 浏览器</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>用 Chrome 打开本站</li>
              <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>点击菜单 → "安装应用"</li>
              <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>确认安装即可添加到桌面</li>
            </ol>
          </div>

          <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center mr-3">
                <Apple className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h3 className="font-semibold">iOS 安装</h3>
                <p className="text-sm text-slate-400">Safari 浏览器</p>
              </div>
            </div>
            <ol className="space-y-2 text-sm text-slate-300">
              <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>用 Safari 打开本站</li>
              <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>点击分享按钮 → "添加到主屏幕"</li>
              <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>点击"添加"即可</li>
            </ol>
          </div>
        </div>

        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 mb-8">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center mr-3">
              <Monitor className="w-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold">桌面端安装</h3>
              <p className="text-sm text-slate-400">Chrome / Edge</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-slate-300">
            <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>用 Chrome/Edge 打开本站</li>
            <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>地址栏右侧出现安装图标时点击</li>
            <li className="flex items-start"><span className="text-cyan-400 mr-2 shrink-0">•</span>确认安装后即可像桌面应用一样使用</li>
          </ol>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-700/50">
          <h3 className="font-semibold mb-3 text-center">App 特性</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center text-sm">
            <div className="p-3"><Download className="w-6 h-6 text-cyan-400 mx-auto mb-2" /><p className="text-slate-300">离线缓存</p></div>
            <div className="p-3"><Smartphone className="w-6 h-6 text-cyan-400 mx-auto mb-2" /><p className="text-slate-300">全屏体验</p></div>
            <div className="p-3"><Chrome className="w-6 h-6 text-cyan-400 mx-auto mb-2" /><p className="text-slate-300">消息推送</p></div>
            <div className="p-3"><Monitor className="w-6 h-6 text-cyan-400 mx-auto mb-2" /><p className="text-slate-300">桌面快捷</p></div>
          </div>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowQR(false)}>
          <div className="bg-slate-800 rounded-2xl p-8 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">扫码下载 App</h3>
              <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="bg-white rounded-xl p-4 flex items-center justify-center mb-4">
              <QRCodeSVG value={`${currentUrl}/code-oj.apk`} size={200} level="H" />
            </div>
            <p className="text-center text-slate-400 text-sm">
              用手机浏览器扫码下载 APK 安装包
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
