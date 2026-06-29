/**
 * 柯德空状态组件 - 在页面无数据时展示柯德形象和上下文消息
 */
import { CoderAvatar } from './CoderAvatar';

interface CoderEmptyStateProps {
  /** 主消息文字 */
  message?: string;
  /** 副标题/次要描述 */
  subtitle?: string;
  /** 头像心情 */
  mood?: 'happy' | 'thinking' | 'excited';
  /** 额外 className */
  className?: string;
  /** 操作按钮（可选插槽） */
  action?: React.ReactNode;
}

/** 预设消息模板 */
export const CODER_EMPTY_MESSAGES = {
  noData: '还没有数据呢，先去做几道题吧！',
  noRecord: '暂无记录，和柯德一起开始学习之旅吧～',
  loading: '柯德正在加载中...',
  noResult: '没有找到相关内容，换个关键词试试？',
  noWrong: '没有错题记录，你真棒！继续保持～',
  noDiscussion: '社区还没有讨论，成为第一个发帖的人吧！',
} as const;

export function CoderEmptyState({
  message = CODER_EMPTY_MESSAGES.noData,
  subtitle,
  mood = 'thinking',
  className = '',
  action,
}: CoderEmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 ${className}`}>
      <CoderAvatar size={100} animated mood={mood} className="mb-4" />
      <p className="text-base text-slate-300 font-medium text-center mb-1">{message}</p>
      {subtitle && <p className="text-sm text-slate-500 text-center">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
