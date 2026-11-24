import type { MetadataRoute } from 'next'
import { normalizePaginatedHiringPostsResponse, normalizePaginatedJobsResponse } from '@/shared/api/normalizers'
import { serverRequest } from '@/shared/api/server'
import { siteOrigin } from '@/shared/lib/seo'
import { buildSitemap } from '@/shared/lib/seo-files'
import type { ApiResponse, HiringPost, Job, PaginatedContent } from '@/shared/schemas'

// Rebuild the sitemap at most once an hour (ISR), so new posts reach search engines without a deploy.
export const revalidate = 3600

// How many of the newest posts of each kind go in. Older ones are still found through the list pages.
const sitemapPageSize = 50

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Public, cookie-less reads only. If the backend is down (for example during `next build`), the sitemap still
  // lists the fixed public pages.
  const [jobsResponse, postsResponse] = await Promise.all([
    serverRequest<ApiResponse<PaginatedContent<Job>>>(`/api/jobs/paginated-search?page=1&pageSize=${sitemapPageSize}`, {
      includeCookies: false,
      next: { revalidate },
    }),
    serverRequest<ApiResponse<PaginatedContent<HiringPost>>>(`/api/hiring-posts?page=1&pageSize=${sitemapPageSize}`, {
      includeCookies: false,
      next: { revalidate },
    }),
  ])

  const jobs = jobsResponse.ok ? normalizePaginatedJobsResponse(jobsResponse.data).content?.data ?? [] : []
  const posts = postsResponse.ok ? normalizePaginatedHiringPostsResponse(postsResponse.data).content?.data ?? [] : []

  return buildSitemap(siteOrigin(), { jobs, posts })
}
