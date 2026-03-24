# docker-view 前端设计文档

## 1. 文档目标

本文档基于 `design/` 目录中的页面截图，定义 docker-view 前端的视觉结构、信息架构、路由拆分、组件边界、状态管理和实现约束，作为后续 React 前端实现的直接设计依据。

本文档以目标设计为主，同时补充当前实现状态，帮助把页面规划与实际代码进度对齐。

## 1.1 当前实现摘要

截至当前阶段，前端已经落地：

- Dashboard 真实 API 接入
- Containers、Images、Volumes、Networks 四个资源列表页
- 搜索词到 URL 的同步
- 容器 `start / stop / restart / delete`
- 镜像 `pull / delete / prune`
- 卷 `create / delete`
- 网络 `create / delete`
- mutation 成功后的 query invalidation 与全局摘要刷新

当前尚未落地：

- 四类资源详情页
- Monitoring 页面
- Settings 页面
- Compose 页面
- Logs / Terminal 页面

## 2. 设计输入与实现约束

### 2.1 设计输入

前端页面风格主要参考以下设计稿特征：

- 左侧固定导航栏
- 顶部页头区域
- 页面级统计卡片
- 资源列表表格
- 弹窗、下拉动作菜单、设置标签页
- 轻量、留白充足、圆角卡片式后台布局

设计稿覆盖的主要页面域包括：

- Dashboard
- Containers
- Images
- Volumes
- Networks
- Monitoring
- Settings

### 2.2 实现技术栈

前端必须使用仓库约定的技术栈：

- React
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
- `pnpm`

### 2.3 实现原则

- 按设计稿的布局和信息密度实现，不随意改成通用模板站样式
- 路由、领域模块、基础组件三层边界明确
- 页面组件只负责组合，不堆积数据请求和复杂状态逻辑
- 服务端状态优先交给 TanStack Query 管理
- 所有资源页共享统一的后台布局与交互模式
- 前端只做体验层状态表达，不承担最终权限判断

### 2.4 当前阶段判定

当前前端已经具备“列表浏览 + 关键写操作”的主链路，但仍处于 Phase 2/3 之间：

- 已完成：Dashboard、四类资源列表、搜索 URL 同步、确认弹窗、成功失败反馈
- 未完成：详情视图、关系 drill-down、Monitoring、Settings、实时日志和终端

## 3. 整体信息架构

### 3.1 一级导航

基于设计稿，首版前端一级导航建议为：

- `/` Dashboard
- `/containers`
- `/images`
- `/volumes`
- `/networks`
- `/monitoring`
- `/settings`

考虑到首版目标中包含 Compose、日志和终端能力，建议在不破坏当前导航风格的前提下预留后续入口：

- `/compose`
- `/containers/$containerId/logs`
- `/containers/$containerId/terminal`

### 3.2 全局布局

统一后台布局由三部分组成：

- 左侧导航栏
- 顶部页头栏
- 主内容区

布局原则：

- 导航栏固定在桌面端左侧，承载产品标识、一级菜单、系统状态
- 页头负责页面标题、简述、全局操作、局部筛选或刷新入口
- 主内容区按照“统计卡片 + 列表/详情区”的密度组织

### 3.3 页面共同结构

除设置页外，多数页面遵循统一骨架：

1. 页面标题与说明
2. 右上角主操作按钮
3. 顶部摘要卡片区
4. 主列表卡片
5. 次级信息区或危险操作区

## 4. 视觉与交互风格

### 4.1 视觉方向

设计稿呈现的是偏桌面管理工具风格的浅色后台界面，核心特征如下：

- 浅色背景
- 大圆角卡片
- 低对比边框
- 留白明显
- 图标轻量点缀
- 用绿色、黄色、蓝色表达状态和资源类差异

### 4.2 设计令牌建议

前端实现时应在 Tailwind CSS 主题层定义统一 token，至少包含：

- `--background`
- `--foreground`
- `--card`
- `--muted`
- `--muted-foreground`
- `--border`
- `--primary`
- `--success`
- `--warning`
- `--danger`

不建议在业务组件中直接写大量硬编码颜色值。

### 4.3 组件外观约定

- 卡片统一使用较大圆角和细边框
- 统计数字使用更强的字号层级
- 状态标签统一使用 `Badge`
- 表格操作统一使用图标按钮或 `DropdownMenu`
- 创建、删除、危险操作统一使用 `Dialog`
- 设置页使用 `Tabs` + `Form` 的组合模式

## 5. 路由设计

## 5.1 路由树建议

```text
/
├─ dashboard index
├─ containers
│  ├─ $containerId
│  ├─ $containerId/logs
│  └─ $containerId/terminal
├─ images
│  └─ $imageId
├─ volumes
│  └─ $volumeName
├─ networks
│  └─ $networkId
├─ monitoring
├─ settings
└─ compose
   └─ $projectName
```

当前实现状态：

- 已实现 `/`、`/containers`、`/images`、`/volumes`、`/networks`、`/monitoring`、`/settings`
- `/compose` 仍未实现
- 各资源详情子路由、`logs`、`terminal` 仍未实现

### 5.2 路由职责

- 根路由负责通用布局、导航和全局状态承载
- 资源列表路由负责 loader 预取和筛选参数同步
- 详情子路由负责详情数据、日志、终端或关联资源呈现
- 设置路由负责各配置标签页和表单状态

当前实现状态：

- 当前列表页已承担 query orchestration 与 URL 搜索参数同步
- 尚未形成详情子路由层级

### 5.3 URL 状态约定

资源列表页的以下状态应优先映射到 URL：

- 搜索关键词
- 状态筛选
- 标签筛选
- 排序字段
- 分页参数

这样可以保证刷新、分享链接和前进后退行为稳定。

当前实现状态：

- 当前已落地 `q` 搜索词同步
- `status`、排序、分页尚未进入 URL

## 6. 目录与模块拆分

## 6.1 推荐目录

结合现有 `web/` 结构，建议逐步演进为：

```text
web/src/
├─ app/
│  ├─ providers/
│  └─ layout/
├─ routes/
├─ features/
│  ├─ dashboard/
│  ├─ containers/
│  ├─ images/
│  ├─ volumes/
│  ├─ networks/
│  ├─ monitoring/
│  ├─ settings/
│  └─ compose/
├─ components/
│  ├─ ui/
│  └─ shared/
├─ lib/
│  ├─ api/
│  ├─ query/
│  ├─ sse/
│  ├─ ws/
│  └─ utils/
└─ styles/
```

当前实现状态：

- 当前已经形成 `routes/`、`features/`、`components/`、`lib/api/` 的主干结构
- `monitoring`、`settings` feature 已形成基础实现
- `compose` feature 仍未开始

### 6.2 模块边界

- `routes/`：只放路由注册、loader、参数解析和页面装配
- `features/*`：放领域页面、局部组件、query option、mutation hooks、DTO 适配
- `components/ui/`：放 shadcn/ui 基础组件和轻量封装
- `components/shared/`：放跨领域公用组件，如状态标签、资源卡片、空状态
- `lib/api/`：放 HTTP client、统一错误处理、SSE/WS 会话封装
- `lib/query/`：放 query keys 和公共缓存策略

当前实现状态：

- 资源列表 query option 和 mutation hook 已集中在 `features/resources/`
- HTTP client 与错误映射已集中在 `lib/api/`
- SSE / WS 会话封装尚未实现

## 7. 页面设计

## 7.1 Dashboard

设计稿特征：

- 顶部有 8 个左右的指标卡片
- 下方有最近容器列表
- 重点突出主机与 Docker 环境总览

页面目标：

- 在一屏内回答“当前主机 Docker 状态是否健康”
- 提供跳转到具体资源页的入口

建议拆分组件：

- `DashboardStatsGrid`
- `DashboardMetricCard`
- `RecentContainersTable`
- `EngineStatusBanner`

数据来源建议：

- `/api/v1/system/summary`
- `/api/v1/containers?limit=...`
- `/api/v1/monitoring/host`

当前实现状态：

- 已使用 `/api/v1/system/summary`
- 已使用 `/api/v1/containers?all=true&limit=5&sort=recent`
- `monitoring/host` 已实现，但 Dashboard 当前仍未额外展示独立监控卡片

## 7.2 Containers

设计稿特征：

- 顶部容器总数、运行中、已停止、CPU 使用率卡片
- 主区域为容器表格
- 右上角有创建按钮
- 支持搜索和筛选
- 每行带快速动作按钮

建议拆分组件：

- `ContainerSummaryCards`
- `ContainerToolbar`
- `ContainerFilters`
- `ContainerTable`
- `ContainerRowActions`
- `ContainerCreateDialog`

后续详情页建议拆分：

- `ContainerOverviewPanel`
- `ContainerPortsPanel`
- `ContainerMountsPanel`
- `ContainerNetworksPanel`
- `ContainerEnvSummary`
- `ContainerLogsPanel`
- `ContainerTerminalPanel`

当前实现状态：

- 已实现摘要卡片、搜索、表格、行级快速操作
- 已实现 `Start / Stop / Restart / Delete` 确认弹窗与反馈
- 当前未实现创建容器
- 当前未实现容器详情、日志、终端面板

## 7.3 Images

设计稿特征：

- 资源表格中展示仓库、标签、摘要、大小、最近使用情况
- 行动作菜单包含运行容器、查看层、添加标签、删除
- 底部单独有清理未使用镜像卡片

建议拆分组件：

- `ImageSummaryCards`
- `ImageTable`
- `ImageRowActions`
- `ImagePullDialog`
- `ImagePruneCard`
- `ImageDeleteDialog`

当前实现状态：

- 已实现摘要卡片、搜索、表格
- 已实现 `Pull Image`、`Prune Unused`、`Delete`
- 当前未实现“运行容器”“查看层”“添加标签”等详情或扩展动作

## 7.4 Volumes

设计稿特征：

- 顶部为卷总量、总大小、使用中、未使用统计
- 支持搜索
- 创建卷通过居中弹窗

建议拆分组件：

- `VolumeSummaryCards`
- `VolumeTable`
- `VolumeCreateDialog`
- `VolumeRowActions`
- `VolumeUsageBadgeList`

当前实现状态：

- 已实现摘要卡片、搜索、表格
- 已实现创建与删除确认弹窗
- 当前未实现 volume 详情页

## 7.5 Networks

页面结构与 Volumes 高度一致，但重点字段切换为：

- Driver
- Scope
- Connected Containers
- Subnet / Gateway

建议拆分组件：

- `NetworkSummaryCards`
- `NetworkTable`
- `NetworkCreateDialog`
- `NetworkRowActions`

当前实现状态：

- 已实现摘要卡片、搜索、表格
- 已实现创建与删除确认弹窗
- 当前未实现 network 详情页

## 7.6 Monitoring

设计稿特征：

- 顶部卡片展示 CPU、内存、磁盘、网络
- 右上角有采样间隔选择和手动刷新
- 下方为容器资源列表

建议拆分组件：

- `MonitoringSummaryCards`
- `MonitoringRefreshToolbar`
- `ContainerResourceTable`
- `UsageProgress`

此页的数据模型应支持轮询刷新，不适合长期缓存。

当前实现状态：

- 已实现 Monitoring 页面真实 API 接入
- 已实现监控卡片、容器资源表格、轮询间隔切换与手动刷新

## 7.7 Settings

设计稿特征：

- 页面右上角有 Reset / Save Changes
- 内容区使用标签页
- 标签页至少包含 Docker、Security、Notifications、Appearance

建议拆分组件：

- `SettingsTabs`
- `DockerConnectionForm`
- `SecuritySettingsForm`
- `NotificationSettingsForm`
- `AppearanceSettingsForm`
- `SettingsActionBar`

需要注意：

- 首版设置页可以先实现“读取当前配置 + 提交配置草案”的能力
- 明确区分“当前运行配置”和“用户提交但待重启生效的配置”

当前实现状态：

- 已实现 Settings 页面真实 API 接入
- 已实现读取、Reset、校验、保存与 restart keys 提示

## 8. 状态管理设计

## 8.1 TanStack Query 使用原则

- 所有 REST 读请求通过 query 托管
- 写操作通过 mutation 执行
- mutation 成功后统一失效相关 query key
- 轮询页单独配置 `refetchInterval`
- SSE 和 WebSocket 会话不进入 query cache

当前实现状态：

- 当前读请求已经通过 query 托管
- 当前写操作已经通过 mutation 执行
- mutation 成功后会失效对应资源列表与 `['system', 'summary']`
- 轮询、SSE、WebSocket 相关策略尚未落地

### 8.2 Query Key 建议

```text
['system', 'summary']
['monitoring', 'host']
['monitoring', 'containers', filters]
['containers', filters]
['containers', containerId]
['images', filters]
['images', imageId]
['volumes', filters]
['networks', filters]
['settings']
['compose', filters]
```

当前实现状态：

- 已实际使用 `['system', 'summary']`
- 已实际使用 `['monitoring', 'host']`
- 已实际使用 `['monitoring', 'containers']`
- 已实际使用 `['settings']`
- 已实际使用 containers、images、volumes、networks 对应列表 key
- 详情、compose key 仍属预留

### 8.3 路由 loader 约定

- 路由 loader 只做预取，不在 loader 内写复杂业务判断
- 页面组件通过 `useSuspenseQuery` 或 `useQuery` 消费预取结果
- 列表页通过 loader 读取 URL search 参数并触发预取

当前实现状态：

- 当前主要通过页面中的 `useQuery` 驱动
- 资源页已实现 URL 搜索参数同步
- route loader 级预取仍可作为后续优化

## 9. 前后端交互配合

前端消费后端接口时遵循以下约定：

- 普通资源查询使用 REST + Query
- 容器日志实时跟踪使用 SSE
- 容器终端使用 WebSocket
- 错误响应统一映射到前端错误对象
- 高风险操作先弹确认，再触发 mutation

当前实现状态：

- 当前已实现 REST + Query 主链路
- 当前已实现错误响应到前端错误消息的映射
- 当前已实现高风险操作确认弹窗
- SSE 与 WebSocket 仍未接入

## 10. 响应式策略

- 桌面端优先还原设计稿布局
- 中屏下统计卡片允许 2 列排布
- 小屏下左侧导航改为抽屉或顶部折叠菜单
- 资源表格在小屏下允许切为卡片列表，但字段语义必须保持一致

## 11. 可测试性要求

前端设计必须支持后续单元测试和组件测试：

- 列表页的加载态、空态、错误态必须有稳定 DOM 标识
- 高风险按钮必须可被测试脚本稳定定位
- Dialog、Tabs、DropdownMenu 不得依赖不可控副作用
- SSE、WebSocket 会话层需可被 mock

当前实现状态：

- 当前列表页已具备加载态、空态、错误态
- 当前关键 mutation 已有前端测试覆盖基础行为
- 实时能力测试尚未开始

## 12. 与其他文档的关系

- 后端设计见 `backend-design.md`
- 前后端交互见 `integration.md`
- 总体架构见 `architecture.md`
- 产品整体范围见 `overview.md`
