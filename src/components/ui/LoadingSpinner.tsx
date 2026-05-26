import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type SpinnerSize = 'sm' | 'md' | 'lg';

interface LoadingSpinnerProps {
  size?: SpinnerSize;
  text?: string;
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  sm: 4,
  md: 8,
  lg: 12,
};

export function LoadingSpinner({ size = 'md', text }: LoadingSpinnerProps) {
  const iconSize = SIZE_MAP[size];

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3')}>
      <Loader2
        className={cn('animate-spin text-cyan-500')}
        size={iconSize}
      />
      {text && (
        <p className="text-sm text-slate-400">{text}</p>
      )}
    </div>
  );
}
