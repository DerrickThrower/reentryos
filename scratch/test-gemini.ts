import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const apiKey = process.env.GEMINI_API_KEY!;
const SYSTEM_PROMPT = `You are ReEntryOS, an AI coordination assistant.
Rules:
- Always return valid JSON matching the schema. Raw JSON only.`;

const userMessage = `Generate a complete 72-hour reentry service plan for John. Return a JSON object with:
risk_score: 45,
risk_level: "warning",
risk_reasoning: "needs housing",
urgent_needs: [],
housing_options: [],
benefits_eligibility: [],
id_recovery: { steps: [], required_documents: [], nearest_dmv: "", nearest_dmv_address: "", nearest_vital_records: "" },
nearby_resources: { clinics: [], food_banks: [], transit: { nearest_stop: "", day_pass_cost: "" } },
appointments: [],
second_chance_employers: [],
caseworker_notes: "test notes",
sms_messages: []`;

async function run() {
  console.log('Calling Gemini 3.5 Flash...');
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
          temperature: 0.2,
        },
      }),
    }
  );

  const resJson = await response.json();
  console.log('API Status:', response.status);
  console.log('Response JSON:', JSON.stringify(resJson, null, 2));
}

run();
