export type UserRole = 'studio_admin' | 'client_user'
export type ReportStatus = 'draft' | 'sent'

export interface Studio {
  id: string
  name: string
  slug: string
  brand_color: string | null
  logo_url: string | null
  custom_domain: string | null
  created_at: string
}

export interface User {
  id: string
  studio_id: string | null
  client_id: string | null
  email: string
  role: UserRole
  created_at: string
}

export interface Client {
  id: string
  studio_id: string
  business_name: string
  business_type: string | null
  timezone: string
  city: string | null
  description: string | null
  primary_goal: string | null
  target_audience: string | null
  ga4_property_id: string | null
  gbp_location_id: string | null
  contact_name: string | null
  contact_email: string | null
  contact_phone: string | null
  sms_consent: boolean
  created_at: string
}

export interface Invitation {
  id: string
  client_id: string
  email: string
  token: string
  expires_at: string
  accepted_at: string | null
  created_at: string
}

export interface Integration {
  id: string
  client_id: string
  provider: string
  access_token: string | null
  refresh_token: string | null
  expires_at: string | null
  created_at: string
}

export interface Report {
  id: string
  client_id: string
  status: ReportStatus
  period_month: string
  sent_at: string | null
  created_at: string
}

export interface ReportSection {
  id: string
  report_id: string
  section_type: string
  ai_content: string | null
  raw_data: Record<string, unknown> | null
  display_order: number
  created_at: string
}

export interface WeeklyPulse {
  id: string
  client_id: string
  week_start: string
  leads_count: number | null
  lead_source: string | null
  marketing_activity: string | null
  blockers: string | null
  summary: string | null
  recommendation: string | null
  status: 'in_progress' | 'completed'
  check_in_token: string | null
  token_expires_at: string | null
  created_at: string
  completed_at: string | null
}

export interface Opportunity {
  id: string
  client_id: string
  type: string
  title: string
  description: string | null
  status: string
  source: 'manual' | 'report' | 'pulse'
  cta_label: string | null
  expires_at: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}
