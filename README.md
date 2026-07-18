# 我的个人岛 | MyDay

一个动森（Animal Crossing）风格的个人管理桌面应用，集任务看板、健康记录、学习追踪、赚钱管理、今日动态与灵感收集于一体。

![Vue 3](https://img.shields.io/badge/Vue-3.5-42b883)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6)
![Electron](https://img.shields.io/badge/Electron-33-47848f)
![Vite](https://img.shields.io/badge/Vite-7-646cff)

## 功能特性

### 📋 任务看板
- 四列看板：今日任务 / 待开始 / 进行中 / 已完成，卡片可拖拽换列
- 拖入「已完成」自动记录完成时间，拖出自动清除
- 任务支持截止时间（可留空为长期任务）、计划时段（凌晨/上午/下午/晚上）
- 可关联学习项或赚钱任务，点击关联直接跳转详情
- 任务描述使用 Quill 富文本编辑器
- 截止 3 天内的任务显示红框提醒；新建时自动分配到对应列
- 赚钱任务临近截止会自动创建关联的今日任务
- 今日任务列提供「📊 时段」环形图统计（ECharts），点击时段可查看并编辑该时段任务

### 🌿 健康
- 体重日历：按日期记录体重，支持月份切换，Tooltip 悬浮查看
- 趋势曲线：SVG 折线图，支持近 7 天 / 30 天 / 全部范围切换

### 📚 学习
- 视频 / 书籍 / 技能三类学习项管理
- 视频按课数、书籍按页数自动计算进度
- 默认隐藏已完成项，可用开关切换显示
- 表格支持分页（每页 10 条）、整行拖拽排序、点击行打开底部详情 Drawer
- 视频链接可在系统浏览器中打开

### 💰 赚钱
- 汇总卡片：已到账收入 / 进行中预估 / 总任务数
- 三种视图：任务表 / 日历视图 / 长期规划
- 任务表默认隐藏已完成，按截止日期排序，支持分页
- 日历视图展示当月每日截止的任务
- 长期规划与任务描述均使用 Quill 富文本编辑
- 自定义动森风格日期选择器（DatePickerModal）

### 📖 动态
- 今日时间线：自动汇总各模块的操作记录
- 今日报告：按记录自动生成的当日小结

### 💡 灵感
- 独立存储的灵感记录（v2 起不再混入今日动态，可跨天长期保留）
- 支持逐条删除

### 💾 备份
- 一键导出 JSON（复制 / 下载文件）
- 粘贴或上传 JSON 导入，带结构校验与二次确认
- **兼容老版本数据**：自动迁移 v1 → v2（见下文「数据与持久化」）
- 清空全部数据（含长期规划与灵感），二次确认并立即落盘

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | Vue 3（`<script setup>` SFC）+ TypeScript |
| 构建 | Vite 7 |
| 桌面壳 | Electron 33 + electron-builder |
| UI 组件库 | [animal-island-vue](https://github.com/guokaigdg/animal-island-vue)（本地 `file:` 依赖） |
| 富文本 | @vueup/vue-quill + DOMPurify（XSS 消毒） |
| 图表 | ECharts 6（按需引入） |
| 持久化 | localStorage（schema v2，含版本迁移） |

## 快速开始

### 前置依赖

本项目通过本地路径依赖 `animal-island-vue`，需保证目录结构如下：

```
D:\project\
├── animal-island-vue\   ← 组件库（需先构建）
└── MyDay\               ← 本项目
```

先在组件库目录构建一次：

```bash
cd ../animal-island-vue
npm install
npm run build
```

### 安装与运行

```bash
cd MyDay
npm install

# 浏览器开发预览（http://localhost:5173）
npm run dev

# Electron 开发模式（需先启动 vite）
npm run dev
npm run electron:dev
```

### 构建

```bash
# Web 生产构建（vue-tsc 类型检查 + vite build）
npm run build

# Windows NSIS 安装包 → release/MyDay Setup x.y.z.exe
npm run electron:build:win

# macOS dmg（arm64）
npm run electron:build:mac
```

Windows 安装包为一键安装（当前用户、无需管理员权限），自动创建桌面与开始菜单快捷方式。

### 更新应用图标

图标源图为 `public/sun.png`，修改后重新生成打包图标：

```bash
npm run icon
```

该脚本（`scripts/make-icon.mjs`）会将源图居中裁剪为正方形、缩放至 256×256，生成 `build/icon.png` 与 `build/icon.ico`。

## 目录结构

```
MyDay/
├── electron/
│   ├── main.js            # Electron 主进程（窗口、外链拦截、AppUserModelId）
│   ├── preload.js         # 预加载脚本
│   └── icon.png           # 运行时窗口图标（随应用打包）
├── build/
│   ├── icon.png           # 打包图标源（由 npm run icon 生成）
│   └── icon.ico           # Windows 打包图标
├── scripts/
│   └── make-icon.mjs      # 图标生成脚本（jimp + png-to-ico）
├── public/
│   └── sun.png            # 应用装饰图 / 图标源图
├── src/
│   ├── main.ts            # 应用入口（含 Quill snow 样式）
│   ├── App.vue            # 应用壳：动态背景、页头、Tabs 容器、全局弹层
│   ├── style.css          # 全局样式与组件库覆盖
│   ├── lib/
│   │   └── echarts.ts            # ECharts 按需注册（只注册一次）
│   ├── components/
│   │   ├── CustomSelect.vue      # 自定义下拉（Teleport 到 body，弹窗内不裁剪）
│   │   ├── DatePickerModal.vue   # 动森风格日期选择弹窗
│   │   ├── DetailDrawers.vue     # 学习/赚钱详情抽屉（跨面板共享）
│   │   ├── DeleteConfirmModal.vue# 共享删除确认弹窗
│   │   ├── InspirationComposer.vue # 💡 浮动按钮 + 灵感记录弹窗（根级）
│   │   └── panels/               # 7 个 Tab 面板
│   │       ├── TasksPanel.vue        # 任务看板 + 任务弹窗 + 时段分布图
│   │       ├── HealthPanel.vue       # 体重日历 + 趋势曲线
│   │       ├── StudyPanel.vue        # 学习表格 + 添加/编辑弹窗
│   │       ├── MoneyPanel.vue        # 汇总卡 + 任务表/日历/规划三视图
│   │       ├── TodayPanel.vue        # 今日时间线 + 今日报告
│   │       ├── InspirationPanel.vue  # 灵感列表
│   │       └── BackupPanel.vue       # 导入/导出/清空
│   ├── composables/
│   │   ├── useMyDayStorage.ts    # localStorage 读写 + v1→v2 迁移（模块级单例）
│   │   ├── useTodayLog.ts        # 今日动态写入
│   │   ├── useDetailDrawers.ts   # 详情抽屉状态（单例）
│   │   ├── useDeleteConfirm.ts   # 删除确认状态（单例，含级联删任务）
│   │   ├── useTaskMoneySync.ts   # 赚钱任务 → 看板任务自动同步
│   │   └── usePanelUiState.ts    # 面板视图状态单例（切 Tab 不丢）
│   ├── types/
│   │   └── index.ts              # 全部数据模型定义
│   └── utils/
│       ├── date.ts               # 日期格式化（Asia/Shanghai）
│       ├── task.ts               # 任务时段/截止判定、关联解析
│       ├── labels.ts             # 文案函数（类型/状态/分类名）
│       └── sanitize.ts           # DOMPurify 富文本消毒
└── release/               # 打包产物（win-unpacked 为中间目录，可删）
```

## 架构说明

### 状态单例

`useMyDayStorage()` 返回的是**模块级单例**状态（state 定义在模块作用域，`ensureLoaded` 有 flag 防重，自动保存 watch 在模块加载时注册一次）。任何组件/composable 调用拿到的都是同一份数据。

> ⚠️ reactive 数组（weights/studyItems/moneyItems/todayLogs/tasks/inspirations）只能 `splice`/`push`/改属性，**禁止整体重新赋值**，否则其他组件持有的引用会断开。

### 跨模块依赖

| 依赖 | 提供方 | 使用方 |
|------|--------|--------|
| `pushTodayLog` | useTodayLog | health / study / money / 删除确认 |
| `openDetail` / `openMoneyDetail` | useDetailDrawers | study 表格 / money 表格、日历 / 任务关联链接 |
| `openDelete` | useDeleteConfirm | study / money 表格 |
| `autoCreateTodayTaskFromMoney` / `syncAutoTodayTaskForMoney` | useTaskMoneySync | money 添加/编辑 → 任务看板 |

### Tabs 卸载行为

组件库 `Tabs` 用 `v-if` 只渲染激活面板，**面板组件切 Tab 即卸载**。因此面板的视图状态（筛选、页码、日历月份等）放在 `usePanelUiState` 单例中保持；表单、弹窗开关等瞬态留在组件内。跨面板可达的弹层（详情抽屉、删除确认、💡 灵感按钮）必须挂在 App 根组件。

### z-index 层级

Loading 9999 > DatePickerModal 1200 > 任务弹窗 1100 > 普通弹窗 / 💡 按钮 1000


## 数据与持久化

所有数据存储在 localStorage（key：`myday`），当前 schema 版本为 **v2**。状态为模块级单例，自动保存 watch 在模块加载时注册一次。

### v2 存储结构

```jsonc
{
  "version": 2,
  "activeTab": "tasks",          // 当前 Tab
  "chartRange": "7d",            // 体重趋势范围
  "moneyPlan": "<p>...</p>",     // 赚钱长期规划（富文本 HTML）
  "weights": [...],              // 体重记录
  "studyItems": [...],           // 学习项
  "moneyItems": [...],           // 赚钱任务（含富文本 description）
  "todayLogs": [...],            // 今日动态（仅当天）
  "tasks": [...],                // 任务看板（含富文本 description）
  "inspirations": [...]          // 灵感（独立存储，跨天保留）
}
```

### 版本迁移（v1 → v2）

加载本地数据或导入备份 JSON 时，`migrateMyDayState()` 统一执行迁移：

- `moneyItems` 的旧字段 `plan` → `description`
- 旧 `todayLogs` 中 `category === 'inspiration'` 的条目提取到独立的 `inspirations` 数组
- 日志缺失 `date` 时补为当天；过滤早期示例数据
- 缺失字段用默认值补齐

导入更高版本（`version > 2`）的数据会在控制台警告并尽力加载。

### 富文本安全

任务描述、赚钱任务描述、长期规划均为 HTML 富文本，渲染前统一经 `sanitizeHtml()`（DOMPurify）消毒，防止 XSS。

## 开发须知

- **组件库更新后**：需先在 `animal-island-vue` 目录重新 `npm run build`，再回本目录重新 `npm install`（`file:` 依赖为复制安装，不会自动同步）。
- **Modal 组件**：自定义 footer 需同时设置 `:show-footer="true"`；动态内容建议 `:typewriter="false"`。
- **弹窗内下拉**：组件库 `Select` 在 Modal 内会被裁剪，请使用 `CustomSelect`（已 Teleport 到 body 并 fixed 定位）。
- **任务状态**：新建任务按截止时间自动分配列（3 天内 → 今日任务）；编辑保存**不改变**所在列，仅拖拽换列。
- **端口占用**：`npm run dev` 默认 5173，被占用时 Vite 自动顺延。

## License

Private / 个人项目
