import { useQuery } from '@tanstack/react-query'
import { Container } from 'lucide-react'
import {
  MetricCard,
  OverviewGrid,
  PageSection,
  PageToolbar,
  SectionHeading,
  StatusBadge,
} from '@/components/app/docker-view-ui'
import { systemSummaryQueryOptions } from '@/features/dashboard/query-options'
import {
  dashboardHostMetrics,
  dashboardPrimaryMetrics,
  dashboardRecentContainers,
} from '@/lib/mock-data'
import type { SystemSummary } from '@/lib/api/client'

export function DashboardPage() {
  const { data, error, isLoading } = useQuery(systemSummaryQueryOptions)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Dashboard"
        description="Overview of your Docker environment"
      />

      {isLoading ? <DashboardLoadingState /> : null}
      {error ? <DashboardErrorState message={error.message} /> : null}
      {data ? <DashboardView summary={data} /> : null}
    </div>
  )
}

export function DashboardView({ summary }: { summary: SystemSummary }) {
  const primaryMetrics = dashboardPrimaryMetrics.map((item) => {
    if (item.label === 'Containers') {
      return {
        ...item,
        value: String(summary.containers.total),
        detail: `${summary.containers.running ?? 0} running, ${summary.containers.stopped ?? 0} stopped`,
      }
    }

    if (item.label === 'Images') {
      return { ...item, value: String(summary.images.total) }
    }

    if (item.label === 'Volumes') {
      return { ...item, value: String(summary.volumes.total) }
    }

    if (item.label === 'Networks') {
      return { ...item, value: String(summary.networks.total) }
    }

    return item
  })

  const hostMetrics = dashboardHostMetrics.map((item) => {
    if (item.label === 'CPU Usage') {
      return { ...item, subvalue: `${summary.host.cpuCores} cores` }
    }

    if (item.label === 'Memory') {
      return { ...item, value: formatBytes(summary.host.memoryBytes) }
    }

    return item
  })

  return (
    <div className="space-y-4">
      <OverviewGrid>
        {primaryMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} icon={metric.leadingIcon} />
        ))}
      </OverviewGrid>

      <OverviewGrid>
        {hostMetrics.map((metric) => (
          <MetricCard key={metric.label} {...metric} icon={metric.leadingIcon} />
        ))}
      </OverviewGrid>

      <PageSection>
        <SectionHeading
          icon={Container}
          title="Recent Containers"
          description="Overview of your most recently active containers"
        />
        <div className="overflow-x-auto px-5 pb-5">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#6f6f6f]">
                <th className="py-3 font-medium">Container</th>
                <th className="py-3 font-medium">Image</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">CPU</th>
                <th className="py-3 font-medium">Memory</th>
                <th className="py-3 font-medium">Uptime</th>
              </tr>
            </thead>
            <tbody>
              {dashboardRecentContainers.map((row) => (
                <tr key={row.name} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                  <td className="py-2.5">
                    <div className="text-[15px] font-semibold text-[#151515]">{row.name}</div>
                    <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
                  </td>
                  <td className="py-2.5 text-[15px] text-[#303030]">{row.image}</td>
                  <td className="py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5 text-[15px] text-[#303030]">{row.cpu}</td>
                  <td className="py-2.5 text-[15px] text-[#303030]">{row.memory}</td>
                  <td className="py-2.5 text-[15px] text-[#6a6a6a]">{row.uptime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageSection>
    </div>
  )
}

function DashboardLoadingState() {
  return (
    <OverviewGrid>
      {Array.from({ length: 4 }).map((_, index) => (
        <PageSection key={index} className="h-[158px] animate-pulse bg-[#f6f6f6]">
          <div />
        </PageSection>
      ))}
    </OverviewGrid>
  )
}

function DashboardErrorState({ message }: { message: string }) {
  return (
    <PageSection className="px-5 py-4 text-sm text-[#b24b4b]">
      Dashboard summary is not available yet.
      <div className="mt-1 font-medium">{message}</div>
    </PageSection>
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
