"use client";

import { Plus, X } from "lucide-react";
import type { CreateHiringPost } from "@/shared/schemas";
import { Button, Input, Textarea } from "@/shared/ui";

export const emptyHiringPostDraft: CreateHiringPost = {
  title: "",
  description: "",
  requirements: "",
  location: "",
  employmentType: "",
  salaryMin: undefined,
  salaryMax: undefined,
};

export function CreateHiringPostModal({
  open,
  draft,
  saving,
  onClose,
  onChange,
  onSubmit,
}: {
  open: boolean;
  draft: CreateHiringPost;
  saving: boolean;
  onClose: () => void;
  onChange: <K extends keyof CreateHiringPost>(key: K, value: CreateHiringPost[K]) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  if (!open) return null;

  return (
    <div className="motion-overlay fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" role="dialog" aria-modal="true" aria-labelledby="create-hiring-post-title">
      <div className="motion-panel max-h-[calc(100vh-2rem)] w-full max-w-3xl overflow-y-auto rounded-lg border border-border bg-white shadow-xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-border bg-white p-5">
          <div>
            <p className="text-xs font-bold uppercase text-primary">Recruiter post</p>
            <h2 id="create-hiring-post-title" className="mt-1 font-display text-2xl font-bold">Create hiring post</h2>
          </div>
          <Button type="button" size="icon" variant="ghost" aria-label="Close create hiring post" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form className="grid gap-4 p-5" onSubmit={onSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Role title</span>
              <Input
                value={draft.title}
                maxLength={160}
                onChange={(event) => onChange("title", event.target.value)}
                placeholder="Frontend Developer"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Employment type</span>
              <Input
                value={draft.employmentType ?? ""}
                maxLength={80}
                onChange={(event) => onChange("employmentType", event.target.value)}
                placeholder="Full-time, contract, remote"
              />
            </label>
          </div>

          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase text-muted">Description</span>
            <Textarea
              className="min-h-32"
              value={draft.description}
              maxLength={5000}
              onChange={(event) => onChange("description", event.target.value)}
              placeholder="Describe the role, team context, responsibilities, and expected outcomes."
            />
          </label>

          <label className="grid gap-1">
            <span className="text-xs font-bold uppercase text-muted">Requirements</span>
            <Textarea
              className="min-h-28"
              value={draft.requirements ?? ""}
              maxLength={3000}
              onChange={(event) => onChange("requirements", event.target.value)}
              placeholder="React, TypeScript, REST APIs, PostgreSQL, portfolio projects..."
            />
          </label>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Location</span>
              <Input
                value={draft.location ?? ""}
                maxLength={120}
                onChange={(event) => onChange("location", event.target.value)}
                placeholder="Ho Chi Minh or Remote"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Salary min</span>
              <Input
                type="number"
                min={0}
                value={draft.salaryMin ?? ""}
                onChange={(event) => onChange("salaryMin", event.target.value ? Number(event.target.value) : undefined)}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold uppercase text-muted">Salary max</span>
              <Input
                type="number"
                min={0}
                value={draft.salaryMax ?? ""}
                onChange={(event) => onChange("salaryMax", event.target.value ? Number(event.target.value) : undefined)}
              />
            </label>
          </div>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving}>
              <Plus className="h-4 w-4" />
              Create hiring post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
