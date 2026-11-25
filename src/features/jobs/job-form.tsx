'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Image from 'next/image'
import { AlignLeft, ImagePlus, Info, MapPin, Send, Trash2, UploadCloud } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { Controller, useForm, useWatch, type Control, type UseFormRegister } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { useSession } from '@/features/auth/use-session'
import { categoriesApi, jobsApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { getErrorMessage } from '@/shared/lib/utils'
import { createJobSchema, type CreateJob, type Job } from '@/shared/schemas'
import { Badge, Button, ButtonLink, Card, Input, PageHeader, Select, Textarea } from '@/shared/ui'
import { MilestoneTemplateField } from './milestone-template-field'
import { fromTemplate, serviceAreaError, templateErrors, toTemplatePayload, type TemplateRow } from './milestone-template'
import { refreshJobPagesAfterSave } from './refresh-job-pages'
import { servicePriceLabel } from './service-price'

type CreateJobInput = z.input<typeof createJobSchema>

const titleLimit = 160
const shortLimit = 500
const descriptionLimit = 5000

const workModes = [
  { value: 'REMOTE', label: 'Remote' },
  { value: 'ONSITE', label: 'Onsite' },
  { value: 'BOTH', label: 'Remote or onsite' },
] as const

/**
 * A candidate's post: a project or the kind of work they do, so recruiters can find them. With a rate it is a
 * service clients can send a proposal to. Pass `job` to edit an existing post; without it the form creates one.
 */
export function JobForm({ job }: { job?: Job }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const editing = Boolean(job)
  const { user } = useSession()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [templateRows, setTemplateRows] = useState<TemplateRow[]>(() => fromTemplate(job?.milestoneTemplate))
  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: job?.title ?? '',
      price: job?.price ?? 0,
      shortDescription: job?.shortDescription ?? '',
      description: job?.description ?? '',
      subcategoryId: job?.subcategoryId ?? 0,
      workMode: job?.workMode ?? 'REMOTE',
      serviceArea: job?.serviceArea ?? '',
      reviews: job?.reviews ?? 0,
      rating: job?.rating ?? 0,
    },
  })
  const templateBlocked = templateErrors(templateRows).length > 0
  // Pick the field first (37 of them), then the kind of work inside it, instead of one list of 400+ entries.
  const categoriesQuery = useQuery({ queryKey: queryKeys.categories, queryFn: categoriesApi.all })
  const categories = categoriesQuery.data?.content ?? []
  const categoriesUnavailable = categoriesQuery.isError && !categories.length
  // The field the person picked; until they pick one, it follows the saved kind of work (when editing).
  const [pickedCategoryId, setPickedCategoryId] = useState<number | null>(null)
  const initialSubcategoryId = job?.subcategoryId ?? 0
  const categoryId =
    pickedCategoryId ??
    job?.subcategory?.categoryId ??
    job?.subcategory?.category?.id ??
    categories.find((category) => category.subcategories?.some((sub) => sub.id === initialSubcategoryId))?.id ??
    0
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

      // Remote work has no area, and no steps means no template (null clears an old one).
      const body: CreateJob = {
        ...values,
        serviceArea: values.workMode === 'REMOTE' ? null : values.serviceArea?.trim() || null,
        milestoneTemplate: toTemplatePayload(templateRows),
      }
      const saved = job ? await jobsApi.update(job.id, body) : await jobsApi.create(body)
      const savedId = saved.content?.id ?? job?.id
      if (file && savedId) await jobsApi.uploadImage(savedId, file)
      return { ...saved, savedId }
    },
    onSuccess: async (res) => {
      toast.success(editing ? 'Post saved' : 'Portfolio post published')
      void queryClient.invalidateQueries({ queryKey: ['jobs'] })
      // Clear the server's cached copies of the post page first, so the page we open next shows the saved post.
      // A failure here only means the old copy shows for a few minutes, so it never blocks the save.
      if (res.savedId) await refreshJobPagesAfterSave(res.savedId).catch(() => {})
      router.push(res.savedId ? `/jobs/${res.savedId}` : '/my-posts')
      router.refresh()
    },
    onError: (error) => toast.error(getErrorMessage(error, editing ? 'Could not save your post' : 'Could not publish your post')),
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

  return (
    <div className="container-page pt-10 pb-16">
      <PageHeader
        title={editing ? 'Edit your post' : 'Post your portfolio'}
        description="Show a project or the kind of work you do. Recruiters find you through these posts and your profile."
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <form
            className="grid gap-0"
            onSubmit={form.handleSubmit((values) => {
              // Validate safely instead of throwing from .parse(), which would trigger an unhandled rejection.
              const parsed = createJobSchema.safeParse(values)
              if (!parsed.success) {
                toast.error(parsed.error.issues[0]?.message ?? 'Please check the form fields and try again.')
                return
              }
              mutation.mutate(parsed.data)
            })}
          >
            <section className="p-5">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
                <Info className="h-3.5 w-3.5 text-primary" /> Basics
              </h2>
              <div className="grid gap-4">
                <Field id="post-title" label="Title" counter={<FieldCounter control={form.control} name="title" limit={titleLimit} />} error={form.formState.errors.title?.message}>
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
                        setPickedCategoryId(Number(event.target.value))
                        form.setValue('subcategoryId', 0)
                      }}
                    >
                      <option value={0}>{categoriesQuery.isPending ? 'Loading fields…' : categoriesUnavailable ? 'Fields unavailable' : 'Choose a field'}</option>
                      {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </Select>
                  </Field>
                  <Field id="post-kind" label="Kind of work" error={form.formState.errors.subcategoryId?.message}>
                    {/* Controlled via Controller so options arriving later select the saved value without remounting. */}
                    <Controller
                      control={form.control}
                      name="subcategoryId"
                      render={({ field }) => {
                        const selectedId = Number(field.value) || 0
                        const hasOption = subcategories.some((detail) => detail.id === selectedId)
                        return (
                          <Select
                            id="post-kind"
                            name={field.name}
                            ref={field.ref}
                            disabled={!subcategories.length}
                            value={hasOption ? selectedId : 0}
                            onBlur={field.onBlur}
                            onChange={(event) => field.onChange(Number(event.target.value))}
                          >
                            <option value={0}>{categoryId ? 'Choose the kind of work' : 'Choose a field first'}</option>
                            {subcategories.map((detail) => <option key={detail.id} value={detail.id}>{detail.name}</option>)}
                          </Select>
                        )
                      }}
                    />
                  </Field>
                </div>
                <Field id="post-rate" label="Rate in credits (optional)" error={form.formState.errors.price?.message}>
                  <Input id="post-rate" type="number" min={0} inputMode="numeric" {...form.register('price')} />
                  <p className="mt-1.5 text-xs font-normal text-muted">Leave 0 to show your work without a price; recruiters contact you directly. With a rate, clients can send you a proposal.</p>
                </Field>
              </div>
            </section>

            <section className="border-t border-border p-5">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
                <MapPin className="h-3.5 w-3.5 text-primary" /> How you work
              </h2>
              <div className="grid gap-4">
                <fieldset>
                  <legend className="text-sm font-medium">Work mode</legend>
                  <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
                    {workModes.map((mode) => (
                      <label key={mode.value} className="flex items-center gap-2 text-sm">
                        <input type="radio" value={mode.value} className="h-4 w-4 accent-primary" {...form.register('workMode')} />
                        {mode.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <ServiceAreaField control={form.control} register={form.register} />
                <MilestoneTemplateField rows={templateRows} onChange={setTemplateRows} />
              </div>
            </section>

            <section className="border-t border-border p-5">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-medium text-muted">
                <AlignLeft className="h-3.5 w-3.5 text-primary" /> Descriptions
              </h2>
              <div className="grid gap-4">
                <Field id="post-summary" label="Summary" counter={<FieldCounter control={form.control} name="shortDescription" limit={shortLimit} />} error={form.formState.errors.shortDescription?.message}>
                  <Input id="post-summary" {...form.register('shortDescription')} maxLength={shortLimit} placeholder="One line shown on cards and in search" />
                </Field>
                <Field id="post-description" label="Description" counter={<FieldCounter control={form.control} name="description" limit={descriptionLimit} />} error={form.formState.errors.description?.message}>
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
              <ButtonLink href={job ? `/jobs/${job.id}` : '/my-posts'} variant="secondary">Cancel</ButtonLink>
              <JobSubmitButton control={form.control} templateBlocked={templateBlocked} loading={mutation.isPending} editing={editing} />
            </section>
          </form>
        </Card>

        <JobLivePreview control={form.control} previewUrl={previewUrl} userName={user?.name} />
      </div>
    </div>
  )
}

/** Isolated character counter using useWatch so typing only re-renders this tiny span. */
function FieldCounter({
  control,
  name,
  limit,
}: {
  control: Control<CreateJobInput>
  name: 'title' | 'shortDescription' | 'description'
  limit: number
}) {
  const value = useWatch({ control, name })
  const length = typeof value === 'string' ? value.length : 0
  return <>{`${length}/${limit}`}</>
}

/** Isolated service area input using useWatch so switching work mode or typing an area does not re-render the whole form. */
function ServiceAreaField({
  control,
  register,
}: {
  control: Control<CreateJobInput>
  register: UseFormRegister<CreateJobInput>
}) {
  const workMode = useWatch({ control, name: 'workMode' }) ?? 'REMOTE'
  const serviceArea = useWatch({ control, name: 'serviceArea' }) ?? ''
  if (workMode === 'REMOTE') return null
  const areaError = serviceAreaError(workMode, serviceArea)
  return (
    <Field id="post-area" label="Service area" counter={`${serviceArea.length}/160`} error={serviceArea.length ? areaError : undefined}>
      <Input id="post-area" {...register('serviceArea')} maxLength={160} placeholder="Hanoi, or within 30 km of Da Nang" />
    </Field>
  )
}

/** Isolated submit button watching only workMode & serviceArea for its disabled check. */
function JobSubmitButton({
  control,
  templateBlocked,
  loading,
  editing,
}: {
  control: Control<CreateJobInput>
  templateBlocked: boolean
  loading: boolean
  editing: boolean
}) {
  const workMode = useWatch({ control, name: 'workMode' }) ?? 'REMOTE'
  const serviceArea = useWatch({ control, name: 'serviceArea' }) ?? ''
  const saveBlocked = templateBlocked || Boolean(serviceAreaError(workMode, serviceArea))
  return (
    <Button type="submit" loading={loading} disabled={saveBlocked}>
      <Send className="h-4 w-4" />
      {editing ? 'Save changes' : 'Publish post'}
    </Button>
  )
}

/** Isolated live preview card watching only title & price so edits do not re-render the entire form. */
function JobLivePreview({
  control,
  previewUrl,
  userName,
}: {
  control: Control<CreateJobInput>
  previewUrl: string | null
  userName?: string | null
}) {
  const title = useWatch({ control, name: 'title' })
  const price = useWatch({ control, name: 'price' })
  const previewTitle = (typeof title === 'string' ? title.trim() : '') || 'Checkout redesign for an online store'
  const previewPrice = servicePriceLabel(Number(price))

  return (
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
              {userName?.trim() ? userName.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() : 'JA'}
            </span>
            <span className="truncate text-sm font-medium">{userName ?? 'You'}</span>
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
  counter?: React.ReactNode
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
