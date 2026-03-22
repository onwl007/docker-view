export interface HealthResponse {
  status: string
  addr: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/healthz`, {
    headers: {
      Accept: 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return (await response.json()) as HealthResponse
}
