'use client';

import { HousingOption } from '@/types';

const typeLabels: Record<string, { label: string; cls: string }> = {
  shelter: { label: 'SHELTER', cls: 'bg-blue-900/40 text-blue-300 border-blue-700' },
  transitional: { label: 'TRANSITIONAL', cls: 'bg-purple-900/40 text-purple-300 border-purple-700' },
  halfway: { label: 'HALFWAY HOUSE', cls: 'bg-amber-900/40 text-amber-300 border-amber-700' },
  emergency: { label: 'EMERGENCY', cls: 'bg-red-900/40 text-red-300 border-red-700' },
};

export function HousingCard({ option, rank }: { option: HousingOption; rank: number }) {
  const typeCfg = typeLabels[option.type] || typeLabels.shelter;

  return (
    <div className="bg-[#111111] border border-[#1a1a1a] p-4 hover:border-[#2a2a2a] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-[#4b5563]">#{rank}</span>
          <span className="text-white font-medium text-[14px]">{option.name}</span>
        </div>
        <span
          className={`flex-shrink-0 font-mono text-[10px] tracking-widest px-2 py-0.5 border rounded ${typeCfg.cls}`}
        >
          {typeCfg.label}
        </span>
      </div>

      <p className="text-[#6b7280] text-[12px] mb-1">{option.address}</p>
      <p className="text-[#6b7280] text-[12px] mb-2">{option.phone}</p>

      {option.restrictions && (
        <p className="text-amber-400 text-[12px] mb-2">⚠ {option.restrictions}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        {option.medical_accessible && (
          <span className="font-mono text-[10px] tracking-widest px-2 py-0.5 bg-green-900/30 text-green-400 border border-green-800 rounded">
            MEDICAL ACCESSIBLE
          </span>
        )}
        <span className="font-mono text-[10px] text-[#6b7280]">
          ~{option.distance_miles.toFixed(1)} mi
        </span>
        <span
          className={`font-mono text-[10px] flex items-center gap-1 ${
            option.verified ? 'text-green-400' : 'text-amber-400'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${option.verified ? 'bg-green-500' : 'bg-amber-500'}`}
          />
          {option.verified ? 'VERIFIED' : 'UNVERIFIED'}
        </span>
      </div>
    </div>
  );
}
