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
  })
  const synced: SyncedEmail[] = []
  const skipped: { uid: number; reason: string }[] = []

  await client.connect()

  try {
    const lock = await client.getMailboxLock("INBOX")

    try {
      const unseen = await client.search({ seen: false })
      const unseenUids = unseen || []
      const limited = unseenUids.slice(-25)

      if (!limited.length) {
        return { synced, skipped }
      }

      for await (const message of client.fetch(limited, {
        uid: true,
      })) {
        const parsed = await client.download(message.uid, undefined, { uid: true })
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

        await ingestInboundEmail(workspaceId, { from, subject, body })
        await client.messageFlagsAdd(message.uid, ["\\Seen"], { uid: true })
        synced.push({ uid: message.uid, from, subject })
      }
    } finally {
      lock.release()
    }
  } finally {
    await client.logout().catch(() => undefined)
  }

  return { synced, skipped }
}
