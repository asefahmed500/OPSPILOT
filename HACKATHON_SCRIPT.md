# OpsPilot AI Hackathon Script

## One-Line Pitch

OpsPilot is an AI operations copilot that turns messy natural-language business requests into real CRM, task, support, workflow, email, and reporting actions.

## 60-Second Story

Small teams lose hours moving the same customer context between email, CRM, task tools, support inboxes, and reports. OpsPilot compresses that operations loop into one AI-controlled command center.

In this demo, I will show a real authenticated workspace. The AI assistant will understand a natural-language command, generate a customer-facing email, send it through SMTP, create or update internal records, and leave an auditable trail across CRM, Tasks, Support, Workflows, Reports, and Activity.

## Demo Setup Checklist

- Start the app: `npm run dev`
- Open: `http://localhost:3000`
- Create or log into an account.
- Keep [docs/AI_AGENT_SYSTEM.md](docs/AI_AGENT_SYSTEM.md) open if judges ask how the agent, tools, database, and audit trail work.
- Confirm database is connected with `DATABASE_URL`.
- Confirm AI provider is configured:
  - `AI_API_BASE_URL=https://api.hcnsec.cn/v1`
  - `AI_API_KEY=...`
  - `AI_MODEL=DeepSeek-V4-Flash`
- Confirm SMTP is configured and Settings can send a test email.
- Use a real email address you control for live email demos.

## Primary Demo Flow

### 1. Landing Page

Show the public landing page first.

Say:

> OpsPilot is built as a full product, not just a chatbot. The landing page explains the operations problem, the AI automation architecture, and the workflow from lead capture to support to reporting.

### 2. Authenticated Dashboard

Log in and open `/app`.

Say:

> This dashboard is database-backed. The metrics come from the workspace records, not hardcoded demo numbers.

### 3. Natural-Language AI Command

Open `/app/assistant`.

Use this prompt, replacing the email with an address you control:

```text
Write a professional marketing email about OpsPilot automating CRM, support, tasks, and reports. Send it to customer@example.com, create the customer as a CRM lead, add a follow-up task, create a support ticket for replies, and generate a weekly report.
```

Expected result:

- Email is sent through SMTP.
- CRM lead is created.
- Follow-up task is created.
- Support ticket is created.
- Weekly report is generated.
- Assistant response lists each executed step and the app page where it can be verified.

Say:

> The important part is that the AI does not just write text. It plans safe internal actions, validates the request, executes real tools, and returns an audit-friendly summary.

### 4. Verify Real System Changes

Open these pages:

- `/app/crm`
- `/app/tasks`
- `/app/support`
- `/app/reports`

Say:

> Each page reflects the same command from the assistant. The customer record, task, support ticket, and report all share the same operation context.

### 5. Workflow Automation

Open `/app/workflows`.

Create a workflow with:

```text
When a customer replies about OpsPilot, create a support ticket, update CRM, create a follow-up task, and prepare a weekly report.
```

Add the customer email field before running if the workflow includes email.

Say:

> Workflows let the same natural-language automation be saved and rerun. This is the bridge between a one-time AI command and repeatable business operations.

### 6. Support Reply Handling

Open `/app/support`.

Create or open a ticket, add a customer reply, then generate an AI draft.

Say:

> OpsPilot keeps a human in control for customer replies. The AI drafts the response and updates the operational trail, but the owner can review before sending.

## Backup Demo If Email Fails

If live SMTP or Gmail blocks the send, say:

> Email providers often block local development sends or IMAP access without production DNS and OAuth. OpsPilot still completed the validated internal automation path, and the SMTP test proves the adapter is configurable. In production, I would connect a provider webhook such as Resend, Postmark, SendGrid, or Mailgun for reliable inbound and outbound email events.

Then show:

- The failed workflow run step.
- The activity log.
- The created CRM/task/support/report records.

## Judge Questions And Answers

### What makes this more than a chatbot?

OpsPilot uses the model as a planner, then routes validated actions through typed internal functions. The AI cannot directly mutate arbitrary data. It can only call safe tools such as create lead, create task, create ticket, send email, create workflow, and generate report.

### Why is this useful for small teams?

Small teams already live in email, spreadsheets, CRM tools, and support inboxes. OpsPilot gives them a single automation layer that captures the customer context once and updates every operational surface.

### How is it safe?

Requests are authenticated, same-origin protected, rate-limited, validated with Zod, scoped by workspace, and persisted with audit logs. The assistant also refuses to invent customer emails and skips dangerous or incomplete actions.

### What would be next after the hackathon?

- Provider webhooks for production inbound email.
- OAuth integrations for Gmail, Slack, HubSpot, and Salesforce.
- Approval queues for high-risk actions.
- Workflow scheduling and retries.
- Richer analytics from automation run steps.
- Organization roles and team invitations.

## Two-Minute Closing

OpsPilot shows how AI can become an operations layer, not just a writing assistant. A founder or operations lead can type one natural command, and OpsPilot turns it into customer communication, CRM context, support follow-up, task ownership, and reporting.

The product is already built around production-friendly ideas: authentication, workspace scoping, typed validation, database persistence, audit logs, adapter-based integrations, and human review for support replies. That makes the demo feel real today and gives it a clear path to become a real product after the hackathon.
