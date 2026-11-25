// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a user loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { resolveSentryConfig } from "@/shared/config/sentry";

// Read public env vars directly so Next.js can inline them into the browser bundle.
const config = resolveSentryConfig({
  runtime: "client",
  publicDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
});

Sentry.init({
  dsn: config.dsn,
  environment: config.environment,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      maskAllInputs: true,
      blockAllMedia: true,
    }),
  ],

  // Keep production sampling as-is and disable trace/replay sampling in local development.
  tracesSampleRate: config.tracesSampleRate,
  replaysSessionSampleRate: config.replaysSessionSampleRate,
  replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Keep user-identifying request data out of client telemetry by default.
  sendDefaultPii: false,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
