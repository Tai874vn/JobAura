"use client";

import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { HiringPost } from "@/shared/schemas";
import { cn } from "@/shared/lib/utils";
import { ApplyPanel } from "./apply-panel";
import { formatDate, formatHiringPostSalary, formatYearsRequired, salaryPeriodLabel, type HiringPostViewer } from "./hiring-post-card";
import { usePostOccupation } from "./use-post-occupation";

// Soft tiles behind a company's initials; the same company always gets the same one.
const tileColors = ["#e7eedf", "#efe7de", "#e0ebee", "#e6e5f0", "#f2e7da", "#e0ede7", "#e2ebf1", "#eae6f1", "#e6eedc"];
const SKILLS_SHOWN = 6;

export function companyInitials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function tileColor(name: string) {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return tileColors[hash % tileColors.length];
}

/**
 * One open role in the hiring posts list: who is hiring and what it pays, what it asks for, and the two next steps.
 * The tile links to the recruiter's profile; View details opens the post; Apply opens the application form in place.
 */
// @find [all] hiring-posts / card / result-card / ui — company tile, title, chips, View details, Apply
export function HiringPostResultCard({ post, viewer, onApplied }: {
  post: HiringPost;
  viewer: HiringPostViewer;
  onApplied: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const occupation = usePostOccupation(post);
  const company = post.companyName || post.recruiter?.name || "Recruiter";
  const salary = formatHiringPostSalary(post);
  const href = `/hiring-posts/${post.id}`;
  const requirements = [
    post.location || "Location flexible",
    post.yearsRequired != null ? formatYearsRequired(post.yearsRequired) : null,
    post.predictedSeniority,
  ].filter(Boolean) as string[];
  const tile = (
    <span className="grid size-[46px] shrink-0 place-items-center rounded-xl text-[13px] font-semibold text-[#123f32]"
      style={{ backgroundColor: tileColor(company) }} aria-hidden={post.recruiter ? undefined : true}>
      {companyInitials(company)}
    </span>
  );

  return (
    <article className="group/card grid gap-3 rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#c5d8c8] hover:shadow-float sm:p-6" aria-labelledby={`post-${post.id}-title`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          {post.recruiter ? (
            <Link href={`/profile/${post.recruiter.id}`} title={`Posted by ${post.recruiter.name}`} aria-label={`View ${post.recruiter.name}'s profile`}
              className="rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              {tile}
            </Link>
          ) : tile}
          <div className="min-w-0">
            <h2 id={`post-${post.id}-title`} className="text-xl font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-2xl">
              <Link href={href} className="transition-colors duration-150 group-hover/card:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{post.title}</Link>
            </h2>
            <p className="mt-0.5 truncate text-sm font-medium text-muted">{company}</p>
            {occupation && !occupation.legacy ? (
              <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className="rounded-md bg-[#123f32] px-2 py-1 text-white">{occupation.label}</span>
                {post.specialty ? <span className="rounded-md border border-[#c5d8c8] bg-surface px-2 py-1 text-[#123f32]">{post.specialty}</span> : null}
              </p>
            ) : null}
          </div>
        </div>
        {salary ? (
          <p className="text-[17px] font-semibold leading-snug text-primary tabular-nums sm:w-[212px] sm:shrink-0">
            {salary}
            <span className="block text-[11px] font-normal text-muted">{salaryPeriodLabel(post)}</span>
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2 text-[13px] text-muted">
        {requirements.map((item, index) => (
          <span key={item} className="inline-flex items-center gap-[18px]">
            {index ? <span aria-hidden="true" className="text-[#a0aba3]">·</span> : null}
            {item}
          </span>
        ))}
        {post.employmentType ? (
          <span className="rounded-[5px] bg-[#e9f3ec] px-[9px] py-1 text-xs font-medium text-primary">{post.employmentType}</span>
        ) : null}
      </div>

      {post.description ? <p className="line-clamp-2 text-sm leading-6 text-muted">{post.description}</p> : null}

      {post.skills.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {post.skills.slice(0, SKILLS_SHOWN).map((skill) => (
            <li key={skill} className="rounded-md border border-[#d7e2d9] bg-[#f1f6f2] px-2.5 py-1 text-[13px] font-medium text-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-[#e4efe6]">{skill}</li>
          ))}
          {post.skills.length > SKILLS_SHOWN ? (
            <li className="px-1 py-1 text-xs font-medium text-muted">+{post.skills.length - SKILLS_SHOWN} more</li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
        <p className="flex min-w-0 flex-1 flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          <span>{post.applicationCount === 1 ? "1 applicant" : `${post.applicationCount} applicants`}</span>
          {post.closesAt ? <span>Closes {formatDate(post.closesAt)}</span> : null}
        </p>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <Link href={href}
            className="interaction inline-flex h-[42px] items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            View details
          </Link>
          {/* @find [candidate,guest] hiring-posts / card / apply / ui */}
          <ApplyButton post={post} viewer={viewer} applying={applying} onToggle={() => setApplying((value) => !value)} />
        </div>
      </div>

      {/* @find [candidate] hiring-posts / card / apply-form / ui — application form opens inside the card */}
      {applying && viewer === "candidate" && !post.viewerHasApplied ? (
        <ApplyPanel postId={post.id} onApplied={() => { setApplying(false); onApplied(); }} onCancel={() => setApplying(false)} />
      ) : null}
    </article>
  );
}

// @find [candidate,guest] hiring-posts / card / apply / access — recruiter: no button; applied: status; visitor: sign-in link
function ApplyButton({ post, viewer, applying, onToggle }: {
  post: HiringPost;
  viewer: HiringPostViewer;
  applying: boolean;
  onToggle: () => void;
}) {
  const base = "interaction inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";
  if (viewer === "recruiter") return null;
  if (post.viewerHasApplied) {
    return (
      <span className={cn(base, "bg-[#e9f3ec] text-primary")}>
        <CheckCircle2 className="h-4 w-4" aria-hidden="true" />Applied
      </span>
    );
  }
  if (viewer === "visitor") {
    return (
      <Link href={`/auth/login?next=${encodeURIComponent(`/hiring-posts/${post.id}`)}`} className={cn(base, "bg-[#e9f3ec] text-primary hover:bg-[#d9ecdf]")}>
        Apply
      </Link>
    );
  }
  return (
    <button type="button" aria-expanded={applying} onClick={onToggle}
      className={cn(base, applying ? "bg-primary text-white" : "bg-[#e9f3ec] text-primary hover:bg-[#d9ecdf]")}>
      {applying ? "Cancel" : "Apply"}
    </button>
  );
}
