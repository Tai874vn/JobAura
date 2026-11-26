import { describe, expect, it } from 'vitest'
import {
  certificationDraft, certificationPayload, certificationProblems, emptyCertificationDraft, isCertificationExpired,
} from '../certifications'

const today = new Date('2026-11-16T00:00:00Z')
const draft = (patch: Partial<typeof emptyCertificationDraft>) => ({ ...emptyCertificationDraft, name: 'CKA', issuer: 'CNCF', ...patch })

describe('certifications', () => {
  it('requires the name and the issuing organization', () => {
    expect(certificationProblems({ ...emptyCertificationDraft }, 1, today)).toEqual([
      'Certification 1: add the certification name.',
      'Certification 1: add the issuing organization.',
    ])
  })

  it('checks the dates and the credential URL', () => {
    expect(certificationProblems(draft({ issuedAt: '2027-01' }), 1, today)).toEqual(['CKA: the issue date is in the future.'])
    expect(certificationProblems(draft({ issuedAt: '2024-05', expiresAt: '2024-01' }), 1, today))
      .toEqual(['CKA: the expiry date is before the issue date.'])
    expect(certificationProblems(draft({ credentialUrl: 'cncf.io/cert' }), 1, today))
      .toEqual(['CKA: the credential URL must start with http:// or https://.'])
    expect(certificationProblems(draft({ issuedAt: '2024-05', expiresAt: '2027-05' }), 1, today)).toEqual([])
  })

  it('sends months as the first day and leaves out the expiry when it does not expire', () => {
    expect(certificationPayload([
      draft({ issuedAt: '2024-05', expiresAt: '2027-05', noExpiry: true, skills: ['Kubernetes'], credentialUrl: ' https://x.io/1 ' }),
      { ...emptyCertificationDraft },
    ])).toEqual([{
      name: 'CKA', issuer: 'CNCF', category: 'Certification', skills: ['Kubernetes'], sortOrder: 0,
      issuedAt: '2024-05-01', credentialUrl: 'https://x.io/1',
    }])
  })

  it('reads a saved certification back into months', () => {
    const back = certificationDraft({ name: 'CKA', issuer: 'CNCF', issuedAt: '2024-05-01T00:00:00.000Z', expiresAt: null })
    expect(back).toMatchObject({ issuedAt: '2024-05', expiresAt: '', noExpiry: true, skills: [], category: '' })
  })

  it('counts a credential as valid through its expiry month', () => {
    expect(isCertificationExpired({ expiresAt: '2026-11-01T00:00:00.000Z' }, today)).toBe(false)
    expect(isCertificationExpired({ expiresAt: '2026-10-01T00:00:00.000Z' }, today)).toBe(true)
    expect(isCertificationExpired({ expiresAt: null }, today)).toBe(false)
  })
})
