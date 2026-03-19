interface ReportReadyEmailProps {
  contactName: string
  studioName: string
  brandColor: string | null
  logoUrl: string | null
  businessName: string
  periodLabel: string
  portalUrl: string
}

export function reportReadyEmail({
  contactName,
  studioName,
  brandColor,
  logoUrl,
  businessName,
  periodLabel,
  portalUrl,
}: ReportReadyEmailProps): string {
  const accent = brandColor ?? '#6366f1'

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${studioName}" style="height:36px;width:auto;max-width:200px;object-fit:contain;display:block;" />`
    : `<span style="font-size:16px;font-weight:700;color:${accent};letter-spacing:-0.01em;">${studioName}</span>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your ${periodLabel} report is ready</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header with logo -->
          <tr>
            <td style="background:${accent};padding:24px 40px;">
              ${logoHtml}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 32px;">
              <h1 style="margin:0 0 24px;font-size:24px;font-weight:700;color:#111827;line-height:1.3;">
                Your ${periodLabel} report is ready
              </h1>
              <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.6;">
                Hi ${contactName},
              </p>
              <p style="margin:0 0 32px;font-size:15px;color:#374151;line-height:1.6;">
                Your <strong>${periodLabel}</strong> marketing report for <strong>${businessName}</strong> is ready to view. It includes your website performance, local opportunities, and recommended actions for the month ahead.
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:${accent};">
                    <a href="${portalUrl}"
                       style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      View your report →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 48px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                Sent by ${studioName} via <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://craftamp.com'}" style="color:#9ca3af;">Craftamp</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
