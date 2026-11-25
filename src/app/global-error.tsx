'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

/**
 * Root-level fallback shown only if the root layout itself fails.
 * Uses inline light-theme styles matching JobAura's tokens and a plain anchor
 * tag so recovery still works even when global stylesheets or router state fail.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          backgroundColor: '#f4f2ee',
          color: '#1c1b19',
          fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, sans-serif',
        }}
      >
        <main
          style={{
            width: '100%',
            maxWidth: '448px',
            backgroundColor: '#ffffff',
            border: '1px solid #e3e0da',
            borderRadius: '12px',
            padding: '32px',
            textAlign: 'center',
            boxShadow: '0 1px 2px rgba(28, 27, 25, 0.05)',
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: '15px',
              fontWeight: 600,
              color: '#006d43',
            }}
          >
            JobAura
          </p>
          <h1
            style={{
              margin: '12px 0 0',
              fontSize: '24px',
              lineHeight: 1.3,
              fontWeight: 500,
              color: '#1c1b19',
            }}
          >
            Something went wrong
          </h1>
          <p
            style={{
              margin: '8px 0 0',
              fontSize: '14px',
              lineHeight: 1.6,
              color: '#5e5a52',
            }}
          >
            The page ran into an unexpected error. Try again, or head back to the home page.
          </p>
          <div
            style={{
              marginTop: '24px',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                height: '40px',
                padding: '0 16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: '#006d43',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Global error replaces the root layout, so a full document load is safer than client routing. */}
            <a
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '40px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid #e3e0da',
                backgroundColor: '#ffffff',
                color: '#1c1b19',
                fontSize: '14px',
                fontWeight: 500,
                textDecoration: 'none',
              }}
            >
              Back home
            </a>
          </div>
        </main>
      </body>
    </html>
  )
}
