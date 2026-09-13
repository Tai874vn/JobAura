import { ArrowRight } from 'lucide-react'
import { ButtonLink, Section } from '@/shared/ui'

export function CtaBand() {
  return (
    <Section tone="primary">
      <div className="flex flex-col items-center gap-5 text-center">
        <h2 className="max-w-2xl font-display text-3xl font-bold text-white sm:text-4xl">Ready when you are.</h2>
        <p className="max-w-xl text-sm leading-6 text-white/80 sm:text-base">
          Join JobAura to hire trusted professionals or put your skills in front of clients today.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/auth/register" variant="accent" size="lg">
            Join JobAura <ArrowRight className="h-4 w-4" />
          </ButtonLink>
          <ButtonLink
            href="/auth/login"
            variant="secondary"
            size="lg"
            className="border-white/70 bg-transparent text-white hover:border-white hover:bg-white hover:text-foreground"
          >
            Sign in
          </ButtonLink>
        </div>
      </div>
    </Section>
  )
}
