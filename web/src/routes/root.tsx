import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { BellDot, Circle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { shellMeta, navigationSections } from '@/lib/navigation'
import { cn } from '@/lib/utils'
import { systemSummaryQueryOptions } from '@/features/dashboard/query-options'

export function RootLayout() {
  const isLoadingRoute = useRouterState({ select: (state) => state.isLoading })
  const { data, isLoading, error } = useQuery(systemSummaryQueryOptions)
  const WorkspaceIcon = shellMeta.workspaceIcon

  return (
    <div className="min-h-screen bg-[color:var(--app-background)] text-[color:var(--foreground)]">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-4 px-3 py-3 lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:px-4">
        <aside className="flex flex-col rounded-[30px] border border-[color:var(--border)] bg-white px-4 py-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center gap-3 px-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#3478f6,#275fe0)] text-white shadow-[0_16px_30px_rgba(39,95,224,0.35)]">
              <WorkspaceIcon className="h-5 w-5" />
            </div>
            <div>
              <div className="font-['Sora',ui-sans-serif,sans-serif] text-xl font-semibold tracking-[-0.04em]">
                {shellMeta.productName}
              </div>
              <div className="text-xs text-[color:var(--muted-foreground)]">
                {shellMeta.tagline}
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-6">
            {navigationSections.map((section) => (
              <div key={section.label}>
                <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  {section.label}
                </div>
                <nav className="mt-2 space-y-1.5">
                  {section.items.map((item) => {
                    const Icon = item.icon

                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-[color:var(--sidebar-foreground)] transition-colors hover:bg-[color:var(--panel-subtle)]"
                        activeProps={{
                          className:
                            'bg-[color:var(--panel-subtle)] text-[color:var(--foreground)] shadow-[inset_0_0_0_1px_var(--border)]',
                        }}
                      >
                        <Icon className="h-4.5 w-4.5 text-[color:var(--muted-foreground)] transition-colors group-hover:text-[color:var(--foreground)]" />
                        <span>{item.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            ))}
          </div>

          <div className="mt-auto rounded-[22px] bg-[color:var(--panel-subtle)] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Circle
                className={cn(
                  'h-2.5 w-2.5 fill-current',
                  error ? 'text-amber-500' : 'text-emerald-500',
                )}
              />
              {error ? 'Engine status unavailable' : `${shellMeta.statusLabel} ready`}
            </div>
            <div className="mt-1 text-xs leading-5 text-[color:var(--muted-foreground)]">
              {isLoading
                ? 'Checking Docker engine connectivity...'
                : data
                  ? `${data.hostName} · ${data.dockerVersion}`
                  : 'The backend can start without built frontend assets during development.'}
            </div>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-4">
          <header className="flex flex-col gap-3 rounded-[30px] border border-[color:var(--border)] bg-white px-5 py-4 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
                {shellMeta.workspaceLabel}
              </div>
              <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                {shellMeta.workspaceHint}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold',
                  isLoadingRoute
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                )}
              >
                <RefreshCw className={cn('h-3.5 w-3.5', isLoadingRoute && 'animate-spin')} />
                {isLoadingRoute ? 'Refreshing route' : 'Route data ready'}
              </div>
              <Button variant="secondary" size="sm" className="gap-2">
                <BellDot className="h-4 w-4" />
                Alerts
              </Button>
            </div>
          </header>

          <main className="min-h-0 flex-1 rounded-[30px] border border-[color:var(--border)] bg-[color:var(--surface)] p-4 shadow-[0_18px_45px_rgba(15,23,42,0.04)] sm:p-5">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
