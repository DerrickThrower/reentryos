import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod';
import { ServicePlanJSON, IntakeFormData, SearchResults, RiskAssessment } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MODEL = 'claude-sonnet-5';

const SYSTEM_PROMPT = `You are ReEntryOS, an AI coordination assistant for reentry case workers helping recently released individuals during their first 72 hours of freedom.

Your job is to generate structured, actionable service plans grounded in real resources.

Rules:
- Use web search results passed to you to reference REAL resources — real addresses, real phone numbers, real office hours
- Never fabricate contact information
- If uncertain about a resource flag it with verified: false
- Prioritize by urgency: housing and medical before benefits before employment before legal
- Be specific and direct — case workers are busy, no filler text
- Every recommendation must have a concrete next action with a deadline
- SMS message bodies must be at most 160 characters, brief, action-oriented, and reassuring`;

// ─── Zod Schemas ──────────────────────────────────────────────────────────────
// These drive the API's structured-output enforcement (via zodOutputFormat) and
// the client-side validation of the parsed response. Defaults keep the plan
// renderable even when the model omits an optional field.

const ResourceSchema = z.object({
  name: z.string(),
  address: z.string().optional().nullable().default('Not available'),
  phone: z.string().optional().nullable().default('Not available'),
  hours: z.string().optional().nullable().default('Not available'),
  verified: z.boolean().optional().nullable().default(false),
});

const UrgentNeedSchema = z.object({
  priority: z.number(),
  category: z.enum(['housing', 'medical', 'benefits', 'id', 'employment', 'legal']),
  action: z.string(),
  why: z.string(),
  deadline: z.string().optional().nullable().default('within 72h'),
  resource: ResourceSchema,
});

const HousingOptionSchema = z.object({
  name: z.string(),
  address: z.string().optional().nullable().default('Not available'),
  phone: z.string().optional().nullable().default('Not available'),
  type: z.enum(['shelter', 'transitional', 'halfway', 'emergency']).optional().nullable().default('shelter'),
  restrictions: z.string().optional().nullable().default('None'),
  medical_accessible: z.boolean().optional().nullable().default(false),
  distance_miles: z.number().optional().nullable().default(1.0),
  verified: z.boolean().optional().nullable().default(false),
});

const BenefitsEligibilitySchema = z.object({
  program: z.enum(['Medicaid', 'SNAP', 'SSI', 'TANF', 'GA']),
  likely_eligible: z.boolean().optional().nullable().default(true),
  reasoning: z.string().optional().nullable().default('Reentry intake assessment'),
  next_step: z.string().optional().nullable().default('Contact nearest county benefits office'),
  deadline: z.string().optional().nullable().default('within 72h'),
  office_address: z.string().optional().nullable().default('Not available'),
  office_phone: z.string().optional().nullable().default('Not available'),
});

const IDRecoverySchema = z.object({
  steps: z.array(z.string()).optional().default([]),
  required_documents: z.array(z.string()).optional().default([]),
  nearest_dmv: z.string().optional().nullable().default('Nearest DMV Office'),
  nearest_dmv_address: z.string().optional().nullable().default('See search results'),
  nearest_vital_records: z.string().optional().nullable().default('See search results'),
});

const ClinicSchema = z.object({
  name: z.string(),
  address: z.string().optional().nullable().default('Not available'),
  phone: z.string().optional().nullable().default('Not available'),
  accepts_uninsured: z.boolean().optional().nullable().default(true),
});

const FoodBankSchema = z.object({
  name: z.string(),
  address: z.string().optional().nullable().default('Not available'),
  hours: z.string().optional().nullable().default('Not available'),
});

const NearbyResourcesSchema = z.object({
  clinics: z.array(ClinicSchema).optional().default([]),
  food_banks: z.array(FoodBankSchema).optional().default([]),
  transit: z.object({
    nearest_stop: z.string().optional().nullable().default('Public Transit Station'),
    day_pass_cost: z.string().optional().nullable().default('$5.00'),
  }).optional().default({ nearest_stop: 'Public Transit Station', day_pass_cost: '$5.00' }),
});

const ServicePlanSchema = z.object({
  risk_score: z.number(),
  risk_level: z.enum(['critical', 'warning', 'stable']),
  risk_reasoning: z.string(),
  urgent_needs: z.array(UrgentNeedSchema).optional().default([]),
  housing_options: z.array(HousingOptionSchema).optional().default([]),
  benefits_eligibility: z.array(BenefitsEligibilitySchema).optional().default([]),
  id_recovery: IDRecoverySchema,
  nearby_resources: NearbyResourcesSchema,
  appointments: z.array(
    z.object({
      title: z.string(),
      suggested_time: z.string(),
      location: z.string().optional().nullable().default('Meeting Venue'),
      address: z.string().optional().nullable().default('See search results'),
      notes: z.string().optional().nullable().default('Reentry coordination appointment'),
    })
  ).optional().default([]),
  second_chance_employers: z.array(
    z.object({
      name: z.string(),
      address: z.string().optional().nullable().default('Not available'),
      phone: z.string().optional().nullable().default('Not available'),
      industry: z.string().optional().nullable().default('General Labor'),
      verified: z.boolean().optional().nullable().default(false),
    })
  ).optional().default([]),
  caseworker_notes: z.string().optional().nullable().default('No custom notes generated.'),
  sms_messages: z.array(
    z.object({
      send_at: z.string().describe('ISO timestamp or relative time string to send the message'),
      body: z.string().describe('SMS body, at most 160 characters'),
    })
  ).optional().default([]),
});

// ─── Generation ───────────────────────────────────────────────────────────────

function buildPrompt(
  clientData: IntakeFormData,
  searchResults: SearchResults,
  risk: RiskAssessment,
  benefitsAnalysis: object,
  housingRanking: object[]
): string {
  return `Generate a complete 72-hour reentry service plan for this client. Current date/time: ${new Date().toISOString()}

CLIENT DATA:
${JSON.stringify(clientData, null, 2)}

PRE-COMPUTED RISK ASSESSMENT (use these values):
${JSON.stringify(risk, null, 2)}

BENEFITS ANALYSIS:
${JSON.stringify(benefitsAnalysis, null, 2)}

RANKED HOUSING OPTIONS (ranked best first):
${JSON.stringify(housingRanking, null, 2)}

LIVE SEARCH RESULTS (use real data from here — real addresses, phones, hours):
${JSON.stringify(searchResults, null, 2)}

Use verified: false for any resource you cannot confirm from the search results above.`;
}

export async function generateServicePlan(
  clientData: IntakeFormData,
  searchResults: SearchResults,
  risk: RiskAssessment,
  benefitsAnalysis: object,
  housingRanking: object[]
): Promise<ServicePlanJSON> {
  const userMessage = buildPrompt(clientData, searchResults, risk, benefitsAnalysis, housingRanking);

  // output_config.format constrains generation to the schema server-side, so
  // the response is guaranteed parseable — no regex cleanup, no retry loop.
  const response = await client.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
    output_config: { format: zodOutputFormat(ServicePlanSchema) },
  });

  const plan = response.parsed_output;
  if (!plan) {
    throw new Error(
      `Plan generation produced no parseable output (stop_reason: ${response.stop_reason})`
    );
  }

  // Bounds the schema can't express server-side: clamp the score, keep SMS
  // bodies within a single 160-char segment.
  plan.risk_score = Math.max(0, Math.min(100, plan.risk_score));
  plan.sms_messages = plan.sms_messages.map((msg) => ({
    ...msg,
    body: msg.body.slice(0, 160),
  }));

  return plan as ServicePlanJSON;
}
