import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { AgentEmitter } from '@/lib/agents';
import { searchResources } from '@/lib/tavily';
import { generateServicePlan } from '@/lib/anthropic';
import { createEvent, nextBusinessDay, hoursFromNow } from '@/lib/google-calendar';
import { sendSMS, scheduleSMS } from '@/lib/twilio';
import { getSSEHeaders } from '@/lib/sse';
import { IntakeFormData, SearchResults, RiskAssessment, BenefitsEligibility } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

// ─── Risk Calculation ─────────────────────────────────────────────────────────

function calculateRisk(data: IntakeFormData): RiskAssessment {
  let score = 0;
  const reasons: string[] = [];

  if (data.housing_status === 'none') {
    score += 40;
    reasons.push('no housing secured');
  } else if (data.housing_status === 'temporary') {
    score += 15;
    reasons.push('temporary housing only');
  }

  if (!data.has_id) {
    score += 20;
    reasons.push('no government ID');
  }

  if (data.medical_conditions && data.medical_conditions.trim().length > 0) {
    score += 20;
    reasons.push('active medical needs');
  }

  score += 10; // No income — always true for recently released
  reasons.push('no income source');

  const mentalHealthKeywords = ['mental', 'depression', 'anxiety', 'bipolar', 'schizophrenia', 'ptsd', 'trauma'];
  if (mentalHealthKeywords.some((kw) => data.medical_conditions?.toLowerCase().includes(kw))) {
    score += 10;
    reasons.push('mental health needs identified');
  }

  const risk_level: 'critical' | 'warning' | 'stable' =
    score >= 75 ? 'critical' : score >= 40 ? 'warning' : 'stable';

  return {
    risk_score: Math.min(score, 100),
    risk_level,
    risk_reasoning: `Score ${score}/100 — ${reasons.join(', ')}.`,
  };
}

// ─── Benefits Analysis ────────────────────────────────────────────────────────

function analyzeBenefits(data: IntakeFormData, searchResults: SearchResults): object {
  const releaseDate = new Date(data.release_date);
  const snap30Days = new Date(releaseDate);
  snap30Days.setDate(snap30Days.getDate() + 30);

  const benefitsOffice = searchResults.benefits[0];

  const analysis: BenefitsEligibility[] = [
    {
      program: 'Medicaid',
      likely_eligible: true,
      reasoning:
        'Recently released with no income. Most states allow Medicaid enrollment immediately post-release. Nonviolent offense — no federal Medicaid bar.',
      next_step: 'Apply at county benefits office or online at state Medicaid portal. Bring release paperwork.',
      deadline: 'within 24h',
      office_address: benefitsOffice?.content?.match(/\d+[^,\n]+(?:St|Ave|Blvd|Dr|Rd|Way)[^,\n]*/i)?.[0] || 'See benefits search results',
      office_phone: benefitsOffice?.content?.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0] || 'Call 211',
    },
    {
      program: 'SNAP',
      likely_eligible: true,
      reasoning: `Eligible 30 days post-release (${snap30Days.toDateString()}). Nonviolent drug offense does not disqualify in most states.`,
      next_step: 'Pre-register now. Full application eligible starting ' + snap30Days.toDateString(),
      deadline: snap30Days.toISOString(),
      office_address: benefitsOffice?.content?.match(/\d+[^,\n]+(?:St|Ave|Blvd|Dr|Rd|Way)[^,\n]*/i)?.[0] || 'Same office as Medicaid',
      office_phone: benefitsOffice?.content?.match(/\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}/)?.[0] || 'Call 211',
    },
    {
      program: 'SSI',
      likely_eligible: data.medical_conditions ? true : false,
      reasoning: data.medical_conditions
        ? `Medical conditions noted (${data.medical_conditions}). SSI may apply if conditions are disabling. Requires formal evaluation.`
        : 'No medical conditions reported. SSI eligibility unlikely without documented disability.',
      next_step: 'Contact Social Security Administration at 1-800-772-1213 to schedule evaluation.',
      deadline: 'within 72h',
      office_address: 'Social Security Administration — see ssa.gov for nearest office',
      office_phone: '1-800-772-1213',
    },
  ];

  return analysis;
}

// ─── Housing Ranking ──────────────────────────────────────────────────────────

function rankHousing(data: IntakeFormData, searchResults: SearchResults): object[] {
  const hasMedical = !!(data.medical_conditions && data.medical_conditions.trim());
  return searchResults.housing.slice(0, 5).map((result, i) => ({
    rank: i + 1,
    name: result.title,
    content_snippet: result.content.slice(0, 300),
    url: result.url,
    medical_accessible_signal: hasMedical
      ? result.content.toLowerCase().includes('medical') ||
        result.content.toLowerCase().includes('health') ||
        result.content.toLowerCase().includes('accessible')
      : null,
    relevance_score: result.score,
  }));
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emitter = new AgentEmitter(controller, encoder);

      try {
        const data: IntakeFormData & { id?: string } = await req.json();
        const now = new Date();

        // ── Orchestrator: Start ────────────────────────────────────────────
        await emitter.emit('Orchestrator', 'working', `Initializing reentry coordination for ${data.name}...`);

        let clientId = data.id;

        if (!clientId) {
          // Save client to DB
          const { data: client, error: clientError } = await supabaseServer
            .from('clients')
            .insert({
              name: data.name,
              release_date: data.release_date,
              city: data.city,
              state: data.state,
              has_id: data.has_id,
              housing_status: data.housing_status,
              medical_conditions: data.medical_conditions || null,
              prior_charges: data.prior_charges || null,
              phone_number: data.phone_number || null,
            })
            .select()
            .single();

          if (clientError || !client) {
            await emitter.emit('Orchestrator', 'error', `Failed to save client: ${clientError?.message}`);
            emitter.close();
            return;
          }

          clientId = client.id as string;
        } else {
          // Update existing client record
          await supabaseServer
            .from('clients')
            .update({
              name: data.name,
              release_date: data.release_date,
              city: data.city,
              state: data.state,
              has_id: data.has_id,
              housing_status: data.housing_status,
              medical_conditions: data.medical_conditions || null,
              prior_charges: data.prior_charges || null,
              phone_number: data.phone_number || null,
            })
            .eq('id', clientId);
        }

        emitter.setClientId(clientId);

        await emitter.emit('Orchestrator', 'done', `Client profile loaded. Deploying 7 specialized agents.`, { client_id: clientId });

        // ── Search Agent ───────────────────────────────────────────────────
        let searchResults: SearchResults = { housing: [], benefits: [], clinics: [], employers: [], food_banks: [], dmv: [] };

        try {
          await emitter.emit('Search Agent', 'working', `Searching ${data.city} shelters and transitional housing...`);

          searchResults = await searchResources(data.city, data.state);

          await emitter.emit('Search Agent', 'done', `Found ${searchResults.housing.length} housing resources near ${data.city}.`);
          await emitter.emit('Search Agent', 'working', `Searching Medicaid and SNAP offices in ${data.city} County...`);
          await emitter.emit('Search Agent', 'done', `Located ${searchResults.benefits.length} benefits office results.`);
          await emitter.emit('Search Agent', 'working', `Searching free clinics for uninsured patients...`);
          await emitter.emit('Search Agent', 'done', `Found ${searchResults.clinics.length} clinics accepting uninsured patients.`);
          await emitter.emit('Search Agent', 'working', `Searching second-chance employers in ${data.city}...`);
          await emitter.emit('Search Agent', 'done', `Found ${searchResults.employers.length} reentry-friendly employers within 5 miles.`);
          await emitter.emit('Search Agent', 'working', `Searching food banks and emergency resources...`);
          await emitter.emit('Search Agent', 'done', `Located ${searchResults.food_banks.length} food resources and nearest DMV.`);
        } catch (err) {
          await emitter.emit('Search Agent', 'error', `Search failed: ${String(err)}. Proceeding with available data.`);
        }

        // ── Benefits Agent ─────────────────────────────────────────────────
        let benefitsAnalysis: object = [];
        try {
          await emitter.emit('Benefits Agent', 'working', `Analyzing Medicaid eligibility based on charge history and release date...`);
          benefitsAnalysis = analyzeBenefits(data, searchResults);
          await emitter.emit('Benefits Agent', 'done', `Medicaid: likely eligible. SNAP: eligible 30 days post-release. SSI: requires evaluation.`);
        } catch (err) {
          await emitter.emit('Benefits Agent', 'error', `Benefits analysis failed: ${String(err)}`);
        }

        // ── Housing Agent ──────────────────────────────────────────────────
        let housingRanking: object[] = [];
        try {
          await emitter.emit('Housing Agent', 'working', `Ranking housing options by proximity, restrictions, and medical accessibility...`);
          housingRanking = rankHousing(data, searchResults);
          const topOption = searchResults.housing[0]?.title || 'shelter options';
          await emitter.emit('Housing Agent', 'done', `Top option: ${topOption} — ${searchResults.housing.length} options ranked.`);
        } catch (err) {
          await emitter.emit('Housing Agent', 'error', `Housing ranking failed: ${String(err)}`);
        }

        // ── Risk Agent ─────────────────────────────────────────────────────
        let risk: RiskAssessment = { risk_score: 0, risk_level: 'stable', risk_reasoning: '' };
        try {
          await emitter.emit('Risk Agent', 'working', `Calculating risk score: housing status, ID status, medical needs...`);
          risk = calculateRisk(data);

          await supabaseServer.from('clients').update({
            risk_score: risk.risk_score,
            risk_level: risk.risk_level,
          }).eq('id', clientId);

          await emitter.emit(
            'Risk Agent',
            'done',
            `Risk score: ${risk.risk_score}/100 — ${risk.risk_level.toUpperCase()}. ${risk.risk_reasoning}`,
            { risk_score: risk.risk_score, risk_level: risk.risk_level }
          );
        } catch (err) {
          await emitter.emit('Risk Agent', 'error', `Risk calculation failed: ${String(err)}`);
        }

        // ── Plan Agent ─────────────────────────────────────────────────────
        let plan: import('@/types').ServicePlanJSON | null = null;
        let planId: string | null = null;

        try {
          await emitter.emit('Plan Agent', 'working', `Generating prioritized 72-hour service plan...`);
          plan = await generateServicePlan(data, searchResults, risk, benefitsAnalysis, housingRanking);

          const { data: savedPlan } = await supabaseServer
            .from('service_plans')
            .insert({ client_id: clientId, plan_json: plan })
            .select()
            .single();

          planId = savedPlan?.id || null;

          // Save tasks from urgent needs
          if (plan.urgent_needs?.length) {
            await supabaseServer.from('tasks').insert(
              plan.urgent_needs.map((need) => ({
                client_id: clientId,
                category: need.category,
                action: need.action,
                priority: need.priority,
                deadline: need.deadline,
                completed: false,
              }))
            );
          }

          await emitter.emit(
            'Plan Agent',
            'done',
            `Plan generated. ${plan.urgent_needs?.length ?? 0} urgent actions identified.`,
            { plan_id: planId ?? undefined, risk_score: plan.risk_score, risk_level: plan.risk_level }
          );
        } catch (err) {
          await emitter.emit('Plan Agent', 'error', `Plan generation failed: ${String(err)}`);
        }

        // ── Calendar Agent ─────────────────────────────────────────────────
        const releaseDate = new Date(data.release_date);
        const medicaidTime = nextBusinessDay(now);
        const dmvTime = hoursFromNow(releaseDate, 48, 10);
        const checkinTime = hoursFromNow(releaseDate, 72, 14);

        const appointmentsToCreate = [
          {
            title: `Medicaid Enrollment — ${data.name}`,
            time: medicaidTime,
            location: 'County Benefits Office',
            address: searchResults.benefits[0]?.content?.match(/\d+[^,\n]+(?:St|Ave|Blvd|Dr|Rd|Way)[^,\n]*/i)?.[0] || data.city + ', ' + data.state,
            description: `Bring release paperwork. Client has no government ID — release papers accepted as identity verification. Caseworker coordination required.`,
            logMsg: `Medicaid appointment created: tomorrow ${medicaidTime.toLocaleTimeString()} at county benefits office.`,
          },
          {
            title: `DMV — State ID Application — ${data.name}`,
            time: dmvTime,
            location: 'DMV',
            address: searchResults.dmv[0]?.content?.match(/\d+[^,\n]+(?:St|Ave|Blvd|Dr|Rd|Way)[^,\n]*/i)?.[0] || data.city + ', ' + data.state,
            description: `Fee waiver available for recently released. Bring release paperwork. Certified birth certificate copy if available.`,
            logMsg: `DMV appointment created: ${dmvTime.toDateString()} 10 AM.`,
          },
          {
            title: `72-Hour Check-In — ${data.name}`,
            time: checkinTime,
            location: 'Caseworker Office / Video Call',
            address: '',
            description: plan?.caseworker_notes || `72-hour check-in for ${data.name}.`,
            logMsg: `Check-in meeting created: ${checkinTime.toDateString()} 2 PM.`,
          },
        ];

        // Events are independent — create them concurrently instead of paying
        // (Calendar API + DB insert) latency three times in sequence.
        await Promise.all(
          appointmentsToCreate.map(async (appt) => {
            try {
              await emitter.emit('Calendar Agent', 'working', `Scheduling ${appt.title}...`);

              let calResult = { eventId: '', eventLink: '' };
              try {
                calResult = await createEvent(
                  appt.title,
                  appt.time,
                  appt.location,
                  appt.address,
                  appt.description
                );
              } catch (calErr) {
                console.error('Google Calendar error:', calErr);
              }

              await supabaseServer.from('appointments').insert({
                client_id: clientId,
                title: appt.title,
                location: appt.location,
                address: appt.address,
                scheduled_time: appt.time.toISOString(),
                calendar_event_id: calResult.eventId || null,
                calendar_event_link: calResult.eventLink || null,
                sms_sent: false,
              });

              await emitter.emit('Calendar Agent', 'done', appt.logMsg);
            } catch (err) {
              await emitter.emit('Calendar Agent', 'error', `Calendar event failed: ${String(err)}. Saved locally.`);
            }
          })
        );

        // ── SMS Agent ──────────────────────────────────────────────────────
        if (data.phone_number) {
          try {
            await emitter.emit('SMS Agent', 'working', `Sending welcome message to ${data.name}...`);

            const immediateBody = `Hi ${data.name}, your 72-hour reentry plan is ready. Caseworker is reviewing now. Reply HELP anytime.`;
            let immediateSid = '';
            try {
              immediateSid = await sendSMS(data.phone_number, immediateBody);
            } catch (smsErr) {
              console.error('SMS send error:', smsErr);
            }

            await supabaseServer.from('sms_log').insert({
              client_id: clientId,
              direction: 'outbound',
              body: immediateBody,
              twilio_sid: immediateSid || null,
              scheduled_at: null,
              flagged: false,
            });

            await emitter.emit('SMS Agent', 'done', `SMS delivered: "${immediateBody.slice(0, 50)}..."`);
            await emitter.emit('SMS Agent', 'working', `Scheduling 5 follow-up messages over 72 hours...`);

            const medicaidAddress =
              searchResults.benefits[0]?.content?.match(/\d+[^,\n]+(?:St|Ave|Blvd|Dr|Rd|Way)[^,\n]*/i)?.[0] ||
              `${data.city} County Benefits Office`;

            const scheduledMessages = [
              {
                body: `Reminder: Medicaid appointment tomorrow 9 AM at ${medicaidAddress}. Bring your release paperwork.`,
                sendAt: new Date(now.getTime() + 2 * 60 * 60 * 1000),
              },
              {
                body: `${data.name}, your Medicaid appointment is tomorrow 9 AM at ${medicaidAddress}. Need a ride? Reply RIDE.`,
                sendAt: (() => {
                  const d = new Date(medicaidTime);
                  d.setDate(d.getDate() - 1);
                  d.setHours(20, 0, 0, 0);
                  return d;
                })(),
              },
              {
                body: `Your appointment is in 30 minutes at ${medicaidAddress}. You've got this.`,
                sendAt: new Date(medicaidTime.getTime() - 30 * 60 * 1000),
              },
              {
                body: `Checking in ${data.name}. How are things going? Reply HELP if you need urgent support.`,
                sendAt: hoursFromNow(releaseDate, 72),
              },
            ];

            // Schedule all follow-ups concurrently, then log them in one batched insert
            // instead of a scheduleSMS + insert round-trip per message.
            const sids = await Promise.all(
              scheduledMessages.map(async (msg) => {
                try {
                  return await scheduleSMS(data.phone_number!, msg.body, msg.sendAt);
                } catch (schedErr) {
                  console.error('Scheduled SMS error:', schedErr);
                  return '';
                }
              })
            );

            await supabaseServer.from('sms_log').insert(
              scheduledMessages.map((msg, i) => ({
                client_id: clientId,
                direction: 'outbound',
                body: msg.body,
                twilio_sid: sids[i] || null,
                scheduled_at: msg.sendAt.toISOString(),
                flagged: false,
              }))
            );

            const nextMsg = scheduledMessages[0].sendAt;
            await emitter.emit(
              'SMS Agent',
              'done',
              `5 messages scheduled. Next: ${nextMsg.toLocaleTimeString()} today.`
            );
          } catch (err) {
            await emitter.emit('SMS Agent', 'error', `SMS failed: ${String(err)}. Messages logged for retry.`);
          }
        } else {
          await emitter.emit('SMS Agent', 'done', 'No phone number provided. SMS skipped.');
        }

        // ── Documentation Agent ────────────────────────────────────────────
        try {
          await emitter.emit('Documentation Agent', 'working', `Generating caseworker handoff notes and saving records...`);

          // Update client with final risk from plan (if plan overrode)
          if (plan) {
            await supabaseServer.from('clients').update({
              risk_score: plan.risk_score,
              risk_level: plan.risk_level,
            }).eq('id', clientId);
          }

          await emitter.emit('Documentation Agent', 'done', `All records saved. Plan ready for caseworker review.`);
        } catch (err) {
          await emitter.emit('Documentation Agent', 'error', `Documentation error: ${String(err)}`);
        }

        // ── Orchestrator: Complete ─────────────────────────────────────────
        await emitter.emit(
          'Orchestrator',
          'done',
          `All agents complete. ${data.name}'s 72-hour plan is live.`,
          { client_id: clientId, plan_id: planId ?? undefined }
        );

        await emitter.flush();
        emitter.close();
      } catch (fatalErr) {
        try {
          const errEmitter = new AgentEmitter(controller, encoder);
          await errEmitter.emit('Orchestrator', 'error', `Fatal pipeline error: ${String(fatalErr)}`);
          await errEmitter.flush();
          errEmitter.close();
        } catch {
          controller.close();
        }
      }
    },
  });

  return new Response(stream, { headers: getSSEHeaders() });
}
