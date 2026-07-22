# MyDay 新功能实施计划

> 日期：2026-07-18
> 状态：功能二已实现（v0.2.0，提交 4e577a4）；功能一待实施

---

## 功能一：自定义标题栏（Windows 窗口控制区）

### 背景

Windows 默认标题栏（最小化/最大化/关闭那一行）与动森风格不搭，希望自定义其样式。

### 方案对比

| 方案 | 做法 | 优点 | 代价 |
|------|------|------|------|
| **A. 覆盖层配色（推荐先行）** | `titleBarStyle: 'hidden'` + `titleBarOverlay` 配置背景色/符号色/高度 | 改动极小；保留全部原生能力（Win11 贴靠布局、Aero Shake、拖拽分屏） | 按钮样式仍是原生，只能改色 |
| **B. 完全自绘** | `frame: false`，自己画三个窗口控制按钮 | 视觉自由，可做成动森圆润风格 | Win11 Snap Layouts 失效；双击标题栏最大化需自补；需写 IPC |

### 推荐实施：方案 A

**改动文件：**

1. `electron/main.js` — `BrowserWindow` 增加：
   ```js
   titleBarStyle: 'hidden',
   titleBarOverlay: {
     color: '#dff6f3',        // 与页面天空蓝一致
     symbolColor: '#5c4b37',  // 深棕文字色
     height: 40,
   },
   ```
2. `src/App.vue` / `src/style.css` — 页头区域加 `-webkit-app-region: drag`；页头内交互元素（Time 组件等）加 `-webkit-app-region: no-drag`
3. 检查 header 布局在顶部内嵌后的间距表现

**验证：** 最大化/最小化/关闭按钮可用且配色融入主题；拖标题栏可移动窗口；Win11 悬停最大化按钮仍出贴靠布局。

### 可选升级：方案 B（后续想要更强定制时再做）

- `electron/preload.js` 用 `contextBridge` 暴露 `winApi.minimize/toggleMaximize/close`
- `electron/main.js` 注册对应 `ipcMain.on` 处理器
- App.vue 页头右侧自绘三个控制按钮（动森圆润风）
- 手动补双击标题栏切换最大化

---

## 功能二：桌面浮动按钮 · 速记灵感

### 背景

希望在 Windows 桌面上常驻一个浮动按钮，点击就地展开输入框，速记灵感并直接落入应用的「灵感」板块，无需先打开主窗口。

### 交互设计

```
收起态: [ 🌞 ]  小太阳浮动按钮（约 72×72，无边框、置顶、不进任务栏、可拖动换位）
   ↓ 点击
展开态: 同一窗口扩大为输入卡片（动森羊皮纸风）
        ┌────────────────────┐
        │ 突然想到什么？        │
        │ [记录]      [ESC 收起] │
        └────────────────────┘
   ↓ 保存
IPC → 主进程 → 主窗口 → inspirations.push() + Notification
```

### 技术方案

1. **浮动窗**：第二个 `BrowserWindow`（`frame: false`、`alwaysOnTop: true`、`skipTaskbar: true`、透明背景圆角），收起/展开为同一窗口切换尺寸，比开两个窗口简单
2. **数据链路**：浮动窗**不直接碰 localStorage**（多窗口 renderer 内存态不共享），走 IPC：
   - 浮动窗 `floating-preload.js` 暴露 `sendInspiration(text)`
   - 主进程 `ipcMain.on('quick-inspiration')` 转发给主窗口 `mainWindow.webContents.send('add-inspiration', text)`
   - 主窗口 `preload.js` 增加 `onAddInspiration(cb)` 桥
   - 渲染侧注册监听（App.vue 或小 composable）：`inspirations.push({...})` → 单例 watch 自动落盘 + `Notification.success('灵感已记录')`
3. **UI 文件**：新增 `electron/floating.html`（原生 JS，不进 Vite 打包体系，`loadFile` 直接加载；electron/ 目录本就在打包 files 列表内）
4. **位置记忆**：拖动结束后把窗口坐标写入 `userData/floating-position.json`，启动时还原
5. **生命周期（方案 A：常驻）**：
   - 修改 `window-all-closed`：主窗口关闭 → 应用不退，只留小太阳
   - 浮动按钮右键菜单：「打开主窗口 / 退出」
   - 主窗口关闭后再次「打开主窗口」→ 重新 createWindow()

### 改动文件清单

| 文件 | 改动 |
|------|------|
| `electron/floating.html` | 新增：收起/展开两态 UI + 内联脚本 |
| `electron/floating-preload.js` | 新增：contextBridge 暴露发送/菜单接口 |
| `electron/main.js` | 浮动窗创建、尺寸切换、位置持久化、IPC 转发、生命周期改造 |
| `electron/preload.js` | 主窗口侧增加 `onAddInspiration` 桥 |
| `src/App.vue`（或新 composable） | 注册灵感接收监听，写入 inspirations 单例 |

### 验证

1. 主窗口开着：点太阳 → 输入 → 保存 → 灵感页出现记录 + 通知弹出
2. 主窗口关着：同样速记成功；右键菜单能重开主窗口和退出
3. 拖动浮动按钮换位，重启应用后位置保持
4. 速记的内容刷新/重启后仍在（确认落盘链路完整）

---

## 实施顺序建议

1. **功能一方案 A**（约 30 分钟）：独立、低风险，先落袋
2. **功能二**（约 2-3 小时）：涉及多窗口与 IPC，随后做
3. 功能一方案 B 作为以后的可选升级，不阻塞任何事项
