import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { AppError } from "@/lib/errors"
import { hashPassword } from "@/lib/security"

const TOKEN_TTL_MS = 30 * 60 * 1000

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex")
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await db.$transaction([
    db.passwordResetToken.deleteMany({
      where: {
        userId,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    }),
    db.passwordResetToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    }),
  ])

  return token
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashResetToken(token)
  const resetToken = await db.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= new Date()) {
    throw new AppError("Reset link is invalid or expired", 400, "INVALID_RESET_TOKEN")
  }

  const passwordHash = await hashPassword(password)

  await db.$transaction([
    db.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    }),
    db.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    }),
  ])

  return resetToken.user.email
}
