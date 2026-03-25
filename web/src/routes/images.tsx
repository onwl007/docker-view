import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Download, Image as ImageIcon, Info, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  useDeleteImageMutation,
  usePruneImagesMutation,
  usePullImageMutation,
} from '@/features/resources/mutations'
import { imageDetailQueryOptions, imagesQueryOptions } from '@/features/resources/query-options'
import type { ImageDetail, ImageListItem } from '@/lib/api/client'
import { formatBytes, formatDateTime, formatRelativeTime } from '@/lib/display'

type PendingImageAction =
  | { kind: 'pull' }
  | { kind: 'prune' }
  | { kind: 'info'; row: ImageListItem }
  | { kind: 'delete'; row: ImageListItem }

export function ImagesPage() {
  const search = useSearch({ from: '/images' })
  const navigate = useNavigate({ from: '/images' })
  const [page, setPage] = useState(1)
  const [reference, setReference] = useState('')
  const [pendingAction, setPendingAction] = useState<PendingImageAction | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const pageSize = 6
  const detailImageId = pendingAction?.kind === 'info' ? pendingAction.row.id : ''
  const query = useQuery(imagesQueryOptions(search.q))
  const imageDetailQuery = useQuery({
    ...imageDetailQueryOptions(detailImageId),
    enabled: Boolean(detailImageId),
  })
  const pullMutation = usePullImageMutation()
  const deleteMutation = useDeleteImageMutation()
  const pruneMutation = usePruneImagesMutation()

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const inUse = items.filter((item) => item.inUse).length
  const activeMutation = pullMutation.isPending || deleteMutation.isPending || pruneMutation.isPending

  async function confirmAction() {
    if (!pendingAction) {
      return
    }

    setFeedback(null)

    try {
      if (pendingAction.kind === 'pull') {
        await pullMutation.mutateAsync(reference)
        setFeedback({ tone: 'success', message: `Pulled ${reference}.` })
        setReference('')
      }

      if (pendingAction.kind === 'prune') {
        await pruneMutation.mutateAsync()
        setFeedback({ tone: 'success', message: 'Pruned unused images.' })
      }

      if (pendingAction.kind === 'delete') {
        await deleteMutation.mutateAsync({ id: pendingAction.row.id, force: true })
        setFeedback({ tone: 'success', message: `Deleted ${pendingAction.row.repository}:${pendingAction.row.tag}.` })
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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageToolbar
        title="Images"
        description="Browse local images and tag usage"
        icon={ImageIcon}
        actions={
          <>
            <HeaderActionButton variant="default" onClick={() => setPendingAction({ kind: 'pull' })}>
              <Download className="h-4 w-4" />
              Pull Image
            </HeaderActionButton>
            <HeaderActionButton onClick={() => setPendingAction({ kind: 'prune' })}>
              Prune Unused
            </HeaderActionButton>
          </>
        }
      />

      {feedback ? (
        <PageSection className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}>
          {feedback.message}
        </PageSection>
      ) : null}

      <OverviewGrid>
        <MetricCard label="Image Tags" value={String(query.data?.total ?? 0)} />
        <MetricCard label="In Use" value={String(inUse)} accent="green" />
        <MetricCard label="Unused" value={String(Math.max((query.data?.total ?? 0) - inUse, 0))} />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
                  <th className="py-3 font-medium">Actions</th>
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
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" disabled={activeMutation} onClick={() => setPendingAction({ kind: 'info', row })}>
                          <Info className="h-3.5 w-3.5" />
                          Info
                        </Button>
                        <Button size="sm" variant="ghost" disabled={activeMutation} onClick={() => setPendingAction({ kind: 'delete', row })} className="text-[#b24b4b] hover:text-[#b24b4b]">
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </TableViewport>
        <PaginationFooter currentPage={page} totalItems={items.length} pageSize={pageSize} onPageChange={setPage} />
      </PageSection>

      {pendingAction?.kind === 'pull' ? (
        <ModalSurface title="Pull Image" description="Pull a Docker image from a registry" onClose={() => setPendingAction(null)}>
          <div className="space-y-3">
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. nginx:latest"
              className="h-11 rounded-xl border-[rgba(17,17,17,0.12)] text-sm"
            />
          </div>
          <ModalFooter confirmLabel={activeMutation ? 'Working...' : 'Pull'} confirmIcon={Download} onCancel={() => setPendingAction(null)} onConfirm={() => void confirmAction()} confirmDisabled={activeMutation || !reference.trim()} />
        </ModalSurface>
      ) : null}

      {pendingAction?.kind === 'prune' ? (
        <ConfirmActionModal
          title="Prune Images"
          description="Remove all unused images and refresh image summaries."
          confirmLabel="Prune"
          confirmIcon={Trash2}
          submitting={activeMutation}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void confirmAction()}
        />
      ) : null}

      {pendingAction?.kind === 'info' ? (
        <ImageInfoModal
          row={pendingAction.row}
          detail={imageDetailQuery.data ?? null}
          isLoading={imageDetailQuery.isLoading}
          error={imageDetailQuery.error?.message ?? null}
          onClose={() => setPendingAction(null)}
        />
      ) : null}

      {pendingAction?.kind === 'delete' ? (
        <ConfirmActionModal
          title="Delete Image"
          description={`Delete ${pendingAction.row.repository}:${pendingAction.row.tag}. This uses force removal in the current phase.`}
          confirmLabel="Delete"
          confirmIcon={Trash2}
          submitting={activeMutation}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void confirmAction()}
        />
      ) : null}
    </div>
  )
}

function ImageInfoModal({
  row,
  detail,
  isLoading,
  error,
  onClose,
}: {
  row: ImageListItem
  detail: ImageDetail | null
  isLoading: boolean
  error: string | null
  onClose: () => void
}) {
  const labels = detail?.labels ? Object.entries(detail.labels).sort(([left], [right]) => left.localeCompare(right)) : []
  const env = detail?.env ?? []
  const layers = detail?.layers ?? []
  const repoDigests = detail?.repoDigests ?? []

  return (
    <ModalSurface
      title="Image Info"
      description={`${row.repository}:${row.tag} inspect details`}
      onClose={onClose}
      size="lg"
    >
      {isLoading ? <div className="text-sm text-[#8b8b8b]">Loading image info...</div> : null}
      {error ? <div className="text-sm text-[#b24b4b]">{error}</div> : null}
      {detail ? (
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2">
            <InfoField label="Image ID" value={detail.id} mono />
            <InfoField label="Short ID" value={detail.shortId} mono />
            <InfoField label="Created" value={formatDateTime(detail.createdAt)} />
            <InfoField label="Size" value={formatBytes(detail.sizeBytes)} />
            <InfoField label="Containers" value={`${detail.containers}${detail.inUse ? ' in use' : ' unused'}`} />
            <InfoField label="Platform" value={[detail.os, detail.architecture, detail.variant].filter(Boolean).join('/')} />
            <InfoField label="User" value={detail.user} />
            <InfoField label="Working Dir" value={detail.workingDir} mono />
            <InfoField label="Author" value={detail.author} />
            <InfoField label="Entrypoint" value={detail.entrypoint?.join(' ')} mono />
            <InfoField label="Command" value={detail.command?.join(' ')} mono />
            <InfoField label="Exposed Ports" value={detail.exposedPorts?.join(', ')} mono />
          </div>

          <InfoListSection title="Repo Tags" items={detail.repoTags} />
          <InfoListSection title="Repo Digests" items={repoDigests} mono />
          <InfoListSection title="Environment" items={env} mono />
          <InfoListSection title="Layers" items={layers} mono />

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium text-[#5d5d5d]">Labels</div>
            {labels.length ? (
              <div className="rounded-2xl border border-[rgba(17,17,17,0.08)]">
                {labels.map(([key, value]) => (
                  <div key={key} className="grid gap-1 border-b border-[rgba(17,17,17,0.06)] px-3 py-2 text-sm last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)]">
                    <span className="font-medium text-[#303030]">{key}</span>
                    <span className="break-all text-[#6a6a6a]">{value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[#8b8b8b]">No labels declared.</div>
            )}
          </div>
        </div>
      ) : null}
    </ModalSurface>
  )
}

function InfoField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="rounded-2xl border border-[rgba(17,17,17,0.08)] px-3 py-2">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#8b8b8b]">{label}</div>
      <div className={`mt-1 break-all text-sm text-[#202020] ${mono ? 'font-mono' : ''}`}>{value?.trim() ? value : '-'}</div>
    </div>
  )
}

function InfoListSection({ title, items, mono = false }: { title: string; items: string[]; mono?: boolean }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-[#5d5d5d]">{title}</div>
      {items.length ? (
        <div className="rounded-2xl border border-[rgba(17,17,17,0.08)]">
          {items.map((item) => (
            <div key={item} className={`border-b border-[rgba(17,17,17,0.06)] px-3 py-2 text-sm text-[#202020] last:border-b-0 ${mono ? 'break-all font-mono' : ''}`}>
              {item}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#8b8b8b]">No data available.</div>
      )}
    </div>
  )
}

function ConfirmActionModal({
  title,
  description,
  confirmLabel,
  confirmIcon,
  submitting,
  onCancel,
  onConfirm,
}: {
  title: string
  description: string
  confirmLabel: string
  confirmIcon: typeof Trash2
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <ModalSurface title={title} description={description} onClose={onCancel}>
      <ModalFooter
        confirmLabel={submitting ? 'Working...' : confirmLabel}
        confirmIcon={confirmIcon}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmDisabled={submitting}
      />
    </ModalSurface>
  )
}
