import { ChevronRight, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ChangeBadge } from './change-badge'
import { changeTrend, formatPlatinum } from './format'
import { Sparkline } from './sparkline'
import type { MarketItemSummary } from './types'

interface ItemRowProps {
  item: MarketItemSummary
  subtitle: string
  /** Opens the item screen; the row is a plain line without it */
  onSelect?: (slug: string) => void
}

const TREND_COLORS = {
  up: 'text-success',
  down: 'text-destructive',
  flat: 'text-muted-foreground'
} as const

function RowContent({ item, subtitle }: Omit<ItemRowProps, 'onSelect'>): React.JSX.Element {
  return (
    <>
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
        <Package className="size-4 text-wf-gold" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="block truncate text-sm font-medium">{item.name}</span>
        <span className="block truncate text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <Sparkline values={item.history7d} className={cn(TREND_COLORS[changeTrend(item.change7d)])} />
      <span className="flex w-[4.5rem] shrink-0 flex-col items-end gap-0.5">
        <span className="text-sm font-medium tabular-nums">{formatPlatinum(item.price)}</span>
        <ChangeBadge ratio={item.change7d} />
      </span>
    </>
  )
}

export function ItemRow({ item, subtitle, onSelect }: ItemRowProps): React.JSX.Element {
  if (!onSelect) {
    return (
      <li className="flex items-center gap-3 px-2 py-1.5">
        <RowContent item={item} subtitle={subtitle} />
      </li>
    )
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => {
          onSelect(item.slug)
        }}
        className="group flex w-full items-center gap-3 rounded-md px-2 py-1.5 hover:bg-muted/50 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <RowContent item={item} subtitle={subtitle} />
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100"
          aria-hidden="true"
        />
        <span className="sr-only">: ouvrir la fiche</span>
      </button>
    </li>
  )
}
