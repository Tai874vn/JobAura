"use client";

import { authConfig } from '@/page-config/auth'
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MailCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { authApi } from "@/shared/api/endpoints";
import { resetClientSession } from "@/shared/api/session-cache";
import { getErrorMessage } from "@/shared/lib/utils";
import { Button, ButtonLink, Input, Spinner } from "@/shared/ui";
import { AuthCard, FieldError } from "./auth-form-layout";

/**
 * The token in a mailed link sits after `#` (`/auth/reset-password#token=…`), because the part
 * after `#` is never sent to a server: it is not in server logs or in the Referer header.
 * It is read once on the client and then removed from the address bar.
 */
export function readHashToken(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, "")).get("token");
  return token && token.length <= 200 ? token : null;
}

function useHashToken(): { token: string | null; ready: boolean } {
  const [state, setState] = useState<{ token: string | null; ready: boolean }>({
    token: null,
    ready: false,
  });
  useEffect(() => {
    const token = readHashToken(window.location.hash);
    if (window.location.hash) {
      window.history.replaceState(null, "", window.location.pathname);
    }
    // Reading the hash must wait for the browser, so this runs once after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ token, ready: true });
  }, []);
  return state;
}

/** "Send it again", with a short wait between clicks (the server also allows one per minute). */
export function ResendVerificationButton({ email }: { email: string }) {
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (waitUntil <= now) return;
    const timer = window.setTimeout(() => setNow(Date.now()), 1000);
    return () => window.clearTimeout(timer);
  }, [now, waitUntil]);
  const secondsLeft = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const mutation = useMutation({
    mutationFn: () => authApi.resendVerification(email),
    onSuccess: () => {
      toast.success("If the address needs confirming, a new link is on its way.");
      const start = Date.now();
      setNow(start);
      setWaitUntil(start + 60_000);
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not send the link")),
  });
  return (
    <Button
      className="w-full"
      type="button"
      variant="secondary"
      loading={mutation.isPending}
      disabled={secondsLeft > 0}
      onClick={() => mutation.mutate()}
    >
      {secondsLeft > 0 ? `Send again in ${secondsLeft}s` : "Send the link again"}
    </Button>
  );
}

/** Shown after sign-up instead of signing in. */
export function CheckEmailPanel({ email, mailSent }: { email: string; mailSent: boolean }) {
  return (
    <div className="space-y-4 text-center">
      <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
      <p className="text-sm leading-6">
        {mailSent ? "We sent a confirm link to " : "Your account is ready. We could not send the confirm link to "}
        <span className="font-medium break-all">{email}</span>
        {mailSent ? ". Open it to finish creating your account." : " just now. Try sending it again."}
      </p>
      <p className="text-xs leading-5 text-muted">
        The link works for 24 hours. If you do not see the mail, check your spam folder.
      </p>
      <ResendVerificationButton email={email} />
      <Link className="block text-sm font-medium text-primary hover:text-primary-strong" href="/auth/login">
        Back to sign in
      </Link>
    </div>
  );
}

export function VerifyEmailView() {
  const { token, ready } = useHashToken();
  const started = useRef(false);
  const mutation = useMutation({ mutationFn: authApi.verifyEmail });
  const { mutate } = mutation;

  useEffect(() => {
    // Strict Mode runs effects twice in development; the link can only be used once.
    if (!ready || !token || started.current) return;
    started.current = true;
    mutate(token);
  }, [mutate, ready, token]);

  let body: React.ReactNode;
  if (!ready || (token && (mutation.isPending || mutation.isIdle))) {
    body = (
      <div className="flex justify-center py-6" role="status" aria-label="Confirming your email">
        <Spinner className="h-7 w-7" />
      </div>
    );
  } else if (mutation.isSuccess) {
    body = (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="text-sm leading-6">
          <span className="font-medium break-all">{mutation.data.content?.email}</span> is confirmed.
        </p>
        <ButtonLink className="w-full" href="/auth/login">Sign in</ButtonLink>
      </div>
    );
  } else {
    body = (
      <div className="space-y-4 text-center">
        <XCircle className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />
        <p className="text-sm leading-6">
          {token
            ? getErrorMessage(mutation.error, "This link is not valid or has expired.")
            : "This link is not complete. Open the link from the mail again."}
        </p>
        <p className="text-xs leading-5 text-muted">
          To get a new link, try to sign in and choose “Send the link again”.
        </p>
        <ButtonLink className="w-full" variant="secondary" href="/auth/login">Go to sign in</ButtonLink>
      </div>
    );
  }
  return <AuthCard title="Confirm your email">{body}</AuthCard>;
}

const forgotSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email").toLowerCase()),
});

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const form = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: "" },
  });
  const mutation = useMutation({
    mutationFn: (email: string) => authApi.forgotPassword(email),
    onSuccess: (_res, email) => setSentTo(email),
    onError: (error) => toast.error(getErrorMessage(error, "Could not send the link")),
  });

  return (
    <AuthCard title="Reset your password">
      {sentTo ? (
        <div className="space-y-4 text-center">
          <MailCheck className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
          <p className="text-sm leading-6">
            If an account uses <span className="font-medium break-all">{sentTo}</span>, we sent it a link to choose a new
            password. The link works for 30 minutes.
          </p>
          <p className="text-xs leading-5 text-muted">If you do not see the mail, check your spam folder.</p>
          <Link className="block text-sm font-medium text-primary hover:text-primary-strong" href="/auth/login">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values.email))}>
          <p className="text-sm leading-6 text-muted">Enter the email of your account and we will send you a link.</p>
          <FieldError label="Email" message={form.formState.errors.email?.message}>
            <Input placeholder="you@example.com" type="email" autoComplete="email" {...form.register("email")} />
          </FieldError>
          <Button className="w-full" type="submit" loading={mutation.isPending}>
            Send reset link
          </Button>
          <Link className="block text-center text-sm font-medium text-primary hover:text-primary-strong" href="/auth/login">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthCard>
  );
}

const resetSchema = z
  .object({
    password: z
      .string()
      .min(authConfig.passwordMinLength, `Password must be at least ${authConfig.passwordMinLength} characters`)
      .max(128, "Password must be 128 characters or fewer"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "The two passwords are not the same",
  });

export function ResetPasswordForm() {
  const { token, ready } = useHashToken();
  const queryClient = useQueryClient();
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: "", confirm: "" },
  });
  const mutation = useMutation({
    mutationFn: (password: string) => authApi.resetPassword({ token: token ?? "", password }),
    // Every device is signed out on the server; this browser forgets its session too.
    onSuccess: () => resetClientSession(queryClient),
  });

  let body: React.ReactNode;
  if (!ready) {
    body = (
      <div className="flex justify-center py-6">
        <Spinner className="h-7 w-7" />
      </div>
    );
  } else if (mutation.isSuccess) {
    body = (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
        <p className="text-sm leading-6">Your password is changed. Every device was signed out.</p>
        <ButtonLink className="w-full" href="/auth/login">Sign in</ButtonLink>
      </div>
    );
  } else if (!token) {
    body = (
      <div className="space-y-4 text-center">
        <XCircle className="mx-auto h-10 w-10 text-danger" aria-hidden="true" />
        <p className="text-sm leading-6">This link is not complete. Open the link from the mail again, or ask for a new one.</p>
        <ButtonLink className="w-full" variant="secondary" href="/auth/forgot-password">Get a new link</ButtonLink>
      </div>
    );
  } else {
    body = (
      <form className="space-y-4" onSubmit={form.handleSubmit((values) => mutation.mutate(values.password))}>
        <FieldError label="New password" message={form.formState.errors.password?.message}>
          <Input placeholder={`At least ${authConfig.passwordMinLength} characters`} type="password" autoComplete="new-password" {...form.register("password")} />
        </FieldError>
        <FieldError label="Type it again" message={form.formState.errors.confirm?.message}>
          <Input type="password" autoComplete="new-password" {...form.register("confirm")} />
        </FieldError>
        {mutation.isError ? (
          <p className="rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger" role="alert">
            {getErrorMessage(mutation.error, "Could not change the password.")}{" "}
            <Link className="font-medium underline" href="/auth/forgot-password">
              Get a new link
            </Link>
          </p>
        ) : null}
        <Button className="w-full" type="submit" loading={mutation.isPending}>
          Change password
        </Button>
      </form>
    );
  }
  return <AuthCard title="Choose a new password">{body}</AuthCard>;
}
