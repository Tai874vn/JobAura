import type { Dispatch, SetStateAction } from 'react'

export function updateList<T>(
  setter: Dispatch<SetStateAction<T[]>>,
  index: number,
  patch: Partial<T>,
) {
  setter((items) => items.map((item, itemIndex) => (
    itemIndex === index ? { ...item, ...patch } : item
  )))
}

export function removeListItem<T>(setter: Dispatch<SetStateAction<T[]>>, index: number) {
  setter((items) => items.filter((_, itemIndex) => itemIndex !== index))
}

export function cleanObject<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => (
      entry !== '' && entry !== undefined && entry !== null
    )),
  ) as T
}

export function toDateInput(value?: string | null) {
  return value ? value.slice(0, 10) : ''
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
