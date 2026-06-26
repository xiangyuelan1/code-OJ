import { Sparkles } from 'lucide-react';

/**
 * "由柯德提供 AI 支持" 品牌徽章组件
 * 用于在所有 AI 功能位置标注柯德品牌身份
 */
export function CoderPowered({ size = 'sm', label }: { size?: 'sm' | 'md'; label?: string }) {
  if (size === 'md') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs text-purple-400/80">
        <Sparkles className="h-3 w-3" />
        <span>{label || '由柯德提供 AI 支持'}</span>
      </span>
    );
  }

  // sm: 紧凑的紫色品牌标识
  return (
    <span className="inline-flex items-center gap-1 text-[11px] text-purple-400 font-medium">
      <Sparkles className="h-3 w-3" />
      <span>{label || '柯德'}</span>
    </span>
  );
}
