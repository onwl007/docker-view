# docker-view 后端设计文档

## 1. 文档目标

本文档定义 docker-view 后端的模块划分、领域职责、运行流程、配置模型、审计、安全扩展点与测试边界，用于指导 Go 后端的渐进式实现。

本文档以目标设计为主，同时补充当前实现状态，避免设计描述与代码能力脱节。

## 1.1 当前实现摘要

截至当前阶段，后端已经落地：

- `system summary` 聚合服务
- containers、images、volumes、networks 四类资源列表接口
- 容器 `start / stop / restart / delete`
- 镜像 `pull / delete / prune`
- 卷 `create / delete`
- 网络 `create / delete`
- 最小审计记录能力
- 统一 JSON 成功 envelope 与错误体

当前尚未落地：

- 四类资源详情接口
- monitoring 采样接口
- settings 读写接口
- logs SSE
- terminal WebSocket
- compose 聚合与操作

## 2. 设计目标

后端的核心职责不是把 Docker API 原样透传给前端，而是提供一个受控、稳定、可测试的容器管理服务层。

后端必须满足：

- 使用 Go 作为唯一后端语言
- 使用 Cobra 作为 CLI 入口
- 使用 Viper 负责配置加载
- 通过 Docker SDK 访问 Docker Engine
- 对外暴露稳定的 `/api/v1` REST、SSE、WebSocket 接口
- 为认证、审计和设置管理预留扩展点

### 2.1 当前阶段判定

当前实现仍以 REST 为主：

- 已实现：`/healthz`、`/api/v1/system/summary`、四类资源列表与写操作
- 已预留但未实现：SSE、WebSocket、settings、monitoring、compose、认证链路

## 3. 部署与运行模型

### 3.1 首版部署模型

- `docker-view` 进程运行在目标 Linux 主机
- 后端默认通过 `unix:///var/run/docker.sock` 连接 Docker Engine
- 前端静态资源由后端统一托管
- 浏览器只访问 `docker-view`，不直接访问 Docker Socket

### 3.2 进程职责

单个后端进程同时承担：

- HTTP API 服务
- 静态资源托管
- SSE 日志流网关
- WebSocket 终端会话网关
- 配置读取与运行期配置暴露
- 审计记录

### 3.3 当前实现状态

当前代码已经满足以下运行模型：

- `docker-view` 进程通过 Docker SDK 连接本地 Docker Engine
- 前端静态资源由后端统一托管
- HTTP 服务同时暴露健康检查、REST API 与 SPA fallback
- 审计以最小日志型 recorder 接入应用装配流程

以下仍属于目标设计，尚未实现：

- SSE 日志流网关
- WebSocket 终端会话网关
- 对外 settings 读写

## 4. 推荐目录与模块边界

在仓库既有结构基础上，推荐后续演进为：

```text
cmd/docker-view/
internal/
├─ app/
├─ cli/
├─ config/
├─ http/
├─ service/
├─ docker/
├─ audit/
├─ realtime/
└─ model/
pkg/
```

### 4.1 `cmd/docker-view`

- 程序主入口
- 负责装配 Cobra 命令与应用启动

### 4.2 `internal/cli`

- 根命令定义
- 启动参数绑定
- 配置优先级整合

### 4.3 `internal/app`

- 应用级依赖装配
- HTTP Server 生命周期管理
- Docker 客户端、service、handler 初始化

### 4.4 `internal/config`

- 配置结构定义
- 默认值
- Viper 读取和校验
- 环境变量映射

### 4.5 `internal/http`

- 路由注册
- handler
- DTO 解析与编码
- 中间件
- REST/SSE/WebSocket 接入

### 4.6 `internal/service`

- 业务编排
- 聚合资源视图
- 错误归一化
- 审计触发

### 4.7 `internal/docker`

- Docker Gateway 接口
- SDK 适配实现
- Docker 类型到内部模型的转换
- 流式会话桥接

### 4.8 `internal/audit`

- 审计事件定义
- 审计记录接口
- 日志型或持久化型适配器

### 4.9 `internal/realtime`

- SSE 编码
- WebSocket 消息协议
- 会话注册、清理、超时控制

### 4.10 当前代码映射

当前仓库已经实际承载职责的后端模块如下：

- `internal/app`：装配 config、docker gateway、service、audit recorder、HTTP server
- `internal/config`：配置结构、默认值、读取与校验
- `internal/http`：路由注册、请求解析、统一响应与错误写回
- `internal/service`：summary、资源列表、资源写操作、错误归一化
- `internal/docker`：Docker SDK 适配、列表查询、写操作 gateway
- `internal/audit`：最小 recorder 实现

`internal/realtime` 与更细粒度 model 拆分仍未开始。

## 5. 核心领域模块

## 5.1 System Service

负责：

- 汇总主机与 Docker Engine 状态
- 输出 Dashboard 和基础健康信息
- 输出 Monitoring 页所需的主机资源摘要

当前实现状态：

- 已实现 Dashboard 所需 summary 聚合
- 已输出 Docker 版本、API 版本、宿主机名、CPU、内存、资源计数
- Monitoring 页所需独立采样接口未实现

### 5.2 Container Service

负责：

- 容器列表、详情
- 启动、停止、重启、删除
- 资源统计聚合
- 容器关联卷、网络、端口等信息整理

当前实现状态：

- 已实现容器列表
- 已实现 `start / stop / restart / delete`
- 列表结果已包含端口、网络、卷、Compose project 等摘要字段
- 容器详情、日志、终端仍未实现

### 5.3 Image Service

负责：

- 镜像列表与详情
- 镜像拉取、删除、清理
- 镜像关联容器关系聚合

当前实现状态：

- 已实现镜像列表
- 已实现 `pull / delete / prune`
- 列表已返回基础使用关系摘要
- 镜像详情未实现

### 5.4 Volume Service

负责：

- 卷列表与详情
- 卷创建、删除
- 卷与容器关联关系聚合

当前实现状态：

- 已实现卷列表
- 已实现 `create / delete`
- 列表已返回挂载点、大小、关联容器摘要
- 卷详情未实现

### 5.5 Network Service

负责：

- 网络列表与详情
- 网络创建、删除
- 网络与容器关系聚合

当前实现状态：

- 已实现网络列表
- 已实现 `create / delete`
- 列表已返回 driver、scope、subnet、gateway、关联容器摘要
- 网络详情未实现

### 5.6 Monitoring Service

负责：

- 主机级资源采样
- 容器资源占用快照
- 将 Docker stats 等底层数据映射成前端友好的聚合视图

当前实现状态：

- 未实现

### 5.7 Settings Service

负责：

- 输出当前服务配置摘要
- 接收可变更配置
- 校验配置项
- 标记哪些配置需要重启生效

首版建议只支持受控配置子集，不开放任意运行时参数写入。

当前实现状态：

- 未实现

### 5.8 Compose Service

负责：

- 基于 Compose 标签识别项目
- 聚合项目下容器、网络、卷关系
- 编排项目级启动、停止、重建等操作

当前实现状态：

- 未实现

### 5.9 Terminal Service

负责：

- 创建容器内 exec 会话
- 建立 WebSocket 桥接
- 处理 resize、stdin、close
- 记录会话审计

当前实现状态：

- 未实现

### 5.10 Log Stream Service

负责：

- 读取容器历史日志
- 启动日志 tail 流
- 编码为 SSE 事件
- 管理连接关闭与异常清理

当前实现状态：

- 未实现

## 6. Docker Gateway 设计

## 6.1 目标

Gateway 层必须把业务层和 Docker SDK 细节隔离开，避免：

- handler 直接依赖 SDK 类型
- service 直接拼装 Docker 参数
- 错误语义在各层散落

### 6.2 接口族建议

按领域拆分接口而不是堆成单个大接口：

- `SystemGateway`
- `ContainerGateway`
- `ImageGateway`
- `VolumeGateway`
- `NetworkGateway`
- `MonitoringGateway`
- `ComposeGateway`
- `ExecGateway`
- `LogGateway`

当前实现状态：

- 已实际形成 system summary、resource list、resource mutation 三组 gateway 能力
- monitoring、compose、exec、log gateway 尚未开始

### 6.3 返回模型原则

- Gateway 输出内部模型或稳定 DTO，不直接暴露 SDK 原始结构
- 时间、大小、状态等字段在 Gateway 或 Service 层统一格式化
- 错误在 Gateway 层转成可识别的领域错误

## 7. HTTP 层设计

## 7.1 Handler 原则

- 一个 handler 只做一件事
- 负责参数解析、调用 service、写回响应
- 不在 handler 中拼业务流程
- 不直接依赖 Docker SDK

### 7.2 路由分组建议

- `/healthz`
- `/api/v1/system/*`
- `/api/v1/containers/*`
- `/api/v1/images/*`
- `/api/v1/volumes/*`
- `/api/v1/networks/*`
- `/api/v1/monitoring/*`
- `/api/v1/settings/*`
- `/api/v1/compose/*`
- `/api/v1/terminal/*`

### 7.2 当前已实现路由

- `GET /healthz`
- `GET /api/v1/system/summary`
- `GET /api/v1/containers`
- `POST /api/v1/containers/{id}/start`
- `POST /api/v1/containers/{id}/stop`
- `POST /api/v1/containers/{id}/restart`
- `DELETE /api/v1/containers/{id}`
- `GET /api/v1/images`
- `POST /api/v1/images/pull`
- `POST /api/v1/images/prune`
- `DELETE /api/v1/images/{id}`
- `GET /api/v1/volumes`
- `POST /api/v1/volumes`
- `DELETE /api/v1/volumes/{name}`
- `GET /api/v1/networks`
- `POST /api/v1/networks`
- `DELETE /api/v1/networks/{id}`

### 7.3 中间件建议

- 请求日志
- panic recover
- request id
- CORS
- 认证预留中间件
- 审计上下文注入

当前实现状态：

- 当前采用标准库 `http.ServeMux` 直接注册 handler
- 尚未形成统一中间件链
- 审计元数据在 handler 中从 request 提取后传入 service
- 认证与 request id 中间件仍未实现

## 8. 配置设计

## 8.1 配置优先级

必须遵守：

1. 命令行参数
2. 环境变量
3. 配置文件
4. 默认值

### 8.2 配置分组建议

- `server.addr`
- `server.read_timeout`
- `server.write_timeout`
- `docker.host`
- `docker.api_version`
- `docker.tls.enabled`
- `docker.tls.cert_file`
- `docker.tls.key_file`
- `docker.tls.ca_file`
- `auth.enabled`
- `audit.enabled`
- `audit.output`
- `ui.embedded_assets`

### 8.3 Settings 页映射建议

前端 Settings 页不应直接映射全部后端配置，只映射明确允许调整的子集：

- Docker 连接参数
- 认证开关预留
- 通知偏好
- 外观偏好

其中通知和外观更适合作为应用配置资源，而不是 Docker Engine 配置本身。

当前实现状态：

- 配置模型已存在于后端启动流程
- 尚无对外 settings API

## 9. 错误模型设计

后端应提供稳定错误码，便于前端做分类处理。

建议错误分类：

- `invalid_argument`
- `not_found`
- `conflict`
- `unauthorized`
- `forbidden`
- `docker_unavailable`
- `stream_closed`
- `internal_error`

当前实现状态：

- 已稳定使用 `invalid_argument`、`not_found`、`conflict`、`docker_unavailable`
- `method_not_allowed` 也已在 HTTP 层直接返回
- `unauthorized`、`forbidden`、`stream_closed` 仍属预留

建议错误体统一为：

```json
{
  "error": {
    "code": "not_found",
    "message": "container not found",
    "details": {}
  }
}
```

当前实现状态：

- 当前错误体已经是统一 envelope，形态与上述建议一致

## 10. 实时通道设计

## 10.1 SSE 日志流

SSE 适用于：

- 单向日志输出
- 浏览器易接入
- 支持断线重连策略

服务端职责：

- 建立日志流
- 按事件格式写出 `log / error / eof`
- 连接断开后及时回收底层 reader

### 10.2 WebSocket 终端

WebSocket 适用于：

- 双向输入输出
- 终端 resize
- 会话关闭控制

服务端职责：

- 创建 exec session
- 维护 session id 与底层 attach 流映射
- 处理消息类型校验和异常收尾

## 11. 审计与安全扩展点

## 11.1 必审计行为

- 容器启停删重启
- 镜像拉取与删除
- 卷和网络创建删除
- Compose 项目操作
- 终端会话创建和关闭
- 设置变更提交

当前实现状态：

- 已实现容器启停删重启审计
- 已实现镜像拉取、删除、prune 审计
- 已实现卷和网络创建删除审计
- compose、terminal、settings 相关审计未实现

### 11.2 审计字段建议

- `event_id`
- `timestamp`
- `actor`
- `source_ip`
- `target_type`
- `target_id`
- `action`
- `result`
- `details`

当前实现状态：

- 当前 recorder 已记录 `event_type`、`target_type`、`target_id`、`action`、`actor`、`source`、`result`、`details`
- `event_id`、独立持久化存储与查询接口仍未实现

### 11.3 认证接入点

虽然首版不实现完整用户系统，但后端必须预留：

- HTTP 中间件鉴权入口
- request context 中的 actor 信息
- WebSocket 握手身份继承
- SSE 订阅身份继承

## 12. 可测试性设计

后端设计必须天然支持单元测试：

- Service 通过接口注入 Gateway
- Handler 通过 `httptest` 独立测试
- 实时能力通过 fake stream 测试建链和关闭
- 审计通过 mock recorder 验证触发与内容

## 13. 实现顺序建议

建议按以下顺序落地：

1. system、containers、images、volumes、networks 的只读接口
2. 容器、镜像、卷、网络的写操作
3. monitoring 与 settings
4. logs SSE
5. terminal WebSocket
6. compose

### 13.1 当前进度回写

- 第 1 步已完成
- 第 2 步已完成首版
- 第 3 步尚未开始
- 第 4 到第 6 步尚未开始

## 14. 与其他文档的关系

- 前端设计见 `frontend-design.md`
- 接口与前后端交互见 `integration.md`
- 总体架构见 `architecture.md`
- 安全边界见 `security.md`
