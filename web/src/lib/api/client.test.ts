import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createNetwork,
  createTerminalSession,
  createVolume,
  deleteContainer,
  deleteImage,
  deleteNetwork,
  deleteVolume,
  fetchAuditEvents,
  fetchContainers,
  fetchImageDetail,
  fetchNetworkDetail,
  fetchContainerLogs,
  fetchMonitoringContainers,
  fetchMonitoringHost,
  fetchSettings,
  fetchSystemSummary,
  fetchVolumeDetail,
  fetchVolumeFileContent,
  fetchVolumeFiles,
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
      '/api/v1/images/sha256%3Aabc?force=true',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })

  it('fetches image detail with an encoded image id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'sha256:abc',
            shortId: 'abc',
            repoTags: ['nginx:latest'],
            createdAt: '2026-03-24T12:00:00Z',
            sizeBytes: 1234,
            containers: 1,
            inUse: true,
          },
        }),
        { status: 200 },
      ),
    )

    const payload = await fetchImageDetail('sha256:abc')

    expect(payload.shortId).toBe('abc')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/images/sha256%3Aabc', expect.anything())
  })

  it('fetches volume detail and file data with encoded paths', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              name: 'postgres_data',
              driver: 'local',
              mountpoint: '/var/lib/docker/volumes/postgres_data/_data',
              createdAt: '2026-03-25T12:00:00Z',
              scope: 'local',
              sizeBytes: 1234,
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              volumeName: 'postgres_data',
              mountpoint: '/var/lib/docker/volumes/postgres_data/_data',
              currentPath: 'config',
              entries: [{ name: 'app.env', path: 'config/app.env', type: 'file', sizeBytes: 8, modifiedAt: '2026-03-25T12:00:00Z' }],
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            data: {
              volumeName: 'postgres_data',
              path: 'config/app.env',
              name: 'app.env',
              sizeBytes: 8,
              modifiedAt: '2026-03-25T12:00:00Z',
              content: 'PORT=80',
              truncated: false,
            },
          }),
          { status: 200 },
        ),
      )

    const detail = await fetchVolumeDetail('postgres_data')
    const listing = await fetchVolumeFiles('postgres_data', 'config')
    const content = await fetchVolumeFileContent('postgres_data', 'config/app.env')

    expect(detail.name).toBe('postgres_data')
    expect(listing.currentPath).toBe('config')
    expect(content.name).toBe('app.env')
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/volumes/postgres_data', expect.anything())
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/volumes/postgres_data/files?path=config', expect.anything())
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/volumes/postgres_data/file?path=config%2Fapp.env', expect.anything())
  })

  it('fetches network detail with an encoded id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            id: 'network/id',
            shortId: 'network-id',
            name: 'frontend',
            driver: 'bridge',
            scope: 'local',
            createdAt: '2026-03-25T12:00:00Z',
            internal: false,
            attachable: true,
            ingress: false,
            enableIPv4: true,
            enableIPv6: false,
          },
        }),
        { status: 200 },
      ),
    )

    const payload = await fetchNetworkDetail('network/id')

    expect(payload.name).toBe('frontend')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/networks/network%2Fid', expect.anything())
  })

  it('surfaces a clear error when the api returns html instead of json', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('<!doctype html><html><body>dev shell</body></html>', {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      }),
    )

    await expect(fetchImageDetail('sha256:abc')).rejects.toThrow(
      'API returned HTML instead of JSON. This usually means the Go backend route did not match, the backend was not restarted, or the Vite dev server served index.html.',
    )
  })

  it('fetches container logs and creates a terminal session', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: [{ stream: 'stdout', message: 'ready' }], meta: { total: 1 } }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { sessionId: 'exec_123', websocketPath: '/api/v1/terminal/sessions/exec_123/ws' } }), { status: 200 }),
      )

    const logs = await fetchContainerLogs('abc123', { tail: '50', timestamps: true })
    const session = await createTerminalSession('abc123', { command: ['/bin/sh'], tty: true })

    expect(logs.total).toBe(1)
    expect(session.sessionId).toBe('exec_123')
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/v1/containers/abc123/logs?tail=50&timestamps=true',
      expect.anything(),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/v1/containers/abc123/exec-sessions',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('fetches audit events from the api envelope', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: [
            {
              eventType: 'container.lifecycle',
              targetType: 'container',
              targetId: 'abc123',
              action: 'restart',
              actor: 'tester',
              source: '127.0.0.1',
              result: 'success',
              timestamp: '2026-03-24T12:00:00Z',
            },
          ],
          meta: { total: 1 },
        }),
        { status: 200 },
      ),
    )

    const result = await fetchAuditEvents({ q: 'tester', limit: 10 })
    expect(result.total).toBe(1)
    expect(result.items[0]?.action).toBe('restart')
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
