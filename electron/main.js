import { app, BrowserWindow, shell, ipcMain, Menu, screen } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow = null;
let floatingWindow = null;

/* 浮动窗两态尺寸：收起为小太阳按钮，展开为速记卡片 */
const COLLAPSED_SIZE = { width: 72, height: 72 };
const EXPANDED_SIZE = { width: 340, height: 190 };

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    // 自定义标题栏（方案 A）：隐藏原生标题栏，只保留配色定制的窗口控制按钮，
    // 保留 Win11 贴靠布局/Aero Shake/双击最大化等全部原生能力
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'hidden',
    titleBarOverlay: {
      color: '#dff6f3', // 与页面天空蓝渐变顶部一致，视觉无缝
      symbolColor: '#5c4b37', // 深棕符号色，贴合动森主题
      height: 40,
    },
    // Windows 任务栏/标题栏用 ICO（PNG 在部分系统上任务栏会显示空白）；mac/Linux 用 PNG
    icon: path.join(__dirname, process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // ESM preload 需要关闭 sandbox
    },
    title: '我的个人岛 | MyDay',
    show: false,
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 所有外部链接都用系统默认浏览器打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (url !== mainWindow.webContents.getURL()) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // 主窗口关闭 = 隐藏到后台（浮动小太阳继续常驻），应用退出时才真正销毁
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** 打开/唤起主窗口（浮动窗右键菜单用） */
function showMainWindow() {
  if (!mainWindow) {
    createWindow();
  } else {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
}

/* ---------- 浮动窗位置持久化（userData/floating-position.json） ---------- */
const positionFile = () => path.join(app.getPath('userData'), 'floating-position.json');

const loadFloatingPosition = () => {
  try {
    const pos = JSON.parse(fs.readFileSync(positionFile(), 'utf-8'));
    if (Number.isFinite(pos.x) && Number.isFinite(pos.y)) {
      // 保存的位置需仍在某块屏幕可见区域内（防拔显示器后窗口丢失）
      const visible = screen.getAllDisplays().some((d) => {
        const a = d.workArea;
        return pos.x >= a.x - 40 && pos.y >= a.y - 40 && pos.x < a.x + a.width && pos.y < a.y + a.height;
      });
      if (visible) return pos;
    }
  } catch { /* 首次启动无文件 */ }
  return null;
};

const saveFloatingPosition = () => {
  if (!floatingWindow) return;
  try {
    const [x, y] = floatingWindow.getPosition();
    fs.writeFileSync(positionFile(), JSON.stringify({ x, y }));
  } catch { /* 写盘失败忽略 */ }
};

/** 默认位置：主屏工作区右下角 */
const defaultFloatingPosition = () => {
  const a = screen.getPrimaryDisplay().workArea;
  return {
    x: a.x + a.width - COLLAPSED_SIZE.width - 24,
    y: a.y + a.height - COLLAPSED_SIZE.height - 48,
  };
};

function createFloatingWindow() {
  const pos = loadFloatingPosition() ?? defaultFloatingPosition();
  floatingWindow = new BrowserWindow({
    ...COLLAPSED_SIZE,
    x: pos.x,
    y: pos.y,
    frame: false,
    transparent: true,
    // macOS 必须显式设置透明背景色（默认 #FFF 会盖成白底，Windows 无此问题）
    backgroundColor: '#00000000',
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'floating-preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false, // ESM preload 需要关闭 sandbox
    },
  });
  floatingWindow.setAlwaysOnTop(true, 'screen-saver');
  floatingWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  floatingWindow.loadFile(path.join(__dirname, 'floating.html'));

  // 位置保存时机：拖拽结束 + 窗口关闭（展开/收起时的程序性位移不落盘）
  floatingWindow.on('close', saveFloatingPosition);
  // 兜底：失焦时若拖拽定时器仍在跑则停掉（mac 上 pointerup 可能丢失导致太阳黏住光标）
  floatingWindow.on('blur', () => {
    if (floatingDragTimer) {
      clearInterval(floatingDragTimer);
      floatingDragTimer = null;
      floatingDragAnchor = null;
    }
  });
  floatingWindow.on('closed', () => {
    floatingWindow = null;
    // 浮动窗是应用最后的驻留形态，它被销毁才真正退出
    app.quit();
  });

  // 右键菜单：打开主窗口 / 退出
  floatingWindow.webContents.on('context-menu', () => {
    Menu.buildFromTemplate([
      { label: '打开主窗口', click: showMainWindow },
      { type: 'separator' },
      { label: '退出', click: () => app.quit() },
    ]).popup({ window: floatingWindow });
  });
}

/* ---------- IPC ---------- */

// 浮动窗速记 → 转发主窗口（主窗口未开则先静默创建，加载完成后再投递）
ipcMain.on('quick-inspiration', (_e, text) => {
  if (typeof text !== 'string' || !text.trim()) return;
  if (!mainWindow) createWindow();
  const relay = () => mainWindow?.webContents.send('add-inspiration', text);
  if (mainWindow.webContents.isLoading()) {
    mainWindow.webContents.once('did-finish-load', relay);
  } else {
    relay();
  }
});

// 浮动窗收起/展开：以右下角为锚点缩放，并限制在主屏工作区内
ipcMain.on('floating-set-expanded', (_e, expanded) => {
  if (!floatingWindow) return;
  const size = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;
  const [x, y] = floatingWindow.getPosition();
  const [w, h] = floatingWindow.getSize();
  const a = screen.getPrimaryDisplay().workArea;
  const nx = Math.min(Math.max(x + w - size.width, a.x), a.x + a.width - size.width);
  const ny = Math.min(Math.max(y + h - size.height, a.y), a.y + a.height - size.height);
  floatingWindow.setBounds({ x: nx, y: ny, width: size.width, height: size.height });
});

/* 浮动窗拖拽换位：主进程以固定频率轮询光标位置移动窗口。
 * 不能用渲染层上报的 screenX——高分屏缩放下它与 setPosition 坐标系不一致，窗口会漂移 */
let floatingDragTimer = null;
let floatingDragAnchor = null;

ipcMain.on('floating-drag-start', () => {
  if (!floatingWindow || floatingDragTimer) return;
  const cursor = screen.getCursorScreenPoint();
  const [wx, wy] = floatingWindow.getPosition();
  floatingDragAnchor = { cursorX: cursor.x, cursorY: cursor.y, winX: wx, winY: wy };
  floatingDragTimer = setInterval(() => {
    if (!floatingWindow || !floatingDragAnchor) return;
    const p = screen.getCursorScreenPoint();
    floatingWindow.setPosition(
      floatingDragAnchor.winX + Math.round(p.x - floatingDragAnchor.cursorX),
      floatingDragAnchor.winY + Math.round(p.y - floatingDragAnchor.cursorY),
    );
  }, 16);
});

ipcMain.on('floating-drag-end', () => {
  if (floatingDragTimer) {
    clearInterval(floatingDragTimer);
    floatingDragTimer = null;
  }
  floatingDragAnchor = null;
  saveFloatingPosition();
});

app.whenReady().then(() => {
  createWindow();
  createFloatingWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
      createFloatingWindow();
    }
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
});

// 有浮动窗常驻时不会触发；全部关闭（含浮动窗）时退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
