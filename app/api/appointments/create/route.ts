import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { createEvent } from '@/lib/google-calendar';
import { sendSMS } from '@/lib/twilio';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { client_id, title, scheduled_time, location, address, notes } = body;

    if (!client_id || !title || !scheduled_time) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch client for SMS
    const { data: client } = await supabaseServer
      .from('clients')
      .select('name, phone_number')
      .eq('id', client_id)
      .single();

    // Create calendar event
    let calResult = { eventId: '', eventLink: '' };
    try {
      calResult = await createEvent(
        title,
        new Date(scheduled_time),
        location || '',
        address || '',
        notes || ''
      );
    } catch (calErr) {
      console.error('Calendar error:', calErr);
    }

    // Save appointment
    const { data: appointment, error } = await supabaseServer
      .from('appointments')
      .insert({
        client_id,
        title,
        location: location || null,
        address: address || null,
        scheduled_time,
        calendar_event_id: calResult.eventId || null,
        calendar_event_link: calResult.eventLink || null,
        sms_sent: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Send SMS if client has phone
    let smsSent = false;
    if (client?.phone_number) {
      try {
        const apptDate = new Date(scheduled_time);
        const smsBody = `Hi ${client.name}, appointment confirmed: ${title} on ${apptDate.toLocaleDateString()} at ${apptDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Location: ${address || location || 'TBD'}.`;
        await sendSMS(client.phone_number, smsBody);
        await supabaseServer.from('appointments').update({ sms_sent: true }).eq('id', appointment.id);
        await supabaseServer.from('sms_log').insert({
          client_id,
          direction: 'outbound',
          body: smsBody,
          scheduled_at: null,
          flagged: false,
        });
        smsSent = true;
      } catch (smsErr) {
        console.error('SMS error:', smsErr);
      }
    }

    return NextResponse.json({
      appointment,
      calendar_synced: !!calResult.eventId,
      sms_sent: smsSent,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
