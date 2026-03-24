import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]',
  {
    variants: {
      variant: {
        default:
          'bg-[color:var(--primary)] px-5 py-3 text-[color:var(--primary-foreground)] shadow-[0_1px_2px_rgba(17,17,17,0.1)] hover:bg-[color:var(--primary-strong)]',
        secondary:
          'border border-[color:var(--border)] bg-[color:var(--panel)] px-5 py-3 text-[color:var(--foreground)] hover:bg-[color:var(--panel-strong)]',
        ghost:
          'px-4 py-2 text-[color:var(--muted-foreground)] hover:bg-[color:var(--panel)] hover:text-[color:var(--foreground)]',
      },
      size: {
        default: 'h-11',
        sm: 'h-9 px-4 text-xs',
        lg: 'h-12 px-6',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
