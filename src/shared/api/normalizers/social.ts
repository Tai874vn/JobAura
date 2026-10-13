import type {
  ApiResponse, AppNotification, Connection, ConnectionProfile, ConnectionRequests, ConnectionSuggestion,
  CursorPage, FeedAuthor, FeedPage, FeedPost, Job, NotificationPage, PaginatedContent, PostComment,
} from '@/shared/schemas'
import { notificationTypes } from '@/shared/schemas'
import { asRecord, mapApiResponse, pickBoolean, pickNumber, pickString, type ApiRecord } from './core'
import { normalizeJob } from './marketplace'

function normalizeFeedAuthor(raw: unknown): FeedAuthor {
  const record = asRecord(raw);
  return {
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "JobAura member",
    avatar: pickString(record, "avatar") ?? null,
    headline: pickString(record, "headline") ?? null,
  };
}

const notificationTypeSet = new Set<string>(notificationTypes);

function pickNotificationType(record: ApiRecord): AppNotification["type"] {
  const type = pickString(record, "type");
  return type && notificationTypeSet.has(type)
    ? (type as AppNotification["type"])
    : "CHAT_MESSAGE";
}

function normalizeNotificationActor(raw: unknown): AppNotification["actor"] {
  if (!raw || typeof raw !== "object") return null;
  const record = asRecord(raw);
  return {
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "JobAura member",
    avatar: pickString(record, "avatar") ?? null,
    headline: pickString(record, "headline") ?? null,
  };
}

export function normalizeNotification(raw: unknown): AppNotification {
  const record = asRecord(raw);
  const metadata =
    record.metadata && typeof record.metadata === "object"
      ? (record.metadata as Record<string, unknown>)
      : null;
  return {
    id: pickNumber(record, "id") ?? 0,
    recipientId: pickNumber(record, "recipientId") ?? 0,
    actorId: pickNumber(record, "actorId") ?? null,
    type: pickNotificationType(record),
    title: pickString(record, "title") ?? "Notification",
    body: pickString(record, "body") ?? "",
    entityType: pickString(record, "entityType") ?? null,
    entityId: pickNumber(record, "entityId") ?? null,
    actionUrl: pickString(record, "actionUrl") ?? null,
    metadata,
    readAt: pickString(record, "readAt") ?? null,
    createdAt: pickString(record, "createdAt") ?? "",
    updatedAt: pickString(record, "updatedAt"),
    actor: normalizeNotificationActor(record.actor),
  };
}

export function normalizeNotificationsResponse(
  response: ApiResponse<NotificationPage>,
): ApiResponse<NotificationPage> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const nextCursor =
      pickString(record, "nextCursor") ??
      (typeof record.nextCursor === "number"
        ? String(record.nextCursor)
        : null);
    return {
      data: Array.isArray(record.data)
        ? record.data.map(normalizeNotification)
        : [],
      nextCursor,
    };
  });
}

export function normalizePostComment(raw: unknown): PostComment {
  const record = asRecord(raw);
  return {
    id: pickNumber(record, "id") ?? 0,
    postId: pickNumber(record, "postId") ?? 0,
    authorId: pickNumber(record, "authorId") ?? 0,
    parentId: pickNumber(record, "parentId") ?? null,
    replyCount: pickNumber(record, "replyCount") ?? 0,
    content: pickString(record, "content") ?? "",
    createdAt: pickString(record, "createdAt") ?? "",
    updatedAt: pickString(record, "updatedAt"),
    author: normalizeFeedAuthor(record.author),
  };
}

export function normalizeFeedPost(raw: unknown): FeedPost {
  const record = asRecord(raw);
  return {
    id: pickNumber(record, "id") ?? 0,
    content: pickString(record, "content") ?? "",
    imageUrl: pickString(record, "imageUrl") ?? null,
    createdAt: pickString(record, "createdAt") ?? "",
    updatedAt: pickString(record, "updatedAt") ?? "",
    author: normalizeFeedAuthor(record.author),
    likeCount: pickNumber(record, "likeCount") ?? 0,
    commentCount: pickNumber(record, "commentCount") ?? 0,
    viewerHasLiked: pickBoolean(record, "viewerHasLiked") ?? false,
    viewerHasSaved: pickBoolean(record, "viewerHasSaved") ?? false,
    recentComments: Array.isArray(record.recentComments)
      ? record.recentComments.map(normalizePostComment)
      : [],
  };
}

export function normalizeFeedResponse(
  response: ApiResponse<FeedPage>,
): ApiResponse<FeedPage> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    return {
      data: Array.isArray(record.data)
        ? record.data.map(normalizeFeedPost)
        : [],
      nextCursor: pickString(record, "nextCursor") ?? null,
    };
  });
}

export function normalizeSavedJobsResponse(
  response: ApiResponse<CursorPage<Job>>,
): ApiResponse<CursorPage<Job>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    return {
      data: Array.isArray(record.data) ? record.data.map(normalizeJob) : [],
      nextCursor: pickString(record, "nextCursor") ?? null,
    };
  });
}

export function normalizeCursorJobsResponse(
  response: ApiResponse<CursorPage<Job>>,
): ApiResponse<CursorPage<Job>> {
  return normalizeSavedJobsResponse(response);
}

function normalizeConnectionProfile(raw: unknown): ConnectionProfile {
  const record = asRecord(raw);
  const skills = Array.isArray(record.profileSkills)
    ? record.profileSkills
        .map((item) => {
          const skill = asRecord(item);
          return {
            id: pickNumber(skill, "id"),
            name: pickString(skill, "name") ?? "",
            level: pickString(skill, "level") ?? null,
            sortOrder: pickNumber(skill, "sortOrder"),
          };
        })
        .filter((skill) => skill.name)
    : [];
  return {
    id: pickNumber(record, "id") ?? 0,
    name: pickString(record, "name") ?? "JobAura member",
    avatar: pickString(record, "avatar") ?? null,
    headline: pickString(record, "headline") ?? null,
    bio: pickString(record, "bio") ?? null,
    location: pickString(record, "location") ?? null,
    profileSkills: skills,
  };
}

function normalizeConnection(raw: unknown): Connection {
  const record = asRecord(raw);
  const direction = pickString(record, "direction");
  return {
    id: pickNumber(record, "id") ?? 0,
    status: pickString(record, "status") === "PENDING" ? "PENDING" : "ACCEPTED",
    direction:
      direction === "incoming" || direction === "outgoing"
        ? direction
        : undefined,
    createdAt: pickString(record, "createdAt"),
    updatedAt: pickString(record, "updatedAt"),
    user: normalizeConnectionProfile(record.user),
  };
}

export function normalizeConnectionsResponse(
  response: ApiResponse<PaginatedContent<Connection>>,
): ApiResponse<PaginatedContent<Connection>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    return {
      ...content,
      data: Array.isArray(record.data)
        ? record.data.map(normalizeConnection)
        : [],
      pageIndex: pickNumber(record, "pageIndex", "page"),
      pageSize: pickNumber(record, "pageSize"),
      totalRow: pickNumber(record, "totalRow", "total"),
      totalPages: pickNumber(record, "totalPages"),
    };
  });
}

export function normalizeConnectionRequestsResponse(
  response: ApiResponse<ConnectionRequests>,
): ApiResponse<ConnectionRequests> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    return {
      incoming: Array.isArray(record.incoming)
        ? record.incoming.map(normalizeConnection)
        : [],
      outgoing: Array.isArray(record.outgoing)
        ? record.outgoing.map(normalizeConnection)
        : [],
      incomingCount: pickNumber(record, "incomingCount") ?? 0,
    };
  });
}

export function normalizeConnectionSuggestionsResponse(
  response: ApiResponse<PaginatedContent<ConnectionSuggestion>>,
): ApiResponse<PaginatedContent<ConnectionSuggestion>> {
  return mapApiResponse(response, (content) => {
    const record = asRecord(content);
    const data = Array.isArray(record.data)
      ? record.data.map((item) => {
          const itemRecord = asRecord(item);
          return {
            ...normalizeConnectionProfile(item),
            sharedSkills: Array.isArray(itemRecord.sharedSkills)
              ? itemRecord.sharedSkills.filter(
                  (skill): skill is string => typeof skill === "string",
                )
              : [],
            sameLocation: pickBoolean(itemRecord, "sameLocation") ?? false,
            suggestionScore: pickNumber(itemRecord, "suggestionScore") ?? 0,
          };
        })
      : [];
    return {
      ...content,
      data,
      pageIndex: pickNumber(record, "pageIndex", "page"),
      pageSize: pickNumber(record, "pageSize"),
      totalRow: pickNumber(record, "totalRow", "total"),
      totalPages: pickNumber(record, "totalPages"),
    };
  });
}
