'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { usersApi } from '@/shared/api/endpoints/users'
import { reportNonFatalError } from '@/shared/api/query-client'
import { queryKeys } from '@/shared/api/query-keys'
import { setCachedSession } from '@/shared/api/session-cache'
import { cleanObject, toDateInput } from '@/features/users/utils/profile-form-utils'
import { refreshMyProfilePage } from '@/features/users/utils/refresh-profile-page'
import { useProfileUpload } from '@/features/users/hooks/use-profile-upload'
import { getErrorMessage, UserValidationError } from '@/shared/lib/utils'
import type { ProfilePortfolioItem, ProfileSkill, UpdateProfile, UserProfile } from '@/shared/schemas'
import type { PortfolioDraft } from '../components/settings/settings-form-controls'
import { allCertificationProblems, certificationDraft, certificationPayload, type CertificationDraft } from '@/features/users/utils/certifications'

export const emptySkill: Omit<ProfileSkill, 'id'> = { name: '', level: '', sortOrder: 0 }
export { emptyCertificationDraft as emptyCertification } from '@/features/users/utils/certifications'
const emptyPortfolio: PortfolioDraft = { title: '', description: '', image: '', url: '', sortOrder: 0 }

export function useProfileSettings(profile: UserProfile) {
  const client = useQueryClient()
  // Initialize from the already-cached session, not a delayed effect. Background
  // session refetches must not replace fields the member is currently editing.
  const [basic, setBasic] = useState<UpdateProfile>(() => ({
    name: profile.name, phone: profile.phone ?? '', birthDay: toDateInput(profile.birthDay), gender: profile.gender ?? '',
    headline: profile.headline ?? '', bio: profile.bio ?? '', location: profile.location ?? '', website: profile.website ?? '',
    candidateDiscoverable: profile.candidateDiscoverable ?? false,
  }))
  const serverSkills = useMemo(() => skillDrafts(profile), [profile])
  const serverSkillsJson = useMemo(() => JSON.stringify(serverSkills), [serverSkills])
  const [skills, setSkills] = useState<Array<Omit<ProfileSkill, 'id'>>>(serverSkills)
  const skillsJson = useMemo(() => JSON.stringify(skills), [skills])
  // The resume edits the same skill list. When it changes there, follow it, unless this list has unsaved edits.
  const [skillsBase, setSkillsBase] = useState(serverSkillsJson)
  if (serverSkillsJson !== skillsBase) {
    if (skillsJson === skillsBase) setSkills(serverSkills)
    setSkillsBase(serverSkillsJson)
  }
  const [certifications, setCertifications] = useState<CertificationDraft[]>(() => (profile.profileCertifications ?? profile.certifications ?? []).map(certificationDraft))
  const [portfolio, setPortfolio] = useState<ProfilePortfolioItem[]>(() => profile.portfolio ?? profile.portfolioItems ?? [])
  const [newPortfolio, setNewPortfolio] = useState<PortfolioDraft>(emptyPortfolio)
  const [pendingPortfolioDelete, setPendingPortfolioDelete] = useState<ProfilePortfolioItem | null>(null)
  const scope = { id: `profile-settings-${profile.id}` }

  function refreshProfile(next?: UserProfile) {
    if (next) setCachedSession(next, client)
    void client.invalidateQueries({ queryKey: queryKeys.me })
    // Job picks depend on profile skills and details, so clear cached recommendations.
    void client.invalidateQueries({ queryKey: ['recommendations', 'jobs'] })
    void refreshMyProfilePage().catch((error) => reportNonFatalError(error, 'cache:revalidate-profile'))
  }
  // Memoize each serialized slice independently so typing in one section never re-serializes the others.
  const basicJson = useMemo(() => JSON.stringify(basic), [basic])
  const certificationsJson = useMemo(() => JSON.stringify(certifications), [certifications])
  // One Save for the whole profile: it sends only the parts that changed since they were last saved.
  const [basicBase, setBasicBase] = useState(basicJson)
  const [certificationsBase, setCertificationsBase] = useState(certificationsJson)
  const changed = useMemo(() => ({
    basic: basicJson !== basicBase,
    skills: skillsJson !== skillsBase,
    certifications: certificationsJson !== certificationsBase,
  }), [basicBase, basicJson, certificationsBase, certificationsJson, skillsBase, skillsJson])
  const hasChanges = changed.basic || changed.skills || changed.certifications
  const saveAll = useMutation({
    scope,
    mutationFn: async () => {
      const parts = { ...changed }
      const snapshot = { basic: basicJson, skills: skillsJson, certifications: certificationsJson }
      const problems = parts.certifications ? allCertificationProblems(certifications) : []
      if (problems.length) throw new UserValidationError(problems[0])
      if (parts.basic) await usersApi.updateMyProfile(cleanObject(basic))
      if (parts.skills) await usersApi.replaceSkills(skills.map((skill, index) => cleanObject({ ...skill, sortOrder: index })).filter((skill) => skill.name))
      if (parts.certifications) await usersApi.replaceCertifications(certificationPayload(certifications))
      return { parts, snapshot }
    },
    onSuccess: ({ parts, snapshot }) => {
      if (parts.basic) setBasicBase(snapshot.basic)
      if (parts.skills) setSkillsBase(snapshot.skills)
      if (parts.certifications) setCertificationsBase(snapshot.certifications)
      refreshProfile()
      // The resume shows the same skill list and is evaluated again.
      if (parts.skills) void client.invalidateQueries({ queryKey: queryKeys.myResume(profile.id) })
      toast.success('Profile saved')
    },
    onError: (error) => {
      // A part that saved before the failure is saved again next time; each save replaces the whole part.
      refreshProfile()
      toast.error(getErrorMessage(error, 'Unable to save your profile'))
    },
  })
  // Back to what was last saved (the save bar's Reset).
  function resetChanges() {
    setBasic(JSON.parse(basicBase))
    setSkills(JSON.parse(skillsBase))
    setCertifications(JSON.parse(certificationsBase))
  }
  const createPortfolio = useMutation({
    scope, mutationFn: () => usersApi.createPortfolioItem(cleanObject(newPortfolio)),
    onSuccess: (response) => {
      const savedItems = response.content?.portfolio ?? response.content?.portfolioItems ?? []
      setPortfolio((current) => [...current, ...savedItems.filter((item) => !current.some((existing) => existing.id === item.id))])
      refreshProfile(response.content)
      setNewPortfolio(emptyPortfolio)
      toast.success('Portfolio item created')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to create portfolio item')),
  })
  const updatePortfolio = useMutation({
    scope, mutationFn: (item: ProfilePortfolioItem) => usersApi.updatePortfolioItem(Number(item.id), cleanObject(item)),
    onSuccess: (response) => { refreshProfile(response.content); toast.success('Portfolio item updated') },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to update portfolio item')),
  })
  const deletePortfolio = useMutation({
    scope, mutationFn: usersApi.deletePortfolioItem,
    onSuccess: (_response, id) => {
      setPortfolio((current) => current.filter((item) => item.id !== id))
      refreshProfile(); setPendingPortfolioDelete(null); toast.success('Portfolio item deleted')
    },
    onError: (error) => toast.error(getErrorMessage(error, 'Unable to delete portfolio item')),
  })
  const uploadAvatar = useProfileUpload(usersApi.uploadAvatar, 'Avatar uploaded', refreshProfile)
  const uploadCover = useProfileUpload(usersApi.uploadCover, 'Cover uploaded', refreshProfile)
  const isSaving = saveAll.isPending || createPortfolio.isPending
    || updatePortfolio.isPending || deletePortfolio.isPending || uploadAvatar.isPending || uploadCover.isPending

  return {
    basic, setBasic, skills, setSkills, certifications, setCertifications, portfolio, setPortfolio, newPortfolio, setNewPortfolio,
    pendingPortfolioDelete, setPendingPortfolioDelete, saveAll, hasChanges, changed, resetChanges, createPortfolio, updatePortfolio,
    deletePortfolio, uploadAvatar, uploadCover, isSaving,
  }
}

function skillDrafts(profile: UserProfile): Array<Omit<ProfileSkill, 'id'>> {
  return (profile.profileSkills ?? profile.skills ?? []).map(({ name, level, sortOrder }, index) => ({ name, level: level ?? '', sortOrder: sortOrder ?? index }))
}
