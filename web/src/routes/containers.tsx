import { useState } from 'react'
import { Box, Plus, Settings2, SquareTerminal, Trash2 } from 'lucide-react'
import {
  ActionMenu,
  EllipsisButton,
  HeaderActionButton,
  IconAction,
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
  StatusBadge,
  TagBadge,
} from '@/components/app/docker-view-ui'
import {
  containerMenuActions,
  containerRows,
  containersOverview,
} from '@/lib/mock-data'

export function ContainersPage() {
  const pageSize = 4
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pagedRows = containerRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Containers"
        description="Manage your Docker containers"
        actions={
          <>
            <HeaderActionButton variant="default" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Container
            </HeaderActionButton>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-xl text-[#111111]"
              type="button"
            >
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </>
        }
      />

      <OverviewGrid>
        {containersOverview.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={Box}
          title="All Containers"
          actions={<SearchToolbar placeholder="Search containers..." />}
        />
        <TableViewport>
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                <th className="py-3 font-medium">Container</th>
                <th className="py-3 font-medium">Image</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 font-medium">Ports</th>
                <th className="py-3 font-medium">CPU</th>
                <th className="py-3 font-medium">Memory</th>
                <th className="py-3 font-medium">Uptime</th>
                <th className="py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((row) => (
                <tr key={row.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                  <td className="py-2.5">
                    <div className="text-[15px] font-semibold text-[#111111]">{row.name}</div>
                    <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
                  </td>
                  <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.image}</td>
                  <td className="py-2.5">
                    <StatusBadge status={row.status} />
                  </td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-2">
                      {row.ports.length ? row.ports.map((port) => <TagBadge key={port}>{port}</TagBadge>) : <span className="text-[#8b8b8b]">-</span>}
                    </div>
                  </td>
                  <td className="py-2.5 text-[15px] text-[#303030]">{row.cpu}</td>
                  <td className="py-2.5 text-[15px] text-[#303030]">{row.memory}</td>
                  <td className="py-2.5 text-[15px] text-[#5f5f5f]">{row.uptime}</td>
                  <td className="relative py-2.5">
                    <div className="flex items-center gap-2">
                      {row.primaryAction === 'start' ? (
                        <IconAction icon={SquareTerminal} tone="green" />
                      ) : (
                        <IconAction icon={Trash2} tone="default" />
                      )}
                      <EllipsisButton
                        onClick={() =>
                          setOpenMenu((current) => (current === row.id ? null : row.id))
                        }
                      />
                    </div>
                    {openMenu === row.id ? <ActionMenu actions={containerMenuActions} className="right-0 top-10" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={containerRows.length}
          pageSize={pageSize}
          onPageChange={(nextPage) => {
            setOpenMenu(null)
            setPage(nextPage)
          }}
        />
      </PageSection>

      {dialogOpen ? (
        <ModalSurface
          title="Create Container"
          description="Create a new Docker container"
          onClose={() => setDialogOpen(false)}
        >
          <ModalField label="Container Name" placeholder="e.g. nginx-proxy" />
          <ModalFooter confirmLabel="Create" onCancel={() => setDialogOpen(false)} />
        </ModalSurface>
      ) : null}
    </div>
  )
}
