import { z } from 'zod'

// @find my-hiring-posts page config logic [all] — every adjustable value of this page
/**
 * PAGE CONFIG: /my-hiring-posts (a recruiter's own posts) and the hiring post form (create / edit dialog)
 *
 * Safe edits: remove a line, reorder lines, change a label or a number.
 */
export const myHiringPostsConfig = {
  /** Posts per page. */
  pageSize: 10,
  /** How many posts are loaded at once to count and sort them here. Backend limit: at most 100. */
  loadLimit: 100,

  /** The "Sort" menu ('' = newest first). Only rename or remove; these two are the only sorts this page knows. */
  sortLabels: { '': 'Newest', applicants: 'Most applicants' },

  /** Choices in the hiring post form. */
  postForm: {
    /** "Employment type" dropdown. Free text in the database, so a new type also works. */
    employmentTypes: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance'],
    /** "Level" choices. Must be Junior, Mid or Senior (backend HIRING_POST_LEVELS). */
    levels: ['Junior', 'Mid', 'Senior'],
  },
} as const

// @find my-hiring-posts form input validation [recruiter] — the Zod rules of the hiring post form
/*
 * FORM INPUT RULES (Zod) of the hiring post form (create and edit). The form shows these messages under the
 * fields before anything is sent; the backend checks the same rules again (CreateHiringPostDto).
 */
export const createHiringPostSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, "Role title is required")
      .max(160, "Role title must be 160 characters or fewer"),
    description: z
      .string()
      .trim()
      .min(20, "Description should explain the role")
      .max(5000, "Description must be 5000 characters or fewer"),
    requirements: z
      .string()
      .trim()
      .max(3000, "Requirements must be 3000 characters or fewer")
      .optional(),
    location: z
      .string()
      .trim()
      .max(120, "Location must be 120 characters or fewer")
      .optional(),
    employmentType: z
      .string()
      .trim()
      .max(80, "Employment type must be 80 characters or fewer")
      .optional(),
    salaryMin: z.coerce.number().min(0).optional(),
    salaryMax: z.coerce.number().min(0).optional(),
    companyName: z
      .string()
      .trim()
      .max(120, "Company name must be 120 characters or fewer")
      .optional(),
    /** ESCO occupation code, picked from the catalogue search. */
    occupationCode: z.string().trim().min(1, "Choose the occupation"),
    /** One of the occupation's specialties; null clears it on an edit. */
    specialty: z.string().trim().max(120).nullable().optional(),
    yearsRequired: z.coerce
      .number({ message: "Enter the years of experience required" })
      .int("Use whole years")
      .min(0, "Years cannot be negative")
      .max(40, "Use 40 years or fewer"),
    skills: z.array(z.string()).max(20, "Pick up to 20 skills").optional(),
    /** A date (YYYY-MM-DD) after which the post is no longer listed. */
    closesAt: z.string().optional(),
    /** How many people the post hires (1 to 50); null keeps hiring until the post is closed. */
    openings: z.number().int().min(1).max(50).nullable().optional(),
  })
  .refine(
    (data) =>
      data.salaryMin === undefined ||
      data.salaryMax === undefined ||
      data.salaryMin <= data.salaryMax,
    {
      message: "Maximum salary must be greater than or equal to minimum salary",
      path: ["salaryMax"],
    },
  );
