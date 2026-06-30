import type { CursorPage } from '@/shared/schemas'

export function mergeSavedPages<T extends { id: number }>(pages: CursorPage<T>[] | undefined) {
  const seen = new Set<number>()
  return (pages ?? []).flatMap((page) => page.data.filter((item) => {
    if (seen.has(item.id)) return false
    seen.add(item.id)
    return true
  }))
}
