import { useEffect, useState } from 'react'
import { Link, Outlet } from '@tanstack/react-router'
import { shellMeta, navigationSections } from '@/lib/navigation'
import { AppFooter, AppTopBar, SidebarFooterStatus } from '@/components/app/docker-view-ui'
import type { UnauthorizedState } from '@/lib/session'
import { clearUnauthorized, subscribeUnauthorizedState } from '@/lib/session'
import { cn } from '@/lib/utils'

export function RootLayout() {
  const WorkspaceIcon = shellMeta.workspaceIcon
  const [unauthorized, setUnauthorized] = useState<UnauthorizedState | null>(null)

  useEffect(() => subscribeUnauthorizedState(setUnauthorized), [])

  return (
    <div className="h-screen overflow-hidden bg-[#fbfbfa] text-[#111111]">
      <div className="flex h-full min-h-0 flex-col">
        <AppTopBar productName={shellMeta.productName} workspaceIcon={WorkspaceIcon} />

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="hidden w-[235px] shrink-0 border-r border-[rgba(17,17,17,0.06)] bg-[#fbfbfa] lg:flex lg:flex-col">
            <div className="flex-1 space-y-5 overflow-hidden px-0 py-4">
              {navigationSections.map((section) => (
                <div key={section.label}>
                  <div className="px-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-[#9a9a9a]">
                    {section.label}
                  </div>
                  <nav className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon

                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          className="group mx-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[15px] font-medium text-[#2a2a2a] transition-colors hover:bg-[#eef4ff]"
                          activeProps={{
                            className: 'bg-[#e8f1ff] text-[#174a9f] shadow-[inset_0_0_0_1px_rgba(47,128,237,0.08)]',
                          }}
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#f3f4f6] text-[#303030] transition-colors group-hover:bg-[#dce9ff] group-hover:text-[#2469d7] group-[.active]:bg-[#d9e8ff] group-[.active]:text-[#174a9f]">
                            <Icon className="h-4.5 w-4.5" />
                          </div>
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>

            <div className="px-4 py-3">
              <SidebarFooterStatus />
            </div>
          </aside>

          <div className="min-w-0 flex-1 overflow-hidden">
            <main className={cn('h-full overflow-auto px-4 py-3 sm:px-6')}>
              {unauthorized ? (
                <div className="mb-3 flex items-start justify-between rounded-[20px] border border-[#f3d6d6] bg-[#fff5f5] px-4 py-3 text-sm text-[#9f3f3f]">
                  <div>
                    <div className="font-semibold">
                      {unauthorized.code === 'forbidden' ? 'Authentication failed' : 'Authentication required'}
                    </div>
                    <div className="mt-1">{unauthorized.message}</div>
                  </div>
                  <button type="button" className="text-[#9f3f3f]" onClick={() => clearUnauthorized()}>
                    Dismiss
                  </button>
                </div>
              ) : null}
              <Outlet />
            </main>
          </div>
        </div>

        <AppFooter />
      </div>
    </div>
  )
}
