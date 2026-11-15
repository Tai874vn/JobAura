import { BriefcaseBusiness, CalendarClock, CheckCircle2, Clock3, MapPin, Send, Users, X } from "lucide-react";
import Link from "next/link";
import { FeedAvatar } from "@/features/feed/feed-avatar";
import type { HiringPost } from "@/shared/schemas";
import { Badge, Button, ButtonLink, Card, CardContent } from "@/shared/ui";
import { ApplyPanel } from "./apply-panel";

/** Who is looking at the post decides the action: candidates apply, visitors sign in first, recruiters only read. */
export type HiringPostViewer = "candidate" | "visitor" | "recruiter";

export function HiringPostCard({
  post,
  viewer,
  active,
  onToggleApply,
  onApplied,
}: {
  post: HiringPost;
  viewer: HiringPostViewer;
  active: boolean;
  onToggleApply: () => void;
  onApplied: () => void;
}) {
  const href = `/hiring-posts/${post.id}`;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex min-w-0 flex-1 gap-4">
            {post.recruiter ? <FeedAvatar user={post.recruiter} size="lg" /> : null}
            <div className="min-w-0 flex-1">
              <HiringPostBadges post={post} />
              <h2 className="mt-2 font-display text-xl font-bold leading-tight sm:text-2xl">
                <Link href={href} className="hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright">
                  {post.title}
                </Link>
              </h2>
              <HiringPostFacts post={post} />
              <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">{post.description}</p>
              <HiringPostSkills skills={post.skills} limit={6} />
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2 sm:w-40 sm:flex-col">
            <HiringPostAction post={post} viewer={viewer} active={active} onToggleApply={onToggleApply} />
            <ButtonLink href={href} variant="ghost" className="w-full">View details</ButtonLink>
          </div>
        </div>
        {active && viewer === "candidate" && !post.viewerHasApplied ? (
          <ApplyPanel postId={post.id} onApplied={onApplied} onCancel={onToggleApply} />
        ) : null}
      </CardContent>
    </Card>
  );
}

export function HiringPostAction({ post, viewer, active = false, onToggleApply }: {
  post: HiringPost;
  viewer: HiringPostViewer;
  active?: boolean;
  onToggleApply: () => void;
}) {
  if (viewer === "recruiter") return null;
  if (viewer === "visitor") {
    return (
      <ButtonLink href={`/auth/login?next=${encodeURIComponent(`/hiring-posts/${post.id}`)}`} className="w-full">
        <Send className="h-4 w-4" />
        Sign in to apply
      </ButtonLink>
    );
  }
  if (post.viewerHasApplied) {
    return (
      <Button type="button" disabled className="w-full">
        <CheckCircle2 className="h-4 w-4" />
        Applied
      </Button>
    );
  }
  return (
    <Button type="button" className="w-full" variant={active ? "secondary" : "primary"} aria-expanded={active} onClick={onToggleApply}>
      {active ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      {active ? "Hide form" : "Apply"}
    </Button>
  );
}

export function HiringPostBadges({ post }: { post: HiringPost }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {post.status === "CLOSED" ? <Badge tone="neutral">Closed</Badge> : null}
      {post.careerField ? <Badge tone="primary">{post.careerField}</Badge> : null}
      {post.predictedSeniority ? <Badge tone="accent">{post.predictedSeniority}</Badge> : null}
      {post.employmentType ? <Badge tone="neutral">{post.employmentType}</Badge> : null}
    </div>
  );
}

export function HiringPostFacts({ post }: { post: HiringPost }) {
  const salary = formatHiringPostSalary(post);
  const employer = post.companyName || post.recruiter?.name;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
      {employer ? (
        <span className="inline-flex items-center gap-1 font-semibold text-foreground">
          <BriefcaseBusiness className="h-4 w-4 text-muted" aria-hidden="true" />
          {post.recruiter ? <Link href={`/profile/${post.recruiter.id}`} className="hover:text-primary hover:underline">{employer}</Link> : employer}
        </span>
      ) : null}
      <span className="inline-flex items-center gap-1">
        <MapPin className="h-4 w-4" aria-hidden="true" />
        {post.location || "Location flexible"}
      </span>
      {post.yearsRequired != null ? (
        <span className="inline-flex items-center gap-1">
          <Clock3 className="h-4 w-4" aria-hidden="true" />
          {formatYearsRequired(post.yearsRequired)}
        </span>
      ) : null}
      {salary ? <span className="font-semibold text-foreground">{salary}</span> : null}
      <span className="inline-flex items-center gap-1">
        <Users className="h-4 w-4" aria-hidden="true" />
        {post.applicationCount === 1 ? "1 applicant" : `${post.applicationCount} applicants`}
      </span>
      {post.closesAt ? (
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-4 w-4" aria-hidden="true" />
          Closes {formatDate(post.closesAt)}
        </span>
      ) : null}
    </div>
  );
}

export function HiringPostSkills({ skills, limit }: { skills?: string[]; limit?: number }) {
  if (!skills?.length) return null;
  const shown = limit ? skills.slice(0, limit) : skills;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Required skills">
      {shown.map((skill) => (
        <li key={skill} className="rounded-full border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-semibold">{skill}</li>
      ))}
      {limit && skills.length > limit ? <li className="px-1 text-xs font-semibold text-muted">+{skills.length - limit} more</li> : null}
    </ul>
  );
}

export function formatYearsRequired(years: number) {
  if (years === 0) return "No experience required";
  return years === 1 ? "1+ year of experience" : `${years}+ years of experience`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function formatHiringPostSalary(post: Pick<HiringPost, "salaryMin" | "salaryMax">) {
  if (post.salaryMin == null && post.salaryMax == null) return "";
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
  if (post.salaryMin != null && post.salaryMax != null) {
    return `${formatter.format(post.salaryMin)} - ${formatter.format(post.salaryMax)}/mo`;
  }
  if (post.salaryMin != null) return `From ${formatter.format(post.salaryMin)}/mo`;
  return `Up to ${formatter.format(post.salaryMax ?? 0)}/mo`;
}
