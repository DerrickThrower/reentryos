import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const { data: client, error } = await supabaseServer
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: 'Client not found' }, { status: 404 });
    }

    const [{ data: plans }, { data: appointments }, { data: sms_log }, { data: agent_logs }, { data: tasks }] =
      await Promise.all([
        supabaseServer.from('service_plans').select('*').eq('client_id', id).order('generated_at', { ascending: false }),
        supabaseServer.from('appointments').select('*').eq('client_id', id).order('scheduled_time', { ascending: true }),
        supabaseServer.from('sms_log').select('*').eq('client_id', id).order('created_at', { ascending: true }),
        supabaseServer.from('agent_logs').select('*').eq('client_id', id).order('created_at', { ascending: true }),
        supabaseServer.from('tasks').select('*').eq('client_id', id).order('priority', { ascending: true }),
      ]);

    const smsList: { flagged: boolean; direction: string }[] = sms_log || [];
    const unread_sms = smsList.some((s) => s.flagged && s.direction === 'inbound');

    return NextResponse.json({
      ...client,
      service_plans: plans || [],
      appointments: appointments || [],
      sms_log: sms_log || [],
      agent_logs: agent_logs || [],
      tasks: tasks || [],
      unread_sms,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
