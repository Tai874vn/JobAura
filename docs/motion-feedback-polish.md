# Motion and feedback polish

Date: 2026-10-04. Owner: Tai874vn only.

## Purpose and approach

Make actions easier to understand without redesigning pages or changing API contracts. Extend the existing shared `Button` loading state and CSS motion utilities instead of adding an animation library or moving feature logic into a central controller.

## Coverage

- Navigation and overlays: short entry transitions for account menus, hiring/admin dialogs, the profile editor, and chat. Account controls and menu links have clearer keyboard focus.
- Forms and asynchronous actions: consistent busy feedback for settings/resume/profile saves, image uploads, service purchases/reviews, hiring applications, candidate seniority prediction, AI matching, saved-list pagination, and chat sends. Busy controls retain their accessible names and avoid changing width; uploads stay visible while pending.
- Social actions: like/save controls expose selected and busy states. Connection requests, acceptance, rejection, cancellation, and removal show success feedback. Relationship checks show loading and retry controls instead of vanishing. Notification failures offer retry and mark-all uses shared pending feedback.
- Accessibility and performance: reuse existing focus, press-feedback, and reduced-motion styles. Motion is local and enter-only; no full-page transitions, artificial waits, animation dependency, or changes to authentication, socket protocols, authorization, or persistence.

## Verification

- TypeScript: passed.
- Vitest: 39 files, 115 tests passed. New regression coverage checks busy button names/disabled states, selected feed actions, and connection loading/error recovery.
- ESLint: zero errors; one existing React Hook Form/React Compiler compatibility warning in `job-form.tsx`.
- Production build: passed; all 31 pages generated. The first attempt could not fetch Google Fonts within the sandbox; the network-enabled retry succeeded.
- Local production browser smoke checks: welcome at 1366px/375px; visible mobile Sign in and opening navigation menu; login at 375px; registration at 375px/1366px. Forms render without the authentication gate hanging, and checked pages have no horizontal overflow. Computed menu animation is `popover-in` at 140ms. Keyboard navigation exposes visible focus.
- Reduced-motion rules reviewed in the existing shared stylesheet; an actual reduced-motion browser preference was not emulated.
- `git diff --check`: passed.

The local backend was unavailable and produced expected API errors during smoke checks; the remote hero image also could not load in the local sandbox. Authenticated API mutations and admin workflows still need a signed-in end-to-end pass against a running backend. Static rendering tests cover presentation states, not delivery of real requests. No DNS or deployment configuration changes are included.
