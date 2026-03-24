# docker-view API 设计

## 1. 设计原则

- 所有接口使用 `/api/v1` 前缀
- 默认返回 `application/json`
- 响应结构稳定，避免返回未约束的动态字段
- 流式接口与普通 REST 接口分离
- 资源操作尽量符合 REST 风格，但允许对运行时动作使用 action 风格子路径

## 2. 通用响应格式

### 2.1 成功响应

查询接口建议统一返回：

```json
{
  "data": {},
  "meta": {}
}
```

列表接口建议：

```json
{
  "data": [],
  "meta": {
    "total": 0
  }
}
```

动作类接口建议：

```json
{
  "data": {
    "success": true
  }
}
```

### 2.2 错误响应

所有错误响应统一为：

```json
{
  "error": {
    "code": "container_not_found",
    "message": "container not found",
    "details": {}
  }
}
```

错误码应稳定，便于前端按类型处理。

## 3. 资源模型

## 3.1 System Overview

### `GET /api/v1/system/summary`

返回：

- Docker Engine 连接状态
- 主机名
- Docker 版本信息
- 容器、镜像、卷、网络数量
- Compose 项目数量

当前实现状态：

- 已实现
- 当前返回容器、镜像、卷、网络统计与主机基础信息
- Compose 项目数量尚未实现

### `GET /api/v1/system/health`

返回后端服务、Docker Engine 和关键依赖的连通状态。

## 3.2 Containers

### `GET /api/v1/containers`

支持查询参数：

- `status`
- `name`
- `label`
- `all`

返回字段建议包括：

- `id`
- `name`
- `image`
- `state`
- `status`
- `createdAt`
- `ports`
- `labels`
- `composeProject`

当前实现状态：

- 已实现列表查询
- 当前支持 `q`、`status`、`all`、`limit`、`sort`
- 详情接口尚未实现

### `GET /api/v1/containers/{id}`

返回容器详情：

- 基础元数据
- 挂载信息
- 网络信息
- 端口映射
- 环境变量摘要
- 启动命令摘要
- 资源限制摘要

当前实现状态：

- 尚未实现

### `POST /api/v1/containers/{id}/start`

启动容器。

当前实现状态：

- 已实现

### `POST /api/v1/containers/{id}/stop`

停止容器。

请求体可选：

```json
{
  "timeoutSeconds": 10
}
```

当前实现状态：

- 已实现

### `POST /api/v1/containers/{id}/restart`

重启容器。

当前实现状态：

- 已实现

### `DELETE /api/v1/containers/{id}`

删除容器。

请求参数或请求体应支持：

- `force`
- `removeVolumes`

当前实现状态：

- 已实现
- 当前支持 query 参数 `force`、`removeVolumes`

## 3.3 Container Logs

### `GET /api/v1/containers/{id}/logs`

用于获取一次性日志片段。

支持参数：

- `stdout`
- `stderr`
- `since`
- `until`
- `tail`
- `timestamps`

### `GET /api/v1/containers/{id}/logs/stream`

SSE 日志流接口。

事件类型建议：

- `log`
- `error`
- `eof`

`log` 事件数据建议包括：

```json
{
  "stream": "stdout",
  "timestamp": "2026-03-20T12:00:00Z",
  "message": "server started"
}
```

## 3.4 Container Exec / Terminal

### `POST /api/v1/containers/{id}/exec-sessions`

创建 exec 会话。

请求体建议：

```json
{
  "command": ["/bin/sh"],
  "tty": true,
  "workingDir": "",
  "env": []
}
```

返回：

```json
{
  "data": {
    "sessionId": "exec_xxx",
    "websocketPath": "/api/v1/terminal/sessions/exec_xxx/ws"
  }
}
```

### `GET /api/v1/terminal/sessions/{sessionId}/ws`

升级为 WebSocket，承载终端会话。

建议的消息协议：

- `stdin`
- `resize`
- `close`
- `stdout`
- `stderr`
- `exit`
- `error`

示例：

```json
{ "type": "stdin", "data": "ls\n" }
```

```json
{ "type": "resize", "cols": 120, "rows": 40 }
```

## 3.5 Images

### `GET /api/v1/images`

返回镜像列表。

支持参数：

- `name`
- `dangling`

当前实现状态：

- 已实现列表查询
- 当前支持 `q`

### `GET /api/v1/images/{id}`

返回镜像详情与关联容器摘要。

当前实现状态：

- 尚未实现

### `POST /api/v1/images/pull`

请求体：

```json
{
  "reference": "nginx:latest"
}
```

当前实现状态：

- 已实现

### `DELETE /api/v1/images/{id}`

支持：

- `force`

当前实现状态：

- 已实现
- 当前支持 query 参数 `force`

### `POST /api/v1/images/prune`

清理未使用镜像。

当前实现状态：

- 已实现

## 3.6 Volumes

### `GET /api/v1/volumes`

返回卷列表。

支持参数：

- `name`
- `dangling`

当前实现状态：

- 已实现列表查询
- 当前支持 `q`

### `GET /api/v1/volumes/{name}`

返回卷详情与关联容器。

当前实现状态：

- 尚未实现

### `POST /api/v1/volumes`

请求体建议：

```json
{
  "name": "postgres_data",
  "labels": {}
}
```

当前实现状态：

- 已实现
- 当前只要求 `name`

### `DELETE /api/v1/volumes/{name}`

支持：

- `force`

当前实现状态：

- 已实现
- 当前支持 query 参数 `force`

## 3.7 Networks

### `GET /api/v1/networks`

返回网络列表。

支持参数：

- `name`
- `driver`
- `scope`

当前实现状态：

- 已实现列表查询
- 当前支持 `q`

### `GET /api/v1/networks/{id}`

返回网络详情与关联容器。

当前实现状态：

- 尚未实现

### `POST /api/v1/networks`

请求体建议：

```json
{
  "name": "frontend_net",
  "driver": "bridge",
  "attachable": false,
  "internal": false,
  "labels": {}
}
```

当前实现状态：

- 已实现
- 当前支持 `name`、`driver`、`internal`

### `DELETE /api/v1/networks/{id}`

删除网络。

当前实现状态：

- 已实现

## 3.8 Monitoring

### `GET /api/v1/monitoring/host`

返回主机资源摘要：

- `cpu`
- `memory`
- `disk`
- `network`
- `sampledAt`

当前实现状态：

- 已实现
- 当前返回 `cpuCores`、`cpuPercent`、`memoryUsedBytes`、`memoryTotalBytes`、`diskUsedBytes`、`diskTotalBytes`、`networkRxBytes`、`networkTxBytes`、`runningContainers`、`totalContainers`、`sampledAt`
- 当前主机资源视图主要基于 Docker stats 聚合与 Docker root 磁盘占用

### `GET /api/v1/monitoring/containers`

返回运行中容器资源快照列表。

支持参数：

- `name`
- `status`
- `limit`

当前实现状态：

- 已实现
- 当前返回运行中容器的 CPU、内存、网络、块设备 I/O、PIDs 与采样时间
- 当前不支持额外查询参数

## 3.9 Settings

### `GET /api/v1/settings`

返回当前配置摘要和可编辑设置。

返回建议包含：

- `docker`
- `security`
- `notifications`
- `appearance`
- `meta.requiresRestartFields`

当前实现状态：

- 已实现
- 当前返回 `docker`、`security`、`notifications`、`appearance`
- 当前不返回 schema，前端表单字段由页面固定定义

### `POST /api/v1/settings/validate`

校验设置请求体，返回字段级校验结果。

当前实现状态：

- 已实现
- 当前返回 `valid`、`requiresRestart`、`restartKeys`、`issues`

### `PUT /api/v1/settings`

保存可编辑设置。

响应建议：

```json
{
  "data": {
    "success": true,
    "requiresRestart": true
  }
}
```

当前实现状态：

- 已实现
- 当前返回保存后的 `settings`、`requiresRestart`、`restartKeys`
- 当前保存范围为受控内存态，不写回配置文件

## 3.10 Compose

### `GET /api/v1/compose/projects`

返回 Compose 项目列表。

### `GET /api/v1/compose/projects/{name}`

返回项目详情和关联容器、网络、卷信息。

### `POST /api/v1/compose/projects/{name}/start`

启动项目。

### `POST /api/v1/compose/projects/{name}/stop`

停止项目。

### `POST /api/v1/compose/projects/{name}/recreate`

重建项目。

### `DELETE /api/v1/compose/projects/{name}`

删除项目及其关联资源，具体删除策略必须受请求参数控制。

## 4. 前端协作约定

- 列表页的搜索、筛选、分页参数应映射为 query string
- 列表和详情接口返回字段命名统一使用 `camelCase`
- Dashboard 写操作涉及资源数量变化时，前端应失效 `system/summary`
- 日志流和终端会话不进入 Query Cache

## 5. 状态码约定

- `200 OK`：成功查询或动作执行成功
- `201 Created`：资源或会话创建成功
- `400 Bad Request`：请求参数非法
- `404 Not Found`：目标资源不存在
- `409 Conflict`：当前状态不允许操作
- `500 Internal Server Error`：系统内部错误
- `502 Bad Gateway`：Docker Engine 调用失败或不可达

## 6. 典型错误码

- `docker_unavailable`
- `container_not_found`
- `image_not_found`
- `volume_not_found`
- `network_not_found`
- `compose_project_not_found`
- `invalid_request`
- `terminal_session_not_found`
- `terminal_session_closed`
- `operation_conflict`

## 7. 实现约束

- API 返回字段命名保持稳定，不直接透传 Docker SDK 原始结构
- Docker 原始字段过多时，应做后端视图模型裁剪
- 所有写操作预留审计钩子
- WebSocket 和 SSE 接口要有明确的关闭语义和错误事件语义

## 8. 与其他文档关系

- 更完整的交互契约见 `integration.md`
- 前端页面与路由设计见 `frontend-design.md`
- 后端模块与服务职责见 `backend-design.md`
