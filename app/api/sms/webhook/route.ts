import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { sendSMS } from '@/lib/twilio';
import { buildTwiML } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const from = formData.get('From') as string;
    const body = (formData.get('Body') as string) || '';
    const upperBody = body.toUpperCase().trim();

    // Look up client by phone
    const { data: client } = await supabaseServer
      .from('clients')
      .select('id, name, city, state, risk_score')
      .eq('phone_number', from)
      .single();

    // Log inbound message
    const isFlagged = upperBody.includes('HELP');
    const isRide = upperBody.includes('RIDE');

    await supabaseServer.from('sms_log').insert({
      client_id: client?.id || null,
      direction: 'inbound',
      body,
      twilio_sid: null,
      scheduled_at: null,
      flagged: isFlagged,
    });

    if (!client) {
      return new NextResponse(buildTwiML(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // HELP keyword
    if (isFlagged) {
      await supabaseServer
        .from('clients')
        .update({ risk_level: 'critical', risk_score: 95 })
        .eq('id', client.id);

      const replyBody = `Got it ${client.name}. Your caseworker has been notified and will follow up within the hour.`;
      try {
        const sid = await sendSMS(from, replyBody);
        await supabaseServer.from('sms_log').insert({
          client_id: client.id,
          direction: 'outbound',
          body: replyBody,
          twilio_sid: sid,
          scheduled_at: null,
          flagged: false,
        });
      } catch (err) {
        console.error('HELP auto-reply error:', err);
      }

      return new NextResponse(buildTwiML(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // RIDE keyword
    if (isRide) {
      let rideInfo = 'Contact your local transit authority or dial 211 for free transportation resources.';
      try {
        const response = await fetch('https://api.tavily.com/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            api_key: process.env.TAVILY_API_KEY,
            query: `${client.city} ${client.state} free transportation reentry parolee bus pass`,
            max_results: 2,
            search_depth: 'basic',
          }),
        });
        const tavilyData = await response.json();
        if (tavilyData.results?.[0]) {
          const result = tavilyData.results[0];
          rideInfo = `${result.title}: ${result.content.slice(0, 100)}`;
        }
      } catch {
        // Use default
      }

      const replyBody = `Transport info for ${client.city}: ${rideInfo}`.slice(0, 160);
      try {
        const sid = await sendSMS(from, replyBody);
        await supabaseServer.from('sms_log').insert({
          client_id: client.id,
          direction: 'outbound',
          body: replyBody,
          twilio_sid: sid,
          scheduled_at: null,
          flagged: false,
        });
      } catch (err) {
        console.error('RIDE auto-reply error:', err);
      }
    }

    return new NextResponse(buildTwiML(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (err) {
    console.error('Webhook error:', err);
    return new NextResponse(buildTwiML(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}
