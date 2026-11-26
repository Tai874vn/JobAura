"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileWarning, Send } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { useSession } from "@/features/auth/use-session";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { usersApi } from "@/shared/api/endpoints/users";
import { queryKeys } from "@/shared/api/query-keys";
import { getErrorMessage } from "@/shared/lib/utils";
import { ButtonLink, Button, Textarea } from "@/shared/ui";

/**
 * The candidate's application form. Recruiters read the candidate's profile and resume, so a missing resume is
 * pointed out before sending; it doesn't block the application.
 */
export function ApplyPanel({ postId, onApplied, onCancel }: {
  postId: number;
  onApplied: () => void;
  onCancel?: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useSession();
  const messageId = useId();
  const [message, setMessage] = useState("");
  const resume = useQuery({ queryKey: queryKeys.myResume(user?.id), queryFn: usersApi.myResume, retry: false, staleTime: 60_000 });
  const hasNoResume = resume.isSuccess && !resume.data?.content;

  const apply = useMutation({
    mutationFn: () => hiringPostsApi.apply(postId, { coverLetter: message.trim() || undefined }),
    onSuccess: () => {
      toast.success("Application sent");
      setMessage("");
      void queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
      void queryClient.invalidateQueries({ queryKey: ["pipeline"] });
      onApplied();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not send your application")),
  });

  return (
    <div className="motion-popover mt-4 grid gap-3 rounded-lg border border-border bg-surface-muted p-4">
      {hasNoResume ? (
        <div role="note" className="flex flex-wrap items-start gap-3 rounded-lg border border-rating/40 bg-rating/10 p-3 text-sm">
          <FileWarning className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <p className="min-w-0 flex-1 leading-6">
            You haven&apos;t added a resume yet. The recruiter will see only your profile.
          </p>
          <ButtonLink href="/settings?section=resume" size="sm" variant="secondary">Add resume</ButtonLink>
        </div>
      ) : null}
      <label htmlFor={messageId} className="text-sm font-medium">Message to the recruiter <span className="font-normal text-muted">(optional)</span></label>
      <Textarea
        id={messageId}
        className="min-h-28 bg-surface"
        value={message}
        maxLength={3000}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="A few lines on why you fit this role."
      />
      <div className="flex flex-wrap justify-end gap-2">
        {onCancel ? <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button> : null}
        <Button type="button" onClick={() => apply.mutate()} loading={apply.isPending}>
          <Send className="h-4 w-4" />
          Send application
        </Button>
      </div>
    </div>
  );
}
