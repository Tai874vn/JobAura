"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import type { HiringPost } from "@/shared/schemas";
import { cn } from "@/shared/lib/utils";
import { formatHiringPostSalary, formatPostedAgo, formatYearsRequired, HiringPostAvatar, salaryPeriodLabel } from "./hiring-post-card";
import { usePostOccupation } from "../../hooks/use-post-occupation";

/**
 * One post in the list. The whole row can be hovered and clicked to select it (on wide screens the post opens in
 * the panel beside the list; on phones it opens its own page). The avatar is its own link to the recruiter's
 * profile, and the title is a real link, so keyboard users and "open in new tab" still work.
 */
export function HiringPostListItem({
  post,
  selected,
  onSelect,
}: {
  post: HiringPost;
  selected: boolean;
  onSelect: (post: HiringPost) => void;
}) {
  const occupation = usePostOccupation(post);
  const salary = formatHiringPostSalary(post);
  const employer = post.companyName || post.recruiter?.name;
  const href = `/hiring-posts/${post.id}`;
  const facts = [post.predictedSeniority, post.yearsRequired != null ? formatYearsRequired(post.yearsRequired) : null].filter(Boolean) as string[];

  return (
    <article
      onClick={(event) => {
        // A click on the avatar (or any other link inside) follows that link instead.
        if ((event.target as HTMLElement).closest("a")) return;
        onSelect(post);
      }}
      className={cn(
        "group relative flex cursor-pointer gap-3 rounded-xl border bg-surface p-4 transition-colors sm:gap-4 sm:p-5",
        // The selected look only on wide screens, where the selected post is open beside the list.
        "border-border hover:border-foreground/25 hover:bg-surface-muted/50",
        selected && "lg:border-primary lg:bg-primary/[0.04] lg:hover:border-primary lg:hover:bg-primary/[0.04]",
      )}
    >
      <HiringPostAvatar post={post} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0">
            <h2 className="font-display text-lg font-medium leading-snug">
              <Link
                href={href}
                aria-current={selected ? "true" : undefined}
                onClick={(event) => {
                  // On wide screens the title selects the post like the rest of the row; a new-tab click still opens it.
                  if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
                  if (window.matchMedia("(min-width: 1024px)").matches) {
                    event.preventDefault();
                    onSelect(post);
                  }
                }}
                className={cn("focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright", "group-hover:text-primary", selected && "lg:text-primary")}
              >
                {post.title}
              </Link>
            </h2>
            <p className="mt-0.5 truncate text-sm text-muted">
              {[employer, post.location || "Location flexible"].filter(Boolean).join(" · ")}
            </p>
          </div>
          {salary ? (
            <p className="shrink-0 text-sm font-medium tabular-nums text-primary sm:text-right">
              {salary}
              <span className="ml-1.5 text-xs font-normal text-muted sm:ml-0 sm:block">{salaryPeriodLabel(post)}</span>
            </p>
          ) : null}
        </div>
        {occupation || facts.length ? (
          <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-xs text-muted">
            {facts.map((fact, index) => (
              <span key={fact} className="inline-flex items-center gap-2">
                {index ? <span aria-hidden="true" className="text-border">·</span> : null}
                {fact}
              </span>
            ))}
            {post.employmentType ? <span className="rounded-md bg-primary/10 px-2 py-0.5 font-medium text-primary">{post.employmentType}</span> : null}
            {occupation && !occupation.legacy ? <span className="rounded-md bg-surface-muted px-2 py-0.5 font-medium text-foreground">{occupation.label}</span> : null}
          </p>
        ) : null}
        <p className="mt-3 flex flex-wrap items-center gap-x-3 border-t border-border pt-3 text-xs text-muted">
          <span>{formatPostedAgo(post.createdAt)}</span>
          <span>{post.applicationCount === 1 ? "1 applicant" : `${post.applicationCount} applicants`}</span>
          {post.viewerHasApplied ? (
            <span className="inline-flex items-center gap-1 font-medium text-primary">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />Applied
            </span>
          ) : null}
        </p>
      </div>
    </article>
  );
}
