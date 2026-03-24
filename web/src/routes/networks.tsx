import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Network } from 'lucide-react'
import {
  MetricCard,
  OverviewGrid,
  PageSection,
  PaginationFooter,
  PageToolbar,
  SearchToolbar,
  SectionHeading,
  StatusBadge,
  TableViewport,
  TagBadge,
} from '@/components/app/docker-view-ui'
import { networksQueryOptions } from '@/features/resources/query-options'
import { formatRelativeTime } from '@/lib/display'

export function NetworksPage() {
  const search = useSearch({ from: '/networks' })
  const navigate = useNavigate({ from: '/networks' })
  const [page, setPage] = useState(1)
  const pageSize = 6
  const query = useQuery(networksQueryOptions(search.q))

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const internal = items.filter((item) => item.internal).length

  return (
    <div className="space-y-3">
      <PageToolbar title="Networks" description="Browse Docker networks and attached containers" />

      <OverviewGrid>
        <MetricCard label="Total Networks" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Internal" value={String(internal)} accent="amber" />
        <MetricCard
          label="External"
          value={String(Math.max((query.data?.total ?? 0) - internal, 0))}
          accent="green"
        />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={Network}
          title="All Networks"
          actions={
            <SearchToolbar
              placeholder="Search networks..."
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
          {query.isLoading ? <div className="px-5 py-6 text-sm text-[#8b8b8b]">Loading resources...</div> : null}
          {query.error ? <div className="px-5 py-6 text-sm text-[#b24b4b]">{query.error.message}</div> : null}
          {!query.isLoading && !query.error && pagedItems.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[#8b8b8b]">No networks matched the current filter.</div>
          ) : null}
          {pagedItems.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Name</th>
                  <th className="py-3 font-medium">Driver</th>
                  <th className="py-3 font-medium">Scope</th>
                  <th className="py-3 font-medium">Subnet</th>
                  <th className="py-3 font-medium">Gateway</th>
                  <th className="py-3 font-medium">Access</th>
                  <th className="py-3 font-medium">Containers</th>
                  <th className="py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row) => (
                  <tr key={row.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5">
                      <div className="text-[15px] font-semibold text-[#111111]">{row.name}</div>
                      <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
                    </td>
                    <td className="py-2.5"><TagBadge>{row.driver}</TagBadge></td>
                    <td className="py-2.5 text-[15px] text-[#303030]">{row.scope}</td>
                    <td className="py-2.5 font-mono text-[15px] text-[#303030]">{row.subnet || '-'}</td>
                    <td className="py-2.5 font-mono text-[15px] text-[#303030]">{row.gateway || '-'}</td>
                    <td className="py-2.5">
                      <StatusBadge status={row.internal ? 'internal' : 'external'} />
                    </td>
                    <td className="py-2.5">
                      {row.containerNames && row.containerNames.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {row.containerNames.map((item) => (
                            <TagBadge key={`${row.id}-${item}`}>{item}</TagBadge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#8b8b8b]">-</span>
                      )}
                    </td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">{formatRelativeTime(row.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={items.length}
          pageSize={pageSize}
          onPageChange={setPage}
        />
      </PageSection>
    </div>
  )
}
