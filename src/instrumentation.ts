/**
 * Loads Sentry error tracking when the Next.js server starts (for Node.js or Edge) and forwards server request errors to Sentry.
 *
 * Calls: sentry.server.config; sentry.edge.config
 * Used by:
 *   - Next.js: runs once when the server starts
 */

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
