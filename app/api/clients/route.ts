import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: clients, error } = await supabaseServer
      .from('clients')
      .select(`
        *,
        service_plans (id, worker_approved, generated_at),
        appointments (id, title, scheduled_time, calendar_event_id),
        sms_log (id, flagged, direction, created_at)
      `)
      .order('risk_score', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const enriched = (clients || []).map((c) => {
      const smsList: { flagged: boolean; direction: string }[] = c.sms_log || [];
      const unread_sms = smsList.some((s) => s.flagged && s.direction === 'inbound');

      const appts: { scheduled_time: string }[] = c.appointments || [];
      const upcoming = appts
        .filter((a) => new Date(a.scheduled_time) > new Date())
        .sort((a, b) => new Date(a.scheduled_time).getTime() - new Date(b.scheduled_time).getTime());

      return {
        ...c,
        unread_sms,
        latest_appointment: upcoming[0] || null,
      };
    });

    return NextResponse.json(enriched);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
