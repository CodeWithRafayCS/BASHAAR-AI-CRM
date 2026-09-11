# BASHAAR AI CRM

BASHAAR AI CRM is a premium internal sales operating system for managing leads, follow-ups, pipeline, activities, deals, and revenue.

## Project layout

This is a pnpm workspace monorepo with three deployable apps under `artifacts/` and shared packages under `lib/`:

- `artifacts/bashaar-crm/` — the CRM web app (React + Vite)
- `artifacts/api-server/` — the backend API (Express 5)
- `artifacts/mockup-sandbox/` — an internal UI prototyping sandbox (not part of the deployed product)
- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-client-react/` — generated React Query client (generated from the OpenAPI spec)
- `lib/api-zod/` — generated request/response validation (generated from the OpenAPI spec)
- `lib/db/` — PostgreSQL schema (Drizzle ORM)

## Local development

Requires Node.js 24+ and pnpm.

```bash
pnpm install
```

Each app is run independently:

```bash
# Web app (CRM UI) — http://localhost:5173
PORT=5173 BASE_PATH=/ pnpm --filter @workspace/bashaar-crm run dev

# API server — http://localhost:8080
pnpm --filter @workspace/api-server run dev

# Mockup sandbox (optional, dev tool only)
PORT=8081 BASE_PATH=/__mockup pnpm --filter @workspace/mockup-sandbox run dev
```

Required env var for the API server / DB package:

- `DATABASE_URL` — Postgres connection string

Other useful commands:

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle for the API server), Vite (web app)

## Where things live

- `artifacts/bashaar-crm/src/components/crm-shell.tsx` — shared app shell, primitives, formatting, and responsive navigation
- `artifacts/bashaar-crm/src/pages/` — dashboard, leads, operations, and login surfaces
- `artifacts/api-server/src/routes/crm.ts` — CRM API routes and seeded development data
- `artifacts/bashaar-crm/src/index.css` — BASHAAR visual tokens and typography

## Architecture decisions

- The web app is a separate deployable artifact at `/` and talks to the shared API through generated hooks.
- OpenAPI is the source of truth; frontend hooks and server validation are generated from the same contract.
- The first vertical slice uses realistic seeded API data with mutation flows so every primary interaction works during development.
- The interface is optimized for sales-operator scanability: dense tables and timelines on desktop, stacked cards and compact navigation on mobile.
- AI and third-party integrations are intentionally kept out of the V1 critical path.

## Product

The current product surface includes:

- Dashboard metrics, revenue motion, pipeline by stage, tasks, and activity signal
- Searchable leads with filtering, creation, duplicate email protection, and assignment fields
- Pipeline overview, follow-up task completion, activity logging, companies, deals, reports, team, and settings screens
- Responsive mobile navigation and a premium login/demo entry screen

## Gotchas

- The web and mockup-sandbox Vite apps require `PORT` and `BASE_PATH` env vars to start (see commands above).
- The API contract must be regenerated with `pnpm --filter @workspace/api-spec run codegen` after OpenAPI changes.
