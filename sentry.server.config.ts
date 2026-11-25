// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { resolveSentryConfig } from "./src/shared/config/sentry";

const config = resolveSentryConfig({
  runtime: "server",
  serverDsn: process.env.SENTRY_DSN,
  publicDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  appEnv: process.env.NEXT_PUBLIC_APP_ENV,
  nodeEnv: process.env.NODE_ENV,
  tracesSampleRate: process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
});

Sentry.init({
  dsn: config.dsn,
  environment: config.environment,

  // Keep production sampling as-is and disable trace sampling in local development.
  tracesSampleRate: config.tracesSampleRate,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Keep user-identifying request data out of telemetry by default.
  sendDefaultPii: false,
});
