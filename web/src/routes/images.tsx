import { useState } from 'react'
import { Download, Image as ImageIcon, Play, Settings2 } from 'lucide-react'
import {
  ActionMenu,
  CleanupCard,
  EllipsisButton,
  HeaderActionButton,
  MetricCard,
  ModalField,
  ModalFooter,
  ModalSurface,
  OverviewGrid,
  PaginationFooter,
  PageSection,
  TableViewport,
  PageToolbar,
  SearchToolbar,
  SectionHeading,
  TagBadge,
} from '@/components/app/docker-view-ui'
import {
  imageMenuActions,
  imageRows,
  imagesOverview,
} from '@/lib/mock-data'

export function ImagesPage() {
  const pageSize = 4
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pagedRows = imageRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Images"
        description="Manage your Docker images"
        actions={
          <>
            <HeaderActionButton variant="default" onClick={() => setDialogOpen(true)}>
              <Download className="h-4 w-4" />
              Pull Image
            </HeaderActionButton>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#111111]" type="button">
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </>
        }
      />

      <OverviewGrid>
        {imagesOverview.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={ImageIcon}
          title="All Images"
          actions={<SearchToolbar placeholder="Search images..." />}
        />
        <TableViewport>
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                <th className="py-3 font-medium">Repository</th>
                <th className="py-3 font-medium">Tag</th>
                <th className="py-3 font-medium">Image ID</th>
                <th className="py-3 font-medium">Size</th>
                <th className="py-3 font-medium">Layers</th>
                <th className="py-3 font-medium">Created</th>
                <th className="py-3 font-medium">Containers</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                  <td className="py-2.5 text-[15px] font-semibold text-[#111111]">{row.repository}</td>
                  <td className="py-2.5"><TagBadge>{row.tag}</TagBadge></td>
                  <td className="py-2.5 text-sm text-[#8b8b8b]">{row.imageId}</td>
                  <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.size}</td>
                  <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.layers}</td>
                  <td className="py-2.5 text-[15px] text-[#6a6a6a]">{row.created}</td>
                  <td className="py-2.5">
                    {row.inUse ? <TagBadge>{row.containers}</TagBadge> : <span className="text-[#8b8b8b]">-</span>}
                  </td>
                  <td className="relative py-2.5">
                    <div className="flex items-center gap-2">
                      <button className="rounded-lg p-1 text-[#1dc89a]" type="button">
                        <Play className="h-4.5 w-4.5" />
                      </button>
                      <EllipsisButton
                        onClick={() =>
                          setOpenMenu((current) => (current === row.id ? null : row.id))
                        }
                      />
                    </div>
                    {openMenu === row.id ? <ActionMenu actions={imageMenuActions} className="right-0 top-10" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={imageRows.length}
          pageSize={pageSize}
          onPageChange={(nextPage) => {
            setOpenMenu(null)
            setPage(nextPage)
          }}
        />
      </PageSection>

      <CleanupCard
        title="Cleanup Unused Images"
        description="You have 3 unused images that can be removed to free up space. This will remove all images not used by any container."
        buttonLabel="Prune Images"
      />

      {dialogOpen ? (
        <ModalSurface
          title="Pull Image"
          description="Pull a Docker image from a registry"
          onClose={() => setDialogOpen(false)}
        >
          <ModalField label="Image Name" placeholder="e.g. nginx:latest" />
          <ModalFooter confirmLabel="Pull" onCancel={() => setDialogOpen(false)} confirmIcon={Download} />
        </ModalSurface>
      ) : null}
    </div>
  )
}
