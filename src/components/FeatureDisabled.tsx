import { Link } from 'react-router-dom';
import { Lock } from 'lucide-react';

export function FeatureDisabled({ featureName }: { featureName?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <Lock className="h-16 w-16 text-slate-600 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">此功能暂未开放</h2>
        {featureName && (
          <p className="text-slate-400 mb-6">{featureName} 功能当前未启用，请联系管理员。</p>
        )}
        <Link
          to="/"
          className="inline-block px-6 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 transition-colors"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
