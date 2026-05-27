'use client';

import { useState, useEffect } from 'react';
import { createBrowserClient } from '@/lib/supabase';

interface NotesTabProps {
  notes: string;
  planId: string | null;
  onSaved: (notes: string) => void;
}

export function NotesTab({ notes, planId, onSaved }: NotesTabProps) {
  const [text, setText] = useState(notes);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  // Keep internal text state synchronized with incoming props when changed
  useEffect(() => {
    setText(notes);
  }, [notes]);

  async function handleSave() {
    if (!planId) {
      setError('Cannot save: No plan ID exists for this client.');
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);

    try {
      const supabase = createBrowserClient();

      // 1. Fetch current plan json
      const { data, error: fetchErr } = await supabase
        .from('service_plans')
        .select('plan_json')
        .eq('id', planId)
        .single();

      if (fetchErr) throw new Error(fetchErr.message);
      if (!data) throw new Error('Plan not found.');

      // 2. Merge caseworker notes
      const planJson = data.plan_json || {};
      const updatedPlanJson = {
        ...planJson,
        caseworker_notes: text,
      };

      // 3. Save back to DB
      const { error: updateErr } = await supabase
        .from('service_plans')
        .update({ plan_json: updatedPlanJson })
        .eq('id', planId);

      if (updateErr) throw new Error(updateErr.message);

      setSaved(true);
      onSaved(text);

      // Hide confirmation after 2 seconds
      setTimeout(() => {
        setSaved(false);
      }, 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 select-none">
      {/* Header */}
      <div className="border-b border-[#1a1a1a] pb-4 flex items-center justify-between">
        <div>
          <h2 className="font-mono text-[13px] tracking-widest text-white uppercase font-bold">
            CASEWORKER NOTES
          </h2>
          <p className="text-[#6b7280] font-mono text-[10px] uppercase mt-1">
            Custom notes to attach directly to the 72-hour service plan
          </p>
        </div>
      </div>

      {/* Editor Content */}
      <div className="space-y-4">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ENTER CASE DETAILS, OBSERVATIONS, OR CUSTOM STEPS HERE..."
          disabled={saving || !planId}
          className="w-full min-h-[300px] bg-[#111111] border border-[#1a1a1a] text-gray-200 font-mono text-[13px] p-4 focus:outline-none focus:border-[#3b82f6] disabled:opacity-50 leading-relaxed placeholder-[#4b5563]"
        />

        <div className="flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving || !planId}
            className="font-mono text-[11px] tracking-widest font-bold px-6 py-3 bg-[#3b82f6] text-white hover:bg-blue-600 active:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors uppercase"
          >
            {saving ? 'SAVING NOTES...' : 'SAVE NOTES'}
          </button>

          {saved && (
            <span className="font-mono text-[11px] text-green-400 font-bold tracking-widest uppercase py-1 px-3 border border-green-800 bg-green-950/40 animate-fade-in">
              SAVED ✓
            </span>
          )}

          {error && (
            <span className="font-mono text-[11px] text-red-400 font-bold tracking-widest uppercase py-1 px-3 border border-red-800 bg-red-950/40">
              ERROR: {error}
            </span>
          )}

          {!planId && (
            <span className="font-mono text-[11px] text-amber-400 font-bold tracking-widest uppercase py-1 px-3 border border-amber-800 bg-amber-950/40">
              ⚠ CREATE A PLAN BEFORE SAVING NOTES
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
