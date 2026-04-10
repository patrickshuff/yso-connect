import { logger } from "@/lib/logger";

interface SendEmailSuccess {
  success: true;
  id: string;
}

interface SendEmailFailure {
  success: false;
  error: string;
}

export type SendEmailResult = SendEmailSuccess | SendEmailFailure;

export async function sendEmail(
  to: string,
  subject: string,
  htmlBody: string,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const rawFrom = process.env.RESEND_FROM_ADDRESS ?? "noreply@ysoconnect.com";
  const fromName = process.env.RESEND_FROM_NAME ?? "YSO Connect";
  const fromAddress = `${fromName} <${rawFrom}>`;

  if (!apiKey) {
    logger.warn("RESEND_API_KEY not configured, returning mock success", {
      to,
      subject,
    });
    return { success: true, id: `mock_${crypto.randomUUID()}` };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html: htmlBody,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      logger.error("Resend API error", {
        status: response.status,
        body: errorBody,
        to,
      });
      return { success: false, error: `Resend API error: ${response.status}` };
    }

    const data: { id: string } = await response.json();
    logger.info("Email sent successfully", { id: data.id, to, subject });
    return { success: true, id: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("Failed to send email", { error: message, to });
    return { success: false, error: message };
  }
}
