import { describe, expect, it } from 'vitest'
import {
  assertValidImageFile,
  imageUploadMaxSizeBytes,
  validateImageFile,
} from './file-validation'

describe('image file validation', () => {
  it('accepts supported image MIME types', () => {
    const file = new File(['image'], 'avatar.png', { type: 'image/png' })
    expect(validateImageFile(file)).toEqual({ valid: true })
  })

  it('uses the extension when a browser provides no MIME type', () => {
    const file = new File(['image'], 'avatar.webp', { type: '' })
    expect(validateImageFile(file)).toEqual({ valid: true })
  })

  it('rejects unsupported and oversized files', () => {
    const unsupported = new File(['script'], 'avatar.svg', { type: 'image/svg+xml' })
    const oversized = new File(
      [new Uint8Array(imageUploadMaxSizeBytes + 1)],
      'avatar.png',
      { type: 'image/png' },
    )

    expect(validateImageFile(unsupported)).toEqual({
      valid: false,
      message: 'Image must be a JPEG, PNG, WEBP, or GIF image.',
    })
    expect(validateImageFile(oversized, { label: 'Avatar' })).toEqual({
      valid: false,
      message: 'Avatar must be 5.0 MB or smaller.',
    })
  })

  it('throws before an invalid file reaches an upload endpoint', () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    expect(() => assertValidImageFile(file, { label: 'Cover' })).toThrow(
      'Cover must be a JPEG, PNG, WEBP, or GIF image.',
    )
  })
})
