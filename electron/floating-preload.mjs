import { contextBridge, ipcRenderer } from 'electron';

// 浮动窗桥：只暴露最小接口，渲染侧无任何 Node 能力
contextBridge.exposeInMainWorld('floatingAPI', {
  /** 速记内容 → 主进程转发主窗口 */
  sendInspiration: (text) => ipcRenderer.send('quick-inspiration', text),
  /** 收起/展开状态变化 → 主进程调整窗口尺寸 */
  setExpanded: (expanded) => ipcRenderer.send('floating-set-expanded', expanded),
});
