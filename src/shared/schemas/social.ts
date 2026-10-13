import { z } from 'zod'
import { profileSkillSchema } from './users'

export const feedAuthorSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
});

export const postCommentSchema = z.object({
  id: z.number(),
  postId: z.number(),
  authorId: z.number(),
  parentId: z.number().nullable().default(null),
  replyCount: z.number().int().nonnegative().default(0),
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  author: feedAuthorSchema,
});

export const postCommentContentSchema = z.string().trim().min(1, 'Enter a comment').max(1000, 'Comments must be 1,000 characters or fewer');

export const feedPostSchema = z.object({
  id: z.number(),
  content: z.string(),
  imageUrl: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  author: feedAuthorSchema,
  likeCount: z.number().int().nonnegative(),
  commentCount: z.number().int().nonnegative(),
  viewerHasLiked: z.boolean(),
  viewerHasSaved: z.boolean(),
  recentComments: z.array(postCommentSchema).default([]),
});

export const feedPageSchema = z.object({
  data: z.array(feedPostSchema).default([]),
  nextCursor: z.string().nullable(),
});

export const connectionProfileSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  profileSkills: z.array(profileSkillSchema).default([]),
});

export const connectionSchema = z.object({
  id: z.number(),
  status: z.enum(["PENDING", "ACCEPTED"]),
  direction: z.enum(["incoming", "outgoing"]).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  user: connectionProfileSchema,
});

export const connectionSuggestionSchema = connectionProfileSchema.extend({
  sharedSkills: z.array(z.string()).default([]),
  sameLocation: z.boolean().default(false),
  suggestionScore: z.number().default(0),
});

export const connectionStatusSchema = z.object({
  state: z.enum([
    "self",
    "none",
    "incoming_pending",
    "outgoing_pending",
    "connected",
  ]),
  connectionId: z.number().nullable(),
});

export const chatUserSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  email: z.string().optional(),
  lastReadAt: z.string().optional().nullable(),
});

export const chatMessageSchema = z.object({
  id: z.number(),
  content: z.string(),
  roomId: z.number(),
  sender: chatUserSchema,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const chatRoomSchema = z.object({
  id: z.number(),
  name: z.string().nullable(),
  isGroup: z.boolean(),
  members: z.array(chatUserSchema).default([]),
  lastMessage: chatMessageSchema.nullable().optional(),
  unreadCount: z.number().default(0),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const notificationTypes = [
  "CONNECTION_REQUEST",
  "CONNECTION_ACCEPTED",
  "POST_LIKE",
  "POST_COMMENT",
  "HIRE_CREATED",
  "HIRE_COMPLETED",
  "CHAT_MESSAGE",
] as const;

export const notificationActorSchema = z.object({
  id: z.number(),
  name: z.string(),
  avatar: z.string().optional().nullable(),
  headline: z.string().optional().nullable(),
});

export const notificationSchema = z.object({
  id: z.number(),
  recipientId: z.number(),
  actorId: z.number().nullable().optional(),
  type: z.enum(notificationTypes),
  title: z.string(),
  body: z.string(),
  entityType: z.string().optional().nullable(),
  entityId: z.number().optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
  readAt: z.string().optional().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  actor: notificationActorSchema.optional().nullable(),
});
