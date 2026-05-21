# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Development commands
- Install dependencies: `pnpm install`
- Start dev server (default Next port 3000): `pnpm dev`
- Start dev server on port 3001 (project helper): `./start-dev.sh`
- Build for production: `pnpm build`
- Run production server: `pnpm start`
- Lint codebase: `pnpm lint`
- Type-check (no script in `package.json`): `pnpm exec tsc --noEmit`

## Tests
- There is currently no test framework or `test` script configured in `package.json`.
- There are no `*.test.*` / `*.spec.*` files in the repository at this time.
- Because of that, single-test commands are not available yet.

## Core architecture (big picture)
This is a Next.js App Router back-office app (React 19 + TypeScript) focused on operations for tasks, affiliates, CRM clients, invoices, timeline/activity, and Shopify analytics.

### App routing and shell
- `app/layout.tsx` defines global shell concerns (theme provider, toast notifications, production analytics).
- `app/page.tsx` immediately routes users to `/dashboard` or `/auth/login` based on Supabase auth state.
- Protected area lives under `app/(dashboard)/dashboard/*` with shared chrome from `app/(dashboard)/layout.tsx` (sidebar + header + role/permission-aware navigation).

### Authentication and session flow
- Auth uses Supabase magic links (`app/auth/login/page.tsx` + `app/auth/callback/route.ts`).
- Session refresh and route protection are handled through Next proxy middleware (`proxy.ts` delegating to `lib/supabase/proxy.ts`).
- `lib/supabase/server.ts`, `lib/supabase/client.ts`, and `lib/supabase/admin.ts` are distinct clients for server components, browser components, and privileged service-role operations.

### Data-access pattern
- Most dashboard pages are server components that query Supabase directly in-page (for example tasks, clients, invoices, timeline).
- UI-heavy interaction is pushed into client components under `components/dashboard/*`.
- A recurring pattern across routes is **graceful fallback to demo data** when Supabase/env configuration is missing or fails (`lib/demo-data.ts`).

### Authorization model
- Role and section-level permission logic is centralized in `lib/access/types.ts` and `lib/access/helpers.ts`.
- Sidebar visibility and write capabilities are driven by these helpers, not hard-coded per component.
- Superadmin behavior is expected by both UI and SQL RLS policies (see migration scripts below).

### Domain modules
- `lib/shopify/index.ts` encapsulates Shopify Admin GraphQL calls and derived metrics.
- `lib/activity-log.ts` and `lib/activity-log-client.ts` provide non-blocking activity logging from server/client contexts.
- `components/ui/*` contains reusable primitive components; `components/dashboard/*` composes business features from those primitives.

### Database and migrations
- SQL migrations are stored in `scripts/`:
  - `001_create_schema.sql`: core tables (profiles, tasks, affiliates, affiliate sales/payouts, clients, products, invoices, invoice items, client activities) + RLS policies.
  - `002_user_access.sql`: expanded roles, profile status/sign-in metadata, user-permissions table, superadmin helpers/policies.
  - `003_activity_log.sql`: platform activity timeline table + indexes + RLS.
- These migrations are plain SQL files (no migration runner is configured in this repo).

## Important implementation notes
- `next.config.mjs` sets `typescript.ignoreBuildErrors = true`; `pnpm build` can succeed even when TypeScript errors exist. Run `pnpm exec tsc --noEmit` explicitly when type safety matters.
- The app is intentionally resilient to partial setup (Supabase/Shopify missing) by entering demo-mode behavior across multiple dashboard routes.
