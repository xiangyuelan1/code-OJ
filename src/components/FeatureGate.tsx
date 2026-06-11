import React from 'react';
import { Lock } from 'lucide-react';
import { useFeatureAccess } from '../hooks/useFeatureAccess';

interface FeatureGateProps {
  /** 功能标识，对应 PREMIUM_FEATURES 中的 key */
  featureKey: string;
  children: React.ReactNode;
  /** 被锁定时显示的自定义替代内容 */
  fallback?: React.ReactNode;
  /** 仅禁用交互但仍展示内容（降低透明度+锁定标记） */
  disableOnly?: boolean;
}

/**
 * 功能权限门控组件
 * 包裹需要付费权限的功能入口，免费用户看到锁定提示或降级展示
 */
export function FeatureGate({ featureKey, children, fallback, disableOnly }: FeatureGateProps) {
  const { canUseFeature, loading } = useFeatureAccess();

  // 权限数据加载中时显示占位，避免付费功能短暂闪烁
  if (loading) {
    return (
      <div className="rounded-xl border border-slate-700/50 bg-slate-800/30 p-6 min-h-[120px] animate-pulse" />
    );
  }

  if (canUseFeature(featureKey)) {
    return <>{children}</>;
  }

  // 优先使用外部传入的 fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  // 仅禁用模式：内容可见但不可交互
  if (disableOnly) {
    return (
      <div className="relative">
        <div className="opacity-50 pointer-events-none">{children}</div>
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded text-xs text-amber-400">
          <Lock className="w-3 h-3" />
          会员功能
        </div>
      </div>
    );
  }

  // 默认锁定提示
  return (
    <div className="relative rounded-xl border border-slate-700 bg-slate-800/50 p-6 flex flex-col items-center justify-center text-center min-h-[120px]">
      <Lock className="w-8 h-8 text-slate-500 mb-3" />
      <p className="text-slate-400 text-sm mb-2">此功能需要会员身份</p>
      <a
        href="/payment"
        className="text-xs text-cyan-400 hover:text-cyan-300 underline"
      >
        了解会员权益 →
      </a>
    </div>
  );
}
