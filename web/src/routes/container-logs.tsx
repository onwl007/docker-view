import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from '@tanstack/react-router'
import { RefreshCw, TextSearch } from 'lucide-react'
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

const LOG_TAIL = '200'

export function ContainerLogsPage() {
  const { containerId } = useParams({ from: '/containers/$containerId/logs' })
  return <ContainerLogsView key={containerId} containerId={containerId} />
}

function ContainerLogsView({ containerId }: { containerId: string }) {
  const [liveEntries, setLiveEntries] = useState<ContainerLogEntry[]>([])
  const [streamStatus, setStreamStatus] = useState<'connecting' | 'ready' | 'closed' | 'error'>('connecting')
  const [streamError, setStreamError] = useState('')

  const logsQuery = useQuery({
    queryKey: ['containers', containerId, 'logs', { tail: LOG_TAIL }],
    queryFn: () => fetchContainerLogs(containerId, { tail: LOG_TAIL, timestamps: true }),
  })

  useEffect(() => {
    const source = new EventSource(
      buildApiUrl(`/api/v1/containers/${containerId}/logs/stream?tail=${LOG_TAIL}&timestamps=true`),
    )

    source.addEventListener('log', (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as ContainerLogEntry
      setLiveEntries((current) => [...current, payload])
      setStreamStatus('ready')
    })

    source.addEventListener('error', (event) => {
      const payload = JSON.parse((event as MessageEvent<string>).data) as { message?: string }
      setStreamStatus('error')
      setStreamError(payload.message ?? 'Log stream failed.')
      source.close()
    })

    source.addEventListener('eof', () => {
      setStreamStatus('closed')
      source.close()
    })

    source.onerror = () => {
      setStreamStatus('error')
      setStreamError('Log stream disconnected.')
      source.close()
    }

    return () => {
      source.close()
    }
  }, [containerId])

  const entries = useMemo(() => {
    const initial = logsQuery.data?.items ?? []
    return [...initial, ...liveEntries]
  }, [liveEntries, logsQuery.data?.items])

  return (
    <div className="space-y-3">
      <PageToolbar
        title="Container Logs"
        description={`Historical logs and live stream for ${containerId}`}
        actions={
          <Button size="sm" variant="secondary" onClick={() => void logsQuery.refetch()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />

      {streamError ? (
        <PageSection className="px-4 py-3 text-sm text-[#b24b4b]">{streamError}</PageSection>
      ) : null}

      <PageSection className="flex flex-col">
        <SectionHeading
          icon={TextSearch}
          title="Log Output"
          description={`Stream status: ${streamStatus}`}
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
