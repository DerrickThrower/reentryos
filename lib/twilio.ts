import twilio from 'twilio';

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!);
}

const FROM = process.env.TWILIO_PHONE_NUMBER!;
const MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

export async function sendSMS(to: string, body: string): Promise<string> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn("Twilio credentials unconfigured. Skipping SMS dispatch.");
    return "SMS_SIMULATED";
  }
  const client = getClient();
  const message = await client.messages.create({ body, from: FROM, to });
  return message.sid;
}

export async function scheduleSMS(to: string, body: string, sendAt: Date): Promise<string> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !MESSAGING_SERVICE_SID) {
    console.warn("Twilio credentials or Messaging Service SID unconfigured. Skipping scheduled SMS.");
    return "SMS_SIMULATED_SCHEDULED";
  }
  const client = getClient();
  const now = new Date();
  const minSendAt = new Date(now.getTime() + 16 * 60 * 1000);
  const actualSendAt = sendAt < minSendAt ? minSendAt : sendAt;

  const message = await client.messages.create({
    body,
    to,
    messagingServiceSid: MESSAGING_SERVICE_SID,
    scheduleType: 'fixed',
    sendAt: actualSendAt,
  });
  return message.sid;
}

export function buildTwiML(replyMessage?: string): string {
  if (replyMessage) {
    return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${replyMessage}</Message></Response>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><Response></Response>`;
}
