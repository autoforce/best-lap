import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
} from '@tanstack/react-router'
import { DashboardPage } from '@/pages/dashboard'
import { ChannelsPage } from '@/pages/channels'
import { ChannelDetailsPage } from '@/pages/channel-details'
import { PagesPage } from '@/pages/pages'
import { MetricsPage } from '@/pages/metrics'
import { ComparePage } from '@/pages/compare'
import { ThemesPage } from '@/pages/themes'
import { ThemeDetailsPage } from '@/pages/theme-details'
import { ProvidersPage } from '@/pages/providers'
import { LoginPage } from '@/pages/login'
import { UsersPage } from '@/pages/users'

// Helper to check authentication
function isAuthenticated() {
  return !!localStorage.getItem('token')
}

// Root route
const rootRoute = createRootRoute({
  component: Outlet,
})

// Login route (public)
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LoginPage,
})

// Dashboard route (protected)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Channels routes (protected)
const channelsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels',
  component: ChannelsPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

const channelDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/channels/$channelId',
  component: ChannelDetailsPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Metrics route (protected)
const metricsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/metrics',
  component: MetricsPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
  validateSearch: (search: Record<string, unknown>) => {
    return {
      channelId: (search.channelId as string) || undefined,
    }
  },
})

// Pages route (protected)
const pagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/pages',
  component: PagesPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Compare route (protected)
const compareRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/compare',
  component: ComparePage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Themes routes (protected)
const themesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/themes',
  component: ThemesPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

const themeDetailsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/themes/$theme',
  component: ThemeDetailsPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Providers route (protected)
const providersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/providers',
  component: ProvidersPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Users route (protected)
const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  component: UsersPage,
  beforeLoad: () => {
    if (!isAuthenticated()) {
      throw redirect({ to: '/login' })
    }
  },
})

// Create route tree
const routeTree = rootRoute.addChildren([
  loginRoute,
  indexRoute,
  channelsRoute,
  channelDetailsRoute,
  pagesRoute,
  metricsRoute,
  compareRoute,
  themesRoute,
  themeDetailsRoute,
  providersRoute,
  usersRoute,
])

// Create router
export const router = createRouter({ routeTree })

// Register router for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
