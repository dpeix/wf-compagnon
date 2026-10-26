import { app, shell, screen, BrowserWindow } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { isSafeExternalUrl } from './external-links'

function openHttpsExternally(url: string): void {
  if (!isSafeExternalUrl(url)) return
  shell.openExternal(url).catch((error: unknown) => {
    console.error('Failed to open external link', error)
  })
}

function logLoadError(error: unknown): void {
  console.error('Failed to load the renderer', error)
}

// Size of the Figma mockup frames: the market overview needs 1280px for its 4 KPI columns
const PREFERRED_SIZE = { width: 1280, height: 800 }
const MIN_SIZE = { width: 960, height: 600 }

function createWindow(): void {
  // Small or scaled screens (e.g. 1366×768 at 125 %) get a window that still fits
  const workArea = screen.getPrimaryDisplay().workAreaSize
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: Math.min(PREFERRED_SIZE.width, workArea.width),
    height: Math.min(PREFERRED_SIZE.height, workArea.height),
    minWidth: Math.min(MIN_SIZE.width, workArea.width),
    minHeight: Math.min(MIN_SIZE.height, workArea.height),
    useContentSize: true,
    title: 'WF Compagnon',
    // Matches the dark theme background to avoid a white flash on startup
    backgroundColor: '#0a0a0a',
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // The window never navigates away from the app: links open in the default browser instead
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openHttpsExternally(url)
    return { action: 'deny' }
  })
  mainWindow.webContents.on('will-navigate', (event, url) => {
    event.preventDefault()
    openHttpsExternally(url)
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL).catch(logLoadError)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html')).catch(logLoadError)
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app
  .whenReady()
  .then(() => {
    // Set app user model id for windows
    electronApp.setAppUserModelId('com.dpeix.wf-compagnon')

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })
  .catch((error: unknown) => {
    // Without a window the process would stay alive in the background
    console.error('Failed to start the app', error)
    app.quit()
  })

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
