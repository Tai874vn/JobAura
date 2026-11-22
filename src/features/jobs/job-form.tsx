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
import { categoriesApi, jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { getErrorMessage } from '@/shared/lib/utils'
import { createJobSchema, type CreateJob } from '@/shared/schemas'
import { Badge, Button, ButtonLink, Card, Input, PageHeader, Select, Textarea } from '@/shared/ui'
import { servicePriceLabel } from './service-price'

type CreateJobInput = z.input<typeof createJobSchema>

const titleLimit = 160
const shortLimit = 500
const descriptionLimit = 5000

/** A candidate's portfolio post: a project or the kind of work they do, so recruiters can find them. */
export function JobForm() {
  const router = useRouter()
  const { user } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { title: '', price: 0, shortDescription: '', description: '', subcategoryId: 0, reviews: 0, rating: 0 },
  })
  const title = form.watch('title')
  const price = form.watch('price')
  // Pick the field first (37 of them), then the kind of work inside it, instead of one list of 400+ entries.
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.all })
  const categories = categoriesQuery.data?.content ?? []
  const categoriesUnavailable = categoriesQuery.isError && !categories.length
  const [categoryId, setCategoryId] = useState(0)
  const subcategories = categories.find((category) => category.id === categoryId)?.subcategories ?? []

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const mutation = useMutation({
    mutationFn: async (values: CreateJob) => {
      if (file) {
        const validation = validateImageFile(file, { label: 'Cover image' })
        if (!validation.valid) throw new Error(validation.message)
      }

      const created = await jobsApi.create(values)
      if (file && created.content?.id) await jobsApi.uploadImage(created.content.id, file)
      return created
    },
    onSuccess: (res) => {
      toast.success('Portfolio post published')
      router.push(res.content?.id ? `/jobs/${res.content.id}` : '/my-posts')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Could not publish your post')),
  })

  function selectImage(nextFile?: File) {
    if (!nextFile) return

    const validation = validateImageFile(nextFile, { label: 'Cover image' })
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

  const previewTitle = (typeof title === 'string' ? title.trim() : '') || 'Checkout redesign for an online store'
  const previewPrice = servicePriceLabel(Number(price))

  return (
    <div className="container-page pt-10 pb-16">
      <PageHeader
        title="Post your portfolio"
        description="Show a project or the kind of work you do. Recruiters find you through these posts and your profile."
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <form
            className="grid gap-0"
            onSubmit={form.handleSubmit((values) => mutation.mutate(createJobSchema.parse(values)))}
          >
            <section className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
                <Info className="h-3.5 w-3.5 text-primary" /> Basics
              </h2>
              <div className="grid gap-4">
                <Field id="post-title" label="Title" counter={`${(title ?? '').length}/${titleLimit}`} error={form.formState.errors.title?.message}>
                  <Input id="post-title" {...form.register('title')} maxLength={titleLimit} placeholder="Checkout redesign for an online store" />
                  <p className="mt-1.5 text-xs font-normal text-muted">Name the project or the work you do, the way a recruiter would search for it.</p>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="post-field"
                    label="Field"
                    hint={categoriesUnavailable ? <span className="flex items-center gap-2 text-xs font-normal text-danger">Fields could not be loaded.<Button type="button" size="sm" variant="secondary" onClick={() => categoriesQuery.refetch()}>Retry</Button></span> : undefined}
                  >
                    <Select
                      id="post-field"
                      value={categoryId}
                      disabled={categoriesQuery.isPending || categoriesUnavailable}
                      onChange={(event) => {
                        setCategoryId(Number(event.target.value))
                        form.setValue('subcategoryId', 0)
                      }}
                    >
                      <option value={0}>{categoriesQuery.isPending ? 'Loading fields…' : categoriesUnavailable ? 'Fields unavailable' : 'Choose a field'}</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </Select>
                  </Field>
                  <Field id="post-kind" label="Kind of work" error={form.formState.errors.subcategoryId?.message}>
                    <Select id="post-kind" disabled={!subcategories.length} {...form.register('subcategoryId')}>
                      <option value={0}>{categoryId ? 'Choose the kind of work' : 'Choose a field first'}</option>
                      {subcategories.map((detail) => <option key={detail.id} value={detail.id}>{detail.name}</option>)}
                    </Select>
                  </Field>
                </div>
                <Field id="post-rate" label="Rate in USD (optional)" error={form.formState.errors.price?.message}>
                  <Input id="post-rate" type="number" min={0} inputMode="numeric" {...form.register('price')} />
                  <p className="mt-1.5 text-xs font-normal text-muted">Leave 0 to show your work without a price; recruiters contact you directly.</p>
                </Field>
              </div>
            </section>

            <section className="border-t border-border p-5">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
                <AlignLeft className="h-3.5 w-3.5 text-primary" /> Descriptions
              </h2>
              <div className="grid gap-4">
                <Field id="post-summary" label="Summary" counter={`${(form.watch('shortDescription') ?? '').length}/${shortLimit}`} error={form.formState.errors.shortDescription?.message}>
                  <Input id="post-summary" {...form.register('shortDescription')} maxLength={shortLimit} placeholder="One line shown on cards and in search" />
                </Field>
                <Field id="post-description" label="Description" counter={`${(form.watch('description') ?? '').length}/${descriptionLimit}`} error={form.formState.errors.description?.message}>
                  <Textarea id="post-description" {...form.register('description')} maxLength={descriptionLimit} placeholder="What you built, your part in it, the tools you used, and the result." />
                  <p className="mt-1.5 text-xs font-normal text-muted">Concrete results help recruiters most: numbers, links, what changed.</p>
                </Field>
              </div>
            </section>

            <section className="border-t border-border p-5">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
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
                      className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1.5 rounded-full bg-foreground/75 px-2.5 py-1.5 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-danger"
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
                Publish post
              </Button>
            </section>
          </form>
        </Card>

        <aside className="grid content-start gap-2.5 lg:sticky lg:top-24" aria-label="Live preview">
          <p className="flex items-center gap-1.5 text-xs font-medium text-muted">
            <Send className="h-3 w-3 rotate-180 text-primary" /> Live preview — how recruiters see it
          </p>
          <Card className="overflow-hidden transition hover:shadow-float">
            <div className="relative aspect-[4/3] bg-surface-muted">
              {previewUrl ? (
                <Image src={previewUrl} alt="Cover preview" fill unoptimized className="object-cover" sizes="360px" />
              ) : (
                <span className="font-display text-5xl font-medium text-primary/30">JA</span>
              )}
            </div>
            <div className="p-3.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
                  {user?.name?.trim() ? user.name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'JA'}
                </span>
                <span className="truncate text-sm font-medium">{user?.name ?? 'You'}</span>
              </div>
              <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">{previewTitle}</p>
              <div className="mt-3 flex items-center justify-between">
                <Badge tone="rating">New</Badge>
                <span className="text-sm text-muted">{previewPrice ?? 'Portfolio'}</span>
              </div>
            </div>
          </Card>
          <p className="text-center text-xs text-muted">Your post appears in Portfolios, search, and on your profile once published.</p>
        </aside>
      </div>
    </div>
  )
}

function Field({
  id,
  label,
  counter,
  error,
  hint,
  children,
}: {
  /** The id of the input inside, so the label names it for screen readers. */
  id: string
  label: string
  counter?: string
  error?: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1.5 text-sm font-medium">
      <label htmlFor={id} className="flex items-baseline justify-between gap-2">
        <span>{label}</span>
        {counter ? <span className="text-xs font-medium text-muted">{counter}</span> : null}
      </label>
      {children}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {hint}
    </div>
  )
}
