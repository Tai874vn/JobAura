import type { RecommendationLabel } from '@/shared/schemas'
import { Badge } from '@/shared/ui'

const labelText: Record<RecommendationLabel, string> = {
  high_match: 'High match',
  medium_match: 'Medium match',
  low_match: 'Low match',
}

const labelTone: Record<RecommendationLabel, 'primary' | 'accent' | 'neutral'> = {
  high_match: 'primary',
  medium_match: 'accent',
  low_match: 'neutral',
}

export function formatMatchScore(score: number) {
  return `${Math.round(score * 100)}%`
}

export function MatchBadge({ label, score }: { label: RecommendationLabel; score: number }) {
  return (
    <Badge tone={labelTone[label]}>
      {labelText[label]} - {formatMatchScore(score)}
    </Badge>
  )
}
