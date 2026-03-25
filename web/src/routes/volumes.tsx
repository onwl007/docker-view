import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { FileText, FolderOpen, HardDrive, Info, Plus, Trash2 } from 'lucide-react'
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
import { useCreateVolumeMutation, useDeleteVolumeMutation } from '@/features/resources/mutations'
import {
  volumeDetailQueryOptions,
  volumeFileContentQueryOptions,
  volumeFilesQueryOptions,
  volumesQueryOptions,
} from '@/features/resources/query-options'
import type {
  VolumeDetail,
  VolumeFileContent,
  VolumeFileEntry,
  VolumeListItem,
} from '@/lib/api/client'
import { formatBytes, formatDateTime, formatRelativeTime } from '@/lib/display'

type PendingVolumeAction =
  | { kind: 'create' }
  | { kind: 'info'; row: VolumeListItem }
  | { kind: 'files'; row: VolumeListItem }
  | { kind: 'delete'; row: VolumeListItem }

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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageToolbar
        title="Volumes"
        description="Browse persisted volume storage and attachments"
        icon={HardDrive}
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

      <PageSection className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
                    <td className="py-2.5">
                      <div className="max-w-[220px] truncate text-[15px] font-semibold text-[#111111]" title={row.name}>
                        {row.name}
                      </div>
                    </td>
                    <td className="py-2.5"><TagBadge>{row.driver}</TagBadge></td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.scope || '-'}</td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{formatBytes(row.sizeBytes)}</td>
                    <td className="py-2.5 text-sm text-[#8b8b8b]">
                      <div className="max-w-[300px] truncate" title={row.mountpoint}>
                        {row.mountpoint}
                      </div>
                    </td>
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
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" disabled={activeMutation} onClick={() => setPendingAction({ kind: 'info', row })}>
                          <Info className="h-3.5 w-3.5" />
                          Info
                        </Button>
                        <Button size="sm" variant="ghost" disabled={activeMutation} onClick={() => setPendingAction({ kind: 'files', row })}>
                          <FolderOpen className="h-3.5 w-3.5" />
                          Files
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

      {pendingAction?.kind === 'info' ? (
        <VolumeInfoModal row={pendingAction.row} onClose={() => setPendingAction(null)} />
      ) : null}

      {pendingAction?.kind === 'files' ? (
        <VolumeFilesModal row={pendingAction.row} onClose={() => setPendingAction(null)} />
      ) : null}
    </div>
  )
}

function VolumeInfoModal({ row, onClose }: { row: VolumeListItem; onClose: () => void }) {
  const detailQuery = useQuery(volumeDetailQueryOptions(row.name))
  const labels = detailQuery.data?.labels ? Object.entries(detailQuery.data.labels).sort(([left], [right]) => left.localeCompare(right)) : []
  const options = detailQuery.data?.options ? Object.entries(detailQuery.data.options).sort(([left], [right]) => left.localeCompare(right)) : []
  const status = detailQuery.data?.status ? Object.entries(detailQuery.data.status).sort(([left], [right]) => left.localeCompare(right)) : []

  return (
    <ModalSurface title="Volume Info" description={`${row.name} inspect details`} onClose={onClose} size="lg">
      {detailQuery.isLoading ? <div className="text-sm text-[#8b8b8b]">Loading volume info...</div> : null}
      {detailQuery.error ? <div className="text-sm text-[#b24b4b]">{detailQuery.error.message}</div> : null}
      {detailQuery.data ? (
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="rounded-[24px] border border-[rgba(44,174,255,0.18)] bg-[linear-gradient(180deg,#f8fbff,#f2f7ff)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#5d94d8]">Volume Summary</div>
            <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div className="min-w-0">
                <div className="truncate text-[22px] font-semibold tracking-[-0.04em] text-[#111111]" title={detailQuery.data.name}>
                  {detailQuery.data.name}
                </div>
                <div className="mt-1 truncate font-mono text-xs text-[#5f6b7a]" title={detailQuery.data.mountpoint}>
                  {detailQuery.data.mountpoint || '-'}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <TagBadge>{detailQuery.data.driver}</TagBadge>
                <TagBadge>{detailQuery.data.scope || 'local'}</TagBadge>
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoField label="Name" value={detailQuery.data.name} truncate />
            <InfoField label="Driver" value={detailQuery.data.driver} />
            <InfoField label="Scope" value={detailQuery.data.scope} />
            <InfoField label="Created" value={formatDateTime(detailQuery.data.createdAt)} />
            <InfoField label="Size" value={formatBytes(detailQuery.data.sizeBytes)} />
            <InfoField label="Mountpoint" value={detailQuery.data.mountpoint} mono truncate />
            <InfoField label="Attached Containers" value={formatAttached(detailQuery.data)} />
          </div>

          <InfoTagSection title="Attached Containers" items={detailQuery.data.attachedContainers ?? []} />
          <InfoKeyValueSection title="Labels" items={labels} />
          <InfoKeyValueSection title="Options" items={options} />
          <InfoKeyValueSection title="Status" items={status.map(([key, value]) => [key, formatUnknown(value)] as [string, string])} />
        </div>
      ) : null}
    </ModalSurface>
  )
}

function VolumeFilesModal({ row, onClose }: { row: VolumeListItem; onClose: () => void }) {
  const [currentPath, setCurrentPath] = useState('')
  const [selectedFile, setSelectedFile] = useState('')
  const listingQuery = useQuery(volumeFilesQueryOptions(row.name, currentPath))
  const fileQuery = useQuery({
    ...volumeFileContentQueryOptions(row.name, selectedFile),
    enabled: Boolean(selectedFile),
  })

  const segments = currentPath ? currentPath.split('/') : []

  function openDirectory(path: string) {
    setCurrentPath(path)
    setSelectedFile('')
  }

  function openFile(path: string) {
    setSelectedFile(path)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(17,17,17,0.42)] p-4">
      <div className="flex max-h-[85vh] w-full max-w-[1080px] flex-col rounded-[18px] bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#111111]">Volume Files</h2>
            <p className="mt-2 text-sm text-[#7f7f7f]">{row.name} directory browser and text preview</p>
          </div>
          <button className="rounded-lg p-1 text-[#8b8b8b]" onClick={onClose} type="button" aria-label="Close files">
            X
          </button>
        </div>

        <div className="mt-6 flex items-center gap-2 overflow-x-auto rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#fafafa] px-3 py-2 text-sm text-[#5f5f5f]">
          <button type="button" className="font-medium text-[#111111]" onClick={() => openDirectory('')}>
            root
          </button>
          {segments.map((segment, index) => {
            const nextPath = segments.slice(0, index + 1).join('/')
            return (
              <div key={nextPath} className="flex items-center gap-2">
                <span className="text-[#b1b1b1]">/</span>
                <button type="button" className="whitespace-nowrap" onClick={() => openDirectory(nextPath)}>
                  {segment}
                </button>
              </div>
            )
          })}
          <div className="ml-auto max-w-[320px] truncate whitespace-nowrap text-xs text-[#8b8b8b]" title={listingQuery.data?.mountpoint ?? row.mountpoint}>
            {listingQuery.data?.mountpoint ?? row.mountpoint}
          </div>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="flex min-h-0 flex-col rounded-2xl border border-[rgba(17,17,17,0.08)]">
            <div className="border-b border-[rgba(17,17,17,0.06)] px-4 py-3 text-sm font-medium text-[#303030]">
              Directory
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {listingQuery.isLoading ? <div className="px-4 py-4 text-sm text-[#8b8b8b]">Loading files...</div> : null}
              {listingQuery.error ? <div className="px-4 py-4 text-sm text-[#b24b4b]">{listingQuery.error.message}</div> : null}
              {listingQuery.data?.parentPath !== undefined && currentPath ? (
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-b border-[rgba(17,17,17,0.06)] px-4 py-3 text-left text-sm text-[#303030] hover:bg-[#fafafa]"
                  onClick={() => openDirectory(listingQuery.data?.parentPath ?? '')}
                >
                  <span>..</span>
                  <span className="text-[#8b8b8b]">Parent</span>
                </button>
              ) : null}
              {listingQuery.data && listingQuery.data.entries.length === 0 ? (
                <div className="px-4 py-4 text-sm text-[#8b8b8b]">This directory is empty.</div>
              ) : null}
              {listingQuery.data?.entries.map((entry) => (
                <VolumeEntryRow
                  key={entry.path}
                  entry={entry}
                  active={selectedFile === entry.path}
                  onOpenDirectory={openDirectory}
                  onOpenFile={openFile}
                />
              ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-col rounded-2xl border border-[rgba(17,17,17,0.08)]">
            <div className="border-b border-[rgba(17,17,17,0.06)] px-4 py-3 text-sm font-medium text-[#303030]">
              File Preview
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {!selectedFile ? <div className="px-4 py-4 text-sm text-[#8b8b8b]">Choose a file to preview its content. Directories can be opened from the left panel.</div> : null}
              {fileQuery.isLoading ? <div className="px-4 py-4 text-sm text-[#8b8b8b]">Loading file preview...</div> : null}
              {fileQuery.error ? <div className="px-4 py-4 text-sm text-[#b24b4b]">{fileQuery.error.message}</div> : null}
              {fileQuery.data ? <VolumeFilePreview content={fileQuery.data} /> : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function VolumeEntryRow({
  entry,
  active,
  onOpenDirectory,
  onOpenFile,
}: {
  entry: VolumeFileEntry
  active: boolean
  onOpenDirectory: (path: string) => void
  onOpenFile: (path: string) => void
}) {
  const isDirectory = entry.type === 'directory'

  return (
    <button
      type="button"
      className={`flex w-full items-center justify-between border-b border-[rgba(17,17,17,0.06)] px-4 py-3 text-left transition hover:bg-[#fafafa] ${active ? 'bg-[#eef6ff]' : ''}`}
      onClick={() => (isDirectory ? onOpenDirectory(entry.path) : onOpenFile(entry.path))}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-sm font-medium text-[#202020]">
          {isDirectory ? <FolderOpen className="h-4 w-4 text-[#3d88ff]" /> : <FileText className="h-4 w-4 text-[#8b8b8b]" />}
          <span className="truncate">{entry.name}</span>
        </div>
        <div className="mt-1 text-xs text-[#8b8b8b]">{isDirectory ? 'Directory' : formatBytes(entry.sizeBytes)}</div>
      </div>
      <div className="text-xs text-[#8b8b8b]">{formatRelativeTime(entry.modifiedAt)}</div>
    </button>
  )
}

function VolumeFilePreview({ content }: { content: VolumeFileContent }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="grid gap-3 border-b border-[rgba(17,17,17,0.06)] px-4 py-4 md:grid-cols-3">
        <InfoField label="File" value={content.name} />
        <InfoField label="Path" value={content.path} mono />
        <InfoField label="Size" value={`${formatBytes(content.sizeBytes)}${content.truncated ? ' preview truncated' : ''}`} />
      </div>
      <pre className="min-h-0 flex-1 overflow-auto px-4 py-4 font-mono text-[13px] leading-6 text-[#202020]">{content.content}</pre>
    </div>
  )
}

function InfoField({
  label,
  value,
  mono = false,
  truncate = false,
}: {
  label: string
  value?: string | null
  mono?: boolean
  truncate?: boolean
}) {
  const resolvedValue = value?.trim() ? value : '-'

  return (
    <div className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#fcfcfc] px-3 py-2.5">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#8b8b8b]">{label}</div>
      <div
        className={`${truncate ? 'truncate' : 'break-all'} mt-1 text-sm text-[#202020] ${mono ? 'font-mono text-[13px]' : ''}`}
        title={resolvedValue}
      >
        {resolvedValue}
      </div>
    </div>
  )
}

function InfoKeyValueSection({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-[#5d5d5d]">{title}</div>
      {items.length ? (
        <div className="rounded-2xl border border-[rgba(17,17,17,0.08)]">
          {items.map(([key, value]) => (
            <div key={key} className="grid gap-1 border-b border-[rgba(17,17,17,0.06)] px-3 py-2 text-sm last:border-b-0 md:grid-cols-[180px_minmax(0,1fr)]">
              <span className="font-medium text-[#303030]">{key}</span>
              <span className="break-all text-[#6a6a6a]">{value}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#8b8b8b]">No data available.</div>
      )}
    </div>
  )
}

function InfoTagSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-[#5d5d5d]">{title}</div>
      {items.length ? (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <TagBadge key={item}>{item}</TagBadge>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#8b8b8b]">No data available.</div>
      )}
    </div>
  )
}

function formatAttached(detail: VolumeDetail) {
  const count = detail.attachedContainers?.length ?? 0
  if (count === 0) {
    return '0'
  }
  if (count === 1) {
    return '1 container'
  }
  return `${count} containers`
}

function formatUnknown(value: unknown) {
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}
