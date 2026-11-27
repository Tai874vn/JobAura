/**
 * Formatting and routing helpers for notifications. Builds the display headline, context label, detail text, relative time, chat room ID, and safe destination URL for each notification type.
 *
 * Calls: safeInternalPath; credits; formatPipelineTime
 * Used by:
 *   - features/notifications/components/notification-bell.tsx
 *   - features/notifications/components/notification-list.tsx
 *   - features/notifications/utils/notification-cache.ts
 */

import type { AppNotification } from '@/shared/schemas'
import { safeInternalPath } from '@/shared/lib/session-routing'
import { credits } from '@/shared/lib/credits'
import { formatPipelineTime } from '@/features/hiring-pipeline/utils/format-time'

export function roomIdFromNotification(notification: AppNotification) {
  const roomId = notification.metadata?.roomId
  if (typeof roomId === 'number') return roomId
  if (typeof roomId === 'string') {
    const parsed = Number(roomId)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function safeInternalActionUrl(value: string | null | undefined) {
  return safeInternalPath(value)
}

function isPipelineNotification(notification: AppNotification) {
  return notification.type === 'APPLICATION_RECEIVED'
    || notification.type === 'APPLICATION_UPDATE'
    || notification.type === 'INTERVIEW_UPDATE'
}

/**
 * Headline of the 3 hiring pipeline types, from the payload fields the server adds (`kind`, `actorName`,
 * `postTitle`, `scheduledAt`). An older notification without them shows the server's title.
 */
function pipelineHeadline(notification: AppNotification) {
  const kind = metadataString(notification, 'kind')
  const actorName = metadataString(notification, 'actorName') ?? notification.actor?.name?.trim()
  const postTitle = metadataString(notification, 'postTitle')
  if (kind === 'received' && actorName && postTitle) return `${actorName} applied for ${postTitle}`
  if (kind === 'interview') {
    // The time is shown in the viewer's own time zone, like everywhere else in the pipeline.
    const time = formatPipelineTime(metadataString(notification, 'scheduledAt') ?? '')
    if (time) return `Interview booked for ${time}`
  }
  return notification.title
}

function isContractNotification(notification: AppNotification) {
  return notification.type === 'PROPOSAL_UPDATE' || notification.type === 'CONTRACT_UPDATE'
}

function metadataNumber(notification: AppNotification, key: string) {
  const value = notification.metadata?.[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) return Number(value)
  return null
}

/**
 * Headline of a proposal or contract notification, from `metadata.step` (the event name), `actorName` and `title`
 * (the service or proposal title). The milestone number and the amount are added when the server sends them
 * (`position`, `amount`, `rule`, `jobTitle`); without them the headline stays general and the body (detail line) has the number.
 * A step this app does not know shows the server's title.
 */
function contractHeadline(notification: AppNotification) {
  const step = metadataString(notification, 'step')
  const actor = metadataString(notification, 'actorName') ?? notification.actor?.name?.trim() ?? 'Someone'
  // `jobTitle` is the service name. (`metadata.title` is the notification's own title, so it is never used here.)
  const jobTitle = metadataString(notification, 'jobTitle')
  const forTitle = jobTitle ? ` for ${jobTitle}` : ''
  const position = metadataNumber(notification, 'position')
  const amount = metadataNumber(notification, 'amount')
  switch (step) {
    case 'proposal_sent': return `${actor} sent you a proposal`
    case 'proposal_countered': return `New version of the proposal${forTitle}`
    case 'proposal_declined': return `${actor} declined the proposal${forTitle}`
    case 'proposal_withdrawn': return `${actor} withdrew the proposal${forTitle}`
    case 'proposal_expired': return `The proposal${forTitle} expired`
    case 'proposal_accepted': return `${actor} accepted the proposal${forTitle}`
    case 'milestone_funded': return position ? `Milestone ${position} funded` : 'Milestone funded'
    case 'work_submitted': return position ? `Work submitted for milestone ${position}` : 'Work submitted'
    case 'changes_requested': return position ? `Changes requested on milestone ${position}` : 'Changes requested'
    case 'milestone_approved': {
      if (!position) return 'Milestone approved'
      return amount !== null ? `Milestone ${position} approved · ${credits(amount)} released` : `Milestone ${position} approved`
    }
    case 'contract_completed': return 'Contract completed'
    case 'contract_ended': return 'Contract ended'
    case 'warning_sent':
    {
      // The server sends the rule in lower case (freelancer_late); compare without caring about case.
      const rule = metadataString(notification, 'rule')?.toLowerCase()
      const milestone = position ? `Milestone ${position}` : 'A milestone'
      if (rule === 'freelancer_late') return `${milestone} is past its due date`
      if (rule === 'client_silent') return `${milestone} is waiting for a review`
      if (rule === 'not_funded') return `${milestone} is not funded yet`
      return notification.title
    }
    default: return notification.title
  }
}

export function notificationHeadline(notification: AppNotification) {
  if (isPipelineNotification(notification)) return pipelineHeadline(notification)
  if (isContractNotification(notification)) return contractHeadline(notification)
  const actorName = notification.actor?.name?.trim()
  if (!actorName) return notification.title
  if (notification.readAt) return actorName

  if (notification.type === 'CHAT_MESSAGE') {
    const count = unreadMessageCount(notification)
    return count === 1
      ? `New message from ${actorName}`
      : `${count} new messages from ${actorName}`
  }
  if (notification.type === 'CONNECTION_REQUEST') return `${actorName} sent a connection request`
  if (notification.type === 'CONNECTION_ACCEPTED') return `${actorName} accepted your request`
  if (notification.type === 'POST_LIKE') return `${actorName} reacted to your post`
  if (notification.type === 'POST_COMMENT') return `${actorName} commented on your post`
  if (notification.type === 'HIRE_CREATED') return `${actorName} created a hire update`
  if (notification.type === 'HIRE_COMPLETED') return `${actorName} completed a hire update`
  return actorName
}

/**
 * Where a click on the notification goes. A proposal or contract notification opens that proposal or contract on the
 * contracts page (the server's `actionUrl`, or one built from the ids when it is missing or not an internal link). Old
 * hire notifications point to the removed My jobs page, so they open the contracts page.
 */
export function notificationTarget(notification: AppNotification) {
  if (notification.type === 'HIRE_CREATED' || notification.type === 'HIRE_COMPLETED') return '/contracts'
  const safe = safeInternalActionUrl(notification.actionUrl)
  if (safe && !(isContractNotification(notification) && !safe.startsWith('/contracts'))) return safe
  if (isContractNotification(notification)) {
    const contractId = metadataNumber(notification, 'contractId')
    if (contractId) return `/contracts?contract=${contractId}`
    const proposalId = metadataNumber(notification, 'proposalId')
    if (proposalId) return `/contracts?proposal=${proposalId}`
    return '/contracts'
  }
  return safe
}

export function notificationContext(notification: AppNotification) {
  if (notification.type === 'APPLICATION_RECEIVED') return 'Applicant'
  if (notification.type === 'APPLICATION_UPDATE') return 'Application'
  if (notification.type === 'INTERVIEW_UPDATE') return 'Interview'
  if (notification.type === 'PROPOSAL_UPDATE') return 'Proposal'
  if (notification.type === 'CONTRACT_UPDATE') return 'Contract'
  if (notification.type === 'CHAT_MESSAGE') return 'Message'
  if (notification.type === 'POST_COMMENT' || notification.type === 'POST_LIKE') {
    return metadataString(notification, 'postTitle') ?? 'Post'
  }
  if (notification.type === 'CONNECTION_REQUEST' || notification.type === 'CONNECTION_ACCEPTED') return 'Connection'
  if (notification.type === 'HIRE_CREATED' || notification.type === 'HIRE_COMPLETED') return 'Hiring'
  return null
}

export function notificationDetail(notification: AppNotification) {
  if (notification.type === 'CHAT_MESSAGE') return null
  // "Hai Vu applied for ..." is already the headline, so it is not said twice.
  if (notification.type === 'APPLICATION_RECEIVED' && metadataString(notification, 'postTitle') && metadataString(notification, 'actorName')) return null
  return notification.body || null
}

export function notificationActivityTime(notification: AppNotification) {
  return notification.updatedAt ?? notification.createdAt
}

export function notificationTimeValue(notification: AppNotification) {
  const value = new Date(notificationActivityTime(notification)).getTime()
  return Number.isNaN(value) ? 0 : value
}

export function formatNotificationTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const diffMs = Date.now() - date.getTime()
  if (diffMs < 60_000) return 'Just now'
  if (diffMs < 3_600_000) return `${Math.max(1, Math.floor(diffMs / 60_000))}m ago`
  if (diffMs < 86_400_000) return `${Math.floor(diffMs / 3_600_000)}h ago`
  if (diffMs < 172_800_000) return 'Yesterday'
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function metadataString(notification: AppNotification, key: string) {
  const value = notification.metadata?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function unreadMessageCount(notification: AppNotification) {
  const count = notification.metadata?.unreadCount
  if (typeof count === 'number' && Number.isFinite(count)) return Math.max(1, count)
  if (typeof count === 'string') {
    const parsed = Number(count)
    if (Number.isFinite(parsed)) return Math.max(1, parsed)
  }
  return 1
}
