// src/app/api/lawyers/me/route.ts
// GET /api/lawyers/me — Profil de l'avocat connecté
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { verifyAvocatToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  return NextResponse.json({
    id: avocat.id,
    prenom: avocat.prenom,
    nom: avocat.nom,
    email: avocat.email,
    actif: avocat.actif,
    visioOk: avocat.visioOk,
  })
}

export async function PATCH(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { actif, visioOk } = await req.json()
  const { prisma } = await import('@/lib/db')

  const updated = await prisma.avocat.update({
    where: { id: avocat.id },
    data: {
      ...(actif !== undefined ? { actif } : {}),
      ...(visioOk !== undefined ? { visioOk } : {}),
    },
  })

  return NextResponse.json({ actif: updated.actif, visioOk: updated.visioOk })
}
