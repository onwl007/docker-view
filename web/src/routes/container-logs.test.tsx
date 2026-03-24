import { describe, expect, it } from 'vitest'
import { buildLiveLogsStreamPath } from '@/features/resources/log-stream'

describe('buildLiveLogsStreamPath', () => {
  it('starts streaming after the historical log cursor', () => {
    expect(buildLiveLogsStreamPath('abc123', '2026-03-24T08:00:00Z')).toBe(
      '/api/v1/containers/abc123/logs/stream?tail=0&timestamps=true&since=2026-03-24T08%3A00%3A00Z',
    )
  })

  it('omits the since cursor when there is no historical timestamp', () => {
    expect(buildLiveLogsStreamPath('abc123')).toBe(
      '/api/v1/containers/abc123/logs/stream?tail=0&timestamps=true',
    )
  })
})
