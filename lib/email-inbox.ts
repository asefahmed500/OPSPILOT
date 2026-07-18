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

function timeoutError(message: string) {
  return new AppError(message, 504, "IMAP_SYNC_TIMEOUT")
}

async function withTimeout<T>(promise: Promise<T>, message: string, timeoutMs = SYNC_TIMEOUT_MS) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  const timer = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(timeoutError(message)), timeoutMs)
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
    socketTimeout: 25_000,
  })
  const synced: SyncedEmail[] = []
  const skipped: { uid: number; reason: string }[] = []

  try {
    await withTimeout(client.connect(), "Gmail IMAP connection timed out. Check IMAP is enabled and the app password is valid.", 15_000)
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError(
      error instanceof Error ? `Gmail IMAP connection failed: ${error.message}` : "Gmail IMAP connection failed",
      502,
      "IMAP_CONNECTION_FAILED"
    )
  }

  try {
    const lock = await withTimeout(client.getMailboxLock("INBOX", { acquireTimeout: 10_000 }), "Timed out opening the Gmail inbox.", 12_000)

    try {
      const searchResult = await withTimeout(client.search({ all: true }, { uid: true }), "Timed out searching Gmail inbox.", 12_000)
      const recentUids = searchResult || []
      const limited = recentUids.slice(-35)

      if (!limited.length) {
        return { synced, skipped }
      }

      for await (const message of client.fetch(limited, {
        uid: true,
        flags: true,
      })) {
        const parsed = await withTimeout(client.download(message.uid, undefined, { uid: true }), "Timed out downloading a Gmail message.", 12_000)
        const chunks: Buffer[] = []

        for await (const chunk of parsed.content) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
        }

        const raw = Buffer.concat(chunks).toString("utf8")
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
