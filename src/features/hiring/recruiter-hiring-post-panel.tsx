import { Plus, Sparkles } from "lucide-react";
import type { HiringPost } from "@/shared/schemas";
import { Badge, Button, ButtonLink, Card, CardContent, Spinner } from "@/shared/ui";

export function RecruiterHiringPostPanel({
  posts,
  loading,
  onCreate,
  onPredict,
  predictingId,
  predicting,
}: {
  posts: HiringPost[];
  loading: boolean;
  onCreate: () => void;
  onPredict: (postId: number) => void;
  predictingId: number | null;
  predicting: boolean;
}) {
  return (
    <Card className="mt-6">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Your hiring posts</p>
            <h2 className="mt-1 font-display text-2xl font-bold">Recruiter workspace</h2>
          </div>
          <Button type="button" variant="secondary" onClick={onCreate}>
            <Plus className="h-4 w-4" />
            Create post
          </Button>
        </div>

        {loading ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-28 animate-pulse rounded-lg bg-surface-muted" />
            ))}
          </div>
        ) : posts.length ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => (
              <div key={post.id} className="rounded-lg border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="line-clamp-2 font-display text-lg font-bold leading-snug">{post.title}</h3>
                  <Badge tone={post.status === "OPEN" ? "accent" : "neutral"}>
                    {post.status === "OPEN" ? "Open" : "Closed"}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-muted">
                  <span>{post.employmentType || "Role"}</span>
                  <span>{post.location || "Flexible"}</span>
                  <span>{post.applicationCount} applicants</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <HiringPostSeniorityBadge post={post} />
                </div>
                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={predicting}
                    onClick={() => onPredict(post.id)}
                  >
                    {predicting && predictingId === post.id ? (
                      <Spinner className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    Predict level
                  </Button>
                  <ButtonLink href="/recommendations/candidates" className="w-full" variant="secondary" size="sm">
                    <Sparkles className="h-4 w-4" />
                    Match candidates
                  </ButtonLink>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-lg border border-dashed border-border bg-surface-muted p-5">
            <h3 className="font-display text-xl font-bold">No hiring posts yet</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              Create a recruiter post first, then use AI candidate matching against saved candidate resumes.
            </p>
            <Button className="mt-4" type="button" onClick={onCreate}>
              <Plus className="h-4 w-4" />
              Create hiring post
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function HiringPostSeniorityBadge({ post }: { post: HiringPost }) {
  if (!post.predictedSeniority) {
    return (
      <span className="rounded bg-surface-muted px-2.5 py-1 text-xs font-bold text-muted">
        AI level not predicted
      </span>
    );
  }

  // No percentage: the model applies fixed rules, so its "confidence" is near 100% and reads as certainty.
  return (
    <span className="rounded bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
      AI level {post.predictedSeniority}
    </span>
  );
}
