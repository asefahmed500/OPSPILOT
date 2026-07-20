# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OpsPilot AI is a hackathon-ready AI operations MVP. It is a multi-tenant Next.js app where a signed-in user's **workspace** owns every CRM lead, task, support ticket, workflow, report, and audit record. The AI assistant is a **planner + safe-tool-executor**, not a chatbot that runs arbitrary code.

Stack: Next.js 16 (App Router), React 19, TypeScript, Tailwind 4 + shadcn-style UI, Auth.js (next-auth v4) credentials auth, Prisma 7 + PostgreSQL (driver adapter), Vercel AI SDK against an OpenAI-compatible relay, nodemailer SMTP.

## Commands

```bash
npm run dev          # next dev (http://localhost:3000 → landing; /app → dashboard, requires login)
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run lint         # eslint
npm run build        # next build
npx prisma generate  # regenerate client into generated/prisma (run after editing schema.prisma)
npx prisma db push   # apply schema to dev DB
npx prisma validate
npm run ai:check     # scripts/check-ai-provider.ts — verifies HCNSEC_API_KEY + model reachability
```

Run a single test file or pattern: `npx vitest run lib/ops/rules.test.ts` or `npx vitest run -t "scores high-intent"`.

First-time local setup: `npm install && npx prisma generate && npx prisma db push`, populate `.env.local` (see `.env.example`), then `npm run dev`. `AUTH_JWT_SECRET` / `NEXTAUTH_SECRET` must be ≥24 chars (enforced by `lib/env.ts`).

## Critical: This is Next.js 16, not the Next.js you know

Per `AGENTS.md` — Next.js 16 has breaking changes vs. training data. **The request middleware is `proxy.ts` (exporting `proxy`, not `middleware`)**, not `middleware.ts`. When touching routing/auth-guard/middleware behavior, read the relevant guide in `node_modules/next/dist/docs/` before writing code, and confirm file/convention names against the installed version rather than assuming.

## Architecture

### Request lifecycle & safety (every `/app/*` and `/api/*` request)

1. **`proxy.ts`** guards `/app/:path*` — unauthenticated requests redirect to `/login`. It decodes the session JWT via the custom decoder.
2. **`lib/auth.ts`** — Auth.js credentials provider. `requireUser()` throws `AppError(401)` if no session.
3. **`lib/workspace.ts`** — `requireWorkspace(userId)` resolves the user's primary `Membership` → `Workspace`; throws `AppError(403, WORKSPACE_REQUIRED)` if none.
4. **`lib/api.ts`** — `requireRequestContext()` returns `{ user, workspace }`. `requireSameOrigin(request)` enforces origin/referer on **write** routes. `jsonError(error)` maps `AppError`→status, `ZodError`→422, else 500.
5. **`lib/rate-limit.ts`** — in-memory sliding buckets. `assertRateLimit(key, limit, windowMs)`; `getClientKey()` derives the IP from `x-forwarded-for`/`x-real-ip`.

The canonical API route shape (see `app/api/crm/leads/route.ts`, `app/api/assistant/chat/route.ts`): GET reads via `requireRequestContext()`; POST/DELETE call `requireSameOrigin(request)`, then context, then `schema.parse(await request.json())`, then an `lib/ops/*` function, all inside `try { ... } catch (error) { return jsonError(error) }`.

### Multi-tenancy is enforced by convention, not by the DB

`workspaceId` is the tenant key. **Every** Prisma `findMany`/`findFirst`/`create` must filter or set `workspaceId`. There is no DB-level row-level security — a missing `where: { workspaceId }` is a cross-tenant data leak. Resource lookup helpers (`deleteLead`, `runWorkflow`, etc.) always re-find by `{ id, workspaceId }` before acting.

### The `lib/ops/` business-logic layer

All mutations live in `lib/ops/*` (`lead`, `tasks`, `support`, `reports`, `workflows`, `events`), not in routes. Each mutating function:
- Takes `workspaceId` as its first argument.
- Wraps creates/updates in `db.$transaction(async (tx) => { ... })` and writes an `ActivityLog` row inside the same transaction (the audit trail is part of the unit of work).
- Accepts an optional `suppressEvents` flag and emits an automation event **after** the transaction commits (see below).

`ActivityLog` is the universal audit trail; `/app/reports` and report generation aggregate from it plus `WorkflowRun` + `AutomationRunStep`.

### AI assistant: plan → validate → execute (never arbitrary execution)

The assistant never executes AI-generated code. Flow (`app/api/assistant/chat/route.ts` → `lib/ai.ts` → `lib/ops/assistant-agent.ts`):

1. `generateAssistantPlan(message)` produces an `AssistantPlan` (`lib/ops/assistant-planning.ts`) — an `actions[]` array constrained to six types: `send_email`, `create_lead`, `create_task`, `create_ticket`, `create_report`, `create_workflow`.
2. The plan is validated by `assistantPlanSchema` (Zod). Invalid/missing/timed-out AI falls back to `fallbackAssistantPlan` (deterministic typo-tolerant parser) **only** if `AI_AGENT_FALLBACK_ENABLED=true`; otherwise `aiRequiredPlan` surfaces a "configure key" task.
3. `executeAssistantPlan()` runs each action through the `lib/ops/*` creators. Tools **refuse** email/lead/ticket actions without a real customer email, and the planner can never request deletion.

**AI provider gating** (`lib/agents/opspilot-agents.ts`): `opsPilotAgentsConfigured = Boolean(HCNSEC_API_KEY)`. When unset, AI functions return `null`/fallback rather than throwing. The specialized agents (command-planner, email-context, email-template-writer, workflow-architect, support-reply) all use one HCNSEC key against `AI_API_BASE_URL`/`AI_MODEL` via `@ai-sdk/openai-compatible`. Structured output is produced by `generateStructuredJson`, which extracts the first `{...}` block and re-prompts once on parse failure — it does **not** rely on provider-native JSON mode.

**Customer-facing content is separated from internal records.** Email copy written for customers must never contain task IDs, ticket IDs, audit notes, or DB details — this is encoded in the agent prompts and enforced in `lib/ai.ts` email helpers.

### Event-driven automation layer

`emitAutomationEvent()` (`lib/ops/events.ts`) is called after each committed mutation. It (a) writes an `event.*` `ActivityLog` row, and (b) if the event type maps to a `WorkflowTrigger`, runs up to 5 matching **enabled** workflows:

| Event | Trigger |
| --- | --- |
| `lead.created` | `NEW_LEAD` |
| `ticket.created`, `customer.reply.received` | `NEW_SUPPORT_TICKET` |
| `task.created`, `report.generated`, `customer.email.sent` | audit only (no auto-run) |

To prevent recursive triggers, workflow-created child records pass `suppressEvents: true`. When run from an event, `runWorkflow` reuses the triggering lead/ticket (matched by `event.sourceId`) instead of creating duplicates.

### Workflow execution (`lib/ops/workflows.ts`)

`createWorkflow` merges a deterministic parse (`parseWorkflowPrompt` in `lib/ops/rules.ts`) with AI-suggested actions (`generateWorkflowActions`), storing the merged `WorkflowAction[]` as JSON on `Workflow.actions`. `runWorkflow` re-normalizes those actions, merges the prompt parse again, fills customer fields from the triggering event, executes lead/ticket/task creation, then sends email last. Each step is recorded as an `AutomationRunStep` and mirrored into `WorkflowRun.output.steps`.

**`AutomationRunStep` defensive access:** `createAutomationStep`/`createAutomationSteps` access the delegate via a runtime cast and no-op if it's missing, because a stale dev Prisma client may not expose it. `/app/reports` and `lib/ops/reports.ts` fall back to `WorkflowRun.output.steps` in that case. Preserve this pattern when touching step recording.

### Auth implementation detail

Auth.js uses a **custom JWT encode/decode** (`lib/auth-jwt.ts`) — hand-rolled HMAC-SHA-256 signing with constant-time signature comparison, base64url, and expiry checks — wired via `authOptions.jwt.encode/decode`. The same secret backs `AUTH_JWT_SECRET`/`NEXTAUTH_SECRET`. Password hashing is `bcryptjs` (`lib/security.ts`). Registration (`app/api/register/route.ts`) creates the User + Workspace + OWNER Membership.

## Conventions

- **Path alias:** `@/*` → repo root (e.g. `@/lib/db`, `@/components/ui/button`).
- **`"server-only"` first import** in every server-only `lib/*` file. It's stubbed to an empty module under vitest via `test/server-only.ts` + the `vitest.config.ts` alias.
- **Prisma client location:** generated into `generated/prisma` (see `schema.prisma` `generator` block) and imported as `@/generated/prisma/client`, **not** from `@prisma/client`. `lib/db.ts` instantiates a singleton `PrismaClient` with the `PrismaPg` driver adapter (Prisma 7 driver adapters) and caches it on `globalThis` in dev. After changing `schema.prisma`, run `npx prisma generate` (TS won't see new models until you do).
- **Validation schemas** live in `lib/validation.ts` (Zod). Reuse/extend these in routes rather than inlining.
- **UI:** shadcn-style components in `components/ui` (configured via `components.json`, style `base-nova`, aliases point at `@/components`, `@/lib`, `@/hooks`). App pages live under `app/app/*` and render inside `components/app/app-shell.tsx`.
- **List endpoints** cap results (`take: 100` typical) and order by `createdAt desc`.
- **No destructive actions on the AI path:** the planner cannot delete; bulk/single delete only exists behind authenticated human-facing routes.

## Further reading

- [docs/AI_AGENT_SYSTEM.md](docs/AI_AGENT_SYSTEM.md) — Mermaid diagrams of the agent, event, email, CRM/task/support/report, workflow, and auth flows.
- [HACKATHON_SCRIPT.md](HACKATHON_SCRIPT.md) — demo path and the `/agent as [persona] ...` prompt recipe.
