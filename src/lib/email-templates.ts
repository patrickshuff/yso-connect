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
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?g=${guardianId}`;
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

export interface InviteEmailParams {
  firstName: string;
  orgName: string;
  inviteUrl: string;
  guardianId: string;
  appUrl: string;
}

export function buildInviteEmail(params: InviteEmailParams): string {
  const { firstName, orgName, inviteUrl, guardianId, appUrl } = params;
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?g=${guardianId}`;

  const header = standardHeader(orgName);

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;">You've been invited, ${escapeHtml(firstName)}!</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      <strong>${escapeHtml(orgName)}</strong> has added you as a guardian on YSO Connect.
      Click the button below to set up your account and start receiving updates for your player.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin:28px 0;background-color:${BRAND_BLUE_LIGHT};border-left:4px solid ${BRAND_BLUE};border-radius:4px;">
      <tr>
        <td style="padding:16px 20px;">
          <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND_BLUE};">Once you're set up, you'll receive</p>
          <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
            <li>Game and practice schedule updates</li>
            <li>Important announcements from your coaching staff</li>
            <li>Team-wide messages and reminders</li>
          </ul>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">
      This invite link expires in 7 days. If you didn't expect this email, you can safely ignore it.
    </p>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background-color:${BRAND_BLUE};border-radius:6px;">
          <a href="${inviteUrl}" style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;">Set Up My Account</a>
        </td>
      </tr>
    </table>
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
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?g=${guardianId}`;

  const header = standardHeader(orgName);

  const formattedBody = escapeHtml(body).replace(/\n/g, "<br>");

  const bodyHtml = `
    ${subject ? `<h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">${escapeHtml(subject)}</h2>` : ""}
    <p style="margin:0;font-size:16px;color:#374151;line-height:1.75;">${formattedBody}</p>
  `;

  const footer = standardFooter(orgName, unsubscribeUrl);

  return baseLayout(header, bodyHtml, footer);
}
