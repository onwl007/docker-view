import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Layers3, Pause, Play, RefreshCw, Trash2 } from 'lucide-react'
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
  TableViewport,
  TagBadge,
} from '@/components/app/docker-view-ui'
import { Button } from '@/components/ui/button'
import {
  useDeleteComposeProjectMutation,
  useRecreateComposeProjectMutation,
  useStartComposeProjectMutation,
  useStopComposeProjectMutation,
} from '@/features/compose/mutations'
import { composeProjectsQueryOptions } from '@/features/compose/query-options'
import type { ComposeProjectListItem } from '@/lib/api/client'
import { formatRelativeTime } from '@/lib/display'

type ComposeActionKind = 'start' | 'stop' | 'recreate' | 'delete'

interface PendingComposeAction {
  kind: ComposeActionKind
  row: ComposeProjectListItem
}

export function ComposeProjectsPage() {
  const search = useSearch({ from: '/compose' })
  const navigate = useNavigate({ from: '/compose' })
  const [page, setPage] = useState(1)
  const [pendingAction, setPendingAction] = useState<PendingComposeAction | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const pageSize = 6
  const query = useQuery(composeProjectsQueryOptions(search.q))
  const startMutation = useStartComposeProjectMutation()
  const stopMutation = useStopComposeProjectMutation()
  const recreateMutation = useRecreateComposeProjectMutation()
  const deleteMutation = useDeleteComposeProjectMutation()

  const items = query.data?.items ?? []
  const pagedItems = items.slice((page - 1) * pageSize, page * pageSize)
  const runningProjects = items.filter((item) => item.status === 'running').length
  const activeMutation =
    startMutation.isPending ||
    stopMutation.isPending ||
    recreateMutation.isPending ||
    deleteMutation.isPending

  const busyProjectName = useMemo(() => pendingAction?.row.name ?? '', [pendingAction])

  async function confirmAction() {
    if (!pendingAction) {
      return
    }

    setFeedback(null)

    try {
      switch (pendingAction.kind) {
        case 'start':
          await startMutation.mutateAsync(pendingAction.row.name)
          setFeedback({ tone: 'success', message: `Started compose project ${pendingAction.row.name}.` })
          break
        case 'stop':
          await stopMutation.mutateAsync(pendingAction.row.name)
          setFeedback({ tone: 'success', message: `Stopped compose project ${pendingAction.row.name}.` })
          break
        case 'recreate':
          await recreateMutation.mutateAsync(pendingAction.row.name)
          setFeedback({ tone: 'success', message: `Recreated compose project ${pendingAction.row.name}.` })
          break
        case 'delete':
          await deleteMutation.mutateAsync(pendingAction.row.name)
          setFeedback({ tone: 'success', message: `Deleted compose project ${pendingAction.row.name}.` })
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
    <div className="space-y-3">
      <PageToolbar
        title="Compose"
        description="Browse Compose projects grouped from managed containers, networks and volumes"
      />

      {feedback ? (
        <PageSection className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}>
          {feedback.message}
        </PageSection>
      ) : null}

      <OverviewGrid>
        <MetricCard label="Projects" value={String(query.data?.total ?? 0)} />
        <MetricCard label="Running" value={String(runningProjects)} accent="green" />
        <MetricCard label="Inactive" value={String(items.filter((item) => item.status === 'inactive').length)} accent="amber" />
        <MetricCard label="Search Query" value={search.q || 'All'} accent="blue" />
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading
          icon={Layers3}
          title="Compose Projects"
          actions={
            <SearchToolbar
              placeholder="Search compose projects..."
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
            <div className="px-5 py-6 text-sm text-[#8b8b8b]">No compose projects matched the current filter.</div>
          ) : null}
          {pagedItems.length > 0 ? (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Project</th>
                  <th className="py-3 font-medium">State</th>
                  <th className="py-3 font-medium">Services</th>
                  <th className="py-3 font-medium">Containers</th>
                  <th className="py-3 font-medium">Networks</th>
                  <th className="py-3 font-medium">Volumes</th>
                  <th className="py-3 font-medium">Created</th>
                  <th className="py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pagedItems.map((row) => (
                  <tr key={row.name} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5">
                      <button
                        className="text-left"
                        type="button"
                        onClick={() => void navigate({ to: '/compose/$projectName', params: { projectName: row.name } })}
                      >
                        <div className="text-[15px] font-semibold text-[#111111]">{row.name}</div>
                        <div className="text-sm text-[#8b8b8b]">{row.runningCount}/{row.containerCount} containers running</div>
                      </button>
                    </td>
                    <td className="py-2.5"><ComposeStateBadge status={row.status} /></td>
                    <td className="py-2.5"><TagList items={row.services} fallback="-" /></td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{row.containerCount}</td>
                    <td className="py-2.5"><TagList items={row.networks} fallback="-" /></td>
                    <td className="py-2.5"><TagList items={row.volumes} fallback="-" /></td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">{formatRelativeTime(row.createdAt)}</td>
                    <td className="py-2.5">
                      <div className="flex flex-wrap gap-2">
                        {row.status === 'running' ? (
                          <Button size="sm" variant="secondary" disabled={activeMutation && busyProjectName === row.name} onClick={() => setPendingAction({ kind: 'stop', row })}>
                            <Pause className="h-3.5 w-3.5" />
                            Stop
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" disabled={activeMutation && busyProjectName === row.name} onClick={() => setPendingAction({ kind: 'start', row })}>
                            <Play className="h-3.5 w-3.5" />
                            Start
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={activeMutation && busyProjectName === row.name} onClick={() => setPendingAction({ kind: 'recreate', row })}>
                          <RefreshCw className="h-3.5 w-3.5" />
                          Recreate
                        </Button>
                        <Button size="sm" variant="ghost" className="text-[#b24b4b] hover:text-[#b24b4b]" disabled={activeMutation && busyProjectName === row.name} onClick={() => setPendingAction({ kind: 'delete', row })}>
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

      {pendingAction ? (
        <ModalSurface
          title={`${composeActionLabel(pendingAction.kind)} Compose Project`}
          description={composeActionDescription(pendingAction)}
          onClose={() => setPendingAction(null)}
        >
          <ModalFooter
            confirmLabel={activeMutation ? 'Working...' : composeActionLabel(pendingAction.kind)}
            confirmIcon={pendingAction.kind === 'delete' ? Trash2 : pendingAction.kind === 'recreate' ? RefreshCw : pendingAction.kind === 'stop' ? Pause : Play}
            onCancel={() => setPendingAction(null)}
            onConfirm={() => void confirmAction()}
            confirmDisabled={activeMutation}
          />
        </ModalSurface>
      ) : null}
    </div>
  )
}

function composeActionLabel(kind: ComposeActionKind) {
  switch (kind) {
    case 'start':
      return 'Start'
    case 'stop':
      return 'Stop'
    case 'recreate':
      return 'Recreate'
    case 'delete':
      return 'Delete'
  }
}

function composeActionDescription(action: PendingComposeAction) {
  switch (action.kind) {
    case 'start':
      return `Start all stopped containers in ${action.row.name}.`
    case 'stop':
      return `Stop all running containers in ${action.row.name}.`
    case 'recreate':
      return `Restart all managed containers in ${action.row.name}. This first-pass recreate flow does not rebuild from compose files.`
    case 'delete':
      return `Remove managed containers and project networks for ${action.row.name}. Volumes are preserved.`
  }
}

function ComposeStateBadge({
  status,
}: {
  status: ComposeProjectListItem['status']
}) {
  const className =
    status === 'running'
      ? 'border-[#d8f4e9] bg-[#effcf6] text-[#15795d]'
      : status === 'partial'
        ? 'border-[#ffe4b8] bg-[#fff7ea] text-[#b56b00]'
        : status === 'inactive'
          ? 'border-[#f0e1e1] bg-[#fdf4f4] text-[#b24b4b]'
          : 'border-[rgba(17,17,17,0.08)] bg-[#f6f6f6] text-[#555555]'

  return (
    <span className={`inline-flex h-7 items-center rounded-full border px-3 text-sm font-medium ${className}`}>
      {status}
    </span>
  )
}

function TagList({
  items,
  fallback,
}: {
  items: string[]
  fallback: string
}) {
  if (!items.length) {
    return <span className="text-[#8b8b8b]">{fallback}</span>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((item) => (
        <TagBadge key={item}>{item}</TagBadge>
      ))}
    </div>
  )
}
