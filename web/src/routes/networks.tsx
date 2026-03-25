import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import { Info, Network, Plus, Trash2 } from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCreateNetworkMutation, useDeleteNetworkMutation } from '@/features/resources/mutations'
import { networkDetailQueryOptions, networksQueryOptions } from '@/features/resources/query-options'
import type { NetworkDetail, NetworkListItem } from '@/lib/api/client'
import { formatDateTime, formatRelativeTime } from '@/lib/display'

type PendingNetworkAction =
  | { kind: 'create' }
  | { kind: 'info'; row: NetworkListItem }
  | { kind: 'delete'; row: NetworkListItem }

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
    <div className="flex h-full min-h-0 flex-col gap-3">
      <PageToolbar
        title="Networks"
        description="Browse Docker networks and attached containers"
        icon={Network}
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

      <PageSection className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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

      {pendingAction?.kind === 'info' ? (
        <NetworkInfoModal row={pendingAction.row} onClose={() => setPendingAction(null)} />
      ) : null}
    </div>
  )
}

function NetworkInfoModal({ row, onClose }: { row: NetworkListItem; onClose: () => void }) {
  const detailQuery = useQuery(networkDetailQueryOptions(row.id))
  const labels = detailQuery.data?.labels ? Object.entries(detailQuery.data.labels).sort(([left], [right]) => left.localeCompare(right)) : []
  const options = detailQuery.data?.options ? Object.entries(detailQuery.data.options).sort(([left], [right]) => left.localeCompare(right)) : []
  const ipamOptions = detailQuery.data?.ipamOptions ? Object.entries(detailQuery.data.ipamOptions).sort(([left], [right]) => left.localeCompare(right)) : []

  return (
    <ModalSurface title="Network Info" description={`${row.name} inspect details`} onClose={onClose} size="lg">
      {detailQuery.isLoading ? <div className="text-sm text-[#8b8b8b]">Loading network info...</div> : null}
      {detailQuery.error ? <div className="text-sm text-[#b24b4b]">{detailQuery.error.message}</div> : null}
      {detailQuery.data ? (
        <div className="flex max-h-[72vh] flex-col gap-4 overflow-y-auto pr-1">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            <InfoField label="Name" value={detailQuery.data.name} />
            <InfoField label="Network ID" value={detailQuery.data.id} mono />
            <InfoField label="Short ID" value={detailQuery.data.shortId} mono />
            <InfoField label="Driver" value={detailQuery.data.driver} />
            <InfoField label="Scope" value={detailQuery.data.scope} />
            <InfoField label="Created" value={formatDateTime(detailQuery.data.createdAt)} />
            <InfoField label="Subnet" value={detailQuery.data.subnet} mono />
            <InfoField label="Gateway" value={detailQuery.data.gateway} mono />
            <InfoField label="IPAM Driver" value={detailQuery.data.ipamDriver} />
            <InfoField label="Access" value={detailQuery.data.internal ? 'Internal' : 'External'} />
          </div>

          <div className="grid gap-3 md:grid-cols-4">
            <ToggleInfo label="Attachable" enabled={detailQuery.data.attachable} />
            <ToggleInfo label="Ingress" enabled={detailQuery.data.ingress} />
            <ToggleInfo label="IPv4" enabled={detailQuery.data.enableIPv4} />
            <ToggleInfo label="IPv6" enabled={detailQuery.data.enableIPv6} />
          </div>

          <InfoTagSection title="Attached Containers" items={detailQuery.data.containerNames ?? []} />
          <NetworkIpamSection detail={detailQuery.data} />
          <InfoKeyValueSection title="Labels" items={labels} />
          <InfoKeyValueSection title="Driver Options" items={options} />
          <InfoKeyValueSection title="IPAM Options" items={ipamOptions} />
          <NetworkContainersSection detail={detailQuery.data} />
        </div>
      ) : null}
    </ModalSurface>
  )
}

function InfoField({ label, value, mono = false }: { label: string; value?: string | null; mono?: boolean }) {
  const resolvedValue = value?.trim() ? value : '-'

  return (
    <div className="rounded-2xl border border-[rgba(17,17,17,0.08)] bg-[#fcfcfc] px-3 py-2.5">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#8b8b8b]">{label}</div>
      <div className={`mt-1 break-all text-sm text-[#202020] ${mono ? 'font-mono text-[13px]' : ''}`} title={resolvedValue}>
        {resolvedValue}
      </div>
    </div>
  )
}

function ToggleInfo({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="rounded-2xl border border-[rgba(17,17,17,0.08)] px-3 py-3">
      <div className="text-xs font-medium uppercase tracking-[0.12em] text-[#8b8b8b]">{label}</div>
      <div className="mt-2">
        <StatusBadge status={enabled ? 'running' : 'stopped'} />
      </div>
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

function InfoKeyValueSection({ title, items }: { title: string; items: Array<[string, string]> }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-[#5d5d5d]">{title}</div>
      {items.length ? (
        <div className="rounded-2xl border border-[rgba(17,17,17,0.08)]">
          {items.map(([key, value]) => (
            <div
              key={key}
              className="border-b border-[rgba(17,17,17,0.06)] px-3 py-3 text-sm last:border-b-0"
            >
              <div className="min-w-0 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f6f6f]">
                {key}
              </div>
              <div className="mt-2 min-w-0 whitespace-pre-wrap break-all font-mono text-[13px] leading-6 text-[#4f5f73]">
                {value}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#8b8b8b]">No data available.</div>
      )}
    </div>
  )
}

function NetworkIpamSection({ detail }: { detail: NetworkDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-[#5d5d5d]">IPAM Configs</div>
      {detail.ipamConfigs?.length ? (
        <div className="rounded-2xl border border-[rgba(17,17,17,0.08)]">
          {detail.ipamConfigs.map((item, index) => (
            <div key={`${item.subnet}-${index}`} className="grid gap-3 border-b border-[rgba(17,17,17,0.06)] px-3 py-3 text-sm last:border-b-0 md:grid-cols-3">
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-[#8b8b8b]">Subnet</div>
                <div className="mt-1 font-mono text-[#202020]">{item.subnet || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-[#8b8b8b]">Gateway</div>
                <div className="mt-1 font-mono text-[#202020]">{item.gateway || '-'}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.12em] text-[#8b8b8b]">IP Range</div>
                <div className="mt-1 font-mono text-[#202020]">{item.ipRange || '-'}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#8b8b8b]">No IPAM config declared.</div>
      )}
    </div>
  )
}

function NetworkContainersSection({ detail }: { detail: NetworkDetail }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="text-sm font-medium text-[#5d5d5d]">Connected Containers</div>
      {detail.containers?.length ? (
        <div className="rounded-2xl border border-[rgba(17,17,17,0.08)]">
          {detail.containers.map((container) => (
            <div key={container.id} className="grid gap-3 border-b border-[rgba(17,17,17,0.06)] px-3 py-3 text-sm last:border-b-0 md:grid-cols-[140px_120px_minmax(0,1fr)_minmax(0,1fr)]">
              <span className="font-medium text-[#303030]">{container.name}</span>
              <span className="font-mono text-[#8b8b8b]">{container.shortId}</span>
              <span className="font-mono text-[#202020]">{container.ipv4Address || '-'}</span>
              <span className="font-mono text-[#202020]">{container.macAddress || '-'}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[#8b8b8b]">No attached containers.</div>
      )}
    </div>
  )
}
