"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi } from "@/shared/api/endpoints/hiring-posts";
import type { HiringPost } from "@/shared/schemas";
import { ButtonLink, Card, CardContent } from "@/shared/ui";
import { AppliedAction } from "./applied-action";
import { ApplyPanel } from "./apply-panel";
import { formatPostedAgo, HiringPostAction, HiringPostAvatar, HiringPostBadges, HiringPostFacts } from "./hiring-post-card";
import { HiringPostBody, ManageApplicantsLink } from "./hiring-post-panel";
import { hiringPostViewer } from "./hiring-post-viewer";

/** A hiring post on its own page, so it can be shared and read in full. */
export function HiringPostDetailView({ initialPost }: { initialPost: HiringPost }) {
  const { user } = useSession();
  const viewer = hiringPostViewer(user?.role);
  const [applying, setApplying] = useState(false);
  // The server page is the same for everyone; this adds the signed-in candidate's "applied" state.
  const query = useQuery({
    queryKey: ["hiring-posts", "detail", initialPost.id, user?.id ?? 0],
    queryFn: () => hiringPostsApi.one(initialPost.id),
    enabled: Boolean(user),
    staleTime: 30_000,
  });
  const post = query.data?.content ?? initialPost;
  const isOwner = Boolean(user && user.id === post.recruiterId);

  return (
    <div className="container-page py-8">
      <Link href="/hiring-posts" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All hiring posts
      </Link>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <HiringPostBadges post={post} />
            <h1 className="mt-3 font-display text-3xl font-medium leading-tight sm:text-4xl">{post.title}</h1>
            <HiringPostFacts post={post} />

            <HiringPostBody post={post} headingAs="h2" />
          </CardContent>
        </Card>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Card>
            <CardContent className="grid gap-3 p-5">
              {isOwner ? (
                <>
                  <p className="text-sm text-muted">This is your post.</p>
                  <ManageApplicantsLink post={post} />
                  <ButtonLink href={`/my-hiring-posts?edit=${post.id}`} variant="secondary"><Pencil className="h-4 w-4" />Edit in My hiring posts</ButtonLink>
                </>
              ) : post.status === "CLOSED" ? (
                <>
                  <p className="text-sm font-medium">This role is no longer taking applications.</p>
                  {viewer === "candidate" && post.viewerHasApplied ? <AppliedAction application={post.viewerApplication} /> : null}
                </>
              ) : viewer === "recruiter" ? (
                <p className="text-sm text-muted">Candidates apply to this role from this page.</p>
              ) : (
                <>
                  <HiringPostAction post={post} viewer={viewer} active={applying} onToggleApply={() => setApplying((value) => !value)} />
                  {viewer === "visitor" ? <p className="text-xs leading-5 text-muted">New here? <Link href="/auth/register" className="font-medium text-primary hover:underline">Create a candidate account</Link> to apply.</p> : null}
                </>
              )}
            </CardContent>
          </Card>
          {post.recruiter ? (
            <Card>
              <CardContent className="flex items-start gap-3 p-5 text-sm">
                <HiringPostAvatar post={post} />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted">Posted by{post.createdAt ? ` · ${formatPostedAgo(post.createdAt).toLowerCase()}` : ""}</p>
                  <Link href={`/profile/${post.recruiter.id}`} className="mt-1 block font-medium hover:text-primary hover:underline">{post.recruiter.name}</Link>
                  {post.recruiter.headline ? <p className="mt-1 text-muted">{post.recruiter.headline}</p> : null}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
      {applying && viewer === "candidate" && !post.viewerHasApplied ? (
        <div className="mt-6 lg:max-w-[calc(100%-324px)]">
          <ApplyPanel postId={post.id} onApplied={() => { setApplying(false); void query.refetch(); }} onCancel={() => setApplying(false)} />
        </div>
      ) : null}
    </div>
  );
}
