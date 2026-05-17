export const queryKeys = {
  me: ['auth', 'me'] as const,
  jobs: (params?: object) => ['jobs', params ?? {}] as const,
  job: (id: number) => ['jobs', id] as const,
  jobTypes: ['job-types'] as const,
  jobDetailTypes: ['job-detail-types'] as const,
  users: (params?: object) => ['users', params ?? {}] as const,
  comments: ['comments'] as const,
  hiredJobs: ['hired-jobs'] as const,
  chatRooms: ['chat', 'rooms'] as const,
  chatMessages: (roomId: number) => ['chat', 'messages', roomId] as const,
} as const
