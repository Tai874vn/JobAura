'use client'

/**
 * Profile tab editor on the /settings page.
 * Lets the user upload an avatar and cover image, edit basic info, skills, certifications, portfolio items, and recruiter visibility, with one unsaved-changes bar.
 *
 * Calls: useProfileSettings; UnsavedChangesBar; SkillListEditor; CertificationFields; EditorSection; PortfolioFields; UploadField; certificationProblems
 * Used by:
 *   - features/workspace/components/settings/settings-page.tsx
 */

import { Eye, ImageUp, Info, Upload } from 'lucide-react'
import type { UserProfile } from '@/shared/schemas'
import { Avatar, Button, Card, CardContent, ConfirmationDialog, Textarea, UnsavedChangesBar } from '@/shared/ui'
import { removeListItem, updateList } from '@/features/users/utils/profile-form-utils'
import { EditorSection, Field, PortfolioFields, UploadField } from './settings-form-controls'
import { emptyCertification, useProfileSettings } from '../../hooks/use-profile-settings'
import { SkillListEditor } from '@/features/users/components/resume/skill-picker'
import { CertificationFields } from '@/features/users/components/resume/certification-fields'
import { certificationProblems } from '@/features/users/utils/certifications'

/**
 * Settings > Profile: basic info, skills, certifications and portfolio, with one "Save profile" bar
 * (UnsavedChangesBar) that appears when something changed. All logic is in useProfileSettings.
 */
export function ProfileSettingsEditor({
  profile,
  active = true,
  onBlockedNavigation,
}: {
  profile: UserProfile
  active?: boolean
  onBlockedNavigation?: () => void
}) {
  const {
    basic, setBasic, skills, setSkills, certifications, setCertifications, portfolio, setPortfolio, newPortfolio, setNewPortfolio,
    pendingPortfolioDelete, setPendingPortfolioDelete, saveAll, hasChanges, changed, resetChanges, createPortfolio, updatePortfolio,
    deletePortfolio, uploadAvatar, uploadCover, isSaving,
  } = useProfileSettings(profile)

  return (
    <>
      <fieldset disabled={isSaving} className="min-w-0">
        {/* pb-28 keeps the last card clear of the save bar once scrolled to the end. */}
        <div className="grid gap-4 pb-28">
          {/* One save for the profile; leaving /settings from another tab switches back here so the warning is visible. */}
          <UnsavedChangesBar dirty={hasChanges} active={active} saving={saveAll.isPending} saveLabel="Save profile"
            onSave={() => saveAll.mutate()} onReset={resetChanges} onBlockedNavigation={onBlockedNavigation} />

          <Card data-focus="photo">
            <CardContent className="p-5">
              <SectionTitle icon={<ImageUp className="h-3.5 w-3.5" />}>Profile media</SectionTitle>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={profile.name} src={profile.avatar} size="lg" className="h-16 w-16 text-lg" />
                <div className="min-w-48 flex-1">
                  <b className="block text-base font-medium">{profile.name}</b>
                  <span className="mt-0.5 block truncate text-xs text-muted">{profile.email}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <UploadField label="Upload avatar" pending={uploadAvatar.isPending} icon={<Upload className="h-4 w-4" />} onChange={(file) => uploadAvatar.mutate(file)} />
                  <UploadField label="Upload cover" pending={uploadCover.isPending} icon={<ImageUp className="h-4 w-4" />} onChange={(file) => uploadCover.mutate(file)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <SectionTitle icon={<Info className="h-3.5 w-3.5" />}>Basics</SectionTitle>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Name" value={basic.name} onChange={(value) => setBasic((state) => ({ ...state, name: value }))} />
                <Field label="Phone" value={basic.phone} onChange={(value) => setBasic((state) => ({ ...state, phone: value }))} />
                <Field label="Birthday" type="date" value={basic.birthDay} onChange={(value) => setBasic((state) => ({ ...state, birthDay: value }))} />
                <Field label="Gender" value={basic.gender} onChange={(value) => setBasic((state) => ({ ...state, gender: value }))} />
                <Field className="md:col-span-2" label="Headline" focusId="headline" value={basic.headline} onChange={(value) => setBasic((state) => ({ ...state, headline: value }))} />
                <Field label="Location" focusId="location" value={basic.location} onChange={(value) => setBasic((state) => ({ ...state, location: value }))} />
                <Field label="Website" focusId="website" value={basic.website} onChange={(value) => setBasic((state) => ({ ...state, website: value }))} />
                <label data-focus="bio" className="grid gap-1 md:col-span-2">
                  <span className="text-sm font-medium">Bio</span>
                  <Textarea value={basic.bio ?? ''} onChange={(event) => setBasic((state) => ({ ...state, bio: event.target.value }))} />
                </label>
              </div>
            </CardContent>
          </Card>

          <EditorSection title="Skills" focusId="skills">
            <SkillListEditor value={skills} onChange={setSkills} />
          </EditorSection>

          <EditorSection title="Certifications" focusId="certifications" onAdd={() => setCertifications((items) => [...items, { ...emptyCertification }])}>
            {certifications.map((cert, index) => (
              <CertificationFields key={index} value={cert}
                problems={saveAll.isError && changed.certifications ? certificationProblems(cert, index + 1) : []}
                onChange={(patch) => updateList(setCertifications, index, patch)}
                onRemove={() => removeListItem(setCertifications, index)} />
            ))}
          </EditorSection>

          <EditorSection title="New portfolio item" focusId="portfolio" saving={createPortfolio.isPending} onSave={() => createPortfolio.mutate()} saveLabel="Create">
            <PortfolioFields item={newPortfolio} onChange={(patch) => setNewPortfolio((item) => ({ ...item, ...patch }))} />
          </EditorSection>

          <EditorSection title="Portfolio" hideActions>
            {portfolio.map((item, index) => (
              <div key={item.id ?? index} className="grid gap-3 rounded-lg border border-border p-3">
                <PortfolioFields item={item} onChange={(patch) => updateList(setPortfolio, index, patch)} />
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" size="sm" loading={updatePortfolio.isPending && updatePortfolio.variables?.id === item.id} disabled={!item.id || updatePortfolio.isPending} onClick={() => updatePortfolio.mutate(item)}>
                    Save
                  </Button>
                  <Button variant="danger" size="sm" disabled={!item.id} onClick={() => setPendingPortfolioDelete(item)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </EditorSection>

          {profile.role === 'user' ? (
            <Card>
              <CardContent className="p-5">
                <SectionTitle icon={<Eye className="h-3.5 w-3.5" />}>Visibility</SectionTitle>
                <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4">
                  <input
                    type="checkbox"
                    className="mt-1 h-4 w-4 accent-primary"
                    checked={basic.candidateDiscoverable ?? false}
                    onChange={(event) =>
                      setBasic((state) => ({
                        ...state,
                        candidateDiscoverable: event.target.checked,
                      }))
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">Visible to recruiters</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      Show your profile to recruiters in candidate search and AI matching.
                    </span>
                  </span>
                </label>
                {!basic.candidateDiscoverable ? (
                  <p role="status" className="mt-3 rounded-lg border border-rating/40 bg-rating/10 p-3 text-xs leading-5">
                    Recruiters can&apos;t find you in candidate search or AI matching until you turn this on and save.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </fieldset>
      <ConfirmationDialog open={Boolean(pendingPortfolioDelete)} title="Delete this portfolio item?"
        description={`“${pendingPortfolioDelete?.title ?? ''}” will be permanently removed. This action cannot be undone.`}
        confirmLabel="Delete portfolio item" pending={deletePortfolio.isPending}
        onCancel={() => setPendingPortfolioDelete(null)}
        onConfirm={() => { if (pendingPortfolioDelete?.id) deletePortfolio.mutate(pendingPortfolioDelete.id) }} />
    </>
  )
}

function SectionTitle({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-medium"><span className="text-primary">{icon}</span>{children}</h2>
}
