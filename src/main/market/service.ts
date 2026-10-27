// Market data for the screens: combines the client calls of each screen.
import type { ItemDetail, MarketOverviewData } from '../../shared/market'
import type { MarketClient } from './client'
import { bestInGameSell, buildItemDetail, buildOverview, type PartPrice } from './market-data'

export interface MarketService {
  /** `fresh`: skip the caches of the prices and statistics (the "Actualiser" button) */
  getOverview: (fresh: boolean) => Promise<MarketOverviewData>
  getItemDetail: (slug: string, fresh: boolean) => Promise<ItemDetail>
}

interface ServiceOptions {
  client: MarketClient
  /** Items of the overview; each one costs 2 requests (statistics and best orders) */
  trackedSlugs: readonly string[]
  now: () => Date
}

/** The screens show the age of their oldest data: a cached answer can be an hour old. */
function oldest(dates: readonly Date[], fallback: Date): Date {
  return dates.length === 0 ? fallback : new Date(Math.min(...dates.map((d) => d.getTime())))
}

export function createMarketService({ client, trackedSlugs, now }: ServiceOptions): MarketService {
  return {
    getOverview: async (fresh) => {
      const { data: catalog } = await client.catalog()
      const bySlug = new Map(catalog.map((item) => [item.slug, item]))
      const results = await Promise.all(
        trackedSlugs.map(async (slug) => {
          const item = bySlug.get(slug)
          if (!item) return { name: slug, entry: null, fetched: [] }
          try {
            const [stats, top] = await Promise.all([
              client.statistics(slug, { fresh }),
              client.topOrders(slug, item.maxRank, { fresh })
            ])
            return {
              name: item.name,
              entry: { item, stats: stats.data, top: top.data },
              fetched: [stats.fetchedAt, top.fetchedAt]
            }
          } catch (error) {
            // One item down must not hide the others: it is listed as failed instead
            console.warn(`Market overview: could not load ${slug}`, error)
            return { name: item.name, entry: null, fetched: [] }
          }
        })
      )
      const entries = results.flatMap((r) => (r.entry ? [r.entry] : []))
      if (entries.length === 0) {
        throw new Error("Aucun objet suivi n'a pu être chargé depuis warframe.market")
      }
      const failed = results.filter((r) => r.entry === null).map((r) => r.name)
      const time = now()
      return buildOverview(
        entries,
        failed,
        time,
        oldest(
          results.flatMap((r) => r.fetched),
          time
        )
      )
    },

    getItemDetail: async (slug, fresh) => {
      const [item, orders, stats] = await Promise.all([
        client.item(slug),
        client.orders(slug, { fresh }),
        client.statistics(slug, { fresh })
      ])
      const fetched = [orders.fetchedAt, stats.fetchedAt]

      let parts: PartPrice[] | null = []
      // Only for a set: its parts also list the ids of the set in setParts
      if (item.data.setRoot) {
        try {
          // The set endpoint gives the quantity of each part (2 blades for Dual Kamas Prime)
          const set = await client.itemSet(slug)
          const loaded = await Promise.all(
            set.data
              .filter((part) => !part.setRoot && part.id !== item.data.id)
              .map(async (part) => ({
                part,
                top: await client.topOrders(part.slug, part.maxRank, { fresh })
              }))
          )
          parts = loaded.map(({ part, top }) => ({
            name: part.name,
            quantity: part.quantityInSet,
            price: bestInGameSell(top.data)
          }))
          fetched.push(...loaded.map(({ top }) => top.fetchedAt))
        } catch (error) {
          // The set/parts comparison is optional: the screen says it is unavailable (null)
          console.warn(`Item detail: could not load the parts of ${slug}`, error)
          parts = null
        }
      }
      return buildItemDetail(item.data, orders.data, stats.data, parts, oldest(fetched, now()))
    }
  }
}
