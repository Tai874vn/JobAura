'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import type { z } from 'zod'
import { jobsApi, jobDetailTypesApi } from '@/shared/api/endpoints'
import { queryKeys } from '@/shared/api/query-keys'
import { imageUploadAccept, validateImageFile } from '@/shared/lib/file-validation'
import { getErrorMessage } from '@/shared/lib/utils'
import { createJobSchema, type CreateJob } from '@/shared/schemas'
import { Button, Card, CardContent, Input, PageHeader, Select, Textarea } from '@/shared/ui'

type CreateJobInput = z.input<typeof createJobSchema>

export function JobForm() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const form = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: { tenCongViec: '', giaTien: 25, moTaNgan: '', moTa: '', maChiTietLoai: 0, danhGia: 0, saoCongViec: 0 },
  })
  const detailsQuery = useQuery({ queryKey: queryKeys.jobDetailTypes, queryFn: jobDetailTypesApi.all })
  const details = detailsQuery.data?.content ?? []
  const detailsUnavailable = detailsQuery.isError && !details.length

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
    if (!nextFile) {
      setFile(null)
      return
    }

    const validation = validateImageFile(nextFile, { label: 'Service image' })
    if (!validation.valid) {
      toast.error(validation.message)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      return
    }

    setFile(nextFile)
  }

  return (
    <div className="container-page py-8">
      <PageHeader title="Post a service" description="Create a clear, searchable offer for buyers." />
      <Card className="mt-6 max-w-3xl">
        <CardContent>
          <form className="grid gap-4" onSubmit={form.handleSubmit((values) => mutation.mutate(createJobSchema.parse(values)))}>
            <Field label="Title" error={form.formState.errors.tenCongViec?.message}>
              <Input {...form.register('tenCongViec')} placeholder="I will build a modern Next.js landing page" />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Price" error={form.formState.errors.giaTien?.message}>
                <Input type="number" {...form.register('giaTien')} />
              </Field>
              <Field
                label="Category detail"
                error={form.formState.errors.maChiTietLoai?.message}
                hint={detailsUnavailable ? <span className="flex items-center gap-2 text-xs font-normal text-danger">Categories could not be loaded.<Button type="button" size="sm" variant="secondary" onClick={() => detailsQuery.refetch()}>Retry</Button></span> : undefined}
              >
                <Select disabled={detailsQuery.isPending || detailsUnavailable} {...form.register('maChiTietLoai')}>
                  <option value={0}>{detailsQuery.isPending ? 'Loading details...' : detailsUnavailable ? 'Categories unavailable' : 'Choose detail'}</option>
                  {details.map((detail) => <option key={detail.id} value={detail.id}>{detail.tenChiTiet}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Short description">
              <Input {...form.register('moTaNgan')} placeholder="A crisp summary for cards and search results" />
            </Field>
            <Field label="Description">
              <Textarea {...form.register('moTa')} placeholder="Explain process, deliverables, and what buyers get." />
            </Field>
            <div>
              <input ref={fileRef} className="hidden" type="file" accept={imageUploadAccept} onChange={(event) => selectImage(event.target.files?.[0])} />
              <Button type="button" variant="secondary" onClick={() => fileRef.current?.click()}>{file ? file.name : 'Choose image'}</Button>
            </div>
            <Button className="w-fit" type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Publishing...' : 'Publish service'}</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: React.ReactNode; children: React.ReactNode }) {
  return <div className="grid gap-2 text-sm font-semibold"><label className="grid gap-2">{label}{children}</label>{error ? <span className="text-xs text-danger">{error}</span> : null}{hint}</div>
}
