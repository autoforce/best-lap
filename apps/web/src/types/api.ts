// Channel types
export interface Channel {
  id: string
  name: string
  domain: string
  internal_link: string
  theme: string
  active: boolean
  is_reference: boolean
  provider_id?: string
  created_at: string
  updated_at: string
  pages?: Page[]
  provider?: Provider
}

export interface CreateChannelInput {
  name: string
  domain: string
  internal_link: string
  theme: string
  active?: boolean
  is_reference?: boolean
  provider_id?: string
}

export interface UpdateChannelInput {
  name?: string
  domain?: string
  internal_link?: string
  theme?: string
  active?: boolean
  is_reference?: boolean
  provider_id?: string
}

// Provider types
export interface Provider {
  id: string
  name: string
  website: string
  slug: string
  description?: string
  created_at: string
  updated_at: string
  pages?: Page[]
}

export interface CreateProviderInput {
  name: string
  website: string
  slug: string
  description?: string
}

export interface UpdateProviderInput {
  name?: string
  website?: string
  slug?: string
  description?: string
}

// Page types
export interface Page {
  id: string
  name: string
  path: string
  channel_id: string
  provider_id?: string
  created_at: string
  updated_at: string
  channel?: Channel
  provider?: Provider
  metrics?: Metric[]
}

export interface CreatePageInput {
  name: string
  path: string
  provider_id?: string
}

export interface UpdatePageInput {
  name?: string
  path?: string
  provider_id?: string
}

// Metric types
export interface Metric {
  id: string
  time: string
  score: number
  seo: number
  response_time: number
  fcp: number
  si: number
  lcp: number
  tbt: number
  cls: number
  page_id: string
  page?: Page
}

export interface AverageMetric {
  period_start: string
  avg_score: number
  avg_seo: number
  avg_response_time: number | string
  avg_fcp: number
  avg_si: number
  avg_lcp: number
  avg_tbt: number
  avg_cls: number
}

export interface ChannelMetricGrouped {
  channel_id: string
  channel_name: string
  period_start: string
  avg_score: number
  avg_seo: number
  avg_response_time: number | string
  avg_fcp: number
  avg_si: number
  avg_lcp: number
  avg_tbt: number
  avg_cls: number
}

export type Period = 'hourly' | 'daily' | 'weekly' | 'monthly'

export type PerformanceMetricKey =
  | 'score'
  | 'seo'
  | 'response_time'
  | 'fcp'
  | 'si'
  | 'lcp'
  | 'tbt'
  | 'cls'

// API Response types
export interface ApiResponse<T> {
  data: T
}

export interface ApiError {
  message: string
  statusCode: number
}

// Trigger Collection types
export interface TriggerCollectionResponse {
  message: string
  jobs_count: number
  channel_id?: string
  page_id?: string
}

// Auth types
export * from './auth'
