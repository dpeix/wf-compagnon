import { Equal, Package, TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatPlatinum } from './format'
import { compareSetAndParts } from './item-insights'
import { ListCard } from './list-card'
import { partsForComparison } from './live-data'

interface SetPartsCardProps {
  /** Best sell price in game of the set, null without any seller in game */
  setPrice: number | null
  /** Best sell price in game of each part, null when one of them is unknown */
  parts: readonly { name: string; quantity: number; price: number }[] | null
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

function Comparison({
  setPrice,
  parts
}: {
  setPrice: number
  parts: readonly { name: string; price: number }[]
}): React.JSX.Element {
  const { partsTotal, difference, better } = compareSetAndParts(setPrice, parts)
  const gap = formatPlatinum(Math.abs(difference))
  const verdict =
    better === 'set'
      ? `Le set rapporte ${gap} de plus que ses pièces (${formatPlatinum(partsTotal)}).`
      : better === 'parts'
        ? `Les pièces rapportent ${gap} de plus que le set (${formatPlatinum(partsTotal)} au total).`
        : `Set et pièces rapportent autant (${formatPlatinum(partsTotal)}).`

  return (
    <>
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
    </>
  )
}

export function SetPartsCard({ setPrice, parts }: SetPartsCardProps): React.JSX.Element {
  return (
    <ListCard
      title="Set ou pièces séparées ?"
      description="Meilleur prix de vente en jeu de chaque pièce"
      icon={Package}
      contentClassName="space-y-3 px-4"
    >
      {parts === null ? (
        <p className="text-xs text-muted-foreground">
          Comparaison indisponible : une pièce n&apos;a aucun vendeur en jeu parmi ses meilleurs
          ordres, ou son prix n&apos;a pas pu être chargé.
        </p>
      ) : setPrice === null ? (
        <p className="text-xs text-muted-foreground">
          Comparaison indisponible : personne ne vend le set en jeu en ce moment.
        </p>
      ) : (
        <Comparison setPrice={setPrice} parts={partsForComparison(parts)} />
      )}
    </ListCard>
  )
}
