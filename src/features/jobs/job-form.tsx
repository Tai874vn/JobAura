'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import Image from 'next/image'
import { AlignLeft, ImagePlus, Info, Send, Trash2, UploadCloud } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { useSession } from '@/features/auth/use-session'
import { jobsApi, subcategoriesApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { currency, getErrorMessage } from '@/shared/lib/utils'
import { createJobSchema, type CreateJob } from '@/shared/schemas'
import { Badge, Button, ButtonLink, Card, Input, PageHeader, Select, Textarea } from '@/shared/ui'

type CreateJobInput = z.input<typeof createJobSchema>

const titleLimit = 160
const shortLimit = 500
const descriptionLimit = 5000

export function JobForm() {
  const router = useRouter()
  const { user } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { title: '', price: 25, shortDescription: '', description: '', subcategoryId: 0, reviews: 0, rating: 0 },
  })
  const title = form.watch('title')
  const price = form.watch('price')
  const detailsQuery = useQuery({ queryKey: queryKeys.subcategories, queryFn: subcategoriesApi.all })
  const details = detailsQuery.data?.content ?? []
  const detailsUnavailable = detailsQuery.isError && !details.length

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const mutation = useMutation({
    mutationFn: async (values: CreateJob) => {
      if (file) {
        const validation = validateImageFile(file, { label: 'Service image' })
        if (!validation.valid) throw new Error(validation.message)
      }

      const created = await jobsApi.create(values)
      if (file && created.content?.id) await jobsApi.uploadImage(created.content.id, file)
      return created
    },
    onSuccess: (res) => {
      toast.success('Service created')
      router.push(res.content?.id ? `/jobs/${res.content.id}` : '/my-posts')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to create service')),
  })

  function selectImage(nextFile?: File) {
    if (!nextFile) return

    const validation = validateImageFile(nextFile, { label: 'Service image' })
    if (!validation.valid) {
      toast.error(validation.message)
      return
    }

    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return URL.createObjectURL(nextFile)
    })
    setFile(nextFile)
  }

  function removeImage() {
    setPreviewUrl((current) => {
      if (current) URL.revokeObjectURL(current)
      return null
    })
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const previewTitle = (typeof title === 'string' ? title.trim() : '') || 'I will build a modern Next.js landing page'
  const previewPrice = typeof price === 'number' && Number.isFinite(price) ? currency(price) : currency(0)

  return (
    <div className="container-page pt-10 pb-16">
      <PageHeader
        title="Post a service"
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <form
            className="grid gap-0"
            onSubmit={form.handleSubmit((values) => mutation.mutate(createJobSchema.parse(values)))}
          >
            <section className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                <Info className="h-3.5 w-3.5 text-primary" /> Basics
              </h2>
              <div className="grid gap-4">
                <Field label="Title" counter={`${(title ?? '').length}/${titleLimit}`} error={form.formState.errors.title?.message}>
                  <Input {...form.register('title')} maxLength={titleLimit} placeholder="I will build a modern Next.js landing page" />
                  <p className="mt-1.5 text-xs text-muted">
                    Start with &ldquo;I will…&rdquo; — buyers search for verbs like <em>build, design, edit</em>.
                  </p>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Category detail"
                    error={form.formState.errors.subcategoryId?.message}
                    hint={detailsUnavailable ? <span className="flex items-center gap-2 text-xs font-normal text-danger">Categories could not be loaded.<Button type="button" size="sm" variant="secondary" onClick={() => detailsQuery.refetch()}>Retry</Button></span> : undefined}
                  >
                    <Select disabled={detailsQuery.isPending || detailsUnavailable} {...form.register('subcategoryId')}>
                      <option value={0}>{detailsQuery.isPending ? 'Loading details...' : detailsUnavailable ? 'Categories unavailable' : 'Choose detail'}</option>
                      {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Price" error={form.formState.errors.price?.message}>
                    <Input type="number" min={0} {...form.register('price')} />
                    <p className="mt-1.5 text-xs text-muted">Starting price shown on your card.</p>
                  </Field>
                </div>
              </div>
            </section>

            <section className="border-t border-border p-5">
              <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                <AlignLeft className="h-3.5 w-3.5 text-primary" /> Descriptions
              </h2>
              <div className="grid gap-4">
                <Field label="Short description" counter={`${(form.watch('shortDescription') ?? '').length}/${shortLimit}`} error={form.formState.errors.shortDescription?.message}>
                  <Input {...form.register('shortDescription')} maxLength={shortLimit} placeholder="A crisp summary for cards and search results" />
                </Field>
                <Field label="Description" counter={`${(form.watch('description') ?? '').length}/${descriptionLimit}`} error={form.formState.errors.description?.message}>
                  <Textarea {...form.register('description')} maxLength={descriptionLimit} placeholder="Explain process, deliverables, and what buyers get." />
                  <p className="mt-1.5 text-xs text-muted">Cover your process, what&rsquo;s included, delivery time, and revision policy.</p>
                </Field>
              </div>
            </section>

            <section className="border-t border-border p-5">
              <h2 className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-muted">
                <ImagePlus className="h-3.5 w-3.5 text-primary" /> Cover image
              </h2>
              <input
                id="service-cover-input"
                ref={fileRef}
                className="sr-only"
                type="file"
                accept={imageUploadAccept}
                onChange={(event) => selectImage(event.target.files?.[0])}
              />
              <label
                htmlFor="service-cover-input"
                className="relative flex min-h-40 cursor-pointer flex-col items-center justify-center gap-1.5 overflow-hidden rounded-lg border-[1.5px] border-dashed border-border bg-surface text-center transition hover:border-primary hover:bg-primary/5"
              >
                {previewUrl ? (
                  <>
                    <Image src={previewUrl} alt="Cover preview" fill unoptimized className="object-cover" sizes="640px" />
                    <span
                      role="button"
                      tabIndex={0}
                      className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-foreground/75 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-danger"
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        removeImage()
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          removeImage()
                        }
                      }}
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-1.5 p-4">
                    <UploadCloud className="h-6 w-6 text-primary" />
                    <b className="text-sm">Click to upload a cover image</b>
                    <span className="text-xs text-muted">JPG or PNG, up to 5 MB · 4:3 ratio works best</span>
                  </span>
                )}
              </label>
            </section>

            <section className="flex flex-wrap items-center justify-end gap-2.5 border-t border-border p-5">
              <ButtonLink href="/my-posts" variant="secondary">Cancel</ButtonLink>
              <Button type="submit" loading={mutation.isPending}>
                <Send className="h-4 w-4" />
                Publish service
              </Button>
            </section>
          </form>
        </Card>

        <aside className="grid content-start gap-2.5 lg:sticky lg:top-24" aria-label="Live preview">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-muted">
            <Send className="h-3 w-3 rotate-180 text-primary" /> Live preview — how buyers see it
          </p>
          <Card className="overflow-hidden transition hover:shadow-[0_12px_28px_rgba(27,28,28,0.09)]">
            <div className="relative aspect-[4/3] bg-surface-muted">
              {previewUrl ? (
                <Image src={previewUrl} alt="Cover preview" fill unoptimized className="object-cover" sizes="360px" />
              ) : (
                <span className="font-display text-5xl font-bold text-primary/30">JA</span>
              )}
            </div>
            <div className="p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-[10.5px] font-bold text-white">
                  {user?.name?.trim() ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'JA'}
                </span>
                <span className="truncate text-sm font-semibold">{user?.name ?? 'You'}</span>
              </div>
              <p className="line-clamp-2 min-h-10 text-sm font-semibold leading-snug">{previewTitle}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="rating">New</Badge>
                <span className="text-sm text-muted">From <strong className="text-foreground">{previewPrice}</strong></span>
              </div>
            </div>
          </Card>
          <p className="text-center text-xs text-muted">Your service appears in Explore and search once published.</p>
        </aside>
      </div>
    </div>
  )
}

function Field({
  label,
  counter,
  error,
  hint,
  children,
}: {
  label: string
  counter?: string
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 text-sm font-semibold">
      <label className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {counter ? <span className="text-[11px] font-medium text-muted">{counter}</span> : null}
      </label>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {hint}
    </div>
  )
}
