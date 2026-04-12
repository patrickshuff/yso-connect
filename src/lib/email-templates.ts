import { buildUnsubscribeUrl } from "@/lib/unsubscribe-token";
import { buildConfirmationUrl } from "@/lib/confirmation-token";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const BRAND_BLUE = "#1d4ed8";
const BRAND_BLUE_LIGHT = "#eff6ff";

function baseLayout(headerHtml: string, bodyHtml: string, footerHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YSO Connect</title>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background-color:${BRAND_BLUE};padding:24px 40px;">
              ${headerHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              ${footerHtml}
            </td>
          </tr>
        </table>
        <!-- Below card -->
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;margin-top:16px;">
          <tr>
            <td align="center" style="font-size:11px;color:#9ca3af;padding:0 16px;">
              YSO Connect &mdash; Keeping youth sports families connected
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function standardHeader(orgName: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td>
        <span style="font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(255,255,255,0.7);">YSO Connect</span>
      </td>
    </tr>
    <tr>
      <td style="padding-top:4px;">
        <span style="font-size:20px;font-weight:700;color:#ffffff;">${escapeHtml(orgName)}</span>
      </td>
    </tr>
  </table>`;
}

function standardFooter(orgName: string, unsubscribeUrl: string): string {
  return `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
    You received this email because you are a member of <strong>${escapeHtml(orgName)}</strong>.
    &nbsp;&bull;&nbsp;
    <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
  </p>`;
}

export interface WelcomeEmailParams {
  firstName: string;
  orgName: string;
  appUrl: string;
  guardianId: string;
}

export function buildWelcomeEmail(params: WelcomeEmailParams): string {
  const { firstName, orgName, appUrl, guardianId } = params;
  const unsubscribeUrl = buildUnsubscribeUrl(appUrl, guardianId);
  const loginUrl = `${appUrl}/sign-in`;

  const header = standardHeader(orgName);

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;">Welcome, ${escapeHtml(firstName)}!</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      You've been added as a guardian in <strong>${escapeHtml(orgName)}</strong>.
      You'll start receiving important updates — schedule changes, announcements, and messages from your team's coaching staff.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background-color:${BRAND_BLUE_LIGHT};border-left:4px solid ${BRAND_BLUE};border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND_BLUE};">What to expect</p>
          <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
            <li>Game and practice schedule updates</li>
            <li>Important announcements from your coaching staff</li>
            <li>Team-wide messages and reminders</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.7;">
      Messages can come via email or text depending on your preferences.
      If you ever have questions, reach out directly to your coach or team administrator.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${BRAND_BLUE};border-radius:6px;">
          <a href="${loginUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Sign in to YSO Connect</a>
        </td>
      </tr>
    </table>
  `;

  const footer = standardFooter(orgName, unsubscribeUrl);

  return baseLayout(header, body, footer);
}

export interface GuardianConfirmationEmailParams {
  firstName: string;
  playerName: string;
  teamName: string;
  orgName: string;
  appUrl: string;
  guardianId: string;
}

export function buildGuardianConfirmationEmail(
  params: GuardianConfirmationEmailParams,
): string {
  const { firstName, playerName, teamName, orgName, appUrl, guardianId } =
    params;
  const confirmUrl = buildConfirmationUrl(appUrl, guardianId);
  const unsubscribeUrl = buildUnsubscribeUrl(appUrl, guardianId);

  const header = standardHeader(orgName);

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;">Hi ${escapeHtml(firstName)},</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      You've been added as a guardian for <strong>${escapeHtml(playerName)}</strong>
      on <strong>${escapeHtml(teamName)}</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.7;">
      Click the button below to confirm you'd like to receive schedule updates,
      reminders, and messages about ${escapeHtml(playerName)}'s team.
    </p>

    <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
      <tr>
        <td style="background-color:${BRAND_BLUE};border-radius:6px;">
          <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Confirm email updates</a>
        </td>
      </tr>
    </table>

    <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
      If you weren't expecting this, you can safely ignore this email.
    </p>
  `;

  const footer = standardFooter(orgName, unsubscribeUrl);

  return baseLayout(header, body, footer);
}

export interface BroadcastEmailParams {
  orgName: string;
  subject: string | null;
  body: string;
  appUrl: string;
  guardianId: string;
}

export function buildBroadcastEmail(params: BroadcastEmailParams): string {
  const { orgName, subject, body, appUrl, guardianId } = params;
  const unsubscribeUrl = buildUnsubscribeUrl(appUrl, guardianId);

  const header = standardHeader(orgName);

  const formattedBody = escapeHtml(body).replace(/\n/g, "<br>");

  const bodyHtml = `
    ${subject ? `<h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">${escapeHtml(subject)}</h2>` : ""}
    <p style="margin:0;font-size:16px;color:#374151;line-height:1.75;">${formattedBody}</p>
  `;

  const footer = standardFooter(orgName, unsubscribeUrl);

  return baseLayout(header, bodyHtml, footer);
}

export interface TrialReminder7dEmailParams {
  orgName: string;
  orgId: string;
  appUrl: string;
}

export function buildTrialReminder7dEmail(params: TrialReminder7dEmailParams): string {
  const { orgName, orgId, appUrl } = params;
  const billingUrl = `${appUrl}/dashboard/${orgId}/billing?utm_source=email&utm_medium=trial_reminder&utm_campaign=trial_7d`;

  const header = standardHeader(orgName);

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;">You&rsquo;re one week in</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      <strong>${escapeHtml(orgName)}</strong> has been on YSO Connect for a week.
      Here&rsquo;s what that means for your families: schedules in their pockets,
      messages that actually reach them, and one less thing to chase down.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background-color:${BRAND_BLUE_LIGHT};border-left:4px solid ${BRAND_BLUE};border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND_BLUE};">What you&rsquo;ve unlocked</p>
          <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
            <li>Teams and rosters organized</li>
            <li>Game and practice schedules published</li>
            <li>Guardian notifications working</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.7;">
      Keep everything running when your 30-day trial ends.
      YSO Connect is <strong>$10 for 6 months</strong> &mdash; less than $2/month to keep your whole program connected.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${BRAND_BLUE};border-radius:6px;">
          <a href="${billingUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Continue with YSO Connect &mdash; $10 for 6 months</a>
        </td>
      </tr>
    </table>
  `;

  const footer = `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
    You are receiving this email as the administrator of <strong>${escapeHtml(orgName)}</strong>.
    These reminders stop automatically once you subscribe or your trial ends.
  </p>`;

  return baseLayout(header, body, footer);
}

export interface TrialReminder25dEmailParams {
  orgName: string;
  orgId: string;
  appUrl: string;
  daysRemaining: number;
}

export function buildTrialReminder25dEmail(params: TrialReminder25dEmailParams): string {
  const { orgName, orgId, appUrl, daysRemaining } = params;
  const billingUrl = `${appUrl}/dashboard/${orgId}/billing?utm_source=email&utm_medium=trial_reminder&utm_campaign=trial_25d`;
  const dayLabel = daysRemaining === 1 ? "day" : "days";

  const header = standardHeader(orgName);

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;">${daysRemaining} ${dayLabel} left on your trial</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      Your YSO Connect trial for <strong>${escapeHtml(orgName)}</strong> ends in ${daysRemaining} ${dayLabel}.
      Everything you&rsquo;ve built &mdash; your teams, your schedule, your guardian contacts &mdash;
      stays exactly where it is when you subscribe.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background-color:${BRAND_BLUE_LIGHT};border-left:4px solid ${BRAND_BLUE};border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0 0 4px;font-size:22px;font-weight:700;color:${BRAND_BLUE};">$10 for 6 months</p>
          <p style="margin:0;font-size:14px;color:#374151;">Less than $2/month &mdash; cancel anytime</p>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.7;">
      Subscribe before your trial ends and your families won&rsquo;t miss a beat.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${BRAND_BLUE};border-radius:6px;">
          <a href="${billingUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Subscribe &mdash; $10 for 6 months</a>
        </td>
      </tr>
    </table>
  `;

  const footer = `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
    You are receiving this email as the administrator of <strong>${escapeHtml(orgName)}</strong>.
    These reminders stop automatically once you subscribe or your trial ends.
  </p>`;

  return baseLayout(header, body, footer);
}

export interface PaymentFailedEmailParams {
  orgName: string;
  appUrl: string;
  orgId: string;
}

export function buildPaymentFailedEmail(params: PaymentFailedEmailParams): string {
  const { orgName, appUrl, orgId } = params;
  const billingUrl = `${appUrl}/dashboard/${orgId}/billing`;

  const header = standardHeader(orgName);

  const body = `
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#111827;">Payment failed</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      We could not process your latest YSO Connect subscription payment for
      <strong>${escapeHtml(orgName)}</strong>.
    </p>

    <p style="margin:0 0 24px;font-size:16px;color:#374151;line-height:1.7;">
      Your account is now in read-only mode. Update your billing method to restore full access.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${BRAND_BLUE};border-radius:6px;">
          <a href="${billingUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Update billing</a>
        </td>
      </tr>
    </table>
  `;

  const footer = `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
    You are receiving this email as the billing contact for <strong>${escapeHtml(orgName)}</strong>.
  </p>`;

  return baseLayout(header, body, footer);
}
