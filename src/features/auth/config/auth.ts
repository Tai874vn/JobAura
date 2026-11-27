/**
 * Holds auth settings and Zod validation schemas for the sign-in, sign-up, forgot-password, and reset-password forms.
 *
 * Calls: signupRoles
 * Used by:
 *   - features/auth/components/auth-forms.tsx
 *   - features/auth/components/email-flows.tsx
 *   - shared/schemas/users.ts
 */

import { z } from 'zod'
import { signupRoles } from '@/shared/lib/roles'

// @find auth page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /auth/register, /auth/reset-password (and the other sign-in pages)
 *
 * Safe edits: RAISE the number. The backend also requires at least 10 characters (SignUpDto, ResetPasswordDto);
 * a lower number here only moves the error from the form to the server.
 */
export const authConfig = {
  /** Shortest password a new account or a password reset accepts. */
  passwordMinLength: 10,
} as const

// @find auth form input validation [all] — the Zod rules of the sign-in, sign-up, forgot and reset forms
/*
 * FORM INPUT RULES (Zod). The form shows these messages under the fields before anything is sent.
 * The backend checks the same rules again (SignInDto, SignUpDto, EmailOnlyDto, ResetPasswordDto).
 */

/** Sign-in form: email + password. */
export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email").toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be 128 characters or fewer"),
});

/** Sign-up form. */
export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  email: z.string().trim().pipe(z.email("Enter a valid email").toLowerCase()),
  password: z
    .string()
    .min(authConfig.passwordMinLength, `Password must be at least ${authConfig.passwordMinLength} characters`)
    .max(128, "Password must be 128 characters or fewer"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer")
    .optional(),
  birthDay: z
    .string()
    .trim()
    .max(30, "Birthday must be 30 characters or fewer")
    .optional(),
  gender: z
    .string()
    .trim()
    .max(30, "Gender must be 30 characters or fewer")
    .optional(),
  role: z.enum(signupRoles).optional(),
  skill: z.string().trim().optional(),
  certification: z.string().trim().optional(),
});

/** "Forgot password" form: only the email. */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email").toLowerCase()),
});

/** "Choose a new password" form: the password twice. */
export const resetPasswordSchema = z
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
