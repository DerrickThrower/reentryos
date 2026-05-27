'use client';

import Link from 'next/link';
import { ClientWithDetails } from '@/types';
import { RiskBadge } from '@/components/RiskBadge';

interface ClientSidebarProps {
  clients: ClientWithDetails[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  search: string;
  onSearch: (s: string) => void;
}

export function ClientSidebar({
  clients,
  selectedId,
  onSelect,
  search,
  onSearch,
}: ClientSidebarProps) {
  // Filter clients by name
  const filteredClients = clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase())
  );

  // Sort by risk_score descending
  const sortedClients = [...filteredClients].sort(
    (a, b) => (b.risk_score || 0) - (a.risk_score || 0)
  );

  // Count critical clients needing immediate attention
  const criticalCount = clients.filter(
    (c) => c.risk_level === 'critical'
  ).length;

  const hoursSinceRelease = (dateStr: string) => {
    try {
      const releaseDate = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - releaseDate.getTime();
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return diffHours >= 0 ? diffHours : 0;
    } catch {
      return 0;
    }
  };

  const getBorderColor = (level: 'critical' | 'warning' | 'stable' | null) => {
    switch (level) {
      case 'critical':
        return 'border-l-[#ef4444]';
      case 'warning':
        return 'border-l-[#f59e0b]';
      case 'stable':
        return 'border-l-[#22c55e]';
      default:
        return 'border-l-[#4b5563]';
    }
  };

  return (
    <aside className="w-[280px] h-screen bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1a1a1a] flex items-center justify-between">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 group"
        >
          <img
            src="/logo.png"
            alt="ReEntryOS Logo"
            className="h-6 w-auto rounded-sm object-contain"
          />
          <span className="font-mono text-[14px] tracking-[0.15em] text-white group-hover:text-blue-400 transition-all uppercase">
            <span className="font-light">RE</span>
            <span className="text-gray-500 font-extralight mx-0.5">—</span>
            <span className="font-bold">ENTRY</span>
            <span className="text-[#3b82f6] font-extrabold ml-0.5">OS</span>
          </span>
        </Link>
        <span className="font-mono text-[9px] px-1.5 py-0.5 border border-[#3b82f6]/40 bg-[#3b82f6]/10 text-[#3b82f6] tracking-widest font-bold">
          v1.0
        </span>
      </div>

      {/* Red Alert Banner */}
      {criticalCount > 0 && (
        <div className="bg-[#ef4444]/25 border-b border-[#ef4444] px-4 py-2 text-center animate-pulse">
          <p className="font-mono text-[10px] font-bold tracking-wider text-[#ef4444] uppercase">
            ⚠ {criticalCount} CLIENT{criticalCount > 1 ? 'S' : ''} NEED IMMEDIATE ATTENTION
          </p>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3 border-b border-[#1a1a1a] bg-[#111111]/30">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="SEARCH CLIENTS..."
            className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[11px] tracking-widest px-3 py-2 focus:outline-none focus:border-[#3b82f6] placeholder-[#6b7280] transition-colors"
          />
          {search && (
            <button
              onClick={() => onSearch('')}
              className="absolute right-2.5 top-2 text-[#6b7280] hover:text-white font-mono text-[11px]"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Client List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#1a1a1a]">
        {sortedClients.length === 0 ? (
          <div className="p-8 text-center">
            <p className="font-mono text-[11px] tracking-widest text-[#4b5563] uppercase">
              NO CLIENTS FOUND
            </p>
          </div>
        ) : (
          sortedClients.map((client) => {
            const isSelected = client.id === selectedId;
            const releasedHours = hoursSinceRelease(client.release_date);

            return (
              <div
                key={client.id}
                onClick={() => onSelect(client.id)}
                className={`border-l-4 ${getBorderColor(
                  client.risk_level
                )} cursor-pointer p-4 transition-all ${
                  isSelected ? 'bg-[#111111] border-r-2 border-r-[#3b82f6]' : 'bg-transparent hover:bg-[#111111]/50'
                }`}
              >
                <div className="flex items-start justify-between mb-1.5">
                  <h3 className="text-[14px] font-medium text-white tracking-wide truncate pr-2">
                    {client.name}
                  </h3>
                  {client.unread_sms && (
                    <span className="flex h-2 w-2 relative mt-1.5 flex-shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#ef4444]"></span>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <RiskBadge level={client.risk_level} size="sm" />
                  <span className="font-mono text-[11px] text-[#6b7280] tracking-wide">
                    RELEASED {releasedHours}H AGO
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Add Button */}
      <div className="p-3 border-t border-[#1a1a1a] bg-[#0a0a0a]">
        <Link
          href="/intake"
          className="w-full flex items-center justify-center font-mono text-[11px] tracking-[0.2em] font-bold py-3 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 transition-colors uppercase"
        >
          ADD NEW CLIENT
        </Link>
      </div>
    </aside>
  );
}
