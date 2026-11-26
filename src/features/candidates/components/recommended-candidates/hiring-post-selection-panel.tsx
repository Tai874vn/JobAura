"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CheckCircle2, ListOrdered } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { HiringPostFormDialog } from "@/features/hiring/components/form/hiring-post-form-dialog";
import { Badge, Button, Card, CardContent, Select } from "@/shared/ui";
import {
  hiringPostPageParams,
  poolSizeOptions,
  topKOptions,
} from "../../utils/recommended-candidates/constants";

type HiringPostSelectionPanelProps = {
  hiringPosts: HiringPost[];
  loading: boolean;
  selectedHiringPostId: number | null;
  topK: number;
  poolSize: number;
  onSelectHiringPost: (hiringPostId: number) => void;
  onTopKChange: (value: number) => void;
  onPoolSizeChange: (value: number) => void;
};

export function HiringPostSelectionPanel({
  hiringPosts,
  loading,
  selectedHiringPostId,
  topK,
  poolSize,
  onSelectHiringPost,
  onTopKChange,
  onPoolSizeChange,
}: HiringPostSelectionPanelProps) {
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const predictSeniority = useMutation({
    mutationFn: hiringPostsApi.predictSeniority,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.myHiringPosts(hiringPostPageParams),
      });
      toast.success("Hiring post seniority predicted");
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Could not predict hiring post seniority"),
      );
    },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-primary">
              <BriefcaseBusiness className="h-4 w-4" />
              Hiring context
            </div>
            <h2 className="mt-1 font-display text-2xl font-medium">
              Choose the hiring post to match
            </h2>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowCreateForm(true)}
          >
            <BriefcaseBusiness className="h-4 w-4" />
            New hiring post
          </Button>
        </div>

        <HiringPostFormDialog
          open={showCreateForm}
          onClose={() => setShowCreateForm(false)}
          onSaved={(post) => {
            onSelectHiringPost(post.id);
            void queryClient.invalidateQueries({ queryKey: queryKeys.myHiringPosts(hiringPostPageParams) });
          }}
        />

        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-lg bg-surface-muted"
              />
            ))}
          </div>
        ) : hiringPosts.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {hiringPosts.slice(0, 6).map((post) => (
              <div
                key={post.id}
                className={cn(
                  "rounded-lg border p-4 text-left transition hover:border-primary",
                  selectedHiringPostId === post.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-surface",
                )}
              >
                <button
                  type="button"
                  className="w-full rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright"
                  aria-pressed={selectedHiringPostId === post.id}
                  onClick={() => onSelectHiringPost(post.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-display text-lg font-medium leading-snug">
                      {post.title}
                    </h3>
                    {selectedHiringPostId === post.id ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted">
                    <Badge tone={post.status === "OPEN" ? "accent" : "neutral"}>
                      {post.status === "OPEN" ? "Open" : "Closed"}
                    </Badge>
                    <span>{post.employmentType || "Role"}</span>
                    <span>{post.location || "Location flexible"}</span>
                    <span>{post.applicationCount} applicants</span>
                  </div>
                </button>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <SeniorityBadge post={post} />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={predictSeniority.isPending}
                    loading={predictSeniority.isPending && predictSeniority.variables === post.id}
                    onClick={() => predictSeniority.mutate(post.id)}
                  >
                    <ListOrdered className="h-4 w-4" />
                    Predict level
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-5">
            <h3 className="font-display text-xl font-medium">
              Create a hiring post first
            </h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Recruiter candidate recommendations need a hiring post with
              responsibilities and requirements.
            </p>
            <Button
              className="mt-4"
              type="button"
              onClick={() => setShowCreateForm(true)}
            >
              Create hiring post
            </Button>
          </div>
        )}

        <div className="mt-5 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <OptionSelect
            label="Results"
            value={topK}
            options={topKOptions}
            onChange={onTopKChange}
            suffix="candidates"
          />
          <OptionSelect
            label="Candidate pool"
            value={poolSize}
            options={poolSizeOptions}
            onChange={onPoolSizeChange}
            suffix="profiles"
          />
        </div>
      </CardContent>
    </Card>
  );
}

function SeniorityBadge({ post }: { post: HiringPost }) {
  if (!post.predictedSeniority) {
    return (
      <span className="text-xs font-medium text-muted">
        AI level not predicted
      </span>
    );
  }

  // No percentage: the model applies fixed rules, so its "confidence" is near 100% and reads as certainty.
  return (
    <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
      {post.predictedSeniority}
    </span>
  );
}

function OptionSelect({
  label,
  value,
  options,
  suffix,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-1">
      <span className="text-xs font-medium text-muted">{label}</span>
      <Select
        className="text-sm font-medium"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option} {suffix}
          </option>
        ))}
      </Select>
    </label>
  );
}
