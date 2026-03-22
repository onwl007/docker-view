import { useQuery } from '@tanstack/react-query'
import {
  ArrowUpRight,
  Box,
  Container,
  Cpu,
  HardDrive,
  Image as ImageIcon,
  Network,
  ServerCog,
} from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'
import { systemSummaryQueryOptions } from '@/features/dashboard/query-options'
import type { SystemSummary } from '@/lib/api/client'

const formatter = new Intl.NumberFormat('en-US')

export function DashboardPage() {
  const { data, error, isLoading, refetch, isFetching } = useQuery(systemSummaryQueryOptions)

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Phase 1 establishes the shared application shell, summary API contract, and the first operator-facing dashboard route."
        actions={
          <Button
            variant="secondary"
            className="gap-2"
            onClick={() => {
              void refetch()
            }}
          >
            <ArrowUpRight className="h-4 w-4" />
            {isFetching ? 'Refreshing' : 'Refresh'}
          </Button>
        }
      />

      {isLoading ? <DashboardLoadingState /> : null}
      {error ? <DashboardErrorState message={error.message} /> : null}
      {data ? <DashboardView summary={data} /> : null}
    </div>
  )
}

export function DashboardView({ summary }: { summary: SystemSummary }) {
  const resourceCards = [
    {
      label: 'Containers',
      value: formatter.format(summary.containers.total),
      detail: `${summary.containers.running ?? 0} running, ${summary.containers.stopped ?? 0} stopped`,
      icon: Container,
    },
    {
      label: 'Images',
      value: formatter.format(summary.images.total),
      detail: `Docker ${summary.dockerVersion}`,
      icon: ImageIcon,
    },
    {
      label: 'Volumes',
      value: formatter.format(summary.volumes.total),
      detail: `Endpoint ${summary.dockerHost}`,
      icon: HardDrive,
    },
    {
      label: 'Networks',
      value: formatter.format(summary.networks.total),
      detail: `API ${summary.apiVersion}`,
      icon: Network,
    },
  ] as const

  const systemCards = [
    {
      label: 'Engine',
      value: summary.engineStatus,
      detail: summary.hostName,
      icon: ServerCog,
    },
    {
      label: 'CPU Cores',
      value: formatter.format(summary.host.cpuCores),
      detail: 'Reported by Docker info',
      icon: Cpu,
    },
    {
      label: 'Memory',
      value: formatBytes(summary.host.memoryBytes),
      detail: 'Total host memory',
      icon: Box,
    },
    {
      label: 'Sampled At',
      value: formatTimestamp(summary.sampledAt),
      detail: 'UTC snapshot time',
      icon: ArrowUpRight,
    },
  ] as const

  return (
    <div className="space-y-5">
      <section className="grid gap-4 xl:grid-cols-4">
        {resourceCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-4">
        {systemCards.map((card) => (
          <SummaryCard key={card.label} {...card} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            Phase 1 checklist
          </div>
          <h2 className="mt-3 font-['Sora',ui-sans-serif,sans-serif] text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
            Application shell, API contract, and dashboard summary are live.
          </h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              'Shared sidebar and header layout',
              'TanStack Router + Query bootstrap',
              'Typed /api/v1/system/summary client',
              'Backend Docker engine summary handler',
            ].map((item) => (
              <div
                key={item}
                className="rounded-[22px] border border-[color:var(--border)] bg-[color:var(--panel-subtle)] px-4 py-4 text-sm font-medium text-[color:var(--foreground)]"
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            System snapshot
          </div>
          <dl className="mt-4 space-y-4">
            <SnapshotRow label="Host name" value={summary.hostName} />
            <SnapshotRow label="Docker host" value={summary.dockerHost} mono />
            <SnapshotRow label="Docker version" value={summary.dockerVersion} />
            <SnapshotRow label="API version" value={summary.apiVersion} />
          </dl>
        </div>
      </section>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string
  value: string
  detail: string
  icon: typeof Container
}) {
  return (
    <div className="rounded-[28px] border border-[color:var(--border)] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-[color:var(--muted-foreground)]">{label}</div>
          <div className="mt-4 font-['Sora',ui-sans-serif,sans-serif] text-4xl font-semibold tracking-[-0.06em] text-[color:var(--foreground)]">
            {value}
          </div>
          <div className="mt-2 text-sm text-[color:var(--muted-foreground)]">{detail}</div>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--panel-subtle)] text-[color:var(--primary)]">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}

function SnapshotRow({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] pb-4 last:border-b-0 last:pb-0">
      <dt className="text-sm text-[color:var(--muted-foreground)]">{label}</dt>
      <dd
        className={mono ? 'font-mono text-sm text-[color:var(--foreground)]' : 'text-sm font-medium text-[color:var(--foreground)]'}
      >
        {value}
      </dd>
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <div className="grid gap-4 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-40 animate-pulse rounded-[28px] border border-[color:var(--border)] bg-white shadow-[0_18px_45px_rgba(15,23,42,0.04)]"
        />
      ))}
    </div>
  )
}

function DashboardErrorState({ message }: { message: string }) {
  return (
    <section className="rounded-[28px] border border-amber-200 bg-amber-50 px-6 py-5 text-sm leading-6 text-amber-800">
      Dashboard summary is not available yet. The backend returned an error while
      collecting Docker engine data.
      <div className="mt-2 font-medium">{message}</div>
    </section>
  )
}

function formatBytes(bytes: number) {
  if (bytes === 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value.toFixed(value >= 10 || exponent === 0 ? 0 : 1)} ${units[exponent]}`
}

function formatTimestamp(value: string) {
  return value.replace('T', ' ').replace('Z', ' UTC')
}
