import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, Cpu, HardDrive, Network, RefreshCw } from 'lucide-react'
import {
  MetricCard,
  MonitorPill,
  OverviewGrid,
  PaginationFooter,
  PageSection,
  PageToolbar,
  SectionHeading,
  TableViewport,
} from '@/components/app/docker-view-ui'
import { Button } from '@/components/ui/button'
import {
  monitoringContainersQueryOptions,
  monitoringHostQueryOptions,
} from '@/features/monitoring/query-options'
import { formatBytes, formatRelativeTime } from '@/lib/display'

const INTERVALS = [
  { label: 'Manual', value: 0 },
  { label: '5s', value: 5 },
  { label: '15s', value: 15 },
  { label: '30s', value: 30 },
] as const

export function MonitoringPage() {
  const queryClient = useQueryClient()
  const [page, setPage] = useState(1)
  const [intervalSeconds, setIntervalSeconds] = useState<number>(5)
  const pageSize = 6

  const hostQuery = useQuery({
    ...monitoringHostQueryOptions,
    refetchInterval: intervalSeconds > 0 ? intervalSeconds * 1000 : false,
  })
  const containersQuery = useQuery({
    ...monitoringContainersQueryOptions,
    refetchInterval: intervalSeconds > 0 ? intervalSeconds * 1000 : false,
  })

  const rows = containersQuery.data?.items ?? []
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)
  const host = hostQuery.data

  async function refreshNow() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'host'] }),
      queryClient.invalidateQueries({ queryKey: ['monitoring', 'containers'] }),
    ])
  }

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Monitoring"
        description="Live Docker resource usage snapshots"
        actions={
          <>
            <div className="flex items-center gap-2 rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-2 py-1 shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
              {INTERVALS.map((item) => (
                <button
                  key={item.label}
                  className={`rounded-lg px-3 py-1 text-sm ${intervalSeconds === item.value ? 'bg-[#111111] text-white' : 'text-[#444444]'}`}
                  type="button"
                  onClick={() => setIntervalSeconds(item.value)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <Button size="sm" variant="secondary" onClick={() => void refreshNow()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      {hostQuery.isLoading ? <MonitoringInfoState message="Loading monitoring summary..." /> : null}
      {hostQuery.error ? <MonitoringInfoState message={hostQuery.error.message} tone="error" /> : null}

      {host ? (
        <OverviewGrid>
          <MetricCard
            label="CPU Usage"
            value={`${host.cpuPercent.toFixed(2)}%`}
            detail={`${host.cpuCores} cores available`}
            progress={host.cpuPercent}
            accent="blue"
            icon={Cpu}
          />
          <MetricCard
            label="Memory"
            value={formatBytes(host.memoryUsedBytes)}
            subvalue={`/ ${formatBytes(host.memoryTotalBytes)}`}
            progress={host.memoryTotalBytes > 0 ? (host.memoryUsedBytes / host.memoryTotalBytes) * 100 : 0}
            accent="green"
            icon={HardDrive}
          />
          <MetricCard
            label="Disk"
            value={formatBytes(host.diskUsedBytes)}
            subvalue={`/ ${formatBytes(host.diskTotalBytes)}`}
            progress={host.diskTotalBytes > 0 ? (host.diskUsedBytes / host.diskTotalBytes) * 100 : 0}
            accent="amber"
            icon={HardDrive}
          />
          <MetricCard
            label="Network I/O"
            value=""
            accent="blue"
            icon={Network}
            breakdown={[
              { label: 'Received', value: formatBytes(host.networkRxBytes), tone: 'green' },
              { label: 'Transmitted', value: formatBytes(host.networkTxBytes), tone: 'blue' },
              { label: 'Running', value: String(host.runningContainers), tone: 'default' },
            ]}
          />
        </OverviewGrid>
      ) : null}

      <PageSection className="flex flex-col">
        <SectionHeading
          icon={Activity}
          title="Container Resources"
          description="Current usage snapshots for running containers"
        />
        <TableViewport>
          {containersQuery.isLoading ? <MonitoringTableState message="Loading container snapshots..." /> : null}
          {containersQuery.error ? <MonitoringTableState message={containersQuery.error.message} tone="error" /> : null}
          {!containersQuery.isLoading && !containersQuery.error && pagedRows.length === 0 ? (
            <MonitoringTableState message="No running containers reported usage data." />
          ) : null}
          {pagedRows.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Container</th>
                  <th className="py-3 font-medium">CPU %</th>
                  <th className="py-3 font-medium">Memory</th>
                  <th className="py-3 font-medium">Network I/O</th>
                  <th className="py-3 font-medium">Disk I/O</th>
                  <th className="py-3 font-medium">PIDs</th>
                  <th className="py-3 font-medium">Read</th>
                </tr>
              </thead>
              <tbody>
                {pagedRows.map((row) => (
                  <tr key={row.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5">
                      <div className="text-[15px] font-semibold text-[#111111]">{row.name}</div>
                      <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-[#1dc89a]">{row.cpuPercent.toFixed(2)}%</span>
                        <div className="h-2 w-16 rounded-full bg-[#f1f1f1]">
                          <div className="h-2 rounded-full bg-[#1dc89a]" style={{ width: `${Math.max(Math.min(row.cpuPercent, 100), 2)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5">
                      <div className="flex items-center gap-2 text-[15px] text-[#303030]">
                        <span>{formatBytes(row.memoryUsageBytes)}</span>
                        <span className="text-[#8b8b8b]">/ {formatBytes(row.memoryLimitBytes)}</span>
                      </div>
                      <div className="mt-2 h-2 w-24 rounded-full bg-[#f1f1f1]">
                        <div className="h-2 rounded-full bg-[#ededed]" style={{ width: `${Math.max(Math.min(row.memoryPercent, 100), 2)}%` }} />
                      </div>
                    </td>
                    <td className="py-2.5 text-[15px]">
                      <div className="text-[#1dc89a]">↓ {formatBytes(row.networkRxBytes)}</div>
                      <div className="mt-1 text-[#2caeff]">↑ {formatBytes(row.networkTxBytes)}</div>
                    </td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">
                      <div>R: {formatBytes(row.blockReadBytes)}</div>
                      <div className="mt-1">W: {formatBytes(row.blockWriteBytes)}</div>
                    </td>
                    <td className="py-2.5">
                      <MonitorPill>{row.pids}</MonitorPill>
                    </td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">{formatRelativeTime(row.readAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={rows.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </PageSection>
    </div>
  )
}

function MonitoringInfoState({
  message,
  tone = 'default',
}: {
  message: string
  tone?: 'default' | 'error'
}) {
  return (
    <PageSection className={`px-4 py-3 text-sm ${tone === 'error' ? 'text-[#b24b4b]' : 'text-[#8b8b8b]'}`}>
      {message}
    </PageSection>
  )
}

function MonitoringTableState({
  message,
  tone = 'default',
}: {
  message: string
  tone?: 'default' | 'error'
}) {
  return <div className={`px-5 py-6 text-sm ${tone === 'error' ? 'text-[#b24b4b]' : 'text-[#8b8b8b]'}`}>{message}</div>
}
