import { z } from 'zod'
import { profileSkillSchema, userProfileSchema, userSchema } from './users'

const baseCategorySchema = z.object({
  id: z.number(),
  name: z.string(),
});

export const subcategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  image: z.string().optional().nullable(),
  categoryId: z.number().optional(),
  category: baseCategorySchema.optional(),
});

export const categorySchema = baseCategorySchema.extend({
  subcategories: z.array(subcategorySchema).optional(),
});

export const jobSchema = z.object({
  id: z.number(),
  title: z.string(),
  price: z.number(),
  shortDescription: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  subcategoryId: z.number().optional(),
  creatorId: z.number().optional(),
  image: z.string().optional().nullable(),
  reviews: z.number().optional().default(0),
  rating: z.number().optional().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  subcategory: subcategorySchema.optional(),
  user: userSchema.pick({ id: true, name: true, avatar: true }).optional(),
});

export const hiringPostStatusSchema = z.enum(["OPEN", "CLOSED"]);
export const hiringApplicationStatusSchema = z.enum([
  "APPLIED",
  "REVIEWING",
  "ACCEPTED",
  "REJECTED",
  "WITHDRAWN",
]);

export const hiringPostSchema = z.object({
  id: z.number(),
  recruiterId: z.number(),
  title: z.string(),
  description: z.string(),
  requirements: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  employmentType: z.string().optional().nullable(),
  salaryMin: z.number().optional().nullable(),
  salaryMax: z.number().optional().nullable(),
  companyName: z.string().optional().nullable(),
  careerField: z.string().optional().nullable(),
  yearsRequired: z.number().optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  closesAt: z.string().optional().nullable(),
  predictedSeniority: z.string().optional().nullable(),
  predictedSeniorityConfidence: z.number().optional().nullable(),
  predictedSeniorityModel: z.string().optional().nullable(),
  predictedSeniorityAt: z.string().optional().nullable(),
  status: hiringPostStatusSchema.default("OPEN"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  recruiter: userSchema
    .pick({ id: true, name: true, avatar: true })
    .extend({
      headline: z.string().optional().nullable(),
    })
    .optional(),
  applicationCount: z.number().optional().default(0),
  viewerHasApplied: z.boolean().optional().default(false),
});

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
    /** One of the 37 career fields; the form offers only those. */
    careerField: z.string().trim().min(1, "Choose the field of work"),
    yearsRequired: z.coerce
      .number({ message: "Enter the years of experience required" })
      .int("Use whole years")
      .min(0, "Years cannot be negative")
      .max(40, "Use 40 years or fewer"),
    skills: z.array(z.string()).max(20, "Pick up to 20 skills").optional(),
    /** A date (YYYY-MM-DD) after which the post is no longer listed. */
    closesAt: z.string().optional(),
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

export const applyHiringPostSchema = z.object({
  coverLetter: z
    .string()
    .trim()
    .max(3000, "Message must be 3000 characters or fewer")
    .optional(),
});

export const hiringApplicationSchema = z.object({
  id: z.number(),
  hiringPostId: z.number(),
  applicantId: z.number(),
  coverLetter: z.string().optional().nullable(),
  status: hiringApplicationStatusSchema,
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  hiringPost: hiringPostSchema.optional(),
  applicant: userProfileSchema.optional(),
});

export const recommendationLabelSchema = z.enum([
  "high_match",
  "medium_match",
  "low_match",
]);

export const candidateDirectoryStatsSchema = z.object({
  portfolioItems: z.coerce.number().default(0),
  certifications: z.coerce.number().default(0),
  completedWork: z.coerce.number().default(0),
  rating: z.coerce.number().default(0),
});

export const candidateDirectoryMatchSchema = z.object({
  score: z.coerce.number().min(0).max(1),
  label: recommendationLabelSchema,
  keywordScore: z.coerce.number().min(0).max(1).default(0),
  skillScore: z.coerce.number().min(0).max(1).default(0),
  locationScore: z.coerce.number().min(0).max(1).default(0),
  qualityScore: z.coerce.number().min(0).max(1).default(0),
});

export const candidateProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  profileSkills: z.array(profileSkillSchema).default([]),
  stats: candidateDirectoryStatsSchema,
  /** From the candidate's resume: chosen field, AI level, and years in that field. Null without a resume. */
  career: z
    .object({
      careerField: z.string().nullable(),
      level: z.string().nullable(),
      yearsInField: z.number().nullable(),
    })
    .nullable()
    .optional(),
  match: candidateDirectoryMatchSchema,
});

export const recommendationScoreSchema = z.object({
  rank: z.coerce.number().int().positive(),
  aiScore: z.coerce.number().min(0).max(1),
  finalScore: z.coerce.number().min(0).max(1),
  label: recommendationLabelSchema,
  isMatch: z.boolean().optional(),
  matchLabel: z.enum(["match", "no_match"]).optional(),
  decision: z.enum(["match", "no_match"]).optional(),
  threshold: z.coerce.number().min(0).max(1).optional(),
  source: z.enum(["embedding_rerank", "classifier"]).optional(),
  skillScore: z.coerce.number().min(0).max(1).optional().default(0),
  seniorityScore: z.coerce.number().min(0).max(1).optional().default(0),
  categoryScore: z.coerce.number().min(0).max(1).optional().default(0),
  requiredSkills: z.array(z.string()).optional().default([]),
  matchedSkills: z.array(z.string()).optional().default([]),
  missingSkills: z.array(z.string()).optional().default([]),
  improvementTips: z.array(z.string()).optional().default([]),
});

/** A hiring post ranked for the signed-in candidate's resume. */
export const recommendedJobSchema = hiringPostSchema.extend({
  recommendation: recommendationScoreSchema,
});

export const recommendedCandidateSchema = userProfileSchema.extend({
  recommendation: recommendationScoreSchema,
});

export const createJobSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Service title is required")
    .max(160, "Service title must be 160 characters or fewer"),
  /** Optional rate; 0 means a portfolio post with no price. */
  price: z.coerce.number().min(0, "The rate cannot be negative").default(0),
  shortDescription: z
    .string()
    .trim()
    .max(500, "Short description must be 500 characters or fewer")
    .optional(),
  description: z
    .string()
    .trim()
    .max(5000, "Description must be 5000 characters or fewer")
    .optional(),
  subcategoryId: z.coerce.number().min(1, "Choose the kind of work"),
  reviews: z.coerce.number().default(0),
  rating: z.coerce.number().min(0).max(5).default(0),
});

export const updateJobSchema = createJobSchema.partial();

export const commentSchema = z.object({
  id: z.number(),
  jobId: z.number(),
  commenterId: z.number().optional(),
  commentedAt: z.string().optional(),
  content: z.string(),
  rating: z.number(),
  user: userSchema.pick({ id: true, name: true, avatar: true }).optional(),
});

export const createCommentSchema = z.object({
  jobId: z.number(),
  content: z
    .string()
    .trim()
    .min(1, "Comment is required")
    .max(2000, "Comment must be 2000 characters or fewer"),
  rating: z.coerce.number().min(1).max(5),
});

export const hireSchema = z.object({
  id: z.number(),
  jobId: z.number(),
  hirerId: z.number().optional(),
  hiredAt: z.string().optional(),
  completed: z.boolean().optional(),
  job: jobSchema.optional(),
});
