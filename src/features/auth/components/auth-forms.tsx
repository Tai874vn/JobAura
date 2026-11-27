"use client";

import { authConfig } from '@/features/auth/config/auth'
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Eye } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { authApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import {
  broadcastSessionChange,
  resetClientSession,
  setCachedSession,
} from "@/shared/api/session-cache";
import { resolveClientOrigin } from "@/shared/config/client-origin";
import { env } from "@/shared/config/env";
import { GoogleIcon } from "@/shared/icons";
import {
  getSignedInRedirect,
  signupRoleOptions,
  type SignupRole,
} from "@/shared/lib/roles";
import {
  safeInternalPath,
  storeOAuthNextPath,
} from "@/shared/lib/session-routing";
import { getErrorCode, getErrorMessage } from "@/shared/lib/utils";
import {
  signInSchema,
  signUpSchema,
  type SignIn,
  type SignUp,
} from "@/shared/schemas";
import { useChatStore } from "@/shared/stores/chat-store";
import { Button, Input } from "@/shared/ui";
import { AuthCard, AuthPageGate, FieldError } from "./auth-form-layout";
import { GoogleSignupRoleModal } from "./google-signup-role-modal";
import { CheckEmailPanel, ResendVerificationButton } from "./email-flows";

/**
 * /auth/login. AuthPageGate sends an already signed-in user on; ?next= is where to go after signing in.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const notice = searchParams.get("notice");

  return (
    <AuthPageGate nextPath={nextPath}>
      <LoginFormFields nextPath={nextPath} notice={notice} />
    </AuthPageGate>
  );
}

/**
 * Email + password form (rules: signInSchema in config/auth.ts). On success it goes to ?next= or the home page of
 * the role. "EMAIL_NOT_VERIFIED" shows a "send the link again" box instead of an error. Google sign-in leaves the
 * page for the backend; a new Google user first picks an account type.
 */
function LoginFormFields({
  nextPath,
  notice,
}: {
  nextPath: string | null;
  notice?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [roleModalDismissed, setRoleModalDismissed] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [googleSignupRole, setGoogleSignupRole] = useState<SignupRole | null>(
    null,
  );
  const form = useForm<SignIn>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });
  // Set when the password was right but the address is not confirmed yet.
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const roleModalOpen =
    notice === "google-role-required" && !roleModalDismissed;
  const apiBaseUrl = resolveClientOrigin(
    env.apiBaseUrl,
    env.useSameOriginApi,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  const safeNextPath = safeInternalPath(nextPath);
  const registerHref = safeNextPath
    ? `/auth/register?next=${encodeURIComponent(safeNextPath)}`
    : "/auth/register";

  // Data: authApi.signIn → POST /api/auth/signin → NestjsBE/src/modules/auth/services/auth.service.ts signIn()
  const mutation = useMutation({
    mutationFn: authApi.signIn,
    onSuccess: (res) => {
      const user = res.content?.user;
      // Clear any previous visitor or account cache before storing the new user so stale data never leaks across sign-ins.
      useChatStore.getState().reset();
      resetClientSession(queryClient, { broadcast: false });
      if (user) {
        setCachedSession(user, queryClient);
        broadcastSessionChange("signin", user.id);
      } else {
        broadcastSessionChange("signin");
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.push(getSignedInRedirect(user, safeNextPath));
    },
    onError: (error, values) => {
      if (getErrorCode(error) === "EMAIL_NOT_VERIFIED") {
        setUnverifiedEmail(values.email);
        return;
      }
      toast.error(getErrorMessage(error, "Unable to sign in"));
    },
  });

  function continueWithGoogle() {
    storeOAuthNextPath(safeNextPath);
    window.location.assign(`${apiBaseUrl}/api/auth/google`);
  }

  function continueGoogleSignupWithRole() {
    if (!googleSignupRole) {
      toast.error("Choose an account type first");
      return;
    }

    storeOAuthNextPath(safeNextPath);
    window.location.assign(
      `${apiBaseUrl}/api/auth/google?role=${encodeURIComponent(googleSignupRole)}`,
    );
  }

  return (
    <AuthCard
      title="Sign in to JobAura"
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FieldError label="Email" message={form.formState.errors.email?.message}>
          <Input placeholder="you@example.com" type="email" {...form.register("email")} />
        </FieldError>
        <FieldError label="Password" message={form.formState.errors.password?.message}>
          <div className="flex items-center rounded-lg border border-border bg-surface field-shell">
            <Input
              className="border-0 bg-transparent shadow-none focus:border-0 focus:ring-0"
              placeholder="Your password"
              type={showPassword ? "text" : "password"}
              {...form.register("password")}
            />
            <button
              className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:text-foreground"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </FieldError>
        <div className="-mt-1 text-right">
          <Link className="text-sm font-medium text-primary hover:text-primary-strong" href="/auth/forgot-password">
            Forgot password?
          </Link>
        </div>
        {unverifiedEmail ? (
          <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3" role="alert">
            <p className="text-sm leading-6">
              Please confirm <span className="font-medium break-all">{unverifiedEmail}</span> first. Open the link we
              mailed you, or get a new one.
            </p>
            <ResendVerificationButton email={unverifiedEmail} />
          </div>
        ) : null}
        <Button className="w-full" type="submit" loading={mutation.isPending}>
          Sign in
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <Button
        className="w-full"
        type="button"
        variant="secondary"
        onClick={continueWithGoogle}
      >
        <GoogleIcon />
        Continue with Google
      </Button>
      <GoogleSignupRoleModal
        open={roleModalOpen}
        selectedRole={googleSignupRole}
        onSelect={setGoogleSignupRole}
        onClose={() => setRoleModalDismissed(true)}
        onContinue={continueGoogleSignupWithRole}
      />
      <p className="mt-5 text-center text-sm text-muted">
        New here?{" "}
        <Link className="font-medium text-primary hover:text-primary-strong" href={registerHref}>
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

/**
 * /auth/register. ?role=employer (from "Post a role") picks the account type in advance.
 */
export function RegisterForm() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const notice = searchParams.get("notice");
  // ?role=employer comes from "Post a role" on the landing, so the account type is already picked.
  const requestedRole = searchParams.get("role");
  const role = requestedRole === "user" || requestedRole === "employer" ? requestedRole : undefined;

  return (
    <AuthPageGate nextPath={nextPath}>
      <RegisterFormFields nextPath={nextPath} notice={notice} role={role} />
    </AuthPageGate>
  );
}

function RegisterFormFields({
  nextPath,
  notice,
  role,
}: {
  nextPath?: string | null;
  notice?: string | null;
  role?: "user" | "employer";
}) {
  const safeNextPath = safeInternalPath(nextPath);
  const loginHref = safeNextPath
    ? `/auth/login?next=${encodeURIComponent(safeNextPath)}`
    : "/auth/login";
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", role },
  });
  const selectedRole = useWatch({ control: form.control, name: "role" });
  const roleRegistration = form.register("role", {
    onChange: () => form.clearErrors("role"),
  });
  const apiBaseUrl = resolveClientOrigin(
    env.apiBaseUrl,
    env.useSameOriginApi,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  // Sign-up does not sign in: the user confirms the address from the mail first.
  const [signedUp, setSignedUp] = useState<{ email: string; mailSent: boolean } | null>(null);
  // Data: authApi.signUp → POST /api/auth/signup → NestjsBE/src/modules/auth/services/auth.service.ts signUp()
  const mutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: (res, values) =>
      setSignedUp({
        email: res.content?.user?.email ?? values.email,
        mailSent: res.content?.mailSent ?? false,
      }),
    onError: (error) =>
      toast.error(getErrorMessage(error, "Unable to create account")),
  });

  function requireRole() {
    if (selectedRole === "user" || selectedRole === "employer")
      return selectedRole;

    form.setError("role", {
      type: "manual",
      message: "Choose Candidate or Recruiter before continuing.",
    });
    toast.error("Choose an account type first");
    return null;
  }

  function createAccount(values: SignUp) {
    const role = requireRole();
    if (!role) return;
    mutation.mutate({ ...values, role });
  }

  function continueWithGoogle() {
    const role = requireRole();
    if (!role) return;
    storeOAuthNextPath(safeNextPath);
    window.location.assign(
      `${apiBaseUrl}/api/auth/google?role=${encodeURIComponent(role)}`,
    );
  }

  if (signedUp) {
    return (
      <AuthCard title="Check your email">
        <CheckEmailPanel email={signedUp.email} mailSent={signedUp.mailSent} />
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Create your JobAura account"
    >
      {notice === "google-role-required" ? (
        <p className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm font-medium text-primary">
          Choose an account type, then continue with Google again or complete
          your account with email and password.
        </p>
      ) : null}
      <form className="space-y-4" onSubmit={form.handleSubmit(createAccount)}>
        <FieldError label="Full name" message={form.formState.errors.name?.message}>
          <Input placeholder="Your name" {...form.register("name")} />
        </FieldError>
        <FieldError label="Email" message={form.formState.errors.email?.message}>
          <Input placeholder="you@example.com" type="email" {...form.register("email")} />
        </FieldError>
        <FieldError label="Password" message={form.formState.errors.password?.message}>
          <div className="flex items-center rounded-lg border border-border bg-surface field-shell">
            <Input
              className="border-0 bg-transparent shadow-none focus:border-0 focus:ring-0"
              placeholder={`At least ${authConfig.passwordMinLength} characters`}
              type={showPassword ? "text" : "password"}
              {...form.register("password")}
            />
            <button
              className="mr-1 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted transition hover:text-foreground"
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((value) => !value)}
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        </FieldError>
        <div className="grid gap-2">
          <p className="text-sm font-medium">Account type</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {signupRoleOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                  selectedRole === option.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border bg-surface text-muted hover:border-primary hover:text-foreground"
                }`}
              >
                <input
                  className="sr-only"
                  type="radio"
                  value={option.value}
                  {...roleRegistration}
                />
                <span
                  className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border-2 ${
                    selectedRole === option.value ? "border-primary" : "border-border"
                  }`}
                  aria-hidden="true"
                >
                  {selectedRole === option.value ? (
                    <span className="h-2 w-2 rounded-full bg-primary" />
                  ) : null}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{option.label}</span>
                  <span className="mt-1 block text-xs leading-5">
                    {option.description}
                  </span>
                </span>
              </label>
            ))}
          </div>
          {form.formState.errors.role?.message ? (
            <span className="text-xs font-medium text-danger">
              {form.formState.errors.role.message}
            </span>
          ) : null}
        </div>
        <Button
          className="w-full"
          type="button"
          variant="secondary"
          onClick={continueWithGoogle}
        >
          <GoogleIcon />
          Continue with Google
        </Button>
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs font-medium text-muted">
            or
          </span>
          <span className="h-px flex-1 bg-border" />
        </div>
        <Button className="w-full" type="submit" loading={mutation.isPending}>
          Create account
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted">
        Already have an account?{" "}
        <Link className="font-medium text-primary hover:text-primary-strong" href={loginHref}>
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
