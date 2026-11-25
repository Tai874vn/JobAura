#!/usr/bin/env node
/**
 * Read-only Playwright traffic and smoke bot for JobAura.
 *
 * Visits key public and role-based pages so we can:
 *  1) verify the main user journeys still load without errors, and
 *  2) generate real browser loads and API calls so Sentry collects Web Vitals and traces.
 *
 * Safety: this bot is strictly READ-ONLY. Login is the only form it ever submits.
 */

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const VALID_ROLES = ['visitor', 'candidate', 'employer', 'admin']
const DEFAULT_BASE_URL = 'https://www.jobaura.site'
const DEFAULT_ROUNDS = 1
const DEFAULT_DELAY_MS = 1500
const BOT_HEADER_NAME = 'x-jobaura-bot'
const BOT_HEADER_VALUE = '1'
const BOT_UA_SUFFIX = ' JobAuraBot/1.0'

// Text shown by JobAura's Next.js error boundaries (RouteError, GlobalError, or Next fallback).
const ERROR_BOUNDARY_PHRASES = [
  'Something went wrong',
  'This page hit an unexpected error',
  'The page ran into an unexpected error',
  'Application error: a client-side exception has occurred',
]

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RESULTS_ROOT = path.join(__dirname, 'results')

function printUsage() {
  console.log(`Usage: node bot/browser-bot.mjs [options]

Options:
  --base <url>         Base site URL (default: ${DEFAULT_BASE_URL})
  --rounds <N>         Number of full rounds to run (default: ${DEFAULT_ROUNDS})
  --roles <list>       Comma-separated roles: ${VALID_ROLES.join(',')} (default: all)
  --delay <ms>         Pause between steps in ms (default: ${DEFAULT_DELAY_MS})
  --headed             Show the Chromium browser window
  -h, --help           Show this help message

Environment variables (missing roles are skipped):
  BOT_CANDIDATE_EMAIL, BOT_CANDIDATE_PASSWORD
  BOT_EMPLOYER_EMAIL,  BOT_EMPLOYER_PASSWORD
  BOT_ADMIN_EMAIL,     BOT_ADMIN_PASSWORD
`)
}

function parseArgs(argv) {
  const options = {
    base: DEFAULT_BASE_URL,
    rounds: DEFAULT_ROUNDS,
    roles: [...VALID_ROLES],
    delay: DEFAULT_DELAY_MS,
    headed: false,
    help: false,
  }

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]
    if (arg === '-h' || arg === '--help') {
      options.help = true
      return options
    }
    if (arg === '--headed') {
      options.headed = true
      continue
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
    if (flag === '--rounds') {
      const parsed = Number.parseInt(nextValue, 10)
      if (!Number.isInteger(parsed) || parsed < 1) {
        throw new Error('--rounds must be a positive integer')
      }
      options.rounds = parsed
      if (eqIndex < 0) i += 1
      continue
    }
    if (flag === '--delay') {
      const parsed = Number.parseInt(nextValue, 10)
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error('--delay must be a non-negative integer (ms)')
      }
      options.delay = parsed
      if (eqIndex < 0) i += 1
      continue
    }
    if (flag === '--roles') {
      if (!nextValue) throw new Error('--roles requires a comma-separated list')
      const roles = nextValue
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
      const unknown = roles.filter((role) => !VALID_ROLES.includes(role))
      if (unknown.length > 0) {
        throw new Error(`Unknown role(s): ${unknown.join(', ')}. Valid: ${VALID_ROLES.join(', ')}`)
      }
      if (roles.length === 0) {
        throw new Error('--roles must include at least one role')
      }
      options.roles = [...new Set(roles)]
      if (eqIndex < 0) i += 1
      continue
    }

    throw new Error(`Unknown option: ${arg}`)
  }

  // Validate base URL format early.
  const parsedUrl = new URL(options.base)
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('--base must start with http:// or https://')
  }
  options.base = parsedUrl.origin

  return options
}

function getCredentials(role) {
  if (role === 'visitor') return { email: null, password: null }
  const prefix = `BOT_${role.toUpperCase()}`
  const email = process.env[`${prefix}_EMAIL`]?.trim() || ''
  const password = process.env[`${prefix}_PASSWORD`]?.trim() || ''
  if (!email || !password) return null
  return { email, password }
}

function makeTimestampSlug() {
  return new Date().toISOString().slice(0, 19).replace(/:/g, '-') + 'Z'
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function safeFilename(value) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'step'
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

/**
 * Fetches sample public IDs from the live site's public API so no IDs are hard-coded.
 */
async function discoverPublicIds(baseUrl, userAgent) {
  const headers = {
    [BOT_HEADER_NAME]: BOT_HEADER_VALUE,
    'user-agent': userAgent,
    accept: 'application/json',
  }

  async function fetchJson(pathname) {
    try {
      const res = await fetch(`${baseUrl}${pathname}`, {
        method: 'GET',
        headers,
        signal: AbortSignal.timeout(15_000),
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
    const paginatedJobs = await fetchJson('/api/jobs/paginated-search?page=1&pageSize=10')
    jobs = extractList(paginatedJobs)
  }

  const hiringPosts = extractList(hiringPayload)

  const jobId = jobs.map((item) => positiveId(item?.id)).find(Boolean) ?? null
  const hiringPostId = hiringPosts.map((item) => positiveId(item?.id)).find(Boolean) ?? null

  let profileId = null
  for (const job of jobs) {
    const candidate =
      positiveId(job?.creatorId) ??
      positiveId(job?.user?.id) ??
      positiveId(job?.creator?.id) ??
      positiveId(job?.userId)
    if (candidate) {
      profileId = candidate
      break
    }
  }
  if (!profileId) {
    for (const post of hiringPosts) {
      const candidate = positiveId(post?.recruiterId) ?? positiveId(post?.recruiter?.id)
      if (candidate) {
        profileId = candidate
        break
      }
    }
  }

  return { jobId, hiringPostId, profileId }
}

/**
 * Script injected into every page before load so we capture LCP and CLS
 * using the browser's PerformanceObserver API.
 */
function perfObserverInitScript() {
  const perf = { lcp: null, cls: 0 }
  window.__jobauraPerf = perf

  if (typeof PerformanceObserver !== 'function') return

  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const last = entries[entries.length - 1]
      if (last) {
        perf.lcp = Math.round(last.startTime)
      }
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {
    // Ignore if browser does not support LCP observer.
  }

  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          perf.cls += entry.value
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch {
    // Ignore if browser does not support CLS observer.
  }
}

async function readPageMetrics(page) {
  try {
    return await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0]
      const perf = window.__jobauraPerf || { lcp: null, cls: 0 }
      const ttfb =
        nav && nav.responseStart > 0 ? Math.max(0, Math.round(nav.responseStart - nav.startTime)) : null
      const dcl =
        nav && nav.domContentLoadedEventEnd > 0
          ? Math.max(0, Math.round(nav.domContentLoadedEventEnd - nav.startTime))
          : null
      const load =
        nav && nav.loadEventEnd > 0 ? Math.max(0, Math.round(nav.loadEventEnd - nav.startTime)) : null
      const lcp = typeof perf.lcp === 'number' ? perf.lcp : null
      const cls = typeof perf.cls === 'number' ? Math.round(perf.cls * 10000) / 10000 : null
      return { ttfb, dcl, load, lcp, cls }
    })
  } catch {
    return { ttfb: null, dcl: null, load: null, lcp: null, cls: null }
  }
}

async function detectErrorBoundary(page) {
  try {
    const bodyText = await page.evaluate(() => document.body?.innerText || '')
    for (const phrase of ERROR_BOUNDARY_PHRASES) {
      if (bodyText.includes(phrase)) {
        return phrase
      }
    }
    return null
  } catch {
    return null
  }
}

async function waitForPageSettle(page) {
  await page.waitForLoadState('networkidle', { timeout: 5_000 }).catch(() => {})
  // Give React hydration, LCP paint, and Sentry spans a brief moment to settle.
  await page.waitForTimeout(450)
}

function attachPageTrackers(page) {
  const bucket = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
  }

  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      bucket.consoleErrors.push(msg.text())
    }
  })

  page.on('pageerror', (error) => {
    bucket.pageErrors.push(error?.message || String(error))
  })

  page.on('response', (response) => {
    const status = response.status()
    if (status >= 500) {
      bucket.failedRequests.push(`${status} ${response.request().method()} ${response.url()}`)
    }
  })

  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'network_error'
    // Ignore normal cancellations caused by client navigations or aborted prefetches.
    if (/ERR_ABORTED|NS_BINDING_ABORTED|aborted/i.test(errorText)) return
    bucket.failedRequests.push(`FAILED(${errorText}) ${request.method()} ${request.url()}`)
  })

  return {
    reset() {
      bucket.consoleErrors = []
      bucket.pageErrors = []
      bucket.failedRequests = []
    },
    snapshot() {
      return {
        consoleErrors: [...bucket.consoleErrors],
        pageErrors: [...bucket.pageErrors],
        failedRequests: [...bucket.failedRequests],
      }
    },
  }
}

function formatMs(value) {
  return value === null || value === undefined ? '-' : `${value}ms`
}

function formatCls(value) {
  return value === null || value === undefined ? '-' : value.toFixed(3)
}

function printResultsTable(results) {
  const headers = ['Round', 'Role', 'Page', 'Status', 'TTFB', 'LCP', 'CLS', 'Load', 'Errors']
  const rows = results.map((item) => [
    String(item.round),
    item.role,
    item.page,
    item.status,
    formatMs(item.metrics.ttfb),
    formatMs(item.metrics.lcp),
    formatCls(item.metrics.cls),
    formatMs(item.metrics.load),
    String(item.errorCount),
  ])

  const widths = headers.map((header, idx) =>
    Math.max(header.length, ...rows.map((row) => row[idx].length)),
  )

  const formatRow = (cols) => cols.map((col, idx) => col.padEnd(widths[idx])).join(' | ')
  const divider = widths.map((width) => '-'.repeat(width)).join('-+-')

  console.log('')
  console.log(formatRow(headers))
  console.log(divider)
  for (const row of rows) {
    console.log(formatRow(row))
  }
  console.log('')
}

function buildMarkdownReport(summary) {
  const lines = [
    '# JobAura Browser Bot Summary',
    '',
    `- **Started:** ${summary.startedAt}`,
    `- **Finished:** ${summary.finishedAt}`,
    `- **Base URL:** ${summary.baseUrl}`,
    `- **Rounds:** ${summary.rounds}`,
    `- **Roles requested:** ${summary.rolesRequested.join(', ')}`,
    `- **Roles skipped:** ${summary.rolesSkipped.length ? summary.rolesSkipped.join(', ') : 'none'}`,
    `- **Total steps:** ${summary.totals.steps} (passed: ${summary.totals.passed}, failed: ${summary.totals.failed}, skipped: ${summary.totals.skipped})`,
    '',
    '| Round | Role | Page | Status | TTFB | DCL | LCP | CLS | Load | Errors | Notes |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ]

  for (const step of summary.steps) {
    const notes = step.notes.length ? step.notes.join('; ').replace(/\|/g, '\\|') : ''
    lines.push(
      `| ${step.round} | ${step.role} | ${step.page} | ${step.status} | ${formatMs(step.metrics.ttfb)} | ${formatMs(step.metrics.dcl)} | ${formatMs(step.metrics.lcp)} | ${formatCls(step.metrics.cls)} | ${formatMs(step.metrics.load)} | ${step.errorCount} | ${notes} |`,
    )
  }

  const failedSteps = summary.steps.filter((step) => step.status === 'FAIL')
  if (failedSteps.length > 0) {
    lines.push('', '## Failures', '')
    for (const step of failedSteps) {
      lines.push(`### [Round ${step.round}] ${step.role} — ${step.page}`)
      if (step.httpStatus !== null) lines.push(`- **HTTP status:** ${step.httpStatus}`)
      if (step.screenshot) lines.push(`- **Screenshot:** \`${step.screenshot}\``)
      for (const err of step.errors) {
        lines.push(`- ${err}`)
      }
      lines.push('')
    }
  }

  return lines.join('\n') + '\n'
}

async function runStep({
  page,
  tracker,
  round,
  role,
  label,
  outputDir,
  stepIndex,
  delayMs,
  requireAuth = false,
  action,
}) {
  tracker.reset()
  const notes = []
  const errors = []
  let httpStatus = null
  let metrics = { ttfb: null, dcl: null, load: null, lcp: null, cls: null }
  let screenshotName = null
  let skipped = false

  try {
    const outcome = await action({
      addNote: (text) => notes.push(text),
      markSkipped: (reason) => {
        skipped = true
        if (reason) notes.push(reason)
      },
    })
    if (outcome && typeof outcome.httpStatus === 'number') {
      httpStatus = outcome.httpStatus
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error))
  }

  if (!skipped) {
    metrics = await readPageMetrics(page)
    const boundaryText = await detectErrorBoundary(page)
    if (boundaryText) {
      errors.push(`Error boundary visible: "${boundaryText}"`)
    }

    if (httpStatus !== null && httpStatus >= 400) {
      errors.push(`HTTP ${httpStatus}`)
    }

    if (requireAuth) {
      try {
        const currentPathname = new URL(page.url()).pathname
        if (currentPathname.startsWith('/auth/login')) {
          errors.push('Redirected to /auth/login (session not active)')
        }
      } catch {
        // Ignore invalid page URL when browser has not navigated.
      }
    }

    const tracked = tracker.snapshot()
    for (const msg of tracked.consoleErrors) errors.push(`console.error: ${msg}`)
    for (const msg of tracked.pageErrors) errors.push(`pageerror: ${msg}`)
    for (const msg of tracked.failedRequests) errors.push(`request: ${msg}`)
  }

  const status = skipped ? 'SKIP' : errors.length === 0 ? 'PASS' : 'FAIL'

  if (status === 'FAIL') {
    screenshotName = `r${round}-${String(stepIndex).padStart(2, '0')}-${role}-${safeFilename(label)}.png`
    const screenshotPath = path.join(outputDir, screenshotName)
    await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {
      screenshotName = null
    })
  }

  const summaryLine = `[round ${round}][${role}] ${label} -> ${status}` +
    (metrics.load !== null ? ` (TTFB ${metrics.ttfb ?? '-'}ms, LCP ${metrics.lcp ?? '-'}ms, CLS ${formatCls(metrics.cls)}, Load ${metrics.load}ms)` : '') +
    (notes.length ? ` | ${notes.join('; ')}` : '')
  console.log(summaryLine)
  if (errors.length > 0) {
    for (const err of errors) {
      console.log(`    error: ${err}`)
    }
  }

  if (delayMs > 0) {
    await sleep(delayMs)
  }

  return {
    round,
    role,
    page: label,
    status,
    httpStatus,
    metrics,
    errorCount: errors.length,
    errors,
    notes,
    screenshot: screenshotName,
  }
}

async function gotoAndSettle(page, url) {
  const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 })
  await waitForPageSettle(page)
  return { httpStatus: response ? response.status() : null }
}

async function loginThroughForm(page, baseUrl, credentials) {
  const response = await page.goto(`${baseUrl}/auth/login`, { waitUntil: 'load', timeout: 30_000 })
  await waitForPageSettle(page)

  // Field names come from src/features/auth/auth-forms.tsx (react-hook-form register("email") / register("password")).
  const emailInput = page.locator('input[name="email"]')
  const passwordInput = page.locator('input[name="password"]')
  const submitButton = page.locator('form button[type="submit"]')

  await emailInput.waitFor({ state: 'visible', timeout: 15_000 })
  await emailInput.fill(credentials.email)
  await passwordInput.fill(credentials.password)

  const signInResponsePromise = page
    .waitForResponse(
      (res) => res.url().includes('/api/auth/signin') && res.request().method() === 'POST',
      { timeout: 20_000 },
    )
    .catch(() => null)

  await submitButton.click()

  const signInResponse = await signInResponsePromise
  if (signInResponse && signInResponse.status() >= 400) {
    throw new Error(`Sign-in API returned HTTP ${signInResponse.status()}`)
  }

  await page.waitForURL((url) => !url.pathname.startsWith('/auth/login'), { timeout: 20_000 })
  await waitForPageSettle(page)

  return { httpStatus: response ? response.status() : null }
}

async function runVisitorJourney(ctx) {
  const { page, baseUrl, ids, executeStep } = ctx

  await executeStep('/welcome', async () => gotoAndSettle(page, `${baseUrl}/welcome`))

  await executeStep('/jobs', async () => gotoAndSettle(page, `${baseUrl}/jobs`))

  await executeStep('/jobs (search, filter, page 2)', async ({ addNote }) => {
    const searchForm = page.locator('form[aria-label="Search candidate portfolios"]')
    const keywordInput = searchForm.locator('input[aria-label="Keyword"]')
    await keywordInput.waitFor({ state: 'visible', timeout: 10_000 })

    // 1) Search a keyword.
    await keywordInput.fill('design')
    await searchForm.locator('button[type="submit"]').click()
    await page.waitForURL((url) => url.searchParams.get('keyword') === 'design', { timeout: 10_000 }).catch(() => {})
    await waitForPageSettle(page)
    addNote('searched "design"')

    // 2) Open/interact with filters in the left sidebar.
    const filterAside = page.locator('aside[aria-label="Filters"]')
    await filterAside.waitFor({ state: 'visible', timeout: 10_000 })

    const showMoreBtn = filterAside.locator('button', { hasText: /Show more categories/i })
    if (await showMoreBtn.isVisible().catch(() => false)) {
      await showMoreBtn.click()
      await page.waitForTimeout(250)
      addNote('expanded categories')
    }

    const priceFieldset = filterAside.locator('fieldset', { hasText: 'Price' }).first()
    const priceChoices = priceFieldset.locator('label')
    if ((await priceChoices.count()) > 1) {
      await priceChoices.nth(1).click()
      await waitForPageSettle(page)
      addNote('applied price filter')
    }

    // 3) Reset filters so the full list is available, then move to page 2 if present.
    const resetBtn = filterAside.locator('button', { hasText: /^Reset$/ })
    if (await resetBtn.isEnabled().catch(() => false)) {
      await resetBtn.click()
      await waitForPageSettle(page)
    }

    const page2Btn = page.locator('nav[aria-label="Portfolio pages"] button[aria-label="Page 2"]')
    if (await page2Btn.isVisible().catch(() => false)) {
      await page2Btn.click()
      await page.waitForURL((url) => url.searchParams.get('page') === '2', { timeout: 10_000 }).catch(() => {})
      await waitForPageSettle(page)
      addNote('moved to page 2')
    } else {
      addNote('only 1 page of jobs available')
    }
  })

  await executeStep(ids.jobId ? `/jobs/${ids.jobId}` : '/jobs/<id>', async ({ markSkipped }) => {
    if (!ids.jobId) {
      markSkipped('no public job ID returned by GET /api/jobs')
      return
    }
    return gotoAndSettle(page, `${baseUrl}/jobs/${ids.jobId}`)
  })

  await executeStep('/hiring-posts', async () => gotoAndSettle(page, `${baseUrl}/hiring-posts`))

  await executeStep('/hiring-posts (filter)', async ({ addNote }) => {
    const filterAside = page.locator('aside[aria-label="Filters"]')
    await filterAside.waitFor({ state: 'visible', timeout: 10_000 })

    const levelFieldset = filterAside.locator('fieldset', { hasText: 'Experience level' }).first()
    const levelChoices = levelFieldset.locator('label')
    if ((await levelChoices.count()) > 1) {
      await levelChoices.nth(1).click()
      await page.waitForURL((url) => Boolean(url.searchParams.get('level')), { timeout: 10_000 }).catch(() => {})
      await waitForPageSettle(page)
      addNote('applied level filter')
    } else {
      addNote('no level filter choices rendered')
    }
  })

  await executeStep(
    ids.hiringPostId ? `/hiring-posts/${ids.hiringPostId}` : '/hiring-posts/<id>',
    async ({ markSkipped }) => {
      if (!ids.hiringPostId) {
        markSkipped('no open hiring post ID returned by GET /api/hiring-posts')
        return
      }
      return gotoAndSettle(page, `${baseUrl}/hiring-posts/${ids.hiringPostId}`)
    },
  )

  await executeStep(
    ids.profileId ? `/profile/${ids.profileId}` : '/profile/<id>',
    async ({ markSkipped }) => {
      if (!ids.profileId) {
        markSkipped('no public profile ID found in jobs or hiring posts')
        return
      }
      return gotoAndSettle(page, `${baseUrl}/profile/${ids.profileId}`)
    },
  )
}

async function runCandidateJourney(ctx) {
  const { page, baseUrl, credentials, executeStep } = ctx

  const loginResult = await executeStep('/auth/login (candidate)', async () =>
    loginThroughForm(page, baseUrl, credentials),
  )
  if (loginResult.status === 'FAIL') return

  const routes = [
    '/recommendations/jobs',
    '/saved',
    '/contracts',
    '/wallet',
    '/connections',
  ]

  for (const route of routes) {
    await executeStep(route, async () => gotoAndSettle(page, `${baseUrl}${route}`), {
      requireAuth: true,
    })
  }

  // Open the floating chat widget and switch rooms without ever typing or sending a message.
  await executeStep('chat (open and switch rooms)', async ({ addNote }) => {
    const chatOpenBtn = page.locator('button', { hasText: /^Chat$/ }).last()
    await chatOpenBtn.waitFor({ state: 'visible', timeout: 10_000 })
    await chatOpenBtn.click()

    const chatDrawer = page.locator('section', { has: page.locator('h2', { hasText: /^Messages$/ }) })
    await chatDrawer.waitFor({ state: 'visible', timeout: 10_000 })

    // Wait for rooms list or empty message to finish loading.
    const roomButtons = chatDrawer.locator('aside button').filter({ hasNotText: /^Retry$/ })
    const emptyText = chatDrawer.locator('aside', { hasText: /No conversations yet/i })
    await Promise.race([
      roomButtons.first().waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {}),
      emptyText.waitFor({ state: 'visible', timeout: 8_000 }).catch(() => {}),
    ])
    await page.waitForTimeout(400)

    const roomCount = await roomButtons.count()
    if (roomCount === 0) {
      addNote('chat opened; account has 0 rooms')
    } else if (roomCount === 1) {
      await roomButtons.nth(0).click()
      await waitForPageSettle(page)
      addNote('opened 1 chat room')
    } else {
      await roomButtons.nth(0).click()
      await waitForPageSettle(page)
      await roomButtons.nth(1).click()
      await waitForPageSettle(page)
      addNote(`switched across 2 of ${roomCount} chat rooms`)
    }

    const closeBtn = chatDrawer.locator('button[aria-label="Close chat"]')
    if (await closeBtn.isVisible().catch(() => false)) {
      await closeBtn.click()
    }
  }, { requireAuth: true })
}

async function runEmployerJourney(ctx) {
  const { page, baseUrl, credentials, executeStep } = ctx

  const loginResult = await executeStep('/auth/login (employer)', async () =>
    loginThroughForm(page, baseUrl, credentials),
  )
  if (loginResult.status === 'FAIL') return

  await executeStep('/my-hiring-posts', async () => gotoAndSettle(page, `${baseUrl}/my-hiring-posts`), {
    requireAuth: true,
  })

  // Open the applicants page of the first hiring post (read-only).
  await executeStep('/my-hiring-posts/<first>/applicants', async ({ addNote, markSkipped }) => {
    const firstApplicantsLink = page.locator('a[href*="/my-hiring-posts/"][href$="/applicants"]').first()
    const emptyState = page.locator('text=No hiring posts yet')

    await Promise.race([
      firstApplicantsLink.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {}),
      emptyState.waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {}),
    ])

    const href = (await firstApplicantsLink.isVisible().catch(() => false))
      ? await firstApplicantsLink.getAttribute('href')
      : null

    if (!href) {
      markSkipped('employer account has no hiring posts yet')
      return
    }

    addNote(`opened ${href}`)
    return gotoAndSettle(page, `${baseUrl}${href}`)
  }, { requireAuth: true })

  await executeStep('/candidates', async () => gotoAndSettle(page, `${baseUrl}/candidates`), {
    requireAuth: true,
  })

  await executeStep('/candidates (search)', async ({ addNote }) => {
    const searchForm = page.locator('form[aria-label="Search candidates"]')
    const keywordInput = searchForm.locator('input[aria-label="Keyword"]')
    await keywordInput.waitFor({ state: 'visible', timeout: 10_000 })
    await keywordInput.fill('react')
    await searchForm.locator('button[type="submit"]').click()
    await page.waitForURL((url) => url.searchParams.get('keyword') === 'react', { timeout: 10_000 }).catch(() => {})
    await waitForPageSettle(page)
    addNote('searched "react"')
  }, { requireAuth: true })

  await executeStep('/contracts', async () => gotoAndSettle(page, `${baseUrl}/contracts`), {
    requireAuth: true,
  })

  await executeStep('/wallet', async () => gotoAndSettle(page, `${baseUrl}/wallet`), {
    requireAuth: true,
  })
}

async function runAdminJourney(ctx) {
  const { page, baseUrl, credentials, executeStep } = ctx

  const loginResult = await executeStep('/auth/login (admin)', async () =>
    loginThroughForm(page, baseUrl, credentials),
  )
  if (loginResult.status === 'FAIL') return

  const routes = ['/admin', '/admin/users', '/admin/categories']
  for (const route of routes) {
    await executeStep(route, async () => gotoAndSettle(page, `${baseUrl}${route}`), {
      requireAuth: true,
    })
  }
}

const ROLE_RUNNERS = {
  visitor: runVisitorJourney,
  candidate: runCandidateJourney,
  employer: runEmployerJourney,
  admin: runAdminJourney,
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
  const timestampSlug = makeTimestampSlug()
  const outputDir = path.join(RESULTS_ROOT, timestampSlug)
  await fs.mkdir(outputDir, { recursive: true })

  console.log(`JobAura Browser Bot starting against ${options.base}`)
  console.log(`Rounds: ${options.rounds} | Roles: ${options.roles.join(', ')} | Delay: ${options.delay}ms | Headed: ${options.headed}`)

  const browser = await chromium.launch({ headless: !options.headed })
  const chromeVersion = browser.version() || '136.0.0.0'
  const userAgent =
    `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) ` +
    `Chrome/${chromeVersion} Safari/537.36${BOT_UA_SUFFIX}`

  const allSteps = []
  const skippedRoles = new Set()

  try {
    const ids = await discoverPublicIds(options.base, userAgent)
    console.log(
      `Discovered public IDs -> job: ${ids.jobId ?? 'none'}, hiringPost: ${ids.hiringPostId ?? 'none'}, profile: ${ids.profileId ?? 'none'}`,
    )

    for (let round = 1; round <= options.rounds; round += 1) {
      for (const role of options.roles) {
        const credentials = getCredentials(role)
        if (!credentials) {
          if (!skippedRoles.has(role)) {
            const prefix = `BOT_${role.toUpperCase()}`
            console.log(`[skip] ${role}: missing ${prefix}_EMAIL or ${prefix}_PASSWORD`)
            skippedRoles.add(role)
          }
          continue
        }

        const context = await browser.newContext({
          userAgent,
          viewport: { width: 1280, height: 800 },
        })
        await context.addInitScript(perfObserverInitScript)

        const page = await context.newPage()
        await page.setExtraHTTPHeaders({ [BOT_HEADER_NAME]: BOT_HEADER_VALUE })
        const tracker = attachPageTrackers(page)

        let stepIndex = 0
        const executeStep = async (label, action, extra = {}) => {
          stepIndex += 1
          const result = await runStep({
            page,
            tracker,
            round,
            role,
            label,
            outputDir,
            stepIndex,
            delayMs: options.delay,
            requireAuth: Boolean(extra.requireAuth),
            action,
          })
          allSteps.push(result)
          return result
        }

        try {
          await ROLE_RUNNERS[role]({
            page,
            baseUrl: options.base,
            ids,
            credentials,
            executeStep,
          })
          // Wait briefly before closing the tab so final Sentry traces and Web Vitals flush.
          await page.waitForTimeout(800)
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }

  const finishedAt = new Date().toISOString()
  const totals = {
    steps: allSteps.length,
    passed: allSteps.filter((step) => step.status === 'PASS').length,
    failed: allSteps.filter((step) => step.status === 'FAIL').length,
    skipped: allSteps.filter((step) => step.status === 'SKIP').length,
  }

  const summary = {
    startedAt,
    finishedAt,
    baseUrl: options.base,
    rounds: options.rounds,
    delayMs: options.delay,
    rolesRequested: options.roles,
    rolesSkipped: [...skippedRoles],
    userAgent,
    totals,
    steps: allSteps,
  }

  printResultsTable(allSteps)

  const jsonPath = path.join(outputDir, 'summary.json')
  const mdPath = path.join(outputDir, 'summary.md')
  await fs.writeFile(jsonPath, JSON.stringify(summary, null, 2) + '\n', 'utf8')
  await fs.writeFile(mdPath, buildMarkdownReport(summary), 'utf8')

  console.log(`Saved summary JSON: ${jsonPath}`)
  console.log(`Saved summary MD:   ${mdPath}`)

  if (totals.failed > 0) {
    process.exitCode = 1
  }
}

main().catch((error) => {
  console.error('Fatal error in browser bot:', error)
  process.exitCode = 1
})
