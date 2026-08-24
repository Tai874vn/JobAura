# JobAura Frontend Code Review — 2026-08-24

## Scope

This review checks the current frontend source for correctness, maintainability, security boundaries, performance risks, duplicated responsibilities, and missing regression coverage. Findings are recorded as the review progresses.

## Baseline checks

- ESLint: passed.
- TypeScript typecheck: passed.
- Vitest: 21 files and 78 tests passed.
- Working tree was clean before the review.
- Repomix 1.13.1 packed 188 source files (154,848 tokens) and its automated security scan reported no suspicious files.

## Initial maintainability hotspots

Repomix and source line counts identified these larger modules for focused review:

- Workspace settings page: account/preferences orchestration and resume settings.
- Profile page: profile data, mutations, and presentation.
- Hiring-posts page: recruiter and applicant workflows.
- Marketplace normalizers: compatibility mapping for multiple API response shapes.
- Admin resource page: generic resource configuration and editing UI.

Large files are not automatically defects. They are changed only when responsibilities can be separated without making data flow harder to follow.

## Review log

### 1. Session and navigation security boundary

Findings and fixes:

- Session expiry previously cleared the current user but could leave cached notifications, saved items, and other private query data in memory. A single session-reset helper now clears the complete client cache on logout or refresh failure.
- Login return paths accepted a leading slash but did not explicitly reject backslashes. Redirects and notification links now share one URL-based internal-path validator that rejects external and backslash-based forms.
- A malformed percent-encoded CSRF cookie could throw while preparing a request. Malformed values are now ignored safely.
- Production CSP no longer includes `unsafe-eval`; it remains available only for the development runtime.
- Settings now consumes the shared session hook instead of creating a second authentication query path.

Verification:

- Focused ESLint and TypeScript checks passed.
- Four focused test files passed with 14 tests covering safe redirects, notification links, malformed CSRF cookies, and removal of private cache data.

### 2. User-controlled links and asset URLs

Findings and fixes:

- Profile websites, portfolio links, certification links, and resume asset URLs originate from user or API data. They previously did not share a strict protocol check.
- A shared URL helper now accepts only HTTP and HTTPS URLs, normalizes host-only website values, and rejects schemes such as `javascript:` and `data:`.
- Profile links open as isolated external links with `noopener`/`noreferrer`. Invalid portfolio links render as non-clickable cards instead of placeholder anchors.
- Client image resolution and server SEO asset resolution now use the same protocol restriction.

Verification:

- Focused ESLint and TypeScript checks passed.
- Utility tests passed with new coverage for hostile schemes and host-only URLs.

### 3. Hiring-post module responsibilities

Findings and fixes:

- The hiring-post page combined queries, mutations, search, pagination, recruiter summaries, the creation form, and applicant cards in one module.
- Queries, mutations, and workflow state remain in the page, while the creation modal, recruiter panel, and hiring-post card are now independent presentation modules.
- The page decreased from about 650 lines to 280 lines. Each extracted view is between 111 and 125 lines.
- Salary formatting is exported as a small pure function with regression coverage.

Verification:

- Focused ESLint and TypeScript checks passed.
- Hiring salary-format tests passed for ranges, lower bounds, upper bounds, and missing salary data.

### 4. React Query request isolation

Finding and fix:

- The shared QueryClient was a module-level singleton. This is desirable in the browser, but server rendering can reuse a module across requests and must not share cached user data.
- Query-client creation now returns a fresh client during server execution and a stable singleton only in the browser.
- Session cache helpers and the application provider use the same lifecycle function.

Verification:

- Focused ESLint and TypeScript checks passed.
- A server-lifecycle regression test confirms that private data written to one QueryClient is absent from the next server client.

### 5. API endpoint ownership

Finding and fix:

- The endpoint compatibility file still implemented six separate API areas in roughly 385 lines.
- Jobs, recommendations, hiring posts, job taxonomy, comments, and hired jobs now have independent endpoint modules. Shared parameter cleanup is a five-line helper.
- The public endpoint barrel is now 14 lines, so all existing feature imports remain compatible.

Verification:

- Focused ESLint and the full TypeScript check passed after the split.
- No request URL, payload, response normalizer, or public API name changed.

### 6. Marketplace response normalization

Finding and fix:

- The marketplace normalizer still combined job/catalog mapping, hiring workflow mapping, and AI recommendation mapping in one 544-line module.
- These areas now have separate job, hiring, and recommendation normalizers. The previous marketplace file is a three-line compatibility barrel.
- Cross-domain reuse is explicit: recommendation mapping imports only the base job normalizer it requires.

Verification:

- Focused ESLint and the full TypeScript check passed.
- All 10 existing normalizer regression tests passed without changes to their public imports.

### 7. Profile view responsibilities

Finding and fix:

- The profile page still contained post cards, resume presentation, and shared display primitives below its query and mutation orchestration.
- Those rendering responsibilities now live in a profile-content module alongside the existing editor and model modules.
- The page decreased from 617 to 440 lines; the extracted content module is 197 lines and contains no server-state ownership.

Verification:

- Focused ESLint and the full TypeScript check passed.

### 8. Container runtime privilege

Finding and fix:

- The production Next.js container inherited the root user from the Node base image.
- Runtime files are now owned by the built-in unprivileged `node` account, and the final process starts with `USER node`.
- Build stages still have the permissions needed to install dependencies and compile the application; only the production runtime is restricted.

Verification:

- Dockerfile stages and runtime copy paths were reviewed. The application production build is included in the final validation below.

### 9. Image upload regression coverage

Finding and fix:

- Image validation protected avatar, cover, post, and service uploads but had no direct automated coverage.
- Tests now cover accepted MIME types, extension fallback, unsupported formats, the 5 MB limit, custom field labels, and the throwing endpoint guard.

Verification:

- Focused ESLint passed.
- Four image-validation tests passed.

### 10. Admin actions and destructive operations

Findings and fixes:

- The generic admin table displayed edit, upload, and pagination controls that had no implementation. These controls could mislead an administrator into thinking an action completed.
- Unsupported controls were removed. Valid View actions now link jobs and users to their real detail pages.
- Delete no longer runs on the first click. It uses the shared accessible confirmation dialog, identifies the record, blocks repeated submission while pending, and explains that removal is permanent.

Verification:

- Focused ESLint and the full TypeScript check passed.

## Second Repomix inspection

A fresh post-fix Repomix snapshot packed 207 files and 159,289 tokens. Its security scan again found no suspicious files. The second pass then inspected the remaining large modules, protected route graph, environment boundaries, realtime clients, destructive mutations, public route parameters, and query failure states.

### 11. Deployment environment validation

Finding and fix:

- API environment values were required but not checked as URLs. A value such as `jobaura.site` was therefore accepted as a relative Axios base and could produce malformed paths such as `/auth/jobaura.site/api/...`.
- Browser and server API base values now fail the build immediately unless they are absolute HTTP(S) origins without embedded credentials, paths, query parameters, or fragments. This also prevents accidental `/api/api/...` paths. Valid values are trimmed and normalized without a trailing slash.

Verification:

- Two environment tests cover valid public/private bases and malformed, relative, credential-bearing, and non-HTTP values.

### 12. Role gates and current recommendation quota

Findings and fixes:

- Worker-only navigation hid the feed, service creation, owned services, hired jobs, and job recommendations from employers, but direct URLs were only checking whether a session existed. Those routes now apply the same `user`/`admin` role policy as navigation.
- Cached AI results could carry an old quota and override the newer quota endpoint. Current-session results take priority after a run; otherwise the live quota endpoint takes priority over cached result metadata.

Verification:

- TypeScript and focused ESLint checks passed for all affected routes and recommendation screens.
- These frontend gates improve navigation consistency; backend authorization remains the authoritative security boundary.

### 13. Realtime reliability and initial bundle work

Findings and fixes:

- The notification bell imported Socket.IO into its initial module even though realtime activity starts only for an authenticated user. Socket.IO is now dynamically loaded when the notification connection starts.
- Failure to mark a notification as read could prevent its valid action from opening and leave a rejected promise. The failure is still reported, but navigation continues.
- Chat message loading now handles request failures. Message drafts are no longer cleared when the socket is disconnected; the user receives a reconnecting notice instead.
- The notification trigger now exposes its expanded state and controlled panel to assistive technology.

Verification:

- TypeScript and focused ESLint checks passed.

### 14. Destructive action consistency

Findings and fixes:

- Service deletion, hired-job removal, portfolio deletion, and feed-post deletion still executed from the first click while admin and comment deletion already required confirmation.
- These actions now use the same shared confirmation dialog and block dismissal/repeated submission while pending.
- Completed hired jobs can no longer be completed repeatedly, and hired-job removal now reports backend failures.
- Service-detail Edit and Upload controls had no behavior. They were removed until real workflows exist, leaving no control that falsely appears to succeed.

Verification:

- TypeScript and focused ESLint checks passed for every affected screen.

### 15. Public input and failure-state boundaries

Findings and fixes:

- Public job/profile route IDs were forwarded to backend URLs without format validation. One shared parser now accepts positive safe integers only; malformed values resolve locally as not found.
- Public profile failures rendered raw backend error content. The page now shows a generic retry/support message and a safe profile identifier.
- Admin statistics and resource queries, plus owned-service and hired-job lists, could show zero or empty data when requests failed. They now distinguish unavailable data from valid empty results and offer retry actions where useful.

Verification:

- Two route-parameter tests cover valid IDs and malformed, fractional, path-like, zero, negative, and unsafe-integer values.
- TypeScript and focused ESLint checks passed.

### 16. Remaining client-module ownership

Finding and fix:

- The settings, authentication, notification, and generic admin modules remained the final named maintainability items. Each still mixed orchestration with reusable presentation or static domain configuration.
- Settings navigation, overview/placeholder panels, and form controls now live in focused settings modules. The page decreased from 671 to 453 lines and retains the profile/resume query and mutation coordination.
- Notification list rendering and notification-type presentation metadata moved out of the realtime/query orchestrator. The bell decreased from 474 to 251 lines.
- Admin resource definitions and row renderers moved into a resource-model module. The table/dialog orchestrator decreased from 483 to 289 lines.
- Authentication layout/gating and the Google role-selection dialog moved out of the login/register workflow. The auth form module decreased from 469 to 293 lines.

Verification:

- Focused TypeScript and ESLint checks passed after each extraction.
- Public exports and application route imports remain unchanged.

### 17. Server request regression coverage

Finding and fix:

- The shared server request wrapper handled cookie forwarding, public requests, JSON serialization, backend errors, and network failures without direct tests.
- Three tests now cover authenticated JSON requests, cookie-free cacheable requests, structured backend errors, and network failures.

Verification:

- The focused server-request test file passed with three tests.

### 18. Navigation, action state, and failed-data feedback

Findings and fixes:

- Desktop account navigation and the mobile navigation drawer shared one open state. They now have independent state, accessible expanded/control attributes, correctly anchored account positioning, and close after navigation or logout.
- The admin header displayed a search field that did not search anything. It was replaced with an honest section description until a real search workflow exists.
- Candidate seniority prediction, hired-job completion, and hiring-post application state could make unrelated records appear busy. Pending feedback is now tied to the record being changed.
- Saved posts/jobs, chat rooms, and service category details could turn request failures into empty or unusable screens. They now distinguish failures from valid empty results and provide retry actions.

Verification:

- Focused ESLint and the full TypeScript check passed for the affected modules.
- A final search found no placeholder links, empty click handlers, debug statements, or unfinished TODO/FIXME markers in application source.

### 19. Privacy, consent, dependency, and chat-delivery follow-up

Findings and fixes:

- Public profile structured data exposed the member email address. Email was removed from public JSON-LD metadata.
- Employee profiles had no explicit control for recruiter discovery. A candidate-visibility preference is now part of the validated profile model and editable settings.
- New-account passwords accepted six characters. The frontend schema now requires at least ten characters, with regression coverage; the backend must enforce the same or stronger policy.
- Chat cleared a draft immediately after emitting a message even when delivery failed. Sends now wait for a Socket.IO acknowledgement, keep the draft after failures/timeouts, and prevent duplicate submissions while pending.
- PDF.js and vulnerable transitive dependency paths were updated or pinned through package overrides.

Verification:

- The dependency tree resolved successfully.
- ESLint and TypeScript passed.
- Vitest passed 27 files and 95 tests.
- The production build generated all 31 routes successfully.

## Commit records

- Owner and author: **Tai874vn only** (no co-author attribution).
- Architecture review: `6c86b37` — `refactor: harden frontend architecture and user flows`
- Security/reliability follow-up: `98ecc19` — `feat: add candidate visibility and reliable chat sending`
- Scope: frontend security, API reliability, role/navigation consistency, failure feedback, module ownership, regression coverage, and production runtime hardening.
- Evidence: this review log and the final validation results below.

## Final verification

- ESLint: passed with no warnings.
- TypeScript: passed.
- Vitest: 27 files and 95 tests passed.
- Shared-code coverage: 57.95% statements, 48.37% branches, 46.18% functions, and 58.13% lines.
- Next.js production build: passed; all 31 static/dynamic application routes were generated successfully.
- Repomix: the final post-fix snapshot packed 217 files and 165,108 tokens; no suspicious files were reported.
- Secret-pattern review: no embedded credentials or private keys were found.

## Remaining non-blocking work

- A live npm advisory audit was retried but remains blocked because it sends the production dependency list to npm's external advisory service. This environment requires separate explicit approval for that metadata export; otherwise run `npm audit --omit=dev` in trusted local or CI infrastructure.
- This pass did not run browser end-to-end tests against a live backend, Redis, Nginx, or Cloudflare deployment. Unit checks and the production build validate the frontend source only.
- Client-side file validation improves feedback but must remain duplicated by MIME/content/size validation in the backend.
- Settings remains the largest client orchestrator because profile and resume mutations coordinate the same session and query caches. Its presentation controls are separated; split the controller further only when real account, security, notification, or billing APIs are added.
