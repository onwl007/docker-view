import { useState } from 'react'
import { HardDrive, Plus, Settings2 } from 'lucide-react'
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
  volumeMenuActions,
  volumeRows,
  volumesOverview,
} from '@/lib/mock-data'

export function VolumesPage() {
  const pageSize = 4
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pagedRows = volumeRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Volumes"
        description="Manage your Docker volumes"
        actions={
          <>
            <HeaderActionButton variant="default" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Volume
            </HeaderActionButton>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#111111]" type="button">
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </>
        }
      />

      <OverviewGrid>
        {volumesOverview.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={HardDrive}
          title="All Volumes"
          actions={<SearchToolbar placeholder="Search volumes..." />}
        />
        <TableViewport>
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                <th className="py-3 font-medium">Name</th>
                <th className="py-3 font-medium">Driver</th>
                <th className="py-3 font-medium">Size</th>
                <th className="py-3 font-medium">Mountpoint</th>
                <th className="py-3 font-medium">Created</th>
                <th className="py-3 font-medium">Containers</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                  <td className="py-2.5 text-[15px] font-semibold text-[#111111]">{row.name}</td>
                  <td className="py-2.5"><TagBadge>{row.driver}</TagBadge></td>
                  <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.size}</td>
                  <td className="py-2.5 text-sm text-[#8b8b8b]">{row.mountpoint}</td>
                  <td className="py-2.5 text-[15px] text-[#6a6a6a]">{row.created}</td>
                  <td className="py-2.5">
                    {row.attached ? <TagBadge>{row.container}</TagBadge> : <span className="text-[#8b8b8b]">-</span>}
                  </td>
                  <td className="relative py-2.5">
                    <EllipsisButton
                      onClick={() =>
                        setOpenMenu((current) => (current === row.id ? null : row.id))
                      }
                    />
                    {openMenu === row.id ? <ActionMenu actions={volumeMenuActions} className="right-0 top-10" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={volumeRows.length}
          pageSize={pageSize}
          onPageChange={(nextPage) => {
            setOpenMenu(null)
            setPage(nextPage)
          }}
        />
      </PageSection>

      <CleanupCard
        title="Cleanup Unused Volumes"
        description="You have 2 unused volumes that can be removed to free up space. This will remove all volumes not attached to any container."
        buttonLabel="Prune Volumes"
      />

      {dialogOpen ? (
        <ModalSurface
          title="Create Volume"
          description="Create a new Docker volume for persistent storage"
          onClose={() => setDialogOpen(false)}
        >
          <ModalField label="Volume Name" placeholder="e.g. my_data_volume" />
          <ModalFooter confirmLabel="Create" onCancel={() => setDialogOpen(false)} confirmIcon={Plus} />
        </ModalSurface>
      ) : null}
    </div>
  )
}
