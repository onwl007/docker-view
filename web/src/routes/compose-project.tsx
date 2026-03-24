import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, Layers3, Pause, Play, RefreshCw, Trash2 } from 'lucide-react'
import {
  MetricCard,
  ModalFooter,
  ModalSurface,
  OverviewGrid,
  PageSection,
  PageToolbar,
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
import { composeProjectDetailQueryOptions } from '@/features/compose/query-options'
import type { ComposeProjectDetail } from '@/lib/api/client'
import { formatRelativeTime } from '@/lib/display'

type ComposeActionKind = 'start' | 'stop' | 'recreate' | 'delete'

export function ComposeProjectDetailPage() {
  const { projectName } = useParams({ from: '/compose/$projectName' })
  const navigate = useNavigate()
  const [pendingAction, setPendingAction] = useState<ComposeActionKind | null>(null)
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null)
  const query = useQuery(composeProjectDetailQueryOptions(projectName))
  const startMutation = useStartComposeProjectMutation()
  const stopMutation = useStopComposeProjectMutation()
  const recreateMutation = useRecreateComposeProjectMutation()
  const deleteMutation = useDeleteComposeProjectMutation()
  const activeMutation =
    startMutation.isPending ||
    stopMutation.isPending ||
    recreateMutation.isPending ||
    deleteMutation.isPending

  async function confirmAction() {
    if (!pendingAction) {
      return
    }

    setFeedback(null)

    try {
      if (pendingAction === 'start') {
        await startMutation.mutateAsync(projectName)
        setFeedback({ tone: 'success', message: `Started compose project ${projectName}.` })
      }
      if (pendingAction === 'stop') {
        await stopMutation.mutateAsync(projectName)
        setFeedback({ tone: 'success', message: `Stopped compose project ${projectName}.` })
      }
      if (pendingAction === 'recreate') {
        await recreateMutation.mutateAsync(projectName)
        setFeedback({ tone: 'success', message: `Recreated compose project ${projectName}.` })
      }
      if (pendingAction === 'delete') {
        await deleteMutation.mutateAsync(projectName)
        setFeedback({ tone: 'success', message: `Deleted compose project ${projectName}.` })
        void navigate({ to: '/compose' })
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
        title={projectName}
        description="Compose project detail, managed services and runtime state"
        actions={
          <Button variant="ghost" size="sm" onClick={() => void navigate({ to: '/compose' })}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </Button>
        }
      />

      {feedback ? (
        <PageSection className={feedback.tone === 'error' ? 'px-4 py-3 text-sm text-[#b24b4b]' : 'px-4 py-3 text-sm text-[#15795d]'}>
          {feedback.message}
        </PageSection>
      ) : null}

      {query.isLoading ? <PageSection className="px-5 py-6 text-sm text-[#8b8b8b]">Loading compose project...</PageSection> : null}
      {query.error ? <PageSection className="px-5 py-6 text-sm text-[#b24b4b]">{query.error.message}</PageSection> : null}
      {query.data ? <ComposeProjectDetailContent project={query.data} onAction={setPendingAction} /> : null}

      {pendingAction && query.data ? (
        <ModalSurface
          title={`${pendingAction[0].toUpperCase()}${pendingAction.slice(1)} Compose Project`}
          description={composeDetailActionDescription(query.data, pendingAction)}
          onClose={() => setPendingAction(null)}
        >
          <ModalFooter
            confirmLabel={activeMutation ? 'Working...' : `${pendingAction[0].toUpperCase()}${pendingAction.slice(1)}`}
            confirmIcon={pendingAction === 'delete' ? Trash2 : pendingAction === 'recreate' ? RefreshCw : pendingAction === 'stop' ? Pause : Play}
            onCancel={() => setPendingAction(null)}
            onConfirm={() => void confirmAction()}
            confirmDisabled={activeMutation}
          />
        </ModalSurface>
      ) : null}
    </div>
  )
}

function ComposeProjectDetailContent({
  project,
  onAction,
}: {
  project: ComposeProjectDetail
  onAction: (kind: ComposeActionKind) => void
}) {
  return (
    <>
      <OverviewGrid>
        <MetricCard label="Project State" value={project.status} accent={project.status === 'running' ? 'green' : project.status === 'partial' ? 'amber' : 'default'} />
        <MetricCard label="Containers" value={String(project.containerCount)} detail={`${project.runningCount} running / ${project.stoppedCount} stopped`} />
        <MetricCard label="Services" value={String(project.services.length)} />
        <MetricCard label="Created" value={formatRelativeTime(project.createdAt)} accent="blue" />
      </OverviewGrid>

      <PageSection className="p-4">
        <div className="flex flex-wrap gap-2">
          {project.status === 'running' ? (
            <Button size="sm" variant="secondary" onClick={() => onAction('stop')}>
              <Pause className="h-3.5 w-3.5" />
              Stop
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => onAction('start')}>
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => onAction('recreate')}>
            <RefreshCw className="h-3.5 w-3.5" />
            Recreate
          </Button>
          <Button size="sm" variant="ghost" className="text-[#b24b4b] hover:text-[#b24b4b]" onClick={() => onAction('delete')}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </div>
      </PageSection>

      <OverviewGrid>
        <PageSection className="p-4">
          <div className="text-sm font-medium text-[#5d5d5d]">Services</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.services.length ? project.services.map((item) => <TagBadge key={item}>{item}</TagBadge>) : <span className="text-sm text-[#8b8b8b]">No services discovered.</span>}
          </div>
        </PageSection>
        <PageSection className="p-4">
          <div className="text-sm font-medium text-[#5d5d5d]">Networks</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.networks.length ? project.networks.map((item) => <TagBadge key={item}>{item}</TagBadge>) : <span className="text-sm text-[#8b8b8b]">No networks discovered.</span>}
          </div>
        </PageSection>
        <PageSection className="p-4">
          <div className="text-sm font-medium text-[#5d5d5d]">Volumes</div>
          <div className="mt-3 flex flex-wrap gap-2">
            {project.volumes.length ? project.volumes.map((item) => <TagBadge key={item}>{item}</TagBadge>) : <span className="text-sm text-[#8b8b8b]">No volumes discovered.</span>}
          </div>
        </PageSection>
      </OverviewGrid>

      <PageSection className="relative flex flex-col">
        <SectionHeading icon={Layers3} title="Managed Containers" description="Containers currently associated with this Compose project" />
        <TableViewport>
          {project.containers.length === 0 ? (
            <div className="px-5 py-6 text-sm text-[#8b8b8b]">No managed containers were found for this project.</div>
          ) : (
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-[rgba(17,17,17,0.06)] text-sm text-[#303030]">
                  <th className="py-3 font-medium">Container</th>
                  <th className="py-3 font-medium">Service</th>
                  <th className="py-3 font-medium">Image</th>
                  <th className="py-3 font-medium">State</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {project.containers.map((container) => (
                  <tr key={container.id} className="border-b border-[rgba(17,17,17,0.06)] last:border-b-0">
                    <td className="py-2.5">
                      <div className="text-[15px] font-semibold text-[#111111]">{container.name}</div>
                      <div className="text-sm text-[#8b8b8b]">{container.shortId}</div>
                    </td>
                    <td className="py-2.5">{container.service ? <TagBadge>{container.service}</TagBadge> : <span className="text-[#8b8b8b]">-</span>}</td>
                    <td className="py-2.5 text-[15px] text-[#2f2f2f]">{container.image}</td>
                    <td className="py-2.5"><TagBadge>{container.state}</TagBadge></td>
                    <td className="py-2.5 text-sm text-[#6a6a6a]">{container.status}</td>
                    <td className="py-2.5 text-[15px] text-[#6a6a6a]">{formatRelativeTime(container.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </TableViewport>
      </PageSection>
    </>
  )
}

function composeDetailActionDescription(
  project: ComposeProjectDetail,
  action: ComposeActionKind,
) {
  if (action === 'start') {
    return `Start all stopped containers in ${project.name}.`
  }
  if (action === 'stop') {
    return `Stop all running containers in ${project.name}.`
  }
  if (action === 'recreate') {
    return `Restart all managed containers in ${project.name}. This first-pass recreate flow does not rebuild from compose files.`
  }
  return `Remove managed containers and project networks for ${project.name}. Volumes are preserved.`
}
