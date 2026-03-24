# docker-view 部署说明

## 1. 目标

本文档描述首版 `docker-view` 的最小部署方式，包括容器部署、`systemd` 部署，以及运行前必须明确的约束。

## 2. 运行前提

- 目标主机必须已安装 Docker Engine
- 运行用户必须能够访问 Docker Socket
- 建议仅在受控内网或反向代理之后暴露服务
- 若启用静态 token 鉴权，应通过环境变量或受控配置文件注入，而不是写入公开仓库

## 3. Docker 部署

仓库提供了以下资产：

- [deployments/docker/Dockerfile](/Users/wanglei/workspace/workspace-github/docker-view/deployments/docker/Dockerfile)
- [deployments/docker/docker-compose.yml](/Users/wanglei/workspace/workspace-github/docker-view/deployments/docker/docker-compose.yml)

启动示例：

```bash
docker compose -f deployments/docker/docker-compose.yml up --build -d
```

说明：

- 容器内会运行已编译的 Go 服务和构建后的前端静态文件
- 默认挂载 `/var/run/docker.sock`
- 默认读取 `configs/config.example.yaml`

## 4. systemd 部署

仓库提供了以下资产：

- [deployments/systemd/docker-view.service](/Users/wanglei/workspace/workspace-github/docker-view/deployments/systemd/docker-view.service)

建议的部署目录：

- 二进制：`/opt/docker-view/docker-view`
- 前端静态文件：`/opt/docker-view/web-dist`
- 配置文件：`/etc/docker-view/config.yaml`

启用示例：

```bash
sudo cp deployments/systemd/docker-view.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now docker-view
```

## 5. 安全建议

- 若开启 `security.requireAuthentication`，务必同时设置 `security.authToken`
- 静态 token 仅作为首版最小鉴权方案，生产环境更建议放在反向代理和额外认证层之后
- 审计事件当前默认保存在进程内存，服务重启后不会保留

## 6. 当前限制

- Docker 部署当前默认以 Linux/amd64 为目标构建
- 审计尚未持久化落盘
- CI 已覆盖构建、测试、lint、typecheck 和 `make release` smoke，但尚未强制覆盖率门槛
