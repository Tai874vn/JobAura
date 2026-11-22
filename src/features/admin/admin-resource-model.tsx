import Image from 'next/image'
import { commentsApi, hiresApi, subcategoriesApi, categoriesApi, jobsApi, usersApi } from '@/shared/api/endpoints'
import { currency, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { Comment, Hire, Job, Subcategory, Category, User } from '@/shared/schemas'
import { Badge } from '@/shared/ui'

export type Resource = 'jobs' | 'users' | 'categories' | 'subcategories' | 'hires' | 'comments'
export type ResourceRow = Job | User | Category | Subcategory | Hire | Comment
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
  'categories': {
    title: 'Categories',
    columns: ['ID', 'Name'],
    load: async () => (await categoriesApi.all()).content ?? [],
    remove: categoriesApi.delete,
    renderCells: renderCategoryCells,
    create: { label: 'Create Job Type', submit: ({ name }) => categoriesApi.create({ name: name }) },
  },
  'subcategories': {
    title: 'Subcategories',
    columns: ['ID', 'Name', 'Parent type'],
    load: async () => (await subcategoriesApi.all()).content ?? [],
    remove: subcategoriesApi.delete,
    renderCells: renderSubcategoryCells,
    create: {
      label: 'Create Detail Type',
      submit: ({ name, parentTypeId }) => subcategoriesApi.create({ name: name, categoryId: parentTypeId }),
      needsParentType: true,
    },
  },
  'hires': {
    title: 'Hires',
    columns: ['ID', 'Job', 'User', 'Completed'],
    load: async () => (await hiresApi.all()).content ?? [],
    remove: hiresApi.delete,
    renderCells: renderHireCells,
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
      <td className="px-4 py-3"><Thumb src={job.image ?? undefined} label={job.title} /></td>
      <td className="max-w-xs px-4 py-3 font-medium">{job.title}</td>
      <td className="px-4 py-3">{job.user?.name ?? job.creatorId ?? 'Unknown'}</td>
      <td className="px-4 py-3 font-medium">{currency(job.price)}</td>
      <td className="px-4 py-3 text-rating">{(job.rating ?? 0).toFixed(1)}</td>
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

function renderCategoryCells(row: ResourceRow) {
  const type = row as Category
  return <><td className="px-4 py-3 font-mono text-xs">#{type.id}</td><td className="px-4 py-3 font-medium">{type.name}</td></>
}

function renderSubcategoryCells(row: ResourceRow) {
  const detail = row as Subcategory
  return <><td className="px-4 py-3 font-mono text-xs">#{detail.id}</td><td className="px-4 py-3 font-medium">{detail.name}</td><td className="px-4 py-3">{detail.categoryId ?? '-'}</td></>
}

function renderHireCells(row: ResourceRow) {
  const hire = row as Hire
  return <><td className="px-4 py-3 font-mono text-xs">#{hire.id}</td><td className="px-4 py-3">{hire.jobId}</td><td className="px-4 py-3">{hire.hirerId ?? '-'}</td><td className="px-4 py-3"><Badge tone={hire.completed ? 'primary' : 'neutral'}>{hire.completed ? 'Done' : 'Open'}</Badge></td></>
}

function renderCommentCells(row: ResourceRow) {
  const comment = row as Comment
  const commenterId = comment.commenterId ?? comment.user?.id
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{comment.id}</td>
      <td className="px-4 py-3">{comment.jobId}</td>
      <td className="px-4 py-3"><div className="flex items-center gap-2">{comment.user?.name ? <Avatar name={comment.user.name} /> : null}<div><p className="font-medium">{comment.user?.name ?? 'Unknown user'}</p><p className="font-mono text-xs text-muted">{commenterId ? `#${commenterId}` : '-'}</p></div></div></td>
      <td className="px-4 py-3 text-rating">{comment.rating}</td>
      <td className="max-w-sm px-4 py-3">{comment.content}</td>
    </>
  )
}

function Thumb({ src, label }: { src?: string; label: string }) {
  const imageUrl = resolveAssetUrl(src)
  return <div className="relative h-10 w-14 overflow-hidden rounded border border-border bg-surface-muted">{imageUrl ? <Image src={imageUrl} alt={label} fill sizes="56px" unoptimized={shouldBypassImageOptimizer(src)} className="object-cover" /> : null}</div>
}

function Avatar({ name }: { name: string }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">{initials(name)}</span>
}
