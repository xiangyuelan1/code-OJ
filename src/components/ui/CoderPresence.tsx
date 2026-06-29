/**
 * 柯德存在感组件 - 在各页面展示柯德的存在
 * 'inline' = 嵌入内容流中，适合页面顶部
 * 'corner' = 绝对定位在区域角落，作为装饰
 */
import { CoderAvatar } from './CoderAvatar';

interface CoderPresenceProps {
  /** 展示的文字消息 */
  message?: string;
  /** 尺寸：sm=32px, md=48px */
  size?: 'sm' | 'md';
  /** 定位方式：inline 嵌入内容流，corner 绝对定位于容器右下角 */
  position?: 'inline' | 'corner';
  /** 额外 className */
  className?: string;
}

const SIZE_MAP = { sm: 32, md: 48 } as const;

export function CoderPresence({
  message,
  size = 'sm',
  position = 'inline',
  className = '',
}: CoderPresenceProps) {
  const avatarSize = SIZE_MAP[size];

  if (position === 'corner') {
    return (
      <div className={`absolute bottom-3 right-3 flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity ${className}`}>
        {message && (
          <span className="text-xs text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-1 rounded-lg whitespace-nowrap">
            {message}
          </span>
        )}
        <CoderAvatar size={avatarSize} animated={false} mood="happy" />
      </div>
    );
  }

  // inline 模式
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <CoderAvatar size={avatarSize} animated={false} mood="happy" />
      {message && (
        <span className={`text-slate-300 ${size === 'sm' ? 'text-xs' : 'text-sm'} font-medium`}>
          {message}
        </span>
      )}
    </div>
  );
}
