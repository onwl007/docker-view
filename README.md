# docker-view

A web application for managing containers on Linux servers.

The repository now follows a Go-first structure inspired by [`golang-standards/project-layout`](https://github.com/golang-standards/project-layout), with a single standalone frontend app in [`web/`](./web).

## Tech Stack

### Backend

- Go
- Cobra for CLI entrypoints
- Viper for configuration loading
- Linux-first container runtime integration

### Frontend

- Vue 3
- Vite
- TypeScript
- `pnpm`

## Repository Layout

```text
.
├─ cmd/docker-view/        # application entrypoint
├─ internal/app/           # application bootstrap
├─ internal/cli/           # Cobra command wiring
├─ internal/config/        # configuration defaults and parsing
├─ internal/http/          # HTTP server and handlers
├─ pkg/                    # reusable public Go packages
├─ configs/                # example config files
├─ deployments/            # docker/systemd deployment assets
├─ build/                  # packaging/build support
├─ docs/                   # design and ops docs
├─ scripts/                # development scripts
├─ test/                   # integration/e2e test assets
└─ web/                    # standalone Vue frontend
```

## Configuration Precedence

The backend configuration is loaded by Viper with this precedence:

1. Command-line flags
2. Environment variables
3. Configuration file
4. Built-in defaults

Current config keys:
- `http.addr`
- `log.level`
- `docker.host`
- `web.dir`

Environment variables use the `DOCKER_VIEW_` prefix. For example:
- `DOCKER_VIEW_HTTP_ADDR`
- `DOCKER_VIEW_LOG_LEVEL`
- `DOCKER_VIEW_DOCKER_HOST`
- `DOCKER_VIEW_WEB_DIR`

An example config file lives at [configs/config.example.yaml](/Users/wanglei/workspace/workspace-github/docker-view/configs/config.example.yaml).

## Development

### Backend

Run the server:

```bash
go run ./cmd/docker-view --config ./configs/config.example.yaml
```

Run the backend in debug-friendly mode:

```bash
make debug
```

Run unit tests:

```bash
go test ./...
```

### Frontend

Install dependencies:

```bash
cd web
pnpm install
```

Run the dev server:

```bash
cd web
pnpm dev
```

Run checks:

```bash
cd web
pnpm lint
pnpm test
pnpm typecheck
```

## Makefile

The repository now includes a root [Makefile](/Users/wanglei/workspace/workspace-github/docker-view/Makefile) for common workflows:

```bash
make debug
make debug-build
make test
make lint
make build
make release
```

Notes:
- `make debug` starts the Go service with `-gcflags=all=-N -l` and uses `CONFIG=./configs/config.example.yaml` by default.
- `make build` generates the frontend bundle and the backend binary under `build/bin/`.
- `make release` runs frontend build, backend/frontend tests, lint, typecheck, then creates a versioned tarball under `build/dist/`.
- Release metadata can be overridden with `VERSION`, `GOOS`, `GOARCH`, `COMMIT`, and `BUILD_DATE`.

## Current Status

The repository contains:
- a Go application entrypoint in [cmd/docker-view/main.go](/Users/wanglei/workspace/workspace-github/docker-view/cmd/docker-view/main.go)
- Cobra and Viper wiring in [internal/cli/root.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/cli/root.go)
- configuration defaults in [internal/config/config.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/config/config.go)
- a minimal HTTP server with a health endpoint in [internal/http/server.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/http/server.go)
- a standalone Vue app scaffold in [web/package.json](/Users/wanglei/workspace/workspace-github/docker-view/web/package.json)

Next steps:
1. Add real `/api/v1` handlers for hosts, containers, images, logs, and audit records.
2. Expand the web app with routing, typed API calls, and stateful pages.
3. Add deployment assets under `deployments/`.
