import { contextBridge } from 'electron'

// Typed API exposed to the renderer as window.api. Each feature adds narrow methods here
// (one IPC channel per action); ipcRenderer itself is never exposed.
const api = {}

export type Api = typeof api

contextBridge.exposeInMainWorld('api', api)
