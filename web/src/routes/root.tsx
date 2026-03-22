import { Link, Outlet, useRouterState } from '@tanstack/react-router'
import {
  BellDot,
  ChevronDown,
  Command,
  Gauge,
  MoreHorizontal,
  Search,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { controlDeck, hostGauge, hostSnapshot, navigationItems } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

export function RootLayout() {
  const isLoading = useRouterState({ select: (state) => state.isLoading })

  return (
    <div className="min-h-screen bg-[color:var(--background)] text-[color:var(--foreground)]">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-10rem] top-[-8rem] h-72 w-72 rounded-full bg-[color:var(--accent-soft)] blur-3xl" />
        <div className="absolute bottom-[-12rem] right-[-6rem] h-96 w-96 rounded-full bg-[color:var(--accent-softer)] blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.75),transparent_42%),linear-gradient(180deg,rgba(255,247,237,0.92),rgba(255,252,248,0.98))]" />
      </div>

      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-4 sm:px-6 lg:grid lg:grid-cols-[280px_minmax(0,1fr)] lg:px-8">
        <aside className="flex flex-col gap-4 rounded-[34px] border border-[color:var(--border)] bg-[color:var(--panel)]/92 p-4 shadow-[0_32px_90px_rgba(22,18,16,0.08)] backdrop-blur lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--foreground)] text-[color:var(--background)]">
                <Command className="h-5 w-5" />
              </div>
              <div>
                <div className="font-['Sora',ui-sans-serif,sans-serif] text-lg font-semibold tracking-[-0.04em]">
                  docker-view
                </div>
                <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                  Control surface
                </div>
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-[color:var(--muted-foreground)]" />
          </div>

          <div className="rounded-[28px] border border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.72),rgba(250,240,228,0.92))] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  Active host
                </div>
                <div className="mt-2 font-['Sora',ui-sans-serif,sans-serif] text-2xl font-semibold tracking-[-0.04em]">
                  prod-docker-01
                </div>
                <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                  Single-node operator shell modeled after a desktop runtime
                  manager.
                </p>
              </div>
              <div className="rounded-2xl bg-[color:var(--panel-strong)] p-3">
                {(() => {
                  const Icon = hostGauge

                  return <Icon className="h-5 w-5" />
                })()}
              </div>
            </div>

            <div className="mt-4 grid gap-3">
              {hostSnapshot.map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[color:var(--border)] bg-[color:var(--background)] px-4 py-3"
                >
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                    {item.label}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[color:var(--foreground)]">
                    {item.value}
                  </div>
                  <div className="mt-1 text-xs text-[color:var(--muted-foreground)]">
                    {item.hint}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon

              return (
                <Link
                  key={`${item.label}-${item.to}`}
                  to={item.to}
                  className="group flex items-center gap-3 rounded-[24px] border border-transparent px-4 py-3 transition-colors hover:bg-[color:var(--panel-strong)]"
                  activeProps={{
                    className:
                      'border-[color:var(--border-strong)] bg-[color:var(--background)] shadow-[0_18px_36px_rgba(22,18,16,0.06)]',
                  }}
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[color:var(--panel-strong)] text-[color:var(--foreground)] transition-colors group-hover:bg-[color:var(--background)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-[color:var(--foreground)]">
                      {item.label}
                    </div>
                    <div className="truncate text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                      {item.note}
                    </div>
                  </div>
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto space-y-3 rounded-[28px] border border-[color:var(--border)] bg-[color:var(--background)] p-4">
            <div className="flex items-center justify-between">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                Control deck
              </div>
              <MoreHorizontal className="h-4 w-4 text-[color:var(--muted-foreground)]" />
            </div>
            {controlDeck.map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-[color:var(--muted-foreground)]">{item.label}</span>
                <span className="font-medium text-[color:var(--foreground)]">{item.value}</span>
              </div>
            ))}
            <Button className="w-full justify-between">
              Open terminal
              <Gauge className="h-4 w-4" />
            </Button>
          </div>
        </aside>

        <div className="flex min-h-0 flex-col gap-6">
          <header className="rounded-[34px] border border-[color:var(--border)] bg-[color:var(--panel)]/92 px-4 py-4 shadow-[0_24px_80px_rgba(22,18,16,0.06)] backdrop-blur sm:px-6">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.26em] text-[color:var(--muted-foreground)]">
                  Operator workspace
                </div>
                <h1 className="mt-2 font-['Sora',ui-sans-serif,sans-serif] text-3xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)] sm:text-4xl">
                  Desktop-like container management, adapted for the browser.
                </h1>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative w-full sm:w-72">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
                  <Input placeholder="Search command, container, image..." className="pl-11" />
                </div>
                <div
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium',
                    isLoading
                      ? 'border-amber-300 bg-amber-100 text-amber-900'
                      : 'border-emerald-300 bg-emerald-100 text-emerald-900',
                  )}
                >
                  <span
                    className={cn(
                      'h-2.5 w-2.5 rounded-full',
                      isLoading ? 'bg-amber-500' : 'bg-emerald-500',
                    )}
                  />
                  {isLoading ? 'Refreshing route data' : 'Route data ready'}
                </div>
                <Button variant="secondary" className="gap-2">
                  <BellDot className="h-4 w-4" />
                  Alerts
                </Button>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  )
}
