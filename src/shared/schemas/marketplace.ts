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
  /** Where the work happens. Missing means REMOTE. */
  workMode: z.enum(['REMOTE', 'ONSITE', 'BOTH']).optional(),
  /** Area for on-site work; null for REMOTE. */
  serviceArea: z.string().nullish(),
  /** Steps that pre-fill a proposal; `share` is a whole percent and all shares add up to 100. */
  milestoneTemplate: z
    .array(z.object({ title: z.string(), description: z.string().nullish(), share: z.number() }))
    .nullish(),
});

export const hiringPostStatusSchema = z.enum(["OPEN", "CLOSED"]);
/**
 * The 8 steps of an application. Four are active (APPLIED, REVIEWING, INTERVIEWING, OFFERED) and four are
 * final (HIRED, REJECTED, DECLINED, WITHDRAWN). The backend renamed ACCEPTED to HIRED.
 */
export const hiringApplicationStatusSchema = z.enum([
  "APPLIED",
  "REVIEWING",
  "INTERVIEWING",
  "OFFERED",
  "HIRED",
  "REJECTED",
  "DECLINED",
  "WITHDRAWN",
]);

/** Why an application was rejected without the recruiter choosing it (the "sweep" when a post closes or fills). */
export const hiringStatusReasonSchema = z.enum(["POSITION_FILLED", "POST_CLOSED"]);

/** The 5 steps that move forward; the recruiter's pipeline numbers on a post card have all of them. */
export const hiringPipelineCountsSchema = z.object({
  APPLIED: z.number().default(0),
  REVIEWING: z.number().default(0),
  INTERVIEWING: z.number().default(0),
  OFFERED: z.number().default(0),
  HIRED: z.number().default(0),
});

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
  /** ISO 4217; posts saved before units were added are USD. */
  salaryCurrency: z.string().optional().nullable(),
  /** What the salary range is per; month for posts saved before units were added. */
  salaryPeriod: z.enum(['month', 'year', 'hour']).optional().nullable(),
  companyName: z.string().optional().nullable(),
  /** ESCO occupation code the recruiter chose; null on a post saved before occupations. */
  occupationCode: z.string().optional().nullable(),
  /** The occupation's ESCO title (lower case), added by the backend to each card. */
  occupationTitle: z.string().optional().nullable(),
  specialty: z.string().optional().nullable(),
  /** The old 37-field value of a post saved before occupations. Read-only; never sent. */
  legacyField: z.string().optional().nullable(),
  yearsRequired: z.number().optional().nullable(),
  skills: z.array(z.string()).optional().default([]),
  closesAt: z.string().optional().nullable(),
  /** Backend AI level queue: QUEUED, PROCESSING, DONE, AI_UNAVAILABLE, NEEDS_INPUT, FAILED. */
  aiStatus: z.string().optional().nullable(),
  aiStatusMessage: z.string().optional().nullable(),
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
  /** How many people the post hires; null means no limit. */
  openings: z.number().nullable().optional(),
  /** Applications in HIRED. */
  hiredCount: z.number().optional(),
  /** Applications in OFFERED (an offer is waiting for an answer). */
  offersWaiting: z.number().optional(),
  /** Only on the owner's own post cards. */
  pipeline: hiringPipelineCountsSchema.optional(),
  viewerHasApplied: z.boolean().optional().default(false),
  /** The viewer's own application to this post (a withdrawn one too); null for guests, recruiters and non-applicants. */
  viewerApplication: z
    .object({ id: z.number(), status: hiringApplicationStatusSchema, statusReason: hiringStatusReasonSchema.nullish() })
    .nullish(),
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
  /** POSITION_FILLED or POST_CLOSED after a sweep; null when a person made the change. */
  statusReason: hiringStatusReasonSchema.nullish(),
  statusNote: z.string().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  hiringPost: hiringPostSchema.optional(),
  applicant: userProfileSchema.optional(),
});

export const interviewModeSchema = z.enum(["ONLINE", "ONSITE", "PHONE"]);
export const interviewStatusSchema = z.enum([
  "PROPOSED",
  "RESCHEDULE_REQUESTED",
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
]);

/** One interview round. Times are ISO strings in UTC. */
export const interviewSchema = z.object({
  id: z.number(),
  applicationId: z.number().optional(),
  round: z.number(),
  mode: interviewModeSchema,
  durationMinutes: z.number().default(45),
  location: z.string().nullish(),
  note: z.string().nullish(),
  proposedTimes: z.array(z.string()).default([]),
  scheduledAt: z.string().nullish(),
  status: interviewStatusSchema,
  rescheduleNote: z.string().nullish(),
  createdById: z.number().optional(),
  completedAt: z.string().nullish(),
  cancelledAt: z.string().nullish(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

/** A row of the application history. `type` is kept as text so a new backend type does not break the page. */
export const applicationEventSchema = z.object({
  id: z.number(),
  type: z.string(),
  /** Depends on the type (for example { reason, note } for "rejected"); null when there is none. */
  data: z.record(z.string(), z.unknown()).nullish(),
  createdAt: z.string(),
  actor: z.object({ id: z.number(), name: z.string() }).nullish(),
});

/** The resume part a recruiter reads; null when the candidate has no saved resume. */
export const applicationResumeSchema = z.object({
  occupation: z.string().nullish(),
  occupationTitle: z.string().nullish(),
  years: z.number().nullish(),
  relatedYears: z.number().nullish(),
  level: z.string().nullish(),
  jobs: z.array(z.unknown()).default([]),
  degree: z.string().nullish(),
  skills: z.array(z.string()).default([]),
});

/** GET /applications/:id and the content of every action on an application. */
export const applicationDetailSchema = hiringApplicationSchema
  .omit({ applicant: true })
  .extend({
    offerNote: z.string().nullish(),
    offeredAt: z.string().nullish(),
    decidedAt: z.string().nullish(),
    applicant: z
      .object({
        id: z.number(),
        name: z.string(),
        avatar: z.string().nullish(),
        headline: z.string().nullish(),
        location: z.string().nullish(),
        profileSkills: z.array(profileSkillSchema).default([]),
      })
      .optional(),
    resume: applicationResumeSchema.nullish(),
    /** The "my applications" list sends cards without these two, so they default to empty. */
    interviews: z.array(interviewSchema).default([]),
    events: z.array(applicationEventSchema).default([]),
    /** Which side the viewer is: the applicant is the candidate; the post owner or an admin is the recruiter. */
    viewerRole: z.enum(["candidate", "recruiter"]).optional(),
  });

/** One item of GET /interviews/upcoming. */
export const upcomingInterviewSchema = interviewSchema.extend({
  applicationId: z.number(),
  post: z.object({ id: z.number(), title: z.string(), companyName: z.string().nullish() }),
  otherPerson: z.object({ id: z.number(), name: z.string(), avatar: z.string().nullish() }),
  viewerRole: z.enum(["candidate", "recruiter"]),
});

export const recommendationLabelSchema = z.enum([
  "high_match",
  "medium_match",
  "low_match",
]);

export const candidateDirectoryStatsSchema = z.object({
  portfolioItems: z.coerce.number().default(0),
  /** Portfolio posts the candidate published (the backend still calls them listed services). */
  listedServices: z.coerce.number().default(0),
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
  /**
   * From the candidate's resume: the ESCO occupation and specialty, the AI level, and the years the level was
   * decided on (years in the occupation and related years, kept separate). Level and years are null without a
   * saved prediction. Null without a resume.
   */
  career: z
    .object({
      occupationCode: z.string().nullable(),
      occupationTitle: z.string().nullable(),
      specialty: z.string().nullable(),
      level: z.string().nullable(),
      yearsInOccupation: z.number().nullable(),
      relatedYears: z.number().nullable(),
      legacyField: z.string().nullable(),
    })
    .nullable()
    .optional(),
  /** Profile strength, 0-100: the same number the candidate sees in Settings. */
  profileStrength: z.number().nullable().optional(),
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
  workMode: z.enum(["REMOTE", "ONSITE", "BOTH"]).default("REMOTE"),
  /** Null for remote work. */
  serviceArea: z.string().trim().max(160, "The area is at most 160 characters.").nullish(),
  /** Null for no template; otherwise 1-10 steps whose shares add up to 100 (the form checks this). */
  milestoneTemplate: z
    .array(
      z.object({
        title: z.string().trim().min(1).max(80),
        description: z.string().trim().max(300).optional(),
        share: z.number().int().min(1).max(100),
      }),
    )
    .max(10)
    .nullish(),
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

