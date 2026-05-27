import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function test() {
  console.log('Fetching last client...');
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (clientErr) {
    console.error('Error fetching client:', clientErr);
    return;
  }

  console.log('Found client:', client.id, client.name);

  console.log('\nFetching agent logs...');
  const { data: logs, error: logsErr } = await supabase
    .from('agent_logs')
    .select('*')
    .eq('client_id', client.id)
    .order('created_at', { ascending: true });

  if (logsErr) {
    console.error('Error fetching logs:', logsErr);
  } else {
    console.log(`Found ${logs.length} logs:`);
    logs.forEach(log => {
      console.log(`[${log.agent_name}] [${log.status}] ${log.message}`);
    });
  }

  console.log('\nFetching service plans...');
  const { data: plans, error: plansErr } = await supabase
    .from('service_plans')
    .select('*')
    .eq('client_id', client.id);

  if (plansErr) {
    console.error('Error fetching plans:', plansErr);
  } else {
    console.log(`Found ${plans.length} service plans.`);
    if (plans.length > 0) {
      console.log('Plan JSON:', JSON.stringify(plans[0].plan_json, null, 2));
    }
  }
}

test();
