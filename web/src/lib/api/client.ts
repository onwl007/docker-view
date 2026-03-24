export interface ApiSuccess<T> {
  data: T
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

interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

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

export async function fetchImages(query?: string): Promise<ListResult<ImageListItem>> {
  return requestList<ImageListItem>('/api/v1/images', query ? { q: query } : undefined)
}

export async function fetchVolumes(query?: string): Promise<ListResult<VolumeListItem>> {
  return requestList<VolumeListItem>('/api/v1/volumes', query ? { q: query } : undefined)
}

export async function fetchNetworks(query?: string): Promise<ListResult<NetworkListItem>> {
  return requestList<NetworkListItem>('/api/v1/networks', query ? { q: query } : undefined)
}

async function requestObject<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

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
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = (await response.json()) as ApiListSuccess<T>
  return {
    items: payload.data,
    total: payload.meta.total,
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

async function readErrorMessage(response: Response) {
  try {
    const payload = (await response.json()) as ApiErrorPayload
    if (payload.error?.message) {
      return payload.error.message
    }
  } catch {
    return `Request failed with status ${response.status}`
  }

  return `Request failed with status ${response.status}`
}
