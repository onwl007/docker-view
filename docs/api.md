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

### `GET /api/v1/containers/{id}`

返回容器详情：

- 基础元数据
- 挂载信息
- 网络信息
- 端口映射
- 环境变量摘要
- 启动命令摘要
- 资源限制摘要

### `POST /api/v1/containers/{id}/start`

启动容器。

### `POST /api/v1/containers/{id}/stop`

停止容器。

请求体可选：

```json
{
  "timeoutSeconds": 10
}
```

### `POST /api/v1/containers/{id}/restart`

重启容器。

### `DELETE /api/v1/containers/{id}`

删除容器。

请求参数或请求体应支持：

- `force`
- `removeVolumes`

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

### `GET /api/v1/images/{id}`

返回镜像详情与关联容器摘要。

### `POST /api/v1/images/pull`

请求体：

```json
{
  "reference": "nginx:latest"
}
```

### `DELETE /api/v1/images/{id}`

支持：

- `force`

## 3.6 Volumes

### `GET /api/v1/volumes`

返回卷列表。

### `GET /api/v1/volumes/{name}`

返回卷详情及关联容器摘要。

### `POST /api/v1/volumes`

请求体：

```json
{
  "name": "app-data",
  "driver": "local",
  "labels": {}
}
```

### `DELETE /api/v1/volumes/{name}`

删除卷。

## 3.7 Networks

### `GET /api/v1/networks`

返回网络列表。

### `GET /api/v1/networks/{id}`

返回网络详情及关联容器。

### `POST /api/v1/networks`

请求体：

```json
{
  "name": "app-net",
  "driver": "bridge",
  "internal": false,
  "attachable": false,
  "labels": {}
}
```

### `DELETE /api/v1/networks/{id}`

删除网络。

## 3.8 Compose Projects

### `GET /api/v1/compose/projects`

返回 Compose 项目列表。

每个项目建议字段：

- `name`
- `status`
- `workingDir`
- `configFiles`
- `containerCount`
- `services`

### `GET /api/v1/compose/projects/{name}`

返回项目详情和关联资源。

### `POST /api/v1/compose/projects/{name}/up`

启动或拉起项目。

### `POST /api/v1/compose/projects/{name}/down`

停止或下线项目。

### `POST /api/v1/compose/projects/{name}/restart`

重启项目内服务。

### `POST /api/v1/compose/projects/{name}/recreate`

重建项目容器。

## 4. 状态码约定

- `200 OK`：成功查询或动作执行成功
- `201 Created`：资源或会话创建成功
- `400 Bad Request`：请求参数非法
- `404 Not Found`：目标资源不存在
- `409 Conflict`：当前状态不允许操作
- `500 Internal Server Error`：系统内部错误
- `502 Bad Gateway`：Docker Engine 调用失败或不可达

## 5. 典型错误码

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

## 6. 实现约束

- API 返回字段命名保持稳定，不直接透传 Docker SDK 原始结构
- Docker 原始字段过多时，应做后端视图模型裁剪
- 所有写操作预留审计钩子
- WebSocket 和 SSE 接口要有明确的关闭语义和错误事件语义
