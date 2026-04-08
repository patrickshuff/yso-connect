import { logger } from "@/lib/logger";

interface SendSMSSuccess {
  success: true;
  sid: string;
}

interface SendSMSFailure {
  success: false;
  error: string;
}

export type SendSMSResult = SendSMSSuccess | SendSMSFailure;

export async function sendSMS(to: string, body: string): Promise<SendSMSResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.warn("Twilio env vars not configured, returning mock success", {
      to,
      bodyLength: body.length,
    });
    return { success: true, sid: `mock_${crypto.randomUUID()}` };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        To: to,
        From: fromNumber,
        Body: body,
      }).toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Twilio API error", {
        status: response.status,
        body: errorBody,
        to,
      });
      return { success: false, error: `Twilio API error: ${response.status}` };
    }

    const data: { sid: string } = await response.json();
    logger.info("SMS sent successfully", { sid: data.sid, to });
    return { success: true, sid: data.sid };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Failed to send SMS", { error: message, to });
    return { success: false, error: message };
  }
}
