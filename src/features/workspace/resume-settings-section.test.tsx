import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { resumeDraftFromData } from '@/features/users/resume'
import { ResumeSettingsSection } from './resume-settings-section'

// The skill picker searches through React Query, so the section needs a query client.
function renderWithQuery(element: ReactElement) {
  return renderToStaticMarkup(<QueryClientProvider client={new QueryClient()}>{element}</QueryClientProvider>)
}

describe('Compact resume details', () => {
  it('keeps extracted text editable behind a collapsed disclosure', () => {
    const html = renderWithQuery(<ResumeSettingsSection resume={null}
      draft={resumeDraftFromData({ Name: 'Ava', Text: 'Keep these extracted words' })}
      attachedFile={null} isLoading={false} isImporting={false} isPredicting={false}
      onFieldChange={() => undefined} onClearAttachedFile={() => undefined}
      onImport={() => undefined} onPredictSeniority={() => undefined} onResumeFile={() => undefined} />)
    const disclosure = html.match(/<details([^>]*)>[\s\S]*?<summary[^>]*>Full extracted text[\s\S]*?<\/details>/)
    expect(disclosure).not.toBeNull()
    expect(disclosure![1]).not.toMatch(/\bopen\b/)
    expect(disclosure![0]).toContain('Keep these extracted words</textarea>')
    expect(html).toContain('Save resume')
  })

  it('requires the field and specialty before saving', () => {
    const render = (data: Record<string, string>) => renderWithQuery(<ResumeSettingsSection resume={null}
      draft={resumeDraftFromData(data)} attachedFile={null} isLoading={false} isImporting={false} isPredicting={false}
      onFieldChange={() => undefined} onClearAttachedFile={() => undefined}
      onImport={() => undefined} onPredictSeniority={() => undefined} onResumeFile={() => undefined} />)
    const saveButton = (html: string) => html.match(/<button(?:(?!<button)[\s\S])*?Save resume/)![0]

    const missing = render({ Name: 'Ava' })
    expect(missing).toContain('Choose your field.')
    expect(missing).toContain('Add your specialty, for example Fullstack.')
    expect(saveButton(missing)).toMatch(/\sdisabled=""/)

    const complete = render({ Name: 'Ava', Industry: 'Software development', Specialty: 'Fullstack' })
    expect(complete).not.toContain('Choose your field.')
    expect(saveButton(complete)).not.toMatch(/\sdisabled=""/)
  })
})

describe('seniority details', () => {
  it('reads the tier and reasons stored with a prediction', async () => {
    const { seniorityDetails } = await import('./resume-settings-section')
    expect(seniorityDetails(null)).toEqual({ tier: null, reasons: [] })
    expect(seniorityDetails({
      data: {},
      predictedSeniorityMetadata: { features: { tier: 'New Senior', reasons: ['6 years in QA', 'leads people', 3] } },
    })).toEqual({ tier: 'New Senior', reasons: ['6 years in QA', 'leads people'] })
  })
})

describe('AI queue status in the preview', () => {
  const render = (resume: Record<string, unknown>) => renderWithQuery(<ResumeSettingsSection
    resume={{ data: {}, ...resume }} draft={resumeDraftFromData({ Name: 'Ava' })} attachedFile={null}
    isLoading={false} isImporting={false} isPredicting={false} onFieldChange={() => undefined}
    onClearAttachedFile={() => undefined} onImport={() => undefined} onPredictSeniority={() => undefined}
    onResumeFile={() => undefined} />)

  it('offers Try again when the AI service is unavailable', () => {
    const html = render({ aiStatus: 'AI_UNAVAILABLE', aiStatusMessage: 'The AI service is unavailable right now.' })
    expect(html).toContain('The AI service is unavailable right now.')
    expect(html).toContain('Try again')
  })

  it('shows progress and disables the button while queued', () => {
    const html = render({ aiStatus: 'QUEUED' })
    expect(html).toContain('AI evaluation in progress')
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>(?:(?!<\/button>)[\s\S])*Queued/)
  })

  it('shows the level without a confidence percentage', () => {
    const html = render({ aiStatus: 'DONE', predictedSeniority: 'Mid', predictedSeniorityConfidence: 1,
      predictedSeniorityAt: '2026-11-15T00:00:00Z',
      predictedSeniorityMetadata: { features: { tier: 'New Mid', reasons: ['2 years in Software development'] } } })
    expect(html).toContain('New Mid')
    expect(html).toContain('not a test result')
    expect(html).not.toContain('100%')
  })
})
