import { useState } from 'react'
import { Activity, RefreshCw, Settings2 } from 'lucide-react'
import {
  IntervalButton,
  MetricCard,
  MonitorPill,
  OverviewGrid,
  PaginationFooter,
  PageSection,
  PageToolbar,
  SectionHeading,
  TableViewport,
} from '@/components/app/docker-view-ui'
import { monitoringOverview, monitoringRows } from '@/lib/mock-data'

export function MonitoringPage() {
  const pageSize = 4
  const [page, setPage] = useState(1)
  const pagedRows = monitoringRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Monitoring"
        description="Real-time resource monitoring"
        actions={
          <>
            <IntervalButton value="5 seconds" />
            <button className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(17,17,17,0.08)] bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)]" type="button">
              <RefreshCw className="h-4.5 w-4.5" />
            </button>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#111111]" type="button">
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </>
        }
      />

      <OverviewGrid>
        {monitoringOverview.map((metric) => (
          <MetricCard key={metric.label} {...metric} icon={metric.leadingIcon} />
        ))}
      </OverviewGrid>

      <PageSection className="flex flex-col">
        <SectionHeading
          icon={Activity}
          title="Container Resources"
          description="Real-time resource usage for running containers"
        />
        <TableViewport>
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                <th className="py-3 font-medium">Container</th>
                <th className="py-3 font-medium">CPU %</th>
                <th className="py-3 font-medium">Memory Usage</th>
                <th className="py-3 font-medium">Network I/O</th>
                <th className="py-3 font-medium">Disk I/O</th>
                <th className="py-3 font-medium">PIDs</th>
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
                      <span className="font-semibold text-[#1dc89a]">{row.cpu}%</span>
                      <div className="h-2 w-16 rounded-full bg-[#f1f1f1]">
                        <div className="h-2 rounded-full bg-[#1dc89a]" style={{ width: `${Math.max(row.cpu * 2, 4)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center gap-3 text-[15px] text-[#303030]">
                      <span>{row.memoryUsed}</span>
                      <span className="text-[#8b8b8b]">/ {row.memoryTotal}</span>
                    </div>
                    <div className="mt-2 h-2 w-24 rounded-full bg-[#f1f1f1]">
                      <div className="h-2 rounded-full bg-[#ededed]" style={{ width: `${row.memoryProgress}%` }} />
                    </div>
                  </td>
                  <td className="py-2.5 text-[15px]">
                    <div className="text-[#1dc89a]">↓ {row.networkRx}</div>
                    <div className="mt-1 text-[#2caeff]">↑ {row.networkTx}</div>
                  </td>
                  <td className="py-2.5 text-[15px] text-[#6a6a6a]">
                    <div>R: {row.diskRead}</div>
                    <div className="mt-1">W: {row.diskWrite}</div>
                  </td>
                  <td className="py-2.5">
                    <MonitorPill>{row.pids}</MonitorPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={monitoringRows.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </PageSection>
    </div>
  )
}
