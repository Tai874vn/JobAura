import { ButtonLink, Card, CardContent } from '@/shared/ui'

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-md text-center">
        <CardContent className="p-8">
          <p className="font-display text-6xl font-medium text-primary/30">404</p>
          <h1 className="mt-3 font-display text-2xl font-medium">Page not found</h1>
          <p className="mt-2 text-sm text-muted">The JobAura page you requested does not exist.</p>
          <ButtonLink href="/welcome" className="mt-5">Back home</ButtonLink>
        </CardContent>
      </Card>
    </main>
  )
}
