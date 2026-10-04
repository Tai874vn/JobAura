import {
  BrainCircuit,
  Database,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type { ReactNode } from "react";
import type { HiringPost, RecommendationQuota } from "@/shared/schemas";
import { Button, Card, CardContent } from "@/shared/ui";

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
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-3xl font-bold">
            {hasResults
              ? "Update candidate matches when ready"
              : "Run candidate matching when ready"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            {hasResults
              ? "Your current matches stay visible until you choose to refresh them. A fresh run uses the selected hiring post and the latest candidate profiles."
              : "Matching starts only after you proceed. If the AI service is unavailable, the page stays here and shows the error as a pop-up."}
          </p>
          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
            <ProcessItem
              icon={<ShieldCheck className="h-4 w-4" />}
              label="Owner checked"
              text="Backend verifies this is your hiring post."
            />
            <ProcessItem
              icon={<Zap className="h-4 w-4" />}
              label="One AI token"
              text="A successful non-empty run spends one daily use."
            />
            <ProcessItem
              icon={<Database className="h-4 w-4" />}
              label="Keeps your matches"
              text="Your latest matches can load again without spending another AI use."
            />
          </div>
        </div>
        <div className="rounded-lg border border-border bg-surface-muted p-4">
          <p className="text-xs font-bold uppercase text-primary">
            Selected hiring post
          </p>
          <h3 className="mt-2 line-clamp-3 font-display text-xl font-bold">
            {selectedHiringPost?.title ?? "No hiring post selected"}
          </h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            {loadingQuota
              ? "Checking daily AI quota..."
              : `${quota?.remaining ?? 0} of ${quota?.limit ?? 0} AI tokens left today.`}
          </p>
          <Button
            className="mt-5 w-full"
            size="lg"
            type="button"
            onClick={onRun}
            loading={isRunning}
            disabled={loadingQuota || !canRun}
          >
            <Sparkles className="h-4 w-4" />
            {canRun
              ? hasResults
                ? "Run again"
                : "Proceed to match"
              : "No AI uses left"}
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
      <div className="flex items-center gap-2 font-bold text-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted">{text}</p>
    </div>
  );
}
