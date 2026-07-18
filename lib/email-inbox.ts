import "server-only"
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import { env } from "@/lib/env"
import { AppError } from "@/lib/errors"
import { ingestInboundEmail } from "@/lib/ops/support"

type SyncedEmail = {
  uid: number
  from: string
  subject: string
  duplicate?: boolean
}

const SYNC_TIMEOUT_MS = 25_000
const RECENT_INBOX_WINDOW = 5
const blockedSenders = [
  "mailer-daemon@",
  "postmaster@",
  "no-reply@",
  "noreply@",
  "do-not-reply@",
  "donotreply@",
  "notifications@",
  "notification@",
  "bounce@",
]
const blockedSubjectTerms = [
  "delivery status notification",
  "delivery incomplete",
  "mail delivery",
  "undeliverable",
  "failure notice",
  "returned mail",
  "password reset",
  "reset your password",
  "verification code",
  "security alert",
]
const blockedBodyTerms = [
  "reporting-mta:",
  "final-recipient:",
  "diagnostic-code:",
  "this is a system-generated email",
  "replies to this email address are not monitored",
  "delivery incomplete",
  "there was a temporary problem delivering your message",
]

function timeoutError(message: string) {
  return new AppError(message, 504, "IMAP_SYNC_TIMEOUT")
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : null
}

async function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = SYNC_TIMEOUT_MS, onTimeout?: () => void) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      onTimeout?.()
      reject(timeoutError(message))
    }, timeoutMs)
  })

  try {
    return await Promise.race([promise, timer])
  } finally {
    if (timeout) {
      clearTimeout(timeout)
    }
  }
}

function plainTextFromMessage(message: { text?: string; html?: string | false }) {
  if (message.text?.trim()) {
    return message.text.trim()
  }

  if (!message.html) {
    return ""
  }

  return message.html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
}

function mailboxCredentials() {
  const user = env.IMAP_USER ?? env.SMTP_USER
  const pass = env.IMAP_PASS ?? env.SMTP_PASS

  if (!user || !pass) {
    throw new AppError("IMAP inbox sync needs IMAP_USER/IMAP_PASS or SMTP_USER/SMTP_PASS", 400, "IMAP_NOT_CONFIGURED")
  }

  return { user, pass }
}

function isRelevantCustomerEmail({
  from,
  subject,
  body,
  mailboxUser,
}: {
  from: string
  subject: string
  body: string
  mailboxUser: string
}) {
  const normalizedFrom = from.toLowerCase()
  const normalizedSubject = subject.toLowerCase()
  const normalizedBody = body.toLowerCase()
  const mailboxDomain = mailboxUser.split("@")[1]?.toLowerCase()
  const senderDomain = normalizedFrom.split("@")[1]?.toLowerCase()

  if (normalizedFrom === mailboxUser.toLowerCase()) {
    return { relevant: false, reason: "Skipped own mailbox sender" }
  }

  if (blockedSenders.some((sender) => normalizedFrom.includes(sender))) {
    return { relevant: false, reason: "Skipped automated sender" }
  }

  if (blockedSubjectTerms.some((term) => normalizedSubject.includes(term))) {
    return { relevant: false, reason: "Skipped system subject" }
  }

  if (blockedBodyTerms.some((term) => normalizedBody.includes(term))) {
    return { relevant: false, reason: "Skipped system email body" }
  }

  if (mailboxDomain && senderDomain === mailboxDomain && /notification|bounce|daemon|reply/i.test(normalizedFrom)) {
    return { relevant: false, reason: "Skipped internal automated sender" }
  }

  return { relevant: true, reason: null }
}

export async function syncSupportInbox(workspaceId: string) {
  const auth = mailboxCredentials()
  const client = new ImapFlow({
    host: env.IMAP_HOST,
    port: env.IMAP_PORT,
    secure: env.IMAP_SECURE,
    auth,
    logger: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 12_000,
    disableAutoIdle: true,
    maxIdleTime: 0,
  })
  const synced: SyncedEmail[] = []
  const skipped: { uid: number; reason: string }[] = []
  let lastClientError: Error | null = null

  client.on("error", (error) => {
    lastClientError = error
  })

  const closeClient = () => {
    client.close()
  }

  try {
    await withTimeout(client.connect(), "Gmail IMAP connection timed out. Check IMAP is enabled and the app password is valid.", 15_000, closeClient)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      `Gmail IMAP connection failed: ${errorMessage(lastClientError) ?? errorMessage(error) ?? "Unknown IMAP error"}`,
      502,
      "IMAP_CONNECTION_FAILED"
    )
  }

  try {
    const lock = await withTimeout(client.getMailboxLock("INBOX", { acquireTimeout: 8_000 }), "Timed out opening the Gmail inbox.", 10_000, closeClient)

    try {
      const messageCount = client.mailbox && typeof client.mailbox === "object" ? client.mailbox.exists : 0

      if (!messageCount) {
        return { synced, skipped }
      }

      const firstSequence = Math.max(1, messageCount - RECENT_INBOX_WINDOW + 1)
      const recentRange = `${firstSequence}:*`

      for await (const message of client.fetch(recentRange, {
        uid: true,
        flags: true,
        envelope: true,
        source: { maxLength: 120_000 },
      })) {
        if (!message.source?.length) {
          skipped.push({ uid: message.uid, reason: "Missing message source" })
          continue
        }

        const raw = message.source.toString("utf8")
        const email = await simpleParser(raw)
        const from = email.from?.value[0]?.address?.toLowerCase().trim() ?? null
        const subject = email.subject?.trim() || "Customer email reply"
        const body = plainTextFromMessage({ text: email.text, html: email.html })

        if (from === auth.user.toLowerCase().trim()) {
          await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true })
          skipped.push({ uid: message.uid, reason: "Skipped own mailbox sender" })
          continue
        }

        if (!from || !body) {
          skipped.push({ uid: message.uid, reason: "Missing sender or body" })
          continue
        }

        const relevance = isRelevantCustomerEmail({ from, subject, body, mailboxUser: auth.user })

        if (!relevance.relevant) {
          skipped.push({ uid: message.uid, reason: relevance.reason ?? "Skipped irrelevant email" })
          continue
        }

        const result = await ingestInboundEmail(workspaceId, { from, subject, body })

        if (!message.flags?.has("\\Seen")) {
          await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true })
        }

        synced.push({ uid: message.uid, from, subject, duplicate: "duplicate" in result && Boolean(result.duplicate) })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
  }

  return { synced, skipped }
}
