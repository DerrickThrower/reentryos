# ReEntryOS

ReEntryOS is an AI-powered case coordination system designed to synthesize hyper-localized, actionable service plans for individuals in their critical first 72 hours after release from incarceration. By deploying a team of specialized AI agents, the platform automates risk assessment, coordinates transitional housing, determines benefit eligibilities, schedules Google Calendar appointments, and manages Twilio SMS communication sequences.

---

## 🚀 Setup Instructions

Follow these numbered steps to configure ReEntryOS in your development environment:

1. **Clone the Repository**
   ```bash
   git clone <your-repo-link>
   cd reentryos
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment Variables**
   - Duplicate the example template to create your local variables:
     ```bash
     cp .env.example .env.local
     ```
   - Open `.env.local` and populate all requested API keys (see [API Key Provisioning](#-api-key-provisioning) below).

4. **Initialize Database Migrations**
   - Go to [Supabase Console](https://supabase.com/).
   - Open your project's **SQL Editor**.
   - Copy the entire SQL contents from [001_initial_schema.sql](file:///Users/derrickthrower/reentryos/migrations/001_initial_schema.sql) and execute the query to set up tables, indexes, and row-level security (RLS).

5. **Start the Development Server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard) to view the interface.

---

## 🔑 API Key Provisioning

Configure each required service to populate `.env.local`:

### 1. Anthropic Claude API
- **Endpoint**: [console.anthropic.com](https://console.anthropic.com/)
- Sign in or create a developer profile, navigate to the API Keys section, and generate an API key. Add it to `ANTHROPIC_API_KEY`.

### 2. Tavily Search API
- **Endpoint**: [tavily.com](https://tavily.com/)
- Register for a developer account to get a search API key. This powers the agent's web searches for real-time local shelters, food banks, and vital records offices. Add it to `TAVILY_API_KEY`.

### 3. Supabase Database
- **Endpoint**: [supabase.com](https://supabase.com/)
- Create a new project.
- Go to **Project Settings > API** to copy:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (required to bypass RLS policies during intake flows).

### 4. Twilio SMS
- **Endpoint**: [twilio.com](https://twilio.com/)
- Copy your `TWILIO_ACCOUNT_SID` and `TWILIO_AUTH_TOKEN` from the Twilio Console Dashboard.
- **Buy a phone number** with SMS capability and add it to `TWILIO_PHONE_NUMBER`.
- Create a **Messaging Service** under **Messaging > Services** in your Twilio Console. Note the `TWILIO_MESSAGING_SERVICE_SID` for automated scheduling rules.
- **Configure Twilio Webhook**:
  - In the Twilio Console under your active Phone Number settings, scroll to the **Messaging** section.
  - Set the "A MESSAGE COMES IN" webhook URL to:
    ```
    https://<your-deployed-domain>/api/sms/webhook
    ```
  - Ensure the method is set to `POST`.

### 5. Google Calendar (OAuth2 Credentials)
To allow the Calendar Agent to automatically book client appointments on your calendar:
1. Go to the [Google Developer OAuth2 Playground](https://developers.google.com/oauthplayground).
2. On the right, click the **OAuth2 Playground Configuration** gear icon and check the "Use your own OAuth credentials" box (if you have them; otherwise leave it unchecked for testing).
3. Under **Select & authorize APIs (Step 1)** on the left, search for `Calendar API v3` and select:
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/calendar.events`
4. Click **Authorize APIs** and authenticate with your Google account.
5. In **Step 2**, click **Exchange authorization code for tokens**.
6. Copy the **Refresh Token** into your `.env.local` as `GOOGLE_REFRESH_TOKEN`.
7. Configure `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` from your Google Cloud Console credentials page, and specify the target `GOOGLE_CALENDAR_ID` (usually your primary email address).

---

## 🎯 Demo & Evaluation Instructions

We have included a seed pipeline script to simulate a client intake flow and verify agent execution:

1. **Deploy Mock Client Intake Pipeline**
   Run the seed script in a separate terminal:
   ```bash
   npx ts-node -r dotenv/config --project tsconfig.json scripts/seed.ts
   ```
   This will post a mock profile for **Marcus Thompson** to `/api/intake/stream`, instantiate all AI agents, stream their logs in real-time, synthesize the plan, and output Marcus's correlated Client ID.

2. **Navigate the Coordination Hub**
   - Open [http://localhost:3000/dashboard](http://localhost:3000/dashboard).
   - Select **Marcus Thompson** from the sidebar list.
   - **72-HOUR PLAN Tab**: Inspect synthesized urgent needs, transitional housing, snap/medicaid screening, and vital records DMV pathways.
   - **SCHEDULE Tab**: Confirm Google Calendar appointments were created and synchronized.
   - **MESSAGES Tab**: Inspect automated messages queued to Twilio scheduler.
   - **AGENT LOGS Tab**: Click through individual agent filter chips ("HOUSING", "BENEFITS", "PLAN") to inspect pipeline telemetry logs and duration costs.
