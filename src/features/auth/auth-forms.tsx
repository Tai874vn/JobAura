'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { env } from '@/shared/config/env'
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
  const { hasHydrated, setUser, clearSession } = useAuthStore()

  const meQuery = useQuery({
    queryKey: queryKeys.me,
    queryFn: authApi.me,
    enabled: hasHydrated,
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

  if (!hasHydrated || meQuery.isPending || Boolean(meQuery.data?.content)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-7 w-7" />
      </div>
    )
  }

  return <>{children}</>
}

function getSignedInRedirect(user?: { role?: string } | null, nextPath?: string | null) {
  if (nextPath?.startsWith('/') && !nextPath.startsWith('//')) return nextPath
  return user?.role === 'admin' ? '/admin' : '/'
}

function AuthCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
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
    </div>
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

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z"
      />
    </svg>
  )
}
