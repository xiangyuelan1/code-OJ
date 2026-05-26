import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 max-w-md w-full text-center">
        <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-4" />
        <p className="text-red-300 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-300 hover:text-white hover:bg-red-500/25 transition-all font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            重试
          </button>
        )}
      </div>
    </div>
  );
}
