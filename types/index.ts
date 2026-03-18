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
  ga4_property_id: string | null
  gbp_location_id: string | null
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

export interface Opportunity {
  id: string
  client_id: string
  type: string
  title: string
  description: string | null
  status: string
  created_at: string
}
