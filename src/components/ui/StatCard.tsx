import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  color?: string;
}

export function StatCard({ icon, label, value, color = 'text-cyan-400' }: StatCardProps) {
  return (
    <div className="bg-slate-800 rounded-xl shadow-xl p-6">
      <div className={cn('mb-4', color)}>
        {icon}
      </div>
      <div className="text-3xl font-bold text-white mb-1">{value}</div>
      <div className="text-sm text-slate-400">{label}</div>
    </div>
  );
}
