'use client';

import React from 'react';
import { CheckCircle, ArrowUpRight, AlertCircle, RefreshCw } from 'lucide-react';

export function HardcodedTimeline() {
  return (
    <div className="flex flex-col xl:flex-row gap-8 w-full">
      {/* LEFT: 72-hour plan */}
      <div className="flex-1 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-2">
          <div className="relative">
            <h2 className="text-[16px] font-medium text-white pb-2">
              72–hour plan
            </h2>
            <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#3b82f6]" />
          </div>
          <span className="font-mono text-[#6b7280] text-[13px]">
            Hour 00 &rarr; Hour 72
          </span>
        </div>

        {/* Timeline Items */}
        <div className="space-y-4">
          {/* Item 1 */}
          <div className="flex items-start gap-4">
            <div className="w-[80px] pt-4 text-right flex-shrink-0">
              <div className="font-mono text-[10px] text-[#6b7280] tracking-widest uppercase">DAY 1</div>
              <div className="font-mono text-[14px] text-[#9ca3af]">07:30</div>
            </div>
            <div className="flex-1 bg-[#1e293b]/20 border border-[#334155] rounded-xl p-4 flex items-center gap-4">
              <div className="bg-[#10b981] rounded-full p-0.5">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[15px] font-medium text-white">Release & pickup</h3>
                <p className="text-[13px] text-[#6b7280]">Reception center - driver assigned</p>
              </div>
            </div>
          </div>

          {/* Item 2 */}
          <div className="flex items-start gap-4">
            <div className="w-[80px] pt-4 text-right flex-shrink-0">
              <div className="font-mono text-[10px] text-[#6b7280] tracking-widest uppercase">DAY 1</div>
              <div className="font-mono text-[14px] text-[#9ca3af]">09:30</div>
            </div>
            <div className="flex-1 bg-[#1e3a8a]/10 border border-[#1e40af] rounded-xl p-4 flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-[#475569]" />
              <div className="flex-1">
                <h3 className="text-[15px] font-medium text-white">DMV fast-track ID restoration</h3>
                <p className="text-[13px] text-[#6b7280]">Ref DMV-44J21 - 22 min slack</p>
              </div>
              <div className="border border-[#f59e0b] px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#f59e0b] tracking-widest bg-[#f59e0b]/10">
                CRITICAL
              </div>
            </div>
          </div>

          {/* Item 3 */}
          <div className="flex items-start gap-4">
            <div className="w-[80px] pt-4 text-right flex-shrink-0">
              <div className="font-mono text-[10px] text-[#6b7280] tracking-widest uppercase">DAY 1</div>
              <div className="font-mono text-[14px] text-[#9ca3af]">13:00</div>
            </div>
            <div className="flex-1 bg-[#451a03]/30 border border-[#92400e] rounded-xl p-4 flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-[#475569]" />
              <div className="flex-1">
                <h3 className="text-[15px] font-medium text-white">Parole intake</h3>
                <p className="text-[13px] text-[#6b7280]">Officer M. Reyes - Suite 204</p>
              </div>
              <div className="border border-[#f59e0b] px-2 py-0.5 rounded text-[10px] font-mono font-bold text-[#f59e0b] tracking-widest bg-[#f59e0b]/10">
                CRITICAL
              </div>
            </div>
          </div>

          {/* Item 4 */}
          <div className="flex items-start gap-4">
            <div className="w-[80px] pt-4 text-right flex-shrink-0">
              <div className="font-mono text-[10px] text-[#6b7280] tracking-widest uppercase">DAY 1</div>
              <div className="font-mono text-[14px] text-[#9ca3af]">17:00</div>
            </div>
            <div className="flex-1 bg-[#064e3b]/30 border border-[#065f46] rounded-xl p-4 flex items-center gap-4">
              <div className="w-6 h-6 rounded-full border-2 border-[#475569]" />
              <div className="flex-1">
                <h3 className="text-[15px] font-medium text-white">Move in — Hope Manor</h3>
                <p className="text-[13px] text-[#6b7280]">Bed 3B - curfew 21:00</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Live Activity */}
      <div className="w-full xl:w-[350px] border-t xl:border-t-0 xl:border-l border-[#1a1a1a] pt-6 xl:pt-0 xl:pl-8 space-y-6">
        <h2 className="text-[14px] font-mono tracking-[0.2em] font-bold text-[#6b7280] uppercase">
          LIVE ACTIVITY
        </h2>
        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <div className="bg-[#052e16] border border-[#166534] p-1.5 rounded-md mt-1 text-[#22c55e]">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] text-white">
                <span className="font-bold">Housing</span> bed confirmed at Hope Manor
              </p>
              <p className="text-[11px] font-mono text-[#6b7280] mt-1">2m ago</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-[#1e3a8a]/40 border border-[#1e40af] p-1.5 rounded-md mt-1 text-[#60a5fa]">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] text-white">
                <span className="font-bold">SMS</span> Day-1 reminder campaign active
              </p>
              <p className="text-[11px] font-mono text-[#6b7280] mt-1">4m ago</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-[#451a03]/60 border border-[#92400e] p-1.5 rounded-md mt-1 text-[#f59e0b]">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] text-white">
                <span className="font-bold">Risk</span> re-routed plan around curfew order
              </p>
              <p className="text-[11px] font-mono text-[#6b7280] mt-1">6m ago</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-[#052e16] border border-[#166534] p-1.5 rounded-md mt-1 text-[#22c55e]">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] text-white">
                <span className="font-bold">Benefits</span> SNAP filed successfully
              </p>
              <p className="text-[11px] font-mono text-[#6b7280] mt-1">8m ago</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="bg-[#1e293b]/50 border border-[#334155] p-1.5 rounded-md mt-1 text-[#94a3b8]">
              <RefreshCw className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[13px] text-white">
                <span className="font-bold">Plan</span> regenerated - 13 changes
              </p>
              <p className="text-[11px] font-mono text-[#6b7280] mt-1">11m ago</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
