'use client'

import { GraduationCap, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { CandidateProfile } from '@/shared/schemas'
import { Avatar } from '@/shared/ui'
import {
  candidateCardActions,
  candidateCardFacts,
  getCandidateSkillNames,
  type CandidateViewer,
} from './candidate-directory'

const SKILLS_SHOWN = 5

const secondaryButton =
  'interaction inline-flex h-[42px] items-center justify-center gap-1.5 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-primary hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary'

/**
 * One candidate in the /candidates results column, styled like JobResultCard and HiringPostResultCard:
 * avatar and name at the top, occupation and AI level, career years and location facts, top 5 skills,
 * an optional degree line, and View profile / Message / Connect actions along the bottom.
 */
export function CandidateResultCard({
  candidate,
  viewer,
  connectAction,
}: {
  candidate: CandidateProfile
  viewer: CandidateViewer
  /** Live connection control (Connect / Request sent / Accept / Connected) supplied by the page. */
  connectAction?: ReactNode
}) {
  const profileHref = `/profile/${candidate.id}`
  const facts = candidateCardFacts(candidate)
  const actions = candidateCardActions(candidate, viewer)
  const skills = getCandidateSkillNames(candidate)
  const headline = candidate.headline?.trim()
  const bio = candidate.bio?.trim()
  const portfolioTotal = candidate.stats.portfolioItems + candidate.stats.listedServices
  const strength = candidate.profileStrength ?? Math.round(candidate.match.qualityScore * 100)

  function openChat() {
    if (!candidate.id) return
    // The global chat widget listens for this custom browser event (CustomEvent) and opens a direct room.
    window.dispatchEvent(new CustomEvent('jobaura:open-chat', { detail: { userId: candidate.id } }))
  }

  return (
    <article
      aria-labelledby={`candidate-${candidate.id}-name`}
      className="group/card grid gap-3 rounded-xl border border-border bg-surface p-5 transition-[border-color,box-shadow] duration-200 hover:border-[#c5d8c8] hover:shadow-float sm:p-6"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3.5">
          <Link
            href={profileHref}
            title={`View ${candidate.name}'s profile`}
            aria-label={`View ${candidate.name}'s profile`}
            className="shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Avatar name={candidate.name} src={candidate.avatar} size="lg" className="size-[46px]" />
          </Link>

          <div className="min-w-0 flex-1">
            <h2
              id={`candidate-${candidate.id}-name`}
              className="break-words text-xl font-semibold leading-tight tracking-[-0.01em] text-foreground sm:text-2xl"
            >
              <Link
                href={profileHref}
                className="transition-colors duration-150 group-hover/card:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {candidate.name}
              </Link>
            </h2>

            {headline ? (
              <p className="mt-0.5 truncate text-sm font-medium text-muted">{headline}</p>
            ) : null}

            {facts.occupation ? (
              <p className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                <span className="rounded-md bg-[#123f32] px-2 py-1 text-white">{facts.occupation}</span>
                {facts.specialty ? (
                  <span className="rounded-md border border-[#c5d8c8] bg-surface px-2 py-1 text-[#123f32]">
                    {facts.specialty}
                  </span>
                ) : null}
              </p>
            ) : null}
          </div>
        </div>

        {facts.level ? (
          <div className="sm:shrink-0 sm:text-right">
            <span
              title="Level read by AI from the resume"
              className="inline-flex rounded-md bg-[#e9f3ec] px-2.5 py-1 text-xs font-semibold text-primary"
            >
              {facts.level}
            </span>
          </div>
        ) : null}
      </div>

      {!facts.hasResume ? (
        <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px] text-muted">
          <span>No resume yet</span>
          {facts.location ? (
            <span className="inline-flex items-center gap-[18px]">
              <span aria-hidden="true" className="text-[#a0aba3]">·</span>
              {facts.location}
            </span>
          ) : null}
        </div>
      ) : (
        <>
          {facts.occupationNotice ? (
            <p className="text-[13px] text-muted">{facts.occupationNotice}</p>
          ) : null}

          {facts.facts.length ? (
            <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[13px] text-muted">
              {facts.facts.map((item, index) => (
                <span key={item} className="inline-flex items-center gap-[18px]">
                  {index ? <span aria-hidden="true" className="text-[#a0aba3]">·</span> : null}
                  {item}
                </span>
              ))}
            </div>
          ) : null}
        </>
      )}

      {facts.degree ? (
        <p className="inline-flex items-center gap-1.5 text-[13px] text-muted">
          <GraduationCap className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{facts.degree}</span>
        </p>
      ) : null}

      {bio ? (
        <p className="line-clamp-2 break-words text-sm leading-6 text-muted">{bio}</p>
      ) : null}

      {skills.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {skills.slice(0, SKILLS_SHOWN).map((skill) => (
            <li
              key={skill}
              className="rounded-md border border-[#d7e2d9] bg-[#f1f6f2] px-2.5 py-1 text-[13px] font-medium text-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-[#e4efe6]"
            >
              {skill}
            </li>
          ))}
          {skills.length > SKILLS_SHOWN ? (
            <li className="px-1 py-1 text-xs font-medium text-muted">
              +{skills.length - SKILLS_SHOWN} more
            </li>
          ) : null}
        </ul>
      ) : null}

      <div className="flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center">
        <p className="flex min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
          <span className="tabular-nums">Profile strength {strength}%</span>
          {portfolioTotal > 0 ? (
            <span className="tabular-nums">
              {portfolioTotal === 1 ? '1 portfolio item' : `${portfolioTotal} portfolio items`}
            </span>
          ) : null}
          {candidate.stats.certifications > 0 ? (
            <span className="tabular-nums">
              {candidate.stats.certifications === 1
                ? '1 certificate'
                : `${candidate.stats.certifications} certificates`}
            </span>
          ) : null}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Link href={profileHref} className={secondaryButton}>
            View profile
          </Link>

          {actions.message ? (
            <button type="button" onClick={openChat} className={secondaryButton}>
              <MessageSquare className="h-4 w-4" aria-hidden="true" />
              Message
            </button>
          ) : null}

          {actions.connect ? connectAction : null}
        </div>
      </div>
    </article>
  )
}
