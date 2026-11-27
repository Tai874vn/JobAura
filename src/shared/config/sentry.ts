/**
 * Builds Sentry error-tracking settings for the client, server, and edge runtimes.
 * Picks the DSN, environment name, and trace or replay sample rates, turning sampling off outside production.
 *
 * Calls: nothing from this project
 * Used by:
 *   - instrumentation-client.ts
 */

/**
 * Default Sentry DSN (project reporting address) used when no environment
 * variable is set, so production deployments keep reporting errors out of the box.
 */
export const FALLBACK_SENTRY_DSN =
  'https://a0e90b23c416b868b9dc6254f64c0a05@o4511434684235776.ingest.de.sentry.io/4511434713399376'

export type SentryRuntime = 'client' | 'server' | 'edge'

export type SentryConfigInput = {
  runtime: SentryRuntime
  /** Server-only DSN (SENTRY_DSN), preferred on server and edge runtimes. */
  serverDsn?: string
  /** Browser-safe DSN (NEXT_PUBLIC_SENTRY_DSN), used on client and as server fallback. */
  publicDsn?: string
  /** Explicit app stage name (NEXT_PUBLIC_APP_ENV), e.g. staging or production. */
  appEnv?: string
  /** Node build mode (NODE_ENV). */
  nodeEnv?: string
  /** Share of page loads and requests traced (NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE), 0 to 1. */
  tracesSampleRate?: string
}

export type ResolvedSentryConfig = {
  dsn: string
  environment: string
  tracesSampleRate: number
  replaysSessionSampleRate: number
  replaysOnErrorSampleRate: number
}

function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/**
 * Resolves Sentry DSN, environment name, and sampling rates for each runtime.
 * Production sampling stays unchanged; development lowers trace and replay
 * sampling to 0 so local runs do not flood the Sentry project quota.
 */
/** A rate from 0 to 1 read from text; anything else falls back to the default. */
function sampleRate(value: string | undefined, fallback: number): number {
  const parsed = Number(nonEmpty(value))
  return nonEmpty(value) !== undefined && Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : fallback
}

export function resolveSentryConfig(input: SentryConfigInput): ResolvedSentryConfig {
  const isProduction = input.nodeEnv === 'production'
  const dsn =
    input.runtime === 'client'
      ? nonEmpty(input.publicDsn) ?? FALLBACK_SENTRY_DSN
      : nonEmpty(input.serverDsn) ?? nonEmpty(input.publicDsn) ?? FALLBACK_SENTRY_DSN

  const environment = nonEmpty(input.appEnv) ?? nonEmpty(input.nodeEnv) ?? 'development'

  return {
    dsn,
    environment,
    // Production traces every request by default: the site has low traffic and the report needs full speed data.
    // NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE lowers it (for example 0.1) if traffic grows.
    tracesSampleRate: isProduction ? sampleRate(input.tracesSampleRate, 1) : 0,
    replaysSessionSampleRate: isProduction ? 0.1 : 0,
    replaysOnErrorSampleRate: isProduction ? 1 : 0,
  }
}
