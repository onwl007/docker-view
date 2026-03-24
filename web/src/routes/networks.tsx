import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Network, Plus, Trash2 } from 'lucide-react'
import {
  HeaderActionButton,
  MetricCard,
  ModalFooter,
  ModalSurface,
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
import { Input } from '@/components/ui/input'
import { useCreateNetworkMutation, useDeleteNetworkMutation } from '@/features/resources/mutations'
import { networksQueryOptions } from '@/features/resources/query-options'
import type { NetworkListItem } from '@/lib/api/client'
import { formatRelativeTime } from '@/lib/display'

type PendingNetworkAction = { kind: 'create' } | { kind: 'delete'; row: NetworkListItem }

export function NetworksPage() {
  const search = useSearch({ from: '/networks' })
  const navigate = useNavigate({ from: '/networks' })
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [driver, setDriver] = useState('bridge')
  const [internal, setInternal] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingNetworkAction | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const pageSize = 6
  const query = useQuery(networksQueryOptions(search.q))
  const createMutation = useCreateNetworkMutation()
  const deleteMutation = useDeleteNetworkMutation()

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const internalCount = items.filter((item) => item.internal).length
  const activeMutation = createMutation.isPending || deleteMutation.isPending

  async function confirmAction() {
    if (!pendingAction) {
      return
    }

    setFeedback(null)

    try {
      if (pendingAction.kind === 'create') {
        await createMutation.mutateAsync({ name, driver, internal })
        setFeedback({ tone: 'success', message: `Created network ${name}.` })
        setName('')
        setDriver('bridge')
        setInternal(false)
      }

      if (pendingAction.kind === 'delete') {
        await deleteMutation.mutateAsync(pendingAction.row.id)
        setFeedback({ tone: 'success', message: `Deleted network ${pendingAction.row.name}.` })
      }

      setPendingAction(null)
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error ? error.message : 'Request failed',
      })
      setPendingAction(null)
    }
  }

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Networks"
        description="Browse Docker networks and attached containers"
        actions={
          <HeaderActionButton variant="default" onClick={() => setPendingAction({ kind: 'create' })}>
            <Plus className="h-4 w-4" />
            Create Network
          </HeaderActionButton>
        }
      />

      {feedback ? (
        <PageSection className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}>
          {feedback.message}
        </PageSection>
      ) : null}

      <OverviewGrid>
        <MetricCard label="Total Networks" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Internal" value={String(internalCount)} accent="amber" />
        <MetricCard label="External" value={String(Math.max((query.data?.total ?? 0) - internalCount, 0))} accent="green" />
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
                  <th className="py-3 font-medium">Actions</th>
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
                    <td className="py-2.5">
                      <button className="text-sm font-medium text-[#b24b4b]" disabled={activeMutation} type="button" onClick={() => setPendingAction({ kind: 'delete', row })}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TableViewport>
        <PaginationFooter currentPage={page} totalItems={items.length} pageSize={pageSize} onPageChange={setPage} />
      </PageSection>

      {pendingAction?.kind === 'create' ? (
        <ModalSurface title="Create Network" description="Create a Docker network for container communication" onClose={() => setPendingAction(null)}>
          <div className="space-y-4">
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. frontend_net" className="h-11 rounded-xl border-[rgba(17,17,17,0.12)] text-sm" />
            <Input value={driver} onChange={(event) => setDriver(event.target.value)} placeholder="bridge" className="h-11 rounded-xl border-[rgba(17,17,17,0.12)] text-sm" />
            <label className="flex items-center gap-3 text-sm text-[#303030]">
              <input checked={internal} onChange={(event) => setInternal(event.target.checked)} type="checkbox" />
              Internal only
            </label>
          </div>
          <ModalFooter confirmLabel={activeMutation ? 'Working...' : 'Create'} confirmIcon={Plus} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmAction()} confirmDisabled={activeMutation || !name.trim()} />
        </ModalSurface>
      ) : null}

      {pendingAction?.kind === 'delete' ? (
        <ModalSurface title="Delete Network" description={`Delete ${pendingAction.row.name}. Docker will reject removal if containers are still attached.`} onClose={() => setPendingAction(null)}>
          <ModalFooter confirmLabel={activeMutation ? 'Working...' : 'Delete'} confirmIcon={Trash2} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmAction()} confirmDisabled={activeMutation} />
        </ModalSurface>
      ) : null}
    </div>
  )
}
