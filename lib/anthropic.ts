import { z } from 'zod';
import { ServicePlanJSON, IntakeFormData, SearchResults, RiskAssessment } from '@/types';

const SYSTEM_PROMPT = `You are ReEntryOS, an AI coordination assistant for reentry case workers helping recently released individuals during their first 72 hours of freedom.

Your job is to generate structured, actionable service plans grounded in real resources.

Rules:
- Always return valid JSON matching the schema provided. No preamble. No markdown fences. Raw JSON only.
- Use web search results passed to you to reference REAL resources — real addresses, real phone numbers, real office hours
- Never fabricate contact information
- If uncertain about a resource flag it with verified: false
- Prioritize by urgency: housing and medical before benefits before employment before legal
- Be specific and direct — case workers are busy, no filler text
- Every recommendation must have a concrete next action with a deadline`;

// ─── Robust Zod Schemas ────────────────────────────────────────────────────────

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
  risk_score: z.number().min(0).max(100),
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
      send_at: z.string(),
      body: z.string().max(160),
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

Return the complete service plan as raw JSON only. No markdown. No preamble. Match the exact schema. Use verified: false for any resource you cannot confirm from the search results above.`;
}

async function parseAndValidate(text: string): Promise<ServicePlanJSON> {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  let parsed = JSON.parse(cleaned);

  // Robust nested object unwrapping (in case Gemini nests everything under a root key)
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    const keys = Object.keys(parsed);
    // If there is exactly one root key, and it maps to an object, and that object is not an array, unwrap it
    if (keys.length === 1 && typeof parsed[keys[0]] === 'object' && parsed[keys[0]] !== null && !Array.isArray(parsed[keys[0]])) {
      console.log(`Unwrapping nested JSON root key: ${keys[0]}`);
      parsed = parsed[keys[0]];
    }
  }

  // Defensive preprocessing to prevent Zod parsing validation failures
  if (parsed && typeof parsed === 'object') {
    // 1. Clamp risk score to [0, 100]
    if (typeof parsed.risk_score === 'number') {
      parsed.risk_score = Math.max(0, Math.min(100, parsed.risk_score));
    } else if (parsed.risk_score !== undefined) {
      parsed.risk_score = Math.max(0, Math.min(100, Number(parsed.risk_score) || 50));
    } else {
      parsed.risk_score = 50;
    }

    // 2. Validate and fallback for risk level
    const validLevels = ['critical', 'warning', 'stable'];
    if (!validLevels.includes(parsed.risk_level)) {
      parsed.risk_level = 'stable';
    }

    // 3. Truncate SMS bodies to 160 characters max
    if (Array.isArray(parsed.sms_messages)) {
      parsed.sms_messages = parsed.sms_messages.map((msg: any) => {
        if (msg && typeof msg === 'object') {
          return {
            ...msg,
            body: typeof msg.body === 'string' ? msg.body.slice(0, 160) : '',
          };
        }
        return msg;
      });
    }
  }

  return ServicePlanSchema.parse(parsed) as ServicePlanJSON;
}

const PLAN_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    risk_score: { type: "INTEGER", description: "The pre-computed risk score (0-100)" },
    risk_level: { type: "STRING", enum: ["critical", "warning", "stable"], description: "The risk level" },
    risk_reasoning: { type: "STRING", description: "Reasoning for the risk level" },
    urgent_needs: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          priority: { type: "INTEGER" },
          category: { type: "STRING", enum: ["housing", "medical", "benefits", "id", "employment", "legal"] },
          action: { type: "STRING" },
          why: { type: "STRING" },
          deadline: { type: "STRING" },
          resource: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              address: { type: "STRING" },
              phone: { type: "STRING" },
              hours: { type: "STRING" },
              verified: { type: "BOOLEAN" }
            },
            required: ["name"]
          }
        },
        required: ["priority", "category", "action", "why", "resource"]
      }
    },
    housing_options: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          address: { type: "STRING" },
          phone: { type: "STRING" },
          type: { type: "STRING", enum: ["shelter", "transitional", "halfway", "emergency"] },
          restrictions: { type: "STRING" },
          medical_accessible: { type: "BOOLEAN" },
          distance_miles: { type: "NUMBER" },
          verified: { type: "BOOLEAN" }
        },
        required: ["name"]
      }
    },
    benefits_eligibility: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          program: { type: "STRING", enum: ["Medicaid", "SNAP", "SSI", "TANF", "GA"] },
          likely_eligible: { type: "BOOLEAN" },
          reasoning: { type: "STRING" },
          next_step: { type: "STRING" },
          deadline: { type: "STRING" },
          office_address: { type: "STRING" },
          office_phone: { type: "STRING" }
        },
        required: ["program"]
      }
    },
    id_recovery: {
      type: "OBJECT",
      properties: {
        steps: { type: "ARRAY", items: { type: "STRING" } },
        required_documents: { type: "ARRAY", items: { type: "STRING" } },
        nearest_dmv: { type: "STRING" },
        nearest_dmv_address: { type: "STRING" },
        nearest_vital_records: { type: "STRING" }
      },
      required: ["steps", "required_documents", "nearest_dmv"]
    },
    nearby_resources: {
      type: "OBJECT",
      properties: {
        clinics: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              address: { type: "STRING" },
              phone: { type: "STRING" },
              accepts_uninsured: { type: "BOOLEAN" }
            },
            required: ["name"]
          }
        },
        food_banks: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name: { type: "STRING" },
              address: { type: "STRING" },
              hours: { type: "STRING" }
            },
            required: ["name"]
          }
        },
        transit: {
          type: "OBJECT",
          properties: {
            nearest_stop: { type: "STRING" },
            day_pass_cost: { type: "STRING" }
          },
          required: ["nearest_stop", "day_pass_cost"]
        }
      },
      required: ["clinics", "food_banks", "transit"]
    },
    appointments: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          suggested_time: { type: "STRING" },
          location: { type: "STRING" },
          address: { type: "STRING" },
          notes: { type: "STRING" }
        },
        required: ["title", "suggested_time"]
      }
    },
    second_chance_employers: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          address: { type: "STRING" },
          phone: { type: "STRING" },
          industry: { type: "STRING" },
          verified: { type: "BOOLEAN" }
        },
        required: ["name"]
      }
    },
    caseworker_notes: { type: "STRING" },
    sms_messages: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          send_at: { type: "STRING", description: "ISO timestamp or relative time string to send the message" },
          body: {
            type: "STRING",
            maxLength: 160,
            description: "SMS message text body. Must be at most 160 characters, brief, action-oriented, and reassuring."
          }
        },
        required: ["send_at", "body"]
      }
    }
  },
  required: [
    "risk_score",
    "risk_level",
    "risk_reasoning",
    "id_recovery",
    "nearby_resources"
  ]
};

async function generateWithGemini(userMessage: string): Promise<ServicePlanJSON> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not defined in the environment variables.');
  }
  const requestBody = {
    contents: [
      {
        parts: [{ text: userMessage }],
      },
    ],
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: PLAN_RESPONSE_SCHEMA,
      temperature: 0.2,
    },
  };

  let response;
  let errText = '';
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    // Call Google Gemini API using gemini-3.5-flash
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (response.ok) {
      break;
    }

    errText = await response.text();

    if (response.status === 429 && attempt < maxRetries) {
      let waitTimeMs = 15000; // Default 15s wait
      // Try to parse the exact retry time from the error message (e.g. "Please retry in 56.66s")
      const match = errText.match(/retry in ([\d\.]+)s/);
      if (match && match[1]) {
        waitTimeMs = Math.ceil(parseFloat(match[1])) * 1000 + 1000; // Add 1s buffer
      }
      console.warn(`[Gemini API] 429 Rate Limit hit. Retrying attempt ${attempt}/${maxRetries} in ${waitTimeMs / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
      continue;
    }

    // Break on non-429 errors or if max retries reached
    break;
  }

  if (!response || !response.ok) {
    throw new Error(`Gemini API error (${response?.status || 'Unknown'}): ${errText}`);
  }

  const resJson = await response.json();
  const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';

  try {
    return await parseAndValidate(rawText);
  } catch (err) {
    console.error('Failed to parse or validate initial Gemini response, retrying with strict prompt. Response was:', rawText);
    console.error('Validation error details:', err);
    
    // Simple retry
    const retryResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: userMessage }],
            },
            {
              role: 'model',
              parts: [{ text: rawText }]
            },
            {
              role: 'user',
              parts: [{ text: 'Return only valid raw JSON. Match the schema exactly. No explanation, no code blocks, just raw JSON.' }]
            }
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: PLAN_RESPONSE_SCHEMA,
            temperature: 0.1,
          },
        }),
      }
    );

    if (!retryResponse.ok) {
      throw new Error(`Gemini API retry error: ${await retryResponse.text()}`);
    }

    const retryJson = await retryResponse.json();
    const retryText = retryJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return await parseAndValidate(retryText);
  }
}

async function generateWithOpenAI(userMessage: string): Promise<ServicePlanJSON> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined in the environment variables.');
  }

  const requestBody = {
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userMessage }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2,
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${errText}`);
  }

  const resJson = await response.json();
  const rawText = resJson.choices?.[0]?.message?.content || '';

  try {
    return await parseAndValidate(rawText);
  } catch (err) {
    console.error('Failed to parse or validate initial OpenAI response, retrying...', err);
    
    // Simple retry
    const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
          { role: 'assistant', content: rawText },
          { role: 'user', content: 'Return only valid raw JSON. Match the schema exactly. No explanation, no code blocks, just raw JSON.' }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!retryResponse.ok) {
      throw new Error(`OpenAI API retry error: ${await retryResponse.text()}`);
    }

    const retryJson = await retryResponse.json();
    const retryText = retryJson.choices?.[0]?.message?.content || '';
    return await parseAndValidate(retryText);
  }
}

export async function generateServicePlan(
  clientData: IntakeFormData,
  searchResults: SearchResults,
  risk: RiskAssessment,
  benefitsAnalysis: object,
  housingRanking: object[]
): Promise<ServicePlanJSON> {
  const userMessage = buildPrompt(clientData, searchResults, risk, benefitsAnalysis, housingRanking);
  
  try {
    console.log('[generateServicePlan] Attempting to generate plan using Gemini...');
    return await generateWithGemini(userMessage);
  } catch (error) {
    console.warn('[generateServicePlan] Gemini failed or timed out. Falling back to OpenAI.', error);
    return await generateWithOpenAI(userMessage);
  }
}
