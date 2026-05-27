import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Get latest plan for this client
    const { data: latestPlan, error: planError } = await supabaseServer
      .from('service_plans')
      .select('id')
      .eq('client_id', id)
      .order('generated_at', { ascending: false })
      .limit(1)
      .single();

    if (planError || !latestPlan) {
      return NextResponse.json({ error: 'No plan found for client' }, { status: 404 });
    }

    const { error } = await supabaseServer
      .from('service_plans')
      .update({ worker_approved: true })
      .eq('id', latestPlan.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, plan_id: latestPlan.id });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
