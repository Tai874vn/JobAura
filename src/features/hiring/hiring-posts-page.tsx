"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  MapPin,
  Plus,
  Search,
  Send,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FeedAvatar } from "@/features/feed/feed-avatar";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { CreateHiringPost, HiringPost } from "@/shared/schemas";
import { createHiringPostSchema } from "@/shared/schemas";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge, Button, ButtonLink, Card, CardContent, Input, Spinner, Textarea } from "@/shared/ui";

const pageSize = 10;
const myPostPreviewParams = { page: 1, pageSize: 5 };
const emptyHiringPostDraft: CreateHiringPost = {
  title: "",
  description: "",
  requirements: "",
  location: "",
  employmentType: "",
  salaryMin: undefined,
  salaryMax: undefined,
};

function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function HiringPostsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);
  const [page, setPage] = useState(1);
  const initialKeyword = searchParams.get("keyword") ?? "";
  const [draftKeyword, setDraftKeyword] = useState(initialKeyword);
  const [submittedKeyword, setSubmittedKeyword] = useState(initialKeyword);
  const [activePostId, setActivePostId] = useState<number | null>(null);
  const [coverLetter, setCoverLetter] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateHiringPost>(emptyHiringPostDraft);

  const params = useMemo(
    () => ({ page, pageSize, keyword: submittedKeyword.trim() || undefined }),
    [submittedKeyword, page],
  );
  const canCreateHiringPost = user?.role === "employer" || user?.role === "admin";

  const query = useQuery({
    queryKey: queryKeys.hiringPosts(params),
    queryFn: () => hiringPostsApi.open(params),
    staleTime: 60_000,
  });
  const myPostsQuery = useQuery({
    queryKey: queryKeys.myHiringPosts(myPostPreviewParams),
    queryFn: () => hiringPostsApi.mine(myPostPreviewParams),
    enabled: canCreateHiringPost,
    staleTime: 60_000,
  });

  const posts = query.data?.content?.data ?? [];
  const totalPages = query.data?.content?.totalPages ?? 1;
  const myPosts = myPostsQuery.data?.content?.data ?? [];
  const canApply = user?.role === "user";

  const applyMutation = useMutation({
    mutationFn: ({ postId, message }: { postId: number; message: string }) =>
      hiringPostsApi.apply(postId, { coverLetter: message.trim() || undefined }),
    onSuccess: () => {
      toast.success("Application sent");
      setActivePostId(null);
      setCoverLetter("");
      queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not apply to this hiring post"));
    },
  });
  const createMutation = useMutation({
    mutationFn: hiringPostsApi.create,
    onSuccess: () => {
      toast.success("Hiring post created");
      setCreateDraft(emptyHiringPostDraft);
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, "Could not create hiring post"));
    },
  });
  const predictSeniority = useMutation({
    mutationFn: hiringPostsApi.predictSeniority,
    onSuccess: () => {
      toast.success("Hiring post seniority predicted");
      queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
    },
    onError: (error) => {
      toast.error(
        getErrorMessage(error, "Could not predict hiring post seniority"),
      );
    },
  });

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(draftKeyword.trim());
    setPage(1);
  }

  function applyToPost(postId: number) {
    applyMutation.mutate({ postId, message: coverLetter });
  }

  function updateCreateDraft<K extends keyof CreateHiringPost>(
    key: K,
    value: CreateHiringPost[K],
  ) {
    setCreateDraft((current) => ({ ...current, [key]: value }));
  }

  function submitCreatePost(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = createHiringPostSchema.safeParse({
      ...createDraft,
      title: createDraft.title.trim(),
      description: createDraft.description.trim(),
      requirements: createDraft.requirements?.trim() || undefined,
      location: createDraft.location?.trim() || undefined,
      employmentType: createDraft.employmentType?.trim() || undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the hiring post details");
      return;
    }

    createMutation.mutate(parsed.data);
  }

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-primary">
            <BriefcaseBusiness className="h-4 w-4" />
            Hiring posts
          </div>
          <h1 className="font-display text-4xl font-bold">
            {canCreateHiringPost ? "Manage recruiter roles" : "Apply to recruiter roles"}
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            {canCreateHiringPost
              ? "Create hiring posts, review your open roles, and send them to AI candidate matching."
              : "These are recruiter hiring posts. Explore Services stays for employee service listings; this page is for roles you can apply to."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreateHiringPost ? (
            <>
              <Button type="button" onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />
                New hiring post
              </Button>
              <ButtonLink href="/recommendations/candidates" variant="secondary">
                <Sparkles className="h-4 w-4" />
                AI candidate matching
              </ButtonLink>
            </>
          ) : (
            <ButtonLink href="/recommendations/jobs" variant="secondary">AI job recommendations</ButtonLink>
          )}
        </div>
      </div>

      {canCreateHiringPost ? (
        <RecruiterHiringPostPanel
          posts={myPosts}
          loading={myPostsQuery.isPending}
          onCreate={() => setCreateOpen(true)}
          onPredict={(postId) => predictSeniority.mutate(postId)}
          predictingId={predictSeniority.variables ?? null}
          predicting={predictSeniority.isPending}
        />
      ) : null}

      <Card className="mt-6">
        <CardContent className="p-4">
          <form
            onSubmit={submitSearch}
            className="flex flex-col gap-3 md:flex-row md:items-center"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-border bg-white px-3">
              <Search className="h-4 w-4 text-muted" />
              <Input
                className="border-0 px-0 shadow-none focus-visible:ring-0"
                value={draftKeyword}
                onChange={(event) => setDraftKeyword(event.target.value)}
                placeholder="Search role, skills, company, or location"
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-5 grid gap-4">
        {query.isPending ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index}>
              <CardContent className="h-48 animate-pulse bg-surface-muted" />
            </Card>
          ))
        ) : posts.length ? (
          posts.map((post) => (
            <HiringPostCard
              key={post.id}
              post={post}
              canApply={canApply}
              active={activePostId === post.id}
              coverLetter={coverLetter}
              applying={applyMutation.isPending}
              onToggleApply={() => {
                setActivePostId((current) => (current === post.id ? null : post.id));
                setCoverLetter("");
              }}
              onCoverLetterChange={setCoverLetter}
              onApply={() => applyToPost(post.id)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="flex min-h-48 flex-col items-center justify-center p-8 text-center">
              <BriefcaseBusiness className="h-8 w-8 text-primary" />
              <h2 className="mt-3 font-display text-xl font-bold">
                No hiring posts found
              </h2>
              <p className="mt-1 text-sm text-muted">
                Try a different keyword or check again when recruiters post new
                roles.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {totalPages > 1 ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {pageWindow(page, totalPages).map((nextPage, index, pages) => {
            return (
              <FragmentWithGap
                key={nextPage}
                showGap={index > 0 && nextPage - pages[index - 1] > 1}
              >
              <Button
                type="button"
                variant={nextPage === page ? "primary" : "secondary"}
                onClick={() => setPage(nextPage)}
              >
                {nextPage}
              </Button>
              </FragmentWithGap>
            );
          })}
        </div>
      ) : null}

      {canCreateHiringPost ? (
        <CreateHiringPostModal
          open={createOpen}
          draft={createDraft}
          saving={createMutation.isPending}
          onClose={() => setCreateOpen(false)}
          onChange={updateCreateDraft}
          onSubmit={submitCreatePost}
        />
      ) : null}
    </div>
  );
}

function RecruiterHiringPostPanel({
  posts,
  loading,
  onCreate,
  onPredict,
  predictingId,
  predicting,
}: {
  posts: HiringPost[];
  loading: boolean;
  onCreate: () => void;
  onPredict: (postId: number) => void;
  predictingId: number | null;
  predicting: boolean;
}) {
  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Your hiring posts</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Recruiter workspace</h2>
          </div>
          <Button type="button" variant="secondary" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Create post
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : posts.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug">{post.title}</h3>
                  <Badge tone={post.status === "OPEN" ? "accent" : "neutral"}>
                    {post.status === "OPEN" ? "Open" : "Closed"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                  <span>{post.employmentType || "Role"}</span>
                  <span>{post.location || "Flexible"}</span>
                  <span>{post.applicationCount} applicants</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <HiringPostSeniorityBadge post={post} />
                </div>
                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={predicting}
                    onClick={() => onPredict(post.id)}
                  >
                    {predicting && predictingId === post.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Predict level
                  </Button>
                  <ButtonLink href="/recommendations/candidates" className="w-full" variant="secondary" size="sm">
                    <Sparkles className="h-4 w-4" />
                    Match candidates
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-5">
            <h3 className="font-display text-xl font-bold">No hiring posts yet</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Create a recruiter post first, then use AI candidate matching against saved candidate resumes.
            </p>
            <Button className="mt-4" type="button" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Create hiring post
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HiringPostSeniorityBadge({ post }: { post: HiringPost }) {
  if (!post.predictedSeniority) {
    return (
      <span className="rounded bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
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
      AI level {post.predictedSeniority}
      {confidence}
    </span>
  );
}

function CreateHiringPostModal({
  open,
  draft,
  saving,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  draft: CreateHiringPost;
  saving: boolean;
  onClose: () => void;
  onChange: <K extends keyof CreateHiringPost>(key: K, value: CreateHiringPost[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="create-hiring-post-title">
      <div className="max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-white p-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Recruiter post</p>
            <h2 id="create-hiring-post-title" className="mt-1 font-display text-2xl font-bold">Create hiring post</h2>
          </div>
          <Button type="button" size="icon" variant="ghost" aria-label="Close create hiring post" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form className="grid gap-4 p-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Role title</span>
              <Input
                value={draft.title}
                maxLength={160}
                onChange={(event) => onChange("title", event.target.value)}
                placeholder="Frontend Developer"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Employment type</span>
              <Input
                value={draft.employmentType ?? ""}
                maxLength={80}
                onChange={(event) => onChange("employmentType", event.target.value)}
                placeholder="Full-time, contract, remote"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase text-muted">Description</span>
            <Textarea
              className="min-h-32"
              value={draft.description}
              maxLength={5000}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="Describe the role, team context, responsibilities, and expected outcomes."
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase text-muted">Requirements</span>
            <Textarea
              className="min-h-28"
              value={draft.requirements ?? ""}
              maxLength={3000}
              onChange={(event) => onChange("requirements", event.target.value)}
              placeholder="React, TypeScript, REST APIs, PostgreSQL, portfolio projects..."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Location</span>
              <Input
                value={draft.location ?? ""}
                maxLength={120}
                onChange={(event) => onChange("location", event.target.value)}
                placeholder="Ho Chi Minh or Remote"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Salary min</span>
              <Input
                type="number"
                min={0}
                value={draft.salaryMin ?? ""}
                onChange={(event) => onChange("salaryMin", event.target.value ? Number(event.target.value) : undefined)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Salary max</span>
              <Input
                type="number"
                min={0}
                value={draft.salaryMax ?? ""}
                onChange={(event) => onChange("salaryMax", event.target.value ? Number(event.target.value) : undefined)}
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              Create hiring post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function FragmentWithGap({
  children,
  showGap,
}: {
  children: ReactNode;
  showGap: boolean;
}) {
  return (
    <>
      {showGap ? <span className="px-1 text-sm font-semibold text-muted">...</span> : null}
      {children}
    </>
  );
}

function HiringPostCard({
  post,
  canApply,
  active,
  coverLetter,
  applying,
  onToggleApply,
  onCoverLetterChange,
  onApply,
}: {
  post: HiringPost;
  canApply: boolean;
  active: boolean;
  coverLetter: string;
  applying: boolean;
  onToggleApply: () => void;
  onCoverLetterChange: (value: string) => void;
  onApply: () => void;
}) {
  const salary = formatSalary(post);
  const disabled = post.viewerHasApplied || !canApply || applying;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            {post.recruiter ? (
              <FeedAvatar user={post.recruiter} size="lg" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                HR
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="accent">Open</Badge>
                {post.employmentType ? (
                  <Badge tone="neutral">{post.employmentType}</Badge>
                ) : null}
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight">
                {post.title}
              </h2>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-muted">
                <span className="inline-flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {post.recruiter?.name ?? "Recruiter"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {post.location || "Location flexible"}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {post.applicationCount} applicants
                </span>
                {salary ? <span>{salary}</span> : null}
              </div>
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">
                {post.description}
              </p>
              {post.requirements ? (
                <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm leading-6">
                  {post.requirements}
                </p>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 lg:w-44 lg:flex-col">
            <Button
              type="button"
              disabled={disabled}
              onClick={onToggleApply}
              className={cn(post.viewerHasApplied && "bg-primary/80")}
            >
              {post.viewerHasApplied ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {post.viewerHasApplied
                ? "Applied"
                : canApply
                  ? "Apply"
                  : "Employee only"}
            </Button>
            {post.recruiter ? (
              <ButtonLink href={`/profile/${post.recruiter.id}`} className="w-full" variant="secondary">
                Recruiter
              </ButtonLink>
            ) : null}
          </div>
        </div>

        {active && !post.viewerHasApplied ? (
          <div className="mt-4 rounded-lg border border-border bg-surface-muted p-4">
            <label className="grid gap-2">
              <span className="text-xs font-bold uppercase text-muted">
                Short message
              </span>
              <Textarea
                className="min-h-28 bg-white"
                value={coverLetter}
                onChange={(event) => onCoverLetterChange(event.target.value)}
                placeholder="Write a short note about why you are a good fit."
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onApply}
                disabled={applying}
              >
                {applying ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send application
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function formatSalary(post: HiringPost) {
  if (post.salaryMin == null && post.salaryMax == null) return "";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  if (post.salaryMin != null && post.salaryMax != null) {
    return `${formatter.format(post.salaryMin)} - ${formatter.format(post.salaryMax)}`;
  }
  if (post.salaryMin != null) return `From ${formatter.format(post.salaryMin)}`;
  return `Up to ${formatter.format(post.salaryMax ?? 0)}`;
}
