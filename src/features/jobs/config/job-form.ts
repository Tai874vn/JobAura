/**
 * Settings and Zod validation schema for creating and editing a service or portfolio post (/jobs/new and /jobs/[id]/edit).
 * Holds character limits, milestone template limits, and form field rules.
 *
 * Calls: nothing from this project
 * Used by:
 *   - features/jobs/components/form/job-form.tsx
 *   - features/jobs/utils/milestone-template.ts
 *   - shared/schemas/marketplace.ts
 */

import { z } from 'zod'

// @find job-form page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /jobs/new and /jobs/[id]/edit (the form that creates or edits a service / portfolio post)
 *
 * Safe edits: LOWER a number. These limits repeat the backend rules (CreateJobDto); a higher number
 * only moves the error from the form to the server.
 */
export const jobFormConfig = {
  /** Longest title, in characters. */
  titleMax: 160,
  /** Longest short description (shown on the card). */
  shortDescriptionMax: 500,
  /** Longest full description. */
  descriptionMax: 5000,
  /** Longest "service area" text. */
  serviceAreaMax: 160,

  /** The milestone template a client starts a proposal from. */
  milestoneTemplate: {
    /** Most rows. */
    maxRows: 10,
    /** Longest milestone title. */
    titleMax: 80,
    /** Longest milestone description. */
    descriptionMax: 300,
  },
} as const

// @find job-form form input validation [signed-in] — the Zod rules of the service / portfolio form
/*
 * FORM INPUT RULES (Zod) of the service form (create and edit). Limits come from jobFormConfig above.
 * The backend checks the same rules again (CreateJobDto).
 */
export const createJobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Service title is required")
    .max(jobFormConfig.titleMax, `Service title must be ${jobFormConfig.titleMax} characters or fewer`),
  /** Optional rate; 0 means a portfolio post with no price. */
  price: z.coerce.number().min(0, "The rate cannot be negative").default(0),
  shortDescription: z
    .string()
    .trim()
    .max(jobFormConfig.shortDescriptionMax, `Short description must be ${jobFormConfig.shortDescriptionMax} characters or fewer`)
    .optional(),
  description: z
    .string()
    .trim()
    .max(jobFormConfig.descriptionMax, `Description must be ${jobFormConfig.descriptionMax} characters or fewer`)
    .optional(),
  subcategoryId: z.coerce.number().min(1, "Choose the kind of work"),
  workMode: z.enum(["REMOTE", "ONSITE", "BOTH"]).default("REMOTE"),
  /** Null for remote work. */
  serviceArea: z.string().trim().max(jobFormConfig.serviceAreaMax, `The area is at most ${jobFormConfig.serviceAreaMax} characters.`).nullish(),
  /** Null for no template; otherwise 1-10 steps whose shares add up to 100 (the form checks this). */
  milestoneTemplate: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(jobFormConfig.milestoneTemplate.titleMax),
        description: z.string().trim().max(jobFormConfig.milestoneTemplate.descriptionMax).optional(),
        share: z.number().int().min(1).max(100),
      }),
    )
    .max(jobFormConfig.milestoneTemplate.maxRows)
    .nullish(),
  reviews: z.coerce.number().default(0),
  rating: z.coerce.number().min(0).max(5).default(0),
});
