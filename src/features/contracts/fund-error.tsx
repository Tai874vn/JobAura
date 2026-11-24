import { Button, ButtonLink } from '@/shared/ui'
import { creditsShortage } from './amendment-changes'

/** The two ways out when the client has too few credits: `Top up` (the wallet page) and `Ask to lower the amount`. */
export function FundWaysOut({ onLowerAmount }: { onLowerAmount?: () => void }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <ButtonLink href="/wallet" size="sm">Top up</ButtonLink>
      {onLowerAmount ? (
        <Button type="button" variant="secondary" size="sm" onClick={onLowerAmount}>Ask to lower the amount</Button>
      ) : null}
    </div>
  )
}

/**
 * What the fund dialog shows when the server refused. For the "too few credits" sentence it adds the two ways out
 * (`onLowerAmount` opens the change-request editor started on that milestone; leave it out when a change request
 * cannot be sent now). Any other refusal shows the sentence alone.
 */
export function FundError({ message, onLowerAmount }: { message: string; onLowerAmount?: () => void }) {
  return (
    <div className="mt-4">
      <p role="alert" className="break-words text-sm text-danger">{message}</p>
      {creditsShortage(message) ? <FundWaysOut onLowerAmount={onLowerAmount} /> : null}
    </div>
  )
}
