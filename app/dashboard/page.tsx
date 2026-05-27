'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ClientWithDetails, IntakeFormData } from '@/types';
import { ClientSidebar } from '@/components/ClientSidebar';
import { RiskBadge } from '@/components/RiskBadge';
import { HardcodedTimeline } from '@/components/HardcodedTimeline';
import { PlanView } from '@/components/PlanView';
import { ScheduleTab } from '@/components/ScheduleTab';
import { MessagesTab } from '@/components/MessagesTab';
import { AgentLogsTab } from '@/components/AgentLogsTab';
import { NotesTab } from '@/components/NotesTab';
import { AgentFeed } from '@/components/AgentFeed';
import { createBrowserClient } from '@/lib/supabase';

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientQueryId = searchParams.get('client');

  const [clients, setClients] = useState<ClientWithDetails[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(clientQueryId);
  const [clientDetail, setClientDetail] = useState<ClientWithDetails | null>(null);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'PLAN' | 'SCHEDULE' | 'MESSAGES' | 'LOGS' | 'NOTES'>('PLAN');
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [triggerIntakeData, setTriggerIntakeData] = useState<(IntakeFormData & { id?: string }) | null>(null);

  // Sync state with URL parameter
  useEffect(() => {
    setSelectedClientId(clientQueryId);
    setTriggerIntakeData(null); // Cleanly hide overlay on client switch/redirect completion
  }, [clientQueryId]);

  // Fetch client list
  const fetchClientList = useCallback(async () => {
    try {
      const res = await fetch('/api/clients');
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (err) {
      console.error('Error fetching client list:', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  // Fetch individual client details
  const fetchClientDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/clients/${id}`);
      if (res.ok) {
        const data = await res.json();
        setClientDetail(data);
      }
    } catch (err) {
      console.error('Error fetching client details:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  // Initial list fetch
  useEffect(() => {
    fetchClientList();
  }, [fetchClientList]);

  // Fetch client detail on selection
  useEffect(() => {
    if (selectedClientId) {
      fetchClientDetail(selectedClientId);
    } else {
      setClientDetail(null);
    }
  }, [selectedClientId, fetchClientDetail]);

  // Polling logic: fetch client details every 10 seconds if selected
  useEffect(() => {
    if (!selectedClientId) return;

    const interval = setInterval(() => {
      fetchClientDetail(selectedClientId);
      fetchClientList(); // Keep sidebar stats synced too
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedClientId, fetchClientDetail, fetchClientList]);

  const refetchClient = () => {
    if (selectedClientId) {
      fetchClientDetail(selectedClientId);
    }
    fetchClientList();
  };

  async function handleSignOut() {
    try {
      const supabase = createBrowserClient();
      await supabase.auth.signOut();
      router.push('/login');
    } catch {
      router.push('/login');
    }
  }

  // Helper date parsing
  const isToday = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const today = new Date();
      return (
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear()
      );
    } catch {
      return false;
    }
  };

  // General dashboard stats
  const totalClientsCount = clients.length;
  const criticalClientsCount = clients.filter((c) => c.risk_level === 'critical').length;
  
  const appointmentsScheduledToday = clients.reduce((acc, client) => {
    const todayAppts = (client.appointments || []).filter((a) => isToday(a.scheduled_time));
    return acc + todayAppts.length;
  }, 0);

  const smsSentToday = clients.reduce((acc, client) => {
    const todaySMS = (client.sms_log || []).filter(
      (s) => s.direction === 'outbound' && isToday(s.created_at)
    );
    return acc + todaySMS.length;
  }, 0);

  const latestPlan = clientDetail?.service_plans?.[0] || null;

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Left Sidebar */}
      <ClientSidebar
        clients={clients}
        selectedId={selectedClientId}
        onSelect={(id) => {
          setSelectedClientId(id);
          router.push(`/dashboard?client=${id}`);
        }}
        search={search}
        onSearch={setSearch}
      />

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Navbar */}
        <header className="h-[60px] border-b border-[#1a1a1a] bg-[#0c0c0c] px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] uppercase">
              CASE MANAGEMENT
            </span>
          </div>

          <button
            onClick={handleSignOut}
            className="font-mono text-[10px] tracking-[0.2em] font-semibold text-[#6b7280] hover:text-white hover:border-white px-3 py-1.5 border border-[#1a1a1a] transition-all uppercase"
          >
            SIGN OUT
          </button>
        </header>

        {/* Dynamic Inner Container */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 min-h-0">
          {!selectedClientId ? (
            /* Blank State Dashboard stats */
            <div className="max-w-[1000px] mx-auto space-y-12 py-10">
              <div className="text-center space-y-3">
                <h2 className="font-mono text-[14px] tracking-[0.3em] text-[#6b7280] uppercase">
                  CASELOAD OVERVIEW
                </h2>
                <h3 className="text-[22px] font-sans font-medium text-white tracking-wide">
                  Select a client from the sidebar to view their plan
                </h3>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Stat 1 */}
                <div className="border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#2a2a2a] transition-colors">
                  <span className="font-mono text-[10px] text-[#6b7280] tracking-widest uppercase block mb-2">
                    ACTIVE CASES
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-white leading-none">
                      {loadingList ? '...' : totalClientsCount}
                    </span>
                    <span className="text-[12px] text-[#6b7280] font-mono">CLIENTS</span>
                  </div>
                </div>

                {/* Stat 2 */}
                <div className="border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#2a2a2a] transition-colors">
                  <span className="font-mono text-[10px] text-[#ef4444] tracking-widest uppercase block mb-2">
                    CRITICAL URGENT
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-[#ef4444] leading-none">
                      {loadingList ? '...' : criticalClientsCount}
                    </span>
                    <span className="text-[12px] text-[#6b7280] font-mono">ACTIVE</span>
                  </div>
                </div>

                {/* Stat 3 */}
                <div className="border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#2a2a2a] transition-colors">
                  <span className="font-mono text-[10px] text-[#3b82f6] tracking-widest uppercase block mb-2">
                    APPOINTMENTS TODAY
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-[#3b82f6] leading-none">
                      {loadingList ? '...' : appointmentsScheduledToday}
                    </span>
                    <span className="text-[12px] text-[#6b7280] font-mono">EVENTS</span>
                  </div>
                </div>

                {/* Stat 4 */}
                <div className="border border-[#1a1a1a] bg-[#111111] p-6 hover:border-[#2a2a2a] transition-colors">
                  <span className="font-mono text-[10px] text-[#22c55e] tracking-widest uppercase block mb-2">
                    SMS SENT TODAY
                  </span>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold font-mono text-[#22c55e] leading-none">
                      {loadingList ? '...' : smsSentToday}
                    </span>
                    <span className="text-[12px] text-[#6b7280] font-mono">MESSAGES</span>
                  </div>
                </div>
              </div>

              {/* Action Invite */}
              <div className="text-center pt-8 border-t border-[#1a1a1a]">
                <Link
                  href="/intake"
                  className="inline-block font-mono text-[12px] tracking-[0.15em] font-bold px-8 py-4 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 transition-colors uppercase"
                >
                  NEW CLIENT INTAKE
                </Link>
              </div>
            </div>
          ) : (
            /* Selected Client View */
            <div className="max-w-[1200px] mx-auto space-y-6">
              {loadingDetail && !clientDetail ? (
                <div className="flex items-center gap-3 py-20 justify-center">
                  <span className="animate-spin border-2 border-[#3b82f6] border-t-transparent w-5 h-5 rounded-full" />
                  <span className="font-mono text-[12px] text-[#6b7280] uppercase tracking-widest">
                    Loading client details...
                  </span>
                </div>
              ) : clientDetail ? (
                <>
                  {/* Client Header */}
                  <div className="border border-[#1a1a1a] bg-[#111111] p-6 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-3 flex-wrap">
                          <h1 className="text-2xl font-bold text-white font-mono uppercase tracking-wide leading-none">
                            {clientDetail.name}
                          </h1>
                          <RiskBadge
                            level={clientDetail.risk_level}
                            score={clientDetail.risk_score}
                            size="lg"
                          />
                        </div>
                        <p className="font-mono text-[11px] text-[#6b7280] uppercase">
                          📍 {clientDetail.city}, {clientDetail.state} · RELEASED{' '}
                          {new Date(clientDetail.release_date).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Approval badge */}
                      <div className="flex items-center gap-2">
                        {latestPlan?.worker_approved ? (
                          <span className="font-mono text-[10px] font-bold tracking-widest px-3 py-1 bg-green-950/40 border border-green-800 text-green-400">
                            APPROVED PLAN
                          </span>
                        ) : (
                          <span className="font-mono text-[10px] font-bold tracking-widest px-3 py-1 bg-amber-950/40 border border-amber-800 text-amber-400">
                            PLAN PENDING REVIEW
                          </span>
                        )}
                        {clientDetail.phone_number && (
                          <span className="font-mono text-[10px] font-bold tracking-widest px-3 py-1 bg-blue-950/40 border border-blue-800 text-blue-400">
                            📱 {clientDetail.phone_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tabs Navigator */}
                  <div className="border-b border-[#1a1a1a] flex flex-wrap gap-x-6 gap-y-2">
                    {(
                      [
                        { id: 'PLAN', label: '72-HOUR PLAN' },
                        { id: 'SCHEDULE', label: 'SCHEDULE' },
                        { id: 'MESSAGES', label: 'MESSAGES' },
                        { id: 'LOGS', label: 'AGENT LOGS' },
                        { id: 'NOTES', label: 'NOTES' },
                      ] as const
                    ).map((tab) => {
                      const isTabActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`font-mono text-[11px] font-bold tracking-[0.2em] py-3.5 border-b-2 transition-all uppercase ${
                            isTabActive
                              ? 'text-white border-white'
                              : 'text-[#6b7280] border-transparent hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Tab Details Renderers */}
                  <div className="pt-4">
                    {activeTab === 'PLAN' && (
                      <div>
                        {latestPlan ? (
                          <PlanView
                            plan={latestPlan.plan_json}
                            clientId={clientDetail.id}
                            workerApproved={latestPlan.worker_approved}
                            onPlanApproved={refetchClient}
                          />
                        ) : (
                          <div className="space-y-12">
                            <div className="border border-[#1a1a1a] bg-[#111111] p-12 text-center space-y-4">
                              <p className="font-mono text-[12px] tracking-widest text-[#6b7280] uppercase">
                                NO REENTRY PLAN GENERATED YET
                              </p>
                              <button
                                onClick={() => {
                                  setTriggerIntakeData({
                                    id: clientDetail.id,
                                    name: clientDetail.name,
                                    release_date: clientDetail.release_date,
                                    city: clientDetail.city,
                                    state: clientDetail.state,
                                    phone_number: clientDetail.phone_number || '',
                                    has_id: clientDetail.has_id,
                                    housing_status: clientDetail.housing_status,
                                    medical_conditions: clientDetail.medical_conditions || '',
                                    prior_charges: clientDetail.prior_charges || '',
                                  });
                                }}
                                className="inline-block font-mono text-[11px] tracking-widest px-4 py-2 border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors uppercase font-bold"
                              >
                                START INTAKE PIPELINE
                              </button>
                            </div>
                            
                            {/* Hardcoded 72-hour view for visual testing */}
                            <div className="pt-4 border-t border-[#1a1a1a]">
                              <p className="text-[#6b7280] text-[12px] font-mono mb-8 uppercase tracking-widest">
                                ↓ Mock View (Preview of generated plan layout) ↓
                              </p>
                              <HardcodedTimeline />
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'SCHEDULE' && (
                      <ScheduleTab
                        appointments={clientDetail.appointments || []}
                        clientId={clientDetail.id}
                        onRefresh={refetchClient}
                      />
                    )}

                    {activeTab === 'MESSAGES' && (
                      <MessagesTab
                        messages={clientDetail.sms_log || []}
                        clientId={clientDetail.id}
                        clientPhone={clientDetail.phone_number}
                        onRefresh={refetchClient}
                      />
                    )}

                    {activeTab === 'LOGS' && (
                      <AgentLogsTab logs={clientDetail.agent_logs || []} />
                    )}

                    {activeTab === 'NOTES' && (
                      <NotesTab
                        notes={latestPlan?.plan_json?.caseworker_notes || ''}
                        planId={latestPlan?.id || null}
                        onSaved={refetchClient}
                      />
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center font-mono text-[12px] text-[#ef4444] uppercase py-20">
                  Could not load client data. Please try again.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {triggerIntakeData && (
        <AgentFeed intakeData={triggerIntakeData} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center font-mono text-[11px] tracking-widest text-[#6b7280] uppercase">
          Loading ReEntryOS...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
