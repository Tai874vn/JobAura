/**
 * Maps a job category name to a matching icon for category chips and landing page links.
 * Falls back to a generic shapes icon when no keyword matches.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/jobs/components/browse/job-category-nav.tsx
 *   - features/jobs/components/home/home-page.tsx
 */

import {
  AudioLines,
  BarChart3,
  BriefcaseBusiness,
  Clapperboard,
  Code2,
  Megaphone,
  Palette,
  PenLine,
  Shapes,
} from 'lucide-react'

export function categoryIcon(name: string) {
  const value = name.toLowerCase()
  if (/(design|graphic|illustrat|thi.?t k|ui\b|ux\b)/.test(value)) return Palette
  if (/(develop|program|cod(e|ing)|software|web|app|tech|l?p tr|phat tri)/.test(value)) return Code2
  if (/(market|seo|advertis|social|promot|ti?p th)/.test(value)) return Megaphone
  if (/(business|finance|account|legal|consult|kinh doanh)/.test(value)) return BriefcaseBusiness
  if (/(video|film|animat|motion)/.test(value)) return Clapperboard
  if (/(writ|translat|content|copy)/.test(value)) return PenLine
  if (/(music|audio|voice|sound)/.test(value)) return AudioLines
  if (/(data|analytics|research|admin)/.test(value)) return BarChart3
  return Shapes
}
