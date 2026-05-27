import { google } from 'googleapis';

function getCalendarClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
}

export interface CalendarEventResult {
  eventId: string;
  eventLink: string;
}

export async function createEvent(
  title: string,
  datetime: string | Date,
  location: string,
  address: string,
  description: string,
  attendeeEmail?: string
): Promise<CalendarEventResult> {
  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    console.warn("Google Calendar is unconfigured (missing GOOGLE_REFRESH_TOKEN). Skipping API call.");
    return {
      eventId: 'CALENDAR_PENDING',
      eventLink: '#',
    };
  }

  const calendar = getCalendarClient();
  const tz = process.env.GOOGLE_CALENDAR_TIMEZONE || 'America/Los_Angeles';

  const startTime = new Date(datetime);
  const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

  const eventBody = {
    summary: title,
    location: address ? `${location}, ${address}` : location,
    description,
    start: { dateTime: startTime.toISOString(), timeZone: tz },
    end: { dateTime: endTime.toISOString(), timeZone: tz },
    attendees: attendeeEmail ? [{ email: attendeeEmail }] : [],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 },
        { method: 'popup', minutes: 30 },
      ],
    },
  };

  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: eventBody,
  });

  return {
    eventId: response.data.id!,
    eventLink: response.data.htmlLink!,
  };
}

export function nextBusinessDay(from: Date, hour = 9): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(hour, 0, 0, 0);
  return d;
}

export function hoursFromNow(from: Date, hours: number, hour?: number): Date {
  const d = new Date(from.getTime() + hours * 60 * 60 * 1000);
  if (hour !== undefined) d.setHours(hour, 0, 0, 0);
  return d;
}
