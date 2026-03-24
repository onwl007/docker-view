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

- React
- Vite
- TypeScript
- TanStack Router
- TanStack Query
- Tailwind CSS
- shadcn/ui
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
└─ web/                    # standalone React frontend
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

### Full project

Start the backend debugger-friendly server and the Vite frontend together:

```bash
make dev
```

This is the recommended local workflow for Phase 1 and later frontend/backend integration work.

### Backend

Run the server:

```bash
go run ./cmd/docker-view --config ./configs/config.example.yaml
```

Run the backend in debug-friendly mode:

```bash
make dev-backend
```

Run unit tests:

```bash
make test-backend
```

### Frontend

Install dependencies:

```bash
make install-frontend
```

Run the dev server:

```bash
make dev-frontend
```

Run checks:

```bash
make test-frontend
make lint-frontend
make typecheck
```

## Makefile

The repository now includes a root [Makefile](/Users/wanglei/workspace/workspace-github/docker-view/Makefile) for common workflows:

```bash
make dev
make dev-backend
make dev-frontend
make debug
make debug-build
make test
make lint
make build
make release
```

Notes:
- `make dev` starts the Go backend and Vite dev server together and stops both when you exit.
- `make dev-backend` starts the Go service with `-gcflags=all=-N -l` and uses `CONFIG=./configs/config.example.yaml` by default.
- `make dev-frontend` starts the Vite dev server on `VITE_HOST` and uses the built-in proxy to forward `/healthz` and `/api/*` to `http://localhost:8080`.
- `make debug` is kept as an alias of `make dev-backend`.
- Make targets use a repository-local Go build cache under `.cache/go-build`, which makes local test and debug flows more predictable.
- `make build` generates the frontend bundle and the backend binary under `build/bin/`.
- `make release` runs frontend build, backend/frontend tests, lint, typecheck, then creates a versioned tarball under `build/dist/`.
- Release metadata can be overridden with `VERSION`, `GOOS`, `GOARCH`, `COMMIT`, and `BUILD_DATE`.
- Useful overrides: `CONFIG=./configs/config.example.yaml` and `VITE_HOST=0.0.0.0`.

## Current Status

The repository contains:
- a Go application entrypoint in [cmd/docker-view/main.go](/Users/wanglei/workspace/workspace-github/docker-view/cmd/docker-view/main.go)
- Cobra and Viper wiring in [internal/cli/root.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/cli/root.go)
- configuration defaults in [internal/config/config.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/config/config.go)
- a Docker summary gateway plus Phase 2 resource read APIs for containers, images, volumes, and networks in [internal/docker/client.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/docker/client.go), [internal/docker/resources.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/docker/resources.go), [internal/service/system.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/service/system.go), and [internal/service/resources.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/service/resources.go)
- an HTTP server with `/healthz`, `/api/v1/system/summary`, `/api/v1/containers`, `/api/v1/images`, `/api/v1/volumes`, `/api/v1/networks`, unified API envelopes, and SPA asset serving in [internal/http/server.go](/Users/wanglei/workspace/workspace-github/docker-view/internal/http/server.go)
- a standalone React app with a dashboard and API-backed Phase 2 resource pages in [web/src/routes/root.tsx](/Users/wanglei/workspace/workspace-github/docker-view/web/src/routes/root.tsx), [web/src/routes/dashboard.tsx](/Users/wanglei/workspace/workspace-github/docker-view/web/src/routes/dashboard.tsx), [web/src/routes/containers.tsx](/Users/wanglei/workspace/workspace-github/docker-view/web/src/routes/containers.tsx), [web/src/routes/images.tsx](/Users/wanglei/workspace/workspace-github/docker-view/web/src/routes/images.tsx), [web/src/routes/volumes.tsx](/Users/wanglei/workspace/workspace-github/docker-view/web/src/routes/volumes.tsx), and [web/src/routes/networks.tsx](/Users/wanglei/workspace/workspace-github/docker-view/web/src/routes/networks.tsx)

Next steps:
1. Extend Phase 2 from list browsing into resource detail views and relationship drill-downs.
2. Start Phase 3 write operations for core resources with confirmation flows, error handling, cache invalidation, and audit hooks.
3. Add later-phase monitoring, settings, logs, terminal, Compose, and deployment assets under `deployments/`.
