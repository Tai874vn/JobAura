import Image from 'next/image'
import { commentsApi, hiredJobsApi, jobDetailTypesApi, jobTypesApi, jobsApi, usersApi } from '@/shared/api/endpoints'
import { currency, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { Comment, HiredJob, Job, JobDetailType, JobType, User } from '@/shared/schemas'
import { Badge } from '@/shared/ui'

export type Resource = 'jobs' | 'users' | 'job-types' | 'job-detail-types' | 'hired-jobs' | 'comments'
export type ResourceRow = Job | User | JobType | JobDetailType | HiredJob | Comment
export type CreateValues = { name: string; parentTypeId?: number }
export type ResourceConfig = {
  title: string
  columns: string[]
  load: () => Promise<ResourceRow[]>
  remove: (id: number) => Promise<unknown>
  renderCells: (row: ResourceRow) => React.ReactNode
  create?: {
    label: string
    submit: (values: CreateValues) => Promise<unknown>
    needsParentType?: boolean
  }
  createHref?: string
  createLabel?: string
  viewHref?: (row: ResourceRow) => string
}

const resourceConfigs: Record<Resource, ResourceConfig> = {
  jobs: {
    title: 'Jobs',
    columns: ['ID', 'Image', 'Title', 'Seller', 'Price', 'Rating', 'Status'],
    load: async () => (await jobsApi.all()).content ?? [],
    remove: jobsApi.delete,
    renderCells: renderJobCells,
    createHref: '/jobs/new',
    createLabel: 'Create New Job',
    viewHref: (row) => `/jobs/${row.id}`,
  },
  users: {
    title: 'Users',
    columns: ['ID', 'User', 'Email', 'Role', 'Skills'],
    load: async () => (await usersApi.all()).content ?? [],
    remove: usersApi.delete,
    renderCells: renderUserCells,
    viewHref: (row) => `/profile/${row.id}`,
  },
  'job-types': {
    title: 'Job types',
    columns: ['ID', 'Name'],
    load: async () => (await jobTypesApi.all()).content ?? [],
    remove: jobTypesApi.delete,
    renderCells: renderJobTypeCells,
    create: { label: 'Create Job Type', submit: ({ name }) => jobTypesApi.create({ tenLoaiCongViec: name }) },
  },
  'job-detail-types': {
    title: 'Job detail types',
    columns: ['ID', 'Name', 'Parent type'],
    load: async () => (await jobDetailTypesApi.all()).content ?? [],
    remove: jobDetailTypesApi.delete,
    renderCells: renderJobDetailTypeCells,
    create: {
      label: 'Create Detail Type',
      submit: ({ name, parentTypeId }) => jobDetailTypesApi.create({ tenChiTiet: name, maLoaiCongViec: parentTypeId }),
      needsParentType: true,
    },
  },
  'hired-jobs': {
    title: 'Hired jobs',
    columns: ['ID', 'Job', 'User', 'Completed'],
    load: async () => (await hiredJobsApi.all()).content ?? [],
    remove: hiredJobsApi.delete,
    renderCells: renderHiredJobCells,
  },
  comments: {
    title: 'Comments',
    columns: ['ID', 'Job ID', 'User', 'Rating', 'Comment'],
    load: async () => (await commentsApi.all()).content ?? [],
    remove: commentsApi.delete,
    renderCells: renderCommentCells,
  },
}

export function getResourceConfig(resource: Resource) {
  const config = resourceConfigs[resource]
  if (!config) throw new Error(`Unsupported admin resource: ${resource}`)
  return config
}

function renderJobCells(row: ResourceRow) {
  const job = row as Job
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{job.id}</td>
      <td className="px-4 py-3"><Thumb src={job.hinhAnh ?? undefined} label={job.tenCongViec} /></td>
      <td className="max-w-xs px-4 py-3 font-semibold">{job.tenCongViec}</td>
      <td className="px-4 py-3">{job.nguoiDung?.name ?? job.nguoiTao ?? 'Unknown'}</td>
      <td className="px-4 py-3 font-semibold">{currency(job.giaTien)}</td>
      <td className="px-4 py-3 text-rating">{(job.saoCongViec ?? 0).toFixed(1)}</td>
      <td className="px-4 py-3"><Badge tone="primary">Active</Badge></td>
    </>
  )
}

function renderUserCells(row: ResourceRow) {
  const user = row as User
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{user.id}</td>
      <td className="px-4 py-3"><div className="flex items-center gap-2"><Avatar name={user.name} /><strong>{user.name}</strong></div></td>
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3"><Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role ?? 'user'}</Badge></td>
      <td className="px-4 py-3 text-muted">{user.skill ?? '-'}</td>
    </>
  )
}

function renderJobTypeCells(row: ResourceRow) {
  const type = row as JobType
  return <><td className="px-4 py-3 font-mono text-xs">#{type.id}</td><td className="px-4 py-3 font-semibold">{type.tenLoaiCongViec}</td></>
}

function renderJobDetailTypeCells(row: ResourceRow) {
  const detail = row as JobDetailType
  return <><td className="px-4 py-3 font-mono text-xs">#{detail.id}</td><td className="px-4 py-3 font-semibold">{detail.tenChiTiet}</td><td className="px-4 py-3">{detail.maLoaiCongViec ?? '-'}</td></>
}

function renderHiredJobCells(row: ResourceRow) {
  const hire = row as HiredJob
  return <><td className="px-4 py-3 font-mono text-xs">#{hire.id}</td><td className="px-4 py-3">{hire.maCongViec}</td><td className="px-4 py-3">{hire.maNguoiThue ?? '-'}</td><td className="px-4 py-3"><Badge tone={hire.hoanThanh ? 'primary' : 'neutral'}>{hire.hoanThanh ? 'Done' : 'Open'}</Badge></td></>
}

function renderCommentCells(row: ResourceRow) {
  const comment = row as Comment
  const commenterId = comment.maNguoiBinhLuan ?? comment.nguoiDung?.id
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{comment.id}</td>
      <td className="px-4 py-3">{comment.maCongViec}</td>
      <td className="px-4 py-3"><div className="flex items-center gap-2">{comment.nguoiDung?.name ? <Avatar name={comment.nguoiDung.name} /> : null}<div><p className="font-semibold">{comment.nguoiDung?.name ?? 'Unknown user'}</p><p className="font-mono text-xs text-muted">{commenterId ? `#${commenterId}` : '-'}</p></div></div></td>
      <td className="px-4 py-3 text-rating">{comment.saoBinhLuan}</td>
      <td className="max-w-sm px-4 py-3">{comment.noiDung}</td>
    </>
  )
}

function Thumb({ src, label }: { src?: string; label: string }) {
  const imageUrl = resolveAssetUrl(src)
  return <div className="relative h-10 w-14 overflow-hidden rounded border border-border bg-surface-muted">{imageUrl ? <Image src={imageUrl} alt={label} fill sizes="56px" unoptimized={shouldBypassImageOptimizer(src)} className="object-cover" /> : null}</div>
}

function Avatar({ name }: { name: string }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{initials(name)}</span>
}
