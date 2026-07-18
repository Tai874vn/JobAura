'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { authApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { env } from '@/shared/config/env'
import { GoogleIcon } from '@/shared/icons'
import { getSignedInRedirect, signupRoleOptions, type SignupRole } from '@/shared/lib/roles'
import { getErrorMessage } from '@/shared/lib/utils'
import { signInSchema, signUpSchema, type SignIn, type SignUp } from '@/shared/schemas'
import { useAuthStore } from '@/shared/stores/auth-store'
import { Button, Card, CardContent, Input, Spinner } from '@/shared/ui'

export function LoginForm() {
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next')
  const notice = searchParams.get('notice')

  return (
    <AuthPageGate nextPath={nextPath}>
      <LoginFormFields nextPath={nextPath} notice={notice} />
    </AuthPageGate>
  )
}

function LoginFormFields({ nextPath, notice }: { nextPath: string | null; notice?: string | null }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const [roleModalOpen, setRoleModalOpen] = useState(notice === 'google-role-required')
  const [googleSignupRole, setGoogleSignupRole] = useState<SignupRole | null>(null)
  const form = useForm<SignIn>({ resolver: zodResolver(signInSchema), defaultValues: { email: '', password: '' } })

  useEffect(() => {
    if (notice === 'google-role-required') setRoleModalOpen(true)
  }, [notice])

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

  function continueGoogleSignupWithRole() {
    if (!googleSignupRole) {
      toast.error('Choose an account type first')
      return
    }

    window.location.assign(`${env.apiBaseUrl}/api/auth/google?role=${encodeURIComponent(googleSignupRole)}`)
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
      <GoogleSignupRoleModal
        open={roleModalOpen}
        selectedRole={googleSignupRole}
        onSelect={setGoogleSignupRole}
        onClose={() => setRoleModalOpen(false)}
        onContinue={continueGoogleSignupWithRole}
      />
      <p className="mt-5 text-center text-sm text-muted">
        New here?{' '}
        <Link className="font-semibold text-primary" href="/auth/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  )
}

function GoogleSignupRoleModal({
  open,
  selectedRole,
  onSelect,
  onClose,
  onContinue,
}: {
  open: boolean
  selectedRole: SignupRole | null
  onSelect: (role: SignupRole) => void
  onClose: () => void
  onContinue: () => void
}) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-black/55 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="google-role-title"
        aria-describedby="google-role-description"
        className="relative w-full max-w-lg rounded-lg bg-white p-5 shadow-2xl"
      >
        <Button
          className="absolute right-2 top-2"
          type="button"
          variant="ghost"
          size="icon"
          onClick={onClose}
          title="Close account type selection"
        >
          <X className="h-5 w-5" />
        </Button>
        <div className="pr-9">
          <h2 id="google-role-title" className="font-display text-xl font-bold">
            Choose your account type
          </h2>
          <p id="google-role-description" className="mt-2 text-sm leading-6 text-muted">
            This Google account is not registered yet. Choose how you want to use JobAura before creating it.
          </p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {signupRoleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-lg border p-3 text-left transition ${
                selectedRole === option.value
                  ? 'border-primary bg-primary/5 text-foreground'
                  : 'border-border bg-white text-muted hover:border-primary hover:text-foreground'
              }`}
              aria-pressed={selectedRole === option.value}
              onClick={() => onSelect(option.value)}
            >
              <span className="block text-sm font-bold">{option.label}</span>
              <span className="mt-1 block text-xs leading-5">{option.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>
            Not now
          </Button>
          <Button type="button" onClick={onContinue} disabled={!selectedRole}>
            Continue with Google
          </Button>
        </div>
      </section>
    </div>
  )
}

export function RegisterForm() {
  const searchParams = useSearchParams()
  const notice = searchParams.get('notice')

  return (
    <AuthPageGate>
      <RegisterFormFields notice={notice} />
    </AuthPageGate>
  )
}

function RegisterFormFields({ notice }: { notice?: string | null }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useAuthStore((state) => state.setUser)
  const form = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: '', email: '', password: '' },
  })
  const selectedRole = useWatch({ control: form.control, name: 'role' })
  const roleRegistration = form.register('role', {
    onChange: () => form.clearErrors('role'),
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

  function requireRole() {
    if (selectedRole === 'user' || selectedRole === 'employer') return selectedRole

    form.setError('role', {
      type: 'manual',
      message: 'Choose Worker or Employer before continuing.',
    })
    toast.error('Choose an account type first')
    return null
  }

  function createAccount(values: SignUp) {
    const role = requireRole()
    if (!role) return
    mutation.mutate({ ...values, role })
  }

  function continueWithGoogle() {
    const role = requireRole()
    if (!role) return
    window.location.assign(`${env.apiBaseUrl}/api/auth/google?role=${encodeURIComponent(role)}`)
  }

  return (
    <AuthCard title="Create your JobAura account" subtitle="Start buying or selling trusted freelance services.">
      {notice === 'google-role-required' ? (
        <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
          Choose an account type, then continue with Google again or complete your account with email and password.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={form.handleSubmit(createAccount)}>
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
                <input className="sr-only" type="radio" value={option.value} {...roleRegistration} />
                <span className="block text-sm font-bold">{option.label}</span>
                <span className="mt-1 block text-xs leading-5">{option.description}</span>
              </label>
            ))}
          </div>
          {form.formState.errors.role?.message ? (
            <span className="text-xs font-medium text-danger">{form.formState.errors.role.message}</span>
          ) : null}
        </div>
        <Button className="w-full bg-white" type="button" variant="secondary" onClick={continueWithGoogle}>
          <GoogleIcon />
          Continue with Google
        </Button>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">or</span>
          <span className="h-px flex-1 bg-border" />
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
