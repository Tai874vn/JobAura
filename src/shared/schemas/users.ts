import { z } from 'zod'
import { accountRoles, signupRoles } from '@/shared/lib/roles'

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().trim().pipe(z.email().toLowerCase()),
  passWord: z.string().optional(),
  phone: z.string().optional(),
  birthDay: z.string().optional(),
  avatar: z.string().optional().nullable(),
  gender: z.string().optional(),
  role: z.enum(accountRoles).optional(),
  skill: z.string().optional().nullable(),
  certification: z.string().optional().nullable(),
  googleId: z.string().optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const profileSkillSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  level: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});

export const profileCertificationSchema = z.object({
  id: z.number().optional(),
  name: z.string(),
  issuer: z.string().optional().nullable(),
  issuedAt: z.string().optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  credentialUrl: z.string().optional().nullable(),
  credentialId: z.string().optional().nullable(),
  /** Certification, License, Course, or Badge (schema.org credentialCategory). */
  category: z.string().optional().nullable(),
  skills: z.array(z.string()).optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});

export const profilePortfolioItemSchema = z.object({
  id: z.number().optional(),
  title: z.string(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  url: z.string().optional().nullable(),
  sortOrder: z.number().optional().nullable(),
});

export const userProfileSchema = userSchema.extend({
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  cover: z.string().optional().nullable(),
  coverImage: z.string().optional().nullable(),
  skills: z.array(profileSkillSchema).optional().nullable(),
  profileSkills: z.array(profileSkillSchema).optional().nullable(),
  certifications: z.array(profileCertificationSchema).optional().nullable(),
  profileCertifications: z
    .array(profileCertificationSchema)
    .optional()
    .nullable(),
  portfolio: z.array(profilePortfolioItemSchema).optional().nullable(),
  portfolioItems: z.array(profilePortfolioItemSchema).optional().nullable(),
  candidateDiscoverable: z.boolean().optional(),
  /** From the resume: highest degree and its ISCED-F field-of-study code. */
  education: z.object({ degree: z.string(), fieldOfStudy: z.string().nullable() }).optional().nullable(),
});

export const resumeDataSchema = z
  .object({
    ResumeID: z.string().optional().nullable(),
    Category: z.string().optional().nullable(),
    Name: z.string().optional().nullable(),
    Email: z.string().optional().nullable(),
    Phone: z.string().optional().nullable(),
    Location: z.string().optional().nullable(),
    Role: z.string().optional().nullable(),
    /** ESCO occupation code, e.g. "2513.5" (ISCO-08 unit group 2513). */
    Occupation: z.string().optional().nullable(),
    /** An O*NET job title listed under the occupation, or empty. */
    Specialty: z.string().optional().nullable(),
    /** Read-only: the career field of a resume saved before occupations, shown as "previously: X". */
    LegacyField: z.string().optional().nullable(),
    Degree: z.string().optional().nullable(),
    /** ISCED-F 2013 detailed field code, e.g. "0613". */
    FieldOfStudy: z.string().optional().nullable(),
    YearsExperience: z.string().optional().nullable(),
    Summary: z.string().optional().nullable(),
    Skills: z.string().optional().nullable(),
    Experience: z.string().optional().nullable(),
    Education: z.string().optional().nullable(),
    Jobs: z
      .array(
        z.object({
          title: z.string(),
          /** ESCO occupation code, or empty when no occupation fits the title (the months count toward nothing). */
          occupation: z.string().optional(),
          /** Read-only: the job's career field from before occupations. */
          legacyField: z.string().optional(),
          start: z.string(),
          end: z.string(),
          current: z.boolean(),
          description: z.string(),
        }),
      )
      .optional()
      .nullable(),
    Text: z.string().optional().nullable(),
    Source: z.string().optional().nullable(),
  })
  .passthrough();

export const importResumeSchema = z.object({
  data: resumeDataSchema,
  sourceFileName: z.string().optional().nullable(),
  schemaVersion: z.string().optional().nullable(),
});

/** One other occupation in the resume's jobs and the related credit it gives the main one. */
export const relatedOccupationYearsSchema = z.object({
  code: z.string(),
  title: z.string(),
  years: z.number(),
  /** Share of ESCO skill groups shared with the main occupation, 0 to 1. */
  overlap: z.number(),
  /** overlap × 0.3 × years, before the total is rounded and capped. */
  credit: z.number(),
});

/** Read-only, counted by the backend from the saved jobs as the AI counts them. */
export const resumeOccupationYearsSchema = z.object({
  occupation: z.object({ code: z.string(), title: z.string() }),
  /** Years in the main occupation, in half years. */
  years: z.number(),
  /** Total related credit, rounded to 0.1 and at most the main years. */
  related: z.number(),
  others: z.array(relatedOccupationYearsSchema),
});

export const userResumeSchema = importResumeSchema.extend({
  id: z.number().optional(),
  userId: z.number().optional(),
  sourceFileUrl: z.string().optional().nullable(),
  sourceFileMimeType: z.string().optional().nullable(),
  sourceFileSize: z.number().optional().nullable(),
  sourceFilePublicId: z.string().optional().nullable(),
  predictedSeniority: z.string().optional().nullable(),
  predictedSeniorityConfidence: z.number().optional().nullable(),
  predictedSeniorityModel: z.string().optional().nullable(),
  predictedSeniorityMetadata: z.record(z.string(), z.unknown()).optional().nullable(),
  predictedSeniorityAt: z.string().optional().nullable(),
  /** Backend AI queue: QUEUED, PROCESSING, DONE, AI_UNAVAILABLE, NEEDS_INPUT, FAILED. */
  aiStatus: z.string().optional().nullable(),
  aiStatusMessage: z.string().optional().nullable(),
  aiQueuedAt: z.string().optional().nullable(),
  aiAttempts: z.number().optional().nullable(),
  aiInsights: z.record(z.string(), z.unknown()).optional().nullable(),
  occupationYears: resumeOccupationYearsSchema.optional().nullable(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const updateProfileSchema = z.object({
  candidateDiscoverable: z.boolean().optional(),
  name: z
    .string()
    .trim()
    .max(100, "Name must be 100 characters or fewer")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer")
    .optional(),
  birthDay: z
    .string()
    .trim()
    .max(30, "Birthday must be 30 characters or fewer")
    .optional(),
  gender: z
    .string()
    .trim()
    .max(30, "Gender must be 30 characters or fewer")
    .optional(),
  headline: z
    .string()
    .trim()
    .max(160, "Headline must be 160 characters or fewer")
    .optional(),
  bio: z
    .string()
    .trim()
    .max(2000, "Bio must be 2000 characters or fewer")
    .optional(),
  location: z
    .string()
    .trim()
    .max(120, "Location must be 120 characters or fewer")
    .optional(),
  website: z
    .string()
    .trim()
    .max(300, "Website must be 300 characters or fewer")
    .optional(),
});

export const signInSchema = z.object({
  email: z.string().trim().pipe(z.email("Enter a valid email").toLowerCase()),
  password: z
    .string()
    .min(1, "Password is required")
    .max(128, "Password must be 128 characters or fewer"),
});

export const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  email: z.string().trim().pipe(z.email("Enter a valid email").toLowerCase()),
  password: z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password must be 128 characters or fewer"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone must be 30 characters or fewer")
    .optional(),
  birthDay: z
    .string()
    .trim()
    .max(30, "Birthday must be 30 characters or fewer")
    .optional(),
  gender: z
    .string()
    .trim()
    .max(30, "Gender must be 30 characters or fewer")
    .optional(),
  role: z.enum(signupRoles).optional(),
  skill: z.string().trim().optional(),
  certification: z.string().trim().optional(),
});
