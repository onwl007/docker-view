import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Box } from 'lucide-react'
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
import { containersQueryOptions } from '@/features/resources/query-options'
import type { ContainerListItem } from '@/lib/api/client'
import { formatRelativeTime, normalizeContainerState } from '@/lib/display'

export function ContainersPage() {
  const search = useSearch({ from: '/containers' })
  const navigate = useNavigate({ from: '/containers' })
  const [page, setPage] = useState(1)
  const pageSize = 6
  const query = useQuery(containersQueryOptions({ q: search.q, all: true }))

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const running = items.filter((item) => normalizeContainerState(item.state) === 'running').length
  const stopped = items.filter((item) => normalizeContainerState(item.state) === 'stopped').length

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Containers"
        description="Browse containers, runtime state and attached resources"
      />

      <OverviewGrid>
        <MetricCard label="Total Containers" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Running" value={String(running)} accent="green" />
        <MetricCard label="Stopped" value={String(stopped)} />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={Box}
          title="All Containers"
          actions={
            <SearchToolbar
              placeholder="Search containers..."
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
          {query.isLoading ? <ResourceLoadingState /> : null}
          {query.error ? <ResourceErrorState message={query.error.message} /> : null}
          {!query.isLoading && !query.error && pagedItems.length === 0 ? (
            <ResourceEmptyState label="containers" />
          ) : null}
          {pagedItems.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Container</th>
                  <th className="py-3 font-medium">Image</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Ports</th>
                  <th className="py-3 font-medium">Networks</th>
                  <th className="py-3 font-medium">Volumes</th>
                  <th className="py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row) => (
                  <ContainerTableRow key={row.id} row={row} />
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

export function ContainerTableRow({ row }: { row: ContainerListItem }) {
  return (
    <tr className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
      <td className="py-2.5">
        <div className="text-[15px] font-semibold text-[#111111]">{row.name}</div>
        <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
      </td>
      <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.image}</td>
      <td className="py-2.5">
        <div className="space-y-2">
          <StatusBadge status={normalizeContainerState(row.state)} />
          <div className="text-sm text-[#8b8b8b]">{row.status}</div>
        </div>
      </td>
      <td className="py-2.5">
        <TagList items={row.ports} />
      </td>
      <td className="py-2.5">
        <TagList items={row.networkNames ?? []} />
      </td>
      <td className="py-2.5">
        <TagList items={row.volumeNames ?? []} />
      </td>
      <td className="py-2.5 text-[15px] text-[#5f5f5f]">{formatRelativeTime(row.createdAt)}</td>
    </tr>
  )
}

function TagList({ items }: { items: string[] }) {
  if (items.length === 0) {
    return <span className="text-[#8b8b8b]">-</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <TagBadge key={item}>{item}</TagBadge>
      ))}
    </div>
  )
}

function ResourceLoadingState() {
  return <div className="px-5 py-6 text-sm text-[#8b8b8b]">Loading resources...</div>
}

function ResourceErrorState({ message }: { message: string }) {
  return <div className="px-5 py-6 text-sm text-[#b24b4b]">{message}</div>
}

function ResourceEmptyState({ label }: { label: string }) {
  return <div className="px-5 py-6 text-sm text-[#8b8b8b]">No {label} matched the current filter.</div>
}
