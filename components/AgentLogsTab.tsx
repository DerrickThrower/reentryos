'use client';

import { useState } from 'react';
import { AgentLog } from '@/types';

interface AgentLogsTabProps {
  logs: AgentLog[];
}

const agentColorMap: Record<string, string> = {
  Orchestrator: 'bg-purple-900/30 text-purple-400 border-purple-800/60',
  'Orchestrator Agent': 'bg-purple-900/30 text-purple-400 border-purple-800/60',
  Search: 'bg-blue-900/30 text-blue-400 border-blue-800/60',
  'Search Agent': 'bg-blue-900/30 text-blue-400 border-blue-800/60',
  Benefits: 'bg-amber-900/30 text-amber-400 border-amber-800/60',
  'Benefits Agent': 'bg-amber-900/30 text-amber-400 border-amber-800/60',
  Housing: 'bg-green-900/30 text-green-400 border-green-800/60',
  'Housing Agent': 'bg-green-900/30 text-green-400 border-green-800/60',
  Risk: 'bg-red-900/30 text-red-400 border-red-800/60',
  'Risk Agent': 'bg-red-900/30 text-red-400 border-red-800/60',
  Plan: 'bg-teal-900/30 text-teal-400 border-teal-800/60',
  'Plan Agent': 'bg-teal-900/30 text-teal-400 border-teal-800/60',
  Calendar: 'bg-indigo-900/30 text-indigo-400 border-indigo-800/60',
  'Calendar Agent': 'bg-indigo-900/30 text-indigo-400 border-indigo-800/60',
  SMS: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/60',
  'SMS Agent': 'bg-emerald-900/30 text-emerald-400 border-emerald-800/60',
  Documentation: 'bg-gray-800/50 text-gray-400 border-gray-700/60',
  'Documentation Agent': 'bg-gray-800/50 text-gray-400 border-gray-700/60',
};

const statusColors = {
  working: {
    text: 'text-amber-400 bg-amber-950/40 border-amber-700',
    dot: 'bg-amber-500 animate-pulse',
    label: 'WORKING',
  },
  done: {
    text: 'text-green-400 bg-green-950/40 border-green-700',
    dot: 'bg-green-500',
    label: 'DONE',
  },
  error: {
    text: 'text-red-400 bg-red-950/40 border-red-700',
    dot: 'bg-red-500',
    label: 'ERROR',
  },
};

const filterAgents = [
  { id: 'ALL', label: 'ALL AGENTS' },
  { id: 'Orchestrator', label: 'ORCHESTRATOR' },
  { id: 'Search Agent', label: 'SEARCH' },
  { id: 'Benefits Agent', label: 'BENEFITS' },
  { id: 'Housing Agent', label: 'HOUSING' },
  { id: 'Risk Agent', label: 'RISK' },
  { id: 'Plan Agent', label: 'PLAN' },
  { id: 'Calendar Agent', label: 'CALENDAR' },
  { id: 'SMS Agent', label: 'SMS' },
  { id: 'Documentation Agent', label: 'DOCS' },
];

export function AgentLogsTab({ logs = [] }: AgentLogsTabProps) {
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Filter logic
  const filteredLogs = logs.filter((log) => {
    if (activeFilter === 'ALL') return true;
    return (
      log.agent_name.toLowerCase().includes(activeFilter.toLowerCase()) ||
      activeFilter.toLowerCase().includes(log.agent_name.toLowerCase())
    );
  });

  // Sort logs by created_at descending
  const sortedLogs = [...filteredLogs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-4">
        <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
          AGENT ACTIVITY LOG
        </h2>
        <p className="text-[#6b7280] font-mono text-[10px] uppercase mt-1">
          {logs.length} events recorded
        </p>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap gap-2 py-2">
        {filterAgents.map((agent) => {
          const isSelected = activeFilter === agent.id;
          return (
            <button
              key={agent.id}
              onClick={() => setActiveFilter(agent.id)}
              className={`font-mono text-[10px] tracking-widest font-semibold px-3 py-1.5 border transition-all ${
                isSelected
                  ? 'bg-white text-black border-white'
                  : 'bg-[#111111] text-[#6b7280] border-[#1a1a1a] hover:border-[#374151] hover:text-white'
              }`}
            >
              {agent.label}
            </button>
          );
        })}
      </div>

      {/* Logs Table */}
      {sortedLogs.length === 0 ? (
        <div className="border border-[#1a1a1a] bg-[#111111] p-12 text-center">
          <p className="font-mono text-[11px] tracking-widest text-[#4b5563] uppercase">
            NO ACTIVITY RECORDED FOR: {activeFilter.toUpperCase()}
          </p>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] bg-[#111111] overflow-x-auto">
          <table className="w-full text-left font-mono border-collapse min-w-[700px]">
            <thead>
              <tr className="border-b border-[#1a1a1a] bg-[#0a0a0a] text-[#6b7280] text-[10px] uppercase tracking-widest">
                <th className="px-4 py-3 font-semibold">TIMESTAMP</th>
                <th className="px-4 py-3 font-semibold">AGENT</th>
                <th className="px-4 py-3 font-semibold">STATUS</th>
                <th className="px-4 py-3 font-semibold w-1/2">MESSAGE</th>
                <th className="px-4 py-3 font-semibold text-right">DURATION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a] text-[12px] text-[#e5e7eb]">
              {sortedLogs.map((log) => {
                const dateObj = new Date(log.created_at);
                const formattedTime = dateObj.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                });
                const formattedDate = dateObj.toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                });

                const agentStyle =
                  agentColorMap[log.agent_name] ||
                  'bg-gray-800 text-gray-400 border-gray-700';

                const statusCfg =
                  statusColors[log.status] || statusColors.working;

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-[#1a1a1a]/30 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-[#4b5563]">
                      {formattedDate} {formattedTime}
                    </td>

                    {/* Agent Badges */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-block text-[10px] font-bold tracking-widest px-2 py-0.5 border rounded-none uppercase ${agentStyle}`}
                      >
                        {log.agent_name.replace(' Agent', '')}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 text-[9px] font-bold tracking-wider px-2 py-0.5 border ${statusCfg.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
                        {statusCfg.label}
                      </span>
                    </td>

                    {/* Message text */}
                    <td className="px-4 py-3.5 text-[12.5px] font-sans text-gray-300 leading-relaxed max-w-sm truncate hover:text-clip hover:overflow-visible hover:whitespace-normal">
                      {log.message}
                    </td>

                    {/* Duration in ms */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap text-gray-400">
                      {log.duration_ms !== null && log.duration_ms !== undefined ? (
                        <span>{log.duration_ms.toLocaleString()}ms</span>
                      ) : (
                        <span className="text-[#4b5563]">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
