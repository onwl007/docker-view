import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ContainerTableRow } from '@/routes/containers'

describe('ContainerTableRow', () => {
  it('renders stop, restart and delete actions for a running container', () => {
    const markup = renderToStaticMarkup(
      <table>
        <tbody>
          <ContainerTableRow
            row={{
              id: 'abc123',
              shortId: 'abc123',
              name: 'nginx-proxy',
              image: 'nginx:latest',
              state: 'running',
              status: 'Up 2 hours',
              createdAt: '2026-03-22T12:00:00Z',
              ports: ['80:80/tcp'],
            }}
            onAction={vi.fn()}
          />
        </tbody>
      </table>,
    )

    expect(markup).toContain('Stop')
    expect(markup).toContain('Restart')
    expect(markup).toContain('Delete')
  })
})
