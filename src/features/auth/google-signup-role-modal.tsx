'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'
import { signupRoleOptions, type SignupRole } from '@/shared/lib/roles'
import { Button } from '@/shared/ui'

export function GoogleSignupRoleModal({ open, selectedRole, onSelect, onClose, onContinue }: {
  open: boolean
  selectedRole: SignupRole | null
  onSelect: (role: SignupRole) => void
  onClose: () => void
  onContinue: () => void
}) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="motion-overlay fixed inset-0 z-80 flex items-center justify-center bg-black/55 p-4" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="google-role-title" aria-describedby="google-role-description" className="motion-panel relative w-full max-w-lg rounded-lg bg-surface p-5 shadow-overlay">
        <Button className="absolute right-2 top-2" type="button" variant="ghost" size="icon" onClick={onClose} title="Close account type selection">
          <X className="h-5 w-5" />
        </Button>
        <div className="pr-9">
          <h2 id="google-role-title" className="font-display text-xl font-medium">Choose your account type</h2>
          <p id="google-role-description" className="mt-2 text-sm leading-6 text-muted">This Google account is not registered yet. Choose how you want to use JobAura before creating it.</p>
        </div>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {signupRoleOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rounded-lg border p-3 text-left transition ${selectedRole === option.value ? 'border-primary bg-primary/5 text-foreground' : 'border-border bg-surface text-muted hover:border-primary hover:text-foreground'}`}
              aria-pressed={selectedRole === option.value}
              onClick={() => onSelect(option.value)}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span className="mt-1 block text-xs leading-5">{option.description}</span>
            </button>
          ))}
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={onClose}>Not now</Button>
          <Button type="button" onClick={onContinue} disabled={!selectedRole}>Continue with Google</Button>
        </div>
      </section>
    </div>
  )
}
