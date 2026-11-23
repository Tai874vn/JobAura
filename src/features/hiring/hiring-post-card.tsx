import { BriefcaseBusiness, CalendarClock, Clock3, MapPin, Send, Users, X } from "lucide-react";
import Link from "next/link";
import type { HiringPost } from "@/shared/schemas";
import { Avatar, Badge, Button, ButtonLink, Card, CardContent } from "@/shared/ui";
import { AppliedAction } from "./applied-action";
import { ApplyPanel } from "./apply-panel";
import { usePostOccupation } from "./use-post-occupation";

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
            <HiringPostAvatar post={post} size="lg" />
            <div className="min-w-0 flex-1">
              <HiringPostBadges post={post} />
              <h2 className="mt-2 font-display text-xl font-medium leading-tight sm:text-2xl">
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

/**
 * The poster's picture: the recruiter's photo when they have one, else the company's (or recruiter's) initials, so
 * the letters match the name shown next to it. It links to the recruiter's profile.
 */
export function HiringPostAvatar({ post, size = "md" }: { post: HiringPost; size?: "sm" | "md" | "lg" }) {
  const name = post.companyName || post.recruiter?.name || "Recruiter";
  const avatar = <Avatar name={name} src={post.recruiter?.avatar} size={size} />;
  if (!post.recruiter) return avatar;
  return (
    <Link href={`/profile/${post.recruiter.id}`} className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-bright focus-visible:ring-offset-2"
      aria-label={`View ${post.recruiter.name}'s profile`} title={`Posted by ${post.recruiter.name}`}>
      {avatar}
    </Link>
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
    return <AppliedAction postId={post.id} />;
  }
  return (
    <Button type="button" className="w-full" variant={active ? "secondary" : "primary"} aria-expanded={active} onClick={onToggleApply}>
      {active ? <X className="h-4 w-4" /> : <Send className="h-4 w-4" />}
      {active ? "Hide form" : "Apply"}
    </Button>
  );
}

export function HiringPostBadges({ post }: { post: HiringPost }) {
  const occupation = usePostOccupation(post);
  return (
    <div className="flex flex-wrap items-center gap-2">
      {post.status === "CLOSED" ? <Badge tone="neutral">Closed</Badge> : null}
      {occupation ? <Badge tone={occupation.legacy ? "neutral" : "primary"}>{occupation.legacy ? `Previously: ${occupation.label}` : occupation.label}</Badge> : null}
      {post.specialty && !occupation?.legacy ? <Badge tone="neutral">{post.specialty}</Badge> : null}
      {post.predictedSeniority ? <Badge tone="accent">{post.predictedSeniority}</Badge> : null}
      {post.employmentType ? <Badge tone="neutral">{post.employmentType}</Badge> : null}
    </div>
  );
}

/** The post's facts in one row. `showEmployer={false}` when the employer is already shown above. */
export function HiringPostFacts({ post, showEmployer = true }: { post: HiringPost; showEmployer?: boolean }) {
  const salary = formatHiringPostSalary(post);
  const employer = showEmployer ? post.companyName || post.recruiter?.name : null;
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
      {employer ? (
        <span className="inline-flex items-center gap-1 font-medium text-foreground">
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
      {salary ? <span className="font-medium text-foreground">{salary}</span> : null}
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
        <li key={skill} className="rounded-md border border-border bg-surface-muted px-2.5 py-0.5 text-xs font-medium">{skill}</li>
      ))}
      {limit && skills.length > limit ? <li className="px-1 text-xs font-medium text-muted">+{skills.length - limit} more</li> : null}
    </ul>
  );
}

export function formatYearsRequired(years: number) {
  if (years === 0) return "No experience required";
  return years === 1 ? "1+ year of experience" : `${years}+ years of experience`;
}

/** "Today", "Yesterday", "5 days ago", "3 weeks ago", then the date. */
export function formatPostedAgo(value: string | undefined, now = new Date()) {
  if (!value) return "";
  const days = Math.floor((now.getTime() - new Date(value).getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.floor(days / 7)} weeks ago`;
  return formatDate(value);
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

type SalaryFields = Pick<HiringPost, "salaryMin" | "salaryMax"> & Partial<Pick<HiringPost, "salaryCurrency" | "salaryPeriod">>;
const periodSuffix = { month: "/mo", year: "/yr", hour: "/hr" } as const;
const periodLabel = { month: "Monthly salary", year: "Yearly salary", hour: "Hourly rate" } as const;

function currencyFormatter(currency?: string | null) {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 });
  } catch {
    // An unknown code from old data: show the plain number with the code rather than failing the card.
    const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
    return { format: (value: number) => `${plain.format(value)} ${currency}` };
  }
}

/** "$3,900 - $4,300/mo"; posts saved before salary units are USD per month. */
export function formatHiringPostSalary(post: SalaryFields) {
  if (post.salaryMin == null && post.salaryMax == null) return "";
  const formatter = currencyFormatter(post.salaryCurrency);
  const suffix = periodSuffix[post.salaryPeriod ?? "month"];
  if (post.salaryMin != null && post.salaryMax != null) {
    return `${formatter.format(post.salaryMin)} - ${formatter.format(post.salaryMax)}${suffix}`;
  }
  if (post.salaryMin != null) return `From ${formatter.format(post.salaryMin)}${suffix}`;
  return `Up to ${formatter.format(post.salaryMax ?? 0)}${suffix}`;
}

export function salaryPeriodLabel(post: Partial<Pick<HiringPost, "salaryPeriod">>) {
  return periodLabel[post.salaryPeriod ?? "month"];
}
