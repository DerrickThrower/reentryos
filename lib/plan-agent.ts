import { z } from 'zod';
import { Agent, run, tool, setTracingDisabled } from '@openai/agents';
import { ServicePlanJSON, IntakeFormData, SearchResults, RiskAssessment } from '@/types';
import { tavilySearch } from './tavily';

// Client records contain PII (medical conditions, charge history) — never ship
// run transcripts to the OpenAI traces dashboard.
setTracingDisabled(true);

const SYSTEM_PROMPT = `You are ReEntryOS, an AI coordination assistant for reentry case workers helping recently released individuals during their first 72 hours of freedom.

Your job is to generate structured, actionable service plans grounded in real resources.

Rules:
- Use the pre-fetched search results in the prompt as your baseline. Call the search_local_resources tool for targeted follow-ups the baseline does not cover — e.g. condition-specific medical programs, prescription access, or gaps in housing coverage. At most 3 follow-up searches.
- Reference REAL resources from search results — real addresses, real phone numbers, real office hours
- Never fabricate contact information
- If uncertain about a resource flag it with verified: false
- Prioritize by urgency: housing and medical before benefits before employment before legal
- Be specific and direct — case workers are busy, no filler text
- Every recommendation must have a concrete next action with a deadline
- SMS message bodies must be at most 160 characters, brief, action-oriented, and reassuring`;

// ─── Agent Output Schema (strict) ─────────────────────────────────────────────
// Structured outputs require every field present (nullable, never optional) and
// no defaults/constraints. Defaults and clamping are applied in normalizePlan.

const AgentResource = z.object({
  name: z.string(),
  address: z.string().nullable(),
  phone: z.string().nullable(),
  hours: z.string().nullable(),
  verified: z.boolean().nullable(),
});

const AgentPlanSchema = z.object({
  risk_score: z.number(),
  risk_level: z.enum(['critical', 'warning', 'stable']),
  risk_reasoning: z.string(),
  urgent_needs: z.array(
    z.object({
      priority: z.number(),
      category: z.enum(['housing', 'medical', 'benefits', 'id', 'employment', 'legal']),
      action: z.string(),
      why: z.string(),
      deadline: z.string().nullable(),
      resource: AgentResource,
    })
  ),
  housing_options: z.array(
    z.object({
      name: z.string(),
      address: z.string().nullable(),
      phone: z.string().nullable(),
      type: z.enum(['shelter', 'transitional', 'halfway', 'emergency']).nullable(),
      restrictions: z.string().nullable(),
      medical_accessible: z.boolean().nullable(),
      distance_miles: z.number().nullable(),
      verified: z.boolean().nullable(),
    })
  ),
  benefits_eligibility: z.array(
    z.object({
      program: z.enum(['Medicaid', 'SNAP', 'SSI', 'TANF', 'GA']),
      likely_eligible: z.boolean().nullable(),
      reasoning: z.string().nullable(),
      next_step: z.string().nullable(),
      deadline: z.string().nullable(),
      office_address: z.string().nullable(),
      office_phone: z.string().nullable(),
    })
  ),
  id_recovery: z.object({
    steps: z.array(z.string()),
    required_documents: z.array(z.string()),
    nearest_dmv: z.string().nullable(),
    nearest_dmv_address: z.string().nullable(),
    nearest_vital_records: z.string().nullable(),
  }),
  nearby_resources: z.object({
    clinics: z.array(
      z.object({
        name: z.string(),
        address: z.string().nullable(),
        phone: z.string().nullable(),
        accepts_uninsured: z.boolean().nullable(),
      })
    ),
    food_banks: z.array(
      z.object({
        name: z.string(),
        address: z.string().nullable(),
        hours: z.string().nullable(),
      })
    ),
    transit: z.object({
      nearest_stop: z.string().nullable(),
      day_pass_cost: z.string().nullable(),
    }),
  }),
  appointments: z.array(
    z.object({
      title: z.string(),
      suggested_time: z.string(),
      location: z.string().nullable(),
      address: z.string().nullable(),
      notes: z.string().nullable(),
    })
  ),
  second_chance_employers: z.array(
    z.object({
      name: z.string(),
      address: z.string().nullable(),
      phone: z.string().nullable(),
      industry: z.string().nullable(),
      verified: z.boolean().nullable(),
    })
  ),
  caseworker_notes: z.string().nullable(),
  sms_messages: z.array(
    z.object({
      send_at: z.string(),
      body: z.string(),
    })
  ),
});

// ─── Normalization Schema (lenient, applies defaults) ─────────────────────────

const ResourceSchema = z.object({
  name: z.string(),
  address: z.string().optional().default('Not available'),
  phone: z.string().optional().default('Not available'),
  hours: z.string().optional().default('Not available'),
  verified: z.boolean().optional().default(false),
});

const ServicePlanSchema = z.object({
  risk_score: z.number().min(0).max(100),
  risk_level: z.enum(['critical', 'warning', 'stable']),
  risk_reasoning: z.string(),
  urgent_needs: z
    .array(
      z.object({
        priority: z.number(),
        category: z.enum(['housing', 'medical', 'benefits', 'id', 'employment', 'legal']),
        action: z.string(),
        why: z.string(),
        deadline: z.string().optional().default('within 72h'),
        resource: ResourceSchema,
      })
    )
    .optional()
    .default([]),
  housing_options: z
    .array(
      z.object({
        name: z.string(),
        address: z.string().optional().default('Not available'),
        phone: z.string().optional().default('Not available'),
        type: z.enum(['shelter', 'transitional', 'halfway', 'emergency']).optional().default('shelter'),
        restrictions: z.string().optional().default('None'),
        medical_accessible: z.boolean().optional().default(false),
        distance_miles: z.number().optional().default(1.0),
        verified: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
  benefits_eligibility: z
    .array(
      z.object({
        program: z.enum(['Medicaid', 'SNAP', 'SSI', 'TANF', 'GA']),
        likely_eligible: z.boolean().optional().default(true),
        reasoning: z.string().optional().default('Reentry intake assessment'),
        next_step: z.string().optional().default('Contact nearest county benefits office'),
        deadline: z.string().optional().default('within 72h'),
        office_address: z.string().optional().default('Not available'),
        office_phone: z.string().optional().default('Not available'),
      })
    )
    .optional()
    .default([]),
  id_recovery: z.object({
    steps: z.array(z.string()).optional().default([]),
    required_documents: z.array(z.string()).optional().default([]),
    nearest_dmv: z.string().optional().default('Nearest DMV Office'),
    nearest_dmv_address: z.string().optional().default('See search results'),
    nearest_vital_records: z.string().optional().default('See search results'),
  }),
  nearby_resources: z.object({
    clinics: z
      .array(
        z.object({
          name: z.string(),
          address: z.string().optional().default('Not available'),
          phone: z.string().optional().default('Not available'),
          accepts_uninsured: z.boolean().optional().default(true),
        })
      )
      .optional()
      .default([]),
    food_banks: z
      .array(
        z.object({
          name: z.string(),
          address: z.string().optional().default('Not available'),
          hours: z.string().optional().default('Not available'),
        })
      )
      .optional()
      .default([]),
    transit: z
      .object({
        nearest_stop: z.string().optional().default('Public Transit Station'),
        day_pass_cost: z.string().optional().default('$5.00'),
      })
      .optional()
      .default({ nearest_stop: 'Public Transit Station', day_pass_cost: '$5.00' }),
  }),
  appointments: z
    .array(
      z.object({
        title: z.string(),
        suggested_time: z.string(),
        location: z.string().optional().default('Meeting Venue'),
        address: z.string().optional().default('See search results'),
        notes: z.string().optional().default('Reentry coordination appointment'),
      })
    )
    .optional()
    .default([]),
  second_chance_employers: z
    .array(
      z.object({
        name: z.string(),
        address: z.string().optional().default('Not available'),
        phone: z.string().optional().default('Not available'),
        industry: z.string().optional().default('General Labor'),
        verified: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
  caseworker_notes: z.string().optional().default('No custom notes generated.'),
  sms_messages: z
    .array(
      z.object({
        send_at: z.string(),
        body: z.string().max(160),
      })
    )
    .optional()
    .default([]),
});

// ─── Normalization ────────────────────────────────────────────────────────────

// The agent's strict schema emits explicit nulls; drop them so the lenient
// schema's defaults apply and the stored plan keeps the pre-migration shape.
function stripNulls(value: unknown): unknown {
  if (value === null) return undefined;
  if (Array.isArray(value)) return value.map(stripNulls);
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .map(([k, v]) => [k, stripNulls(v)])
        .filter(([, v]) => v !== undefined)
    );
  }
  return value;
}

function normalizePlan(raw: unknown): ServicePlanJSON {
  const parsed = stripNulls(raw) as Record<string, unknown>;

  parsed.risk_score = Math.max(0, Math.min(100, Number(parsed.risk_score) || 50));

  const validLevels = ['critical', 'warning', 'stable'];
  if (!validLevels.includes(parsed.risk_level as string)) {
    parsed.risk_level = 'stable';
  }

  if (Array.isArray(parsed.sms_messages)) {
    parsed.sms_messages = parsed.sms_messages.map((msg: unknown) => {
      if (msg && typeof msg === 'object') {
        const m = msg as Record<string, unknown>;
        return { ...m, body: typeof m.body === 'string' ? m.body.slice(0, 160) : '' };
      }
      return msg;
    });
  }

  return ServicePlanSchema.parse(parsed) as ServicePlanJSON;
}

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

BASELINE SEARCH RESULTS (use real data from here — real addresses, phones, hours):
${JSON.stringify(searchResults, null, 2)}

If the client has specific needs the baseline results do not cover (e.g. a medical condition needing prescription access), use the search_local_resources tool for targeted follow-ups before finalizing. Use verified: false for any resource you cannot confirm from search results.`;
}

export interface PlanAgentHooks {
  /** Called with a human-readable message for each tool interaction (streamed to the agent log UI). */
  onToolEvent?: (message: string) => void | Promise<void>;
}

export async function generateServicePlan(
  clientData: IntakeFormData,
  searchResults: SearchResults,
  risk: RiskAssessment,
  benefitsAnalysis: object,
  housingRanking: object[],
  hooks?: PlanAgentHooks
): Promise<ServicePlanJSON> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
  }

  const searchTool = tool({
    name: 'search_local_resources',
    description:
      'Search the live web for local reentry resources: shelters, benefits offices, clinics, prescription programs, employers, food banks, DMV, transport. Include city and state in the query. Use only for targeted follow-ups beyond the baseline results already provided.',
    parameters: z.object({
      query: z.string().describe('Full search query including city and state'),
    }),
    execute: async ({ query }) => {
      await hooks?.onToolEvent?.(`Follow-up search: "${query}"`);
      const results = await tavilySearch(query);
      await hooks?.onToolEvent?.(`Found ${results.length} results for "${query}"`);
      return JSON.stringify(
        results.map((r) => ({ title: r.title, url: r.url, content: r.content.slice(0, 500) }))
      );
    },
  });

  const agent = new Agent({
    name: 'Plan Agent',
    instructions: SYSTEM_PROMPT,
    model: 'gpt-4o',
    modelSettings: { temperature: 0.2 },
    tools: [searchTool],
    outputType: AgentPlanSchema,
  });

  const userMessage = buildPrompt(clientData, searchResults, risk, benefitsAnalysis, housingRanking);

  try {
    const result = await run(agent, userMessage, { maxTurns: 8 });
    if (!result.finalOutput) throw new Error('Plan agent produced no final output.');
    return normalizePlan(result.finalOutput);
  } catch (err) {
    console.error('Plan agent run failed, retrying once...', err);
    const retry = await run(agent, userMessage, { maxTurns: 8 });
    if (!retry.finalOutput) throw new Error('Plan agent retry produced no final output.');
    return normalizePlan(retry.finalOutput);
  }
}
