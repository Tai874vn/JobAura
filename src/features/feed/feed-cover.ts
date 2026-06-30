type CoverSource = {
  coverImage?: string | null
  cover?: string | null
}

export function selectFeedCover(source: CoverSource) {
  return source.coverImage?.trim() || source.cover?.trim() || null
}
