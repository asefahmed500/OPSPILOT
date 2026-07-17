"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import { zodResolver } from "@hookform/resolvers/zod"
import { type Resolver, useForm } from "react-hook-form"
import { Bot, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { loginSchema, registerSchema } from "@/lib/validation"

type AuthValues = {
  email: string
  password: string
  name?: string
  workspaceName?: string
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const schema = mode === "login" ? loginSchema : registerSchema
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthValues>({
    resolver: zodResolver(schema) as Resolver<AuthValues>,
    defaultValues: mode === "register" ? { workspaceName: "OpsPilot Workspace" } : undefined,
  })

  async function onSubmit(values: AuthValues) {
    setError("")
    const parsed = schema.parse(values)
    const email = parsed.email
    const password = parsed.password

    if (mode === "register") {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "name" in parsed ? parsed.name : "",
          email,
          password,
          workspaceName: "workspaceName" in parsed ? parsed.workspaceName : "OpsPilot Workspace",
        }),
      })

      if (!response.ok) {
        const body = await response.json().catch(() => null)
        setError(body?.error ?? "Registration failed")
        return
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError("Invalid email or password")
      return
    }

    router.push("/app")
    router.refresh()
  }

  return (
    <div className="min-h-dvh bg-[var(--op-surface)] px-4 py-8 sm:px-6">
      <Link href="/" className="mx-auto flex max-w-md items-center gap-3 text-sm font-semibold tracking-tight">
        <span className="flex size-9 items-center justify-center rounded-lg bg-slate-950 text-white shadow-sm">
          <Bot className="size-4" aria-hidden="true" />
        </span>
        OpsPilot AI
      </Link>
      <form onSubmit={handleSubmit(onSubmit)} className="op-panel mx-auto mt-10 max-w-md p-6 sm:p-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          Internal ops workspace
        </div>
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">{mode === "login" ? "Log in" : "Create your workspace"}</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">Use OpsPilot to automate CRM, tasks, support, and reports from one focused command center.</p>

        {mode === "register" ? (
          <>
            <label className="mt-6 block text-sm font-medium" htmlFor="name">Name</label>
            <input id="name" autoComplete="name" {...register("name")} className="op-field mt-2" />
            {"name" in errors && errors.name?.message ? <p className="mt-1 text-xs text-red-600" role="alert">{errors.name.message}</p> : null}
            <label className="mt-4 block text-sm font-medium" htmlFor="workspaceName">Workspace</label>
            <input id="workspaceName" autoComplete="organization" {...register("workspaceName")} className="op-field mt-2" />
            {"workspaceName" in errors && errors.workspaceName?.message ? <p className="mt-1 text-xs text-red-600" role="alert">{errors.workspaceName.message}</p> : null}
          </>
        ) : null}

        <label className="mt-4 block text-sm font-medium" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" {...register("email")} className="op-field mt-2" />
        {errors.email?.message ? <p className="mt-1 text-xs text-red-600" role="alert">{errors.email.message}</p> : null}
        <label className="mt-4 block text-sm font-medium" htmlFor="password">Password</label>
        <input id="password" type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} {...register("password")} className="op-field mt-2" />
        {errors.password?.message ? <p className="mt-1 text-xs text-red-600" role="alert">{errors.password.message}</p> : null}

        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p> : null}
        <Button type="submit" className="mt-6 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Working..." : mode === "login" ? "Log in" : "Create account"}
        </Button>
        <p className="mt-4 text-center text-sm text-slate-600">
          {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
          <Link className="font-medium text-slate-950 underline" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Register" : "Log in"}
          </Link>
        </p>
        {mode === "login" ? (
          <p className="mt-3 text-center text-sm">
            <Link className="font-medium text-slate-950 underline" href="/forgot-password">
              Forgot password?
            </Link>
          </p>
        ) : null}
      </form>
    </div>
  )
}
