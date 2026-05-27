-- ReEntryOS Initial Schema
-- Run this in your Supabase SQL editor

-- Enable required extensions
create extension if not exists "pgcrypto";

-- ─── Clients ──────────────────────────────────────────────────────────────────

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  release_date date not null,
  city text not null,
  state text not null,
  has_id boolean default false,
  housing_status text check (housing_status in ('none','temporary','stable')),
  medical_conditions text,
  prior_charges text,
  phone_number text,
  risk_score integer,
  risk_level text check (risk_level in ('critical','warning','stable')),
  created_at timestamp with time zone default now()
);

-- ─── Service Plans ────────────────────────────────────────────────────────────

create table if not exists service_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  plan_json jsonb,
  generated_at timestamp with time zone default now(),
  worker_approved boolean default false
);

-- ─── Appointments ─────────────────────────────────────────────────────────────

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  title text,
  location text,
  address text,
  scheduled_time timestamp with time zone,
  calendar_event_id text,
  calendar_event_link text,
  sms_sent boolean default false,
  created_at timestamp with time zone default now()
);

-- ─── SMS Log ──────────────────────────────────────────────────────────────────

create table if not exists sms_log (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  direction text check (direction in ('inbound','outbound')),
  body text,
  twilio_sid text,
  scheduled_at timestamp with time zone,
  flagged boolean default false,
  created_at timestamp with time zone default now()
);

-- ─── Tasks ────────────────────────────────────────────────────────────────────

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  category text,
  action text,
  priority integer,
  completed boolean default false,
  deadline text,
  created_at timestamp with time zone default now()
);

-- ─── Agent Logs ───────────────────────────────────────────────────────────────

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  agent_name text,
  status text check (status in ('working','done','error')),
  message text,
  duration_ms integer,
  created_at timestamp with time zone default now()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

create index if not exists idx_clients_risk_score on clients(risk_score desc);
create index if not exists idx_service_plans_client_id on service_plans(client_id);
create index if not exists idx_appointments_client_id on appointments(client_id);
create index if not exists idx_sms_log_client_id on sms_log(client_id);
create index if not exists idx_sms_log_flagged on sms_log(flagged) where flagged = true;
create index if not exists idx_tasks_client_id on tasks(client_id);
create index if not exists idx_agent_logs_client_id on agent_logs(client_id);
create index if not exists idx_clients_phone on clients(phone_number);

-- ─── Enable Realtime ──────────────────────────────────────────────────────────

-- Run these if supabase_realtime publication exists (it does by default)
alter publication supabase_realtime add table agent_logs;
alter publication supabase_realtime add table sms_log;
alter publication supabase_realtime add table clients;
alter publication supabase_realtime add table appointments;

-- ─── Row Level Security ───────────────────────────────────────────────────────

-- Enable RLS (service role key bypasses this, used in API routes)
alter table clients enable row level security;
alter table service_plans enable row level security;
alter table appointments enable row level security;
alter table sms_log enable row level security;
alter table tasks enable row level security;
alter table agent_logs enable row level security;

-- Allow authenticated users full access
create policy "Authenticated users full access - clients"
  on clients for all to authenticated using (true) with check (true);

create policy "Authenticated users full access - service_plans"
  on service_plans for all to authenticated using (true) with check (true);

create policy "Authenticated users full access - appointments"
  on appointments for all to authenticated using (true) with check (true);

create policy "Authenticated users full access - sms_log"
  on sms_log for all to authenticated using (true) with check (true);

create policy "Authenticated users full access - tasks"
  on tasks for all to authenticated using (true) with check (true);

create policy "Authenticated users full access - agent_logs"
  on agent_logs for all to authenticated using (true) with check (true);
