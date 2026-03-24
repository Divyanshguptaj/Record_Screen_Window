import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  saveBuffer: (folder: string, file: string, buffer: ArrayBuffer) =>
    ipcRenderer.invoke('save-buffer', folder, file, buffer),
  renameSession: (oldName: string, newName: string) =>
    ipcRenderer.invoke('rename-session', oldName, newName),
  openFolder: (folderPath: string) => ipcRenderer.invoke('open-folder', folderPath),
  chooseSaveDir: () => ipcRenderer.invoke('choose-save-dir'),
  windowMinimize: () => ipcRenderer.invoke('window-minimize'),
  windowMaximize: () => ipcRenderer.invoke('window-maximize'),
  windowClose: () => ipcRenderer.invoke('window-close'),
});
