import { ArrowUpRight, CheckCircle2, MapPin, Users, XCircle } from "lucide-react";
import Link from "next/link";
import { ConnectionActions } from "@/features/connections/connect-button";
import { FeedAvatar } from "@/features/feed/feed-avatar";
import { cn } from "@/shared/lib/utils";
import type { HiringPost, RecommendedCandidate } from "@/shared/schemas";
import { Button, ButtonLink, Card, CardContent, EmptyState } from "@/shared/ui";

type CandidateResultsPanelProps = {
  candidates: RecommendedCandidate[];
  selectedHiringPost: HiringPost | null;
};

export function CandidateResultsPanel({
  candidates,
  selectedHiringPost,
}: CandidateResultsPanelProps) {
  const matchedCandidates = candidates.filter((candidate) =>
    isClassifierMatch(candidate.recommendation),
  );
  const noMatchCandidates = candidates.filter(
    (candidate) => !isClassifierMatch(candidate.recommendation),
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">
              Ranked candidate matches
            </p>
            <h2 className="mt-1 font-display text-2xl font-medium">
              Recommended candidates
            </h2>
            <p className="mt-1 text-sm text-muted">
              {selectedHiringPost
                ? `For ${selectedHiringPost.title}`
                : "For the selected hiring post"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-medium">
            <span className="rounded bg-primary/10 px-2.5 py-1 text-primary">
              {matchedCandidates.length} match
            </span>
            <span className="rounded bg-surface-muted px-2.5 py-1 text-muted">
              {noMatchCandidates.length} no match
            </span>
          </div>
        </div>
        <div className="grid gap-4">
          <CandidateResultSection
            title="Matches"
            candidates={matchedCandidates}
            emptyText="No candidates met the classifier threshold yet."
          />
          <CandidateResultSection
            title="No match"
            candidates={noMatchCandidates}
            emptyText="No rejected candidates in this result set."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function CandidateResultSection({
  title,
  candidates,
  emptyText,
}: {
  title: string;
  candidates: RecommendedCandidate[];
  emptyText: string;
}) {
  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-border pb-2">
        <h3 className="text-xs font-medium text-muted">{title}</h3>
        <span className="text-xs font-medium text-muted">
          {candidates.length}
        </span>
      </div>
      {candidates.length ? (
        candidates.map((candidate) => (
          <CandidateMatchCard key={candidate.id} candidate={candidate} />
        ))
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-surface-muted p-4 text-sm font-medium text-muted">
          {emptyText}
        </div>
      )}
    </section>
  );
}

function CandidateMatchCard({
  candidate,
}: {
  candidate: RecommendedCandidate;
}) {
  const skills = (candidate.profileSkills ?? candidate.skills ?? [])
    .map((skill) => skill.name?.trim())
    .filter((skill): skill is string => Boolean(skill));
  const recommendation = candidate.recommendation;
  const isMatch = isClassifierMatch(recommendation);

  return (
    <div
      className={cn(
        "group/recommendation rounded-lg border bg-surface p-4",
        isMatch ? "border-primary/35" : "border-border",
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FeedAvatar user={candidate} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/profile/${candidate.id}`}
                className="block truncate font-display text-xl font-medium hover:text-primary"
              >
                {candidate.name}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                {candidate.headline || candidate.bio || "Candidate profile"}
              </p>
            </div>
            <ClassifierDecisionBadge recommendation={recommendation} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-medium text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {candidate.location || "Location not listed"}
            </span>
            <span>Rank #{recommendation.rank}</span>
          </div>
          {skills.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-accent/30 px-2 py-1 text-xs font-medium text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
          <SkillEvidencePanel recommendation={recommendation} />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
          <ButtonLink href={`/profile/${candidate.id}`} className="w-full" variant="secondary">
            View profile
            <ArrowUpRight className="h-4 w-4" />
          </ButtonLink>
          <ConnectionActions
            className="lg:grid"
            userId={candidate.id}
            userName={candidate.name}
          />
        </div>
      </div>
    </div>
  );
}

function ClassifierDecisionBadge({
  recommendation,
}: {
  recommendation: RecommendedCandidate["recommendation"];
}) {
  const isMatch = isClassifierMatch(recommendation);
  const Icon = isMatch ? CheckCircle2 : XCircle;

  return (
    <div
      className={cn(
        "inline-flex shrink-0 items-center gap-2 rounded px-3 py-2 text-xs font-medium",
        isMatch
          ? "bg-primary/10 text-primary"
          : "bg-surface-muted text-muted",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{isMatch ? "Match" : "No match"}</span>
    </div>
  );
}

function isClassifierMatch(
  recommendation: RecommendedCandidate["recommendation"],
) {
  if (typeof recommendation.isMatch === "boolean") {
    return recommendation.isMatch;
  }
  if (recommendation.matchLabel) {
    return recommendation.matchLabel === "match";
  }
  return recommendation.label === "high_match";
}

function SkillEvidencePanel({
  recommendation,
}: {
  recommendation: RecommendedCandidate["recommendation"];
}) {
  const matchedSkills = recommendation.matchedSkills ?? [];
  const missingSkills = recommendation.missingSkills ?? [];
  const hasEvidence = matchedSkills.length > 0 || missingSkills.length > 0;

  if (!hasEvidence) {
    return null;
  }

  return (
    <div className="mt-4 grid gap-3 lg:grid-cols-2">
      <SkillEvidenceList
        label="Matched requirements"
        skills={matchedSkills}
        emptyText="No explicit matched requirements."
        tone="matched"
      />
      <SkillEvidenceList
        label="Missing requirements"
        skills={missingSkills}
        emptyText="No missing requirements detected."
        tone="missing"
      />
    </div>
  );
}

function SkillEvidenceList({
  label,
  skills,
  emptyText,
  tone,
}: {
  label: string;
  skills: string[];
  emptyText: string;
  tone: "matched" | "missing";
}) {
  const toneClass =
    tone === "matched"
      ? "bg-primary/10 text-primary"
      : "bg-rating/15 text-rating-ink";

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-medium text-muted">{label}</p>
      {skills.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {skills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className={cn("rounded px-2 py-1 text-xs font-medium", toneClass)}
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs font-medium text-muted">{emptyText}</p>
      )}
    </div>
  );
}

export function EmptyResultsCard({
  onRun,
  disabled,
}: {
  onRun: () => void;
  disabled: boolean;
}) {
  return (
    <EmptyState
      icon={<Users />}
      title="No candidate matches yet"
      description="Try a larger candidate pool, improve the hiring post, or run matching again after more candidate profiles are added."
      action={
        <Button type="button" variant="secondary" onClick={onRun} disabled={disabled}>
          Run again
        </Button>
      }
    />
  );
}
