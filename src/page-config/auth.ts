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
