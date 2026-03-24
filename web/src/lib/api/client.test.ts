import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createNetwork,
  createVolume,
  deleteContainer,
  deleteImage,
  deleteNetwork,
  deleteVolume,
  fetchContainers,
  fetchMonitoringContainers,
  fetchMonitoringHost,
  fetchSettings,
  fetchSystemSummary,
  pullImage,
  pruneImages,
  saveSettings,
  startContainer,
  validateSettings,
} from '@/lib/api/client'

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

  it('starts a container with a post request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), { status: 200 }),
    )

    const payload = await startContainer('abc123')

    expect(payload.success).toBe(true)
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/containers/abc123/start',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('deletes a container with encoded query options', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), { status: 200 }),
    )

    await deleteContainer('abc123', { force: true, removeVolumes: true })

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/containers/abc123?force=true&removeVolumes=true',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('pulls an image with a post body', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), { status: 200 }),
    )

    await pullImage('nginx:latest')

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/images/pull',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ reference: 'nginx:latest' }),
      }),
    )
  })

  it('prunes images with a post request', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ data: { success: true } }), { status: 200 }),
    )

    await pruneImages()

    expect(fetchMock).toHaveBeenCalledWith(
      '/api/v1/images/prune',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('creates and deletes volumes and networks', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
      new Response(JSON.stringify({ data: { success: true } }), { status: 200 }),
    )

    await createVolume('data')
    await deleteVolume('data', { force: true })
    await createNetwork({ name: 'frontend', driver: 'bridge', internal: true })
    await deleteNetwork('network-id')
    await deleteImage('sha256:abc', { force: true })

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/volumes',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/volumes/data?force=true',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/networks',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      4,
      '/api/v1/networks/network-id',
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      5,
      '/api/v1/images/sha256:abc?force=true',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})

describe('monitoring and settings api helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('fetches monitoring payloads from their endpoints', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { cpuCores: 8, cpuPercent: 12.5 } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ id: 'abc', name: 'nginx' }], meta: { total: 1 } }), { status: 200 }),
      )

    const host = await fetchMonitoringHost()
    const containers = await fetchMonitoringContainers()

    expect(host.cpuPercent).toBe(12.5)
    expect(containers.total).toBe(1)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/monitoring/host', expect.anything())
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/monitoring/containers', expect.anything())
  })

  it('validates and saves settings with JSON payloads', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const settings = {
      docker: {
        host: 'unix:///var/run/docker.sock',
        tlsEnabled: false,
        autoRefresh: true,
        refreshIntervalSeconds: 5,
      },
      security: {
        requireAuthentication: false,
        twoFactorEnabled: false,
        sessionTimeoutMinutes: 30,
        localConnectionsOnly: true,
      },
      notifications: {
        enabled: true,
        containerStateChanges: true,
        resourceAlerts: true,
        imageUpdates: false,
        securityVulnerabilities: false,
      },
      appearance: {
        theme: 'system' as const,
        compactMode: false,
        showContainerIDs: false,
      },
    }

    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: settings }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { valid: true, requiresRestart: false } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { settings, requiresRestart: false } }), { status: 200 }))

    const current = await fetchSettings()
    const validation = await validateSettings(settings)
    const saved = await saveSettings(settings)

    expect(current.docker.host).toBe('unix:///var/run/docker.sock')
    expect(validation.valid).toBe(true)
    expect(saved.settings.appearance.theme).toBe('system')
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/settings/validate',
      expect.objectContaining({ method: 'POST' }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/v1/settings',
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})
