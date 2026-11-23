"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BriefcaseBusiness, Eye, Lock, LockOpen, Pencil, Plus, ListOrdered, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { hiringPostsApi } from "@/shared/api/endpoints/hiring-posts";
import { queryKeys } from "@/shared/api/query-keys";
import { getErrorMessage } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { Badge, Button, ButtonLink, Card, CardContent, EmptyState, PageHeader } from "@/shared/ui";
import { hiringPostAiState, isHiringPostAiPending } from "./hiring-post-ai";
import { formatDate, formatYearsRequired } from "./hiring-post-card";
import { usePostOccupation } from "./use-post-occupation";
import { ConfirmActionDialog } from "@/features/hiring-pipeline/confirm-action-dialog";
import { HiringPostFormDialog } from "./hiring-post-form-dialog";
import { activeApplicationCount, closePostQuestion, pipelineSummary } from "./hiring-pipeline-summary";

const params = { page: 1, pageSize: 50 };

/** The recruiter's workspace: their own posts, with status, applicants, the AI level, and the next actions. */
export function MyHiringPostsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  // The post the recruiter is about to close; closing tells everyone still in progress.
  const [closing, setClosing] = useState<HiringPost | null>(null);
  const query = useQuery({
    queryKey: queryKeys.myHiringPosts(params),
    queryFn: () => hiringPostsApi.mine(params),
    // While the backend's AI queue works on a post, check back until it finishes.
    refetchInterval: (current) =>
      current.state.data?.content?.data.some(isHiringPostAiPending) ? 3000 : false,
  });
  const posts = query.data?.content?.data ?? [];
  // ?edit=ID opens a post's form, so other pages can link straight to editing it.
  const editId = Number(searchParams.get("edit")) || null;
  const editing = editId ? posts.find((post) => post.id === editId) ?? null : null;
  const closeEdit = () => router.replace(pathname, { scroll: false });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: HiringPost["status"] }) => hiringPostsApi.update(id, { status }),
    onSuccess: (_, { status }) => {
      setClosing(null);
      toast.success(status === "CLOSED" ? "Post closed; candidates can no longer apply" : "Post reopened");
      void refresh();
    },
    onError: (error) => {
      // A closing dialog shows the server's sentence itself; a reopen has no dialog, so it is a toast.
      if (!closing) toast.error(getErrorMessage(error, "Could not change the post status"));
    },
  });
  const predict = useMutation({
    mutationFn: hiringPostsApi.predictSeniority,
    onSuccess: () => {
      toast.success("Working out the AI level");
      void refresh();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not queue this post for its AI level")),
  });

  const open = posts.filter((post) => post.status === "OPEN");
  const applicants = posts.reduce((sum, post) => sum + post.applicationCount, 0);

  return (
    <div className="container-page py-8">
      <PageHeader
        title="My hiring posts"
        description="Publish roles, keep them up to date, and match candidates to each one."
        actions={<Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New hiring post</Button>}
      />

      {posts.length ? (
        <dl className="mt-6 grid gap-3 sm:grid-cols-3">
          <Stat label="Open posts" value={open.length} />
          <Stat label="Closed posts" value={posts.length - open.length} />
          <Stat label="Applicants" value={applicants} />
        </dl>
      ) : null}

      <div className="mt-6 grid gap-4">
        {query.isPending ? (
          Array.from({ length: 2 }).map((_, index) => <Card key={index}><CardContent className="h-36 animate-pulse bg-surface-muted" /></Card>)
        ) : query.isError ? (
          <EmptyState icon={<BriefcaseBusiness />} title="Your posts could not be loaded" description="Check your connection and try again."
            action={<Button type="button" variant="secondary" onClick={() => void query.refetch()}>Try again</Button>} />
        ) : posts.length ? (
          posts.map((post) => {
            const summary = pipelineSummary(post);
            return (
            <Card key={post.id}>
              <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={post.status === "OPEN" ? "primary" : "neutral"}>{post.status === "OPEN" ? "Open" : "Closed"}</Badge>
                    <OccupationBadge post={post} />
                    <LevelBadge post={post} />
                  </div>
                  <h2 className="mt-2 font-display text-xl font-medium">
                    <Link href={`/hiring-posts/${post.id}`} className="hover:text-primary">{post.title}</Link>
                  </h2>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
                    <span className="inline-flex items-center gap-1 font-medium text-foreground"><Users className="h-4 w-4" aria-hidden="true" />{post.applicationCount === 1 ? "1 applicant" : `${post.applicationCount} applicants`}</span>
                    {post.yearsRequired != null ? <span>{formatYearsRequired(post.yearsRequired)}</span> : <span>Years required not set</span>}
                    <span>{post.location || "Location flexible"}</span>
                    {post.closesAt ? <span>Closes {formatDate(post.closesAt)}</span> : null}
                  </p>
                  {summary ? <p className="mt-2 text-sm font-medium text-foreground">{summary}</p> : null}
                  <AiLevelStatus post={post} />
                </div>
                <div className="flex flex-wrap gap-2 lg:w-72 lg:justify-end">
                  <ButtonLink href={`/my-hiring-posts/${post.id}/applicants`} size="sm" variant="secondary"><Users className="h-4 w-4" />Applicants</ButtonLink>
                  <ButtonLink href={`/recommendations/candidates?hiringPostId=${post.id}`} size="sm"><ListOrdered className="h-4 w-4" />Match candidates</ButtonLink>
                  <Button type="button" size="sm" variant="secondary" onClick={() => router.replace(`${pathname}?edit=${post.id}`, { scroll: false })}><Pencil className="h-4 w-4" />Edit</Button>
                  {hiringPostAiState(post).action ? (
                    <Button type="button" size="sm" variant="secondary" loading={predict.isPending && predict.variables === post.id} disabled={predict.isPending} onClick={() => predict.mutate(post.id)}>
                      {hiringPostAiState(post).action}
                    </Button>
                  ) : null}
                  <Button type="button" size="sm" variant="ghost" loading={setStatus.isPending && setStatus.variables?.id === post.id}
                    onClick={() => (post.status === "OPEN" ? (setStatus.reset(), setClosing(post)) : setStatus.mutate({ id: post.id, status: "OPEN" }))}>
                    {post.status === "OPEN" ? <><Lock className="h-4 w-4" />Close</> : <><LockOpen className="h-4 w-4" />Reopen</>}
                  </Button>
                  <ButtonLink href={`/hiring-posts/${post.id}`} size="sm" variant="ghost"><Eye className="h-4 w-4" />View</ButtonLink>
                </div>
              </CardContent>
            </Card>
          );})
        ) : (
          <EmptyState icon={<BriefcaseBusiness />} title="No hiring posts yet"
            description="Publish your first role. Candidates find it on Hiring posts, and AI matching ranks candidates for it."
            action={<Button type="button" onClick={() => setCreating(true)}><Plus className="h-4 w-4" />New hiring post</Button>} />
        )}
      </div>

      <ConfirmActionDialog
        open={Boolean(closing)}
        title="Close post"
        description={closing ? closePostQuestion(activeApplicationCount(closing.pipeline)) : ""}
        confirmLabel="Close post"
        tone="danger"
        pending={setStatus.isPending}
        error={setStatus.isError && closing ? getErrorMessage(setStatus.error, "Could not close the post") : null}
        onConfirm={() => closing && setStatus.mutate({ id: closing.id, status: "CLOSED" })}
        onCancel={() => { setClosing(null); setStatus.reset(); }}
      />
      <HiringPostFormDialog open={creating} onClose={() => setCreating(false)} />
      <HiringPostFormDialog open={Boolean(editing)} post={editing} onClose={closeEdit} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <dt className="text-xs font-medium text-muted">{label}</dt>
        <dd className="mt-1 font-display text-2xl font-medium">{value}</dd>
      </CardContent>
    </Card>
  );
}

function AiLevelStatus({ post }: { post: HiringPost }) {
  const state = hiringPostAiState(post);
  if (state.label) {
    return <p role="status" className="mt-2 text-sm text-muted">{state.label}</p>;
  }
  if (state.message) {
    return <p className="mt-2 text-sm text-muted">{state.message}</p>;
  }
  return null;
}

function LevelBadge({ post }: { post: HiringPost }) {
  // No percentage: the model applies fixed rules, so its "confidence" is near 100% and reads as certainty.
  return post.predictedSeniority
    ? <Badge tone="accent">AI level: {post.predictedSeniority}</Badge>
    : <Badge tone="neutral">AI level not set</Badge>;
}

/** The post's occupation; a post saved before occupations shows its old field and that it needs an occupation. */
function OccupationBadge({ post }: { post: HiringPost }) {
  const occupation = usePostOccupation(post);
  if (!occupation) return null;
  return occupation.legacy
    ? <Badge tone="neutral">Previously: {occupation.label} · choose the occupation</Badge>
    : <Badge tone="neutral">{occupation.label}{post.specialty ? ` · ${post.specialty}` : ""}</Badge>;
}
