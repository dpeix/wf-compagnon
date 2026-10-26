import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { changeTrend, formatChange } from './format'

interface ChangeBadgeProps {
  /** Change as a ratio: 0.114 means +11.4 % */
  ratio: number
  className?: string
}

/** Price or volume change, green when it rises and red when it falls. */
export function ChangeBadge({ ratio, className }: ChangeBadgeProps): React.JSX.Element {
  const trend = changeTrend(ratio)
  return (
    <Badge
      variant="secondary"
      className={cn(
        'tabular-nums',
        trend === 'up' && 'bg-success/15 text-success',
        trend === 'down' && 'bg-destructive/15 text-destructive',
        className
      )}
    >
      {formatChange(ratio)}
    </Badge>
  )
}
