import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Download, ShieldCheck } from 'lucide-react'
import {
  HeaderActionButton,
  MetricCard,
  OverviewGrid,
  PageSection,
  PaginationFooter,
  PageToolbar,
  SearchToolbar,
  SectionHeading,
  TableViewport,
  TagBadge,
} from '@/components/app/docker-view-ui'
import { auditEventsQueryOptions } from '@/features/audit/query-options'
import { downloadAuditEvents } from '@/lib/api/client'
import { formatRelativeTime } from '@/lib/display'

export function AuditPage() {
  const search = useSearch({ from: '/audit' })
  const navigate = useNavigate({ from: '/audit' })
  const [page, setPage] = useState(1)
  const pageSize = 8
  const query = useQuery(auditEventsQueryOptions(search.q))
  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageToolbar
        title="Audit"
        description="Review recent sensitive operations and export the in-process audit trail"
        icon={ShieldCheck}
        actions={
          <HeaderActionButton onClick={() => void downloadAuditEvents({ q: search.q })}>
            <Download className="h-4 w-4" />
            Export NDJSON
          </HeaderActionButton>
        }
      />

      <OverviewGrid>
        <MetricCard label="Events" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Failures" value={String(items.filter((item) => item.result === 'failure').length)} accent="amber" />
        <MetricCard label="Actors" value={String(new Set(items.map((item) => item.actor)).size)} accent="green" />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <SectionHeading
          icon={ShieldCheck}
          title="Recent Events"
          actions={
            <SearchToolbar
              placeholder="Search actor, action, target..."
              value={search.q}
              onChange={(value) => {
                setPage(1)
                void navigate({
                  search: () => (value.trim() ? { q: value.trim() } : {}),
                  replace: true,
                })
              }}
            />
          }
        />
        <TableViewport>
          {query.isLoading ? <div className="px-5 py-6 text-sm text-[#8b8b8b]">Loading audit events...</div> : null}
          {query.error ? <div className="px-5 py-6 text-sm text-[#b24b4b]">{query.error.message}</div> : null}
          {!query.isLoading && !query.error && pagedItems.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[#8b8b8b]">No audit events matched the current filter.</div>
          ) : null}
          {pagedItems.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Action</th>
                  <th className="py-3 font-medium">Target</th>
                  <th className="py-3 font-medium">Actor</th>
                  <th className="py-3 font-medium">Source</th>
                  <th className="py-3 font-medium">Result</th>
                  <th className="py-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row, index) => (
                  <tr key={`${row.timestamp}-${row.action}-${index}`} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5">
                      <div className="text-[15px] font-semibold text-[#111111]">{row.action}</div>
                      <div className="text-sm text-[#8b8b8b]">{row.eventType}</div>
                    </td>
                    <td className="py-2.5">
                      <div className="text-[15px] text-[#2f2f2f]">{row.targetId}</div>
                      <div className="text-sm text-[#8b8b8b]">{row.targetType}</div>
                    </td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.actor || 'anonymous'}</td>
                    <td className="py-2.5 text-sm text-[#6a6a6a]">{row.source || '-'}</td>
                    <td className="py-2.5">
                      <TagBadge>{row.result}</TagBadge>
                    </td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">{formatRelativeTime(row.timestamp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TableViewport>
        <PaginationFooter currentPage={page} totalItems={items.length} pageSize={pageSize} onPageChange={setPage} />
      </PageSection>
    </div>
  )
}
