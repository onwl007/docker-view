import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { systemSummaryQueryOptions } from '@/features/dashboard/query-options'
import {
  recentContainersQueryOptions,
} from '@/features/resources/query-options'
import { validateTextSearch } from '@/lib/search'
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
    await Promise.all([
      context.queryClient.prefetchQuery(systemSummaryQueryOptions),
      context.queryClient.prefetchQuery(recentContainersQueryOptions),
    ])
  },
  component: DashboardPage,
})

const containersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/containers',
  validateSearch: validateTextSearch,
  component: ContainersPage,
})

const imagesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/images',
  validateSearch: validateTextSearch,
  component: ImagesPage,
})

const volumesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/volumes',
  validateSearch: validateTextSearch,
  component: VolumesPage,
})

const networksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/networks',
  validateSearch: validateTextSearch,
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
