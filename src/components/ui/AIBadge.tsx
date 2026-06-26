import { Sparkles } from 'lucide-react';

/** AI 标签类型 */
type AIBadgeType = 'generated' | 'assisted' | 'analyzed';

/** 各类型的显示文本与样式映射（柯德品牌） */
const BADGE_CONFIG: Record<AIBadgeType, { text: string; className: string }> = {
  generated: {
    text: '柯德生成',
    className: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  },
  assisted: {
    text: '柯德辅助',
    className: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  },
  analyzed: {
    text: '柯德分析',
    className: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
  },
};

/**
 * AI 标签组件 - 用于标记 AI 生成/辅助/分析的内容
 * 以紧凑的内联徽章形式展示，包含闪光图标和文字说明
 */
export function AIBadge({ type = 'generated' }: { type?: AIBadgeType }) {
  const config = BADGE_CONFIG[type];

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium leading-none ${config.className}`}
    >
      <Sparkles className="h-2.5 w-2.5" />
      {config.text}
    </span>
  );
}
