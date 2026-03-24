# docker-view 前后端交互设计

## 1. 文档目标

本文档定义 docker-view 前端与后端之间的资源边界、交互协议、缓存策略、错误语义和实时通信方式，作为前后端协作契约。

## 2. 交互原则

- 普通资源查询与管理操作默认使用 REST
- 日志实时输出使用 SSE
- 容器终端使用 WebSocket
- 所有 REST 接口统一使用 `/api/v1`
- 响应结构和错误结构保持稳定
- 前端只消费受控 DTO，不感知 Docker SDK 细节

## 3. 交互分层

前端交互分为三层：

- `lib/api`：HTTP / SSE / WebSocket 客户端封装
- `lib/query`：query key、query option、失效策略
- `features/*`：领域 mutation、表单提交、页面状态协调

后端交互分为三层：

- `internal/http`：协议接入
- `internal/service`：业务编排
- `internal/docker`：Docker Gateway

## 4. REST 契约

## 4.1 成功响应

列表查询：

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

对象查询：

```json
{
  "data": {}
}
```

动作操作：

```json
{
  "data": {
    "success": true
  }
}
```

### 4.2 错误响应

```json
{
  "error": {
    "code": "conflict",
    "message": "container is already stopped",
    "details": {}
  }
}
```

前端必须按 `error.code` 做错误分流，不能依赖 message 文本匹配。

## 5. 核心资源交互

## 5.1 Dashboard

前端页面：

- `DashboardPage`

后端接口建议：

- `GET /api/v1/system/summary`
- `GET /api/v1/containers?limit=5&sort=recent`
- `GET /api/v1/monitoring/host`

Query 策略建议：

- `system/summary`：短时缓存，支持手动刷新
- `containers recent`：短时缓存
- `monitoring/host`：可轮询

当前实现状态：

- `system/summary`、最近容器摘要查询与 `monitoring/host` 已实现

## 5.2 Containers

接口建议：

- `GET /api/v1/containers`
- `GET /api/v1/containers/{id}`
- `POST /api/v1/containers/{id}/start`
- `POST /api/v1/containers/{id}/stop`
- `POST /api/v1/containers/{id}/restart`
- `DELETE /api/v1/containers/{id}`

前端失效策略：

- 容器动作成功后失效 `['containers']`
- 若当前处于详情页，同时失效 `['containers', id]`
- 若 Dashboard 展示容器摘要，同时失效 `['system', 'summary']`

当前实现状态：

- 列表查询与 `start / stop / restart / delete` 已实现
- 前端已接入确认、提交、成功/失败反馈和 query invalidation
- 详情页与详情 query 尚未实现

## 5.3 Images

接口建议：

- `GET /api/v1/images`
- `GET /api/v1/images/{id}`
- `POST /api/v1/images/pull`
- `POST /api/v1/images/prune`
- `DELETE /api/v1/images/{id}`

前端失效策略：

- 拉取、删除、清理成功后失效 `['images']` 和 `['system', 'summary']`

当前实现状态：

- 列表查询、拉取、删除、清理已实现
- 详情页与详情 query 尚未实现

## 5.4 Volumes

接口建议：

- `GET /api/v1/volumes`
- `GET /api/v1/volumes/{name}`
- `POST /api/v1/volumes`
- `DELETE /api/v1/volumes/{name}`

当前实现状态：

- 列表查询、创建、删除已实现
- 详情页与详情 query 尚未实现

## 5.5 Networks

接口建议：

- `GET /api/v1/networks`
- `GET /api/v1/networks/{id}`
- `POST /api/v1/networks`
- `DELETE /api/v1/networks/{id}`

当前实现状态：

- 列表查询、创建、删除已实现
- 详情页与详情 query 尚未实现

## 5.6 Monitoring

接口建议：

- `GET /api/v1/monitoring/host`
- `GET /api/v1/monitoring/containers`

前端策略：

- 使用轮询而不是长期缓存
- 采样间隔由 UI 下拉框驱动
- 轮询暂停和恢复必须可控

当前实现状态：

- `GET /api/v1/monitoring/host` 与 `GET /api/v1/monitoring/containers` 已实现
- 前端已接入轮询间隔切换和手动刷新
- 当前采样主要基于 Docker stats 聚合，不依赖 SSE 或 WebSocket

## 5.7 Settings

接口建议：

- `GET /api/v1/settings`
- `PUT /api/v1/settings`
- `POST /api/v1/settings/validate`

交互约定：

- `GET` 返回当前配置摘要和可编辑配置 schema
- `PUT` 返回保存结果以及是否需要重启
- `validate` 用于保存前进行字段校验

当前实现状态：

- `GET /api/v1/settings`、`POST /api/v1/settings/validate`、`PUT /api/v1/settings` 已实现
- 前端已接入读取、Reset、校验、保存与 restart keys 提示
- 当前设置保存为受控内存态，不写回配置文件

## 5.8 Compose

接口建议：

- `GET /api/v1/compose/projects`
- `GET /api/v1/compose/projects/{name}`
- `POST /api/v1/compose/projects/{name}/start`
- `POST /api/v1/compose/projects/{name}/stop`
- `POST /api/v1/compose/projects/{name}/recreate`
- `DELETE /api/v1/compose/projects/{name}`

前端失效策略：

- 项目级动作成功后失效 `['compose', 'projects']`
- 若当前处于详情页，同时失效 `['compose', 'projects', name]`
- 若 Dashboard 后续展示 Compose 摘要，同时失效 `['system', 'summary']`

当前实现状态：

- 上述接口已实现
- 前端已接入 Compose 列表页、详情页和项目级确认操作
- 当前项目识别基于 Compose 标签聚合容器、网络、卷
- 当前 `recreate` 实现为项目内容器批量重启
- 当前 `delete` 删除容器和 Compose 标记网络，保留卷

## 6. 实时交互

## 6.1 日志 SSE

接口：

- `GET /api/v1/containers/{id}/logs`
- `GET /api/v1/containers/{id}/logs/stream`

事件类型：

- `log`
- `error`
- `eof`

前端行为：

- 历史日志先用 REST 拉取
- 再接入 SSE 追加 tail 内容
- 切换容器或离开页面时主动关闭连接

当前实现状态：

- 历史日志 REST 与 SSE 追加已实现
- 容器切换或页面卸载时前端会关闭 SSE 连接

### 6.2 终端 WebSocket

流程：

1. 前端 `POST /api/v1/containers/{id}/exec-sessions`
2. 后端返回 `sessionId` 和 `websocketPath`
3. 前端建立 WebSocket 连接
4. 前端发送 `stdin / resize / close`
5. 后端发送 `stdout / stderr / exit / error`

前端要求：

- 将终端连接状态显式呈现为 connecting / ready / closed / error
- 断开后允许用户重新创建会话

当前实现状态：

- 前端已实现 `connecting / ready / closed / error` 状态呈现
- 当前断开后支持重新创建新 session，不复用旧 session

## 7. 前端缓存与刷新策略

### 7.1 适合缓存的资源

- 系统总览
- 容器、镜像、卷、网络列表
- 资源详情
- 设置配置

### 7.2 不进入 Query Cache 的资源

- 日志流
- WebSocket 终端会话
- 瞬时 toast 提示

### 7.3 失效规则

- 写操作只失效相关领域 query key，避免全站刷新
- 对 Dashboard 的统计影响较大的写操作，补充失效 `['system', 'summary']`
- Monitoring 默认不因普通写操作强制失效，由轮询自然收敛

当前实现状态：

- `containers`、`images`、`volumes`、`networks` 写操作均已失效各自 query key
- 会影响总览的写操作已补充失效 `['system', 'summary']`

## 8. 错误处理协作约定

前端建议把后端错误码映射为以下 UI 行为：

- `invalid_argument`：表单字段错误或筛选条件错误
- `not_found`：资源已不存在，提示刷新
- `conflict`：资源状态冲突，提示用户当前状态
- `docker_unavailable`：顶部全局错误横幅
- `unauthorized` / `forbidden`：预留认证接入后的跳转与提示
- `internal_error`：通用错误提示

## 9. DTO 设计原则

- 字段命名统一使用 `camelCase`
- 时间统一返回 ISO 8601 字符串
- 大小字段同时提供数值原始值和展示摘要时，优先由后端保证一致语义
- 布尔字段使用明确命名，如 `isRunning`、`requiresRestart`

## 10. 版本与兼容性

- 首版全部接口固定在 `/api/v1`
- 非兼容修改必须进入新版本路径
- 可选字段新增优先于破坏既有字段语义

## 11. 与其他文档的关系

- API 清单见 `api.md`
- 前端页面设计见 `frontend-design.md`
- 后端模块设计见 `backend-design.md`
- 安全约束见 `security.md`
