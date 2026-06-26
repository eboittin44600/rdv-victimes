// src/app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Rendez-vous victimes — Barreau de Saint-Nazaire',
  description: 'Premier rendez-vous gratuit avec un avocat pour les victimes de violences. Barreau de Saint-Nazaire.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
