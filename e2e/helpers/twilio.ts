/**
 * Twilio SMS helper — polls for the most recent outbound SMS sent to a phone
 * number via this Twilio account and extracts the 6-digit OTP.
 *
 * This helper is used when running E2E tests in Clerk live mode where the app
 * sends OTPs via Clerk's carrier, which is NOT this Twilio account. In that
 * case, use the Clerk sign-in token approach in `clerk.ts` instead.
 *
 * This helper is useful when:
 *   - The app sends OTPs directly through this Twilio account (not via Clerk)
 *   - You control the sending Twilio number and the receiving number
 *
 * Credentials are read from environment variables:
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 */

const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 30_000;

/** Clerk test mode magic OTP — returned when the key starts with sk_test_ */
export const CLERK_TEST_OTP = "424242";

/**
 * Returns whether the current Clerk configuration is in test mode.
 * In test mode, the magic phone number +15555550104 always receives OTP 424242.
 */
export function isClerkTestMode(): boolean {
  const key = process.env.CLERK_SECRET_KEY ?? "";
  return key.startsWith("sk_test_");
}

interface TwilioMessage {
  sid: string;
  to: string;
  from: string;
  body: string;
  date_created: string;
  direction: string;
  status: string;
}

interface TwilioMessagesResponse {
  messages: TwilioMessage[];
}

function basicAuthHeader(accountSid: string, authToken: string): string {
  return "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
}

async function fetchLatestSmsBody(
  accountSid: string,
  authToken: string,
  toNumber: string,
  afterDate: Date,
): Promise<string | null> {
  const dateStr = afterDate.toISOString().replace("T", " ").slice(0, 19);
  const params = new URLSearchParams({
    To: toNumber,
    DateSent: dateStr,
    PageSize: "5",
  });

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: basicAuthHeader(accountSid, authToken),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Twilio API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as TwilioMessagesResponse;

  if (!data.messages || data.messages.length === 0) {
    return null;
  }

  // Messages are returned newest-first
  const latest = data.messages[0];
  return latest.body;
}

function extractOtp(body: string): string | null {
  const match = body.match(/\b(\d{6})\b/);
  return match ? match[1] : null;
}

/**
 * Polls Twilio until a 6-digit OTP SMS arrives at `toNumber`.
 *
 * In Clerk test mode, returns the magic OTP immediately without making any
 * network calls (Clerk test mode uses `424242` for +15555550104).
 *
 * @param toNumber - E.164 formatted phone number
 * @returns The 6-digit OTP string
 * @throws If no OTP arrives within POLL_TIMEOUT_MS
 */
export async function waitForOtp(toNumber: string): Promise<string> {
  // In Clerk test mode, the OTP is always 424242 for the magic test number
  if (isClerkTestMode()) {
    return CLERK_TEST_OTP;
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error(
      "TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN must be set in environment",
    );
  }

  const startTime = new Date(Date.now() - 5_000);
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    const body = await fetchLatestSmsBody(accountSid, authToken, toNumber, startTime);

    if (body) {
      const otp = extractOtp(body);
      if (otp) {
        return otp;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }

  throw new Error(
    `Timed out waiting for OTP SMS to ${toNumber} after ${POLL_TIMEOUT_MS}ms`,
  );
}
