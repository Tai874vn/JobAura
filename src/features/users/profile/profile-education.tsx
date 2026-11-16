'use client'

import { useQuery } from '@tanstack/react-query'
import { GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { skillsApi } from '@/shared/api/endpoints/users'
import { Card, CardContent } from '@/shared/ui'
import { SectionTitle } from './profile-content'

/** The degree and field-of-study code a profile shows from resume data; null without a stated degree. */
export function resumeEducation(data?: { Degree?: string | null; FieldOfStudy?: string | null } | null) {
  const degree = data?.Degree?.trim()
  if (!degree || degree === 'Not stated') return null
  const code = data?.FieldOfStudy?.trim() ?? ''
  return { degree, fieldOfStudy: /^\d{4}$/.test(code) ? code : null }
}

/** Education comes from the resume (one copy), so the owner edits it there. */
export function ProfileEducation({ education, isOwner }: {
  education?: { degree: string; fieldOfStudy: string | null } | null
  isOwner: boolean
}) {
  const fields = useQuery({ queryKey: ['fields-of-study'], queryFn: skillsApi.fieldsOfStudy, staleTime: Infinity, enabled: Boolean(education?.fieldOfStudy) })
  if (!education && !isOwner) return null
  const fieldName = fields.data?.content?.find((field) => field.code === education?.fieldOfStudy)?.name
  return (
    <Card>
      <CardContent className="p-5 md:p-6">
        <SectionTitle title="Education" action={isOwner ? (
          <Link href="/settings?section=resume&focus=education" className="text-sm font-semibold text-primary hover:underline">
            {education ? 'Edit in resume' : 'Add in resume'}
          </Link>
        ) : null} />
        {education ? (
          <div className="mt-4 flex gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
              <GraduationCap className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h3 className="font-semibold leading-snug">{education.degree}</h3>
              {education.fieldOfStudy ? <p className="mt-0.5 text-sm text-muted">{fieldName ?? 'Field of study'}</p> : null}
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted">Add your highest degree and field of study in your resume.</p>
        )}
      </CardContent>
    </Card>
  )
}
