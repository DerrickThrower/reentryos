'use client';

import { BenefitsEligibility } from '@/types';

export function BenefitsRow({ benefit }: { benefit: BenefitsEligibility }) {
  const eligClass = benefit.likely_eligible
    ? 'bg-green-900/40 text-green-400 border-green-700'
    : 'bg-gray-800 text-gray-400 border-gray-600';
  const eligLabel = benefit.likely_eligible ? 'ELIGIBLE' : 'NOT ELIGIBLE';

  const programColors: Record<string, string> = {
    Medicaid: 'text-blue-400',
    SNAP: 'text-green-400',
    SSI: 'text-purple-400',
    TANF: 'text-amber-400',
    GA: 'text-gray-400',
  };

  return (
    <div className="border border-[#1a1a1a] bg-[#111111] p-4">
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className={`font-mono font-bold text-[14px] ${programColors[benefit.program] || 'text-white'}`}>
          {benefit.program}
        </span>
        <span className={`font-mono text-[10px] tracking-widest px-2 py-0.5 border rounded ${eligClass}`}>
          {eligLabel}
        </span>
      </div>

      <p className="text-[#6b7280] text-[12px] mb-2">{benefit.reasoning}</p>

      <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-3 mt-2">
        <p className="text-white text-[13px] font-medium mb-1">Next Step</p>
        <p className="text-[#9ca3af] text-[12px] mb-2">{benefit.next_step}</p>
        {benefit.deadline && (
          <p className="font-mono text-[11px] text-amber-400">Deadline: {benefit.deadline}</p>
        )}
        {benefit.office_address && (
          <p className="text-[#6b7280] text-[12px] mt-1">{benefit.office_address}</p>
        )}
        {benefit.office_phone && (
          <p className="text-[#6b7280] text-[12px]">{benefit.office_phone}</p>
        )}
      </div>
    </div>
  );
}
