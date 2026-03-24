import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Image as ImageIcon } from 'lucide-react'
import {
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
import { imagesQueryOptions } from '@/features/resources/query-options'
import { formatBytes, formatRelativeTime } from '@/lib/display'

export function ImagesPage() {
  const search = useSearch({ from: '/images' })
  const navigate = useNavigate({ from: '/images' })
  const [page, setPage] = useState(1)
  const pageSize = 6
  const query = useQuery(imagesQueryOptions(search.q))

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const inUse = items.filter((item) => item.inUse).length

  return (
    <div className="space-y-3">
      <PageToolbar title="Images" description="Browse local images and tag usage" />

      <OverviewGrid>
        <MetricCard label="Image Tags" value={String(query.data?.total ?? 0)} />
        <MetricCard label="In Use" value={String(inUse)} accent="green" />
        <MetricCard
          label="Unused"
          value={String(Math.max((query.data?.total ?? 0) - inUse, 0))}
        />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={ImageIcon}
          title="All Images"
          actions={
            <SearchToolbar
              placeholder="Search images..."
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
            <div className="px-5 py-6 text-sm text-[#8b8b8b]">No images matched the current filter.</div>
          ) : null}
          {pagedItems.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Repository</th>
                  <th className="py-3 font-medium">Tag</th>
                  <th className="py-3 font-medium">Image ID</th>
                  <th className="py-3 font-medium">Size</th>
                  <th className="py-3 font-medium">Containers</th>
                  <th className="py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row) => (
                  <tr key={`${row.id}-${row.repository}-${row.tag}`} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5 text-[15px] font-semibold text-[#111111]">{row.repository}</td>
                    <td className="py-2.5"><TagBadge>{row.tag}</TagBadge></td>
                    <td className="py-2.5 text-sm text-[#8b8b8b]">{row.shortId}</td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{formatBytes(row.sizeBytes)}</td>
                    <td className="py-2.5">
                      {row.inUse ? <TagBadge>{String(row.containers)}</TagBadge> : <span className="text-[#8b8b8b]">-</span>}
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
