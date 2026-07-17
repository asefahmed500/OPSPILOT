import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { sendTestEmail } from "@/lib/email"
import { smtpTestSchema } from "@/lib/validation"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "smtp-test"), 3, 60_000)
    await requireRequestContext()
    const input = smtpTestSchema.parse(await request.json())
    await sendTestEmail(input.to)

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
