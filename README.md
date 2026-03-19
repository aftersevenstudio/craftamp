# Craftamp

White-label client portal platform for digital agencies. Studios get a dashboard to manage clients, reports, and growth opportunities. Clients get a branded portal to view reports, insights, and take action on opportunities.

Built by After Seven Studio.

---

## Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript (strict) |
| Database | Supabase (Postgres + Storage + Auth) |
| Email | Resend |
| AI | OpenAI GPT-4o-mini |
| Payments | Stripe (not yet wired to UI) |
| Auth (social) | Google OAuth via Supabase |
| Deployment | Vercel |
| DNS | Vercel DNS (nameservers switched from Squarespace) |
| Styling | Tailwind CSS + shadcn/ui |

---

## Route Architecture

The app uses Next.js route groups to separate concerns:

```
app/
  (auth)/         → /login, /signup, /invite/[token]
  (studio)/       → /studio/dashboard/** — studio admin views
  (portal)/       → /[slug]/** — client-facing portal
  (checkin)/      → /check-in/[token] — public, no auth required
  page.tsx        → / root — smart auth redirect
```

### Root redirect logic (`app/page.tsx`)
- Not logged in → `/login`
- `client_user` → `/{studio-slug}/overview`
- `studio_admin` → `/studio/dashboard`

---

## Domain Architecture

| Domain | Purpose |
|---|---|
| `app.craftamp.com` | Studio admin app |
| `{slug}.craftamp.com` | Branded client portal per studio |
| `craftamp.com` | Marketing site (separate repo: `craftamp-marketing`) |

Routing is handled by `proxy.ts` (Next.js 16 equivalent of `middleware.ts`):
- `{slug}.craftamp.com` → detects subdomain, rewrites `/overview` → `/[slug]/overview` etc.
- `{slug}.craftamp.com/login` → rewrites to `/login?studio={slug}` for branded login
- `app.craftamp.com` → normal app routing
- Non-craftamp hosts → custom domain lookup via `/api/internal/domain`

### Local development
Subdomains don't work locally — use the main app routing instead:
- Studio admin: `localhost:3000/studio/dashboard`
- Client portal: `localhost:3000/{slug}/overview`
- Branded login preview: `localhost:3000/login?studio={slug}`

---

## Users & Roles

Two roles stored on the `users` table:

| Role | Access |
|---|---|
| `studio_admin` | Full studio dashboard, manage clients/reports/settings |
| `client_user` | Read-only portal for their assigned studio's clients |

A `client_user` belongs to one studio (`studio_id`) and one client (`client_id`).

---

## Key Features

### Reports
- Generated via OpenAI GPT-4o-mini, streamed via SSE
- Stored as sections in the `report_sections` table
- Sent to client via Resend (branded email)
- Clients view at `/{slug}/reports`

### Weekly Pulse (Client Check-in)
- Studio sends a check-in email via `/api/pulse/send`
- Email contains a unique token link: `/check-in/[token]`
- Token expires in 7 days, stored on `weekly_pulses.check_in_token`
- Client answers 4 questions — no login required
- On submit, AI generates insights and fires opportunity generation

### Opportunities
- Auto-generated from pulse data and report data
- Rule-based engine + GPT-4o-mini in `lib/opportunities-engine.ts`
- Sources: `pulse` (expires 7 days) and `report` (expires 30 days) and `manual`
- Clients can update status (open → in progress → completed / dismissed) from their portal
- Studio can manually add, update, or delete opportunities from the client detail page

### White-label Branding
- Studio sets logo, brand color in Settings
- Client portal header, login page, and check-in emails all use studio branding
- Each studio gets a subdomain: `{slug}.craftamp.com`
- Custom domain support is wired on the backend (Option C — fully custom domains like `portal.studio.com`) but not yet exposed in UI

---

## Database Migrations

Migrations live in `supabase/migrations/` and must be run manually in the Supabase SQL editor in order:

| File | Description |
|---|---|
| `001_initial_schema.sql` | Studios, clients, users, reports |
| `002_invitations.sql` | Studio invitation tokens |
| `003_studio_integrations.sql` | GA4 / third-party integrations |
| `004_client_city.sql` | City field on clients |
| `005_client_profile_fields.sql` | Extended client profile |
| `006_weekly_pulse.sql` | Weekly pulse check-in table |
| `007_sms_consent.sql` | SMS consent fields (legacy, SMS removed) |
| `008_pulse_checkin_token.sql` | Token-based check-in (email flow) |
| `009_opportunities_v2.sql` | Opportunities: source, cta_label, expires_at, metadata |

> **Note:** Supabase data is not shared between local and production. You will need to recreate studio/client records in each environment.

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# App
NEXT_PUBLIC_APP_URL=https://app.craftamp.com   # used for email links and subdomain detection

# Email
RESEND_API_KEY=
RESEND_FROM_EMAIL=no-reply@craftamp.com        # must be a verified Resend sender domain

# AI
OPENAI_API_KEY=

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payments (not yet active)
STRIPE_SECRET_KEY=

# Legacy — SMS removed, safe to leave empty
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
```

---

## Things to Know / Gotchas

- **`proxy.ts` not `middleware.ts`** — Next.js 16 uses `proxy.ts` as the middleware entrypoint. Do not create a `middleware.ts` alongside it, they conflict.
- **Admin client bypasses RLS** — `createAdminClient()` uses the service role key. Only use it server-side for operations that need to cross RLS boundaries (e.g. looking up another user's studio).
- **Slug = subdomain** — A studio's `slug` field directly determines their `{slug}.craftamp.com` subdomain. Changing the slug in the DB changes their URL for all clients. Do this carefully.
- **After Seven Studio slug** — Currently `after-seven-studio`. To change to `aftersevenstudio` (no hyphens), update the `slug` column on that studio's row in the DB. Notify clients of the new URL.
- **Resend sender domain** — Emails sent from `RESEND_FROM_EMAIL` require that domain to be verified in Resend. Currently using `craftamp.com`.
- **Wildcard DNS** — `*.craftamp.com` is configured in Vercel DNS to support studio subdomains. Vercel nameservers (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`) are active on `craftamp.com` (switched from Squarespace).
- **No Supabase CLI migrations** — Migrations are applied manually via the Supabase SQL editor, not via `supabase db push`.
- **Storage bucket** — Studio logos are uploaded to a Supabase Storage bucket via `/api/studio/logo`.
