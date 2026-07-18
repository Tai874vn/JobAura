"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  CheckCircle2,
  Clock3,
  MapPin,
  Search,
  Send,
  Users,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FeedAvatar } from "@/features/feed/feed-avatar";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { cn, getErrorMessage } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { useAuthStore } from "@/shared/stores/auth-store";
import { Badge, Button, ButtonLink, Card, CardContent, Input, Spinner, Textarea } from "@/shared/ui";

const pageSize = 10;

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

  const params = useMemo(
    () => ({ page, pageSize, keyword: submittedKeyword.trim() || undefined }),
    [submittedKeyword, page],
  );

  const query = useQuery({
    queryKey: queryKeys.hiringPosts(params),
    queryFn: () => hiringPostsApi.open(params),
    staleTime: 60_000,
  });

  const posts = query.data?.content?.data ?? [];
  const totalPages = query.data?.content?.totalPages ?? 1;
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

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmittedKeyword(draftKeyword.trim());
    setPage(1);
  }

  function applyToPost(postId: number) {
    applyMutation.mutate({ postId, message: coverLetter });
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
            Apply to recruiter roles
          </h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">
            These are recruiter hiring posts. Explore Services stays for
            employee service listings; this page is for roles you can apply to.
          </p>
        </div>
        <ButtonLink href="/recommendations/jobs" variant="secondary">AI job recommendations</ButtonLink>
      </div>

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
