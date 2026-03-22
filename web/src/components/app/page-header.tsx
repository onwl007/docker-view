import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PageHeaderProps {
  title: string
  description: string
  actions?: ReactNode
  eyebrow?: string
  className?: string
}

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4 rounded-[28px] border border-[color:var(--border)] bg-white px-5 py-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)] sm:px-7',
        className,
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1.5">
          {eyebrow ? (
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-['Sora',ui-sans-serif,sans-serif] text-[1.85rem] font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
            {title}
          </h1>
          <p className="max-w-3xl text-sm leading-6 text-[color:var(--muted-foreground)]">
            {description}
          </p>
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>
    </div>
  )
}
