import { AssistantChat } from "@/components/app/assistant-chat"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"

const demoPrompts = [
  "Write a friendly founder email for SaaS owners about OpsPilot automating CRM, support, tasks, and reports. Send it to customer@example.com, create the customer as a CRM lead, add a follow-up task, create a support ticket for replies, and generate a weekly report.",
  "/workflow when a customer replies about OpsPilot, create a support ticket, update CRM, create a follow-up task, and prepare a weekly report.",
  "As an account manager, write a direct renewal email for Acme about reducing manual operations, send it to buyer@example.com, add CRM, ticket, task, and report.",
]

const automationSurfaces = [
  ["CRM", "Creates qualified leads from customer commands and email recipients."],
  ["Tasks", "Adds follow-up work tied to leads or support tickets."],
  ["Support", "Creates tickets and drafts human-reviewed replies."],
  ["Reports", "Summarizes workspace activity from real database records."],
]

const commandGuide = [
  ["/email", "Write any kind of customer email from topic, persona, tone, CTA, and recipient."],
  ["/workflow", "Turn a trigger like customer reply or new lead into a saved automation."],
  ["/agent", "Run email, CRM, task, support, workflow, and report tools together."],
]

const promptFormula = [
  "1. Command: /email, /workflow, or /agent",
  "2. Voice: as founder, sales rep, support agent",
  "3. Tone: friendly, professional, direct, persuasive",
  "4. Topic: what the email or automation is about",
  "5. Recipient: real customer email only",
  "6. Tools: CRM, task, support ticket, report, workflow",
]

export default async function AssistantPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const conversation = await db.conversation.findFirst({
    where: { userId: user.id, workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 12 } },
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold">AI Assistant</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Ask OpsPilot to plan and execute safe workspace actions across CRM, tasks, support, email, workflows, and reports.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm">
          <p className="font-semibold text-slate-950">Demo mode</p>
          <p className="mt-1 text-slate-500">Use a real email you control before sending.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AssistantChat
          initialConversationId={conversation?.id}
          initialMessages={(conversation?.messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
            action: message.action,
          }))}
        />

        <aside className="space-y-4">
          <section className="op-panel p-5">
            <p className="text-sm font-semibold">Slash command guide</p>
            <div className="mt-4 space-y-2">
              {commandGuide.map(([command, description]) => (
                <div key={command} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="font-semibold text-slate-950">{command}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="op-panel p-5">
            <p className="text-sm font-semibold">Prompt recipe</p>
            <div className="mt-4 space-y-2">
              {promptFormula.map((item) => (
                <p key={item} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">{item}</p>
              ))}
            </div>
          </section>

          <section className="op-panel p-5">
            <p className="text-sm font-semibold">Judge-ready prompts</p>
            <div className="mt-4 space-y-3">
              {demoPrompts.map((prompt, index) => (
                <div key={prompt} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Prompt {index + 1}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{prompt}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="op-panel p-5">
            <p className="text-sm font-semibold">What the agent updates</p>
            <div className="mt-4 space-y-3">
              {automationSurfaces.map(([name, description]) => (
                <div key={name} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-slate-950">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
