"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, X } from "lucide-react";
import { useId, useState } from "react";
import { toast } from "sonner";
import { SkillPicker } from "@/features/users/skill-picker";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { Button, Input, Select, Textarea } from "@/shared/ui";
import {
  careerFields,
  draftFromPost,
  emptyHiringPostDraft,
  employmentTypes,
  hiringPostPayload,
  todayInput,
  type HiringPostDraft,
} from "./hiring-post-form";

/**
 * Create a hiring post, or edit one when `post` is given. The field and required years are asked for so the AI
 * level and candidate matching don't have to guess them from the text.
 */
export function HiringPostFormDialog({
  open,
  post,
  onClose,
  onSaved,
}: {
  open: boolean;
  post?: HiringPost | null;
  onClose: () => void;
  onSaved?: (post: HiringPost) => void;
}) {
  if (!open) return null;
  // Remount per post so the draft starts from that post.
  return <HiringPostForm key={post?.id ?? "new"} post={post ?? null} onClose={onClose} onSaved={onSaved} />;
}

function HiringPostForm({
  post,
  onClose,
  onSaved,
}: {
  post: HiringPost | null;
  onClose: () => void;
  onSaved?: (post: HiringPost) => void;
}) {
  const queryClient = useQueryClient();
  const titleId = useId();
  const [draft, setDraft] = useState<HiringPostDraft>(() => (post ? draftFromPost(post) : emptyHiringPostDraft));
  const set = <K extends keyof HiringPostDraft>(key: K, value: HiringPostDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = useMutation({
    mutationFn: (data: Parameters<typeof hiringPostsApi.create>[0]) =>
      post ? hiringPostsApi.update(post.id, data) : hiringPostsApi.create(data),
    onSuccess: (response) => {
      toast.success(post ? "Hiring post updated" : "Hiring post published");
      void queryClient.invalidateQueries({ queryKey: ["hiring-posts"] });
      if (response.content) onSaved?.(response.content);
      onClose();
    },
    onError: (error) => toast.error(getErrorMessage(error, "Could not save the hiring post")),
  });

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = hiringPostPayload(draft);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    save.mutate(result.data);
  }

  return (
    <div className="motion-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="motion-panel max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-surface shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Hiring post</p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-bold">{post ? "Edit hiring post" : "New hiring post"}</h2>
          </div>
          <Button type="button" size="icon" variant="ghost" aria-label="Close" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form className="grid gap-5 p-5" onSubmit={submit} noValidate>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Role title" required>
              <Input value={draft.title} maxLength={160} required onChange={(event) => set("title", event.target.value)} placeholder="Backend Engineer" />
            </Field>
            <Field label="Company" hint="Shown on the post instead of your name.">
              <Input value={draft.companyName} maxLength={120} onChange={(event) => set("companyName", event.target.value)} placeholder="Acme Software" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Field of work" required hint="Candidates filter by this, and the AI level reads it.">
              <Select value={draft.careerField} required onChange={(event) => set("careerField", event.target.value)}>
                <option value="">Choose a field</option>
                {careerFields.map((field) => <option key={field} value={field}>{field}</option>)}
              </Select>
            </Field>
            <Field label="Years of experience required" required hint="Minimum years in this field. Use 0 for entry level.">
              <Input type="number" inputMode="numeric" min={0} max={40} required value={draft.yearsRequired} onChange={(event) => set("yearsRequired", event.target.value)} placeholder="3" />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Employment type">
              <Select value={draft.employmentType} onChange={(event) => set("employmentType", event.target.value)}>
                <option value="">Not stated</option>
                {employmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
            <Field label="Location">
              <Input value={draft.location} maxLength={120} onChange={(event) => set("location", event.target.value)} placeholder="Ho Chi Minh City or Remote" />
            </Field>
            <Field label="Closes on" hint="Optional. The post stops being listed after this day.">
              <Input type="date" min={todayInput()} value={draft.closesAt} onChange={(event) => set("closesAt", event.target.value)} />
            </Field>
          </div>

          <Field label="Description" required>
            <Textarea className="min-h-32" value={draft.description} maxLength={5000} required onChange={(event) => set("description", event.target.value)}
              placeholder="What the role does, the team, and what success looks like." />
          </Field>

          <SkillPicker value={draft.skills} onChange={(skills) => set("skills", skills)} field={draft.careerField || undefined} max={20}
            label="Required skills" placeholder="Search skills, for example Python or Figma" />

          <Field label="Other requirements" hint="Anything the skills and years don't cover: languages, certificates, travel.">
            <Textarea className="min-h-24" value={draft.requirements} maxLength={3000} onChange={(event) => set("requirements", event.target.value)} />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Monthly salary from (USD)">
              <Input type="number" inputMode="numeric" min={0} value={draft.salaryMin} onChange={(event) => set("salaryMin", event.target.value)} />
            </Field>
            <Field label="Monthly salary up to (USD)">
              <Input type="number" inputMode="numeric" min={0} value={draft.salaryMax} onChange={(event) => set("salaryMax", event.target.value)} />
            </Field>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>
              {post ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {post ? "Save changes" : "Publish hiring post"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, hint, required = false, children }: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="grid content-start gap-1.5">
      <span className="text-sm font-semibold">
        {label}
        {required ? <span className="text-danger" aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}
