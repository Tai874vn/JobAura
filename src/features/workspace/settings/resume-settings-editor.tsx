'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useSession } from '@/features/auth/use-session'
import { refreshMyProfilePage } from '@/features/users/refresh-profile-page'
import { usersApi } from '@/shared/api/endpoints/users'
import { suggestedSkills } from '@/features/users/resume-ai'
import { queryKeys } from '@/shared/api/query-keys'
import { getErrorMessage } from '@/shared/lib/utils'
import { Button, Card } from '@/shared/ui'
import {
  canExtractResumeFile, extractResumeFile, extractedResumeFields, hasResumeDraftInput, resumeDraftFromData,
  resumeDraftToImportPayload, validateResumeFile, type ResumeDraft, type ResumeFieldKey,
} from '@/features/users/resume'
import { resumeCareerProblems } from '@/features/users/resume-career'
import { ResumeSettingsSection } from '../resume-settings-section'
import { SettingsPanelSkeleton } from './settings-loading'
import { settingsResumeOptions } from './settings-resume-query'

export function ResumeSettingsEditor({ active }: { active: boolean }) {
  const client = useQueryClient()
  const { user } = useSession()
  const myResumeKey = queryKeys.myResume(user?.id)
  const resumeQuery = useQuery(settingsResumeOptions(active, user?.id))
  const resume = resumeQuery.data?.content ?? null
  const [draft, setDraft] = useState<Partial<ResumeDraft>>({})
  const [attachedFile, setAttachedFile] = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const currentDraft = { ...resumeDraftFromData(resume?.data), ...draft }
  const save = useMutation({
    mutationFn: async ({ data, file }: { data: ResumeDraft; file: File | null }) => {
      if (!hasResumeDraftInput(data)) throw new Error('Fill at least one resume field before saving.')
      const careerProblems = resumeCareerProblems(data)
      if (careerProblems.length) throw new Error(careerProblems[0])
      const response = await usersApi.importResume(resumeDraftToImportPayload(data))
      if (!file) return response
      try {
        return await usersApi.uploadResumeFile(file)
      } catch {
        void client.invalidateQueries({ queryKey: myResumeKey })
        throw new Error('Resume details were saved, but the file upload failed. Your attachment is kept so you can retry.')
      }
    },
    onSuccess: (response, variables) => {
      if (response.content) client.setQueryData(myResumeKey, { ...resumeQuery.data, content: response.content })
      void client.invalidateQueries({ queryKey: myResumeKey })
      // Resume skills are the profile's skill list, so the profile reloads too.
      void client.invalidateQueries({ queryKey: queryKeys.me })
      void refreshMyProfilePage().catch(() => {})
      setDraft({}); setAttachedFile(null)
      toast.success(`${variables.file ? 'Resume file and details saved' : 'Resume saved'}. AI evaluation is queued.`)
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to save resume')),
  })
  const predict = useMutation({
    mutationFn: usersApi.predictResumeSeniority,
    onSuccess: (response) => {
      if (response.content) client.setQueryData(myResumeKey, { ...resumeQuery.data, content: response.content })
      void client.invalidateQueries({ queryKey: myResumeKey })
      toast.success('AI evaluation queued')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to predict resume seniority')),
  })

  async function loadFile(file: File) {
    const validation = validateResumeFile(file)
    if (!validation.valid) { toast.error(validation.message); return }
    setAttachedFile(file)
    if (!canExtractResumeFile(file)) {
      toast.info('File attached. Fill the career fields before saving; browser extraction supports PDF and DOCX.')
      return
    }
    setExtracting(true)
    try {
      const parsed = await extractResumeFile(file)
      // Fill in what the CV shows; fields it doesn't show (skills, an unnamed degree) keep their saved values.
      setDraft((current) => ({ ...current, ...extractedResumeFields(parsed.data) }))
      // Skills found in the CV are suggested by the backend's AI queue after saving, not here.
      toast.success('Resume extracted. Review the fields, then save.')
    } catch (error) {
      toast.error(getErrorMessage(error, 'File attached, but extraction failed. Fill the fields manually.'))
    } finally {
      setExtracting(false)
    }
  }
  function updateField(field: ResumeFieldKey, value: string) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  if (resumeQuery.isPending) return <SettingsPanelSkeleton />
  if (resumeQuery.isError && !resumeQuery.data) return (
    <Card className="p-6" role="alert">
      <h2 className="font-display text-xl font-medium">Resume could not be loaded</h2>
      <p className="mt-2 text-sm leading-6 text-muted">Check your connection and retry. Your existing resume will not be replaced with an empty form.</p>
      <Button className="mt-4" variant="secondary" loading={resumeQuery.isFetching} onClick={() => void resumeQuery.refetch()}>Retry</Button>
    </Card>
  )
  return (
    <div className="space-y-4">
      {resumeQuery.isError ? <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm">Could not refresh your resume. Showing the last loaded details. <Button size="sm" variant="ghost" loading={resumeQuery.isFetching} onClick={() => void resumeQuery.refetch()}>Retry</Button></p> : null}
      {save.isError ? <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-sm text-danger">{getErrorMessage(save.error, 'Unable to save resume. Your draft is kept; try again.')}</p> : null}
      {extracting ? <p role="status" className="text-sm font-medium text-primary">Extracting your resume…</p> : null}
      <fieldset disabled={save.isPending || predict.isPending || extracting} className="min-w-0">
        <ResumeSettingsSection resume={resume} draft={currentDraft} attachedFile={attachedFile} isLoading={false}
          isImporting={save.isPending} isPredicting={predict.isPending} onFieldChange={updateField}
          onClearAttachedFile={() => setAttachedFile(null)} onImport={() => save.mutate({ data: currentDraft, file: attachedFile })}
          onPredictSeniority={() => predict.mutate()} onResumeFile={loadFile} foundSkills={suggestedSkills(resume)}
          hasChanges={Object.keys(draft).length > 0 || Boolean(attachedFile)}
          onReset={() => { setDraft({}); setAttachedFile(null) }} />
      </fieldset>
    </div>
  )
}
