import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { UploadField } from './settings-form-controls'

describe('Settings upload feedback', () => {
  it('announces an upload and disables selecting another file while pending', () => {
    const html = renderToStaticMarkup(<UploadField label="Upload avatar" icon={null} pending onChange={() => undefined} />)
    expect(html).toContain('aria-busy="true"')
    expect(html).toContain('role="status"')
    expect(html).toContain('Uploading avatar')
    expect(html).toContain('disabled=""')
  })
})
