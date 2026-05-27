'use client';

import { useState } from 'react';
import { ServicePlanJSON, UrgentNeed } from '@/types';
import { UrgentNeedCard } from '@/components/UrgentNeedCard';
import { HousingCard } from '@/components/HousingCard';
import { BenefitsRow } from '@/components/BenefitsRow';
import { ResourceGrid } from '@/components/ResourceGrid';
import { AppointmentModal } from '@/components/AppointmentModal';

interface PlanViewProps {
  plan: ServicePlanJSON;
  clientId: string;
  onPlanApproved: () => void;
  workerApproved: boolean;
}

export function PlanView({
  plan,
  clientId,
  onPlanApproved,
  workerApproved,
}: PlanViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [prefill, setPrefill] = useState<{
    title?: string;
    address?: string;
    notes?: string;
  } | undefined>(undefined);
  const [isApproving, setIsApproving] = useState(false);
  const [approveError, setApproveError] = useState('');
  const [copied, setCopied] = useState(false);

  function handleSchedule(need: UrgentNeed) {
    setPrefill({
      title: need.action,
      address: need.resource.address,
      notes: `Urgent Action: ${need.why}\nContact: ${need.resource.phone}\nHours: ${need.resource.hours}`,
    });
    setIsModalOpen(true);
  }

  async function handleApprove() {
    setIsApproving(true);
    setApproveError('');
    try {
      const res = await fetch(`/api/clients/${clientId}/approve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve plan');
      }
      onPlanApproved();
    } catch (err) {
      setApproveError(String(err));
    } finally {
      setIsApproving(false);
    }
  }

  function handleCopyNotes() {
    navigator.clipboard.writeText(plan.caseworker_notes || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-10 pb-20">
      {/* Appointment Modal */}
      <AppointmentModal
        clientId={clientId}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setPrefill(undefined);
        }}
        onCreated={() => {
          // You could optionally trigger a callback, but onCreated in ScheduleTab usually triggers onRefresh
        }}
        prefill={prefill}
      />

      {/* Section 1 — URGENT NEEDS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-[#ef4444] font-mono text-[14px]">01 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            URGENT NEEDS
          </h2>
        </div>
        {plan.urgent_needs && plan.urgent_needs.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {plan.urgent_needs.map((need, idx) => (
              <UrgentNeedCard
                key={idx}
                need={need}
                onSchedule={handleSchedule}
              />
            ))}
          </div>
        ) : (
          <p className="text-[#6b7280] font-mono text-[11px] uppercase">
            NO URGENT NEEDS IDENTIFIED
          </p>
        )}
      </section>

      {/* Section 2 — HOUSING OPTIONS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-[#f59e0b] font-mono text-[14px]">02 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            HOUSING OPTIONS
          </h2>
        </div>
        {plan.housing_options && plan.housing_options.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {plan.housing_options.map((option, idx) => (
              <HousingCard key={idx} option={option} rank={idx + 1} />
            ))}
          </div>
        ) : (
          <p className="text-[#6b7280] font-mono text-[11px] uppercase">
            NO HOUSING OPTIONS PROVIDED
          </p>
        )}
      </section>

      {/* Section 3 — BENEFITS ELIGIBILITY */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-[#22c55e] font-mono text-[14px]">03 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            BENEFITS ELIGIBILITY
          </h2>
        </div>
        {plan.benefits_eligibility && plan.benefits_eligibility.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {plan.benefits_eligibility.map((benefit, idx) => (
              <BenefitsRow key={idx} benefit={benefit} />
            ))}
          </div>
        ) : (
          <p className="text-[#6b7280] font-mono text-[11px] uppercase">
            NO BENEFITS SCREENING AVAILABLE
          </p>
        )}
      </section>

      {/* Section 4 — ID RECOVERY */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-[#3b82f6] font-mono text-[14px]">04 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            ID RECOVERY SEQUENCE
          </h2>
        </div>
        {plan.id_recovery ? (
          <div className="border border-[#1a1a1a] bg-[#111111] p-5 space-y-4">
            <div>
              <h4 className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2 uppercase">
                REQUIRED DOCUMENTS
              </h4>
              <div className="flex flex-wrap gap-2">
                {plan.id_recovery.required_documents.map((doc, idx) => (
                  <span
                    key={idx}
                    className="font-mono text-[10px] tracking-widest px-2 py-0.5 bg-[#0a0a0a] border border-[#1a1a1a] text-[#9ca3af] rounded-none"
                  >
                    {doc.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-mono text-[11px] tracking-widest text-[#6b7280] mb-2 uppercase">
                STEPS REQUIRED
              </h4>
              <ol className="list-decimal list-inside space-y-2 text-[13px] text-[#e5e7eb]">
                {plan.id_recovery.steps.map((step, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[#1a1a1a]">
              <div>
                <span className="font-mono text-[11px] text-[#6b7280] tracking-widest uppercase block mb-1">
                  NEAREST DMV
                </span>
                <p className="text-white text-[13px] font-medium">{plan.id_recovery.nearest_dmv}</p>
                <p className="text-[#6b7280] text-[12px]">{plan.id_recovery.nearest_dmv_address}</p>
              </div>
              {plan.id_recovery.nearest_vital_records && (
                <div>
                  <span className="font-mono text-[11px] text-[#6b7280] tracking-widest uppercase block mb-1">
                    NEAREST VITAL RECORDS OFFICE
                  </span>
                  <p className="text-white text-[13px] font-medium">{plan.id_recovery.nearest_vital_records}</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="text-[#6b7280] font-mono text-[11px] uppercase">
            NO ID RECOVERY STEPS DEFINED
          </p>
        )}
      </section>

      {/* Section 5 — NEARBY RESOURCES */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-white font-mono text-[14px]">05 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            NEARBY RESOURCES
          </h2>
        </div>
        {plan.nearby_resources ? (
          <ResourceGrid resources={plan.nearby_resources} />
        ) : (
          <p className="text-[#6b7280] font-mono text-[11px] uppercase">
            NO NEARBY RESOURCES AVAILABLE
          </p>
        )}
      </section>

      {/* Section 6 — SECOND CHANCE EMPLOYERS */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-[#a78bfa] font-mono text-[14px]">06 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            SECOND CHANCE EMPLOYERS
          </h2>
        </div>
        {plan.second_chance_employers && plan.second_chance_employers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plan.second_chance_employers.map((emp, idx) => (
              <div
                key={idx}
                className="bg-[#111111] border border-[#1a1a1a] p-4 flex flex-col justify-between hover:border-[#2a2a2a] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="text-white font-medium text-[13.5px] leading-tight">
                      {emp.name}
                    </h4>
                    {emp.verified && (
                      <span className="flex-shrink-0 font-mono text-[9px] px-1.5 py-0.5 border border-green-800 bg-green-950/40 text-green-400 tracking-wider">
                        VERIFIED
                      </span>
                    )}
                  </div>
                  <span className="inline-block font-mono text-[10px] bg-purple-900/30 text-purple-300 border border-purple-800 px-2 py-0.5 mb-3 uppercase tracking-wider">
                    {emp.industry}
                  </span>
                </div>
                <div className="text-[12px] text-[#6b7280] space-y-0.5">
                  <p>{emp.address}</p>
                  {emp.phone && <p>{emp.phone}</p>}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[#6b7280] font-mono text-[11px] uppercase">
            NO SECOND CHANCE EMPLOYERS IDENTIFIED
          </p>
        )}
      </section>

      {/* Section 7 — CASEWORKER NOTES */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-[#1a1a1a] pb-2">
          <span className="text-[#3b82f6] font-mono text-[14px]">07 //</span>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            CASEWORKER NOTES
          </h2>
        </div>
        <div className="border border-[#1a1a1a] bg-[#111111] p-5 relative">
          {/* Copy Button */}
          <button
            onClick={handleCopyNotes}
            className="absolute top-4 right-4 font-mono text-[10px] tracking-widest border border-[#1a1a1a] px-3 py-1 text-[#6b7280] hover:text-white hover:border-[#374151] transition-colors uppercase"
          >
            {copied ? 'COPIED ✓' : 'COPY'}
          </button>

          <div className="pr-16 text-[13.5px] leading-relaxed text-[#d1d5db] font-sans whitespace-pre-wrap">
            {plan.caseworker_notes || 'No caseworker notes generated.'}
          </div>

          <div className="mt-6 pt-4 border-t border-[#1a1a1a] flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              {workerApproved ? (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest font-semibold px-3 py-1 bg-green-950/40 border border-green-800 text-green-400 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                  PLAN APPROVED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-widest font-semibold px-3 py-1 bg-amber-950/40 border border-amber-800 text-amber-400 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  PENDING REVIEW
                </span>
              )}
              {approveError && (
                <span className="font-mono text-[11px] text-[#ef4444] ml-2">
                  ERROR: {approveError}
                </span>
              )}
            </div>

            {!workerApproved && (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                className="font-mono text-[11px] tracking-widest font-bold px-5 py-2.5 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 transition-colors disabled:opacity-50 uppercase"
              >
                {isApproving ? 'APPROVING...' : 'APPROVE PLAN'}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
