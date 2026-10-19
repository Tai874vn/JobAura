import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { resumeDraftFromData } from '@/features/users/resume'
import { ResumeSettingsSection } from './resume-settings-section'

describe('Compact resume details', () => {
  it('keeps extracted text editable behind a collapsed disclosure', () => {
    const html = renderToStaticMarkup(<ResumeSettingsSection resume={null}
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
})
