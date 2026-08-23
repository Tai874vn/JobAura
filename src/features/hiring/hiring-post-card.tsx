import { CheckCircle2, Clock3, MapPin, Send, Users } from "lucide-react";
import { FeedAvatar } from "@/features/feed/feed-avatar";
import { cn } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { Badge, Button, ButtonLink, Card, CardContent, Spinner, Textarea } from "@/shared/ui";

export function HiringPostCard({
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
                {post.employmentType ? <Badge tone="neutral">{post.employmentType}</Badge> : null}
              </div>
              <h2 className="mt-2 font-display text-2xl font-bold leading-tight">{post.title}</h2>
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
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted">{post.description}</p>
              {post.requirements ? (
                <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm leading-6">{post.requirements}</p>
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
              {post.viewerHasApplied ? <CheckCircle2 className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              {post.viewerHasApplied ? "Applied" : canApply ? "Apply" : "Employee only"}
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
              <span className="text-xs font-bold uppercase text-muted">Short message</span>
              <Textarea
                className="min-h-28 bg-white"
                value={coverLetter}
                onChange={(event) => onCoverLetterChange(event.target.value)}
                placeholder="Write a short note about why you are a good fit."
              />
            </label>
            <div className="mt-3 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onApply} disabled={applying}>
                {applying ? <Spinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                Send application
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function formatHiringPostSalary(post: Pick<HiringPost, "salaryMin" | "salaryMax">) {
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

const formatSalary = formatHiringPostSalary;
