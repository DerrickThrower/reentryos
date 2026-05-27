'use client';

import { useState } from 'react';
import Link from 'next/link';
import { IntakeFormData } from '@/types';
import { AgentFeed } from '@/components/AgentFeed';

const US_STATES = [
  { name: 'Alabama', code: 'AL' },
  { name: 'Alaska', code: 'AK' },
  { name: 'Arizona', code: 'AZ' },
  { name: 'Arkansas', code: 'AR' },
  { name: 'California', code: 'CA' },
  { name: 'Colorado', code: 'CO' },
  { name: 'Connecticut', code: 'CT' },
  { name: 'Delaware', code: 'DE' },
  { name: 'District of Columbia', code: 'DC' },
  { name: 'Florida', code: 'FL' },
  { name: 'Georgia', code: 'GA' },
  { name: 'Hawaii', code: 'HI' },
  { name: 'Idaho', code: 'ID' },
  { name: 'Illinois', code: 'IL' },
  { name: 'Indiana', code: 'IN' },
  { name: 'Iowa', code: 'IA' },
  { name: 'Kansas', code: 'KS' },
  { name: 'Kentucky', code: 'KY' },
  { name: 'Louisiana', code: 'LA' },
  { name: 'Maine', code: 'ME' },
  { name: 'Maryland', code: 'MD' },
  { name: 'Massachusetts', code: 'MA' },
  { name: 'Michigan', code: 'MI' },
  { name: 'Minnesota', code: 'MN' },
  { name: 'Mississippi', code: 'MS' },
  { name: 'Missouri', code: 'MO' },
  { name: 'Montana', code: 'MT' },
  { name: 'Nebraska', code: 'NE' },
  { name: 'Nevada', code: 'NV' },
  { name: 'New Hampshire', code: 'NH' },
  { name: 'New Jersey', code: 'NJ' },
  { name: 'New Mexico', code: 'NM' },
  { name: 'New York', code: 'NY' },
  { name: 'North Carolina', code: 'NC' },
  { name: 'North Dakota', code: 'ND' },
  { name: 'Ohio', code: 'OH' },
  { name: 'Oklahoma', code: 'OK' },
  { name: 'Oregon', code: 'OR' },
  { name: 'Pennsylvania', code: 'PA' },
  { name: 'Rhode Island', code: 'RI' },
  { name: 'South Carolina', code: 'SC' },
  { name: 'South Dakota', code: 'SD' },
  { name: 'Tennessee', code: 'TN' },
  { name: 'Texas', code: 'TX' },
  { name: 'Utah', code: 'UT' },
  { name: 'Vermont', code: 'VT' },
  { name: 'Virginia', code: 'VA' },
  { name: 'Washington', code: 'WA' },
  { name: 'West Virginia', code: 'WV' },
  { name: 'Wisconsin', code: 'WI' },
  { name: 'Wyoming', code: 'WY' },
];

export default function IntakePage() {
  const [form, setForm] = useState({
    name: '',
    release_date: new Date().toISOString().split('T')[0],
    city: '',
    state: '',
    phone_number: '',
    has_id: false,
    housing_status: 'none' as 'none' | 'temporary' | 'stable',
    medical_conditions: '',
    prior_charges: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [intakeData, setIntakeData] = useState<IntakeFormData | null>(null);

  function update(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((errs) => {
        const next = { ...errs };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};

    if (!form.name.trim()) nextErrors.name = 'Client Name is required.';
    if (!form.release_date) nextErrors.release_date = 'Release Date is required.';
    if (!form.city.trim()) nextErrors.city = 'City is required.';
    if (!form.state) nextErrors.state = 'State is required.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    setIntakeData({
      name: form.name.trim(),
      release_date: form.release_date,
      city: form.city.trim(),
      state: form.state,
      phone_number: form.phone_number.trim(),
      has_id: form.has_id,
      housing_status: form.housing_status,
      medical_conditions: form.medical_conditions.trim(),
      prior_charges: form.prior_charges.trim(),
    });
  }

  if (isSubmitting && intakeData) {
    return <AgentFeed intakeData={intakeData} />;
  }

  return (
    <main className="min-h-screen w-full bg-[#0a0a0a] text-white p-6 md:p-12 overflow-y-auto">
      <div className="max-w-[700px] mx-auto border border-[#1a1a1a] bg-[#111111] p-8 space-y-8 select-none">
        {/* Navigation & Header */}
        <div className="flex items-center justify-between border-b border-[#1a1a1a] pb-4">
          <Link
            href="/dashboard"
            className="font-mono text-[11px] tracking-[0.25em] text-[#6b7280] hover:text-white transition-colors uppercase font-bold"
          >
            ← BACK TO DASHBOARD
          </Link>
          <span className="font-mono text-[9px] px-1.5 py-0.5 border border-[#3b82f6]/50 bg-[#3b82f6]/10 text-[#3b82f6] tracking-widest font-bold">
            NEW INTAKE
          </span>
        </div>

        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="ReEntryOS Logo"
            className="h-10 w-auto rounded-sm object-contain"
          />
          <div className="space-y-1">
            <h1 className="font-mono text-[20px] font-bold tracking-[0.2em] text-white uppercase">
              NEW CLIENT INTAKE
            </h1>
            <p className="font-mono text-[10px] tracking-[0.1em] text-[#6b7280] uppercase">
              Enter client details to generate a personalized 72-hour reentry plan
            </p>
          </div>
        </div>

        {/* Intake Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Client Name */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
              CLIENT FULL NAME *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="E.G. MARCUS THOMPSON"
              className={`w-full bg-[#0a0a0a] border text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none placeholder-[#4b5563] transition-colors ${
                errors.name ? 'border-[#ef4444]' : 'border-[#1a1a1a] focus:border-[#3b82f6]'
              }`}
            />
            {errors.name && (
              <p className="font-mono text-[10px] text-[#ef4444] uppercase font-semibold">
                {errors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Release Date */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                RELEASE DATE *
              </label>
              <input
                type="date"
                value={form.release_date}
                onChange={(e) => update('release_date', e.target.value)}
                className={`w-full bg-[#0a0a0a] border text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none transition-colors ${
                  errors.release_date ? 'border-[#ef4444]' : 'border-[#1a1a1a] focus:border-[#3b82f6]'
                }`}
              />
              {errors.release_date && (
                <p className="font-mono text-[10px] text-[#ef4444] uppercase font-semibold">
                  {errors.release_date}
                </p>
              )}
            </div>

            {/* Phone Number */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                PHONE NUMBER
              </label>
              <input
                type="tel"
                value={form.phone_number}
                onChange={(e) => update('phone_number', e.target.value)}
                placeholder="+19165550199"
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#4b5563] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* City */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                CITY OF RELEASE *
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => update('city', e.target.value)}
                placeholder="E.G. SACRAMENTO"
                className={`w-full bg-[#0a0a0a] border text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none placeholder-[#4b5563] transition-colors ${
                  errors.city ? 'border-[#ef4444]' : 'border-[#1a1a1a] focus:border-[#3b82f6]'
                }`}
              />
              {errors.city && (
                <p className="font-mono text-[10px] text-[#ef4444] uppercase font-semibold">
                  {errors.city}
                </p>
              )}
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                STATE *
              </label>
              <select
                value={form.state}
                onChange={(e) => update('state', e.target.value)}
                className={`w-full bg-[#0a0a0a] border text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none transition-colors ${
                  errors.state ? 'border-[#ef4444]' : 'border-[#1a1a1a] focus:border-[#3b82f6]'
                }`}
              >
                <option value="">SELECT US STATE...</option>
                {US_STATES.map((st) => (
                  <option key={st.code} value={st.code}>
                    {st.name.toUpperCase()} ({st.code})
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="font-mono text-[10px] text-[#ef4444] uppercase font-semibold">
                  {errors.state}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#1a1a1a]">
            {/* Government ID Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                  GOVERNMENT ID ACCESS
                </label>
                {!form.has_id && (
                  <span className="font-mono text-[9px] px-1.5 py-0.5 border border-red-800 bg-red-950/40 text-[#ef4444] tracking-widest font-bold uppercase">
                    NO ID
                  </span>
                )}
              </div>
              <label className="flex items-center gap-3 bg-[#0a0a0a] border border-[#1a1a1a] px-4 py-3.5 cursor-pointer hover:border-[#3b82f6] transition-colors select-none">
                <input
                  type="checkbox"
                  checked={form.has_id}
                  onChange={(e) => update('has_id', e.target.checked)}
                  className="w-4 h-4 accent-[#3b82f6] bg-[#0a0a0a] border border-[#1a1a1a] focus:ring-0 cursor-pointer"
                />
                <span className="font-mono text-[12px] text-gray-200">
                  {form.has_id ? 'CLIENT HAS PHYSICAL ID' : 'CLIENT HAS NO PHYSICAL ID'}
                </span>
              </label>
            </div>

            {/* Housing Status */}
            <div className="space-y-2">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                HOUSING STATUS
              </label>
              <select
                value={form.housing_status}
                onChange={(e) => update('housing_status', e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[12px] px-3.5 py-[13.5px] focus:outline-none focus:border-[#3b82f6] transition-colors"
              >
                <option value="none">UNSHELTERED / NONE</option>
                <option value="temporary">TEMPORARY / SHELTER</option>
                <option value="stable">STABLE HOUSING</option>
              </select>
            </div>
          </div>

          {/* Medical Conditions */}
          <div className="space-y-1.5">
            <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
              MEDICAL CONDITIONS
            </label>
            <textarea
              value={form.medical_conditions}
              onChange={(e) => update('medical_conditions', e.target.value)}
              placeholder="E.G. TYPE 2 DIABETES, NEEDS INSULIN DAILY. SUBSTANCE USE HISTORY..."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#4b5563] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Sensitive Prior Charges */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <label className="font-mono text-[10px] tracking-[0.2em] text-[#6b7280] block uppercase font-bold">
                🔒 SENSITIVE PRIOR CHARGES
              </label>
              <span className="font-mono text-[8px] bg-gray-800 text-gray-400 px-1 border border-gray-700">
                RESTRICTED
              </span>
            </div>
            <textarea
              value={form.prior_charges}
              onChange={(e) => update('prior_charges', e.target.value)}
              placeholder="OPTIONAL. E.G. NONVIOLENT DRUG OFFENSE. USED SOLELY TO ASSESS DISQUALIFIERS FOR DISABILITY BENEFITS."
              rows={3}
              className="w-full bg-[#0a0a0a] border border-[#1a1a1a] text-white font-mono text-[12px] px-3.5 py-2.5 focus:outline-none focus:border-[#3b82f6] placeholder-[#4b5563] transition-colors resize-none leading-relaxed"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="w-full font-mono text-[11px] tracking-[0.15em] font-bold py-4 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 transition-colors uppercase"
          >
            START INTAKE & GENERATE PLAN
          </button>
        </form>
      </div>
    </main>
  );
}
