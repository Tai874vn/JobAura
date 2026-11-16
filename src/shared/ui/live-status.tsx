'use client'

import { useEffect, useState } from 'react'

/**
 * A polite live region for short status text ("3 occupations found"). It mounts empty and takes its text just
 * after, because screen readers announce changes to a live region, not the text it was created with.
 */
export function LiveStatus({ text }: { text: string }) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setShown(text), 50)
    return () => clearTimeout(timer)
  }, [text])
  return <span role="status" aria-live="polite" className="sr-only">{shown}</span>
}
