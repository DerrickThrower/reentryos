'use client';

import { NearbyResources } from '@/types';

export function ResourceGrid({ resources }: { resources: NearbyResources }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Clinics */}
      <div>
        <h4 className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-3 uppercase">
          Free Clinics
        </h4>
        <div className="space-y-2">
          {resources.clinics.length === 0 ? (
            <p className="text-[#4b5563] text-[12px]">No clinics in search results</p>
          ) : (
            resources.clinics.map((clinic, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] p-3">
                <p className="text-white text-[13px] font-medium">{clinic.name}</p>
                <p className="text-[#6b7280] text-[12px]">{clinic.address}</p>
                <p className="text-[#6b7280] text-[12px]">{clinic.phone}</p>
                {clinic.accepts_uninsured && (
                  <span className="font-mono text-[10px] text-green-400">✓ ACCEPTS UNINSURED</span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Food Banks */}
      <div>
        <h4 className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-3 uppercase">
          Food Banks
        </h4>
        <div className="space-y-2">
          {resources.food_banks.length === 0 ? (
            <p className="text-[#4b5563] text-[12px]">No food banks in search results</p>
          ) : (
            resources.food_banks.map((fb, i) => (
              <div key={i} className="bg-[#0d0d0d] border border-[#1a1a1a] p-3">
                <p className="text-white text-[13px] font-medium">{fb.name}</p>
                <p className="text-[#6b7280] text-[12px]">{fb.address}</p>
                <p className="text-[#6b7280] text-[12px]">{fb.hours}</p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Transit */}
      <div>
        <h4 className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-3 uppercase">
          Transit
        </h4>
        <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-3">
          <p className="text-white text-[13px] font-medium">Nearest Stop</p>
          <p className="text-[#6b7280] text-[12px] mb-2">{resources.transit.nearest_stop || 'See local transit authority'}</p>
          <p className="text-white text-[13px] font-medium">Day Pass</p>
          <p className="text-[#6b7280] text-[12px]">{resources.transit.day_pass_cost || 'Contact transit for pricing'}</p>
        </div>
      </div>
    </div>
  );
}
