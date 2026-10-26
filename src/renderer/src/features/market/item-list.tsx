import { ItemRow } from './item-row'
import type { MarketItemSummary } from './types'

interface ItemListProps {
  items: readonly MarketItemSummary[]
  subtitle: (item: MarketItemSummary) => string
}

export function ItemList({ items, subtitle }: ItemListProps): React.JSX.Element {
  if (items.length === 0) {
    return <p className="px-2 py-4 text-sm text-muted-foreground">Aucun objet pour le moment.</p>
  }
  return (
    <ul>
      {items.map((item) => (
        <ItemRow key={item.slug} item={item} subtitle={subtitle(item)} />
      ))}
    </ul>
  )
}
