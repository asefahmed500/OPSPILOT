# OpsPilot AI

Hackathon-ready AI operations MVP for CRM automation, support triage, task generation, workflow building, reports, and configurable integrations.

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4 and shadcn-style UI
- Auth.js credentials auth
- React Hook Form + Zod validation
- Prisma 7 + PostgreSQL
- OpenAI-compatible AI relay optional through env
- SMTP email test adapter

## Environment

Create `.env.local` with:

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/opspilotdb?schema=public"
AUTH_JWT_SECRET="replace-with-a-long-random-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER="your-smtp-user"
SMTP_PASS="app-password"
SMTP_FROM="opspilot <your-sender-address>"
AI_API_BASE_URL="https://api.hcnsec.cn/v1"
AI_API_KEY=""
HCNSEC_API_KEY=""
AI_MODEL="DeepSeek-V4-Flash"
```

Rotate any credentials that were pasted into chat before deploying or sharing the repo.

## Local Development

```bash
npm install
npx prisma generate
npx prisma db push
npm run dev
```

Open `http://localhost:3000`, create an account, then use `/app`.

## Verification

```bash
npm run typecheck
npm run test
npm run lint
npm run build
npx prisma validate
npm run ai:check
```

## MVP Coverage

- Public landing page
- Login and registration
- Proxy-level `/app/*` auth guard
- Database-backed dashboard
- CRM leads and contacts API
- Task API and UI
- Support ticket API and AI draft logic
- Assistant chat with internal tool execution
- Natural-language workflow parser and runner
- Report generation
- SMTP test endpoint
- Mock CRM and Slack adapter structure
