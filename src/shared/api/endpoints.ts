/**
 * Re-exports all shared backend API client modules from one central file.
 *
 * Calls: adminApi; authApi; chatApi; hiringPostsApi; jobsApi; postsApi; recommendationsApi; usersApi
 * Used by:
 *   - 38 files, for example features/admin/components/admin-dashboard.tsx, features/admin/components/admin-resource-model.tsx, features/admin/components/admin-resource-page.tsx
 */

export { adminApi } from './endpoints/admin'
export { authApi } from './endpoints/auth'
export { chatApi } from './endpoints/chat'
export { commentsApi } from './endpoints/comments'
export { connectionsApi } from './endpoints/connections'
export { hiringPostsApi } from './endpoints/hiring-posts'
export { jobsApi } from './endpoints/jobs'
export { subcategoriesApi, categoriesApi } from './endpoints/job-taxonomy'
export { notificationsApi } from './endpoints/notifications'
export { postsApi } from './endpoints/posts'
export { recommendationsApi, type RecommendationParams } from './endpoints/recommendations'
export { savedItemsApi } from './endpoints/saved-items'
export { skillsApi, usersApi } from './endpoints/users'
