// src/app/api/lawyers/auth/request/route.ts
// POST /api/lawyers/auth/request — Demande de lien magique

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { genererLienMagique } from '@/lib/auth'
import { sendEmailMagiqueAvocat } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'Email requis' }, { status: 400 })

  const avocat = await prisma.avocat.findUnique({
    where: { email: email.toLowerCase().trim() },
  })

  // Réponse identique même si l'email n'existe pas (évite l'énumération)
  if (!avocat) {
    return NextResponse.json({ success: true })
  }

  const token = await genererLienMagique(avocat.id)
  await sendEmailMagiqueAvocat({ email: avocat.email, nom: avocat.nom, token })

  return NextResponse.json({ success: true })
}
