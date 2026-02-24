import { createRootRoute, createRoute, createRouter, Outlet } from '@tanstack/react-router'
import { DashboardPage } from '@/pages/dashboard'
import { ChannelsPage } from '@/pages/channels'
import { ChannelDetailsPage } from '@/pages/channel-details'
import { PagesPage } from '@/pages/pages'
import { MetricsPage } from '@/pages/metrics'
import { ComparePage } from '@/pages/compare'
import { ThemesPage } from '@/pages/themes'
import { ThemeDetailsPage } from '@/pages/theme-details'
import { ProvidersPage } from '@/pages/providers'

// Root route
const rootRoute = createRootRoute({
  component: Outlet,
})

// Dashboard route
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})

// Channels routes
const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels',
  component: ChannelsPage,
})

const channelDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels/$channelId',
  component: ChannelDetailsPage,
})

// Metrics route
const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/metrics',
  component: MetricsPage,
  validateSearch: (search: Record<string, unknown>) => {
    return {
      channelId: (search.channelId as string) || undefined,
    }
  },
})

// Pages route
const pagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pages',
  component: PagesPage,
})

// Compare route
const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  component: ComparePage,
})

// Themes route
const themesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/themes',
  component: ThemesPage,
})

const themeDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/themes/$theme',
  component: ThemeDetailsPage,
})

// Providers route
const providersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/providers',
  component: ProvidersPage,
})

// Create route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  channelsRoute,
  channelDetailsRoute,
  pagesRoute,
  metricsRoute,
  compareRoute,
  themesRoute,
  themeDetailsRoute,
  providersRoute,
])

// Create router
export const router = createRouter({ routeTree })

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
