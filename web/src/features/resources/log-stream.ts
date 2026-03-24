export function buildLiveLogsStreamPath(containerId: string, since?: string) {
  const params = new URLSearchParams({
    tail: '0',
    timestamps: 'true',
  })
  if (since) {
    params.set('since', since)
  }

  return `/api/v1/containers/${containerId}/logs/stream?${params.toString()}`
}
