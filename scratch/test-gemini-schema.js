const fs = require('fs');
const path = require('path');

// Simple .env.local loader
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
    env[match[1]] = value;
  }
});

const apiKey = env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('GEMINI_API_KEY not found in .env.local');
  process.exit(1);
}

const SYSTEM_PROMPT = `You are ReEntryOS, an AI coordination assistant for reentry case workers helping recently released individuals during their first 72 hours of freedom.
Your job is to generate structured, actionable service plans grounded in real resources.
Rules:
- Always return valid JSON matching the schema provided. No preamble. No markdown fences. Raw JSON only.
- Use web search results passed to you to reference REAL resources — real addresses, real phone numbers, real office hours.
- Never fabricate contact information.
- If uncertain about a resource flag it with verified: false.
- Prioritize by urgency: housing and medical before benefits before employment before legal.
- Be specific and direct.
- Every recommendation must have a concrete next action with a deadline.`;

const userMessage = `Generate a complete 72-hour reentry service plan for this client. Current date/time: ${new Date().toISOString()}

CLIENT DATA:
{
  "name": "john",
  "release_date": "2026-05-26",
  "city": "Sacramento",
  "state": "CA",
  "has_id": false,
  "housing_status": "none",
  "medical_conditions": "diabetes",
  "prior_charges": "",
  "phone_number": "9255972228"
}

PRE-COMPUTED RISK ASSESSMENT (use these values):
{
  "risk_score": 90,
  "risk_level": "critical",
  "risk_reasoning": "Score 90/100 — no housing secured, no government ID, active medical needs, no income source."
}

BENEFITS ANALYSIS:
[
  {
    "program": "Medicaid",
    "likely_eligible": true,
    "reasoning": "Recently released with no income. Medicaid enrollment immediately post-release.",
    "next_step": "Apply at county benefits office.",
    "deadline": "within 24h"
  }
]

RANKED HOUSING OPTIONS (ranked best first):
[
  {
    "rank": 1,
    "name": "Union Gospel Mission Sacramento",
    "content_snippet": "Union Gospel Mission provides emergency shelter, food, clothing, and transitional programs. Address: 400 Bannon St, Sacramento, CA 95811. Phone: (916) 447-3268.",
    "url": "https://ugmsac.com",
    "relevance_score": 0.95
  }
]

LIVE SEARCH RESULTS:
{
  "housing": [
    { "title": "Union Gospel Mission Sacramento", "content": "Emergency shelter, food, clothing. 400 Bannon St, Sacramento, CA 95811. Phone: (916) 447-3268.", "url": "https://ugmsac.com", "score": 0.95 }
  ],
  "benefits": [],
  "clinics": [],
  "employers": [],
  "food_banks": [],
  "dmv": []
}

Return the complete service plan as raw JSON only. Match the schema exactly.`;

const responseSchema = {
  "type": "OBJECT",
  "properties": {
    "risk_score": { "type": "INTEGER", "description": "The pre-computed risk score (0-100)" },
    "risk_level": { "type": "STRING", "enum": ["critical", "warning", "stable"], "description": "The risk level" },
    "risk_reasoning": { "type": "STRING", "description": "Reasoning for the risk level" },
    "urgent_needs": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "priority": { "type": "INTEGER" },
          "category": { "type": "STRING", "enum": ["housing", "medical", "benefits", "id", "employment", "legal"] },
          "action": { "type": "STRING" },
          "why": { "type": "STRING" },
          "deadline": { "type": "STRING" },
          "resource": {
            "type": "OBJECT",
            "properties": {
              "name": { "type": "STRING" },
              "address": { "type": "STRING" },
              "phone": { "type": "STRING" },
              "hours": { "type": "STRING" },
              "verified": { "type": "BOOLEAN" }
            },
            "required": ["name"]
          }
        },
        "required": ["priority", "category", "action", "why", "resource"]
      }
    },
    "housing_options": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "name": { "type": "STRING" },
          "address": { "type": "STRING" },
          "phone": { "type": "STRING" },
          "type": { "type": "STRING", "enum": ["shelter", "transitional", "halfway", "emergency"] },
          "restrictions": { "type": "STRING" },
          "medical_accessible": { "type": "BOOLEAN" },
          "distance_miles": { "type": "NUMBER" },
          "verified": { "type": "BOOLEAN" }
        },
        "required": ["name"]
      }
    },
    "benefits_eligibility": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "program": { "type": "STRING", "enum": ["Medicaid", "SNAP", "SSI", "TANF", "GA"] },
          "likely_eligible": { "type": "BOOLEAN" },
          "reasoning": { "type": "STRING" },
          "next_step": { "type": "STRING" },
          "deadline": { "type": "STRING" },
          "office_address": { "type": "STRING" },
          "office_phone": { "type": "STRING" }
        },
        "required": ["program"]
      }
    },
    "id_recovery": {
      "type": "OBJECT",
      "properties": {
        "steps": { "type": "ARRAY", "items": { "type": "STRING" } },
        "required_documents": { "type": "ARRAY", "items": { "type": "STRING" } },
        "nearest_dmv": { "type": "STRING" },
        "nearest_dmv_address": { "type": "STRING" },
        "nearest_vital_records": { "type": "STRING" }
      },
      "required": ["steps", "required_documents", "nearest_dmv"]
    },
    "nearby_resources": {
      "type": "OBJECT",
      "properties": {
        "clinics": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "name": { "type": "STRING" },
              "address": { "type": "STRING" },
              "phone": { "type": "STRING" },
              "accepts_uninsured": { "type": "BOOLEAN" }
            },
            "required": ["name"]
          }
        },
        "food_banks": {
          "type": "ARRAY",
          "items": {
            "type": "OBJECT",
            "properties": {
              "name": { "type": "STRING" },
              "address": { "type": "STRING" },
              "hours": { "type": "STRING" }
            },
            "required": ["name"]
          }
        },
        "transit": {
          "type": "OBJECT",
          "properties": {
            "nearest_stop": { "type": "STRING" },
            "day_pass_cost": { "type": "STRING" }
          },
          "required": ["nearest_stop", "day_pass_cost"]
        }
      },
      "required": ["clinics", "food_banks", "transit"]
    },
    "appointments": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "title": { "type": "STRING" },
          "suggested_time": { "type": "STRING" },
          "location": { "type": "STRING" },
          "address": { "type": "STRING" },
          "notes": { "type": "STRING" }
        },
        "required": ["title", "suggested_time"]
      }
    },
    "second_chance_employers": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "name": { "type": "STRING" },
          "address": { "type": "STRING" },
          "phone": { "type": "STRING" },
          "industry": { "type": "STRING" },
          "verified": { "type": "BOOLEAN" }
        },
        "required": ["name"]
      }
    },
    "caseworker_notes": { "type": "STRING" },
    "sms_messages": {
      "type": "ARRAY",
      "items": {
        "type": "OBJECT",
        "properties": {
          "send_at": { "type": "STRING" },
          "body": { "type": "STRING" }
        },
        "required": ["send_at", "body"]
      }
    }
  },
  "required": [
    "risk_score",
    "risk_level",
    "risk_reasoning",
    "id_recovery",
    "nearby_resources"
  ]
};

async function test() {
  console.log('Sending request to Gemini...');
  try {
    const response = await fetch(
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
          ],
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: responseSchema,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini API error (${response.status}):`, errText);
      return;
    }

    const resJson = await response.json();
    const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('--- RAW RESPONSE TEXT ---');
    console.log(rawText);
    console.log('-------------------------');
    
    const parsed = JSON.parse(rawText);
    console.log('Successfully parsed as JSON!');
    console.log('Keys in parsed object:', Object.keys(parsed));
    console.log('risk_score:', parsed.risk_score);
    console.log('risk_level:', parsed.risk_level);
  } catch (err) {
    console.error('Error during test:', err);
  }
}

test();
