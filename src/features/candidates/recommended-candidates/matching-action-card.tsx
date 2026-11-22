import {
  BrainCircuit,
  Database,
  ShieldCheck,
  ListOrdered,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type { HiringPost, RecommendationQuota } from "@/shared/schemas";
import { Button, Card, CardContent } from "@/shared/ui";

/** Say why matching can't run: no post chosen is not the same as no AI uses left. */
export function matchingButtonLabel({ canRun, hasResults, hasHiringPost, quota, loadingQuota }: {
  canRun: boolean
  hasResults: boolean
  hasHiringPost: boolean
  quota?: RecommendationQuota
  loadingQuota: boolean
}) {
  if (canRun) return hasResults ? "Run again" : "Proceed to match"
  if (!hasHiringPost) return "Choose a hiring post first"
  if (loadingQuota) return "Checking AI uses..."
  return (quota?.remaining ?? 0) > 0 ? "Proceed to match" : "No AI uses left"
}

type StartCandidateMatchingCardProps = {
  hasResults: boolean;
  selectedHiringPost: HiringPost | null;
  quota?: RecommendationQuota;
  loadingQuota: boolean;
  canRun: boolean;
  isRunning: boolean;
  onRun: () => void;
};

export function StartCandidateMatchingCard({
  hasResults,
  selectedHiringPost,
  quota,
  loadingQuota,
  canRun,
  isRunning,
  onRun,
}: StartCandidateMatchingCardProps) {
  return (
    <Card>
      <CardContent className="grid gap-6 p-6 lg:grid-cols-[1fr_280px]">
        <div>
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-surface-muted text-muted">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-medium">
            {hasResults
              ? "Update candidate matches when ready"
              : "Run candidate matching when ready"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {hasResults
              ? "Your current matches stay visible until you choose to refresh them. A fresh run uses the selected hiring post and the latest candidate profiles."
              : "Nothing runs until you start it. You'll see the best-fitting candidates for the selected post, with the skills they match and miss."}
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <ProcessItem
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Visible candidates"
              text="Only people who opened their profile to recruiters."
            />
            <ProcessItem
              icon={<Zap className="h-4 w-4" />}
              label="One AI run"
              text="Uses one daily run when it finds candidates."
            />
            <ProcessItem
              icon={<Database className="h-4 w-4" />}
              label="Keeps your matches"
              text="Your latest matches load again without using another run."
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-medium text-primary">
            Selected hiring post
          </p>
          <h3 className="mt-2 line-clamp-3 font-display text-xl font-medium">
            {selectedHiringPost?.title ?? "No hiring post selected"}
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            {loadingQuota
              ? "Checking your AI runs..."
              : `${quota?.remaining ?? 0} of ${quota?.limit ?? 0} AI runs left today.`}
          </p>
          <Button
            className="mt-5 w-full"
            size="lg"
            type="button"
            onClick={onRun}
            loading={isRunning}
            disabled={loadingQuota || !canRun}
          >
            <ListOrdered className="h-4 w-4" />
            {matchingButtonLabel({ canRun, hasResults, hasHiringPost: Boolean(selectedHiringPost), quota, loadingQuota })}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProcessItem({
  icon,
  label,
  text,
}: {
  icon: ReactNode;
  label: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2 font-medium text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}
