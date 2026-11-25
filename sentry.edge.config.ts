// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";
import { resolveSentryConfig } from "./src/shared/config/sentry";

const config = resolveSentryConfig({
  runtime: "edge",
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
