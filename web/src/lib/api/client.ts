import { clearUnauthorized, markUnauthorized } from '@/lib/session'

export interface ApiSuccess<T> {
  data: T
}

export interface ActionSuccess {
  success: boolean
}

export interface ApiMeta {
  total: number
}

export interface ApiListSuccess<T> {
  data: T[]
  meta: ApiMeta
}

export interface ListResult<T> {
  items: T[]
  total: number
}

export interface ResourceSummary {
  total: number
  running?: number
  stopped?: number
}

export interface HostSummary {
  cpuCores: number
  memoryBytes: number
}

export interface SystemSummary {
  sampledAt: string
  dockerHost: string
  hostName: string
  dockerVersion: string
  apiVersion: string
  engineStatus: string
  containers: ResourceSummary
  images: ResourceSummary
  volumes: ResourceSummary
  networks: ResourceSummary
  host: HostSummary
}

export interface ContainerListFilters {
  q?: string
  status?: string
  all?: boolean
  limit?: number
  sort?: 'recent'
}

export interface ContainerListItem {
  id: string
  shortId: string
  name: string
  image: string
  state: string
  status: string
  createdAt: string
  ports: string[]
  labels?: Record<string, string>
  composeProject?: string
  networkNames?: string[]
  volumeNames?: string[]
}

export interface ContainerLogEntry {
  stream: 'stdout' | 'stderr'
  timestamp?: string
  message: string
}

export interface ContainerLogsFilters {
  stdout?: boolean
  stderr?: boolean
  since?: string
  until?: string
  tail?: string
  timestamps?: boolean
}

export interface TerminalSession {
  sessionId: string
  websocketPath: string
}

export interface TerminalSessionInput {
  command?: string[]
  user?: string
  privileged?: boolean
  tty?: boolean
  workingDir?: string
  env?: string[]
  cols?: number
  rows?: number
}

export interface ImageListItem {
  id: string
  shortId: string
  repository: string
  tag: string
  createdAt: string
  sizeBytes: number
  containers: number
  inUse: boolean
}

export interface VolumeListItem {
  name: string
  driver: string
  mountpoint: string
  createdAt: string
  scope: string
  sizeBytes: number
  attachedContainers?: string[]
}

export interface NetworkListItem {
  id: string
  shortId: string
  name: string
  driver: string
  scope: string
  createdAt: string
  subnet?: string
  gateway?: string
  internal: boolean
  containerNames?: string[]
}

export interface MonitoringHost {
  sampledAt: string
  cpuCores: number
  cpuPercent: number
  memoryUsedBytes: number
  memoryTotalBytes: number
  diskUsedBytes: number
  diskTotalBytes: number
  networkRxBytes: number
  networkTxBytes: number
  runningContainers: number
  totalContainers: number
}

export interface MonitoringContainer {
  id: string
  shortId: string
  name: string
  readAt: string
  cpuPercent: number
  memoryUsageBytes: number
  memoryLimitBytes: number
  memoryPercent: number
  networkRxBytes: number
  networkTxBytes: number
  blockReadBytes: number
  blockWriteBytes: number
  pids: number
}

export interface AuditEvent {
  eventType: string
  targetType: string
  targetId: string
  action: string
  actor: string
  source: string
  result: string
  timestamp: string
  details?: Record<string, unknown>
}

export interface ComposeProjectListItem {
  name: string
  status: 'running' | 'stopped' | 'partial' | 'inactive'
  createdAt: string
  containerCount: number
  runningCount: number
  stoppedCount: number
  services: string[]
  networks: string[]
  volumes: string[]
}

export interface ComposeProjectContainer {
  id: string
  shortId: string
  name: string
  service?: string
  image: string
  state: 'running' | 'stopped' | 'partial' | 'inactive'
  status: string
  createdAt: string
}

export interface ComposeProjectDetail extends ComposeProjectListItem {
  containers: ComposeProjectContainer[]
}

export interface SettingsState {
  docker: {
    host: string
    tlsEnabled: boolean
    autoRefresh: boolean
    refreshIntervalSeconds: number
    dockerVersion?: string
    apiVersion?: string
    operatingSystem?: string
    kernelVersion?: string
    storageDriver?: string
    cgroupDriver?: string
  }
  security: {
    requireAuthentication: boolean
    twoFactorEnabled: boolean
    sessionTimeoutMinutes: number
    localConnectionsOnly: boolean
  }
  notifications: {
    enabled: boolean
    containerStateChanges: boolean
    resourceAlerts: boolean
    imageUpdates: boolean
    securityVulnerabilities: boolean
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    compactMode: boolean
    showContainerIDs: boolean
  }
}

export interface SettingsIssue {
  field: string
  message: string
}

export interface SettingsValidation {
  valid: boolean
  requiresRestart: boolean
  restartKeys?: string[]
  issues?: SettingsIssue[]
}

export interface SettingsSaveResult {
  settings: SettingsState
  requiresRestart: boolean
  restartKeys?: string[]
}

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
const API_AUTH_TOKEN = import.meta.env.VITE_API_AUTH_TOKEN ?? ''

export class ApiError extends Error {
  code?: string
  status: number

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export function buildApiUrl(path: string) {
  if (!API_BASE_URL) {
    return path
  }

  return `${API_BASE_URL}${path}`
}

export function buildWebSocketUrl(path: string) {
  const base = API_BASE_URL || window.location.origin
  const url = new URL(path, base)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  return url.toString()
}

export async function fetchSystemSummary(): Promise<SystemSummary> {
  return requestObject<SystemSummary>('/api/v1/system/summary')
}

export async function fetchContainers(
  filters: ContainerListFilters = {},
): Promise<ListResult<ContainerListItem>> {
  return requestList<ContainerListItem>('/api/v1/containers', {
    q: filters.q,
    status: filters.status,
    all: filters.all,
    limit: filters.limit,
    sort: filters.sort,
  })
}

export async function fetchContainerLogs(
  id: string,
  filters: ContainerLogsFilters = {},
): Promise<ListResult<ContainerLogEntry>> {
  return requestList<ContainerLogEntry>(`/api/v1/containers/${id}/logs`, {
    stdout: filters.stdout,
    stderr: filters.stderr,
    since: filters.since,
    until: filters.until,
    tail: filters.tail,
    timestamps: filters.timestamps,
  })
}

export async function createTerminalSession(
  id: string,
  input: TerminalSessionInput = {},
): Promise<TerminalSession> {
  return requestObject<TerminalSession>(`/api/v1/containers/${id}/exec-sessions`, {
    method: 'POST',
    body: input,
  })
}

export async function fetchImages(query?: string): Promise<ListResult<ImageListItem>> {
  return requestList<ImageListItem>('/api/v1/images', query ? { q: query } : undefined)
}

export async function fetchVolumes(query?: string): Promise<ListResult<VolumeListItem>> {
  return requestList<VolumeListItem>('/api/v1/volumes', query ? { q: query } : undefined)
}

export async function fetchNetworks(query?: string): Promise<ListResult<NetworkListItem>> {
  return requestList<NetworkListItem>('/api/v1/networks', query ? { q: query } : undefined)
}

export async function fetchMonitoringHost(): Promise<MonitoringHost> {
  return requestObject<MonitoringHost>('/api/v1/monitoring/host')
}

export async function fetchAuditEvents(filters: {
  q?: string
  targetType?: string
  action?: string
  result?: string
  limit?: number
} = {}): Promise<ListResult<AuditEvent>> {
  return requestList<AuditEvent>('/api/v1/audit/events', filters)
}

export function buildAuditEventsExportUrl(filters: {
  q?: string
  targetType?: string
  action?: string
  result?: string
} = {}) {
  const search = buildSearchParams(filters)
  return buildApiUrl(`/api/v1/audit/events/export${search ? `?${search}` : ''}`)
}

export async function downloadAuditEvents(filters: {
  q?: string
  targetType?: string
  action?: string
  result?: string
} = {}) {
  const response = await fetch(buildAuditEventsExportUrl(filters), {
    headers: buildHeaders(false),
  })
  if (!response.ok) {
    throw await readApiError(response)
  }

  const blob = await response.blob()
  const href = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = 'audit-events.ndjson'
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(href)
}

export async function fetchComposeProjects(query?: string): Promise<ListResult<ComposeProjectListItem>> {
  return requestList<ComposeProjectListItem>('/api/v1/compose/projects', query ? { q: query } : undefined)
}

export async function fetchComposeProject(name: string): Promise<ComposeProjectDetail> {
  return requestObject<ComposeProjectDetail>(`/api/v1/compose/projects/${encodeURIComponent(name)}`)
}

export async function fetchMonitoringContainers(): Promise<ListResult<MonitoringContainer>> {
  return requestList<MonitoringContainer>('/api/v1/monitoring/containers')
}

export async function fetchSettings(): Promise<SettingsState> {
  return requestObject<SettingsState>('/api/v1/settings')
}

export async function validateSettings(settings: SettingsState): Promise<SettingsValidation> {
  return requestObject<SettingsValidation>('/api/v1/settings/validate', {
    method: 'POST',
    body: settings,
  })
}

export async function saveSettings(settings: SettingsState): Promise<SettingsSaveResult> {
  return requestObject<SettingsSaveResult>('/api/v1/settings', {
    method: 'PUT',
    body: settings,
  })
}

export async function startContainer(id: string): Promise<ActionSuccess> {
  return requestAction(`/api/v1/containers/${id}/start`, {
    method: 'POST',
  })
}

export async function stopContainer(id: string, timeoutSeconds?: number): Promise<ActionSuccess> {
  return requestAction(`/api/v1/containers/${id}/stop`, {
    method: 'POST',
    body: timeoutSeconds === undefined ? undefined : { timeoutSeconds },
  })
}

export async function restartContainer(id: string, timeoutSeconds?: number): Promise<ActionSuccess> {
  return requestAction(`/api/v1/containers/${id}/restart`, {
    method: 'POST',
    body: timeoutSeconds === undefined ? undefined : { timeoutSeconds },
  })
}

export async function deleteContainer(
  id: string,
  options: { force?: boolean; removeVolumes?: boolean } = {},
): Promise<ActionSuccess> {
  return requestAction(`/api/v1/containers/${id}`, {
    method: 'DELETE',
    query: {
      force: options.force,
      removeVolumes: options.removeVolumes,
    },
  })
}

export async function pullImage(reference: string): Promise<ActionSuccess> {
  return requestAction('/api/v1/images/pull', {
    method: 'POST',
    body: { reference },
  })
}

export async function deleteImage(id: string, options: { force?: boolean } = {}): Promise<ActionSuccess> {
  return requestAction(`/api/v1/images/${id}`, {
    method: 'DELETE',
    query: { force: options.force },
  })
}

export async function pruneImages(): Promise<ActionSuccess> {
  return requestAction('/api/v1/images/prune', {
    method: 'POST',
  })
}

export async function createVolume(name: string): Promise<ActionSuccess> {
  return requestAction('/api/v1/volumes', {
    method: 'POST',
    body: { name },
  })
}

export async function deleteVolume(name: string, options: { force?: boolean } = {}): Promise<ActionSuccess> {
  return requestAction(`/api/v1/volumes/${encodeURIComponent(name)}`, {
    method: 'DELETE',
    query: { force: options.force },
  })
}

export async function createNetwork(input: {
  name: string
  driver?: string
  internal?: boolean
}): Promise<ActionSuccess> {
  return requestAction('/api/v1/networks', {
    method: 'POST',
    body: input,
  })
}

export async function deleteNetwork(id: string): Promise<ActionSuccess> {
  return requestAction(`/api/v1/networks/${id}`, {
    method: 'DELETE',
  })
}

export async function startComposeProject(name: string): Promise<ActionSuccess> {
  return requestAction(`/api/v1/compose/projects/${encodeURIComponent(name)}/start`, {
    method: 'POST',
  })
}

export async function stopComposeProject(name: string): Promise<ActionSuccess> {
  return requestAction(`/api/v1/compose/projects/${encodeURIComponent(name)}/stop`, {
    method: 'POST',
  })
}

export async function recreateComposeProject(name: string): Promise<ActionSuccess> {
  return requestAction(`/api/v1/compose/projects/${encodeURIComponent(name)}/recreate`, {
    method: 'POST',
  })
}

export async function deleteComposeProject(name: string): Promise<ActionSuccess> {
  return requestAction(`/api/v1/compose/projects/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  })
}

async function requestObject<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PUT'
    body?: unknown
  },
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    // Keep relative paths in tests and dev proxy setups.
    // buildApiUrl would turn these into absolute URLs.
    method: options?.method ?? 'GET',
    headers: buildHeaders(options?.body !== undefined),
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw await readApiError(response)
  }

  clearUnauthorized()

  const payload = (await response.json()) as ApiSuccess<T>
  return payload.data
}

async function requestList<T>(
  path: string,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<ListResult<T>> {
  const search = buildSearchParams(query)
  const suffix = search ? `?${search}` : ''
  const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
    headers: buildHeaders(false),
  })

  if (!response.ok) {
    throw await readApiError(response)
  }

  clearUnauthorized()

  const payload = (await response.json()) as ApiListSuccess<T>
  return {
    items: payload.data,
    total: payload.meta.total,
  }
}

async function requestAction(
  path: string,
  options: {
    method: 'POST' | 'DELETE'
    body?: Record<string, unknown>
    query?: Record<string, string | number | boolean | undefined>
  },
): Promise<ActionSuccess> {
  const search = buildSearchParams(options.query)
  const suffix = search ? `?${search}` : ''
  const response = await fetch(`${API_BASE_URL}${path}${suffix}`, {
    method: options.method,
    headers: buildHeaders(true),
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    throw await readApiError(response)
  }

  clearUnauthorized()

  const payload = (await response.json()) as ApiSuccess<ActionSuccess>
  return payload.data
}

function buildHeaders(hasBody: boolean): HeadersInit {
  return {
    Accept: 'application/json',
    ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
    ...(API_AUTH_TOKEN ? { Authorization: `Bearer ${API_AUTH_TOKEN}` } : {}),
  }
}

function buildSearchParams(query?: Record<string, string | number | boolean | undefined>) {
  if (!query) {
    return ''
  }

  const searchParams = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === '') {
      continue
    }
    searchParams.set(key, String(value))
  }

  return searchParams.toString()
}

async function readApiError(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    const message = payload.error?.message || `Request failed with status ${response.status}`
    const error = new ApiError(message, response.status, payload.error?.code)
    if (payload.error?.code === 'unauthorized' || payload.error?.code === 'forbidden' || response.status === 401 || response.status === 403) {
      markUnauthorized({
        code: payload.error?.code === 'forbidden' || response.status === 403 ? 'forbidden' : 'unauthorized',
        message,
      })
    }
    return error
  } catch {
    const message = `Request failed with status ${response.status}`
    const error = new ApiError(message, response.status)
    if (response.status === 401 || response.status === 403) {
      markUnauthorized({
        code: response.status === 403 ? 'forbidden' : 'unauthorized',
        message,
      })
    }
    return error
  }
}
