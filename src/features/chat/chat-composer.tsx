'use client'

import { Send } from 'lucide-react'
import { Button } from '@/shared/ui'

/** Bottom reply bar of a conversation. Draft state lives in `ChatShell` so closing and reopening chat keeps it. */
export function ChatComposer({
  draft,
  disabled,
  isSending,
  onDraftChange,
  onSend,
}: {
  draft: string
  disabled: boolean
  isSending: boolean
  onDraftChange: (value: string) => void
  onSend: () => void
}) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSend()
  }

  return (
    <form className="flex gap-2 border-t border-border p-2.5" onSubmit={handleSubmit}>
      <div className="flex min-w-0 flex-1 items-center field-shell rounded-md border border-border bg-surface px-4">
        <input
          className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none"
          placeholder="Write a reply"
          value={draft}
          maxLength={5000}
          onChange={(event) => onDraftChange(event.target.value)}
          disabled={disabled || isSending}
        />
      </div>
      <Button
        type="submit"
        className="h-10 w-10 shrink-0 rounded-full p-0"
        loading={isSending}
        disabled={disabled || !draft.trim() || isSending}
        aria-label="Send message"
      >
        <Send className="h-4 w-4" />
      </Button>
    </form>
  )
}
