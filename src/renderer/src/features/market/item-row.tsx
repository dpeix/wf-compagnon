import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChangeBadge } from './change-badge'
import { changeTrend, formatPlatinum } from './format'
import { Sparkline } from './sparkline'
import type { MarketItemSummary } from './types'

interface ItemRowProps {
  item: MarketItemSummary
  subtitle: string
}

const TREND_COLORS = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground'
} as const

export function ItemRow({ item, subtitle }: ItemRowProps): React.JSX.Element {
  return (
    <li className="flex items-center gap-3 px-2 py-1.5">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Package className="size-4 text-wf-gold" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{item.name}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      <Sparkline values={item.history7d} className={cn(TREND_COLORS[changeTrend(item.change7d)])} />
      <div className="flex w-[4.5rem] shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-medium tabular-nums">{formatPlatinum(item.price)}</span>
        <ChangeBadge ratio={item.change7d} />
      </div>
    </li>
  )
}
