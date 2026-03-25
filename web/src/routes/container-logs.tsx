import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from '@tanstack/react-router'
import { ArrowLeft, RefreshCw, TextSearch } from 'lucide-react'
import {
  PageSection,
  PageToolbar,
  SectionHeading,
} from '@/components/app/docker-view-ui'
import { Button } from '@/components/ui/button'
import {
  buildApiUrl,
  fetchContainerLogs,
  type ContainerLogEntry,
} from '@/lib/api/client'
import { formatRelativeTime } from '@/lib/display'
import { buildLiveLogsStreamPath } from '@/features/resources/log-stream'

const LOG_TAIL = '200'

export function ContainerLogsPage() {
  const { containerId } = useParams({ from: '/containers/$containerId/logs' })
  return <ContainerLogsView key={containerId} containerId={containerId} />
}

function ContainerLogsView({ containerId }: { containerId: string }) {
  const navigate = useNavigate()
  const [streamState, setStreamState] = useState<{
    key: string
    entries: ContainerLogEntry[]
    status: 'connecting' | 'ready' | 'closed' | 'error'
    error: string
  }>({
    key: '',
    entries: [],
    status: 'connecting',
    error: '',
  })

  const logsQuery = useQuery({
    queryKey: ['containers', containerId, 'logs', { tail: LOG_TAIL }],
    queryFn: () => fetchContainerLogs(containerId, { tail: LOG_TAIL, timestamps: true }),
  })

  const latestTimestamp = useMemo(() => {
    const items = logsQuery.data?.items ?? []
    for (let index = items.length - 1; index >= 0; index -= 1) {
      const timestamp = items[index]?.timestamp
      if (timestamp) {
        return timestamp
      }
    }
    return undefined
  }, [logsQuery.data?.items])

  const streamKey = `${containerId}:${latestTimestamp ?? 'origin'}`
  const activeStreamState = streamState.key === streamKey
    ? streamState
    : {
        key: streamKey,
        entries: [],
        status: 'connecting' as const,
        error: '',
      }

  useEffect(() => {
    if (!logsQuery.data || logsQuery.error) {
      return
    }

    const source = new EventSource(
      buildApiUrl(buildLiveLogsStreamPath(containerId, latestTimestamp)),
    )

    source.addEventListener('log', (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as ContainerLogEntry
      setStreamState((current) => ({
        key: streamKey,
        entries: current.key === streamKey ? [...current.entries, payload] : [payload],
        status: 'ready',
        error: '',
      }))
    })

    source.addEventListener('error', (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { message?: string }
      setStreamState((current) => ({
        key: current.key === streamKey ? current.key : streamKey,
        entries: current.key === streamKey ? current.entries : [],
        status: 'error',
        error: payload.message ?? 'Log stream failed.',
      }))
      source.close()
    })

    source.addEventListener('eof', () => {
      setStreamState((current) => ({
        key: current.key === streamKey ? current.key : streamKey,
        entries: current.key === streamKey ? current.entries : [],
        status: 'closed',
        error: '',
      }))
      source.close()
    })

    source.onerror = () => {
      setStreamState((current) => ({
        key: current.key === streamKey ? current.key : streamKey,
        entries: current.key === streamKey ? current.entries : [],
        status: 'error',
        error: 'Log stream disconnected.',
      }))
      source.close()
    }

    return () => {
      source.close()
    }
  }, [containerId, latestTimestamp, logsQuery.data, logsQuery.error, streamKey])

  const entries = useMemo(() => {
    const initial = logsQuery.data?.items ?? []
    return [...initial, ...activeStreamState.entries]
  }, [activeStreamState.entries, logsQuery.data?.items])

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Container Logs"
        description={`Historical logs and live stream for ${containerId}`}
        icon={TextSearch}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={() => void navigate({ to: '/containers' })}>
              <ArrowLeft className="h-4 w-4" />
              Back to Containers
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void logsQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </>
        }
      />

      {activeStreamState.error ? (
        <PageSection className="px-4 py-3 text-sm text-[#b24b4b]">{activeStreamState.error}</PageSection>
      ) : null}

      <PageSection className="flex flex-col">
        <SectionHeading
          icon={TextSearch}
          title="Log Output"
          description={`Stream status: ${activeStreamState.status}`}
        />
        <div className="space-y-3 px-4 py-4">
          {logsQuery.isLoading ? <div className="text-sm text-[#8b8b8b]">Loading container logs...</div> : null}
          {logsQuery.error ? <div className="text-sm text-[#b24b4b]">{logsQuery.error.message}</div> : null}
          {!logsQuery.isLoading && !logsQuery.error && entries.length === 0 ? (
            <div className="text-sm text-[#8b8b8b]">No log output was returned.</div>
          ) : null}

          {entries.length > 0 ? (
            <div className="max-h-[640px] overflow-auto rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#0d1117] p-4 font-mono text-sm text-[#d7e3f4]">
              {entries.map((entry, index) => (
                <div key={`${entry.timestamp ?? 'no-ts'}-${entry.stream}-${index}`} className="whitespace-pre-wrap break-words py-1">
                  <span className={entry.stream === 'stderr' ? 'text-[#ff8d8d]' : 'text-[#7ee7c3]'}>
                    [{entry.stream}]
                  </span>{' '}
                  <span className="text-[#7c8aa5]">
                    {entry.timestamp ? formatRelativeTime(entry.timestamp) : '-'}
                  </span>{' '}
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </PageSection>
    </div>
  )
}
