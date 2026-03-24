import { useState } from 'react'
import { Network, Plus, Settings2 } from 'lucide-react'
import {
  ActionMenu,
  EllipsisButton,
  FauxSelect,
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
  StatusBadge,
  TagBadge,
} from '@/components/app/docker-view-ui'
import {
  networkMenuActions,
  networkRows,
  networksOverview,
} from '@/lib/mock-data'

export function NetworksPage() {
  const pageSize = 4
  const [dialogOpen, setDialogOpen] = useState(false)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const pagedRows = networkRows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Networks"
        description="Manage your Docker networks"
        actions={
          <>
            <HeaderActionButton variant="default" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Network
            </HeaderActionButton>
            <button className="flex h-9 w-9 items-center justify-center rounded-xl text-[#111111]" type="button">
              <Settings2 className="h-4.5 w-4.5" />
            </button>
          </>
        }
      />

      <OverviewGrid>
        {networksOverview.map((metric) => (
          <MetricCard key={metric.label} {...metric} />
        ))}
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={Network}
          title="All Networks"
          actions={<SearchToolbar placeholder="Search networks..." />}
        />
        <TableViewport>
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
                  <td className="py-2.5"><TagBadge>{row.driver}</TagBadge></td>
                  <td className="py-2.5 text-[15px] text-[#303030]">{row.scope}</td>
                  <td className="py-2.5 font-mono text-[15px] text-[#303030]">{row.subnet}</td>
                  <td className="py-2.5 font-mono text-[15px] text-[#303030]">{row.gateway}</td>
                  <td className="py-2.5"><StatusBadge status={row.access} /></td>
                  <td className="py-2.5">
                    <div className="flex flex-wrap gap-2">
                      {row.containers.length ? row.containers.map((item) => <TagBadge key={`${row.id}-${item}`}>{item}</TagBadge>) : <span className="text-[#8b8b8b]">-</span>}
                    </div>
                  </td>
                  <td className="relative py-2.5">
                    <EllipsisButton
                      onClick={() =>
                        setOpenMenu((current) => (current === row.id ? null : row.id))
                      }
                    />
                    {openMenu === row.id ? <ActionMenu actions={networkMenuActions} className="right-0 top-10" /> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableViewport>
        <PaginationFooter
          currentPage={page}
          totalItems={networkRows.length}
          pageSize={pageSize}
          onPageChange={(nextPage) => {
            setOpenMenu(null)
            setPage(nextPage)
          }}
        />
      </PageSection>

      {dialogOpen ? (
        <ModalSurface
          title="Create Network"
          description="Create a new Docker network for container communication"
          onClose={() => setDialogOpen(false)}
        >
          <div className="space-y-6">
            <ModalField label="Network Name" placeholder="e.g. my_network" />
            <div>
              <div className="mb-3 text-sm font-medium text-[#111111]">Driver</div>
              <FauxSelect value="Bridge" />
            </div>
          </div>
          <ModalFooter confirmLabel="Create" onCancel={() => setDialogOpen(false)} confirmIcon={Plus} />
        </ModalSurface>
      ) : null}
    </div>
  )
}
