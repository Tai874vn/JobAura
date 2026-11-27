/**
 * Builds the default Open Graph preview image for shared JobAura links. Pages without their own photo fall back to this PNG card.
 *
 * Calls: defaultShareImage
 * Used by:
 *   - Next.js router: the share image for link previews
 */

import { ImageResponse } from 'next/og'
import { defaultShareImage } from '@/shared/lib/seo'

// The shared preview picture (Open Graph image: the card shown when a JobAura link is posted on social sites or in
// chat apps). Pages with their own picture (a profile avatar, a service image) still use theirs.
export const alt = defaultShareImage.alt
export const size = { width: defaultShareImage.width, height: defaultShareImage.height }
export const contentType = 'image/png'

const colors = {
  background: '#f4f2ee',
  surface: '#ffffff',
  foreground: '#1c1b19',
  muted: '#5e5a52',
  primary: '#006d43',
  accent: '#d2d92d',
  border: '#e3e0da',
}

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: colors.background,
          color: colors.foreground,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* The app icon (src/app/icon.svg), drawn again here because the image tool cannot read files. */}
          <svg width="72" height="72" viewBox="0 0 64 64">
            <rect width="64" height="64" rx="16" fill={colors.primary} />
            <path d="M19 32c0-7.18 5.82-13 13-13 2.95 0 5.68.98 7.86 2.64" fill="none" stroke={colors.accent} strokeWidth="6" strokeLinecap="round" />
            <path d="M45 32c0 7.18-5.82 13-13 13-2.95 0-5.68-.98-7.86-2.64" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" />
            <circle cx="32" cy="32" r="7" fill="#ffffff" />
            <circle cx="32" cy="32" r="3" fill={colors.primary} />
          </svg>
          <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, color: colors.primary }}>JobAura</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 600, lineHeight: 1.1, maxWidth: 960 }}>
            Find a role, show your work, or hire the right person.
          </div>
          <div style={{ display: 'flex', fontSize: 32, color: colors.muted }}>
            Hiring posts, candidate portfolios and AI matching in one place.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 16 }}>
          {['Hiring posts', 'Portfolios', 'AI matching'].map((label) => (
            <div
              key={label}
              style={{
                display: 'flex',
                padding: '12px 24px',
                borderRadius: 999,
                border: `2px solid ${colors.border}`,
                background: colors.surface,
                fontSize: 26,
                color: colors.foreground,
              }}
            >
              {label}
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  )
}
