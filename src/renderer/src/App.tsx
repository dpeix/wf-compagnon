import { Store, Swords, Zap } from 'lucide-react'
import { ComingSoon } from '@/components/coming-soon'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MarketTab } from '@/features/market/market-tab'

function App(): React.JSX.Element {
  return (
    <Tabs defaultValue="market" className="min-h-screen gap-0">
      <header className="flex h-14 items-center gap-6 border-b px-6">
        <div className="flex items-center gap-2.5">
          <span className="flex size-7 items-center justify-center rounded-md bg-wf-gold">
            <Zap className="size-4 text-primary-foreground" aria-hidden="true" />
          </span>
          <span className="text-[15px] font-semibold">WF Compagnon</span>
        </div>
        <TabsList>
          <TabsTrigger value="market">
            <Store aria-hidden="true" />
            Marché
          </TabsTrigger>
          <TabsTrigger value="arbitrations">
            <Swords aria-hidden="true" />
            Arbitrages
          </TabsTrigger>
        </TabsList>
      </header>

      <main className="flex flex-1 flex-col">
        {/* Kept mounted (hidden) so the loaded market data and chosen item survive a tab switch */}
        <TabsContent value="market" forceMount className="data-[state=inactive]:hidden">
          <MarketTab />
        </TabsContent>
        <TabsContent value="arbitrations" className="p-6">
          <ComingSoon
            title="Arbitrages"
            description="Planning des arbitrages et suivi de mes runs."
            upcoming={[
              'Planning des prochaines heures avec le tier de chaque nœud',
              'Nœuds favoris et rappels',
              'Historique des runs lu depuis EE.log (durée, drones)'
            ]}
          />
        </TabsContent>
      </main>
    </Tabs>
  )
}

export default App
