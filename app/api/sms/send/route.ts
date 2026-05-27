import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { client_id, to, body } = await req.json();

    if (!to || !body) {
      return NextResponse.json({ error: 'Missing to or body' }, { status: 400 });
    }

    const sid = await sendSMS(to, body);

    await supabaseServer.from('sms_log').insert({
      client_id: client_id || null,
      direction: 'outbound',
      body,
      twilio_sid: sid,
      scheduled_at: null,
      flagged: false,
    });

    return NextResponse.json({ sid, success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
