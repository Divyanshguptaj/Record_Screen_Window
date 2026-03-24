import { app, BrowserWindow, ipcMain, desktopCapturer, shell, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Must be called before app is ready.
// Fixes green-screen artifacts on Windows when GPU encodes desktopCapturer frames.
app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0f1117',
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html'));
  mainWindow.webContents.openDevTools({ mode: 'detach' });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC Handlers ─────────────────────────────────────────────────────────────

ipcMain.handle('get-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen', 'window'],
    thumbnailSize: { width: 320, height: 200 },
  });
  return sources.map((s) => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL(),
    appIconUrl: s.appIcon?.toDataURL() ?? null,
  }));
});

ipcMain.handle('save-buffer', async (_event, folderName: string, fileName: string, buffer: ArrayBuffer) => {
  const videosDir = path.join(app.getPath('videos'), 'screen-recorder');
  const sessionDir = path.join(videosDir, folderName);
  fs.mkdirSync(sessionDir, { recursive: true });
  fs.writeFileSync(path.join(sessionDir, fileName), Buffer.from(buffer));
  return sessionDir;
});

ipcMain.handle('rename-session', async (_event, oldName: string, newName: string) => {
  const videosDir = path.join(app.getPath('videos'), 'screen-recorder');
  const oldPath = path.join(videosDir, oldName);
  const newPath = path.join(videosDir, newName);
  if (fs.existsSync(oldPath)) {
    fs.renameSync(oldPath, newPath);
    return newPath;
  }
  return null;
});

ipcMain.handle('open-folder', async (_event, folderPath: string) => {
  shell.openPath(folderPath);
});

ipcMain.handle('choose-save-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window-close', () => mainWindow?.close());
