/**
 * Shared email template module for YSO Connect.
 *
 * Architecture:
 *  - Primitives  — exported building blocks (CTA, info block, header, footer)
 *  - Layout      — buildEmailLayout wraps primitives into a full HTML document
 *  - Builders    — high-level functions (buildWelcomeEmail, buildBroadcastEmail)
 *                  that compose primitives into complete emails
 *
 * All callers should use the high-level builders.
 * Primitives are exported so custom one-off templates can reuse them.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BRAND_BLUE = "#1d4ed8";
const BRAND_BLUE_LIGHT = "#eff6ff";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------------------------------------------------------------------
// Shared parameter type (base for all email builders)
// ---------------------------------------------------------------------------

export interface BaseEmailParams {
  /** Display name of the organization — inserted into copy and header. */
  orgName: string;
  /** Full base URL of the app, e.g. https://www.ysoconnect.com */
  appUrl: string;
  /** Guardian's UUID — used to build unsubscribe/preferences URLs. */
  guardianId: string;
}

// ---------------------------------------------------------------------------
// Primitive: CTA button
// ---------------------------------------------------------------------------

/**
 * Returns a table-based CTA button cell that renders consistently across email
 * clients (including Outlook which does not support border-radius on <a>).
 */
export function buildCTAButton(label: string, href: string): string {
  return `<table cellpadding="0" cellspacing="0" style="margin:28px 0 0;">
  <tr>
    <td style="background-color:${BRAND_BLUE};border-radius:6px;">
      <a href="${escapeHtml(href)}"
         style="display:inline-block;padding:12px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.01em;"
      >${escapeHtml(label)}</a>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Primitive: info / highlight block
// ---------------------------------------------------------------------------

/**
 * Returns a highlighted callout block with an optional title and bullet list.
 * Useful for "what to expect" or "next steps" sections.
 */
export function buildInfoBlock(title: string, items: string[]): string {
  const listItems = items
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("\n            ");
  return `<table width="100%" cellpadding="0" cellspacing="0"
       style="margin:24px 0;background-color:${BRAND_BLUE_LIGHT};border-left:4px solid ${BRAND_BLUE};border-radius:4px;">
  <tr>
    <td style="padding:16px 20px;">
      <p style="margin:0;font-size:14px;font-weight:600;color:${BRAND_BLUE};">${escapeHtml(title)}</p>
      <ul style="margin:8px 0 0;padding-left:20px;font-size:14px;color:#374151;line-height:1.8;">
        ${listItems}
      </ul>
    </td>
  </tr>
</table>`;
}

// ---------------------------------------------------------------------------
// Primitive: header
// ---------------------------------------------------------------------------

/**
 * Branded header bar showing "YSO Connect" and the org name below it.
 */
export function buildOrgHeader(orgName: string): string {
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

// ---------------------------------------------------------------------------
// Primitive: footers
// ---------------------------------------------------------------------------

/**
 * Standard unsubscribe footer.  Use for transactional/broadcast emails where a
 * one-click unsubscribe link satisfies CAN-SPAM and RFC 8058 requirements.
 */
export function buildUnsubscribeFooter(
  orgName: string,
  unsubscribeUrl: string,
): string {
  return `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
  You received this email because you are a member of <strong>${escapeHtml(orgName)}</strong>.
  &nbsp;&bull;&nbsp;
  <a href="${unsubscribeUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe</a>
</p>`;
}

/**
 * Preferences footer — links to a full preferences page instead of a hard
 * unsubscribe.  Use when recipients have granular channel options.
 */
export function buildPreferencesFooter(
  orgName: string,
  preferencesUrl: string,
): string {
  return `<p style="margin:0;font-size:12px;color:#6b7280;line-height:1.6;">
  You received this email because you are a member of <strong>${escapeHtml(orgName)}</strong>.
  &nbsp;&bull;&nbsp;
  <a href="${preferencesUrl}" style="color:#6b7280;text-decoration:underline;">Manage notification preferences</a>
</p>`;
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Assembles header, body, and footer HTML into a complete, mobile-friendly
 * HTML email document.
 *
 * Mobile strategy:
 *  - Fluid table layout (max-width:580px) scales on narrow viewports.
 *  - @media queries tighten padding on small screens for clients that
 *    support them (Apple Mail, iOS Mail, Gmail mobile app, Outlook mobile).
 *  - Outlook desktop does not support media queries; the fluid layout handles it.
 */
export function buildEmailLayout(
  headerHtml: string,
  bodyHtml: string,
  footerHtml: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>YSO Connect</title>
  <style>
    @media only screen and (max-width: 600px) {
      .email-card { border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .email-header { padding: 20px 24px !important; }
      .email-body  { padding: 28px 24px 20px !important; }
      .email-footer { padding: 16px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table class="email-card" width="100%" cellpadding="0" cellspacing="0"
               style="max-width:580px;background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td class="email-header" style="background-color:${BRAND_BLUE};padding:24px 40px;">
              ${headerHtml}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td class="email-body" style="padding:36px 40px 28px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td class="email-footer" style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
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

// ---------------------------------------------------------------------------
// High-level builders
// ---------------------------------------------------------------------------

export interface WelcomeEmailParams extends BaseEmailParams {
  /** Recipient's first name — used in the greeting. */
  firstName: string;
}

/**
 * Onboarding email sent when a guardian is added to an organization.
 *
 * Branded layout · CTA to sign in · Info block listing what to expect ·
 * Org-aware copy · Unsubscribe footer.
 */
export function buildWelcomeEmail(params: WelcomeEmailParams): string {
  const { firstName, orgName, appUrl, guardianId } = params;
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?g=${guardianId}`;
  const loginUrl = `${appUrl}/sign-in`;

  const header = buildOrgHeader(orgName);

  const infoBlock = buildInfoBlock("What to expect", [
    "Game and practice schedule updates",
    "Important announcements from your coaching staff",
    "Team-wide messages and reminders",
  ]);

  const ctaButton = buildCTAButton("Sign in to YSO Connect", loginUrl);

  const body = `
    <h1 style="margin:0 0 16px;font-size:26px;font-weight:700;color:#111827;">Welcome, ${escapeHtml(firstName)}!</h1>

    <p style="margin:0 0 16px;font-size:16px;color:#374151;line-height:1.7;">
      You've been added as a guardian in <strong>${escapeHtml(orgName)}</strong>.
      You'll start receiving important updates — schedule changes, announcements,
      and messages from your team's coaching staff.
    </p>

    ${infoBlock}

    <p style="margin:0 0 0;font-size:16px;color:#374151;line-height:1.7;">
      If you ever have questions, reach out directly to your coach or team administrator.
    </p>

    ${ctaButton}
  `;

  const footer = buildUnsubscribeFooter(orgName, unsubscribeUrl);

  return buildEmailLayout(header, body, footer);
}

export interface BroadcastEmailParams extends BaseEmailParams {
  /** Optional subject line — displayed as an H2 above the message body. */
  subject: string | null;
  /** Plain-text body — newlines are converted to <br> tags. */
  body: string;
}

/**
 * Broadcast email sent to guardians via the Messages dashboard.
 *
 * Branded layout · Optional subject header · Org-aware copy ·
 * Unsubscribe footer compliant with CAN-SPAM / RFC 8058.
 */
export function buildBroadcastEmail(params: BroadcastEmailParams): string {
  const { orgName, subject, body, appUrl, guardianId } = params;
  const unsubscribeUrl = `${appUrl}/api/unsubscribe?g=${guardianId}`;

  const header = buildOrgHeader(orgName);

  const formattedBody = escapeHtml(body).replace(/\n/g, "<br>");

  const bodyHtml = `
    ${subject ? `<h2 style="margin:0 0 20px;font-size:22px;font-weight:700;color:#111827;">${escapeHtml(subject)}</h2>` : ""}
    <p style="margin:0;font-size:16px;color:#374151;line-height:1.75;">${formattedBody}</p>
  `;

  const footer = buildUnsubscribeFooter(orgName, unsubscribeUrl);

  return buildEmailLayout(header, bodyHtml, footer);
}
