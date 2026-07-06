import type { RecommendationLabel } from '@/shared/schemas'
import { Badge } from '@/shared/ui'

const labelText: Record<RecommendationLabel, string> = {
  high_match: 'High match',
  medium_match: 'Medium match',
  low_match: 'Low match',
}

const labelClass: Record<RecommendationLabel, string> = {
  high_match: 'border border-primary/20 bg-primary/10 text-primary',
  medium_match: 'border border-[#b7791f]/35 bg-[#fff3bf] text-[#6f4600]',
  low_match: 'border border-border bg-surface-muted text-foreground',
}

export function formatMatchScore(score: number) {
  return `${Math.round(score * 100)}%`
}

export function MatchBadge({ label, score }: { label: RecommendationLabel; score: number }) {
  return (
    <Badge tone="neutral" className={labelClass[label]}>
      {labelText[label]} - {formatMatchScore(score)}
    </Badge>
  )
}
