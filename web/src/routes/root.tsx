import { Link, Outlet } from '@tanstack/react-router'
import { shellMeta, navigationSections } from '@/lib/navigation'
import { AppFooter, AppTopBar, SidebarFooterStatus } from '@/components/app/docker-view-ui'
import { cn } from '@/lib/utils'

export function RootLayout() {
  const WorkspaceIcon = shellMeta.workspaceIcon

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
                          className="group mx-2 flex items-center gap-3 rounded-2xl px-4 py-2.5 text-[15px] font-medium text-[#2a2a2a] transition-colors hover:bg-[#f4f4f3]"
                          activeProps={{
                            className: 'bg-[#f5f5f4]',
                          }}
                        >
                          <Icon className="h-4.5 w-4.5 text-[#303030]" />
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
              <Outlet />
            </main>
          </div>
        </div>

        <AppFooter />
      </div>
    </div>
  )
}
