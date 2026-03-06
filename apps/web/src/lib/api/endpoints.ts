import { api } from './client'
import type {
  Channel,
  CreateChannelInput,
  UpdateChannelInput,
  Provider,
  CreateProviderInput,
  UpdateProviderInput,
  Page,
  CreatePageInput,
  UpdatePageInput,
  Metric,
  AverageMetric,
  ChannelMetricGrouped,
  Period,
  TriggerCollectionResponse,
  User,
  LoginCredentials,
  LoginResponse,
  CreateUserInput,
} from '@/types/api'

// Channel endpoints
export const channelsApi = {
  getAll: () =>
    api.get<{ channels_count: number; channels: Channel[] }>('/channels'),

  getById: (channelId: string) =>
    api.get<{ channel: Channel }>(`/channels/${channelId}`),

  getByTheme: (theme: string) =>
    api.get<{ channels_count: number; channels: Channel[] }>(
      `/channels/theme/${theme}`
    ),

  create: (data: CreateChannelInput) => api.post<Channel>('/channels', data),

  update: (channelId: string, data: UpdateChannelInput) =>
    api.patch<Channel>(`/channels/${channelId}`, data),

  delete: (channelId: string) => api.delete(`/channels/${channelId}`),

  enable: (channelId: string) =>
    api.patch<Channel>(`/channels/${channelId}/enable`),

  disable: (channelId: string) =>
    api.patch<Channel>(`/channels/${channelId}/disable`),
}

// Provider endpoints
export const providersApi = {
  getAll: () =>
    api.get<{ providers_count: number; providers: Provider[] }>('/providers'),

  getById: (providerId: string) =>
    api.get<{ provider: Provider }>(`/providers/${providerId}`),

  create: (data: CreateProviderInput) => api.post<Provider>('/providers', data),

  update: (providerId: string, data: UpdateProviderInput) =>
    api.patch<Provider>(`/providers/${providerId}`, data),

  delete: (providerId: string) => api.delete(`/providers/${providerId}`),
}

// Page endpoints
export const pagesApi = {
  getByChannel: (channelId: string) =>
    api.get<{ pages: Page[] }>(`/channels/${channelId}/pages`),

  create: (channelId: string, data: CreatePageInput) =>
    api.post<Page>(`/channels/${channelId}/pages`, data),

  update: (channelId: string, pageId: string, data: UpdatePageInput) =>
    api.patch<Page>(`/channels/${channelId}/pages/${pageId}`, data),

  delete: (channelId: string, pageId: string) =>
    api.delete(`/channels/${channelId}/pages/${pageId}`),
}

// Metrics endpoints
export const metricsApi = {
  getRawMetrics: (channelId: string) =>
    api.get<{ metrics: Metric[] }>(`/channels/metrics/${channelId}`),

  getChannelAverage: (channelId: string, period: Period) =>
    api.get<{ metrics: AverageMetric[] }>(
      `/channels/metrics/${channelId}/average/${period}`
    ),

  getAllAverage: (period: Period) =>
    api.get<{ metrics: AverageMetric[] }>(
      `/channels/metrics/average/${period}`
    ),

  getAllGroupedByChannel: (period: Period) =>
    api.get<{ metrics: ChannelMetricGrouped[] }>(
      `/channels/metrics/grouped/${period}`
    ),

  getThemeAverage: (theme: string, period: Period) =>
    api.get<{ metrics: AverageMetric[] }>(
      `/channels/metrics/theme/${theme}/average/${period}`
    ),

  getProviderAverage: (providerId: string, period: Period) =>
    api.get<{ metrics: AverageMetric[] }>(
      `/channels/metrics/provider/${providerId}/average/${period}`
    ),

  triggerCollectionAll: () =>
    api.post<TriggerCollectionResponse>('/channels/metrics/collect'),

  triggerCollectionChannel: (channelId: string) =>
    api.post<TriggerCollectionResponse>(`/channels/metrics/${channelId}/collect`),

  triggerCollectionPage: (channelId: string, pageId: string) =>
    api.post<TriggerCollectionResponse>(`/channels/metrics/${channelId}/pages/${pageId}/collect`),
}

// Auth endpoints
export const authApi = {
  login: (credentials: LoginCredentials) =>
    api.post<LoginResponse>('/auth/login', credentials),

  me: () => api.get<{ user: User }>('/auth/me'),
}

// User management endpoints
export const usersApi = {
  getAll: () => api.get<{ users: User[] }>('/users'),

  create: (data: CreateUserInput) => api.post<{ user: User }>('/users', data),

  delete: (userId: string) => api.delete(`/users/${userId}`),
}
