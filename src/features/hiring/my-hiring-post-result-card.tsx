"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ExternalLink, ListOrdered, Lock, LockOpen, Pencil, Users } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";
import { pipelineApi, pipelineKeys, statusLabel } from "@/features/hiring-pipeline/api";
import { cn } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { Avatar, Button, ButtonLink } from "@/shared/ui";
import { hiringPostAiState } from "./hiring-post-ai";
import { formatDate, formatHiringPostSalary, formatPostedAgo, formatYearsRequired } from "./hiring-post-card";
import { pipelineSummary } from "./hiring-pipeline-summary";
import { stepChips } from "./my-hiring-posts-view";
import { usePostOccupation } from "./use-post-occupation";

/** How many of the latest applicants the open details show. */
const RECENT_SHOWN = 3;

const applicantsWord = (count: number) => (count === 1 ? "1 applicant" : `${count} applicants`);

/**
 * One of the owner's posts on My hiring posts, drawn like a hiring posts result card: the title and status, the
 * facts (level, location, salary), the pipeline line, and the actions Applicants, Edit, Close or Reopen, and Open
 * post. "Applicants by step" opens the details: a chip per step that opens the applicants page on that tab, the
 * latest applicants, Match candidates and the AI level action.
 */
export function MyHiringPostResultCard({ post, onEdit, onToggleStatus, statusPending, onPredict, predictPending, predictDisabled, defaultExpanded = false }: {
  post: HiringPost;
  onEdit: () => void;
  /** Close asks first (the page shows the confirm); Reopen happens at once. */
  onToggleStatus: () => void;
  statusPending: boolean;
  onPredict: () => void;
  predictPending: boolean;
  predictDisabled: boolean;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const detailsId = useId();
  const occupation = usePostOccupation(post);
  const salary = formatHiringPostSalary(post);
  const summary = pipelineSummary(post);
  const ai = hiringPostAiState(post);
  const open = post.status === "OPEN";
  const applicants = `/my-hiring-posts/${post.id}/applicants`;
  const facts = [
    post.predictedSeniority ? `AI level: ${post.predictedSeniority}` : null,
    post.yearsRequired != null ? formatYearsRequired(post.yearsRequired) : null,
    post.location || "Location flexible",
    salary || null,
  ].filter(Boolean) as string[];
  const posted = formatPostedAgo(post.createdAt);

  return (
    <article aria-labelledby={`my-post-${post.id}-title`}
      className="grid gap-3 rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#c5d8c8] hover:shadow-float sm:p-6">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", open ? "bg-[#e9f3ec] text-primary" : "bg-surface-muted text-muted")}>
            {open ? "Open" : "Closed"}
          </span>
          {occupation ? (
            <span className={cn("min-w-0 truncate rounded-md px-2 py-1 text-xs font-semibold", occupation.legacy ? "border border-border text-muted" : "bg-[#123f32] text-white")}>
              {occupation.legacy ? `Previously: ${occupation.label} · choose the occupation` : occupation.label}
            </span>
          ) : null}
          {post.specialty && occupation && !occupation.legacy ? (
            <span className="rounded-md border border-[#c5d8c8] px-2 py-1 text-xs font-semibold text-[#123f32]">{post.specialty}</span>
          ) : null}
        </div>
        <h2 id={`my-post-${post.id}-title`} className="mt-2 break-words text-xl font-semibold leading-tight tracking-[-0.01em] sm:text-2xl">
          <Link href={`/hiring-posts/${post.id}`} className="transition-colors duration-150 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            {post.title}
          </Link>
        </h2>
      </div>

      <p className="flex flex-wrap items-center gap-x-[18px] gap-y-1 text-[13px] text-muted">
        {facts.map((fact, index) => (
          <span key={fact} className="inline-flex items-center gap-[18px]">
            {index ? <span aria-hidden="true" className="text-[#a0aba3]">·</span> : null}
            {fact}
          </span>
        ))}
        {post.employmentType ? <span className="rounded-[5px] bg-[#e9f3ec] px-[9px] py-1 text-xs font-medium text-primary">{post.employmentType}</span> : null}
      </p>

      {summary ? <p className="text-sm font-medium text-foreground">{summary}</p> : null}
      {ai.label ? <p role="status" className="text-sm text-muted">{ai.label}</p> : ai.message ? <p className="text-sm text-muted">{ai.message}</p> : null}

      <div className="flex flex-col gap-3 border-t border-border pt-3 xl:flex-row xl:items-center">
        <p className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span className="font-medium text-foreground">{applicantsWord(post.applicationCount)}</span>
          {posted ? <span>Posted {posted === "Today" || posted === "Yesterday" ? posted.toLowerCase() : posted}</span> : null}
          {post.closesAt ? <span>Closes {formatDate(post.closesAt)}</span> : null}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <ButtonLink href={applicants} className="h-10 bg-[#e9f3ec] px-3.5 font-semibold text-primary hover:bg-[#d9ecdf]">
            <Users className="h-4 w-4" aria-hidden="true" />Applicants <span className="tabular-nums">({post.applicationCount})</span>
          </ButtonLink>
          <Button type="button" variant="secondary" className="px-3.5 font-semibold" onClick={onEdit}>
            <Pencil className="h-4 w-4" aria-hidden="true" />Edit
          </Button>
          <Button type="button" variant="secondary" className="px-3.5 font-semibold" loading={statusPending} onClick={onToggleStatus}>
            {open ? <><Lock className="h-4 w-4" aria-hidden="true" />Close</> : <><LockOpen className="h-4 w-4" aria-hidden="true" />Reopen</>}
          </Button>
          <ButtonLink href={`/hiring-posts/${post.id}`} variant="ghost" className="px-3.5 font-semibold">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />Open post
          </ButtonLink>
        </div>
      </div>

      <div>
        <button type="button" aria-expanded={expanded} aria-controls={detailsId} onClick={() => setExpanded((value) => !value)}
          className="inline-flex items-center gap-1.5 rounded text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          Applicants by step
          <ChevronDown aria-hidden="true" className={cn("h-4 w-4 transition-transform duration-200", expanded && "rotate-180")} />
        </button>
        {expanded ? (
          <PostDetails id={detailsId} post={post} onPredict={onPredict} predictPending={predictPending} predictDisabled={predictDisabled} aiAction={ai.action} />
        ) : null}
      </div>
    </article>
  );
}

function PostDetails({ id, post, onPredict, predictPending, predictDisabled, aiAction }: {
  id: string;
  post: HiringPost;
  onPredict: () => void;
  predictPending: boolean;
  predictDisabled: boolean;
  aiAction?: string | null;
}) {
  // The latest applicants and every step's count, Not selected too; loaded only once the details are open.
  const listParams = { page: 1, pageSize: RECENT_SHOWN };
  const recent = useQuery({
    queryKey: pipelineKeys.list(post.id, listParams),
    queryFn: () => pipelineApi.list(post.id, listParams),
    staleTime: 30_000,
  });
  const chips = stepChips(post.id, recent.data?.counts ?? post.pipeline);

  return (
    <div id={id} className="motion-popover mt-3 grid gap-4 rounded-lg bg-surface-muted p-4">
      <ul className="flex flex-wrap gap-2" aria-label="Applicants by step">
        {chips.map((chip) => (
          <li key={chip.status}>
            <Link href={chip.href}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-[13px] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                chip.count ? "border-[#c5d8c8] bg-surface text-foreground hover:border-primary hover:text-primary" : "border-border bg-transparent text-muted hover:text-foreground")}>
              {chip.label}<span className="font-mono text-[11px] tabular-nums">{chip.count}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="grid gap-2">
        <p className="text-[13px] font-semibold">Latest applicants</p>
        {recent.isPending ? (
          <div className="grid gap-2" aria-hidden="true">
            {Array.from({ length: 2 }).map((_, index) => <div key={index} className="h-9 animate-pulse rounded-md bg-surface" />)}
          </div>
        ) : recent.isError ? (
          <p className="text-sm text-muted">The latest applicants could not be loaded.</p>
        ) : recent.data.data.length ? (
          <ul className="grid gap-1">
            {recent.data.data.map((application) => (
              <li key={application.id}>
                <Link href={`/my-hiring-posts/${post.id}/applicants?application=${application.id}`}
                  className="flex min-w-0 items-center gap-2.5 rounded-md px-1.5 py-1 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                  <Avatar name={application.applicant?.name ?? "Applicant"} src={application.applicant?.avatar} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{application.applicant?.name ?? "Applicant"}</span>
                  <span className="shrink-0 text-xs text-muted">{statusLabel(application.status, "recruiter", application.statusReason)}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">No applicants yet.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <ButtonLink href={`/recommendations/candidates?hiringPostId=${post.id}`} variant="secondary" size="sm" className="font-semibold">
          <ListOrdered className="h-4 w-4" aria-hidden="true" />Match candidates
        </ButtonLink>
        {aiAction ? (
          <Button type="button" variant="secondary" size="sm" className="font-semibold" loading={predictPending} disabled={predictDisabled} onClick={onPredict}>
            {aiAction}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
