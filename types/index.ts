// ─── Database Types ───────────────────────────────────────────────────────────

export interface Client {
  id: string;
  name: string;
  release_date: string;
  city: string;
  state: string;
  has_id: boolean;
  housing_status: 'none' | 'temporary' | 'stable';
  medical_conditions: string | null;
  prior_charges: string | null;
  phone_number: string | null;
  risk_score: number | null;
  risk_level: 'critical' | 'warning' | 'stable' | null;
  created_at: string;
}

export interface ServicePlan {
  id: string;
  client_id: string;
  plan_json: ServicePlanJSON;
  generated_at: string;
  worker_approved: boolean;
}

export interface Appointment {
  id: string;
  client_id: string;
  title: string | null;
  location: string | null;
  address: string | null;
  scheduled_time: string;
  calendar_event_id: string | null;
  calendar_event_link: string | null;
  sms_sent: boolean;
  created_at: string;
}

export interface SMSLog {
  id: string;
  client_id: string;
  direction: 'inbound' | 'outbound';
  body: string;
  twilio_sid: string | null;
  scheduled_at: string | null;
  flagged: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  category: string;
  action: string;
  priority: number;
  completed: boolean;
  deadline: string | null;
  created_at: string;
}

export interface AgentLog {
  id: string;
  client_id: string;
  agent_name: string;
  status: 'working' | 'done' | 'error';
  message: string;
  duration_ms: number | null;
  created_at: string;
}

// ─── Service Plan JSON Schema ──────────────────────────────────────────────────

export interface PlanResource {
  name: string;
  address: string;
  phone: string;
  hours: string;
  verified: boolean;
}

export interface UrgentNeed {
  priority: number;
  category: 'housing' | 'medical' | 'benefits' | 'id' | 'employment' | 'legal';
  action: string;
  why: string;
  deadline: 'within 24h' | 'within 48h' | 'within 72h';
  resource: PlanResource;
}

export interface HousingOption {
  name: string;
  address: string;
  phone: string;
  type: 'shelter' | 'transitional' | 'halfway' | 'emergency';
  restrictions: string;
  medical_accessible: boolean;
  distance_miles: number;
  verified: boolean;
}

export interface BenefitsEligibility {
  program: 'Medicaid' | 'SNAP' | 'SSI' | 'TANF' | 'GA';
  likely_eligible: boolean;
  reasoning: string;
  next_step: string;
  deadline: string;
  office_address: string;
  office_phone: string;
}

export interface IDRecovery {
  steps: string[];
  required_documents: string[];
  nearest_dmv: string;
  nearest_dmv_address: string;
  nearest_vital_records: string;
}

export interface Clinic {
  name: string;
  address: string;
  phone: string;
  accepts_uninsured: boolean;
}

export interface FoodBank {
  name: string;
  address: string;
  hours: string;
}

export interface Transit {
  nearest_stop: string;
  day_pass_cost: string;
}

export interface NearbyResources {
  clinics: Clinic[];
  food_banks: FoodBank[];
  transit: Transit;
}

export interface SecondChanceEmployer {
  name: string;
  address: string;
  phone: string;
  industry: string;
  verified: boolean;
}

export interface AppointmentPlan {
  title: string;
  suggested_time: string;
  location: string;
  address: string;
  notes: string;
}

export interface SMSMessage {
  send_at: string;
  body: string;
}

export interface ServicePlanJSON {
  risk_score: number;
  risk_level: 'critical' | 'warning' | 'stable';
  risk_reasoning: string;
  urgent_needs: UrgentNeed[];
  housing_options: HousingOption[];
  benefits_eligibility: BenefitsEligibility[];
  id_recovery: IDRecovery;
  nearby_resources: NearbyResources;
  appointments: AppointmentPlan[];
  second_chance_employers: SecondChanceEmployer[];
  caseworker_notes: string;
  sms_messages: SMSMessage[];
}

// ─── Intake & API ─────────────────────────────────────────────────────────────

export interface IntakeFormData {
  name: string;
  release_date: string;
  city: string;
  state: string;
  phone_number: string;
  has_id: boolean;
  housing_status: 'none' | 'temporary' | 'stable';
  medical_conditions: string;
  prior_charges: string;
}

// ─── Agent Events (SSE) ───────────────────────────────────────────────────────

export interface AgentEvent {
  agent: string;
  status: 'working' | 'done' | 'error';
  message: string;
  timestamp: string;
  data?: Partial<ServicePlanJSON> & {
    client_id?: string;
    plan_id?: string;
  };
}

// ─── Search ───────────────────────────────────────────────────────────────────

export interface TavilyResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface SearchResults {
  housing: TavilyResult[];
  benefits: TavilyResult[];
  clinics: TavilyResult[];
  employers: TavilyResult[];
  food_banks: TavilyResult[];
  dmv: TavilyResult[];
}

// ─── Composed Client View ─────────────────────────────────────────────────────

export interface ClientWithDetails extends Client {
  service_plans?: ServicePlan[];
  appointments?: Appointment[];
  sms_log?: SMSLog[];
  agent_logs?: AgentLog[];
  tasks?: Task[];
  unread_sms?: boolean;
  latest_appointment?: Appointment | null;
}

// ─── Risk Assessment ──────────────────────────────────────────────────────────

export interface RiskAssessment {
  risk_score: number;
  risk_level: 'critical' | 'warning' | 'stable';
  risk_reasoning: string;
}
