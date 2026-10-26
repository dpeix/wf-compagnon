import { Equal, Package, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPlatinum } from './format'
import { compareSetAndParts } from './item-insights'
import { ListCard } from './list-card'
import type { ItemDetail } from './types'

interface SetPartsCardProps {
  setPrice: number
  parts: ItemDetail['parts']
}

const VERDICT_STYLES = {
  set: { className: 'bg-success/15 text-success', icon: TrendingUp },
  parts: { className: 'bg-wf-gold/15 text-wf-gold', icon: TrendingDown },
  equal: { className: 'bg-muted text-muted-foreground', icon: Equal }
} as const

function VerdictIcon({ better }: { better: keyof typeof VERDICT_STYLES }): React.JSX.Element {
  const Icon = VERDICT_STYLES[better].icon
  return <Icon className="size-4 shrink-0" aria-hidden="true" />
}

export function SetPartsCard({ setPrice, parts }: SetPartsCardProps): React.JSX.Element {
  const { partsTotal, difference, better } = compareSetAndParts(setPrice, parts)
  const gap = formatPlatinum(Math.abs(difference))
  const verdict =
    better === 'set'
      ? `Le set rapporte ${gap} de plus que ses pièces (${formatPlatinum(partsTotal)}).`
      : better === 'parts'
        ? `Les pièces rapportent ${gap} de plus que le set (${formatPlatinum(partsTotal)} au total).`
        : `Set et pièces rapportent autant (${formatPlatinum(partsTotal)}).`

  return (
    <ListCard
      title="Set ou pièces séparées ?"
      description="Meilleur prix de vente en jeu de chaque pièce"
      icon={Package}
      contentClassName="space-y-3 px-4"
    >
      <dl className="space-y-2 text-xs">
        {parts.map((part) => (
          <div key={part.name} className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{part.name}</dt>
            <dd className="font-medium tabular-nums">{formatPlatinum(part.price)}</dd>
          </div>
        ))}
      </dl>
      <p
        className={cn(
          'flex items-start gap-2 rounded-md px-3 py-2.5 text-xs font-medium',
          VERDICT_STYLES[better].className
        )}
      >
        <VerdictIcon better={better} />
        {verdict}
      </p>
    </ListCard>
  )
}
