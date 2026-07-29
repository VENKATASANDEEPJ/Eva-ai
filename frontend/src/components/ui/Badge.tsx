import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'purple' | 'cyan'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-white/5 text-eva-text-dim border-white/10',
  accent: 'bg-eva-accent/10 text-eva-accent-bright border-eva-accent/20',
  success: 'bg-eva-green/10 text-eva-green border-eva-green/20',
  warning: 'bg-eva-amber/10 text-eva-amber border-eva-amber/20',
  danger: 'bg-eva-red/10 text-eva-red border-eva-red/20',
  purple: 'bg-eva-purple/10 text-eva-purple border-eva-purple/20',
  cyan: 'bg-eva-cyan/10 text-eva-cyan border-eva-cyan/20',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
