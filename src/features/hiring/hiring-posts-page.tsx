"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { queryKeys } from "@/shared/api/query-keys";
import { getErrorMessage } from "@/shared/lib/utils";
import type { CreateHiringPost } from "@/shared/schemas";
import { createHiringPostSchema } from "@/shared/schemas";
import { Button, ButtonLink, Card, CardContent, Input } from "@/shared/ui";
import {
  CreateHiringPostModal,
  emptyHiringPostDraft,
} from "./create-hiring-post-modal";
import { HiringPostCard } from "./hiring-post-card";
import { RecruiterHiringPostPanel } from "./recruiter-hiring-post-panel";

const pageSize = 10;
const myPostPreviewParams = { page: 1, pageSize: 5 };
function pageWindow(currentPage: number, totalPages: number) {
  const pages = new Set([1, totalPages, currentPage - 1, currentPage, currentPage + 1]);
  return Array.from(pages)
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b);
}

export function HiringPostsPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { user } = useSession();
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
              applying={applyMutation.isPending && applyMutation.variables?.postId === post.id}
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
