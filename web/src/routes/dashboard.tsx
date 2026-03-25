import { useQuery } from '@tanstack/react-query'
import { Container, Cpu, HardDrive, LayoutDashboard, Network, Server } from 'lucide-react'
import {
  MetricCard,
  OverviewGrid,
  PageSection,
  PageToolbar,
  SectionHeading,
  StatusBadge,
  TagBadge,
} from '@/components/app/docker-view-ui'
import { systemSummaryQueryOptions } from '@/features/dashboard/query-options'
import { recentContainersQueryOptions } from '@/features/resources/query-options'
import type { ContainerListItem, SystemSummary } from '@/lib/api/client'
import {
  formatBytes,
  formatRelativeTime,
  normalizeContainerState,
} from '@/lib/display'

export function DashboardPage() {
  const summaryQuery = useQuery(systemSummaryQueryOptions)
  const recentContainersQuery = useQuery(recentContainersQueryOptions)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Dashboard"
        description="Overview of your Docker environment"
        icon={LayoutDashboard}
      />

      {summaryQuery.isLoading ? <DashboardLoadingState /> : null}
      {summaryQuery.error ? <DashboardErrorState message={summaryQuery.error.message} /> : null}
      {summaryQuery.data ? (
        <DashboardView
          summary={summaryQuery.data}
          recentContainers={recentContainersQuery.data?.items ?? []}
          recentContainersError={recentContainersQuery.error?.message}
        />
      ) : null}
    </div>
  )
}

export function DashboardView({
  summary,
  recentContainers = [],
  recentContainersError,
}: {
  summary: SystemSummary
  recentContainers?: ContainerListItem[]
  recentContainersError?: string
}) {
  return (
    <div className="space-y-4">
      <OverviewGrid>
        <MetricCard
          label="Containers"
          value={String(summary.containers.total)}
          detail={`${summary.containers.running ?? 0} running, ${summary.containers.stopped ?? 0} stopped`}
          icon={Container}
        />
        <MetricCard label="Images" value={String(summary.images.total)} icon={HardDrive} />
        <MetricCard label="Volumes" value={String(summary.volumes.total)} icon={HardDrive} />
        <MetricCard label="Networks" value={String(summary.networks.total)} icon={Network} />
      </OverviewGrid>

      <OverviewGrid>
        <MetricCard
          label="Docker Engine"
          value={summary.engineStatus}
          detail={`Docker ${summary.dockerVersion} / API ${summary.apiVersion}`}
          accent="green"
          icon={Server}
        />
        <MetricCard
          label="Host"
          value={summary.hostName}
          subvalue={summary.dockerHost}
          icon={Cpu}
        />
        <MetricCard
          label="CPU Cores"
          value={String(summary.host.cpuCores)}
          detail="Detected on current host"
          accent="blue"
          icon={Cpu}
        />
        <MetricCard
          label="Memory"
          value={formatBytes(summary.host.memoryBytes)}
          detail="Host physical memory"
          accent="green"
          icon={HardDrive}
        />
      </OverviewGrid>

      <PageSection>
        <SectionHeading
          icon={Container}
          title="Recent Containers"
          description="Latest containers discovered from Docker Engine"
        />
        <div className="overflow-x-auto px-5 pb-5">
          {recentContainersError ? (
            <div className="py-4 text-sm text-[#b24b4b]">{recentContainersError}</div>
          ) : null}
          {!recentContainersError && recentContainers.length === 0 ? (
            <div className="py-4 text-sm text-[#8b8b8b]">No containers were found.</div>
          ) : null}
          {recentContainers.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#6f6f6f]">
                  <th className="py-3 font-medium">Container</th>
                  <th className="py-3 font-medium">Image</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Project</th>
                  <th className="py-3 font-medium">Ports</th>
                  <th className="py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {recentContainers.map((row) => (
                  <tr key={row.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5">
                      <div className="text-[15px] font-semibold text-[#151515]">{row.name}</div>
                      <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
                    </td>
                    <td className="py-2.5 text-[15px] text-[#303030]">{row.image}</td>
                    <td className="py-2.5">
                      <StatusBadge status={normalizeContainerState(row.state)} />
                    </td>
                    <td className="py-2.5">
                      {row.composeProject ? <TagBadge>{row.composeProject}</TagBadge> : <span className="text-[#8b8b8b]">-</span>}
                    </td>
                    <td className="py-2.5 text-[15px] text-[#303030]">
                      {row.ports.length > 0 ? row.ports.join(', ') : '-'}
                    </td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">
                      {formatRelativeTime(row.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
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
