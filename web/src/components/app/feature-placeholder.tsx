import { ArrowRight, Clock3 } from 'lucide-react'
import { PageHeader } from '@/components/app/page-header'
import { Button } from '@/components/ui/button'

interface FeaturePlaceholderProps {
  title: string
  description: string
  phase: string
}

export function FeaturePlaceholder({
  title,
  description,
  phase,
}: FeaturePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Planned workspace"
        title={title}
        description={description}
        actions={
          <Button variant="secondary" className="gap-2">
            {phase}
            <Clock3 className="h-4 w-4" />
          </Button>
        }
      />

      <section className="rounded-[28px] border border-[color:var(--border)] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[24px] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--panel-subtle)] p-6">
            <h2 className="font-['Sora',ui-sans-serif,sans-serif] text-xl font-semibold tracking-[-0.04em] text-[color:var(--foreground)]">
              Phase-scoped placeholder
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[color:var(--muted-foreground)]">
              This route is intentionally present in Phase 1 so the application shell,
              navigation, and route contracts match the design system. Functional
              resource workflows land in the roadmap phase assigned to this workspace.
            </p>
          </div>

          <div className="rounded-[24px] border border-[color:var(--border)] bg-[color:var(--panel-subtle)] p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
              Next deliverables
            </div>
            <ul className="mt-4 space-y-3 text-sm text-[color:var(--foreground)]">
              <li className="flex items-center gap-3">
                <ArrowRight className="h-4 w-4 text-[color:var(--primary)]" />
                Route-level data loading and typed DTO rendering
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="h-4 w-4 text-[color:var(--primary)]" />
                Table, empty state, and error state implementations
              </li>
              <li className="flex items-center gap-3">
                <ArrowRight className="h-4 w-4 text-[color:var(--primary)]" />
                Mutations, dialogs, and live workflow details in later phases
              </li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}
