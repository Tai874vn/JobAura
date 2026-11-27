"use client";

/**
 * Pieces of the hiring post detail page: HiringPostBody (the role text sections) and ManageApplicantsLink (the
 * owner's link to the applicants). The page /hiring-posts/[id] imports only these two. HiringPostPanel, the side
 * panel in this file, is not used by any page at the moment.
 *
 * Calls: ApplyPanel; AppliedAction; HiringPostAction; HiringPostAvatar; HiringPostBadges; HiringPostFacts; HiringPostSkills; formatPostedAgo
 * Used by:
 *   - features/hiring/components/detail/hiring-post-detail-view.tsx
 */

import { ExternalLink, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { HiringPost } from "@/shared/schemas";
import { ButtonLink } from "@/shared/ui";
import { AppliedAction } from "./applied-action";
import { ApplyPanel } from "./apply-panel";
import {
  formatPostedAgo,
  HiringPostAction,
  HiringPostAvatar,
  HiringPostBadges,
  HiringPostFacts,
  HiringPostSkills,
  type HiringPostViewer,
} from "../browse/hiring-post-card";

/** The role's text: description, required skills, and other requirements. Shared by the panel and the post page. */
export function HiringPostBody({ post, headingAs = "h3" }: { post: HiringPost; headingAs?: "h2" | "h3" }) {
  const Heading = headingAs;
  return (
    <>
      <section className="mt-6" aria-labelledby={`about-${post.id}`}>
        <Heading id={`about-${post.id}`} className="font-display text-lg font-medium">About the role</Heading>
        <p className="mt-2 whitespace-pre-line text-sm leading-7">{post.description}</p>
      </section>
      {post.skills.length ? (
        <section className="mt-6" aria-labelledby={`skills-${post.id}`}>
          <Heading id={`skills-${post.id}`} className="font-display text-lg font-medium">Required skills</Heading>
          <HiringPostSkills skills={post.skills} />
        </section>
      ) : null}
      {post.requirements ? (
        <section className="mt-6" aria-labelledby={`requirements-${post.id}`}>
          <Heading id={`requirements-${post.id}`} className="font-display text-lg font-medium">Other requirements</Heading>
          <p className="mt-2 whitespace-pre-line text-sm leading-7">{post.requirements}</p>
        </section>
      ) : null}
    </>
  );
}

/** Owner's link to the applicants page; the number is every application the post has. */
export function ManageApplicantsLink({ post }: { post: HiringPost }) {
  return (
    <ButtonLink href={`/my-hiring-posts/${post.id}/applicants`}>
      <Users className="h-4 w-4" />Manage applicants ({post.applicationCount})
    </ButtonLink>
  );
}

/** The selected post beside the list (wide screens): everything needed to decide and apply without leaving. */
export function HiringPostPanel({
  post,
  viewer,
  viewerId,
  onApplied,
}: {
  post: HiringPost;
  viewer: HiringPostViewer;
  viewerId: number | null;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const isOwner = viewerId !== null && viewerId === post.recruiterId;
  const employer = post.companyName || post.recruiter?.name;

  return (
    <article className="rounded-lg border border-border bg-surface p-6" aria-labelledby={`panel-title-${post.id}`}>
      <div className="flex items-center gap-3">
        <HiringPostAvatar post={post} size="lg" />
        <div className="min-w-0 text-sm">
          {employer ? <p className="truncate font-medium">{employer}</p> : null}
          <p className="truncate text-muted">
            {post.recruiter ? (
              <>Posted by <Link href={`/profile/${post.recruiter.id}`} className="font-medium text-foreground hover:text-primary hover:underline">{post.recruiter.name}</Link></>
            ) : "Posted"}
            {post.createdAt ? ` · ${formatPostedAgo(post.createdAt).toLowerCase()}` : null}
          </p>
        </div>
      </div>

      <h2 id={`panel-title-${post.id}`} className="mt-5 font-display text-2xl font-medium leading-tight">{post.title}</h2>
      <div className="mt-3"><HiringPostBadges post={post} /></div>
      <HiringPostFacts post={post} showEmployer={false} />

      <div className="mt-5 flex flex-wrap gap-2">
        {isOwner ? (
          <>
            <ManageApplicantsLink post={post} />
            <ButtonLink href={`/my-hiring-posts?edit=${post.id}`} variant="secondary"><Pencil className="h-4 w-4" />Edit in My hiring posts</ButtonLink>
          </>
        ) : post.status === "CLOSED" ? (
          <div className="grid gap-3">
            <p className="text-sm font-medium">This role is no longer taking applications.</p>
            {viewer === "candidate" && post.viewerHasApplied ? <AppliedAction application={post.viewerApplication} /> : null}
          </div>
        ) : (
          <div className="w-44"><HiringPostAction post={post} viewer={viewer} active={applying} onToggleApply={() => setApplying((value) => !value)} /></div>
        )}
        <ButtonLink href={`/hiring-posts/${post.id}`} variant="secondary"><ExternalLink className="h-4 w-4" />Open full page</ButtonLink>
      </div>
      {applying && viewer === "candidate" && !post.viewerHasApplied ? (
        <ApplyPanel postId={post.id} onApplied={() => { setApplying(false); onApplied(); }} onCancel={() => setApplying(false)} />
      ) : null}

      <HiringPostBody post={post} />
    </article>
  );
}
