import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DashboardView } from '@/routes/dashboard'

describe('DashboardView', () => {
  it('renders the phase 1 summary cards and snapshot details', () => {
    const markup = renderToStaticMarkup(
      <DashboardView
        summary={{
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
        }}
      />,
    )

    expect(markup).toContain('Containers')
    expect(markup).toContain('12')
    expect(markup).toContain('prod-docker-01')
    expect(markup).toContain('Application shell, API contract, and dashboard summary are live.')
  })
})
