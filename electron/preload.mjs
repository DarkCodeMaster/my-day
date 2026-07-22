import { contextBridge, ipcRenderer } from 'electron';

// 主窗口桥：接收桌面浮动窗速记的灵感文本
contextBridge.exposeInMainWorld('electronAPI', {
  onAddInspiration: (cb) => ipcRenderer.on('add-inspiration', (_e, text) => cb(text)),
});
