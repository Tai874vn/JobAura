"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, CheckCircle2, Sparkles } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { CreateHiringPost, HiringPost } from "@/shared/schemas";
import { createHiringPostSchema } from "@/shared/schemas";
import { Badge, Button, Card, CardContent, Input, Spinner, Textarea } from "@/shared/ui";
import {
  emptyHiringPostDraft,
  hiringPostPageParams,
  poolSizeOptions,
  topKOptions,
} from "./constants";

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
  const [draft, setDraft] = useState<CreateHiringPost>(emptyHiringPostDraft);

  const createMutation = useMutation({
    mutationFn: hiringPostsApi.create,
    onSuccess: (response) => {
      const post = response.content;
      if (post) {
        onSelectHiringPost(post.id);
      }
      setDraft(emptyHiringPostDraft);
      setShowCreateForm(false);
      queryClient.invalidateQueries({
        queryKey: queryKeys.myHiringPosts(hiringPostPageParams),
      });
      toast.success("Hiring post created");
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create hiring post"));
    },
  });
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

  function updateDraft<K extends keyof CreateHiringPost>(
    key: K,
    value: CreateHiringPost[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function submitHiringPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createHiringPostSchema.safeParse({
      ...draft,
      title: draft.title.trim(),
      description: draft.description.trim(),
      requirements: draft.requirements?.trim() || undefined,
      location: draft.location?.trim() || undefined,
      employmentType: draft.employmentType?.trim() || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the hiring post details");
      return;
    }

    createMutation.mutate(parsed.data);
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase text-primary">
              <BriefcaseBusiness className="h-4 w-4" />
              Hiring context
            </div>
            <h2 className="mt-1 font-display text-2xl font-bold">
              Choose the hiring post to match
            </h2>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setShowCreateForm((value) => !value)}
          >
            <BriefcaseBusiness className="h-4 w-4" />
            {showCreateForm ? "Close form" : "New hiring post"}
          </Button>
        </div>

        {showCreateForm ? (
          <form
            className="mt-4 grid gap-3 rounded-lg border border-border bg-surface-muted p-4"
            onSubmit={submitHiringPost}
          >
            <div className="grid gap-3 md:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-muted">
                  Role title
                </span>
                <Input
                  value={draft.title}
                  maxLength={160}
                  onChange={(event) => updateDraft("title", event.target.value)}
                  placeholder="Senior React Developer"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-muted">
                  Employment type
                </span>
                <Input
                  value={draft.employmentType ?? ""}
                  maxLength={80}
                  onChange={(event) =>
                    updateDraft("employmentType", event.target.value)
                  }
                  placeholder="Full-time, contract, remote"
                />
              </label>
            </div>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">
                Description
              </span>
              <Textarea
                className="min-h-28"
                value={draft.description}
                maxLength={5000}
                onChange={(event) =>
                  updateDraft("description", event.target.value)
                }
                placeholder="Describe responsibilities, project context, and who you want to hire."
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">
                Requirements
              </span>
              <Textarea
                className="min-h-24"
                value={draft.requirements ?? ""}
                maxLength={3000}
                onChange={(event) =>
                  updateDraft("requirements", event.target.value)
                }
                placeholder="React, TypeScript, API integration, 3+ years experience..."
              />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-muted">
                  Location
                </span>
                <Input
                  value={draft.location ?? ""}
                  maxLength={120}
                  onChange={(event) =>
                    updateDraft("location", event.target.value)
                  }
                  placeholder="Phnom Penh or Remote"
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-muted">
                  Salary min
                </span>
                <Input
                  type="number"
                  min={0}
                  value={draft.salaryMin ?? ""}
                  onChange={(event) =>
                    updateDraft(
                      "salaryMin",
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                />
              </label>
              <label className="grid gap-1">
                <span className="text-xs font-bold uppercase text-muted">
                  Salary max
                </span>
                <Input
                  type="number"
                  min={0}
                  value={draft.salaryMax ?? ""}
                  onChange={(event) =>
                    updateDraft(
                      "salaryMax",
                      event.target.value ? Number(event.target.value) : undefined,
                    )
                  }
                />
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <BriefcaseBusiness className="h-4 w-4" />
                )}
                Create hiring post
              </Button>
            </div>
          </form>
        ) : null}

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
                  className="w-full text-left"
                  onClick={() => onSelectHiringPost(post.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug">
                      {post.title}
                    </h3>
                    {selectedHiringPostId === post.id ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" />
                    ) : null}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
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
                    onClick={() => predictSeniority.mutate(post.id)}
                  >
                    {predictSeniority.isPending && predictSeniority.variables === post.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Predict level
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-5">
            <h3 className="font-display text-xl font-bold">
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
      <span className="text-xs font-semibold text-muted">
        AI level not predicted
      </span>
    );
  }

  const confidence =
    post.predictedSeniorityConfidence != null
      ? ` ${Math.round(post.predictedSeniorityConfidence * 100)}%`
      : "";

  return (
    <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
      {post.predictedSeniority}
      {confidence}
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
      <span className="text-xs font-bold uppercase text-muted">{label}</span>
      <select
        className="h-10 rounded-lg border border-border bg-surface px-3 text-sm font-semibold"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option} {suffix}
          </option>
        ))}
      </select>
    </label>
  );
}
