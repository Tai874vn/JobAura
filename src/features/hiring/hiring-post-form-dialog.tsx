"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { occupationQuery, type OccupationHit } from "@/features/occupations/api";
import { OccupationPicker } from "@/features/occupations/occupation-picker";
import { SpecialtyPicker } from "@/features/occupations/specialty-picker";
import { isStillChoice, mainOccupationChange, matchedSpecialty } from "@/features/users/resume-career-fields";
import { SkillPicker } from "@/features/users/skill-picker";
import { hiringPostsApi } from "@/shared/api/endpoints";
import { getErrorMessage } from "@/shared/lib/utils";
import type { HiringPost } from "@/shared/schemas";
import { Button, Input, Select, Textarea } from "@/shared/ui";
import {
  draftFromPost,
  emptyHiringPostDraft,
  employmentTypes,
  hiringPostPayload,
  todayInput,
  type HiringPostDraft,
} from "./hiring-post-form";

/**
 * Create a hiring post, or edit one when `post` is given. The ESCO occupation (with an optional specialty) and the
 * required years are asked for so the AI level and candidate matching don't have to guess them from the text. A
 * post saved before occupations opens with "previously: X" and asks for the occupation.
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
  const detail = useQuery(occupationQuery(draft.occupationCode));

  // The latest choice, read after the specialty list loads: a later pick or edit wins over a slow response.
  const latest = useRef({ Occupation: draft.occupationCode, Specialty: draft.specialty });
  useEffect(() => { latest.current = { Occupation: draft.occupationCode, Specialty: draft.specialty }; });

  async function pickOccupation(hit: OccupationHit) {
    const next = mainOccupationChange(hit, latest.current);
    latest.current = next;
    setDraft((current) => ({ ...current, occupationCode: next.Occupation, specialty: next.Specialty }));
    if (!hit.matchedLabel) return;
    try {
      const found = matchedSpecialty(hit, (await queryClient.fetchQuery(occupationQuery(hit.code))).specialties);
      if (found && isStillChoice(latest.current, next)) set("specialty", found);
    } catch {
      // The specialty stays empty; the recruiter can pick it from the list.
    }
  }

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
    const result = hiringPostPayload(draft, new Date(), detail.data?.specialties);
    if (result.error !== undefined) {
      toast.error(result.error);
      return;
    }
    save.mutate(result.data);
  }

  return (
    <div className="motion-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="motion-panel max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-surface shadow-overlay">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-surface p-5">
          <div>
            <p className="text-xs font-medium text-primary">Hiring post</p>
            <h2 id={titleId} className="mt-1 font-display text-2xl font-medium">{post ? "Edit hiring post" : "New hiring post"}</h2>
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
            <div className="grid content-start gap-1.5">
              <OccupationPicker label="Occupation" required value={draft.occupationCode}
                emptyLabel="Choose the occupation" previously={draft.legacyField || undefined}
                placeholder="Search occupations, for example web developer"
                invalid={!draft.occupationCode} onPick={(hit) => void pickOccupation(hit)}
                onClear={() => setDraft((current) => ({ ...current, occupationCode: "", specialty: "" }))} />
              <span className="text-xs leading-5 text-muted">Candidates are matched on this, and the AI level reads it.</span>
            </div>
            <SpecialtyPicker occupation={draft.occupationCode} value={draft.specialty} onChange={(value) => set("specialty", value)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Years of experience required" required hint="Minimum years in this occupation. Use 0 for entry level.">
              <Input type="number" inputMode="numeric" min={0} max={40} required value={draft.yearsRequired} onChange={(event) => set("yearsRequired", event.target.value)} placeholder="3" />
            </Field>
            <Field label="Employment type">
              <Select value={draft.employmentType} onChange={(event) => set("employmentType", event.target.value)}>
                <option value="">Not stated</option>
                {employmentTypes.map((type) => <option key={type} value={type}>{type}</option>)}
              </Select>
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Location">
              <Input value={draft.location} maxLength={120} onChange={(event) => set("location", event.target.value)} placeholder="Ho Chi Minh City or Remote" />
            </Field>
            <Field label="Closes on" hint="Optional. The post stops being listed after this day.">
              <Input type="date" min={todayInput()} value={draft.closesAt} onChange={(event) => set("closesAt", event.target.value)} />
            </Field>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="How many people are you hiring?" required={!draft.keepHiring} hint="From 1 to 50. When the last one accepts, the post closes by itself.">
              <Input type="number" inputMode="numeric" min={1} max={50} step={1} value={draft.openings} disabled={draft.keepHiring}
                onChange={(event) => set("openings", event.target.value)} placeholder="1" />
            </Field>
            <label className="flex items-start gap-2 self-center text-sm font-medium md:mt-6">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-primary" checked={draft.keepHiring}
                onChange={(event) => set("keepHiring", event.target.checked)} />
              Keep hiring until I close the post
            </label>
          </div>

          <Field label="Description" required>
            <Textarea className="min-h-32" value={draft.description} maxLength={5000} required onChange={(event) => set("description", event.target.value)}
              placeholder="What the role does, the team, and what success looks like." />
          </Field>

          <SkillPicker value={draft.skills} onChange={(skills) => set("skills", skills)} field={draft.occupationCode || undefined} max={20}
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
      <span className="text-sm font-medium">
        {label}
        {required ? <span className="text-danger" aria-hidden="true"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="text-xs leading-5 text-muted">{hint}</span> : null}
    </label>
  );
}
