# docker-view 架构设计

## 1. 总体架构

docker-view 采用单体部署架构，由以下部分组成：

- React 前端应用
- Go HTTP 服务
- Docker Engine 访问层
- 实时通道层
- 配置、审计与日志支撑层

逻辑架构如下：

```text
Browser
  |
  | HTTP / REST
  | WebSocket / SSE
  v
Go HTTP Server
  |
  +-- REST Handlers
  +-- WebSocket Terminal Gateway
  +-- SSE Log Stream Gateway
  |
  v
Application Services
  |
  v
Docker Gateway Interface
  |
  v
Docker Engine API (unix socket / tcp)
```

## 2. 部署模型

首版采用单机部署模型：

- `docker-view` 后端运行在目标 Linux 主机
- 后端通过配置的 `docker.host` 访问 Docker Engine
- 前端静态资源由 Go 服务统一托管
- 浏览器只与 `docker-view` 服务通信，不直接访问 Docker Engine

默认推荐使用 Unix Socket：

- `unix:///var/run/docker.sock`

也允许未来在受控环境中扩展为远程 Docker API 地址，但首版文档不把远程多主机纳管作为实现目标。

## 3. 后端分层

### 3.1 建议的模块职责

建议在现有目录基础上扩展为以下职责边界：

- `internal/app`
  - 应用装配
  - 生命周期管理
  - 配置、日志、依赖注入

- `internal/http`
  - 路由注册
  - 请求解析
  - 响应编码
  - WebSocket/SSE 接入层
  - 中间件装配

- `internal/service`
  - 业务用例编排
  - 资源视图聚合
  - 审计触发
  - 错误语义归一化

- `internal/docker`
  - Docker Gateway 接口定义
  - Docker SDK 适配实现
  - 类型转换
  - 流式会话封装

- `internal/config`
  - 配置加载
  - 默认值
  - 运行时配置结构

- `internal/audit`
  - 审计事件结构
  - 审计记录接口
  - 日志或持久化适配

### 3.2 分层原则

- Handler 不直接拼装 Docker SDK 请求
- Service 不感知 HTTP 协议细节
- Docker 适配层不承担业务编排职责
- 所有对 Docker Engine 的访问都通过统一网关接口进入

## 4. Docker Gateway 设计

## 4.1 设计目标

Docker Gateway 是后端与 Docker Engine 之间的隔离层，目的是：

- 隔离 SDK 细节
- 统一错误语义
- 控制调用范围
- 便于后续 mock 和测试
- 为未来支持多主机或其他引擎保留抽象边界

### 4.2 最小能力集合

首版网关至少需要提供以下能力族：

- 系统概览与健康检查
- 容器列表、详情与生命周期操作
- 镜像列表、拉取、删除
- 卷列表、创建、删除
- 网络列表、创建、删除
- 容器日志查询与实时追踪
- 容器 exec 创建、附着、输入和关闭
- Compose 项目发现和项目级操作

### 4.3 Compose 处理策略

首版 Compose 管理不单独引入新的编排平台，默认基于 Docker/Compose 已有元数据和容器标签关系进行项目识别与操作编排。

文档中需要明确：

- Compose 项目是一个逻辑聚合对象，不是 Docker Engine 的原生一等资源
- 项目识别优先基于标准 Compose 标签
- 项目级操作本质上会映射为一组 Docker/Compose 行为
- 如果未来需要更强的 Compose 管理，可在该层追加专用适配器

## 5. HTTP 与实时通道设计

### 5.1 REST

REST 负责：

- 资源列表查询
- 资源详情查询
- 非流式管理操作
- 实时会话的创建入口

### 5.2 WebSocket

WebSocket 只用于容器终端能力：

- 浏览器发起终端会话连接
- 后端将输入输出桥接到 Docker exec attach
- 支持窗口 resize、stdin、stdout、stderr、关闭事件

### 5.3 SSE

SSE 只用于容器日志持续输出：

- 浏览器以 HTTP 长连接方式订阅日志
- 后端将 Docker 日志流编码为事件流
- 支持 since、tail、timestamps、stdout/stderr 过滤等参数

## 6. 前端架构

首版前端采用基于 Vite 的单应用 React SPA，并使用以下基础设施：

- React 作为前端视图库
- TanStack Router 负责页面路由、嵌套路由和路由级数据预取
- TanStack Query 负责服务端状态获取、缓存、失效和刷新
- Tailwind CSS 负责设计令牌和原子化样式
- shadcn/ui 负责可组合的基础组件

建议按领域拆分路由、查询和界面模块：

- `dashboard`
- `containers`
- `images`
- `volumes`
- `networks`
- `compose`
- `logs`
- `terminal`

建议在前端目录中保持以下边界：

- `routes/`
  - 路由定义
  - 路由级参数解析
  - loader / prefetch 入口

- `features/`
  - 按领域组织页面、组件、查询选项和交互逻辑

- `components/ui/`
  - 基于 shadcn/ui 的基础组件和二次封装

- `lib/api/`
  - 面向 Go REST API 的请求客户端
  - 统一错误解析
  - SSE / WebSocket 会话封装

- `lib/query/`
  - TanStack Query 的 query key、query option 和缓存策略约定

前端职责：

- 页面路由与资源浏览
- 路由级数据预取和导航状态管理
- 统一 API 客户端封装
- 服务端状态缓存、刷新和失效控制
- 终端和日志流的会话管理
- 用户确认、错误展示和状态刷新
- 基于 Tailwind CSS 和 shadcn/ui 构建一致的后台界面体验

前端不承担任何权限判断的最终可信职责。

### 6.1 数据获取策略

- 页面首屏数据优先通过 TanStack Router loader 触发预取，再交由 TanStack Query 托管缓存
- 列表页默认采用可失效、可轮询的查询模型，不在组件内部散落重复请求
- 写操作统一通过 mutation 执行，成功后显式失效相关 query key
- SSE 日志流和 WebSocket 终端会话不进入 Query Cache，而是作为独立会话状态管理

### 6.2 UI 组件策略

- 业务界面基于 shadcn/ui 组件进行组合，不直接把第三方示例页面整体搬入项目
- Tailwind CSS 负责主题 token、布局和状态样式，避免在业务组件中堆积零散内联样式
- 表格、表单、抽屉、对话框、命令确认等后台高频交互优先复用统一组件模式
- 组件定制应以容器管理场景为中心，避免仅为视觉抽象引入额外复杂度

## 7. 审计与可观测性

### 7.1 审计要求

以下操作应生成审计事件：

- 容器启动、停止、重启、删除
- 镜像拉取、删除
- 卷和网络创建、删除
- Compose 项目操作
- 容器 exec 会话创建

### 7.2 日志要求

服务端至少应记录：

- HTTP 访问日志
- Docker Engine 调用失败日志
- WebSocket/SSE 会话异常
- 审计事件

## 8. 测试架构要求

测试是架构约束的一部分，不是后置补充。首版起就要求每个功能都具备前后端对应的单元测试，并以覆盖率作为合格门槛。

### 8.1 后端测试要求

- `internal/service` 层必须作为后端单元测试主战场
- `internal/docker` 通过接口 mock 验证正常路径、异常路径和边界条件
- `internal/http` 应覆盖请求解析、状态码、错误体和流式入口行为
- 容器、镜像、卷、网络、Compose、日志、终端等每个功能域都必须有独立测试用例

### 8.2 前端测试要求

- 页面组件、领域组件和 API 客户端都必须有单元测试
- 对资源列表、详情展示、操作确认、错误提示、日志流展示和终端会话状态切换都应覆盖
- 组件测试应验证用户可见行为，而不是只验证实现细节

### 8.3 覆盖率门槛

- 后端单测覆盖率目标不低于 90%
- 前端单测覆盖率目标不低于 90%
- 总体上以功能域为单位检查是否存在未覆盖路径
- 新功能不得以“后续补测试”为理由合入

## 9. 扩展边界

首版虽然只实现单机，但架构设计必须保留以下扩展位：

- `Docker Gateway` 未来可扩展为带主机上下文的接口
- `service` 层未来可接入主机注册与连接池
- `http` 层未来可引入认证中间件与角色授权
- `audit` 结构中预留 actor、source、target 和 host 字段

这些扩展位只作为边界约束，不在首版中实现。
