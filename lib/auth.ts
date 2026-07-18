import "server-only"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getServerSession } from "next-auth"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { verifyPassword } from "@/lib/security"
import { AppError } from "@/lib/errors"
import { assertRateLimit } from "@/lib/rate-limit"
import { decodeAuthJwt, encodeAuthJwt } from "@/lib/auth-jwt"

process.env.NEXTAUTH_URL ??= env.NEXTAUTH_URL ?? env.NEXT_PUBLIC_APP_URL
process.env.NEXTAUTH_SECRET ??= env.NEXTAUTH_SECRET ?? env.AUTH_JWT_SECRET

const authSecret = env.NEXTAUTH_SECRET ?? env.AUTH_JWT_SECRET

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  jwt: {
    encode: encodeAuthJwt,
    decode: decodeAuthJwt,
  },
  secret: authSecret,
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toLowerCase().trim()
        const password = credentials?.password

        if (!email || !password) {
          return null
        }

        assertRateLimit(`credentials:${email}`, 8, 60_000)

        const user = await db.user.findUnique({ where: { email } })

        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
      }

      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }

      return session
    },
  },
}

export async function getSession() {
  return getServerSession(authOptions)
}

export async function requireUser() {
  const session = await getSession()

  if (!session?.user?.id) {
    throw new AppError("Unauthorized", 401, "UNAUTHORIZED")
  }

  return session.user
}
