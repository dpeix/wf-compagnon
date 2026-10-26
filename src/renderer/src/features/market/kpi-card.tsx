import type { LucideIcon } from 'lucide-react'
import { Card } from '@/components/ui/card'

interface KpiCardProps {
  label: string
  value: string
  icon: LucideIcon
  detail: string
  /** Optional change badge shown before the detail */
  change?: React.ReactNode
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  detail,
  change
}: KpiCardProps): React.JSX.Element {
  return (
    <Card className="gap-1.5 px-4 py-4">
      <div className="flex items-center gap-2">
        <p className="flex-1 text-xs font-medium text-muted-foreground">{label}</p>
        <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {change}
        <span>{detail}</span>
      </div>
    </Card>
  )
}
