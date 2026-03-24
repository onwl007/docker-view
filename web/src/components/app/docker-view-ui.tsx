import type { ReactNode } from 'react'
import {
  Circle,
  ChevronDown,
  Filter,
  Gauge,
  Search,
  Square,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type AccentTone = 'default' | 'green' | 'blue' | 'amber' | 'purple'

const accentTextMap: Record<AccentTone, string> = {
  default: 'text-[#111111]',
  green: 'text-[#1dc89a]',
  blue: 'text-[#2caeff]',
  amber: 'text-[#f4a100]',
  purple: 'text-[#c06bf4]',
}

const accentGlowMap: Record<AccentTone, string> = {
  default: 'bg-[#f3f7ff] text-[#5494e5]',
  green: 'bg-[#eefcf8] text-[#1dc89a]',
  blue: 'bg-[#eef8ff] text-[#2caeff]',
  amber: 'bg-[#fff7ea] text-[#f4a100]',
  purple: 'bg-[#faf1ff] text-[#c06bf4]',
}

export function PageToolbar({
  title,
  description,
  actions,
}: {
  title: string
  description: string
  actions?: ReactNode
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-[rgba(17,17,17,0.06)] px-4 py-2.5 sm:px-5">
      <div className="flex items-start gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md border border-[rgba(17,17,17,0.08)] bg-white">
          <Square className="h-3.5 w-3.5 text-[#111111]" />
        </div>
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.03em] text-[#111111]">
            {title}
          </h1>
          <p className="mt-0.5 text-sm text-[#8b8b8b]">{description}</p>
        </div>
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageSection({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <section
      className={cn(
        'rounded-[20px] border border-[rgba(17,17,17,0.08)] bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04),0_10px_24px_rgba(17,17,17,0.03)]',
        className,
      )}
    >
      {children}
    </section>
  )
}

export function OverviewGrid({
  children,
}: {
  children: ReactNode
}) {
  return <div className="grid gap-3 xl:grid-cols-4">{children}</div>
}

export function MetricCard({
  label,
  value,
  subvalue,
  detail,
  progress,
  accent = 'default',
  icon: Icon,
  breakdown,
}: {
  label: string
  value: string
  subvalue?: string
  detail?: string
  progress?: number
  accent?: AccentTone
  icon?: LucideIcon
  breakdown?: Array<{ label: string; value: string; tone?: AccentTone | 'default' }>
}) {
  return (
    <PageSection className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-medium text-[#5d5d5d]">{label}</div>
          {value ? (
            <div className="mt-6 flex items-end gap-2">
              <span
                className={cn(
                  'text-[20px] font-semibold tracking-[-0.04em] text-[#111111] sm:text-[24px]',
                  accentTextMap[accent],
                )}
              >
                {value}
              </span>
              {subvalue ? <span className="pb-1 text-sm text-[#8b8b8b]">{subvalue}</span> : null}
            </div>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              'flex h-9 w-9 items-center justify-center rounded-xl',
              accentGlowMap[accent],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </div>
      {detail ? <div className="mt-2 text-sm text-[#8b8b8b]">{detail}</div> : null}
      {progress !== undefined ? (
        <div className="mt-4 h-2 rounded-full bg-[#e6e6e6]">
          <div
            className="h-2 rounded-full bg-[#111111]"
            style={{ width: `${Math.max(6, Math.min(progress, 100))}%` }}
          />
        </div>
      ) : null}
      {breakdown?.length ? (
        <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm">
          {breakdown.map((item) => (
            <div key={`${label}-${item.label}`} className="flex items-baseline gap-2">
              {item.value ? (
                <span
                  className={cn(
                    'font-semibold text-[#111111]',
                    item.tone ? accentTextMap[item.tone as AccentTone] : '',
                  )}
                >
                  {item.value}
                </span>
              ) : null}
              <span className="text-[#8b8b8b]">{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </PageSection>
  )
}

export function SectionHeading({
  icon: Icon,
  title,
  description,
  actions,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[rgba(17,17,17,0.06)] px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-3 text-[15px] font-semibold text-[#111111]">
          {Icon ? <Icon className="h-4.5 w-4.5" /> : null}
          <span>{title}</span>
        </div>
        {description ? <p className="mt-2 text-sm text-[#8b8b8b]">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function SearchToolbar({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string
  value?: string
  onChange?: (value: string) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-[240px]">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a0a0]" />
        <Input
          placeholder={placeholder}
          value={value ?? ''}
          onChange={(event) => onChange?.(event.target.value)}
          className="h-8 rounded-xl border-[rgba(17,17,17,0.08)] bg-white pl-10 text-sm shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
        />
        {value ? (
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a0a0a0]"
            type="button"
            onClick={() => onChange?.('')}
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
      <button
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-[rgba(17,17,17,0.08)] bg-white shadow-[0_1px_2px_rgba(17,17,17,0.04)]"
        type="button"
      >
        <Filter className="h-4 w-4 text-[#444444]" />
      </button>
    </div>
  )
}

export function StatusBadge({
  status,
}: {
  status: 'running' | 'stopped' | 'paused' | 'external' | 'internal'
}) {
  const variants: Record<string, string> = {
    running: 'border-[#c9f4df] bg-[#eafff5] text-[#1dbf8e]',
    stopped: 'border-[#ececec] bg-[#f7f7f7] text-[#9b9b9b]',
    paused: 'border-[#ffe7b6] bg-[#fff6e4] text-[#f1a300]',
    external: 'border-[#cdefff] bg-[#ebf8ff] text-[#37afe7]',
    internal: 'border-[#ffe7bb] bg-[#fff5e0] text-[#e8a419]',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[status],
      )}
    >
      {status}
    </span>
  )
}

export function TagBadge({ children }: { children: ReactNode }) {
  return (
    <Badge className="rounded-full border-[rgba(17,17,17,0.08)] bg-[#fafafa] px-3 py-1 text-[12px] font-medium normal-case tracking-normal text-[#454545]">
      {children}
    </Badge>
  )
}

export function IconAction({
  tone = 'default',
  icon: Icon,
}: {
  tone?: 'default' | 'green' | 'amber'
  icon: LucideIcon
}) {
  const toneMap = {
    default: 'text-[#f4b000]',
    green: 'text-[#1dc89a]',
    amber: 'text-[#f4b000]',
  }

  return (
    <button className={cn('rounded-lg p-1', toneMap[tone])}>
      <Icon className="h-4.5 w-4.5" />
    </button>
  )
}

export function EllipsisButton({ onClick }: { onClick?: () => void }) {
  return (
    <button
      className="rounded-lg px-1 py-0.5 text-[18px] leading-none text-[#111111]"
      onClick={onClick}
      type="button"
      aria-label="More actions"
    >
      ...
    </button>
  )
}

export function ActionMenu({
  actions,
  className,
}: {
  actions: Array<{ label: string; tone?: 'default' | 'danger' }>
  className?: string
}) {
  return (
    <div
      className={cn(
        'absolute right-6 top-12 z-20 min-w-[142px] rounded-2xl border border-[rgba(17,17,17,0.08)] bg-white p-2 shadow-[0_12px_30px_rgba(17,17,17,0.12)]',
        className,
      )}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          className={cn(
            'flex w-full items-center rounded-xl px-3 py-2 text-left text-sm text-[#202020] hover:bg-[#f7f7f7]',
            action.tone === 'danger' && 'text-[#db4b4b]',
          )}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}

export function CleanupCard({
  title,
  description,
  buttonLabel,
}: {
  title: string
  description: string
  buttonLabel: string
}) {
  return (
    <PageSection>
      <div className="flex flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[15px] font-semibold text-[#f4b000]">{title}</div>
          <p className="mt-3 text-sm text-[#7f7f7f]">{description}</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="h-10 rounded-xl border-[#f7e6b2] bg-white px-4 text-[#f4b000] hover:bg-[#fffaf0]"
        >
          {buttonLabel}
        </Button>
      </div>
    </PageSection>
  )
}

export function TableViewport({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="flex min-h-[250px] flex-1 flex-col overflow-hidden px-4">
      {children}
    </div>
  )
}

export function PaginationFooter({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: {
  currentPage: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between border-t border-[rgba(17,17,17,0.06)] px-4 py-3">
      <div className="text-sm text-[#8b8b8b]">
        Showing {start}-{end} of {totalItems}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="rounded-xl border border-[rgba(17,17,17,0.08)] px-3 py-1.5 text-sm text-[#303030] disabled:opacity-40"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          type="button"
        >
          Prev
        </button>
        <div className="text-sm font-medium text-[#303030]">
          {currentPage} / {pageCount}
        </div>
        <button
          className="rounded-xl border border-[rgba(17,17,17,0.08)] px-3 py-1.5 text-sm text-[#303030] disabled:opacity-40"
          disabled={currentPage === pageCount}
          onClick={() => onPageChange(currentPage + 1)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export function SettingsTabBar<T extends string>({
  tabs,
  activeTab,
  onChange,
}: {
  tabs: ReadonlyArray<{ id: T; label: string; icon: LucideIcon }>
  activeTab: T
  onChange: (tab: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const Icon = tab.icon
        const active = tab.id === activeTab
        return (
          <button
            key={tab.id}
            className={cn(
            'inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium shadow-[0_1px_2px_rgba(17,17,17,0.04)]',
            'inline-flex items-center gap-2 rounded-xl border px-4 py-1.5 text-sm font-medium shadow-[0_1px_2px_rgba(17,17,17,0.04)]',
            active
              ? 'border-[rgba(17,17,17,0.12)] bg-white text-[#111111]'
              : 'border-transparent bg-[#f6f6f6] text-[#333333]',
            )}
            onClick={() => onChange(tab.id)}
            type="button"
          >
            <Icon className="h-4 w-4" />
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

export function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
  className?: string
}) {
  return (
    <PageSection className={className}>
      <div className="px-4 py-4">
        <div className="flex items-center gap-3 text-[15px] font-semibold text-[#111111]">
          <Icon className="h-5 w-5" />
          <span>{title}</span>
        </div>
        <p className="mt-2 text-sm text-[#7f7f7f]">{description}</p>
        <div className="mt-4">{children}</div>
      </div>
    </PageSection>
  )
}

export function SettingRow({
  title,
  description,
  enabled,
  trailing,
}: {
  title: string
  description: string
  enabled: boolean
  trailing?: ReactNode
}) {
  return (
    <div className="border-t border-[rgba(17,17,17,0.06)] py-4 first:border-t-0 first:pt-0 last:pb-0">
      <div className="text-[15px] font-semibold text-[#111111]">{title}</div>
      <p className="mt-1 text-sm text-[#7f7f7f]">{description}</p>
      <div className="mt-3">
        {trailing ?? <FakeSwitch enabled={enabled} />}
      </div>
    </div>
  )
}

export function FakeSwitch({ enabled }: { enabled: boolean }) {
  return (
    <div
      className={cn(
        'relative h-6 w-full rounded-full',
        enabled ? 'bg-[#111111]' : 'bg-[#ededed]',
      )}
    >
      <div
        className={cn(
          'absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm',
          enabled ? 'left-1' : 'left-1',
        )}
      />
    </div>
  )
}

export function FauxSelect({ value }: { value: string }) {
  return (
    <button className="flex h-11 w-full items-center justify-between rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-4 text-left shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
      <span>{value}</span>
      <ChevronDown className="h-4 w-4 text-[#b1b1b1]" />
    </button>
  )
}

export function ThemeChoice({
  label,
  active,
  preview,
}: {
  label: string
  active?: boolean
  preview: 'light' | 'dark' | 'system'
}) {
  return (
    <button
      className={cn(
        'w-[88px] rounded-2xl border p-3 text-center shadow-[0_1px_2px_rgba(17,17,17,0.04)]',
        active ? 'border-[#111111] bg-white' : 'border-[rgba(17,17,17,0.08)] bg-white',
      )}
      type="button"
    >
      <div
        className={cn(
          'mx-auto h-11 w-full rounded-xl border border-[rgba(17,17,17,0.08)]',
          preview === 'light' && 'bg-white',
          preview === 'dark' && 'bg-[#1f1f23]',
          preview === 'system' && 'bg-[linear-gradient(90deg,#ffffff_0%,#d2d2d2_42%,#1f1f23_100%)]',
        )}
      />
      <div className="mt-3 text-sm font-medium text-[#111111]">{label}</div>
    </button>
  )
}

export function ModalSurface({
  title,
  description,
  children,
  onClose,
}: {
  title: string
  description: string
  children: ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(17,17,17,0.42)] p-4">
      <div className="w-full max-w-[480px] rounded-[18px] bg-white p-6 shadow-[0_24px_60px_rgba(17,17,17,0.2)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-[20px] font-semibold tracking-[-0.03em] text-[#111111]">
              {title}
            </h2>
            <p className="mt-2 text-sm text-[#7f7f7f]">{description}</p>
          </div>
          <button className="rounded-lg p-1 text-[#8b8b8b]" onClick={onClose} type="button">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-8">{children}</div>
      </div>
    </div>
  )
}

export function ModalField({
  label,
  placeholder,
  selectValue,
}: {
  label: string
  placeholder?: string
  selectValue?: string
}) {
  return (
    <div>
      <div className="mb-3 text-sm font-medium text-[#111111]">{label}</div>
      {selectValue ? (
        <FauxSelect value={selectValue} />
      ) : (
        <Input
          placeholder={placeholder}
          className="h-11 rounded-xl border-[rgba(17,17,17,0.12)] text-sm shadow-[inset_0_0_0_1px_rgba(17,17,17,0.04)]"
        />
      )}
    </div>
  )
}

export function ModalFooter({
  confirmLabel,
  onCancel,
  onConfirm,
  confirmDisabled,
  confirmIcon: ConfirmIcon,
}: {
  confirmLabel: string
  onCancel: () => void
  onConfirm?: () => void
  confirmDisabled?: boolean
  confirmIcon?: LucideIcon
}) {
  return (
    <div className="mt-8 flex items-center justify-end gap-2">
      <Button
        variant="secondary"
        className="h-10 rounded-xl border-[rgba(17,17,17,0.08)] px-4 shadow-none"
        onClick={onCancel}
      >
        Cancel
      </Button>
      <Button className="h-10 rounded-xl px-4" onClick={onConfirm} disabled={confirmDisabled}>
        {ConfirmIcon ? <ConfirmIcon className="h-4 w-4" /> : null}
        {confirmLabel}
      </Button>
    </div>
  )
}

export function IntervalButton({ value }: { value: string }) {
  return (
    <button className="inline-flex h-10 items-center gap-3 rounded-xl border border-[rgba(17,17,17,0.08)] bg-white px-4 shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
      <span className="text-sm font-medium text-[#111111]">{value}</span>
      <ChevronDown className="h-4 w-4 text-[#b1b1b1]" />
    </button>
  )
}

export function MonitorPill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-[#f7f7f7] px-3 text-sm font-medium text-[#444444]">
      {children}
    </span>
  )
}

export function HeaderActionButton({
  children,
  variant = 'secondary',
  onClick,
}: {
  children: ReactNode
  variant?: 'secondary' | 'default'
  onClick?: () => void
}) {
  return (
    <Button
      variant={variant}
      size="sm"
      onClick={onClick}
      className={cn(
        'h-10 rounded-xl px-4 shadow-[0_1px_2px_rgba(17,17,17,0.04)]',
        variant === 'default' && 'bg-[#111111] hover:bg-[#1a1a1a]',
        variant === 'secondary' &&
          'border-[rgba(17,17,17,0.08)] bg-white text-[#111111] hover:bg-[#f7f7f7]',
      )}
    >
      {children}
    </Button>
  )
}

export function SubtleIconButton({
  icon: Icon,
}: {
  icon: LucideIcon
}) {
  return (
    <button className="flex h-10 w-10 items-center justify-center rounded-xl text-[#111111]">
      <Icon className="h-4.5 w-4.5" />
    </button>
  )
}

export function SidebarFooterStatus() {
  return (
    <div className="rounded-2xl bg-[#ecfbf5] px-4 py-2.5 text-sm font-medium text-[#2aa96f]">
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#16c784]" />
        Docker Engine Running
      </div>
    </div>
  )
}

export function AppTopBar({
  productName,
  workspaceIcon: WorkspaceIcon,
}: {
  productName: string
  workspaceIcon: LucideIcon
}) {
  return (
    <header className="border-b border-[rgba(17,17,17,0.06)] bg-[#fbfbfa]">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#2f80ed] text-white shadow-[0_10px_24px_rgba(47,128,237,0.28)]">
            <WorkspaceIcon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[16px] font-semibold tracking-[-0.03em] text-[#111111]">
              {productName}
            </div>
            <div className="text-sm text-[#8b8b8b]">Container management workspace</div>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(17,17,17,0.08)] bg-white px-3 py-2 text-sm text-[#5d5d5d] shadow-[0_1px_2px_rgba(17,17,17,0.04)]">
            <Gauge className="h-4 w-4 text-[#111111]" />
            Linux Server Control
          </div>
        </div>
      </div>
    </header>
  )
}

export function AppFooter() {
  return (
    <footer className="border-t border-[rgba(17,17,17,0.06)] bg-[#fbfbfa]">
      <div className="flex flex-col gap-2 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center gap-2 text-[#5d5d5d]">
          <Circle className="h-3.5 w-3.5 fill-current text-[#1dc89a]" />
          Docker Engine Running
        </div>
        <div className="text-[#8b8b8b]">DockerView Operator Console</div>
      </div>
    </footer>
  )
}
