/** How many items one choice finds, as the backend's facet endpoints send it. */
export type ChoiceCount = { value: string; count: number }

/** "a,b" ⇄ ["a", "b"]: several values of one filter travel as one comma-separated URL value. */
export function listOf(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean)
}

/** Ticks or unticks one value in a comma-separated filter value. */
export function toggleListValue(value: string, item: string) {
  const values = listOf(value)
  return (values.includes(item) ? values.filter((one) => one !== item) : [...values, item]).join(',')
}

/** The count beside a filter choice; letter case does not matter. Nothing when the backend sent no count. */
export function countOf(counts: ChoiceCount[] | undefined, value: string) {
  return counts?.find((item) => item.value.toLowerCase() === value.toLowerCase())?.count
}

/** The first and last item on a page, for "Showing 11–20 of 35". Both are 0 when nothing matches. */
export function shownRange(page: number, pageSize: number, total: number) {
  return { first: total ? (page - 1) * pageSize + 1 : 0, last: Math.min(page * pageSize, total) }
}
