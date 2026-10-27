// IPC handlers of the market: the renderer can only ask for these two things,
// and the arguments it sends are checked before use.
import { ITEM_SLUG_PATTERN, MARKET_CHANNELS } from '../../shared/market'
import type { MarketService } from './service'

/** The part of Electron's ipcMain used here (kept small so it can be faked in tests). */
export interface IpcHandle {
  handle: (channel: string, listener: (event: unknown, ...args: unknown[]) => unknown) => void
}

/** `fresh` is optional (false) and must be a boolean. */
function freshFlag(value: unknown): boolean {
  if (value === undefined) return false
  if (typeof value !== 'boolean') throw new RangeError('Invalid refresh flag')
  return value
}

export function registerMarketIpc(ipc: IpcHandle, service: MarketService): void {
  ipc.handle(MARKET_CHANNELS.overview, async (_event, fresh) =>
    service.getOverview(freshFlag(fresh))
  )
  ipc.handle(MARKET_CHANNELS.item, async (_event, slug, fresh) => {
    if (typeof slug !== 'string' || !ITEM_SLUG_PATTERN.test(slug)) {
      throw new RangeError('Invalid item slug')
    }
    return service.getItemDetail(slug, freshFlag(fresh))
  })
}
