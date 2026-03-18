# AGENTS.md

## Project Overview

This repository is for a web application that manages containers on Linux servers through a browser.

Core goals:
- Use a modern frontend stack based on Vue 3.
- Use Go as the primary backend runtime.
- Manage Linux container workloads from the web UI.
- Keep the repository structure close to the Go community `project-layout` conventions where that helps clarity.
- Use a single standalone frontend application instead of a `pnpm` workspace.
- Keep the architecture pragmatic, deployable, and maintainable.

Primary technical direction:
- Frontend: Vue 3, Vite, TypeScript, `pnpm`.
- Backend: Go, Cobra, Viper.
- Target environment: Linux servers.

## Repository Shape

Prefer a Go-oriented top-level structure inspired by `golang-standards/project-layout`.

Recommended layout:

```text
.
├─ AGENTS.md
├─ README.md
├─ go.mod
├─ cmd/
│  └─ docker-view/
├─ internal/
│  ├─ app/
│  ├─ cli/
│  ├─ config/
│  └─ http/
├─ pkg/
├─ configs/
├─ deployments/
│  ├─ docker/
│  └─ systemd/
├─ build/
├─ docs/
├─ scripts/
├─ test/
└─ web/
```

Rules:
- `cmd/` contains executable entrypoints.
- `internal/` contains private application code.
- `pkg/` contains intentionally reusable public Go packages only.
- `configs/` contains example and environment-specific configuration files.
- `deployments/` contains deployment assets.
- `web/` contains the only frontend application and uses `pnpm` for dependency management.
- `docs/` contains design and operational documents.
- `scripts/` contains development and automation scripts.

## Frontend Rules

- Use Vue 3 with the Composition API.
- Prefer `script setup` for single-file components unless a clear exception exists.
- Use `pnpm` only inside `web/`.
- Prefer strict TypeScript settings.
- Keep component logic out of templates.
- Keep state management minimal. Add Pinia only when shared state justifies it.
- Frontend code style must align with Vue 3 official recommended practices.

## Backend Rules

- Use Go as the only backend language.
- Follow the official `Effective Go` guidance.
- Use Cobra for command-line entrypoints.
- Use Viper for configuration loading.
- Configuration precedence must be: command-line flags, then environment variables, then configuration file, then defaults.
- Keep handlers thin and move business logic into `internal/` packages.
- Isolate container runtime integration behind explicit interfaces.

## API Design

- Default to REST for the initial version.
- Use `/api/v1/...` versioned routes.
- Return stable JSON response shapes.
- Standardize error responses.
- Use WebSocket or SSE only for logs or live events where polling is inadequate.

## Security Constraints

- Never trust client-side authorization.
- All mutating operations must be authenticated.
- Record audit logs for sensitive actions.
- Avoid storing plaintext secrets.
- Restrict command execution surface area.
- Do not expose raw shell access through the web UI unless explicitly designed and isolated.

## Working Agreement For Contributors

When changing this repository:
- Keep folder boundaries clean.
- Prefer incremental changes over broad speculative abstractions.
- Update `README.md` when the project structure or startup flow changes.
- Document operational assumptions in `docs/`.
- Add tests for backend business logic and critical frontend behavior.
- When a feature is completed, run complete unit tests for both frontend and backend related to the change before considering the work done.
- When a feature is completed, also run relevant code quality checks such as `lint` and other applicable static analysis or validation tools for the affected frontend and backend code.

## Definition Of Done

A change is not complete unless:
- The code fits the repository structure.
- Relevant docs are updated.
- Build and run instructions still make sense.
- Security-sensitive behavior is called out explicitly.
- Go changes follow `Effective Go`.
- Frontend changes follow Vue 3 official recommended practices.
- Feature work includes complete unit test coverage and execution for both frontend and backend parts affected by the change.
- Relevant `lint`, static analysis, and other applicable code validation checks have been run and pass for the affected frontend and backend code.
