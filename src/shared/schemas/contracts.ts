import { z } from 'zod'

/**
 * Shapes of the service-contract answers (proposals, contracts, milestones, wallet).
 * They follow E:/clone/NestjsBE/docs/CONTRACTS.md. Dates stay ISO text; money is whole credits.
 */

export const proposalStatusSchema = z.enum(['OPEN', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED'])
export const contractStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'ENDED'])
export const milestoneStatusSchema = z.enum(['PENDING', 'FUNDED', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'CANCELLED'])
export const amendmentStatusSchema = z.enum(['OPEN', 'ACCEPTED', 'DECLINED', 'WITHDRAWN', 'CANCELLED'])
export const endReasonSchema = z.enum(['FREELANCER_LATE', 'CLIENT_SILENT', 'NOT_FUNDED', 'MUTUAL', 'CLIENT_ENDED'])
export const ledgerTypeSchema = z.enum(['SEED', 'TOP_UP', 'FUND_HOLD', 'RELEASE', 'REFUND'])
/** Which side of a proposal or contract a person is on. Any account role can be either side. */
export const sideSchema = z.enum(['client', 'freelancer'])
export const endChoiceSchema = z.enum(['APPROVE', 'REFUND'])

export const personSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().nullable(),
})

export const jobSummarySchema = z.object({
  id: z.number(),
  title: z.string(),
  image: z.string().nullable(),
  price: z.number(),
})

/** One row of the timeline. `data` depends on `type` (see CONTRACTS.md section 6), and may be `{}`. */
export const contractEventSchema = z.object({
  id: z.number(),
  type: z.string(),
  data: z.unknown(),
  actor: personSummarySchema.nullable(),
  proposalId: z.number().nullable(),
  contractId: z.number().nullable(),
  createdAt: z.string(),
})

export const milestoneInputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  dueDate: z.string(),
  amount: z.number(),
})

export const versionBodySchema = z.object({
  brief: z.string(),
  referenceLinks: z.array(z.string()),
  referenceImages: z.array(z.string()),
  deadline: z.string(),
  milestones: z.array(milestoneInputSchema),
})

export const createProposalBodySchema = versionBodySchema.extend({ jobId: z.number() })

export const proposalVersionSchema = z.object({
  id: z.number(),
  number: z.number(),
  authorId: z.number(),
  total: z.number(),
  createdAt: z.string(),
  brief: z.string(),
  // The backend saves null as [], but read it defensively.
  referenceLinks: z.array(z.string()).nullish().transform((v) => v ?? []),
  referenceImages: z.array(z.string()).nullish().transform((v) => v ?? []),
  deadline: z.string(),
  milestones: z.array(
    z.object({
      title: z.string(),
      description: z.string().nullish(),
      dueDate: z.string(),
      amount: z.number(),
    }),
  ),
})

export const proposalDetailSchema = z.object({
  id: z.number(),
  status: proposalStatusSchema,
  job: jobSummarySchema,
  client: personSummarySchema,
  freelancer: personSummarySchema,
  latestVersion: z.number(),
  turnUserId: z.number().nullable(),
  expiresAt: z.string(),
  declineNote: z.string().nullable(),
  decidedAt: z.string().nullable(),
  /** Oldest first. */
  versions: z.array(proposalVersionSchema),
  contractId: z.number().nullable(),
  viewerRole: sideSchema,
  /** Oldest first. */
  events: z.array(contractEventSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
})

export const proposalListItemSchema = z.object({
  id: z.number(),
  status: proposalStatusSchema,
  job: jobSummarySchema,
  client: personSummarySchema,
  freelancer: personSummarySchema,
  latestVersion: z.number(),
  turnUserId: z.number().nullable(),
  total: z.number(),
  deadline: z.string(),
  expiresAt: z.string(),
  updatedAt: z.string(),
  viewerRole: sideSchema,
})

export const submissionSchema = z.object({
  id: z.number(),
  number: z.number(),
  note: z.string(),
  images: z.array(z.string()),
  links: z.array(z.string()),
  feedback: z.string().nullable(),
  createdAt: z.string(),
})

export const milestoneSchema = z.object({
  id: z.number(),
  position: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  dueDate: z.string(),
  amount: z.number(),
  status: milestoneStatusSchema,
  fundedAt: z.string().nullable(),
  submittedAt: z.string().nullable(),
  changesRequestedAt: z.string().nullable(),
  approvedAt: z.string().nullable(),
  /** True when the sweeper (the background job) approved it. */
  autoApproved: z.boolean(),
  /** Which day-2 warnings were already sent. */
  warnings: z.object({ late: z.boolean(), silent: z.boolean(), unfunded: z.boolean() }),
  /** Newest first. */
  submissions: z.array(submissionSchema),
})

export const amendmentChangeSchema = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('add'),
    title: z.string(),
    description: z.string().optional(),
    dueDate: z.string(),
    amount: z.number(),
  }),
  z.object({ op: z.literal('move'), milestoneId: z.number(), dueDate: z.string() }),
  z.object({ op: z.literal('amount'), milestoneId: z.number(), amount: z.number() }),
])

export const amendmentSchema = z.object({
  id: z.number(),
  status: amendmentStatusSchema,
  proposerId: z.number(),
  note: z.string().nullable(),
  deadline: z.string().nullable(),
  changes: z.array(amendmentChangeSchema),
  declineNote: z.string().nullable(),
  createdAt: z.string(),
  decidedAt: z.string().nullable(),
})

export const endRequestSchema = z.object({
  byUserId: z.number(),
  note: z.string().nullable(),
  choice: endChoiceSchema.nullable(),
  requestedAt: z.string(),
})

export const contractReviewSchema = z.object({
  id: z.number(),
  rating: z.number(),
  content: z.string(),
})

export const contractDetailSchema = z.object({
  id: z.number(),
  status: contractStatusSchema,
  endReason: endReasonSchema.nullable(),
  /** True for a contract copied from an old hire. */
  imported: z.boolean(),
  title: z.string(),
  brief: z.string(),
  referenceLinks: z.array(z.string()),
  referenceImages: z.array(z.string()),
  deadline: z.string(),
  job: jobSummarySchema,
  client: personSummarySchema,
  freelancer: personSummarySchema,
  proposalId: z.number().nullable(),
  total: z.number(),
  paid: z.number(),
  held: z.number(),
  remaining: z.number(),
  /** By position. */
  milestones: z.array(milestoneSchema),
  /** Newest first. */
  amendments: z.array(amendmentSchema),
  endRequest: endRequestSchema.nullable(),
  review: contractReviewSchema.nullable(),
  canReview: z.boolean(),
  /** Length of every deadline window on this server, in minutes (4320 = 3 days). */
  graceMinutes: z.number(),
  /** Oldest first. */
  events: z.array(contractEventSchema),
  viewerRole: sideSchema,
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  endedAt: z.string().nullable(),
})

export const contractListItemSchema = z.object({
  id: z.number(),
  status: contractStatusSchema,
  endReason: endReasonSchema.nullable(),
  title: z.string(),
  job: jobSummarySchema,
  client: personSummarySchema,
  freelancer: personSummarySchema,
  total: z.number(),
  paid: z.number(),
  held: z.number(),
  /** The first milestone that is not APPROVED or CANCELLED. */
  currentMilestone: z
    .object({
      id: z.number(),
      position: z.number(),
      title: z.string(),
      status: milestoneStatusSchema,
      dueDate: z.string(),
      amount: z.number(),
      submittedAt: z.string().nullable(),
    })
    .nullable(),
  milestoneCount: z.number(),
  hasOpenAmendment: z.boolean(),
  endRequestedById: z.number().nullable(),
  viewerRole: sideSchema,
  updatedAt: z.string(),
})

export const walletSummarySchema = z.object({
  available: z.number(),
  held: z.number(),
  /** Credits I paid to freelancers. */
  paidOut: z.number(),
  /** Credits I earned as a freelancer. */
  earned: z.number(),
  topUp: z.object({
    enabled: z.boolean(),
    minCredits: z.number(),
    maxCredits: z.number(),
    vndPerCredit: z.number(),
    currency: z.string().default('usd'),
    centsPerCredit: z.number().default(5),
  }),
})

export const ledgerEntrySchema = z.object({
  id: z.number(),
  type: ledgerTypeSchema,
  availableDelta: z.number(),
  heldDelta: z.number(),
  availableAfter: z.number(),
  heldAfter: z.number(),
  contract: z.object({ id: z.number(), title: z.string() }).nullable(),
  milestone: z.object({ id: z.number(), position: z.number(), title: z.string() }).nullable(),
  counterparty: personSummarySchema.nullable(),
  topUpId: z.number().nullable(),
  createdAt: z.string(),
})

export const topUpResultSchema = z.object({
  status: z.enum(['PAID', 'FAILED', 'PENDING']),
  credits: z.number(),
  available: z.number(),
})
