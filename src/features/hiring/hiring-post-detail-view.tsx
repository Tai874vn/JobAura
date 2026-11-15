"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi } from "@/shared/api/endpoints/hiring-posts";
import type { HiringPost } from "@/shared/schemas";
import { ButtonLink, Card, CardContent } from "@/shared/ui";
import { ApplyPanel } from "./apply-panel";
import { HiringPostAction, HiringPostBadges, HiringPostFacts, HiringPostSkills } from "./hiring-post-card";
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
      <Link href="/hiring-posts" className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-primary">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All hiring posts
      </Link>
      <div className="mt-4 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card>
          <CardContent className="p-6 sm:p-8">
            <HiringPostBadges post={post} />
            <h1 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl">{post.title}</h1>
            <HiringPostFacts post={post} />

            <section className="mt-8" aria-labelledby="about-role">
              <h2 id="about-role" className="font-display text-xl font-bold">About the role</h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-7">{post.description}</p>
            </section>
            {post.skills.length ? (
              <section className="mt-8" aria-labelledby="required-skills">
                <h2 id="required-skills" className="font-display text-xl font-bold">Required skills</h2>
                <HiringPostSkills skills={post.skills} />
              </section>
            ) : null}
            {post.requirements ? (
              <section className="mt-8" aria-labelledby="other-requirements">
                <h2 id="other-requirements" className="font-display text-xl font-bold">Other requirements</h2>
                <p className="mt-3 whitespace-pre-line text-sm leading-7">{post.requirements}</p>
              </section>
            ) : null}
          </CardContent>
        </Card>

        <aside className="grid gap-4 lg:sticky lg:top-24">
          <Card>
            <CardContent className="grid gap-3 p-5">
              {isOwner ? (
                <>
                  <p className="text-sm text-muted">This is your post.</p>
                  <ButtonLink href={`/my-hiring-posts?edit=${post.id}`}><Pencil className="h-4 w-4" />Edit in My hiring posts</ButtonLink>
                </>
              ) : post.status === "CLOSED" ? (
                <p className="text-sm font-semibold">This role is no longer taking applications.</p>
              ) : viewer === "recruiter" ? (
                <p className="text-sm text-muted">Candidates apply to this role from this page.</p>
              ) : (
                <>
                  <HiringPostAction post={post} viewer={viewer} active={applying} onToggleApply={() => setApplying((value) => !value)} />
                  {viewer === "visitor" ? <p className="text-xs leading-5 text-muted">New here? <Link href="/auth/register" className="font-semibold text-primary hover:underline">Create a candidate account</Link> to apply.</p> : null}
                </>
              )}
            </CardContent>
          </Card>
          {post.recruiter ? (
            <Card>
              <CardContent className="p-5 text-sm">
                <p className="text-xs font-bold uppercase text-muted">Posted by</p>
                <Link href={`/profile/${post.recruiter.id}`} className="mt-1 block font-semibold hover:text-primary hover:underline">{post.recruiter.name}</Link>
                {post.recruiter.headline ? <p className="mt-1 text-muted">{post.recruiter.headline}</p> : null}
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
