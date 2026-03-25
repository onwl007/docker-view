import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Box, Pause, Play, RefreshCw, Terminal, TextSearch, Trash2 } from 'lucide-react'
import {
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
import { Button } from '@/components/ui/button'
import {
  useDeleteContainerMutation,
  useRestartContainerMutation,
  useStartContainerMutation,
  useStopContainerMutation,
} from '@/features/resources/mutations'
import { containersQueryOptions } from '@/features/resources/query-options'
import type { ContainerListItem } from '@/lib/api/client'
import { formatRelativeTime, normalizeContainerState } from '@/lib/display'

type ActionKind = 'start' | 'stop' | 'restart' | 'delete'

interface PendingAction {
  kind: ActionKind
  row: ContainerListItem
}

export function ContainersPage() {
  const search = useSearch({ from: '/containers' })
  const navigate = useNavigate({ from: '/containers' })
  const [page, setPage] = useState(1)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const pageSize = 6
  const query = useQuery(containersQueryOptions({ q: search.q, all: true }))
  const startMutation = useStartContainerMutation()
  const stopMutation = useStopContainerMutation()
  const restartMutation = useRestartContainerMutation()
  const deleteMutation = useDeleteContainerMutation()

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const running = items.filter((item) => normalizeContainerState(item.state) === 'running').length
  const stopped = items.filter((item) => normalizeContainerState(item.state) === 'stopped').length
  const activeMutation = startMutation.isPending || stopMutation.isPending || restartMutation.isPending || deleteMutation.isPending

  const isBusyForRow = useMemo(() => {
    if (!pendingAction) {
      return ''
    }

    return pendingAction.row.id
  }, [pendingAction])

  async function confirmAction() {
    if (!pendingAction) {
      return
    }

    setFeedback(null)

    try {
      switch (pendingAction.kind) {
        case 'start':
          await startMutation.mutateAsync(pendingAction.row.id)
          setFeedback({ tone: 'success', message: `Started ${pendingAction.row.name}.` })
          break
        case 'stop':
          await stopMutation.mutateAsync({ id: pendingAction.row.id })
          setFeedback({ tone: 'success', message: `Stopped ${pendingAction.row.name}.` })
          break
        case 'restart':
          await restartMutation.mutateAsync({ id: pendingAction.row.id })
          setFeedback({ tone: 'success', message: `Restarted ${pendingAction.row.name}.` })
          break
        case 'delete':
          await deleteMutation.mutateAsync({ id: pendingAction.row.id, force: true })
          setFeedback({ tone: 'success', message: `Deleted ${pendingAction.row.name}.` })
          break
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
        title="Containers"
        description="Browse containers, runtime state and attached resources"
        icon={Box}
      />

      {feedback ? (
        <PageSection
          className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}
        >
          {feedback.message}
        </PageSection>
      ) : null}

      <OverviewGrid>
        <MetricCard label="Total Containers" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Running" value={String(running)} accent="green" />
        <MetricCard label="Stopped" value={String(stopped)} />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row) => (
                  <ContainerTableRow
                    key={row.id}
                    row={row}
                    busy={activeMutation && isBusyForRow === row.id}
                    onAction={(kind) => setPendingAction({ kind, row })}
                    onOpenLogs={() => void navigate({ to: '/containers/$containerId/logs', params: { containerId: row.id } })}
                    onOpenTerminal={() => void navigate({ to: '/containers/$containerId/terminal', params: { containerId: row.id } })}
                  />
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

      {pendingAction ? (
        <ConfirmContainerActionModal
          action={pendingAction}
          submitting={activeMutation}
          onCancel={() => setPendingAction(null)}
          onConfirm={() => void confirmAction()}
        />
      ) : null}
    </div>
  )
}

export function ContainerTableRow({
  row,
  onAction,
  onOpenLogs,
  onOpenTerminal,
  busy,
}: {
  row: ContainerListItem
  onAction: (kind: ActionKind) => void
  onOpenLogs: () => void
  onOpenTerminal: () => void
  busy?: boolean
}) {
  const state = normalizeContainerState(row.state)

  return (
    <tr className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
      <td className="py-2.5">
        <div className="text-[15px] font-semibold text-[#111111]">{row.name}</div>
        <div className="text-sm text-[#8b8b8b]">{row.shortId}</div>
      </td>
      <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.image}</td>
      <td className="py-2.5">
        <div className="space-y-2">
          <StatusBadge status={state} />
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
      <td className="py-2.5">
        <div className="flex flex-wrap gap-2">
          {state === 'running' ? (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction('stop')}>
              <Pause className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => onAction('start')}>
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('restart')}>
            <RefreshCw className="h-3.5 w-3.5" />
            Restart
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onOpenLogs}>
            <TextSearch className="h-3.5 w-3.5" />
            Logs
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={onOpenTerminal}>
            <Terminal className="h-3.5 w-3.5" />
            Terminal
          </Button>
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => onAction('delete')} className="text-[#b24b4b] hover:text-[#b24b4b]">
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </td>
    </tr>
  )
}

function ConfirmContainerActionModal({
  action,
  submitting,
  onCancel,
  onConfirm,
}: {
  action: PendingAction
  submitting: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const copy = {
    start: {
      title: 'Start Container',
      description: `Start ${action.row.name} and refresh the related summaries.`,
      confirmLabel: 'Start',
      confirmIcon: Play,
    },
    stop: {
      title: 'Stop Container',
      description: `Stop ${action.row.name}. This affects live traffic and active workloads.`,
      confirmLabel: 'Stop',
      confirmIcon: Pause,
    },
    restart: {
      title: 'Restart Container',
      description: `Restart ${action.row.name}. Existing connections may be interrupted.`,
      confirmLabel: 'Restart',
      confirmIcon: RefreshCw,
    },
    delete: {
      title: 'Delete Container',
      description: `Delete ${action.row.name}. This request uses force removal in the current phase.`,
      confirmLabel: 'Delete',
      confirmIcon: Trash2,
    },
  }[action.kind]

  return (
    <ModalSurface title={copy.title} description={copy.description} onClose={onCancel}>
      <div className="space-y-3 rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#fafafa] px-4 py-3 text-sm text-[#5f5f5f]">
        <div>
          <span className="font-medium text-[#111111]">Container:</span> {action.row.name}
        </div>
        <div>
          <span className="font-medium text-[#111111]">Image:</span> {action.row.image}
        </div>
        <div>
          <span className="font-medium text-[#111111]">Current state:</span> {action.row.status}
        </div>
      </div>
      <ModalFooter
        confirmLabel={submitting ? 'Working...' : copy.confirmLabel}
        confirmIcon={copy.confirmIcon}
        onCancel={onCancel}
        onConfirm={onConfirm}
        confirmDisabled={submitting}
      />
    </ModalSurface>
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
