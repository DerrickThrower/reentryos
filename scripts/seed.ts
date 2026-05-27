import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-for-types'
);

const intakeData = {
  name: 'Marcus Thompson',
  release_date: new Date().toISOString().split('T')[0],
  city: 'Sacramento',
  state: 'CA',
  has_id: false,
  housing_status: 'none',
  medical_conditions: 'Type 2 diabetes, needs insulin',
  prior_charges: 'nonviolent drug offense',
  phone_number: process.env.TWILIO_PHONE_NUMBER || '+19165550199',
};

async function main() {
  console.log('Deploying reentry case coordination agent pipeline for Marcus Thompson...');
  console.log(`Payload: ${JSON.stringify(intakeData, null, 2)}\n`);

  try {
    const response = await fetch('http://localhost:3000/api/intake/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(intakeData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('No readable response body returned from SSE pipeline stream.');
    }

    // Determine reader strategy based on stream type (standard Node vs Browser standard stream)
    const body: any = response.body;
    let clientId: string | null = null;

    if (typeof body.getReader === 'function') {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const raw = JSON.parse(line.slice(6));
            console.log(`[${raw.agent.toUpperCase()}] Status: ${raw.status.toUpperCase()} | ${raw.message}`);

            if (raw.agent === 'Orchestrator' && raw.status === 'done' && raw.message.includes('complete')) {
              clientId = raw.data?.client_id || null;
            }
          } catch {
            // Ignore partial parse failures
          }
        }
      }
    } else {
      // ReadableStream in standard Node async iterable
      let buffer = '';
      for await (const chunk of body) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const raw = JSON.parse(line.slice(6));
            console.log(`[${raw.agent.toUpperCase()}] Status: ${raw.status.toUpperCase()} | ${raw.message}`);

            if (raw.agent === 'Orchestrator' && raw.status === 'done' && raw.message.includes('complete')) {
              clientId = raw.data?.client_id || null;
            }
          } catch {
            // Ignore partial parse failures
          }
        }
      }
    }

    console.log('\n===================================================');
    console.log('SEED PIPELINE COMPLETED SUCCESSFULLY.');
    if (clientId) {
      console.log(`CORRELATED CLIENT ID: ${clientId}`);
    }
    console.log('Open http://localhost:3000/dashboard to view Marcus\'s plan.');
    console.log('===================================================\n');
  } catch (err) {
    console.error('\n❌ SEED PIPELINE FAILED WITH ERROR:', err);
    process.exit(1);
  }
}

main();
