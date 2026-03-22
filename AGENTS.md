# AGENTS.md

## Project Overview

This repository is for a web application that manages containers on Linux servers through a browser.

Core goals:
- Use a modern frontend stack based on React.
- Use Go as the primary backend runtime.
- Manage Linux container workloads from the web UI.
- Keep the repository structure close to the Go community `project-layout` conventions where that helps clarity.
- Use a single standalone frontend application instead of a `pnpm` workspace.
- Keep the architecture pragmatic, deployable, and maintainable.

Primary technical direction:
- Frontend: React, Vite, TypeScript, TanStack Router, TanStack Query, Tailwind CSS, shadcn/ui, `pnpm`.
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

- Use React with modern function components and hooks.
- Use TanStack Router for routing and route-level data loading.
- Use TanStack Query for server-state fetching, caching, invalidation, and mutations.
- Use Tailwind CSS for styling primitives and design tokens.
- Use shadcn/ui as the base component system and customize it for the product domain.
- Use `pnpm` only inside `web/`.
- Prefer strict TypeScript settings.
- Keep rendering components focused on presentation and move API, query, and state orchestration into clear modules.
- Keep client state management minimal. Prefer TanStack Query for server state and add other state libraries only when shared client state clearly justifies it.
- Frontend code style must align with current React and TanStack recommended practices.

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
- When library or API documentation, code generation, project scaffolding, or configuration steps are needed, always use Context7 MCP by default without waiting for an explicit user instruction.
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
- Frontend changes follow current React and TanStack recommended practices.
- Feature work includes complete unit test coverage and execution for both frontend and backend parts affected by the change.
- Relevant `lint`, static analysis, and other applicable code validation checks have been run and pass for the affected frontend and backend code.
