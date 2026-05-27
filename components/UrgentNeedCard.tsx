'use client';

import { UrgentNeed } from '@/types';

interface UrgentNeedCardProps {
  need: UrgentNeed;
  onSchedule?: (need: UrgentNeed) => void;
}

const categoryColors: Record<string, string> = {
  housing: 'bg-blue-900/50 text-blue-300 border-blue-700',
  medical: 'bg-red-900/50 text-red-300 border-red-700',
  benefits: 'bg-green-900/50 text-green-300 border-green-700',
  id: 'bg-purple-900/50 text-purple-300 border-purple-700',
  employment: 'bg-amber-900/50 text-amber-300 border-amber-700',
  legal: 'bg-gray-700/50 text-gray-300 border-gray-600',
};

const deadlineConfig = {
  'within 24h': { cls: 'bg-red-900/60 text-red-400 border-red-700', label: 'WITHIN 24H' },
  'within 48h': { cls: 'bg-amber-900/60 text-amber-400 border-amber-700', label: 'WITHIN 48H' },
  'within 72h': { cls: 'bg-gray-800 text-gray-400 border-gray-600', label: 'WITHIN 72H' },
};

export function UrgentNeedCard({ need, onSchedule }: UrgentNeedCardProps) {
  const catColor = categoryColors[need.category] || categoryColors.legal;
  const deadline = deadlineConfig[need.deadline] || deadlineConfig['within 72h'];

  return (
    <div className="bg-[#111111] border border-[#1a1a1a] rounded-none p-4 flex gap-4 hover:border-[#2a2a2a] transition-colors">
      {/* Priority number */}
      <div
        className={`flex-shrink-0 w-10 h-10 flex items-center justify-center text-xl font-bold font-mono border rounded ${
          need.priority === 1
            ? 'border-red-600 text-red-400 bg-red-900/20'
            : need.priority === 2
            ? 'border-amber-600 text-amber-400 bg-amber-900/20'
            : 'border-gray-600 text-gray-400 bg-gray-800/20'
        }`}
      >
        {need.priority}
      </div>

      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span
            className={`font-mono text-[10px] font-semibold tracking-widest px-2 py-0.5 border rounded uppercase ${catColor}`}
          >
            {need.category}
          </span>
          <span
            className={`font-mono text-[10px] font-semibold tracking-widest px-2 py-0.5 border rounded ${deadline.cls}`}
          >
            {deadline.label}
          </span>
        </div>

        {/* Action */}
        <p className="text-white text-[15px] font-medium mb-1">{need.action}</p>

        {/* Why */}
        <p className="text-[#6b7280] text-[13px] mb-3">{need.why}</p>

        {/* Resource */}
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-3 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-white text-[13px] font-medium">{need.resource.name}</p>
              <p className="text-[#6b7280] text-[12px]">{need.resource.address}</p>
              <p className="text-[#6b7280] text-[12px]">{need.resource.phone}</p>
              <p className="text-[#6b7280] text-[12px]">{need.resource.hours}</p>
            </div>
            <span
              className={`flex-shrink-0 flex items-center gap-1 font-mono text-[10px] ${
                need.resource.verified ? 'text-green-400' : 'text-amber-400'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  need.resource.verified ? 'bg-green-500' : 'bg-amber-500'
                }`}
              />
              {need.resource.verified ? 'VERIFIED' : 'UNVERIFIED'}
            </span>
          </div>
        </div>

        {/* Schedule button */}
        {onSchedule && (
          <button
            onClick={() => onSchedule(need)}
            className="font-mono text-[11px] tracking-widest px-3 py-1.5 border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors"
          >
            SCHEDULE THIS
          </button>
        )}
      </div>
    </div>
  );
}
