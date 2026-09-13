import type { RecommendationLabel } from "@/shared/schemas";
import { Badge } from "@/shared/ui";
import { cn } from "@/shared/lib/utils";

const labelText: Record<RecommendationLabel, string> = {
  high_match: "High match",
  medium_match: "Medium match",
  low_match: "Low match",
};

const labelClass: Record<RecommendationLabel, string> = {
  high_match: "border border-primary/20 bg-surface text-primary",
  medium_match: "border border-rating/40 bg-surface text-[#5c4300]",
  low_match: "border border-border bg-surface text-foreground",
};

export function formatMatchScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

export function MatchBadge({
  label,
  score,
  className,
}: {
  label: RecommendationLabel;
  score: number;
  className?: string;
}) {
  return (
    <Badge
      tone="neutral"
      className={cn(
        "transform-gpu shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(0,0,0,0.14)] group-hover/recommendation:-translate-y-0.5 group-hover/recommendation:shadow-[0_10px_24px_rgba(0,0,0,0.14)] group-focus-within/recommendation:-translate-y-0.5 group-focus-within/recommendation:shadow-[0_10px_24px_rgba(0,0,0,0.14)]",
        labelClass[label],
        className,
      )}
    >
      {labelText[label]} - {formatMatchScore(score)}
    </Badge>
  );
}
