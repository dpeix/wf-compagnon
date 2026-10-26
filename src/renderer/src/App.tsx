import { Store, Swords, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type Section = {
  id: string
  label: string
  icon: LucideIcon
  description: string
  upcoming: string[]
}

// Placeholder content until the features described in plan.md are built
const sections: Section[] = [
  {
    id: 'market',
    label: 'Marché',
    icon: Store,
    description: 'Prix et ordres warframe.market.',
    upcoming: [
      "Recherche d'un objet et meilleurs prix d'achat et de vente",
      'Historique des prix',
      'Gestion de mes ordres de vente'
    ]
  },
  {
    id: 'arbitrations',
    label: 'Arbitrages',
    icon: Swords,
    description: 'Planning des arbitrages et suivi de mes runs.',
    upcoming: [
      'Planning des prochaines heures avec le tier de chaque nœud',
      'Nœuds favoris et rappels',
      'Historique des runs lu depuis EE.log (durée, drones)'
    ]
  }
]

function App(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-lg font-semibold tracking-tight">WF Compagnon</h1>
        <Badge variant="secondary">Squelette</Badge>
      </header>

      <main className="flex-1 p-6">
        <Tabs defaultValue={sections[0].id}>
          <TabsList>
            {sections.map(({ id, label, icon: Icon }) => (
              <TabsTrigger key={id} value={id}>
                <Icon aria-hidden="true" />
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sections.map(({ id, label, description, upcoming }) => (
            <TabsContent key={id} value={id} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <h2>{label}</h2>
                    <Badge variant="outline">À venir</Badge>
                  </CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="text-muted-foreground list-disc space-y-1 pl-5 text-sm">
                    {upcoming.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  )
}

export default App
