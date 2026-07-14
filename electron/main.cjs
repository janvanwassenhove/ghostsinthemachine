// Desktop shell for Ghosts in the Machine.
//
// The renderer is the *exact* static bundle that ships to GitHub Pages: Vite is
// configured with `base: './'`, so `dist/index.html` loads happily from file://.
// Nothing game-side knows or cares that it is running inside Electron.
const path = require('node:path');
const { app, shell, BrowserWindow, Menu, nativeTheme } = require('electron');
const { autoUpdater } = require('electron-updater');

const isPackaged = app.isPackaged;
const isMac = process.platform === 'darwin';

// Title-bar height must match #titlebar in style.css so the native window
// controls line up with the game-styled strip beneath them.
const TITLE_BAR_HEIGHT = 34;

/**
 * Auto-update against the GitHub Releases feed that electron-builder publishes
 * (latest.yml / latest-mac.yml alongside the installers). If the installed
 * version is lower than the latest release, the update downloads in the
 * background and installs on quit.
 *
 * NOTE: Squirrel.Mac validates the app's code signature before applying an
 * update, so this is a no-op on unsigned macOS builds — it fails with
 * "Could not get code signature" and we swallow it. Add an Apple Developer
 * certificate (see README) and mac updates start working with no code change.
 */
function initAutoUpdate() {
  if (!isPackaged) return; // dev runs have no update feed
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = null;
  // Never let an update problem take the game down with it.
  autoUpdater.on('error', (err) => {
    console.error('[updater]', err && err.message ? err.message : err);
  });
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[updater] check failed:', err && err.message ? err.message : err);
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 780, // 720 of canvas + the title strip + a little slack
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b0e12',
    title: 'Ghosts in the Machine',
    show: false,
    // Hide the OS title bar and draw our own strip; keep native window controls
    // but theme them to the game. macOS keeps its (inset) traffic lights.
    ...(isMac
      ? { titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 12, y: 10 } }
      : {
          titleBarStyle: 'hidden',
          titleBarOverlay: {
            color: '#0b0e12', // caption-button strip background
            symbolColor: '#7ee8a2', // the min/max/close glyphs
            height: TITLE_BAR_HEIGHT,
          },
        }),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once('ready-to-show', () => win.show());

  // Any link the game opens goes to the real browser, never an in-app window.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  const devServer = process.env.VITE_DEV_SERVER_URL;
  if (devServer) win.loadURL(devServer);
  else win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// One game at a time; a second launch focuses the existing window.
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });

  app.whenReady().then(() => {
    // A game needs no application menu; dropping it also removes the Alt-key
    // menu flash on Windows. Force dark so any native chrome matches the game.
    Menu.setApplicationMenu(null);
    nativeTheme.themeSource = 'dark';
    createWindow();
    initAutoUpdate();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
