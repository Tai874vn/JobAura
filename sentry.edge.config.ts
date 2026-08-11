// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isProduction = process.env.NODE_ENV === "production";

Sentry.init({
  dsn: "https://a0e90b23c416b868b9dc6254f64c0a05@o4511434684235776.ingest.de.sentry.io/4511434713399376",

  // Keep full traces locally, sample production traffic to control noise and quota.
  tracesSampleRate: isProduction ? 0.1 : 1,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  // Keep user-identifying request data out of telemetry by default.
  sendDefaultPii: false,
});
