import { describe, expect, it } from 'vitest'
import { getErrorMessage, toUserError, UserValidationError } from './errors'
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

  it('throws UserValidationError before an invalid file reaches an upload endpoint', () => {
    const file = new File(['text'], 'notes.txt', { type: 'text/plain' })
    let caught: unknown
    try {
      assertValidImageFile(file, { label: 'Cover' })
    } catch (error) {
      caught = error
    }

    expect(caught).toBeInstanceOf(UserValidationError)
    expect((caught as Error).message).toBe('Cover must be a JPEG, PNG, WEBP, or GIF image.')
  })

  it('surfaces image-validation messages through toUserError while keeping plain Error text hidden', () => {
    const oversized = new File(
      [new Uint8Array(imageUploadMaxSizeBytes + 1)],
      'deliverable.png',
      { type: 'image/png' },
    )
    const unsupported = new File(['<svg/>'], 'diagram.svg', { type: 'image/svg+xml' })

    const capture = (file: File) => {
      try {
        assertValidImageFile(file, { label: 'Image' })
      } catch (error) {
        return error
      }
      return undefined
    }

    const oversizedError = capture(oversized)
    const unsupportedError = capture(unsupported)

    expect(toUserError(oversizedError, 'Could not upload this image.')).toEqual({
      message: 'Image must be 5.0 MB or smaller.',
      kind: 'validation',
    })
    expect(getErrorMessage(unsupportedError, 'Could not upload this image.')).toBe(
      'Image must be a JPEG, PNG, WEBP, or GIF image.',
    )
    expect(getErrorMessage(new Error('Internal uploader bug'), 'Could not upload this image.')).toBe(
      'Could not upload this image.',
    )
  })
})
