'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { env } from '@/shared/config/env'
import { GoogleIcon } from '@/shared/icons'
import { getSignedInRedirect, signupRoleOptions } from '@/shared/lib/roles'
import { getErrorMessage } from '@/shared/lib/utils'
import { signInSchema, signUpSchema, type SignIn, type SignUp } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button, Card, CardContent, Input, Spinner } from '@/shared/ui'

export function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')

  return (
    <AuthPageGate nextPath={nextPath}>
      <LoginFormFields nextPath={nextPath} />
    </AuthPageGate>
  )
}

function LoginFormFields({ nextPath }: { nextPath: string | null }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const form = useForm<SignIn>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })

  const mutation = useMutation({
    mutationFn: authApi.signIn,
    onSuccess: (res) => {
      const user = res.content?.user
      if (user) setUser(user)
      queryClient.invalidateQueries({ queryKey: queryKeys.me })
      router.push(getSignedInRedirect(user, nextPath))
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to sign in')),
  })

  function continueWithGoogle() {
    window.location.assign(`${env.apiBaseUrl}/api/auth/google`)
  }

  return (
    <AuthCard title="Welcome back" subtitle="Sign in to hire, post, and manage JobAura services.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FieldError message={form.formState.errors.email?.message}>
          <Input placeholder="Email" type="email" {...form.register('email')} />
        </FieldError>
        <FieldError message={form.formState.errors.password?.message}>
          <Input placeholder="Password" type="password" {...form.register('password')} />
        </FieldError>
        <Button className="w-full" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button className="w-full bg-white" type="button" variant="secondary" onClick={continueWithGoogle}>
        <GoogleIcon />
        Continue with Google
      </Button>
      <p className="mt-5 text-center text-sm text-muted">
        New here?{' '}
        <Link className="font-semibold text-primary" href="/auth/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}

export function RegisterForm() {
  return (
    <AuthPageGate>
      <RegisterFormFields />
    </AuthPageGate>
  )
}

function RegisterFormFields() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const form = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '', role: 'user' },
  })
  const selectedRole = useWatch({ control: form.control, name: 'role' }) ?? 'user'

  const mutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: (res) => {
      const user = res.content?.user
      if (user) setUser(user)
      queryClient.invalidateQueries({ queryKey: queryKeys.me })
      router.push(getSignedInRedirect(user))
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to create account')),
  })

  return (
    <AuthCard title="Create your JobAura account" subtitle="Start buying or selling trusted freelance services.">
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values))}>
        <FieldError message={form.formState.errors.name?.message}>
          <Input placeholder="Full name" {...form.register('name')} />
        </FieldError>
        <FieldError message={form.formState.errors.email?.message}>
          <Input placeholder="Email" type="email" {...form.register('email')} />
        </FieldError>
        <FieldError message={form.formState.errors.password?.message}>
          <Input placeholder="Password" type="password" {...form.register('password')} />
        </FieldError>
        <div className="grid gap-2">
          <p className="text-xs font-semibold uppercase text-muted">Account type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {signupRoleOptions.map((option) => (
              <label
                key={option.value}
                className={`cursor-pointer rounded-lg border p-3 transition ${
                  selectedRole === option.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border bg-white text-muted hover:border-primary hover:text-foreground'
                }`}
              >
                <input className="sr-only" type="radio" value={option.value} {...form.register('role')} />
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5">{option.description}</span>
              </label>
            ))}
          </div>
        </div>
        <Button className="w-full" type="submit" disabled={mutation.isPending}>
          {mutation.isPending ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link className="font-semibold text-primary" href="/auth/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  )
}

function AuthPageGate({ children, nextPath }: { children: React.ReactNode; nextPath?: string | null }) {
  const router = useRouter()
  const { user, hasHydrated, setUser, clearSession } = useAuthStore()

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: hasHydrated && Boolean(user),
    retry: false,
  })

  useEffect(() => {
    if (!hasHydrated) return
    if (meQuery.isSuccess) {
      const verifiedUser = meQuery.data.content ?? null
      if (verifiedUser) {
        setUser(verifiedUser)
        router.replace(getSignedInRedirect(verifiedUser, nextPath))
      } else {
        clearSession()
      }
    }
    if (meQuery.isError) clearSession()
  }, [clearSession, hasHydrated, meQuery.data, meQuery.isError, meQuery.isSuccess, nextPath, router, setUser])

  if (!hasHydrated || (Boolean(user) && (meQuery.isPending || Boolean(meQuery.data?.content)))) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background" aria-labelledby="auth-status-title">
        <h1 id="auth-status-title" className="sr-only">Checking authentication</h1>
        <Spinner className="h-7 w-7" />
        <span className="sr-only" role="status">Checking authentication</span>
      </main>
    )
  }

  return <>{children}</>
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-md shadow-[0_12px_40px_rgba(0,0,0,0.05)]">
        <CardContent className="p-6">
          <Link href="/" className="mb-8 inline-block font-display text-2xl font-bold text-primary">
            JobAura
          </Link>
          <h1 className="font-display text-3xl font-bold">{title}</h1>
          <p className="mb-6 mt-2 text-sm text-muted">{subtitle}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  )
}

function FieldError({ children, message }: { children: React.ReactNode; message?: string }) {
  return (
    <label className="block">
      {children}
      {message ? <span className="mt-1 block text-xs font-medium text-danger">{message}</span> : null}
    </label>
  )
}
