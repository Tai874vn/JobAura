'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Pencil, Plus, Search, Trash2, Upload } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { type FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { commentsApi, hiredJobsApi, jobDetailTypesApi, jobTypesApi, jobsApi, usersApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { currency, getErrorMessage, initials, resolveAssetUrl, shouldBypassImageOptimizer } from '@/shared/lib/utils'
import type { Comment, HiredJob, Job, JobDetailType, JobType, User } from '@/shared/schemas'
import { Badge, Button, Card, CardContent, Input, Skeleton } from '@/shared/ui'

type Resource = 'jobs' | 'users' | 'job-types' | 'job-detail-types' | 'hired-jobs' | 'comments'
type Row = Job | User | JobType | JobDetailType | HiredJob | Comment
type CreateValues = { name: string; parentTypeId?: number }
type ResourceConfig = {
  title: string
  columns: string[]
  load: () => Promise<Row[]>
  remove: (id: number) => Promise<unknown>
  renderCells: (row: Row) => React.ReactNode
  create?: {
    label: string
    submit: (values: CreateValues) => Promise<unknown>
    needsParentType?: boolean
  }
  createHref?: string
  createLabel?: string
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
  },
  users: {
    title: 'Users',
    columns: ['ID', 'User', 'Email', 'Role', 'Skills'],
    load: async () => (await usersApi.all()).content ?? [],
    remove: usersApi.delete,
    renderCells: renderUserCells,
  },
  'job-types': {
    title: 'Job types',
    columns: ['ID', 'Name'],
    load: async () => (await jobTypesApi.all()).content ?? [],
    remove: jobTypesApi.delete,
    renderCells: renderJobTypeCells,
    create: {
      label: 'Create Job Type',
      submit: ({ name }) => jobTypesApi.create({ tenLoaiCongViec: name }),
    },
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
    columns: ['ID', 'Job ID', 'User ID', 'Rating', 'Comment'],
    load: async () => (await commentsApi.all()).content ?? [],
    remove: commentsApi.delete,
    renderCells: renderCommentCells,
  },
}

export function AdminResourcePage({ resource, embedded = false }: { resource: Resource; embedded?: boolean }) {
  const config = getResourceConfig(resource)
  const [keyword, setKeyword] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['admin', resource],
    queryFn: config.load,
  })

  const filtered = useMemo(() => {
    const rows = query.data ?? []
    const lower = keyword.toLowerCase()
    return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(lower))
  }, [keyword, query.data])

  const deleteMutation = useMutation({
    mutationFn: (id: number) => config.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', resource] })
      toast.success(`${config.title} updated`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete record')),
  })

  return (
    <div>
      {!embedded ? (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl font-bold">Manage {config.title}</h1>
            <p className="text-sm text-muted">Search, inspect, and maintain marketplace records.</p>
          </div>
          <CreateButton config={config} onCreate={() => setIsCreateOpen(true)} />
        </div>
      ) : null}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-border p-4">
            <div className="flex h-10 w-full max-w-md items-center gap-2 rounded-lg border border-border px-3">
              <Search className="h-4 w-4 text-muted" />
              <input
                className="flex-1 bg-transparent text-sm outline-none"
                placeholder={`Search ${config.title.toLowerCase()}...`}
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
            {embedded ? <CreateButton config={config} onCreate={() => setIsCreateOpen(true)} /> : null}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-muted text-xs uppercase tracking-wider text-muted">
                <tr>
                  {config.columns.map((column) => (
                    <th key={column} className="px-4 py-3 font-bold">
                      {column}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {query.isPending ? (
                  Array.from({ length: 6 }).map((_, rowIndex) => (
                    <tr key={`loading-${rowIndex}`} className="border-t border-border">
                      {config.columns.map((column, columnIndex) => (
                        <td key={`${column}-${rowIndex}`} className="px-4 py-3">
                          <Skeleton className={columnIndex === 0 ? 'h-4 w-12' : 'h-4 w-28'} />
                        </td>
                      ))}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Skeleton className="h-10 w-10" />
                          <Skeleton className="h-10 w-10" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  filtered.map((row) => (
                    <tr key={`${resource}-${row.id}`} className="border-t border-border">
                      {config.renderCells(row)}
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {resource === 'jobs' ? (
                            <Button variant="ghost" size="icon">
                              <Upload className="h-4 w-4" />
                            </Button>
                          ) : null}
                          <Button variant="danger" size="icon" onClick={() => deleteMutation.mutate(row.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!query.isPending && !filtered.length ? <p className="p-8 text-center text-sm text-muted">No records found.</p> : null}
          </div>
          <div className="flex items-center justify-between border-t border-border p-4 text-sm text-muted">
            <span>{query.isPending ? 'Loading records' : `${filtered.length} records`}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm">
                Previous
              </Button>
              <Button variant="secondary" size="sm">
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      {config.create ? (
        <CreateResourceDialog
          config={config}
          open={isCreateOpen}
          resource={resource}
          onClose={() => setIsCreateOpen(false)}
        />
      ) : null}
    </div>
  )
}

function getResourceConfig(resource: Resource) {
  const config = resourceConfigs[resource]
  if (!config) throw new Error(`Unsupported admin resource: ${resource}`)
  return config
}

function CreateButton({ config, onCreate }: { config: ResourceConfig; onCreate: () => void }) {
  if (config.createHref) {
    return (
      <Link href={config.createHref}>
        <Button>
          <Plus className="h-4 w-4" />
          {config.createLabel ?? 'Create'}
        </Button>
      </Link>
    )
  }

  if (config.create) {
    return (
      <Button onClick={onCreate}>
        <Plus className="h-4 w-4" />
        {config.create.label}
      </Button>
    )
  }

  return null
}

function CreateResourceDialog({
  config,
  open,
  resource,
  onClose,
}: {
  config: ResourceConfig
  open: boolean
  resource: Resource
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [parentTypeId, setParentTypeId] = useState<number | undefined>()
  const queryClient = useQueryClient()
  const parentTypesQuery = useQuery({
    queryKey: queryKeys.jobTypes,
    queryFn: jobTypesApi.all,
    enabled: open && Boolean(config.create?.needsParentType),
  })
  const parentTypes = parentTypesQuery.data?.content ?? []
  const resolvedParentTypeId = parentTypeId ?? parentTypes[0]?.id

  const createMutation = useMutation({
    mutationFn: () => {
      if (!config.create) throw new Error('Resource does not support creation')
      return config.create.submit({ name: name.trim(), parentTypeId: resolvedParentTypeId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', resource] })
      queryClient.invalidateQueries({ queryKey: resource === 'job-types' ? queryKeys.jobTypes : queryKeys.jobDetailTypes })
      toast.success(`${config.title} created`)
      resetForm()
      onClose()
    },
    onError: (error) => toast.error(getErrorMessage(error, `Unable to create ${config.title.toLowerCase()}`)),
  })

  function resetForm() {
    setName('')
    setParentTypeId(undefined)
  }

  function closeDialog() {
    resetForm()
    onClose()
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }
    if (config.create?.needsParentType && !resolvedParentTypeId) {
      toast.error('Parent job type is required')
      return
    }
    createMutation.mutate()
  }

  if (!open || !config.create) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form className="w-full max-w-md rounded-lg border border-border bg-white p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]" onSubmit={submit}>
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold">{config.create.label}</h2>
          <p className="text-sm text-muted">Add a new marketplace classification.</p>
        </div>
        <label className="block text-sm font-semibold">
          Name
          <Input className="mt-2" value={name} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        {config.create.needsParentType ? (
          <label className="mt-4 block text-sm font-semibold">
            Parent job type
            <select
              className="mt-2 h-10 w-full rounded-lg border border-border bg-white px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary-bright/20"
              value={resolvedParentTypeId ?? ''}
              onChange={(event) => setParentTypeId(Number(event.target.value))}
              disabled={parentTypesQuery.isLoading}
            >
              <option value="" disabled>
                Select parent type
              </option>
              {parentTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.tenLoaiCongViec}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={closeDialog}>
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending || parentTypesQuery.isLoading}>
            {createMutation.isPending ? 'Creating...' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

function renderJobCells(row: Row) {
  const job = row as Job
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{job.id}</td>
      <td className="px-4 py-3">
        <Thumb src={job.hinhAnh ?? undefined} label={job.tenCongViec} />
      </td>
      <td className="max-w-xs px-4 py-3 font-semibold">{job.tenCongViec}</td>
      <td className="px-4 py-3">{job.nguoiDung?.name ?? job.nguoiTao ?? 'Unknown'}</td>
      <td className="px-4 py-3 font-semibold">{currency(job.giaTien)}</td>
      <td className="px-4 py-3 text-rating">{(job.saoCongViec ?? 0).toFixed(1)}</td>
      <td className="px-4 py-3">
        <Badge tone="primary">Active</Badge>
      </td>
    </>
  )
}

function renderUserCells(row: Row) {
  const user = row as User
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{user.id}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={user.name} /> <strong>{user.name}</strong>
        </div>
      </td>
      <td className="px-4 py-3">{user.email}</td>
      <td className="px-4 py-3">
        <Badge tone={user.role === 'admin' ? 'accent' : 'neutral'}>{user.role ?? 'user'}</Badge>
      </td>
      <td className="px-4 py-3 text-muted">{user.skill ?? '-'}</td>
    </>
  )
}

function renderJobTypeCells(row: Row) {
  const type = row as JobType
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{type.id}</td>
      <td className="px-4 py-3 font-semibold">{type.tenLoaiCongViec}</td>
    </>
  )
}

function renderJobDetailTypeCells(row: Row) {
  const detail = row as JobDetailType
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{detail.id}</td>
      <td className="px-4 py-3 font-semibold">{detail.tenChiTiet}</td>
      <td className="px-4 py-3">{detail.maLoaiCongViec ?? '-'}</td>
    </>
  )
}

function renderHiredJobCells(row: Row) {
  const hire = row as HiredJob
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{hire.id}</td>
      <td className="px-4 py-3">{hire.maCongViec}</td>
      <td className="px-4 py-3">{hire.maNguoiThue ?? '-'}</td>
      <td className="px-4 py-3">
        <Badge tone={hire.hoanThanh ? 'primary' : 'neutral'}>{hire.hoanThanh ? 'Done' : 'Open'}</Badge>
      </td>
    </>
  )
}

function renderCommentCells(row: Row) {
  const comment = row as Comment
  return (
    <>
      <td className="px-4 py-3 font-mono text-xs">#{comment.id}</td>
      <td className="px-4 py-3">{comment.maCongViec}</td>
      <td className="px-4 py-3">{comment.maNguoiBinhLuan ?? '-'}</td>
      <td className="px-4 py-3 text-rating">{comment.saoBinhLuan}</td>
      <td className="max-w-sm px-4 py-3">{comment.noiDung}</td>
    </>
  )
}

function Thumb({ src, label }: { src?: string; label: string }) {
  const imageUrl = resolveAssetUrl(src)
  const bypassOptimizer = shouldBypassImageOptimizer(src)

  return (
    <div className="relative h-10 w-14 overflow-hidden rounded border border-border bg-surface-muted">
      {imageUrl ? <Image src={imageUrl} alt={label} fill sizes="56px" unoptimized={bypassOptimizer} className="object-cover" /> : null}
    </div>
  )
}

function Avatar({ name }: { name: string }) {
  return <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{initials(name)}</span>
}
