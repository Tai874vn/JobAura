'use client'

/**
 * Form fields for one certification entry in profile settings. Lets users edit the name, issuer, type, credential ID, issue and expiration dates, URL, and linked skills, and displays validation errors.
 *
 * Calls: SkillPicker; certificationCategories
 * Used by:
 *   - features/workspace/components/settings/profile-settings-editor.tsx
 */

import { Trash2 } from 'lucide-react'
import { Button, Input, Select } from '@/shared/ui'
import { SkillPicker } from './skill-picker'
import { certificationCategories, type CertificationDraft } from '../../utils/certifications'

/** One certification's fields; the same form in Settings and on the profile page. */
export function CertificationFields({ value, onChange, onRemove, problems = [] }: {
  value: CertificationDraft
  onChange: (patch: Partial<CertificationDraft>) => void
  onRemove: () => void
  problems?: string[]
}) {
  return (
    <fieldset className="grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
      <legend className="sr-only">{value.name || 'New certification'}</legend>
      <Labeled label="Name" required>
        <Input value={value.name} maxLength={120} placeholder="For example: AWS Certified Developer – Associate"
          aria-invalid={!value.name.trim() && Boolean(problems.length)} onChange={(event) => onChange({ name: event.target.value })} />
      </Labeled>
      <Labeled label="Issuing organization" required>
        <Input value={value.issuer} maxLength={120} placeholder="For example: Amazon Web Services"
          aria-invalid={!value.issuer.trim() && Boolean(problems.length)} onChange={(event) => onChange({ issuer: event.target.value })} />
      </Labeled>
      <Labeled label="Type">
        <Select value={value.category} onChange={(event) => onChange({ category: event.target.value })}>
          <option value="">Not stated</option>
          {certificationCategories.map((category) => <option key={category} value={category}>{category}</option>)}
        </Select>
      </Labeled>
      <Labeled label="Credential ID">
        <Input value={value.credentialId} maxLength={120} onChange={(event) => onChange({ credentialId: event.target.value })} />
      </Labeled>
      <Labeled label="Issue date">
        <Input type="month" value={value.issuedAt} onChange={(event) => onChange({ issuedAt: event.target.value })} />
      </Labeled>
      <div className="grid gap-1">
        <Labeled label="Expiration date">
          <Input type="month" value={value.noExpiry ? '' : value.expiresAt} disabled={value.noExpiry}
            onChange={(event) => onChange({ expiresAt: event.target.value })} />
        </Labeled>
        <label className="flex items-center gap-2 text-xs font-medium text-muted">
          <input type="checkbox" className="h-4 w-4 accent-primary" checked={value.noExpiry}
            onChange={(event) => onChange({ noExpiry: event.target.checked, expiresAt: event.target.checked ? '' : value.expiresAt })} />
          This credential does not expire
        </label>
      </div>
      <Labeled label="Credential URL" className="sm:col-span-2">
        <Input type="url" value={value.credentialUrl} maxLength={300} placeholder="https://… a page where the credential can be checked"
          onChange={(event) => onChange({ credentialUrl: event.target.value })} />
      </Labeled>
      <div className="sm:col-span-2">
        <SkillPicker label="Skills it shows" max={10} value={value.skills} onChange={(skills) => onChange({ skills })} />
      </div>
      {problems.length ? (
        <ul className="list-disc rounded-lg border border-danger/20 bg-danger/5 py-2 pl-7 pr-3 text-sm text-danger sm:col-span-2" aria-live="polite">
          {problems.map((problem) => <li key={problem}>{problem}</li>)}
        </ul>
      ) : null}
      <div className="flex justify-end sm:col-span-2">
        <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={onRemove}>
          <Trash2 className="h-4 w-4" /> Remove
        </Button>
      </div>
    </fieldset>
  )
}

function Labeled({ label, required = false, className, children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <label className={`grid gap-1 ${className ?? ''}`}>
      <span className="text-sm font-medium">{label}{required ? <span className="text-danger"> *</span> : null}</span>
      {children}
    </label>
  )
}
