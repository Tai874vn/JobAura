/**
 * PAGE CONFIG: one file per page with every value that can be changed without touching the page code
 * (page sizes, search fields, filter groups and their values, sort choices, limits, hint texts).
 *
 *   URL                                      file
 *   /hiring-posts                            hiring-posts.ts
 *   /my-hiring-posts  (+ hiring post form)   my-hiring-posts.ts
 *   /my-hiring-posts/[id]/applicants         applicants.ts
 *   /my-applications                         my-applications.ts
 *   /jobs                                    jobs.ts
 *   /jobs/new, /jobs/[id]/edit               job-form.ts
 *   /candidates                              candidates.ts
 *   /recommendations/candidates              ai-matching.ts
 *   /contracts                               contracts.ts
 *   /wallet                                  wallet.ts
 *   /settings                                settings.ts
 *   /                                        feed.ts
 *   /connections                             connections.ts
 *   /profile/[id]                            profile.ts
 *   /welcome                                 welcome.ts
 *   /my-posts                                my-posts.ts
 *   /auth/register, /auth/reset-password     auth.ts
 *
 * Search in VS Code (Ctrl+Shift+F): the page name followed by "page config", e.g. "hiring-posts page config".
 * Each file says which edits are safe (remove / reorder / rename / lower a number) and which also need the
 * backend (a new value the server does not know yet answers 400).
 */
export { hiringPostsConfig } from './hiring-posts'
export { myHiringPostsConfig } from './my-hiring-posts'
export { applicantsConfig } from './applicants'
export { myApplicationsConfig } from './my-applications'
export { jobsConfig } from './jobs'
export { jobFormConfig } from './job-form'
export { candidatesConfig } from './candidates'
export { aiMatchingConfig } from './ai-matching'
export { contractsConfig } from './contracts'
export { walletConfig } from './wallet'
export { settingsConfig } from './settings'
export { feedConfig } from './feed'
export { connectionsConfig } from './connections'
export { profileConfig } from './profile'
export { welcomeConfig } from './welcome'
export { myPostsConfig } from './my-posts'
export { authConfig } from './auth'
