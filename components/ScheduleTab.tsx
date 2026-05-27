'use client';

import { useState } from 'react';
import { Appointment } from '@/types';
import { AppointmentModal } from '@/components/AppointmentModal';

interface ScheduleTabProps {
  appointments: Appointment[];
  clientId: string;
  onRefresh: () => void;
}

export function ScheduleTab({
  appointments,
  clientId,
  onRefresh,
}: ScheduleTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Sort appointments chronologically
  const sortedAppointments = [...appointments].sort(
    (a, b) =>
      new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime()
  );

  return (
    <div className="space-y-6 pb-20">
      {/* Appointment Modal */}
      <AppointmentModal
        clientId={clientId}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={onRefresh}
      />

      {/* Header and Controls */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
        <div>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            SCHEDULED APPOINTMENTS
          </h2>
          <p className="text-[#6b7280] font-mono text-[10px] uppercase mt-1">
            {appointments.length} Total Registered Events
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="font-mono text-[11px] tracking-widest font-bold px-4 py-2 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 transition-colors uppercase"
        >
          ADD APPOINTMENT
        </button>
      </div>

      {/* Appointments List */}
      {sortedAppointments.length === 0 ? (
        <div className="border border-[#1a1a1a] bg-[#111111] p-12 text-center">
          <p className="font-mono text-[12px] tracking-widest text-[#6b7280] uppercase mb-4">
            NO APPOINTMENTS SCHEDULED
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="font-mono text-[11px] tracking-widest px-3 py-1.5 border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 transition-colors uppercase"
          >
            CREATE APPOINTMENT
          </button>
        </div>
      ) : (
        <div className="border border-[#1a1a1a] bg-[#111111] divide-y divide-[#1a1a1a]">
          {sortedAppointments.map((appt) => {
            const dateObj = new Date(appt.scheduled_time);
            const formattedTime = dateObj.toLocaleString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={appt.id}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#111111]/80 transition-all"
              >
                {/* Details */}
                <div className="space-y-1">
                  <h3 className="text-white font-medium text-[15px] font-sans tracking-wide">
                    {appt.title || 'Untitled Event'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-[11px] text-[#6b7280]">
                    <span className="text-[#3b82f6] tabular-nums">{formattedTime}</span>
                    {appt.location && (
                      <span>
                        📍 {appt.location}
                        {appt.address && ` (${appt.address})`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Badges & Actions */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Google Calendar sync status */}
                  {appt.calendar_event_id ? (
                    <span className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 bg-green-950/40 border border-green-800 text-green-400">
                      SYNCED
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 bg-amber-950/40 border border-amber-800 text-amber-400">
                      CALENDAR PENDING
                    </span>
                  )}

                  {/* SMS Notify status */}
                  {appt.sms_sent ? (
                    <span className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 bg-green-950/40 border border-green-800 text-green-400">
                      SMS SENT
                    </span>
                  ) : (
                    <span className="font-mono text-[10px] font-bold tracking-widest px-2 py-0.5 bg-gray-800 border border-gray-700 text-gray-400">
                      SMS PENDING
                    </span>
                  )}

                  {/* Calendar Event Link */}
                  {appt.calendar_event_link && (
                    <a
                      href={appt.calendar_event_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-[11px] tracking-widest border border-[#3b82f6] text-[#3b82f6] hover:bg-[#3b82f6]/10 px-3 py-1 transition-colors uppercase font-bold"
                    >
                      VIEW
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
