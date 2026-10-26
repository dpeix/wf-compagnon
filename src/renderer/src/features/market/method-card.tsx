import { Info } from 'lucide-react'
import { collectionProgress } from './best-hours'
import { formatCount } from './format'
import { ListCard } from './list-card'

interface MethodCardProps {
  daysCollected: number
  daysNeeded: number
}

export function MethodCard({ daysCollected, daysNeeded }: MethodCardProps): React.JSX.Element {
  const progress = collectionProgress(daysCollected, daysNeeded)

  return (
    <ListCard
      title="Comment ces chiffres sont calculés"
      description="Les heures se précisent à mesure que l'app enregistre des relevés"
      icon={Info}
      contentClassName="grid gap-6 px-4 md:grid-cols-[1fr_320px]"
    >
      <ul className="space-y-1.5 text-xs text-muted-foreground">
        <li>
          • Ventes conclues : statistiques warframe.market (48 h heure par heure, 90 j jour par
          jour).
        </li>
        <li>
          • Vendeurs en jeu : relevés faits par l&apos;app toutes les 15 min, quand elle est
          ouverte.
        </li>
        <li>• Délai de vente : estimé à partir de la disparition des ordres entre deux relevés.</li>
      </ul>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium">Historique collecté</span>
          <span className="font-medium text-wf-gold tabular-nums">
            {formatCount(daysCollected)} j / {formatCount(daysNeeded)} j
          </span>
        </div>
        <div
          className="h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Historique collecté"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.ratio * 100)}
          aria-valuetext={progress.label}
        >
          <div
            className="h-full rounded-full bg-wf-gold"
            style={{ width: `${String(progress.ratio * 100)}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          La carte jour × heure sera fiable après {formatCount(daysNeeded)} jours de relevés.
        </p>
      </div>
    </ListCard>
  )
}
