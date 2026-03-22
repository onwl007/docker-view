import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface OverviewStat {
  label: string
  value: string
  hint: string
}

export interface ListColumn {
  key: string
  label: string
}

export interface ListRow {
  id: string
  primary: string
  secondary?: string
  status?: string
  values: Record<string, string>
}

export interface DetailSection {
  title: string
  items: Array<{ label: string; value: string }>
}

interface ResourcePageProps {
  badge: string
  title: string
  description: string
  searchPlaceholder: string
  overview: OverviewStat[]
  columns: ListColumn[]
  rows: ListRow[]
  detailsTitle: string
  detailsDescription: string
  detailSections: DetailSection[]
  toolbar?: ReactNode
}

function statusTone(status?: string) {
  if (!status) {
    return 'border-[color:var(--border)] bg-[color:var(--panel-strong)] text-[color:var(--muted-foreground)]'
  }

  const normalized = status.toLowerCase()

  if (
    normalized.includes('running') ||
    normalized.includes('healthy') ||
    normalized.includes('attached') ||
    normalized.includes('ready')
  ) {
    return 'border-emerald-300 bg-emerald-50 text-emerald-800'
  }

  if (
    normalized.includes('paused') ||
    normalized.includes('pending') ||
    normalized.includes('warning')
  ) {
    return 'border-amber-300 bg-amber-50 text-amber-800'
  }

  return 'border-slate-300 bg-slate-50 text-slate-700'
}

export function ResourcePage({
  badge,
  title,
  description,
  searchPlaceholder,
  overview,
  columns,
  rows,
  detailsTitle,
  detailsDescription,
  detailSections,
  toolbar,
}: ResourcePageProps) {
  const [featuredRow, ...secondaryRows] = rows

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader className="gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge className="w-fit">{badge}</Badge>
            <div className="space-y-3">
              <CardTitle className="text-3xl sm:text-4xl">{title}</CardTitle>
              <CardDescription className="max-w-3xl text-base">
                {description}
              </CardDescription>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:max-w-xl sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--muted-foreground)]" />
              <Input
                aria-label={searchPlaceholder}
                placeholder={searchPlaceholder}
                className="pl-11"
              />
            </div>
            {toolbar ?? <Button variant="secondary">New view</Button>}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {overview.map((item) => (
            <div
              key={item.label}
              className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] p-5"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                {item.label}
              </div>
              <div className="mt-2 font-['Sora',ui-sans-serif,sans-serif] text-2xl font-semibold tracking-[-0.05em] text-[color:var(--foreground)]">
                {item.value}
              </div>
              <p className="mt-2 text-sm leading-6 text-[color:var(--muted-foreground)]">
                {item.hint}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <Card className="overflow-hidden">
          <CardHeader className="border-b border-[color:var(--border)] pb-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">Inventory</CardTitle>
                <CardDescription className="mt-2">
                  Structured like a desktop control surface: the most important
                  resource is pinned, with the rest queued below it.
                </CardDescription>
              </div>
              <Button variant="ghost" className="hidden sm:inline-flex">
                Refresh list
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-0">
            {featuredRow ? (
              <div className="border-b border-[color:var(--border)] px-6 py-5">
                <div className="flex flex-col gap-4 rounded-[28px] border border-[color:var(--border-strong)] bg-[color:var(--background)] p-5 shadow-[0_18px_40px_rgba(22,18,16,0.06)]">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="font-['Sora',ui-sans-serif,sans-serif] text-2xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
                        {featuredRow.primary}
                      </div>
                      {featuredRow.secondary ? (
                        <p className="mt-1 text-sm text-[color:var(--muted-foreground)]">
                          {featuredRow.secondary}
                        </p>
                      ) : null}
                    </div>
                    {featuredRow.status ? (
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]',
                          statusTone(featuredRow.status),
                        )}
                      >
                        {featuredRow.status}
                      </span>
                    ) : null}
                  </div>
                  <dl className="grid gap-3 sm:grid-cols-3">
                    {columns.map((column) => (
                      <div
                        key={`${featuredRow.id}-${column.key}`}
                        className="rounded-2xl bg-[color:var(--panel)] px-4 py-3"
                      >
                        <dt className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
                          {column.label}
                        </dt>
                        <dd className="mt-1 text-sm font-medium text-[color:var(--foreground)]">
                          {featuredRow.values[column.key]}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </div>
            ) : null}

            <div className="px-6 pb-6">
              <div className="overflow-hidden rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)]">
                <div className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-3 border-b border-[color:var(--border)] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  <div>Resource</div>
                  {columns.map((column) => (
                    <div key={column.key}>{column.label}</div>
                  ))}
                </div>
                <div>
                  {secondaryRows.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-[minmax(0,1.6fr)_repeat(3,minmax(0,1fr))] gap-3 border-b border-[color:var(--border)] px-4 py-4 last:border-b-0"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[color:var(--foreground)]">
                          {row.primary}
                        </div>
                        {row.secondary ? (
                          <div className="truncate text-sm text-[color:var(--muted-foreground)]">
                            {row.secondary}
                          </div>
                        ) : null}
                        {row.status ? (
                          <span
                            className={cn(
                              'mt-2 inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em]',
                              statusTone(row.status),
                            )}
                          >
                            {row.status}
                          </span>
                        ) : null}
                      </div>
                      {columns.map((column) => (
                        <div
                          key={`${row.id}-${column.key}`}
                          className="text-sm text-[color:var(--foreground)]"
                        >
                          {row.values[column.key]}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{detailsTitle}</CardTitle>
            <CardDescription>{detailsDescription}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detailSections.map((section) => (
              <div
                key={section.title}
                className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--background)] p-5"
              >
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-foreground)]">
                  {section.title}
                </div>
                <dl className="mt-4 space-y-3">
                  {section.items.map((item) => (
                    <div
                      key={`${section.title}-${item.label}`}
                      className="flex items-start justify-between gap-4 text-sm"
                    >
                      <dt className="text-[color:var(--muted-foreground)]">
                        {item.label}
                      </dt>
                      <dd className="max-w-[60%] text-right font-medium text-[color:var(--foreground)]">
                        {item.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
