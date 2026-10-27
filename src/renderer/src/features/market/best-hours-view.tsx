import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatDuration, hasSales, hourlyProfile, slotSummaries } from './best-hours'
import { DayTotalsCard } from './day-totals-card'
import { DelayCard } from './delay-card'
import { formatCount } from './format'
import { HeatmapCard } from './heatmap-card'
import { MethodCard } from './method-card'
import { QuietCard } from './quiet-card'
import { SlotCard } from './slot-card'
import type { SalesWeek } from './types'

interface BestHoursViewProps {
  market: SalesWeek
  item: SalesWeek
  itemName: string
}

// Top slots and the delay card use the same window, so they name the same hours
const SLOT_HOURS = 2
const SLOT_COUNT = 3

// Hour labels use the computer's clock, so the time zone is shown next to the title
const TIME_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone

export function BestHoursView({ market, item, itemName }: BestHoursViewProps): React.JSX.Element {
  const [scope, setScope] = useState<'market' | 'item'>('market')
  const data = scope === 'market' ? market : item

  return (
    <div className="flex flex-col gap-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">Meilleures heures pour vendre</h1>
          <p className="text-sm text-muted-foreground">
            Quand les acheteurs sont là : ventes conclues, vendeurs en jeu et délai de vente ·
            données d&apos;exemple
          </p>
        </div>
        <Badge variant="outline">Heures locales · {TIME_ZONE}</Badge>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={scope}
          onValueChange={(value) => {
            // Ignore the empty value Radix sends when the active scope is clicked again
            if (value === 'market' || value === 'item') setScope(value)
          }}
          aria-label="Portée des statistiques"
        >
          <ToggleGroupItem value="market" className="px-3">
            Tout le marché
          </ToggleGroupItem>
          <ToggleGroupItem value="item" className="px-3">
            {itemName}
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {hasSales(data.sales) ? (
        <SalesInsights data={data} />
      ) : (
        <p className="rounded-xl border px-4 py-8 text-center text-sm text-muted-foreground">
          Pas encore de vente relevée : les meilleures heures apparaîtront après quelques jours de
          relevés.
        </p>
      )}

      <MethodCard daysCollected={data.daysCollected} daysNeeded={data.daysNeeded} />
    </div>
  )
}

function SalesInsights({ data }: { data: SalesWeek }): React.JSX.Element {
  const profile = hourlyProfile(data.sales)
  const slots = slotSummaries(
    data.sales,
    data.medianDelay,
    data.sellersInGame,
    SLOT_HOURS,
    SLOT_COUNT
  )

  return (
    <>
      <section aria-label="Meilleurs créneaux" className="grid gap-4 lg:grid-cols-3">
        {slots.map((slot) => (
          <SlotCard
            key={slot.title}
            rank={slot.rank}
            title={slot.title}
            vsAverage={slot.vsAverage}
            highlighted={slot.rank === 1}
            stats={[
              { label: 'Ventes / h', value: formatCount(slot.salesPerHour) },
              { label: 'Délai médian', value: formatDuration(slot.delayMinutes) },
              { label: 'Vendeurs en jeu', value: formatCount(slot.sellers) }
            ]}
          />
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          <HeatmapCard sales={data.sales} daysCollected={data.daysCollected} />
          <DayTotalsCard sales={data.sales} daysCollected={data.daysCollected} />
        </div>
        <div className="flex flex-col gap-4">
          <DelayCard medianDelay={data.medianDelay} profile={profile} windowHours={SLOT_HOURS} />
          <QuietCard profile={profile} />
        </div>
      </div>
    </>
  )
}
