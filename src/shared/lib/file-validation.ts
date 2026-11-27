/**
 * Validates uploaded image files for forms, posts, and contract attachments before upload.
 * Checks that a file is JPEG, PNG, or WEBP and within the allowed size limit, returning a result or throwing a validation error.
 *
 * Calls: UserValidationError
 * Used by:
 *   - 10 files, for example features/contracts/api.ts, features/contracts/components/dialogs/submit-work-dialog.tsx, features/contracts/components/proposal/proposal-editor.tsx
 */

import { UserValidationError } from './errors'

const imageUploadMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])

const imageUploadExtensions = new Set(['jpg', 'jpeg', 'png', 'webp'])

export const imageUploadAccept = Array.from(imageUploadMimeTypes).join(',')
export const imageUploadMaxSizeBytes = 5 * 1024 * 1024

export type FileValidationResult =
  | { valid: true }
  | { valid: false; message: string }

export function validateImageFile(
  file: File,
  {
    label = 'Image',
    maxSizeBytes = imageUploadMaxSizeBytes,
  }: {
    label?: string
    maxSizeBytes?: number
  } = {}
): FileValidationResult {
  if (file.size > maxSizeBytes) {
    return { valid: false, message: `${label} must be ${formatFileSize(maxSizeBytes)} or smaller.` }
  }

  if (!isSupportedImageFile(file)) {
    return { valid: false, message: `${label} must be a JPEG, PNG or WEBP image.` }
  }

  return { valid: true }
}

export function assertValidImageFile(
  file: File,
  options?: Parameters<typeof validateImageFile>[1]
) {
  const validation = validateImageFile(file, options)
  if (!validation.valid) throw new UserValidationError(validation.message)
}

function isSupportedImageFile(file: File) {
  const type = file.type.toLowerCase()
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''

  if (type) return imageUploadMimeTypes.has(type)
  return imageUploadExtensions.has(extension)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
