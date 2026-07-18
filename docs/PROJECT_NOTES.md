# MyDay 项目速查文档

## 项目简介

**我的个人岛 | MyDay**：一个动森（Animal Crossing）风格的个人管理桌面应用，用于管理任务看板、健康（体重）、学习进度、赚钱任务、今日动态与灵感收集。支持浏览器运行与 Electron 打包。

## 技术栈

- **框架**：Vue 3（`<script setup>` SFC）+ TypeScript
- **构建工具**：Vite 7
- **桌面壳**：Electron 33 + electron-builder（NSIS 安装包）
- **UI 组件库**：`animal-island-vue`（本地依赖，路径 `../animal-island-vue`）
- **富文本**：@vueup/vue-quill + DOMPurify（XSS 消毒）
- **图表**：ECharts 6（按需引入）
- **样式**：CSS 变量 + 组件库自带 Less 样式
- **数据持久化**：`localStorage`，key 为 `myday`，schema v3（含版本迁移）

## 目录结构

```
D:\project\MyDay
├── index.html              # Vite 入口
├── package.json            # 依赖、脚本与 electron-builder 配置
├── vite.config.ts          # Vite 配置（@/ 别名、optimizeDeps、fs.allow）
├── electron/
│   ├── main.js             # Electron 主进程（窗口、图标、外链拦截）
│   ├── preload.js          # 预加载脚本
│   └── icon.png            # 运行时窗口图标
├── build/icon.png|ico      # 打包图标（npm run icon 生成）
├── scripts/make-icon.mjs   # 图标生成脚本（jimp + png-to-ico）
├── src/
│   ├── main.ts             # 应用入口（animal-island-vue/style、quill snow css、style.css）
│   ├── App.vue             # 应用壳：动态背景、页头、欢迎卡、Tabs 容器、全局弹层
│   ├── style.css           # 全局样式（token、日历、时间线、进度条、quill 适配等）
│   ├── lib/echarts.ts      # ECharts 按需注册（只注册一次）
│   ├── components/
│   │   ├── CustomSelect.vue        # 自定义下拉（Teleport body，弹窗内不裁剪）
│   │   ├── DatePickerModal.vue     # 动森风格日期选择弹窗
│   │   ├── DetailDrawers.vue       # 学习/赚钱详情抽屉（跨面板共享）
│   │   ├── DeleteConfirmModal.vue  # 共享删除确认弹窗
│   │   ├── InspirationComposer.vue # 💡 浮动按钮 + 灵感记录弹窗（根级）
│   │   └── panels/                 # 7 个 Tab 面板（Tasks/Health/Study/Money/Today/Inspiration/Backup）
│   ├── composables/
│   │   ├── useMyDayStorage.ts      # 状态单例 + localStorage 读写 + v1→v2 迁移
│   │   ├── useTodayLog.ts          # pushTodayLog
│   │   ├── useDetailDrawers.ts     # 详情抽屉状态（单例）
│   │   ├── useDeleteConfirm.ts     # 删除确认状态（单例，含级联删任务）
│   │   ├── useTaskMoneySync.ts     # 赚钱任务 → 看板任务自动同步
│   │   └── usePanelUiState.ts      # 面板视图状态单例（切 Tab 不丢）
│   ├── types/index.ts              # 全部数据模型（MyDayState v2）
│   └── utils/
│       ├── date.ts                 # todayStr / formatDateStr / pad
│       ├── task.ts                 # 任务时段/截止判定、关联解析
│       ├── labels.ts               # studyTypeText / statusText / categoryName
│       └── sanitize.ts             # DOMPurify 富文本消毒
└── release/                # 打包产物（win-unpacked 为中间目录，可删）
```

## 运行命令

```bash
cd D:\project\MyDay

npm run dev               # 浏览器开发预览 http://localhost:5173/
npm run build             # 生产构建（vue-tsc 类型检查 + vite build）
npm run preview           # 预览构建产物 http://localhost:4173/
npm run electron:dev      # Electron 开发模式（需先启动 vite）
npm run electron:build:win  # Windows NSIS 安装包 → release/MyDay Setup x.y.z.exe
npm run icon              # 从 public/sun.png 重新生成打包图标
```

> 如果 PowerShell 提示 `无法加载 npm.ps1`，执行一次：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

## 主要功能模块

| Tab | 功能 |
|-----|------|
| 任务 | 四列看板（今日/待开始/进行中/已完成）、拖拽换列、截止时间、计划时段、关联学习/赚钱、富文本描述、时段环形图统计 |
| 健康 | 体重日历（月份切换）、SVG 趋势曲线（7/30 天/全部） |
| 学习 | 视频/书籍/技能三类学习项、自动进度、分页、行拖拽排序、详情 Drawer、默认隐藏已完成 |
| 赚钱 | 三张汇总卡、任务表（分页/隐藏已完成/按截止排序）、日历视图、长期规划（富文本） |
| 动态 | 今日时间线、今日报告（自动汇总） |
| 灵感 | 独立存储的灵感列表（跨天保留）、逐条删除、右下角 💡 全局记录按钮 |
| 备份 | 导出/导入 JSON（兼容 v1 老数据自动迁移）、清空全部数据 |

## 关键实现说明

### 1. 组件库本地依赖

`animal-island-vue` 通过本地路径安装（`file:../animal-island-vue`）。库源码更新后需先在其目录 `npm run build`，再回本项目重新 `npm install`（file 依赖为复制安装，不会自动同步）。

### 2. 模块拆分与状态单例

- `App.vue` 已拆分为应用壳 + 7 个面板组件（`src/components/panels/`）。
- `useMyDayStorage()` 返回**模块级单例**：state 在模块作用域，`ensureLoaded` flag 防重，自动保存 watch 模块加载时注册一次。
- **reactive 数组只能 splice/push/改属性，禁止整体重新赋值**（会断开其他组件的引用）。
- 组件库 `Tabs` 用 `v-if` 只渲染激活面板，面板切 Tab 即卸载 → 视图状态放 `usePanelUiState` 单例；瞬态（表单、弹窗开关）留组件内。
- 跨面板弹层（详情抽屉、删除确认、💡 灵感按钮）必须挂 App 根组件。

### 3. 共享 composables 速查

| 需求 | 从哪里取 |
|------|----------|
| 读写持久化数据 | `useMyDayStorage()`（weights/studyItems/moneyItems/moneyPlan/todayLogs/tasks/inspirations/activeTab/chartRange/isLoaded/saveState） |
| 写今日动态 | `useTodayLog().pushTodayLog(category, content)` |
| 打开学习/赚钱详情 | `useDetailDrawers().openDetail / openMoneyDetail` |
| 删除学习/赚钱项（带确认、级联、日志） | `useDeleteConfirm().openDelete('study'\|'money', id)` |
| 赚钱任务同步看板 | `useTaskMoneySync().autoCreateTodayTaskFromMoney / syncAutoTodayTaskForMoney` |
| 面板视图状态 | `usePanelUiState()`（currentMonth/selectedDate/studyType/showCompletedStudy/studyPage/moneyView/moneyPage/moneyCalendarMonth/moneyPlanDraft） |
| 任务时段/截止工具 | `utils/task.ts`（getCurrentTimeSlot/isDeadlineWithinDays/parseTaskLink/formatTaskLink） |
| 文案 | `utils/labels.ts`（studyTypeText/statusText/categoryName） |

### 4. 数据兼容（v1 → v3）

`migrateMyDayState()`（在 useMyDayStorage.ts）统一处理本地加载与 JSON 导入：`moneyItems.plan → description`、旧 todayLogs 中的灵感提取到 `inspirations`、日志补 `date`、过滤示例数据、缺失字段补默认值（v3 新增 weightUnit 体重单位，默认 kg）。保存/导出写 `version: 3`。

### 5. Modal 使用注意

- `v-model:open` 控制显隐；自定义底部按钮必须同时 `:show-footer="true"`
- 动态内容建议 `:typewriter="false"`
- 弹窗内下拉用 `CustomSelect`（库 Select 会被裁剪）
- **z-index 层级**：Loading 9999 > DatePickerModal 1200 > 任务弹窗 1100 > 普通弹窗/💡 按钮 1000

### 6. Loading 组件

不是包裹组件，需作为同级绝对定位元素使用（见 App.vue 根部的 fixed 用法）。

### 7. 表格插槽作用域

库中 `Table` 插槽作用域是 `{ record, value, index }`，不是 `{ row }`。

### 8. 打包与图标

- Windows 为 NSIS 一键安装包（当前用户、无需管理员），自动建桌面/开始菜单快捷方式
- 版本更新/卸载都不会删除数据（数据在 `%APPDATA%\MyDay`，与程序目录分离）
- 窗口图标 = `electron/icon.png`（随包内嵌）；exe 图标 = `build/icon.ico`（`npm run icon` 从 `public/sun.png` 生成）
- portable 单文件会每次启动解压所以慢，已弃用改用 NSIS

## 最近改动摘要

- **App.vue（2693 行）按 Tab 拆分为 7 个面板组件 + 共享 composables**，App.vue 保留约 230 行应用壳
- useMyDayStorage 改为模块级单例；新增 useTodayLog/useDetailDrawers/useDeleteConfirm/useTaskMoneySync/usePanelUiState
- DatePickerModal 三态路由简化为各弹窗独立实例
- NSIS 安装包替代 portable；太阳图标嵌入 exe 与窗口

## 已知小问题

- `/vite.svg` favicon 会 404，不影响功能
- `WeddingInvitation` 未接入（库未导出该组件）
- HMR 热更新时模块级 state 会重建并从 localStorage 重读，开发时面板改动后内存态回退到落盘态
- Chrome 浏览器、Electron dev、Electron 打包后三者 localStorage 互不相通（源不同），迁移靠备份页导出/导入

## 后续建议

- 如需继续新增功能，建议每完成 1-2 个改动就提交/保存，避免上下文窗口吃紧
- 书架/菜谱板块（待办）：图片与 Markdown 迁主进程文件存储（方案A），Markdown 从 JSON 解放
