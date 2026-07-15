# MyDay 项目速查文档

## 项目简介

**我的个人岛 | MyDay**：一个动森（Animal Crossing）风格的个人管理仪表盘，用于记录健康（体重）、学习进度、赚钱任务和今日动态。

## 技术栈

- **框架**：Vue 3 + TypeScript
- **构建工具**：Vite
- **UI 组件库**：`animal-island-vue`（本地依赖，路径 `../animal-island-vue`）
- **样式**：CSS 变量 + 组件库自带 Less 样式
- **数据持久化**：`localStorage`，key 为 `myday`

## 目录结构

```
D:\project\MyDay
├── index.html              # Vite 入口
├── package.json            # 依赖与脚本
├── vite.config.ts          # Vite 配置（含 @/ 别名、optimizeDeps、fs.allow）
├── tsconfig.json           # TypeScript 配置
├── tsconfig.node.json      # Node 工具配置
├── index.html.bak          # 旧的单文件版本备份
├── src/
│   ├── main.ts             # 应用入口，导入 animal-island-vue/style
│   ├── App.vue             # 主页面（所有 Tab、Modal、业务逻辑）
│   ├── style.css           # 自定义业务样式（日历、图表、时间线等）
│   ├── vite-env.d.ts       # Vite 类型声明
│   ├── types/index.ts      # WeightRecord / StudyItem / MoneyItem / TodayLog 类型
│   ├── composables/
│   │   └── useMyDayStorage.ts   # localStorage 读写
│   └── utils/date.ts       # todayStr / pad 工具
└── dist/                   # 构建产物
```

## 运行命令

```bash
cd D:\project\MyDay

# 开发预览
npm run dev

# 生产构建
npm run build

# 预览构建产物
npm run preview
```

开发服务默认地址：`http://localhost:5173/`  
预览服务默认地址：`http://localhost:4173/`

> 如果 PowerShell 提示 `无法加载 npm.ps1`，执行一次：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

## 主要功能模块

| Tab | 功能 |
|-----|------|
| 健康 | 体重日历、趋势曲线（近 7/30 天 / 全部） |
| 学习 | 学习项列表、添加/编辑/删除、按类型筛选 |
| 赚钱 | 收入统计、任务表、状态切换、添加/删除 |
| 今日动态 | 时间线、今日报告、NookPhone 装饰 |

## 关键实现说明

### 1. 组件库本地依赖

`animal-island-vue` 通过本地路径安装：

```json
"animal-island-vue": "file:../animal-island-vue"
```

在 `vite.config.ts` 中配置了 `optimizeDeps.include` 和 `server.fs.allow`，否则开发模式可能无法正确加载库内的字体/图片资源。

如果库的源码有更新，需要先到 `D:\project\animal-island-vue` 重新构建：

```bash
cd D:\project\animal-island-vue
npm run build
```

### 2. 数据兼容性

- `localStorage` key：`myday`
- 数据结构包含 `weights`、`studyItems`、`moneyItems`、`todayLogs`、`activeTab`、`chartRange`
- 新项目会自动读取旧单文件版本遗留的数据
- `StudyItem` 后来新增了 `totalPage` 字段，旧数据没有该字段时进度保持原值

### 3. 学习项特殊逻辑

- **视频/技能**：手动输入进度 0-100
- **书籍**：填写`当前页`和`总页数`，进度自动计算 `round(当前页 / 总页数 * 100)`
- 编辑书籍时同样按页数自动重算进度

### 4. Modal 使用注意

库中的 `Modal` 组件：

- `v-model:open` 控制显隐
- 自定义底部按钮时必须同时设置 `:show-footer="true"`，否则 `#footer` 插槽不会渲染
- 默认 `typewriter=true`，动态内容建议加 `:typewriter="false"`

### 5. Loading 组件

`Loading` 不是包裹内容的组件，需要作为 `position: relative` 容器内的同级绝对定位元素使用：

```vue
<div style="position: relative;">
  <Loading :active="!isLoaded" style="position: absolute; inset: 0; z-index: 999;" />
  <!-- 内容 -->
</div>
```

### 6. 表格插槽作用域

库中的 `Table` 插槽作用域是 `{ record, value, index }`，不是 `{ row }`。

## 最近改动摘要

- 单文件 HTML 迁移为 Vite + Vue 3 + TypeScript 项目
- 接入真实 `animal-island-vue` 组件库
- 健康 Tab 改为上下布局（日历在上，趋势图在下）
- 体重日历字号放大、移除绿色记录点
- 趋势曲线颜色改为深青色 `#0d9488`
- 今日时间线背景改为羊皮纸色，提升可读性
- 学习项添加改为 Modal 弹窗
- 学习进度表支持编辑进度（书籍按页数自动计算）
- 删除按钮颜色与编辑按钮统一
- 全屏动态背景（飘云 + 落叶）

## 已知小问题

- `/vite.svg` favicon 会 404，不影响功能
- `WeddingInvitation` 未接入（库未导出该组件）

## 后续建议

- 如需继续新增功能，建议每完成 1-2 个改动就提交/保存，避免上下文窗口再次吃紧
- 可以进一步拆分 `App.vue` 为独立子组件（`HealthPanel.vue`、`StudyPanel.vue` 等），降低单文件复杂度
