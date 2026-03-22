export interface ApiSuccess<T> {
  data: T
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

interface ApiErrorPayload {
  error?: {
    message?: string
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchSystemSummary(): Promise<SystemSummary> {
  const response = await fetch(`${API_BASE_URL}/api/v1/system/summary`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(await readErrorMessage(response))
  }

  const payload = (await response.json()) as ApiSuccess<SystemSummary>
  return payload.data
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
