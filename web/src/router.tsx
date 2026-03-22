import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
} from '@tanstack/react-router'
import { queryOptions, type QueryClient } from '@tanstack/react-query'
import { RootLayout } from '@/routes/root'
import { DashboardPage } from '@/routes/dashboard'
import { ContainersPage } from '@/routes/containers'
import { ImagesPage } from '@/routes/images'
import { VolumesPage } from '@/routes/volumes'
import { NetworksPage } from '@/routes/networks'
import { fetchHealth } from '@/lib/api/client'

export interface RouterContext {
  queryClient: QueryClient
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: RootLayout,
})

const dashboardQueryOptions = queryOptions({
  queryKey: ['health'],
  queryFn: fetchHealth,
  staleTime: 30_000,
  retry: false,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(dashboardQueryOptions)
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

const routeTree = rootRoute.addChildren([
  indexRoute,
  containersRoute,
  imagesRoute,
  volumesRoute,
  networksRoute,
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

export { dashboardQueryOptions }
