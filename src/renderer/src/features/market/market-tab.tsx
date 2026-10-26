import { useState } from 'react'
import { ComingSoon } from '@/components/coming-soon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ItemDetail } from './item-detail'
import { sampleItemDetail } from './item-sample-data'
import { MarketOverview } from './market-overview'
import {
  sampleEvents,
  sampleHourlySales,
  sampleItems,
  samplePlayers,
  sampleSalesChangeVsYesterday
} from './sample-data'
import { useCurrentHour } from './use-current-hour'

// Screens of the Figma mockup that are not built yet
const upcomingSections = [
  {
    id: 'best-hours',
    label: 'Meilleures heures',
    description: 'Quand publier ses ordres pour vendre vite.',
    upcoming: [
      'Carte de chaleur jour × heure des ventes',
      "Délai de vente médian selon l'heure",
      'Top 3 des créneaux et créneaux à éviter'
    ]
  },
  {
    id: 'my-orders',
    label: 'Mes ordres & suivi',
    description: 'Mes ordres warframe.market comparés au reste du marché.',
    upcoming: [
      'Rang de chaque ordre face aux vendeurs en jeu',
      "Suggestions d'ajustement de prix",
      'Liste de suivi avec alertes de prix'
    ]
  }
] as const

// Gold underline sitting on the bottom border (shadcn puts it 5px below the trigger)
const SUBTAB_CLASSES =
  'px-3 after:bg-wf-gold group-data-[orientation=horizontal]/tabs:after:bottom-[-1px]'

export function MarketTab(): React.JSX.Element {
  const currentHour = useCurrentHour()
  // Generated once: the sample history is anchored on the time the tab opened
  const [itemDetail] = useState(() => sampleItemDetail(new Date()))
  return (
    <Tabs defaultValue="overview" className="gap-0">
      <div className="border-b px-6">
        {/* Same variant prefix as the shadcn defaults so tailwind-merge replaces them */}
        <TabsList variant="line" className="group-data-[orientation=horizontal]/tabs:h-12">
          <TabsTrigger value="overview" className={SUBTAB_CLASSES}>
            Vue d&apos;ensemble
          </TabsTrigger>
          <TabsTrigger value="item" className={SUBTAB_CLASSES}>
            Fiche objet
          </TabsTrigger>
          {upcomingSections.map(({ id, label }) => (
            <TabsTrigger key={id} value={id} className={SUBTAB_CLASSES}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      <TabsContent value="overview">
        <MarketOverview
          items={sampleItems}
          hourlySales={sampleHourlySales}
          currentHour={currentHour}
          players={samplePlayers}
          salesChangeVsYesterday={sampleSalesChangeVsYesterday}
          events={sampleEvents}
        />
      </TabsContent>
      <TabsContent value="item">
        <ItemDetail item={itemDetail} />
      </TabsContent>
      {upcomingSections.map(({ id, label, description, upcoming }) => (
        <TabsContent key={id} value={id} className="p-6">
          <ComingSoon title={label} description={description} upcoming={upcoming} />
        </TabsContent>
      ))}
    </Tabs>
  )
}
