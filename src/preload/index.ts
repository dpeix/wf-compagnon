import { contextBridge, ipcRenderer } from 'electron'
import { MARKET_CHANNELS, type MarketApi } from '../shared/market'

// The main process validates warframe.market data before answering (src/main/market/schemas.ts):
// the values received here have the shared types of src/shared/market.ts.
function invoke<T>(channel: string, ...args: unknown[]): Promise<T> {
  return ipcRenderer.invoke(channel, ...args)
}

const market: MarketApi = {
  getOverview: (fresh = false) => invoke(MARKET_CHANNELS.overview, fresh),
  getItem: (slug, fresh = false) => invoke(MARKET_CHANNELS.item, slug, fresh)
}

// Typed API exposed to the renderer as window.api. Each feature adds narrow methods here
// (one IPC channel per action); ipcRenderer itself is never exposed.
const api = { market }

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
