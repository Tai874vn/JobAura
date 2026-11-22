import {
  BriefcaseBusiness,
  Clock3,
  ShieldCheck,
  ListOrdered,
} from "lucide-react";
import type { ReactNode } from "react";
import type { RecommendationQuota } from "@/shared/schemas";
import { Card, CardContent } from "@/shared/ui";
import { formatReset } from "./utils";

export function RecruiterQuotaCard({
  quota,
  loading,
}: {
  quota?: RecommendationQuota;
  loading: boolean;
}) {
  const remaining = quota?.remaining ?? 0;
  const limit = quota?.limit ?? 0;
  const used = quota?.used ?? 0;
  const percent = limit ? Math.round((remaining / limit) * 100) : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-primary">
              Today
            </p>
            <h2 className="mt-1 font-display text-xl font-medium">
              AI runs left
            </h2>
          </div>
          <ListOrdered className="h-5 w-5 text-primary" />
        </div>
        {loading ? (
          <div className="mt-4 h-24 animate-pulse rounded bg-surface-muted" />
        ) : (
          <>
            <div className="mt-4 flex items-end justify-between gap-3">
              <p className="font-display text-4xl font-medium">{remaining}</p>
              <p className="pb-1 text-sm font-medium text-muted">
                left of {limit}
              </p>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${percent}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Used {used}. A run that finds candidates uses one; a run
              that finds nobody is free.{" "}
              {quota?.resetAt
                ? `Resets ${formatReset(quota.resetAt)}.`
                : "Resets daily."}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function MatchingPolicyCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-medium text-primary">
          How matching works
        </p>
        <h2 className="mt-1 font-display text-xl font-medium">
          Better posts, better matches
        </h2>
        <div className="mt-4 grid gap-3 text-sm">
          <PolicyRow
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Who is ranked"
            text="Candidates who chose to be visible to recruiters, ranked by their resume, skills, field, and years."
          />
          <PolicyRow
            icon={<BriefcaseBusiness className="h-4 w-4" />}
            label="What it reads from your post"
            text="The field, required years, and skills you set. Fill them in for the best ranking."
          />
          <PolicyRow
            icon={<Clock3 className="h-4 w-4" />}
            label="Saved results"
            text="Your last matches for each post stay here, so reopening them doesn't use a run."
          />
        </div>
      </CardContent>
    </Card>
  );
}

function PolicyRow({
  icon,
  label,
  text,
}: {
  icon: ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="flex gap-3 rounded-lg bg-surface-muted p-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <span>
        <span className="block font-medium">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{text}</span>
      </span>
    </div>
  );
}
