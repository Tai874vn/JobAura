'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { Card, CardContent } from '@/shared/ui'

export function SettingsPage() {
  return (
    <div className="container-page py-8">
      <h1 className="font-display text-4xl font-bold">Settings</h1>
      <p className="mt-1 text-sm text-muted">Account and interface preferences.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {[
          { label: 'Light', icon: Sun, description: 'Primary JobAura interface mode' },
          { label: 'Dark', icon: Moon, description: 'Prepared for future theme support' },
          { label: 'System', icon: Monitor, description: 'Follow device preference later' },
        ].map(({ label, icon: Icon, description }) => (
          <Card key={label}>
            <CardContent>
              <Icon className="mb-8 h-5 w-5 text-primary" />
              <h2 className="font-display text-xl font-bold">{label}</h2>
              <p className="mt-1 text-sm text-muted">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
