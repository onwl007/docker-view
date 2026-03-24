import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchContainers, fetchSystemSummary } from '@/lib/api/client'

describe('fetchSystemSummary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns the summary payload from the api envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            sampledAt: '2026-03-22T12:00:00Z',
            dockerHost: 'unix:///var/run/docker.sock',
            hostName: 'prod-docker-01',
            dockerVersion: '28.0.1',
            apiVersion: '1.48',
            engineStatus: 'connected',
            containers: { total: 12, running: 8, stopped: 4 },
            images: { total: 24 },
            volumes: { total: 8 },
            networks: { total: 5 },
            host: { cpuCores: 8, memoryBytes: 34359738368 },
          },
        }),
        { status: 200 },
      ),
    )

    const summary = await fetchSystemSummary()
    expect(summary.hostName).toBe('prod-docker-01')
    expect(summary.containers.running).toBe(8)
  })

  it('surfaces the api error message when the request fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            message: 'docker engine is unavailable',
          },
        }),
        { status: 502 },
      ),
    )

    await expect(fetchSystemSummary()).rejects.toThrow('docker engine is unavailable')
  })
})

describe('fetchContainers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns list payloads with metadata', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              id: 'abc123',
              shortId: 'abc123',
              name: 'nginx-proxy',
              image: 'nginx:latest',
              state: 'running',
              status: 'Up 2 hours',
              createdAt: '2026-03-22T12:00:00Z',
              ports: ['80:80/tcp'],
            },
          ],
          meta: {
            total: 1,
          },
        }),
        { status: 200 },
      ),
    )

    const payload = await fetchContainers({ q: 'nginx', all: true })
    expect(payload.total).toBe(1)
    expect(payload.items[0]?.name).toBe('nginx-proxy')
  })
})
