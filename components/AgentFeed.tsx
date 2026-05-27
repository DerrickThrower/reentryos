'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentEvent, ServicePlanJSON } from '@/types';
import { IntakeFormData } from '@/types';

interface AgentFeedProps {
  intakeData: IntakeFormData;
}

const agentColors: Record<string, { bg: string; text: string; label: string }> = {
  Orchestrator: { bg: '#7c3aed', text: '#ffffff', label: 'ORCHESTRATOR' },
  'Search Agent': { bg: '#1d4ed8', text: '#ffffff', label: 'SEARCH' },
  'Benefits Agent': { bg: '#b45309', text: '#ffffff', label: 'BENEFITS' },
  'Housing Agent': { bg: '#15803d', text: '#ffffff', label: 'HOUSING' },
  'Risk Agent': { bg: '#b91c1c', text: '#ffffff', label: 'RISK' },
  'Plan Agent': { bg: '#0f766e', text: '#ffffff', label: 'PLAN' },
  'Calendar Agent': { bg: '#4338ca', text: '#ffffff', label: 'CALENDAR' },
  'SMS Agent': { bg: '#047857', text: '#ffffff', label: 'SMS' },
  'Documentation Agent': { bg: '#374151', text: '#ffffff', label: 'DOCS' },
};

interface PlanPreview {
  riskScore: number | null;
  riskLevel: string | null;
  topHousing: string | null;
  benefitsCount: number | null;
  urgentCount: number | null;
  appointmentCount: number | null;
  smsScheduled: boolean;
  clientId: string | null;
  planId: string | null;
}

export function AgentFeed({ intakeData }: AgentFeedProps) {
  const [events, setEvents] = useState<(AgentEvent & { elapsed: number })[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [preview, setPreview] = useState<PlanPreview>({
    riskScore: null,
    riskLevel: null,
    topHousing: null,
    benefitsCount: null,
    urgentCount: null,
    appointmentCount: null,
    smsScheduled: false,
    clientId: null,
    planId: null,
  });
  const [activeAgents, setActiveAgents] = useState<Set<string>>(new Set());
  const [navClientId, setNavClientId] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);
  const startTimeRef = useRef<number>(Date.now());
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function run() {
      try {
        const response = await fetch('/api/intake/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(intakeData),
        });

        if (!response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            try {
              const raw = JSON.parse(line.slice(6)) as AgentEvent & { risk_score?: number; risk_level?: string };
              const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);

              setEvents((prev) => [...prev, { ...raw, elapsed }]);

              // Track active agents
              if (raw.status === 'working') {
                setActiveAgents((s) => new Set([...s, raw.agent]));
              } else {
                setActiveAgents((s) => {
                  const next = new Set(s);
                  next.delete(raw.agent);
                  return next;
                });
              }

              // Update preview from event data
              const d = raw as any;
              if (d.client_id) setNavClientId(d.client_id);

              setPreview((p) => {
                const next = { ...p };
                if (d.client_id) next.clientId = d.client_id;
                if (d.plan_id) next.planId = d.plan_id;
                if (d.risk_score !== undefined && d.risk_score !== null) next.riskScore = d.risk_score;
                if (d.risk_level) next.riskLevel = d.risk_level;
                if (d.housing_options?.length) next.topHousing = d.housing_options[0]?.name || null;
                if (d.benefits_eligibility?.length) next.benefitsCount = d.benefits_eligibility.filter((b: any) => b.likely_eligible).length;
                if (d.urgent_needs?.length) next.urgentCount = d.urgent_needs.length;
                if (d.appointments?.length) next.appointmentCount = d.appointments.length;
                return next;
              });

              // Risk agent done — we get risk data from event
              if (raw.agent === 'Risk Agent' && raw.status === 'done') {
                const msgMatch = raw.message.match(/Risk score: (\d+)\/100/);
                if (msgMatch) {
                  setPreview((p) => ({ ...p, riskScore: parseInt(msgMatch[1]) }));
                }
              }

              // SMS done
              if (raw.agent === 'SMS Agent' && raw.status === 'done' && raw.message.includes('scheduled')) {
                setPreview((p) => ({ ...p, smsScheduled: true }));
              }

              // Calendar done — count appointments
              if (raw.agent === 'Calendar Agent' && raw.status === 'done') {
                setPreview((p) => ({
                  ...p,
                  appointmentCount: (p.appointmentCount || 0) + 1,
                }));
              }

              // All done
              if (raw.agent === 'Orchestrator' && raw.status === 'done' && raw.message.includes('All agents complete')) {
                const d2 = raw as { client_id?: string } | undefined;
                if (d2?.client_id) {
                  setNavClientId(d2.client_id);
                  setPreview((p) => ({ ...p, clientId: d2.client_id! }));
                }
                setIsComplete(true);
                setShowBanner(true);
              }
            } catch {
              // Ignore parse errors
            }
          }
        }
      } catch (err) {
        console.error('SSE error:', err);
        setEvents((prev) => [
          ...prev,
          {
            agent: 'Orchestrator',
            status: 'error',
            message: `Connection error: ${String(err)}`,
            timestamp: new Date().toISOString(),
            elapsed: Math.floor((Date.now() - startTimeRef.current) / 1000),
          },
        ]);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [intakeData]);

  // Auto-scroll feed
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = feedRef.current.scrollHeight;
    }
  }, [events]);

  // Navigate after banner
  useEffect(() => {
    if (showBanner && navClientId) {
      const timer = setTimeout(() => {
        router.push(`/dashboard?client=${navClientId}`);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [showBanner, navClientId, router]);

  const riskColors: Record<string, string> = {
    critical: 'text-red-400',
    warning: 'text-amber-400',
    stable: 'text-green-400',
  };

  return (
    <div className="fixed inset-0 bg-[#0a0a0a] flex z-50">
      {/* Plan Complete Banner */}
      {showBanner && (
        <div className="absolute top-0 left-0 right-0 z-10 bg-green-700 border-b border-green-600 py-3 px-6 text-center font-mono text-[13px] tracking-widest text-white banner-enter">
          PLAN COMPLETE — OPENING DASHBOARD
        </div>
      )}

      {/* Left: Preview panel (60%) */}
      <div className="w-[60%] border-r border-[#1a1a1a] flex flex-col p-8 overflow-y-auto">
        <div className="mb-8">
          <p className="font-mono text-[11px] tracking-widest text-[#4b5563] mb-1">REENTRY COORDINATION</p>
          <h1 className="text-3xl font-bold text-white">{intakeData.name}</h1>
          <p className="text-[#6b7280] text-[13px] mt-1">
            {intakeData.city}, {intakeData.state} · Released {new Date(intakeData.release_date).toLocaleDateString()}
          </p>
        </div>

        <div className="space-y-4">
          {/* Risk Score */}
          <div className={`border border-[#1a1a1a] bg-[#111111] p-5 transition-opacity duration-500 ${preview.riskScore !== null ? 'opacity-100' : 'opacity-30'}`}>
            <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2">RISK SCORE</p>
            {preview.riskScore !== null ? (
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-bold font-mono ${riskColors[preview.riskLevel || 'stable'] || 'text-white'}`}>
                  {preview.riskScore}
                </span>
                <span className="text-[#6b7280] font-mono text-lg">/100</span>
                <span
                  className={`font-mono text-sm tracking-widest px-3 py-1 border rounded ${
                    preview.riskLevel === 'critical'
                      ? 'border-red-700 bg-red-900/30 text-red-400'
                      : preview.riskLevel === 'warning'
                      ? 'border-amber-700 bg-amber-900/30 text-amber-400'
                      : 'border-green-700 bg-green-900/30 text-green-400'
                  }`}
                >
                  {(preview.riskLevel || 'CALCULATING').toUpperCase()}
                </span>
              </div>
            ) : (
              <div className="h-12 flex items-center">
                <div className="spinner" />
                <span className="font-mono text-[12px] text-[#4b5563] ml-3">Calculating risk score...</span>
              </div>
            )}
          </div>

          {/* Housing */}
          <div className={`border border-[#1a1a1a] bg-[#111111] p-4 transition-opacity duration-500 ${preview.topHousing ? 'opacity-100' : 'opacity-30'}`}>
            <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2">TOP HOUSING OPTION</p>
            {preview.topHousing ? (
              <p className="text-white text-[14px] font-medium">{preview.topHousing}</p>
            ) : (
              <p className="text-[#4b5563] text-[13px] font-mono">Searching housing resources...</p>
            )}
          </div>

          {/* Benefits & Urgent Needs row */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`border border-[#1a1a1a] bg-[#111111] p-4 transition-opacity duration-500 ${preview.benefitsCount !== null ? 'opacity-100' : 'opacity-30'}`}>
              <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2">BENEFITS</p>
              {preview.benefitsCount !== null ? (
                <p className="text-white text-[24px] font-bold font-mono">
                  {preview.benefitsCount} <span className="text-[13px] text-[#6b7280] font-normal">eligible</span>
                </p>
              ) : (
                <p className="text-[#4b5563] text-[13px] font-mono">Analyzing...</p>
              )}
            </div>
            <div className={`border border-[#1a1a1a] bg-[#111111] p-4 transition-opacity duration-500 ${preview.urgentCount !== null ? 'opacity-100' : 'opacity-30'}`}>
              <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2">URGENT ACTIONS</p>
              {preview.urgentCount !== null ? (
                <p className="text-white text-[24px] font-bold font-mono">
                  {preview.urgentCount} <span className="text-[13px] text-[#6b7280] font-normal">identified</span>
                </p>
              ) : (
                <p className="text-[#4b5563] text-[13px] font-mono">Planning...</p>
              )}
            </div>
          </div>

          {/* Appointments & SMS row */}
          <div className="grid grid-cols-2 gap-4">
            <div className={`border border-[#1a1a1a] bg-[#111111] p-4 transition-opacity duration-500 ${preview.appointmentCount ? 'opacity-100' : 'opacity-30'}`}>
              <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2">
                📅 APPOINTMENTS
              </p>
              {preview.appointmentCount ? (
                <p className="text-white text-[24px] font-bold font-mono">
                  {preview.appointmentCount} <span className="text-[13px] text-[#6b7280] font-normal">scheduled</span>
                </p>
              ) : (
                <p className="text-[#4b5563] text-[13px] font-mono">Scheduling...</p>
              )}
            </div>
            <div className={`border border-[#1a1a1a] bg-[#111111] p-4 transition-opacity duration-500 ${preview.smsScheduled ? 'opacity-100' : 'opacity-30'}`}>
              <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2">
                📱 SMS SEQUENCE
              </p>
              {preview.smsScheduled ? (
                <p className="text-white text-[14px] font-medium">5 messages scheduled</p>
              ) : (
                <p className="text-[#4b5563] text-[13px] font-mono">Queuing messages...</p>
              )}
            </div>
          </div>

          {/* Client details */}
          <div className="border border-[#1a1a1a] bg-[#111111] p-4">
            <p className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-3">CLIENT PROFILE</p>
            <div className="grid grid-cols-2 gap-y-2 text-[13px]">
              <span className="text-[#6b7280]">Housing</span>
              <span className={intakeData.housing_status === 'none' ? 'text-red-400' : intakeData.housing_status === 'temporary' ? 'text-amber-400' : 'text-green-400'}>
                {intakeData.housing_status.toUpperCase()}
              </span>
              <span className="text-[#6b7280]">Government ID</span>
              <span className={intakeData.has_id ? 'text-green-400' : 'text-red-400'}>
                {intakeData.has_id ? 'YES' : 'NO'}
              </span>
              <span className="text-[#6b7280]">Medical Needs</span>
              <span className="text-white">{intakeData.medical_conditions || 'None reported'}</span>
              <span className="text-[#6b7280]">Phone</span>
              <span className="text-white">{intakeData.phone_number || 'Not provided'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Agent Feed (40%) */}
      <div className="w-[40%] bg-[#0a0a0a] flex flex-col">
        {/* Header */}
        <div className="border-b border-[#1a1a1a] px-5 py-4 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full bg-green-500 ${activeAgents.size > 0 ? 'dot-pulse' : ''}`}
            />
            <span className="font-mono text-[12px] tracking-[0.2em] text-white">
              REENTRYOS AGENTS
            </span>
          </div>
          <span className="ml-auto font-mono text-[11px] text-[#4b5563]">
            {activeAgents.size > 0 ? `${activeAgents.size} ACTIVE` : isComplete ? 'COMPLETE' : 'IDLE'}
          </span>
        </div>

        {/* Feed */}
        <div ref={feedRef} className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
          {events.length === 0 && (
            <div className="flex items-center gap-2 py-4">
              <div className="spinner" />
              <span className="font-mono text-[12px] text-[#4b5563]">Initializing pipeline...</span>
            </div>
          )}

          {events.map((ev, i) => {
            const cfg = agentColors[ev.agent] || agentColors.Orchestrator;
            const isWorking = ev.status === 'working';

            return (
              <div
                key={i}
                className={`flex items-start gap-2.5 agent-row-enter ${isWorking ? 'agent-working' : ''}`}
              >
                {/* Agent badge */}
                <span
                  className="flex-shrink-0 font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 rounded"
                  style={{ backgroundColor: cfg.bg, color: cfg.text }}
                >
                  {cfg.label}
                </span>

                {/* Status indicator */}
                <span className="flex-shrink-0 mt-0.5">
                  {isWorking ? (
                    <span className="spinner" />
                  ) : ev.status === 'done' ? (
                    <span className="text-green-500 text-[11px]">✓</span>
                  ) : (
                    <span className="text-red-500 text-[11px]">✕</span>
                  )}
                </span>

                {/* Message */}
                <span className="flex-1 font-mono text-[12px] text-[#9ca3af] leading-relaxed">
                  {ev.message}
                </span>

                {/* Elapsed */}
                <span className="flex-shrink-0 font-mono text-[11px] text-[#4b5563] tabular-nums">
                  {ev.elapsed}s
                </span>
              </div>
            );
          })}
        </div>

        {/* Progress footer */}
        <div className="border-t border-[#1a1a1a] px-5 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[11px] text-[#4b5563]">PIPELINE PROGRESS</span>
            <span className="font-mono text-[11px] text-[#4b5563]">
              {isComplete ? '100%' : `${Math.min(Math.round((events.filter((e) => e.status === 'done').length / 18) * 100), 99)}%`}
            </span>
          </div>
          <div className="w-full h-1 bg-[#1a1a1a] rounded overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-500"
              style={{
                width: isComplete
                  ? '100%'
                  : `${Math.min(Math.round((events.filter((e) => e.status === 'done').length / 18) * 100), 99)}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
