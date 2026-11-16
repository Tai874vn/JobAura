'use client'

import { Eye, ImageUp, Info, Save, Upload } from 'lucide-react'
import type { UserProfile } from '@/shared/schemas'
import { Avatar, Button, Card, CardContent, ConfirmationDialog, Textarea } from '@/shared/ui'
import { removeListItem, updateList } from '@/features/users/profile-form-utils'
import { EditorSection, Field, IconButton, PortfolioFields, UploadField } from './settings-form-controls'
import { emptyCertification, emptySkill, useProfileSettings } from './use-profile-settings'
import { SkillLevelSelect, SkillPicker } from '@/features/users/skill-picker'
import { CertificationFields } from '@/features/users/certification-fields'
import { certificationProblems } from '@/features/users/certifications'
import { hiddenFromRecruitersReason, isHiddenFromRecruiters } from '@/features/users/profile-strength'

export function ProfileSettingsEditor({ profile }: { profile: UserProfile }) {
  const {
    basic, setBasic, skills, setSkills, certifications, setCertifications, portfolio, setPortfolio, newPortfolio, setNewPortfolio,
    pendingPortfolioDelete, setPendingPortfolioDelete, saveAll, hasChanges, changed, createPortfolio, updatePortfolio,
    deletePortfolio, uploadAvatar, uploadCover, isSaving,
  } = useProfileSettings(profile)
  // Judged on the saved profile and the backend's flag, which is what recruiters' search uses.
  const hiddenReason = isHiddenFromRecruiters(profile) ? hiddenFromRecruitersReason(profile) : null

  return (
    <>
      <fieldset disabled={isSaving} className="min-w-0">
        {/* pb-24 keeps the last card clear of the floating buttons once scrolled to the end. */}
        <div className="grid gap-4 pb-24">
          {/* Floats above the Chat button (bottom-5, 48px tall) so it stays in reach while editing a long profile.
              The open chat panel (z-50) covers it, and it hides with this section. */}
          <Button className="fixed bottom-[84px] right-5 z-40 h-12 rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
            loading={saveAll.isPending} disabled={isSaving || !hasChanges} onClick={() => saveAll.mutate()}>
            <Save className="h-4 w-4" />
            {hasChanges ? 'Save profile' : 'All saved'}
          </Button>

          <Card data-focus="photo">
            <CardContent className="p-5">
              <SectionTitle icon={<ImageUp className="h-3.5 w-3.5" />}>Profile media</SectionTitle>
              <div className="flex flex-wrap items-center gap-4">
                <Avatar name={profile.name} src={profile.avatar} size="lg" className="h-16 w-16 text-lg" />
                <div className="min-w-48 flex-1">
                  <b className="block text-base font-bold">{profile.name}</b>
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
                  <span className="text-sm font-semibold">Bio</span>
                  <Textarea value={basic.bio ?? ''} onChange={(event) => setBasic((state) => ({ ...state, bio: event.target.value }))} />
                </label>
              </div>
            </CardContent>
          </Card>

          <EditorSection title="Skills" focusId="skills" onAdd={() => setSkills((items) => [...items, { ...emptySkill, sortOrder: items.length }])}>
            {skills.map((skill, index) => (
              <div key={index} className="grid items-end gap-3 rounded-lg border border-border p-3 md:grid-cols-[1fr_180px_40px]">
                <SkillPicker label="Skill" max={1} value={skill.name ? [skill.name] : []}
                  onChange={(names) => updateList(setSkills, index, { name: names[0] ?? '' })} />
                <SkillLevelSelect value={skill.level} onChange={(level) => updateList(setSkills, index, { level })} />
                <IconButton label="Remove skill" onClick={() => removeListItem(setSkills, index)} />
              </div>
            ))}
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
                    <span className="block text-sm font-semibold">Visible to recruiters</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">
                      Allow recruiters to find this completed profile in candidate search and AI matching.
                    </span>
                  </span>
                </label>
                {basic.candidateDiscoverable && hiddenReason ? (
                  <p role="status" className="mt-3 rounded-lg border border-rating/40 bg-rating/10 p-3 text-xs leading-5">
                    Recruiters can&apos;t find you yet: {hiddenReason}.
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
  return <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold"><span className="text-primary">{icon}</span>{children}</h3>
}
