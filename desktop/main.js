/* nDashboard für Windows und macOS: Electron-Hülle um die gemeinsame Oberfläche web/
 * (wie android/ und linux/). Updates: Windows über electron-updater aus den GitHub-Releases,
 * macOS (nicht signiert) per Hinweis und Download-Link in der App. */
const { app, BrowserWindow, ipcMain, shell, session } = require('electron');
const fs = require('fs');
const path = require('path');

// Im Paket liegt web/ unter resources/, beim Entwickeln (npm start) daneben
const WEB = app.isPackaged ? path.join(process.resourcesPath, 'web') : path.join(__dirname, '..', 'web');
let win = null;

// Windows ordnet Benachrichtigungen der App über diese ID zu (wie appId in package.json)
app.setAppUserModelId('de.nikesieg4.nDashboard');
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });

function createWindow() {
  win = new BrowserWindow({
    width: 1280, height: 860, minWidth: 360, minHeight: 560,
    backgroundColor: '#121212', autoHideMenuBar: true, title: 'nDashboard',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, sandbox: true }
  });
  win.loadFile(path.join(WEB, 'index.html'));

  // Links nach außen (GitHub-Release, Hilfe) im Browser öffnen, nie in der App navigieren
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:\/\//.test(url)) shell.openExternal(url); }
  });
  win.on('closed', () => { win = null; });
}

/** Downloads (NAS-Dateien, CSV/JSON-Exporte) direkt in den Download-Ordner, ohne Dialog – wie das Flatpak. */
function saveDownloads() {
  session.defaultSession.on('will-download', (_e, item) => {
    const dir = app.getPath('downloads');
    const name = path.basename(item.getFilename()) || 'download';
    const ext = path.extname(name), base = name.slice(0, name.length - ext.length);
    let target = path.join(dir, name);
    for (let i = 1; fs.existsSync(target); i++) target = path.join(dir, `${base} (${i})${ext}`);
    item.setSavePath(target);
  });
}

/* ---------- Updates ---------- */
// macOS installiert Updates nur bei signierten Apps; dort zeigt die App einen Download-Link
const CAN_UPDATE = app.isPackaged && process.platform === 'win32';
ipcMain.handle('nd:info', () => ({ platform: process.platform, canUpdate: CAN_UPDATE, version: app.getVersion() }));
ipcMain.handle('nd:update', async () => {
  if (!CAN_UPDATE) return false;
  const { autoUpdater } = require('electron-updater');
  autoUpdater.autoDownload = false;
  const r = await autoUpdater.checkForUpdates();
  if (!r || !r.isUpdateAvailable) return false;
  await autoUpdater.downloadUpdate();
  // Installer still ausführen und die neue Version starten
  setImmediate(() => autoUpdater.quitAndInstall(true, true));
  return true;
});

app.whenReady().then(() => {
  saveDownloads();
  createWindow();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
