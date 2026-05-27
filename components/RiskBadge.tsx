'use client';

interface RiskBadgeProps {
  level: 'critical' | 'warning' | 'stable' | null;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
}

const levelConfig = {
  critical: {
    label: 'CRITICAL',
    bg: 'bg-red-900/40',
    border: 'border-red-700',
    text: 'text-red-400',
    dot: 'bg-red-500',
  },
  warning: {
    label: 'ATTENTION',
    bg: 'bg-amber-900/40',
    border: 'border-amber-700',
    text: 'text-amber-400',
    dot: 'bg-amber-500',
  },
  stable: {
    label: 'STABLE',
    bg: 'bg-green-900/40',
    border: 'border-green-700',
    text: 'text-green-400',
    dot: 'bg-green-500',
  },
};

export function RiskBadge({ level, score, size = 'md' }: RiskBadgeProps) {
  if (!level) return null;
  const cfg = levelConfig[level];

  const textSize = size === 'sm' ? 'text-[10px]' : size === 'lg' ? 'text-xs' : 'text-[11px]';
  const px = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono font-semibold tracking-widest border rounded ${cfg.bg} ${cfg.border} ${cfg.text} ${textSize} ${px}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {score !== undefined && score !== null ? `${score}/100 ` : ''}
      {cfg.label}
    </span>
  );
}

export function RiskBorderClass(level: 'critical' | 'warning' | 'stable' | null): string {
  if (level === 'critical') return 'border-l-red-500';
  if (level === 'warning') return 'border-l-amber-500';
  return 'border-l-green-500';
}
