// Desktop shell for Ghosts in the Machine.
//
// The renderer is the *exact* static bundle that ships to GitHub Pages: Vite is
// configured with `base: './'`, so `dist/index.html` loads happily from file://.
// Nothing game-side knows or cares that it is running inside Electron.
const path = require('node:path');
const { app, shell, BrowserWindow } = require('electron');
const { autoUpdater } = require('electron-updater');

const isPackaged = app.isPackaged;

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
    height: 780, // 720 of canvas + a little chrome
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#0b0e12',
    title: 'Ghosts in the Machine',
    autoHideMenuBar: true,
    show: false,
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
