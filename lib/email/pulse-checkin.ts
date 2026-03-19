interface PulseCheckinEmailProps {
  contactName: string
  studioName: string
  brandColor: string | null
  logoUrl: string | null
  businessName: string
  checkInUrl: string
  weekLabel: string
}

export function pulseCheckinEmail({
  contactName,
  studioName,
  brandColor,
  logoUrl,
  businessName,
  checkInUrl,
  weekLabel,
}: PulseCheckinEmailProps): string {
  const accent = brandColor ?? '#6366f1'
  const firstName = contactName.split(' ')[0] || contactName

  const logoHtml = logoUrl
    ? `<img src="${logoUrl}" alt="${studioName}" style="height:36px;width:auto;max-width:200px;object-fit:contain;display:block;" />`
    : `<span style="font-size:16px;font-weight:700;color:${accent};letter-spacing:-0.01em;">${studioName}</span>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Weekly check-in for ${businessName}</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

          <!-- Header -->
          <tr>
            <td style="background:${accent};padding:24px 40px;">
              ${logoHtml}
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 48px 32px;">
              <p style="margin:0 0 16px;font-size:15px;color:#374151;line-height:1.6;">
                Hey ${firstName},
              </p>
              <p style="margin:0 0 28px;font-size:15px;color:#374151;line-height:1.6;">
                It's time for your quick weekly check-in for <strong>${businessName}</strong>. Takes about 60 seconds — just 4 questions so we can track your progress and keep your dashboard up to date.
              </p>
              <p style="margin:0 0 32px;font-size:13px;color:#6b7280;">
                Week of ${weekLabel}
              </p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border-radius:8px;background:${accent};">
                    <a href="${checkInUrl}"
                       style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                      Complete Weekly Check-In →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
                This link is unique to you and expires in 7 days. If you have any questions, reply to this email.
              </p>
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
