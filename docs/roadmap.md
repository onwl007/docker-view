# docker-view 实施路线图

## 1. 路线原则

实施顺序遵循以下原则：

- 先稳定基础工程、统一布局、统一响应结构和最小 API 闭环
- 先完成 REST 只读能力，再补充写操作和审计
- Monitoring 与 Settings 作为独立领域推进，不与实时通道混做一阶段
- 先稳定 REST 契约，再叠加 SSE 日志和 WebSocket 终端
- Compose 管理建立在容器、镜像、卷、网络和实时能力之后
- 每个阶段都要求前端、后端、交互契约和测试同步落地
- 每个阶段结束时，前端和后端覆盖率目标都不低于 90%
- 每个阶段结束时，相关 lint、typecheck、单元测试和文档更新都必须完成

这样可以保证每个阶段都可演示、可测试、可回归，并且实现顺序与整体设计文档保持一致。

## 2. Phase 1: 基础工程与应用骨架

### 2.1 目标

- 完成 Go 后端应用装配、配置加载和基础 HTTP 服务
- 完成 React 前端基础布局、导航和主题 token
- 建立统一响应结构、错误结构和最小健康检查闭环
- 建立前端 API client、TanStack Router 和 TanStack Query 基础骨架

### 2.2 主要交付物

- 后端：
  - `cmd/docker-view` 启动主流程
  - `internal/app`、`internal/cli`、`internal/config` 最小闭环
  - 基础路由、错误响应编码、`/healthz`
  - `GET /api/v1/system/summary`
  - Docker Engine 最小健康检查和基础统计聚合

- 前端：
  - 统一后台布局
  - 左侧导航、顶部页头、系统状态展示
  - Dashboard 首页路由骨架
  - 统一 API client 和 query key 基础约定
  - 基础主题变量和通用 UI 容器组件

- 交互：
  - `system/summary` 查询闭环
  - 统一成功响应和错误响应结构
  - Dashboard 首屏预取和基础错误展示

### 2.3 依赖与前置条件

- 配置优先级必须遵循命令行、环境变量、配置文件、默认值
- 前端根布局和路由骨架应与 `frontend-design.md` 保持一致
- 后端响应结构和错误结构应与 `api.md`、`integration.md` 保持一致

### 2.4 完成定义

- 浏览器可打开 Dashboard 并展示基础健康与统计信息
- 后端可稳定返回 Docker Engine 连接状态和系统概览
- 前端具备概览页单元测试
- 后端具备健康检查和系统概览单元测试
- 前端和后端覆盖率维持在 90% 以上
- 文档与实现保持一致

## 3. Phase 2: Dashboard 与核心资源只读能力

### 3.1 目标

- 完成容器、镜像、卷、网络四类核心资源的只读浏览能力
- 完成 Dashboard 到各资源页的统一导航和信息组织
- 完成列表筛选、详情查看和关联关系展示

### 3.2 主要交付物

- 后端：
  - `containers`、`images`、`volumes`、`networks` 的列表和详情 service
  - 对应 handler、gateway 和 DTO 映射
  - 基础过滤参数解析和统一错误语义

- 前端：
  - `Dashboard`
  - `Containers`
  - `Images`
  - `Volumes`
  - `Networks`
  - 各资源页的统计卡片、表格、空态、错误态和详情视图骨架

- 交互：
  - 列表页 URL Search Params 与筛选状态同步
  - 路由 loader 预取和 Query Cache 托管
  - Dashboard 展示最近资源和资源统计摘要

### 3.3 依赖与前置条件

- 依赖 Phase 1 已完成统一布局、API client、query key 基础结构
- 资源 DTO 命名和字段语义必须稳定，不直接暴露 Docker SDK 类型
- 列表页筛选参数必须可刷新、可分享、可前进后退恢复

### 3.4 完成定义

- 浏览器可完成四类资源列表浏览和详情查看
- 关联关系可在详情中稳定展示
- Dashboard 能提供跳转入口和资源摘要
- 资源列表与详情接口具备后端单元测试
- 资源列表、空态、错误态与筛选行为具备前端单元测试
- 当前累计覆盖率维持在 90% 以上

## 4. Phase 3: 核心资源写操作与审计接入

### 4.1 目标

- 完成核心资源的管理操作
- 为所有高风险操作接入审计记录
- 在前端实现确认、错误提示、成功反馈和缓存失效策略

### 4.2 主要交付物

- 后端：
  - 容器启动、停止、重启、删除
  - 镜像拉取、删除、清理
  - 卷创建、删除
  - 网络创建、删除
  - `internal/audit` 最小实现和审计事件触发点

- 前端：
  - 创建弹窗、删除确认框、危险操作确认流程
  - mutation 提交、成功提示、失败提示
  - 相关列表和 Dashboard 统计失效刷新

- 交互：
  - 稳定错误码
  - 成功后失效对应 query key
  - 对影响概览的写操作补充失效 `system/summary`

### 4.3 依赖与前置条件

- 依赖 Phase 2 已完成资源列表与详情闭环
- 审计事件字段应与 `security.md` 和 `backend-design.md` 保持一致
- 高风险操作前端必须先确认，再触发 mutation

### 4.4 完成定义

- 所有写操作都能返回稳定结果和错误语义
- 写操作都已接入审计事件
- 前端具备确认、失败提示和成功刷新行为
- 每个写操作都具备前端和后端单元测试
- 当前累计覆盖率维持在 90% 以上

## 5. Phase 4: Monitoring 与 Settings

### 5.1 目标

- 完成监控页和设置页这两个新增页面域
- 明确监控数据的轮询模型和设置页的受控配置子集
- 打通 Settings 读取、校验、保存的基础链路

### 5.2 主要交付物

- 后端：
  - `GET /api/v1/monitoring/host`
  - `GET /api/v1/monitoring/containers`
  - `GET /api/v1/settings`
  - `POST /api/v1/settings/validate`
  - `PUT /api/v1/settings`
  - Monitoring 和 Settings 对应 service、handler、DTO

- 前端：
  - `Monitoring` 页面
  - `Settings` 页面
  - 监控卡片、容器资源表格、刷新间隔控制
  - Docker、Security、Notifications、Appearance 标签页和表单

- 交互：
  - Monitoring 轮询刷新，不进入长期 Query Cache
  - Settings 支持读取、校验、保存
  - 明确哪些配置变更需要重启生效

### 5.3 依赖与前置条件

- Monitoring 独立于实时日志和终端，不应依赖 SSE 或 WebSocket
- Settings 只开放受控配置子集，不支持任意运行时参数写入
- Settings 页面字段和后端配置结构要保持清晰映射，但不要求一一暴露全部配置

### 5.4 完成定义

- 浏览器可查看主机与容器资源占用快照
- 浏览器可查看和提交受控设置项
- Monitoring 页支持可控轮询和手动刷新
- Settings 页能展示字段校验和保存结果
- Monitoring 与 Settings 均具备前端和后端单元测试
- 当前累计覆盖率维持在 90% 以上

## 6. Phase 5: Logs SSE 与 Terminal WebSocket

### 6.1 目标

- 实现容器日志查询和日志实时流
- 实现容器终端 exec 会话和 WebSocket 双向交互
- 明确会话建立、关闭、异常中断和资源清理行为

### 6.2 主要交付物

- 后端：
  - `GET /api/v1/containers/{id}/logs`
  - `GET /api/v1/containers/{id}/logs/stream`
  - `POST /api/v1/containers/{id}/exec-sessions`
  - `GET /api/v1/terminal/sessions/{sessionId}/ws`
  - SSE 编码、WebSocket 消息协议、会话清理

- 前端：
  - 容器日志面板
  - 历史日志 + tail 追加展示
  - 容器终端面板
  - connecting / ready / closed / error 状态呈现

- 交互：
  - 日志先走 REST，再接入 SSE
  - 终端先创建会话，再建立 WebSocket
  - 支持 `stdin`、`resize`、`close`、`stdout`、`stderr`、`exit`、`error`

### 6.3 依赖与前置条件

- 依赖容器详情与资源识别已经稳定
- 终端能力必须限定在容器上下文，不暴露主机 shell
- 流式连接断开后必须清理底层资源

### 6.4 完成定义

- 可在浏览器查看容器历史日志与实时日志
- 可在浏览器建立容器终端并进行输入输出交互
- 异常断开、关闭和容器退出场景处理明确
- 流式能力具备前端和后端单元测试
- 当前累计覆盖率维持在 90% 以上

## 7. Phase 6: Compose 管理

### 7.1 目标

- 完成 Compose 项目识别、列表、详情和项目级操作
- 在前端展示 Compose 项目与容器、网络、卷的关联关系

### 7.2 主要交付物

- 后端：
  - `GET /api/v1/compose/projects`
  - `GET /api/v1/compose/projects/{name}`
  - `POST /api/v1/compose/projects/{name}/start`
  - `POST /api/v1/compose/projects/{name}/stop`
  - `POST /api/v1/compose/projects/{name}/recreate`
  - `DELETE /api/v1/compose/projects/{name}`
  - Compose 项目识别与操作编排 service

- 前端：
  - Compose 列表页
  - Compose 详情页
  - 项目级操作入口和状态反馈
  - 项目与资源关系展示

- 交互：
  - 项目列表和详情查询
  - 项目级操作 mutation
  - 项目状态变化后的缓存失效与视图刷新

### 7.3 依赖与前置条件

- 依赖容器、卷、网络和镜像基础能力已稳定
- Compose 项目识别优先基于标准 Compose 标签
- 项目级操作必须有明确错误路径和部分失败场景处理

### 7.4 完成定义

- 浏览器可完成基础 Compose 项目管理
- 项目状态和容器状态的映射规则明确
- 错误场景具备统一处理
- Compose 能力具备前端和后端单元测试
- 当前累计覆盖率维持在 90% 以上

## 8. Phase 7: 安全、可运维性与交付收口

### 8.1 目标

- 将安全基线、运维能力和持续交付门禁补齐到可交付状态
- 对齐部署、审计、日志和文档体系

### 8.2 主要交付物

- 后端：
  - 认证中间件接入点落位
  - 审计落盘或导出能力
  - 运行日志与错误观测增强
  - 配置和部署约束补齐

- 前端：
  - 认证与未授权状态预留处理
  - 全局错误横幅和关键异常提示收口
  - 设置页与安全能力的衔接收口

- 工程与文档：
  - README、部署文档、运维说明同步更新
  - CI 门禁固化
  - 质量门槛、测试策略与实际命令一致

### 8.3 依赖与前置条件

- 依赖前述功能域已基本稳定
- 不应在此阶段引入多主机、Kubernetes 或其他超出首版范围的能力
- 安全增强应围绕现有单机受控环境基线展开

### 8.4 完成定义

- 文档中定义的安全基线具备实现落点
- 审计事件可落盘、可导出或具备明确持久化策略
- 部署与运维约束齐全
- 覆盖率门槛和测试门禁纳入持续集成
- 首版文档体系与实现状态保持一致

## 9. 阶段性验收清单

每个阶段结束都至少验证以下内容：

- 后端单元测试通过
- 前端单元测试通过
- 前端和后端覆盖率不低于 90%
- 相关 `lint`、`typecheck`、静态检查通过
- 关键 API 或实时通道完成联调
- 成功路径、失败路径和边界路径均已回归
- 文档与实现一致性检查完成
- CI 门禁规则与本阶段实现保持一致

## 10. 说明

本路线图描述的是首版实现顺序与阶段性交付目标，不是按日期编排的项目排期表。

若后续需要增加时间维度，应在不改变阶段依赖关系的前提下，为每个 Phase 单独补充里程碑计划。
