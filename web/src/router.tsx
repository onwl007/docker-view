import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { systemSummaryQueryOptions } from '@/features/dashboard/query-options'
import { ContainersPage } from '@/routes/containers'
import { DashboardPage } from '@/routes/dashboard'
import { ImagesPage } from '@/routes/images'
import { MonitoringPage } from '@/routes/monitoring'
import { NetworksPage } from '@/routes/networks'
import { RootLayout } from '@/routes/root'
import { SettingsPage } from '@/routes/settings'
import { VolumesPage } from '@/routes/volumes'

export interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(systemSummaryQueryOptions)
  },
  component: DashboardPage,
})

const containersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/containers',
  component: ContainersPage,
})

const imagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/images',
  component: ImagesPage,
})

const volumesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/volumes',
  component: VolumesPage,
})

const networksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/networks',
  component: NetworksPage,
})

const monitoringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/monitoring',
  component: MonitoringPage,
})

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  component: SettingsPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  containersRoute,
  imagesRoute,
  volumesRoute,
  networksRoute,
  monitoringRoute,
  settingsRoute,
])

export const router = createRouter({
  routeTree,
  context: {
    queryClient: undefined as unknown as QueryClient,
  },
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}
