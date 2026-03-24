import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { DashboardView } from '@/routes/dashboard'

describe('DashboardView', () => {
  it('renders the dashboard metrics and recent containers table', () => {
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
        recentContainers={[
          {
            id: 'abc123',
            shortId: 'abc123',
            name: 'nginx-proxy',
            image: 'nginx:latest',
            state: 'running',
            status: 'Up 2 hours',
            createdAt: '2026-03-22T10:00:00Z',
            ports: ['80:80/tcp'],
            composeProject: 'edge',
          },
        ]}
      />,
    )

    expect(markup).toContain('Containers')
    expect(markup).toContain('12')
    expect(markup).toContain('Recent Containers')
    expect(markup).toContain('nginx-proxy')
  })
})
