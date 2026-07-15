import { contextBridge } from 'electron';

// 暂不需要暴露任何 Node/Electron API 给渲染进程
// 应用仅使用 localStorage 进行本地数据持久化
contextBridge.exposeInMainWorld('electronAPI', {});
