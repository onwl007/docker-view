import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  ArrowUpRight,
  Boxes,
  Gauge,
  HardDrive,
  Image as ImageIcon,
  Network,
  ShieldCheck,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { dashboardSummary, performancePulse } from '@/lib/mock-data'
import { dashboardQueryOptions } from '@/router'

const quickStats = [
  { label: 'Containers', value: '14', detail: '10 healthy, 2 paused, 2 exited', icon: Boxes },
  { label: 'Images', value: '42', detail: 'Nine dangling layers worth reviewing', icon: ImageIcon },
  { label: 'Volumes', value: '14', detail: 'Three unattached, one critical database set', icon: HardDrive },
  { label: 'Networks', value: '8', detail: 'Bridge-heavy topology with 23 endpoints', icon: Network },
] as const

const operationsFeed = [
  {
    title: 'docker-view-api restarted cleanly',
    detail: 'Restart policy applied after image rollout 14 minutes ago.',
  },
  {
    title: 'metrics-worker paused for inspection',
    detail: 'Operator action pending after an abnormal export spike.',
  },
  {
    title: 'nightly-backups volume passed retention audit',
    detail: 'Last snapshot written at 02:00 UTC with no prune action required.',
  },
] as const

export function DashboardPage() {
  const { data, error, isLoading } = useQuery(dashboardQueryOptions)

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge className="w-fit">Dashboard</Badge>
            <div className="space-y-3">
              <CardTitle className="max-w-3xl text-3xl sm:text-4xl">
                A single operator surface for host health, workload pressure,
                and the next action worth taking.
              </CardTitle>
              <CardDescription className="max-w-3xl text-base">
                The dashboard mirrors OrbStack’s calm information density: quick
                health signals first, deeper resource workspaces one click away.
              </CardDescription>
            </div>
          </div>
          <div className="grid w-full gap-3 sm:max-w-md sm:grid-cols-2">
            <Button className="justify-between">
              Open terminal
              <ArrowUpRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" className="justify-between">
              Review alerts
              <ShieldCheck className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {dashboardSummary.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] p-5"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                {item.label}
              </div>
              <div className="mt-2 font-['Sora',ui-sans-serif,sans-serif] text-2xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
                {item.value}
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {item.hint}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-[color:var(--border)] pb-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-2xl">Resource map</CardTitle>
                <CardDescription className="mt-2">
                  Jump directly into the operational surface that needs attention.
                </CardDescription>
              </div>
              <Button variant="ghost">Open all</Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          {quickStats.map((item) => {
            const Icon = item.icon

            return (
              <div
                key={item.label}
                className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] p-5"
              >
                <div className="mb-6 inline-flex rounded-2xl bg-[color:var(--panel-strong)] p-3 text-[color:var(--foreground)]">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  {item.label}
                </div>
                <div className="mt-2 font-['Sora',ui-sans-serif,sans-serif] text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                  {item.value}
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  {item.detail}
                </p>
              </div>
            )
          })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API reachability</CardTitle>
            <CardDescription>
              Data below comes from the current Go health endpoint.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                Service status
              </div>
              <div className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">
                {isLoading ? 'checking' : data?.status ?? 'unreachable'}
              </div>
            </div>

            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] p-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                Bound address
              </div>
              <div className="mt-2 break-all font-mono text-sm text-[color:var(--foreground)]">
                {data?.addr ?? 'http://localhost:8080 via Vite proxy'}
              </div>
            </div>

            {error ? (
              <div className="rounded-[24px] border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-900">
                Backend health check is not reachable yet. The frontend shell is
                still running, and the Vite dev server will proxy `/healthz` and
                `/api/*` to `http://localhost:8080` once the Go service is up.
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Recent operator activity</CardTitle>
            <CardDescription>
              A compact feed keeps the dashboard useful even before logs and
              audit APIs are fully wired.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {operationsFeed.map((item) => (
              <div
                key={item.title}
                className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] px-5 py-4"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-[color:var(--panel-strong)] p-2.5">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--foreground)]">
                      {item.title}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-[color:var(--muted-foreground)]">
                      {item.detail}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance pulse</CardTitle>
            <CardDescription>
              Small, high-signal cards patterned after a desktop sidebar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {performancePulse.map((item) => (
              <div
                key={item.label}
                className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] px-5 py-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm text-[color:var(--muted-foreground)]">
                    {item.label}
                  </div>
                  <div className="font-['Sora',ui-sans-serif,sans-serif] text-lg font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                    {item.value}
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel-strong)] px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-[color:var(--background)] p-2.5">
                  <Gauge className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-[color:var(--foreground)]">
                    Query shell active
                  </div>
                  <div className="text-sm text-[color:var(--muted-foreground)]">
                    {isLoading ? 'Reloading route cache' : 'Prefetch ready for navigation'}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
