#!/usr/bin/env node
/**
 * Read-only public API load and smoke bot for JobAura.
 *
 * Uses Node's built-in fetch (no external packages) to call public GET endpoints
 * under a shared requests-per-second cap so we stay safely below the backend's
 * 120 req/min per-IP throttle while generating real API traces in Sentry.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const DEFAULT_BASE_URL = 'https://www.jobaura.site'
const DEFAULT_USERS = 5
const MAX_USERS = 20
const DEFAULT_DURATION_SEC = 60
const DEFAULT_RATE_RPS = 1.5
const REQUEST_TIMEOUT_MS = 15_000
const BOT_HEADER_NAME = 'x-jobaura-bot'
const BOT_HEADER_VALUE = '1'
const BOT_USER_AGENT = 'JobAuraApiBot/1.0 JobAuraBot/1.0'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RESULTS_ROOT = path.join(__dirname, 'results')

function printUsage() {
  console.log(`Usage: node bot/api-bot.mjs [options]

Options:
  --base <url>       Base site URL (default: ${DEFAULT_BASE_URL})
  --users <N>        Virtual users, 1..${MAX_USERS} (default: ${DEFAULT_USERS})
  --duration <sec>   Run duration in seconds (default: ${DEFAULT_DURATION_SEC})
  --rate <rps>       Total requests/sec cap across all users (default: ${DEFAULT_RATE_RPS})
  -h, --help         Show this help message
`)
}

function parseArgs(argv) {
  const options = {
    base: DEFAULT_BASE_URL,
    users: DEFAULT_USERS,
    duration: DEFAULT_DURATION_SEC,
    rate: DEFAULT_RATE_RPS,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') {
      options.help = true
      return options
    }

    const eqIndex = arg.indexOf('=')
    const flag = eqIndex >= 0 ? arg.slice(0, eqIndex) : arg
    const nextValue = eqIndex >= 0 ? arg.slice(eqIndex + 1) : argv[i + 1]

    if (flag === '--base') {
      if (!nextValue) throw new Error('--base requires a URL')
      options.base = nextValue.replace(/\/+$/, '')
      if (eqIndex < 0) i += 1
      continue
    }
    if (flag === '--users') {
      const parsed = Number.parseInt(nextValue, 10)
      if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_USERS) {
        throw new Error(`--users must be an integer between 1 and ${MAX_USERS}`)
      }
      options.users = parsed
      if (eqIndex < 0) i += 1
      continue
    }
    if (flag === '--duration') {
      const parsed = Number(nextValue)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('--duration must be a positive number of seconds')
      }
      options.duration = parsed
      if (eqIndex < 0) i += 1
      continue
    }
    if (flag === '--rate') {
      const parsed = Number(nextValue)
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('--rate must be a positive number (requests per second)')
      }
      options.rate = parsed
      if (eqIndex < 0) i += 1
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  const parsedUrl = new URL(options.base)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('--base must start with http:// or https://')
  }
  options.base = parsedUrl.origin

  return options
}

function makeTimestampSlug() {
  return new Date().toISOString().slice(0, 19).replace(/:/g, '-') + 'Z'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function positiveId(value) {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null
}

function extractList(payload) {
  if (!payload || typeof payload !== 'object') return []
  if (Array.isArray(payload)) return payload
  const content = payload.content
  if (Array.isArray(content)) return content
  if (content && typeof content === 'object' && Array.isArray(content.data)) {
    return content.data
  }
  if (Array.isArray(payload.data)) return payload.data
  return []
}

function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return null
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((p / 100) * sortedValues.length) - 1),
  )
  return sortedValues[index]
}

function formatMs(value) {
  return value === null || value === undefined ? '-' : `${Math.round(value)}ms`
}

function formatPercent(ratio) {
  return `${(ratio * 100).toFixed(1)}%`
}

async function discoverSampleIds(baseUrl) {
  const headers = {
    [BOT_HEADER_NAME]: BOT_HEADER_VALUE,
    'user-agent': BOT_USER_AGENT,
    accept: 'application/json',
  }

  async function fetchJson(pathname) {
    try {
      const res = await fetch(`${baseUrl}${pathname}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      })
      if (!res.ok) return null
      return await res.json()
    } catch {
      return null
    }
  }

  const [jobsPayload, hiringPayload] = await Promise.all([
    fetchJson('/api/jobs'),
    fetchJson('/api/hiring-posts?page=1&pageSize=10'),
  ])

  let jobs = extractList(jobsPayload)
  if (jobs.length === 0) {
    jobs = extractList(await fetchJson('/api/jobs/paginated-search?page=1&pageSize=10'))
  }
  const hiringPosts = extractList(hiringPayload)

  const jobIds = [...new Set(jobs.map((item) => positiveId(item?.id)).filter(Boolean))]
  const hiringPostIds = [...new Set(hiringPosts.map((item) => positiveId(item?.id)).filter(Boolean))]

  return { jobIds, hiringPostIds }
}

/**
 * Builds the list of public GET endpoints validated against NestJS controller DTOs.
 */
function buildEndpoints(ids) {
  let jobIdx = 0
  let postIdx = 0

  const endpoints = [
    {
      name: 'GET /api/jobs',
      buildPath: () => '/api/jobs',
    },
    {
      name: 'GET /api/jobs/paginated-search',
      buildPath: () => '/api/jobs/paginated-search?page=1&pageSize=10&sort=newest',
    },
    {
      name: 'GET /api/hiring-posts',
      buildPath: () => '/api/hiring-posts?page=1&pageSize=10&sort=newest',
    },
    {
      name: 'GET /api/hiring-posts/facets',
      buildPath: () => '/api/hiring-posts/facets',
    },
    {
      name: 'GET /api/categories',
      buildPath: () => '/api/categories',
    },
    {
      name: 'GET /api/skill/search?q=react',
      buildPath: () => '/api/skill/search?q=react&limit=10',
    },
    {
      name: 'GET /api/occupations?q=developer',
      buildPath: () => '/api/occupations?q=developer&limit=10',
    },
  ]

  if (ids.jobIds.length > 0) {
    endpoints.push({
      name: 'GET /api/jobs/details/:id',
      buildPath: () => {
        const id = ids.jobIds[jobIdx % ids.jobIds.length]
        jobIdx += 1
        return `/api/jobs/details/${id}`
      },
    })
  } else {
    console.log('[warn] Skipping GET /api/jobs/details/:id (no job IDs returned by /api/jobs)')
  }

  if (ids.hiringPostIds.length > 0) {
    endpoints.push({
      name: 'GET /api/hiring-posts/:id',
      buildPath: () => {
        const id = ids.hiringPostIds[postIdx % ids.hiringPostIds.length]
        postIdx += 1
        return `/api/hiring-posts/${id}`
      },
    })
  } else {
    console.log('[warn] Skipping GET /api/hiring-posts/:id (no post IDs returned by /api/hiring-posts)')
  }

  return endpoints
}

function createStatsBucket(name) {
  return {
    endpoint: name,
    count: 0,
    latencies: [],
    errors: 0,
    rateLimited: 0,
    networkErrors: 0,
    statusCounts: {},
  }
}

function summarizeBucket(bucket) {
  const sorted = [...bucket.latencies].sort((a, b) => a - b)
  const count = bucket.count
  const p50 = percentile(sorted, 50)
  const p95 = percentile(sorted, 95)
  const max = sorted.length > 0 ? sorted[sorted.length - 1] : null
  const errorRate = count > 0 ? bucket.errors / count : 0
  const rateLimitedShare = count > 0 ? bucket.rateLimited / count : 0

  return {
    endpoint: bucket.endpoint,
    count,
    p50Ms: p50 === null ? null : Math.round(p50),
    p95Ms: p95 === null ? null : Math.round(p95),
    maxMs: max === null ? null : Math.round(max),
    errorCount: bucket.errors,
    errorRate,
    rateLimitedCount: bucket.rateLimited,
    rateLimitedShare,
    networkErrors: bucket.networkErrors,
    statusCounts: bucket.statusCounts,
  }
}

function printTable(rows, totalRow) {
  const headers = ['Endpoint', 'Count', 'p50', 'p95', 'Max', 'Errors', '429 Share']
  const allRows = [...rows, totalRow].map((row) => [
    row.endpoint,
    String(row.count),
    formatMs(row.p50Ms),
    formatMs(row.p95Ms),
    formatMs(row.maxMs),
    formatPercent(row.errorRate),
    formatPercent(row.rateLimitedShare),
  ])

  const widths = headers.map((header, idx) =>
    Math.max(header.length, ...allRows.map((row) => row[idx].length)),
  )

  const formatLine = (cols) => cols.map((col, idx) => col.padEnd(widths[idx])).join(' | ')
  const divider = widths.map((width) => '-'.repeat(width)).join('-+-')

  console.log('')
  console.log(formatLine(headers))
  console.log(divider)
  for (let i = 0; i < allRows.length; i += 1) {
    if (i === allRows.length - 1) console.log(divider)
    console.log(formatLine(allRows[i]))
  }
  console.log('')
}

function buildMarkdownReport(summary) {
  const lines = [
    '# JobAura API Load Bot Summary',
    '',
    `- **Started:** ${summary.startedAt}`,
    `- **Finished:** ${summary.finishedAt}`,
    `- **Base URL:** ${summary.baseUrl}`,
    `- **Virtual users:** ${summary.users}`,
    `- **Duration:** ${summary.durationSec}s`,
    `- **Rate cap:** ${summary.rateRps} req/s (${Math.round(summary.rateRps * 60)} req/min)`,
    '',
    '| Endpoint | Count | p50 | p95 | Max | Error Rate | 429 Share |',
    '| --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const row of [...summary.endpoints, summary.total]) {
    lines.push(
      `| ${row.endpoint} | ${row.count} | ${formatMs(row.p50Ms)} | ${formatMs(row.p95Ms)} | ${formatMs(row.maxMs)} | ${formatPercent(row.errorRate)} | ${formatPercent(row.rateLimitedShare)} |`,
    )
  }

  return lines.join('\n') + '\n'
}

async function main() {
  let options
  try {
    options = parseArgs(process.argv.slice(2))
  } catch (error) {
    console.error(`Error: ${error.message}`)
    printUsage()
    process.exitCode = 1
    return
  }

  if (options.help) {
    printUsage()
    return
  }

  const startedAt = new Date().toISOString()
  console.log(`JobAura API Bot starting against ${options.base}`)
  console.log(
    `Users: ${options.users} | Duration: ${options.duration}s | Rate cap: ${options.rate} req/s (${Math.round(options.rate * 60)} req/min)`,
  )

  const ids = await discoverSampleIds(options.base)
  console.log(`Discovered sample IDs -> jobs: ${ids.jobIds.length}, hiringPosts: ${ids.hiringPostIds.length}`)

  const endpoints = buildEndpoints(ids)
  const buckets = new Map(endpoints.map((ep) => [ep.name, createStatsBucket(ep.name)]))
  const totalBucket = createStatsBucket('TOTAL')

  // Shared slot scheduler ensures total request rate across all virtual users never exceeds --rate.
  const intervalMs = 1000 / options.rate
  const stopAt = Date.now() + options.duration * 1000
  let nextSlotAt = Date.now()
  let nextEndpointIndex = 0

  async function acquireSlot() {
    const now = Date.now()
    const scheduled = Math.max(now, nextSlotAt)
    nextSlotAt = scheduled + intervalMs
    if (scheduled >= stopAt) return false
    const waitMs = scheduled - now
    if (waitMs > 0) await sleep(waitMs)
    return Date.now() < stopAt
  }

  const requestHeaders = {
    [BOT_HEADER_NAME]: BOT_HEADER_VALUE,
    'user-agent': BOT_USER_AGENT,
    accept: 'application/json',
  }

  async function runVirtualUser() {
    while (true) {
      const allowed = await acquireSlot()
      if (!allowed) break

      const endpoint = endpoints[nextEndpointIndex % endpoints.length]
      nextEndpointIndex += 1

      const url = `${options.base}${endpoint.buildPath()}`
      const bucket = buckets.get(endpoint.name)
      const started = performance.now()

      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: requestHeaders,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        })
        // Consume the body so latency covers full response transfer and sockets reuse cleanly.
        await res.arrayBuffer()
        const elapsed = performance.now() - started

        for (const target of [bucket, totalBucket]) {
          target.count += 1
          target.latencies.push(elapsed)
          const key = String(res.status)
          target.statusCounts[key] = (target.statusCounts[key] || 0) + 1
          if (res.status === 429) target.rateLimited += 1
          if (res.status >= 400) target.errors += 1
        }
      } catch {
        const elapsed = performance.now() - started
        for (const target of [bucket, totalBucket]) {
          target.count += 1
          target.latencies.push(elapsed)
          target.errors += 1
          target.networkErrors += 1
          target.statusCounts.NETWORK_ERROR = (target.statusCounts.NETWORK_ERROR || 0) + 1
        }
      }
    }
  }

  await Promise.all(Array.from({ length: options.users }, () => runVirtualUser()))

  const finishedAt = new Date().toISOString()
  const endpointSummaries = endpoints.map((ep) => summarizeBucket(buckets.get(ep.name)))
  const totalSummary = summarizeBucket(totalBucket)

  printTable(endpointSummaries, totalSummary)

  const timestampSlug = `${makeTimestampSlug()}-api`
  const outputDir = path.join(RESULTS_ROOT, timestampSlug)
  await fs.mkdir(outputDir, { recursive: true })

  const summary = {
    startedAt,
    finishedAt,
    baseUrl: options.base,
    users: options.users,
    durationSec: options.duration,
    rateRps: options.rate,
    endpoints: endpointSummaries,
    total: totalSummary,
  }

  const jsonPath = path.join(outputDir, 'summary.json')
  const mdPath = path.join(outputDir, 'summary.md')
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2) + '\n', 'utf8')
  await fs.writeFile(mdPath, buildMarkdownReport(summary), 'utf8')

  console.log(`Saved summary JSON: ${jsonPath}`)
  console.log(`Saved summary MD:   ${mdPath}`)

  if (totalSummary.count === 0 || totalSummary.errorCount > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Fatal error in API bot:', error)
  process.exitCode = 1
})
