import { z } from 'zod'
import { paginatedContentSchema, paginationParamsSchema } from './common'
import {
  importResumeSchema, profileCertificationSchema, profilePortfolioItemSchema, profileSkillSchema,
  resumeDataSchema, resumeOccupationYearsSchema, signInSchema, signUpSchema, updateProfileSchema, userProfileSchema,
  userResumeSchema, userSchema,
} from './users'
import {
  applyHiringPostSchema, candidateProfileSchema, commentSchema, createCommentSchema, createHiringPostSchema,
  createJobSchema, hiringApplicationSchema, hiringPostSchema, subcategorySchema, jobSchema,
  categorySchema, recommendationLabelSchema, recommendationScoreSchema, recommendedCandidateSchema,
  recommendedJobSchema, updateJobSchema, hiringApplicationStatusSchema, hiringStatusReasonSchema,
  hiringPipelineCountsSchema, interviewSchema, applicationEventSchema, applicationDetailSchema,
  upcomingInterviewSchema,
} from './marketplace'
import {
  proposalStatusSchema, contractStatusSchema, milestoneStatusSchema, amendmentStatusSchema, endReasonSchema,
  ledgerTypeSchema, sideSchema, endChoiceSchema, personSummarySchema, jobSummarySchema, contractEventSchema,
  versionBodySchema, createProposalBodySchema, proposalVersionSchema, proposalDetailSchema, proposalListItemSchema,
  submissionSchema, milestoneSchema, amendmentChangeSchema, amendmentSchema, endRequestSchema, contractDetailSchema,
  contractListItemSchema, walletSummarySchema, ledgerEntrySchema, topUpResultSchema,
} from './contracts'
import {
  chatMessageSchema, chatRoomSchema, chatUserSchema, connectionProfileSchema, connectionSchema,
  connectionStatusSchema, connectionSuggestionSchema, feedAuthorSchema, feedPageSchema, feedPostSchema,
  notificationSchema, postCommentSchema,
} from './social'

export type ApiResponse<T> = {
  statusCode?: number;
  message?: string | string[];
  content?: T;
  dateTime?: string;
};
export type PaginatedContent<T> = z.infer<
  ReturnType<typeof paginatedContentSchema<z.ZodType<T>>>
>;
export type PaginationParams = z.infer<typeof paginationParamsSchema>;
export type User = z.infer<typeof userSchema>;
export type ProfileSkill = z.infer<typeof profileSkillSchema>;
export type ProfileCertification = z.infer<typeof profileCertificationSchema>;
export type ProfilePortfolioItem = z.infer<typeof profilePortfolioItemSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type ResumeData = z.infer<typeof resumeDataSchema>;
export type ImportResume = z.infer<typeof importResumeSchema>;
export type UserResume = z.infer<typeof userResumeSchema>;
export type ResumeOccupationYears = z.infer<typeof resumeOccupationYearsSchema>;
export type UpdateProfile = z.infer<typeof updateProfileSchema>;
export type SignIn = z.infer<typeof signInSchema>;
export type SignUp = z.infer<typeof signUpSchema>;
export type Job = z.infer<typeof jobSchema>;
export type HiringPost = z.infer<typeof hiringPostSchema>;
export type CreateHiringPost = z.infer<typeof createHiringPostSchema>;
export type ApplyHiringPost = z.infer<typeof applyHiringPostSchema>;
export type HiringApplication = z.infer<typeof hiringApplicationSchema>;
export type ApplicationStatus = z.infer<typeof hiringApplicationStatusSchema>;
export type HiringStatusReason = z.infer<typeof hiringStatusReasonSchema>;
export type HiringPipelineCounts = z.infer<typeof hiringPipelineCountsSchema>;
export type Interview = z.infer<typeof interviewSchema>;
export type ApplicationEvent = z.infer<typeof applicationEventSchema>;
export type ApplicationDetail = z.infer<typeof applicationDetailSchema>;
export type UpcomingInterview = z.infer<typeof upcomingInterviewSchema>;
export type RecommendationLabel = z.infer<typeof recommendationLabelSchema>;
export type RecommendationScore = z.infer<typeof recommendationScoreSchema>;
export type RecommendedJob = z.infer<typeof recommendedJobSchema>;
export type RecommendedCandidate = z.infer<typeof recommendedCandidateSchema>;
export type RecommendationContent<T> = {
  data: T[];
  model?: string;
  elapsedMs?: number;
  generatedAt?: string | null;
  quota?: RecommendationQuota;
  cache?: {
    hit: boolean;
    ttlSeconds: number;
    source?: "redis" | "database";
  };
};
export type RecommendationQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
};
export type CandidateDirectoryParams = PaginationParams & {
  skill?: string;
  location?: string;
  hasPortfolio?: boolean;
  hasCertification?: boolean;
  /** ESCO occupation code: candidates whose main occupation it is. */
  occupation?: string;
  /** With `occupation`, also candidates whose main occupation is related to it. */
  includeRelated?: boolean;
  level?: string;
  minYears?: number;
};
export type JobSearchParams = PaginationParams & {
  categoryId?: number;
  subcategoryId?: number;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sort?: "newest" | "price_asc" | "price_desc" | "rating_desc";
};
export type CreateJob = z.infer<typeof createJobSchema>;
export type UpdateJob = z.infer<typeof updateJobSchema>;
export type Category = z.infer<typeof categorySchema>;
export type Subcategory = z.infer<typeof subcategorySchema>;
export type Comment = z.infer<typeof commentSchema>;
export type CreateComment = z.infer<typeof createCommentSchema>;
export type FeedAuthor = z.infer<typeof feedAuthorSchema>;
export type PostComment = z.infer<typeof postCommentSchema>;
export type FeedPost = z.infer<typeof feedPostSchema>;
export type FeedPage = z.infer<typeof feedPageSchema>;
export type FeedStats = { posts: number; reactions: number };
export type CursorPage<T> = { data: T[]; nextCursor: string | null };
export type ConnectionProfile = z.infer<typeof connectionProfileSchema>;
export type Connection = z.infer<typeof connectionSchema>;
export type ConnectionSuggestion = z.infer<typeof connectionSuggestionSchema>;
export type ConnectionStatus = z.infer<typeof connectionStatusSchema>;
export type ConnectionRequests = {
  incoming: Connection[];
  outgoing: Connection[];
  incomingCount: number;
};
export type ChatRoom = z.infer<typeof chatRoomSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatUser = z.infer<typeof chatUserSchema>;
export type NotificationType = z.infer<typeof notificationSchema>["type"];
export type AppNotification = z.infer<typeof notificationSchema>;
export type NotificationPage = {
  data: AppNotification[];
  nextCursor: string | null;
};

export type ProposalStatus = z.infer<typeof proposalStatusSchema>;
export type ContractStatus = z.infer<typeof contractStatusSchema>;
export type MilestoneStatus = z.infer<typeof milestoneStatusSchema>;
export type AmendmentStatus = z.infer<typeof amendmentStatusSchema>;
export type EndReason = z.infer<typeof endReasonSchema>;
export type LedgerType = z.infer<typeof ledgerTypeSchema>;
export type Side = z.infer<typeof sideSchema>;
export type EndChoice = z.infer<typeof endChoiceSchema>;
export type PersonSummary = z.infer<typeof personSummarySchema>;
export type JobSummary = z.infer<typeof jobSummarySchema>;
export type ContractEventView = z.infer<typeof contractEventSchema>;
export type VersionBody = z.infer<typeof versionBodySchema>;
export type CreateProposalBody = z.infer<typeof createProposalBodySchema>;
export type ProposalVersionView = z.infer<typeof proposalVersionSchema>;
export type ProposalDetail = z.infer<typeof proposalDetailSchema>;
export type ProposalListItem = z.infer<typeof proposalListItemSchema>;
export type SubmissionView = z.infer<typeof submissionSchema>;
export type MilestoneView = z.infer<typeof milestoneSchema>;
export type AmendmentChange = z.infer<typeof amendmentChangeSchema>;
export type AmendmentView = z.infer<typeof amendmentSchema>;
export type EndRequestView = z.infer<typeof endRequestSchema>;
export type ContractDetail = z.infer<typeof contractDetailSchema>;
export type ContractListItem = z.infer<typeof contractListItemSchema>;
export type WalletSummary = z.infer<typeof walletSummarySchema>;
export type LedgerEntryView = z.infer<typeof ledgerEntrySchema>;
export type TopUpResult = z.infer<typeof topUpResultSchema>;
