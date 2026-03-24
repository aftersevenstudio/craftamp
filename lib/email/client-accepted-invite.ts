interface ClientAcceptedInviteProps {
  adminName: string | null
  businessName: string
  clientEmail: string
  clientUrl: string
}

export function clientAcceptedInviteEmail({
  adminName,
  businessName,
  clientEmail,
  clientUrl,
}: ClientAcceptedInviteProps): string {
  const greeting = adminName ? `Hi ${adminName},` : 'Hi there,'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Client portal access confirmed</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">

          <!-- Header -->
          <tr>
            <td style="background:#0f0f0f;padding:20px 32px;">
              <span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.01em;">Craftamp</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 8px;font-size:15px;color:#111827;">${greeting}</p>
              <p style="margin:0 0 24px;font-size:15px;color:#111827;">
                <strong>${businessName}</strong> just accepted their portal invitation and has set up their account.
              </p>

              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Client</p>
                    <p style="margin:0;font-size:14px;color:#111827;font-weight:500;">${businessName}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 20px 16px;">
                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Account email</p>
                    <p style="margin:0;font-size:14px;color:#111827;">${clientEmail}</p>
                  </td>
                </tr>
              </table>

              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#0f0f0f;border-radius:8px;">
                    <a href="${clientUrl}" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      View client →
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px;border-top:1px solid #f3f4f6;">
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                You're receiving this because you manage this client in Craftamp.
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
