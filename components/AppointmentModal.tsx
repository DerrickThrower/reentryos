'use client';

import { useState } from 'react';

interface AppointmentModalProps {
  clientId: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  prefill?: {
    title?: string;
    address?: string;
    notes?: string;
  };
}

export function AppointmentModal({
  clientId,
  isOpen,
  onClose,
  onCreated,
  prefill,
}: AppointmentModalProps) {
  const [form, setForm] = useState({
    title: prefill?.title || '',
    scheduled_time: '',
    location: '',
    address: prefill?.address || '',
    notes: prefill?.notes || '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  function update(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function submit() {
    if (!form.title || !form.scheduled_time) {
      setError('Title and date/time are required.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/appointments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create appointment');
      const calStatus = data.calendar_synced ? 'Calendar event created' : 'Calendar sync pending';
      const smsStatus = data.sms_sent ? '+ SMS sent' : '';
      setSuccess(`Appointment created. ${calStatus} ${smsStatus}.`);
      setTimeout(() => {
        onCreated();
        onClose();
      }, 1500);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-[#111111] border border-[#1a1a1a] w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase">
            Add Appointment
          </h2>
          <button
            onClick={onClose}
            className="text-[#6b7280] hover:text-white transition-colors font-mono text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono text-[11px] tracking-widest text-[#6b7280] block mb-1">
              TITLE *
            </label>
            <input
              value={form.title}
              onChange={(e) => update('title', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#3b82f6]"
              placeholder="Medicaid Enrollment"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-widest text-[#6b7280] block mb-1">
              DATE & TIME *
            </label>
            <input
              type="datetime-local"
              value={form.scheduled_time}
              onChange={(e) => update('scheduled_time', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#3b82f6]"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-widest text-[#6b7280] block mb-1">
              LOCATION NAME
            </label>
            <input
              value={form.location}
              onChange={(e) => update('location', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#3b82f6]"
              placeholder="Sacramento County Benefits Office"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-widest text-[#6b7280] block mb-1">
              ADDRESS
            </label>
            <input
              value={form.address}
              onChange={(e) => update('address', e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#3b82f6]"
              placeholder="2450 Venture Oaks Way, Sacramento, CA"
            />
          </div>

          <div>
            <label className="font-mono text-[11px] tracking-widest text-[#6b7280] block mb-1">
              NOTES
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white text-[13px] px-3 py-2 focus:outline-none focus:border-[#3b82f6]"
              placeholder="Bring release paperwork..."
            />
          </div>
        </div>

        {error && <p className="text-red-400 font-mono text-[11px] mt-3">{error}</p>}
        {success && <p className="text-green-400 font-mono text-[11px] mt-3">{success}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            className="flex-1 font-mono text-[11px] tracking-widest px-4 py-2.5 border border-[#1a1a1a] text-[#6b7280] hover:border-[#374151] hover:text-white transition-colors"
          >
            CANCEL
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 font-mono text-[11px] tracking-widest px-4 py-2.5 bg-[#3b82f6] text-white hover:bg-blue-500 transition-colors disabled:opacity-50"
          >
            {loading ? 'CREATING...' : 'CONFIRM'}
          </button>
        </div>
      </div>
    </div>
  );
}
