"use client";

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
import { setCachedSession } from "@/shared/api/session-cache";
import { resolveClientOrigin } from "@/shared/config/client-origin";
import { env } from "@/shared/config/env";
import { GoogleIcon } from "@/shared/icons";
import {
  getSignedInRedirect,
  signupRoleOptions,
  type SignupRole,
} from "@/shared/lib/roles";
import { getErrorMessage } from "@/shared/lib/utils";
import {
  signInSchema,
  signUpSchema,
  type SignIn,
  type SignUp,
} from "@/shared/schemas";
import { Button, Input } from "@/shared/ui";
import { AuthCard, AuthPageGate, FieldError } from "./auth-form-layout";
import { GoogleSignupRoleModal } from "./google-signup-role-modal";

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
  const roleModalOpen =
    notice === "google-role-required" && !roleModalDismissed;
  const apiBaseUrl = resolveClientOrigin(
    env.apiBaseUrl,
    env.useSameOriginApi,
    typeof window === "undefined" ? undefined : window.location.origin,
  );

  const mutation = useMutation({
    mutationFn: authApi.signIn,
    onSuccess: (res) => {
      const user = res.content?.user;
      if (user) setCachedSession(user, queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.push(getSignedInRedirect(user, nextPath));
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Unable to sign in")),
  });

  function continueWithGoogle() {
    window.location.assign(`${apiBaseUrl}/api/auth/google`);
  }

  function continueGoogleSignupWithRole() {
    if (!googleSignupRole) {
      toast.error("Choose an account type first");
      return;
    }

    window.location.assign(
      `${apiBaseUrl}/api/auth/google?role=${encodeURIComponent(googleSignupRole)}`,
    );
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to hire, post, and manage JobAura services."
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FieldError label="Email" message={form.formState.errors.email?.message}>
          <Input placeholder="you@example.com" type="email" {...form.register("email")} />
        </FieldError>
        <FieldError label="Password" message={form.formState.errors.password?.message}>
          <div className="flex items-center rounded-lg border border-border bg-surface transition focus-within:border-primary">
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
        <Button className="w-full" type="submit" loading={mutation.isPending}>
          Sign in
        </Button>
      </form>
      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          or
        </span>
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
        <Link className="font-semibold text-primary" href="/auth/register">
          Create an account
        </Link>
      </p>
    </AuthCard>
  );
}

export function RegisterForm() {
  const searchParams = useSearchParams();
  const notice = searchParams.get("notice");

  return (
    <AuthPageGate>
      <RegisterFormFields notice={notice} />
    </AuthPageGate>
  );
}

function RegisterFormFields({ notice }: { notice?: string | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showPassword, setShowPassword] = useState(false);
  const form = useForm<SignUp>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "" },
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

  const mutation = useMutation({
    mutationFn: authApi.signUp,
    onSuccess: (res) => {
      const user = res.content?.user;
      if (user) setCachedSession(user, queryClient);
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.push(getSignedInRedirect(user));
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, "Unable to create account")),
  });

  function requireRole() {
    if (selectedRole === "user" || selectedRole === "employer")
      return selectedRole;

    form.setError("role", {
      type: "manual",
      message: "Choose Worker or Employer before continuing.",
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
    window.location.assign(
      `${apiBaseUrl}/api/auth/google?role=${encodeURIComponent(role)}`,
    );
  }

  return (
    <AuthCard
      title="Create your JobAura account"
      subtitle="Start buying or selling trusted freelance services."
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
          <div className="flex items-center rounded-lg border border-border bg-surface transition focus-within:border-primary">
            <Input
              className="border-0 bg-transparent shadow-none focus:border-0 focus:ring-0"
              placeholder="At least 10 characters"
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
          <p className="text-xs font-semibold uppercase text-muted">
            Account type
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {signupRoleOptions.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition ${
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
                  <span className="block text-sm font-bold">{option.label}</span>
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
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
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
        <Link className="font-semibold text-primary" href="/auth/login">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
