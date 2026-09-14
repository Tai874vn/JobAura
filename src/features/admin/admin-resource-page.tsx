'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Eye, Plus, Search, Trash2 } from 'lucide-react'
import { type FormEvent, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { jobTypesApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, ButtonLink, Card, CardContent, ConfirmationDialog, EmptyState, Input, PageHeader, Select, Skeleton } from '@/shared/ui'
import { getResourceConfig, type Resource, type ResourceConfig, type ResourceRow } from './admin-resource-model'

export function AdminResourcePage({ resource, embedded = false }: { resource: Resource; embedded?: boolean }) {
  const config = getResourceConfig(resource)
  const [keyword, setKeyword] = useState('')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<ResourceRow | null>(null)
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
      setPendingDelete(null)
      toast.success(`${config.title} updated`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete record')),
  })

  return (
    <div>
      {!embedded ? (
        <PageHeader
          className="mb-6"
          title={`Manage ${config.title}`}
          description="Search, inspect, and maintain marketplace records."
          actions={<CreateButton config={config} onCreate={() => setIsCreateOpen(true)} />}
        />
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
                          {config.viewHref ? (
                            <ButtonLink
                              href={config.viewHref(row)}
                              variant="ghost"
                              size="icon"
                              aria-label={`View ${config.title.toLowerCase()} record ${row.id}`}
                              title="View record"
                            >
                              <Eye className="h-4 w-4" />
                            </ButtonLink>
                          ) : null}
                          <Button
                            variant="danger"
                            size="icon"
                            aria-label={`Delete ${config.title.toLowerCase()} record ${row.id}`}
                            onClick={() => setPendingDelete(row)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {query.isError ? (
              <div className="p-8 text-center">
                <p className="text-sm text-muted">Records could not be loaded.</p>
                <Button className="mt-3" variant="secondary" onClick={() => query.refetch()}>Retry</Button>
              </div>
            ) : !query.isPending && !filtered.length ? (
              <EmptyState
                icon={<Search />}
                title="No records found"
                description={keyword ? `No ${config.title.toLowerCase()} match "${keyword}".` : 'Records will appear here once created.'}
              />
            ) : null}
          </div>
          <div className="border-t border-border p-4 text-sm text-muted">
            <span>{query.isPending ? 'Loading records' : query.isError ? 'Records unavailable' : `${filtered.length} records`}</span>
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
      <ConfirmationDialog
        open={Boolean(pendingDelete)}
        title={`Delete ${config.title.toLowerCase()} record?`}
        description={`Record #${pendingDelete?.id ?? ''} will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete record"
        pending={deleteMutation.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (pendingDelete) deleteMutation.mutate(pendingDelete.id)
        }}
      />
    </div>
  )
}

function CreateButton({ config, onCreate }: { config: ResourceConfig; onCreate: () => void }) {
  if (config.createHref) {
    return (
      <ButtonLink href={config.createHref}>
        <Plus className="h-4 w-4" />
        {config.createLabel ?? 'Create'}
      </ButtonLink>
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
      <form className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-2xl" onSubmit={submit}>
        <div className="mb-5">
          <h2 className="font-display text-2xl font-bold">{config.create.label}</h2>
          <p className="text-sm text-muted">Add a new marketplace classification.</p>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Name</span>
          <Input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} autoFocus />
        </label>
        {config.create.needsParentType ? (
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted">Parent job type</span>
            <Select
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
            </Select>
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
