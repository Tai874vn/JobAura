import { apiClient } from '@/shared/api/client'

/** A search hit: an ESCO occupation, and the alternative label or specialty that matched when not the title. */
export type OccupationHit = { code: string; isco: string; title: string; matchedLabel?: string }

/** One ESCO occupation with its specialties (O*NET job titles linked through the ESCO–O*NET crosswalk). */
export type Occupation = {
  code: string
  isco: string
  title: string
  specialties: string[]
  related: Array<{ code: string; overlap: number }>
}

/** The ESCO occupation catalogue the backend serves. Both routes are public; the backend answers without a wrapper. */
export const occupationsApi = {
  // Backend: GET /api/occupations → NestjsBE/src/modules/occupations/services/occupations.service.ts search()
  search: async (q: string, limit = 10) =>
    (await apiClient.get<OccupationHit[]>('/api/occupations', { params: { q, limit } })).data,
  // Backend: GET /api/occupations/:code → NestjsBE/src/modules/occupations/services/occupations.service.ts occupation()
  get: async (code: string) =>
    (await apiClient.get<Occupation>(`/api/occupations/${encodeURIComponent(code)}`)).data,
}

export const occupationKeys = {
  search: (q: string) => ['occupations', 'search', q] as const,
  one: (code: string) => ['occupations', code] as const,
}

/** The catalogue only changes with a backend release, so one occupation is fetched once per session. */
export const occupationQuery = (code: string) => ({
  queryKey: occupationKeys.one(code),
  queryFn: () => occupationsApi.get(code),
  enabled: Boolean(code),
  staleTime: Infinity,
  gcTime: 30 * 60_000,
  retry: false,
})

/** ESCO titles are lower case ("web developer"); a label starts with a capital ("Web developer"). */
export function occupationLabel(title: string) {
  return title ? title[0].toUpperCase() + title.slice(1) : title
}
