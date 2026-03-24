import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { HardDrive, Plus, Trash2 } from 'lucide-react'
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
  TableViewport,
  TagBadge,
} from '@/components/app/docker-view-ui'
import { Input } from '@/components/ui/input'
import { useCreateVolumeMutation, useDeleteVolumeMutation } from '@/features/resources/mutations'
import { volumesQueryOptions } from '@/features/resources/query-options'
import type { VolumeListItem } from '@/lib/api/client'
import { formatBytes, formatRelativeTime } from '@/lib/display'

type PendingVolumeAction = { kind: 'create' } | { kind: 'delete'; row: VolumeListItem }

export function VolumesPage() {
  const search = useSearch({ from: '/volumes' })
  const navigate = useNavigate({ from: '/volumes' })
  const [page, setPage] = useState(1)
  const [name, setName] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingVolumeAction | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const pageSize = 6
  const query = useQuery(volumesQueryOptions(search.q))
  const createMutation = useCreateVolumeMutation()
  const deleteMutation = useDeleteVolumeMutation()

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const attached = items.filter((item) => (item.attachedContainers?.length ?? 0) > 0).length
  const activeMutation = createMutation.isPending || deleteMutation.isPending

  async function confirmAction() {
    if (!pendingAction) {
      return
    }

    setFeedback(null)

    try {
      if (pendingAction.kind === 'create') {
        await createMutation.mutateAsync(name)
        setFeedback({ tone: 'success', message: `Created volume ${name}.` })
        setName('')
      }

      if (pendingAction.kind === 'delete') {
        await deleteMutation.mutateAsync({ name: pendingAction.row.name, force: true })
        setFeedback({ tone: 'success', message: `Deleted volume ${pendingAction.row.name}.` })
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
        title="Volumes"
        description="Browse persisted volume storage and attachments"
        actions={
          <HeaderActionButton variant="default" onClick={() => setPendingAction({ kind: 'create' })}>
            <Plus className="h-4 w-4" />
            Create Volume
          </HeaderActionButton>
        }
      />

      {feedback ? (
        <PageSection className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}>
          {feedback.message}
        </PageSection>
      ) : null}

      <OverviewGrid>
        <MetricCard label="Total Volumes" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Attached" value={String(attached)} accent="green" />
        <MetricCard label="Detached" value={String(Math.max((query.data?.total ?? 0) - attached, 0))} />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={HardDrive}
          title="All Volumes"
          actions={
            <SearchToolbar
              placeholder="Search volumes..."
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
            <div className="px-5 py-6 text-sm text-[#8b8b8b]">No volumes matched the current filter.</div>
          ) : null}
          {pagedItems.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Name</th>
                  <th className="py-3 font-medium">Driver</th>
                  <th className="py-3 font-medium">Scope</th>
                  <th className="py-3 font-medium">Size</th>
                  <th className="py-3 font-medium">Mountpoint</th>
                  <th className="py-3 font-medium">Containers</th>
                  <th className="py-3 font-medium">Created</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row) => (
                  <tr key={row.name} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5 text-[15px] font-semibold text-[#111111]">{row.name}</td>
                    <td className="py-2.5"><TagBadge>{row.driver}</TagBadge></td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.scope || '-'}</td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{formatBytes(row.sizeBytes)}</td>
                    <td className="py-2.5 text-sm text-[#8b8b8b]">{row.mountpoint}</td>
                    <td className="py-2.5">
                      {row.attachedContainers && row.attachedContainers.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {row.attachedContainers.map((item) => (
                            <TagBadge key={`${row.name}-${item}`}>{item}</TagBadge>
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
        <ModalSurface title="Create Volume" description="Create a new Docker volume for persistent storage" onClose={() => setPendingAction(null)}>
          <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. postgres_data" className="h-11 rounded-xl border-[rgba(17,17,17,0.12)] text-sm" />
          <ModalFooter confirmLabel={activeMutation ? 'Working...' : 'Create'} confirmIcon={Plus} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmAction()} confirmDisabled={activeMutation || !name.trim()} />
        </ModalSurface>
      ) : null}

      {pendingAction?.kind === 'delete' ? (
        <ModalSurface title="Delete Volume" description={`Delete ${pendingAction.row.name}. This request uses force removal in the current phase.`} onClose={() => setPendingAction(null)}>
          <ModalFooter confirmLabel={activeMutation ? 'Working...' : 'Delete'} confirmIcon={Trash2} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmAction()} confirmDisabled={activeMutation} />
        </ModalSurface>
      ) : null}
    </div>
  )
}
