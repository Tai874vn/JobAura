import { ArrowUpRight, MapPin, Users } from "lucide-react";
import Link from "next/link";
import { ConnectionActions } from "@/features/connections/connect-button";
import { FeedAvatar } from "@/features/feed/feed-avatar";
import {
  formatMatchScore,
  MatchBadge,
} from "@/features/jobs/recommendation-ui";
import { cn } from "@/shared/lib/utils";
import type { HiringPost, RecommendedCandidate } from "@/shared/schemas";
import { Button, ButtonLink, Card, CardContent } from "@/shared/ui";

type CandidateResultsPanelProps = {
  candidates: RecommendedCandidate[];
  selectedHiringPost: HiringPost | null;
};

export function CandidateResultsPanel({
  candidates,
  selectedHiringPost,
}: CandidateResultsPanelProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">
              Ranked candidate matches
            </p>
            <h2 className="mt-1 font-display text-2xl font-bold">
              Recommended candidates
            </h2>
            <p className="mt-1 text-sm text-muted">
              {selectedHiringPost
                ? `For ${selectedHiringPost.title}`
                : "For the selected hiring post"}
            </p>
          </div>
        </div>
        <div className="grid gap-4">
          {candidates.map((candidate) => (
            <CandidateMatchCard key={candidate.id} candidate={candidate} />
          ))}
        </div>
      </CardContent>
    </Card>
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

  return (
    <div className="group/recommendation rounded-lg border border-border bg-white p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <FeedAvatar user={candidate} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/profile/${candidate.id}`}
                className="block truncate font-display text-xl font-bold hover:text-primary"
              >
                {candidate.name}
              </Link>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
                {candidate.headline || candidate.bio || "Candidate profile"}
              </p>
            </div>
            <MatchBadge
              label={recommendation.label}
              score={recommendation.finalScore}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {candidate.location || "Location not listed"}
            </span>
            <span>Rank #{recommendation.rank}</span>
            <span>Semantic {formatMatchScore(recommendation.aiScore)}</span>
          </div>
          {skills.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {skills.slice(0, 6).map((skill) => (
                <span
                  key={skill}
                  className="rounded bg-accent/30 px-2 py-1 text-xs font-bold text-foreground"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
          <ScoreBreakdown recommendation={recommendation} />
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

function SkillEvidencePanel({
  recommendation,
}: {
  recommendation: RecommendedCandidate["recommendation"];
}) {
  const matchedSkills = recommendation.matchedSkills ?? [];
  const missingSkills = recommendation.missingSkills ?? [];
  const hasEvidence = matchedSkills.length > 0 || missingSkills.length > 0;

  if (!hasEvidence) {
    return (
      <p className="mt-3 rounded-lg bg-surface-muted p-3 text-xs font-semibold leading-5 text-muted">
        No explicit skill requirements were detected from this hiring post.
        The rank is mostly based on semantic resume similarity.
      </p>
    );
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
      : "bg-[#fff3bf] text-[#6f4600]";

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="text-xs font-bold uppercase text-muted">{label}</p>
      {skills.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {skills.slice(0, 8).map((skill) => (
            <span
              key={skill}
              className={cn("rounded px-2 py-1 text-xs font-bold", toneClass)}
            >
              {skill}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs font-semibold text-muted">{emptyText}</p>
      )}
    </div>
  );
}

function ScoreBreakdown({
  recommendation,
}: {
  recommendation: RecommendedCandidate["recommendation"];
}) {
  const rows = [
    ["Skills", recommendation.skillScore],
    ["Seniority", recommendation.seniorityScore],
    ["Category", recommendation.categoryScore],
  ] as const;

  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-3">
      {rows.map(([label, value]) => (
        <div key={label} className="rounded-lg bg-surface-muted p-3">
          <div className="flex items-center justify-between gap-2 text-xs font-semibold">
            <span className="text-muted">{label}</span>
            <span>{formatMatchScore(value)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.round(value * 100)}%` }}
            />
          </div>
        </div>
      ))}
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
    <Card>
      <CardContent className="flex flex-col items-center justify-center p-10 text-center">
        <Users className="h-8 w-8 text-primary" />
        <h2 className="mt-3 font-display text-2xl font-bold">
          No candidate matches yet
        </h2>
        <p className="mt-2 max-w-md text-sm leading-6 text-muted">
          Try a larger candidate pool, improve the hiring post, or run
          matching again after more candidate profiles are added.
        </p>
        <Button
          className="mt-4"
          type="button"
          variant="secondary"
          onClick={onRun}
          disabled={disabled}
        >
          Run again
        </Button>
      </CardContent>
    </Card>
  );
}
