"use client"

import { useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { zodResolver } from "@hookform/resolvers/zod"
import { type Resolver, useForm } from "react-hook-form"
import { Bot, KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { forgotPasswordSchema, resetPasswordSchema } from "@/lib/validation"

type ForgotValues = {
  email: string
}

type ResetValues = {
  token: string
  password: string
}

function AuthFrame({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh bg-[var(--op-surface)] px-4 py-8 sm:px-6">
      <Link href="/" className="mx-auto flex max-w-md items-center gap-3 text-sm font-semibold tracking-tight">
        <span className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        OpsPilot AI
      </Link>
      <div className="op-panel mx-auto mt-10 max-w-md p-6 sm:p-7">
        <div className="inline-flex size-10 items-center justify-center rounded-lg bg-slate-950 text-white">
          <KeyRound className="size-4" aria-hidden="true" />
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        {children}
      </div>
    </div>
  )
}

export function ForgotPasswordForm() {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({
    resolver: zodResolver(forgotPasswordSchema) as Resolver<ForgotValues>,
  })

  async function onSubmit(values: ForgotValues) {
    setError("")
    setMessage("")
    const parsed = forgotPasswordSchema.parse(values)
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? "Could not request a reset link")
      return
    }

    setMessage("If an OpsPilot account exists for that email, a reset link has been sent.")
  }

  return (
    <AuthFrame title="Reset your password" description="Enter your account email and we will send a secure reset link.">
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <label className="block text-sm font-medium" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          {...register("email")}
          className="op-field mt-2"
        />
        {errors.email?.message ? <p className="mt-1 text-xs text-red-600" role="alert">{errors.email.message}</p> : null}

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p> : null}

        <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Sending..." : "Send reset link"}
        </Button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Remembered it?{" "}
          <Link className="font-medium text-slate-950 underline" href="/login">
            Log in
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(resetPasswordSchema) as Resolver<ResetValues>,
    defaultValues: { token },
  })

  async function onSubmit(values: ResetValues) {
    setError("")
    setMessage("")
    const parsed = resetPasswordSchema.parse(values)
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed),
    })

    if (!response.ok) {
      const body = await response.json().catch(() => null)
      setError(body?.error ?? "Could not reset password")
      return
    }

    setMessage("Your password has been updated. You can log in with the new password.")
  }

  return (
    <AuthFrame title="Choose a new password" description="Use the reset link from your email to secure your account.">
      <form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        <input type="hidden" {...register("token")} />
        <label className="block text-sm font-medium" htmlFor="password">
          New password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password")}
          className="op-field mt-2"
        />
        {errors.password?.message ? <p className="mt-1 text-xs text-red-600" role="alert">{errors.password.message}</p> : null}
        {errors.token?.message ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{errors.token.message}</p> : null}

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
        {message ? <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" role="status">{message}</p> : null}

        <Button type="submit" className="mt-6 w-full" disabled={isSubmitting || !token}>
          {isSubmitting ? "Updating..." : "Update password"}
        </Button>
        <p className="mt-4 text-center text-sm text-slate-600">
          Back to{" "}
          <Link className="font-medium text-slate-950 underline" href="/login">
            login
          </Link>
        </p>
      </form>
    </AuthFrame>
  )
}
