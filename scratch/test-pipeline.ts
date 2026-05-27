import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { generateServicePlan } from '../lib/anthropic';
import { IntakeFormData, SearchResults, RiskAssessment } from '../types/index';

const data: IntakeFormData = {
  name: 'john',
  release_date: '2026-05-26',
  city: 'Sacramento',
  state: 'CA',
  has_id: false,
  housing_status: 'none',
  medical_conditions: 'diabetes',
  prior_charges: '',
  phone_number: '9255972228',
};

const searchResults: SearchResults = {
  housing: [
    { title: 'Shelter Sacramento', content: 'Sacramento homeless shelter transitional housing.', url: '', score: 0.9 }
  ],
  benefits: [
    { title: 'Medicaid snap benefits Sac County', content: 'Medicaid SNAP benefits enrollment location.', url: '', score: 0.9 }
  ],
  clinics: [],
  employers: [],
  food_banks: [],
  dmv: []
};

const risk: RiskAssessment = {
  risk_score: 90,
  risk_level: 'critical',
  risk_reasoning: 'Critical risk reasoning details.'
};

const benefitsAnalysis = {};
const housingRanking: object[] = [];

async function run() {
  console.log('Running generateServicePlan locally...');
  try {
    const plan = await generateServicePlan(data, searchResults, risk, benefitsAnalysis, housingRanking);
    console.log('PLAN GENERATED SUCCESSFULLY!');
    console.log(JSON.stringify(plan, null, 2));
  } catch (err) {
    console.error('Plan generation failed!');
    console.error(err);
  }
}

run();
