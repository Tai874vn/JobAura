import type { RecommendationLabel } from "@/shared/schemas";
import { cn } from "@/shared/lib/utils";

const labelText: Record<RecommendationLabel, string> = {
  high_match: "High match",
  medium_match: "Medium match",
  low_match: "Low match",
};

export function formatMatchScore(score: number) {
  return `${Math.round(score * 100)}%`;
}

/**
 * JobAura's signature mark: the match score as a mono figure with a thin bar under it.
 * Only a high match fills in brand green; the others stay in neutral steps so the best fit leads.
 */
export function MatchScore({
  score,
  label,
  showLabel = true,
  className,
}: {
  score: number;
  label?: RecommendationLabel;
  showLabel?: boolean;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, Math.round(score * 100)));
  const strong = label ? label === "high_match" : percent >= 80;
  return (
    <span className={cn("inline-flex items-center gap-2 text-xs", className)}>
      <span className="font-mono text-[13px] font-medium tabular-nums text-foreground">{percent}%</span>
      <span aria-hidden="true" className="h-1 w-12 overflow-hidden rounded-full bg-foreground/10">
        <span
          className={cn("block h-full rounded-full", strong ? "bg-primary" : "bg-foreground/35")}
          style={{ width: `${percent}%` }}
        />
      </span>
      {showLabel && label ? <span className="text-muted">{labelText[label]}</span> : null}
    </span>
  );
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
  return <MatchScore score={score} label={label} className={className} />;
}
