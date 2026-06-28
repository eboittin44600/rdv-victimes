// src/app/api/admin/avocats/[id]/route.ts
// PATCH /api/admin/avocats/:id — Activer / désactiver
// PUT   /api/admin/avocats/:id — Modifier un avocat
// DELETE /api/admin/avocats/:id — Supprimer un avocat
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { actif } = await req.json()
  const avocat = await prisma.avocat.update({
    where: { id: params.id },
    data: { actif },
  })
  return NextResponse.json({ avocat })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const avocat = await prisma.avocat.update({
    where: { id: params.id },
    data: {
      prenom: body.prenom,
      nom: body.nom,
      email: body.email.toLowerCase().trim(),
      telephone: body.telephone || null,
      actif: body.actif,
      visioOk: body.visioOk,
      specialites: body.specialites,
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'AVOCAT_MODIFIE',
      acteur: 'ADMIN',
      details: JSON.stringify({ avocatId: avocat.id }),
    },
  })

  return NextResponse.json({ avocat })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Vérifier qu'il n'a pas de RDV à venir
  const rdvsAVenir = await prisma.rendezVous.count({
    where: {
      avocatId: params.id,
      statut: 'CONFIRME',
      creneau: { debut: { gte: new Date() } },
    },
  })

  if (rdvsAVenir > 0) {
    return NextResponse.json(
      { error: `Impossible de supprimer : ${rdvsAVenir} rendez-vous à venir. Désactivez l'avocat à la place.` },
      { status: 409 }
    )
  }

  await prisma.avocat.delete({ where: { id: params.id } })

  await prisma.auditLog.create({
    data: {
      action: 'AVOCAT_SUPPRIME',
      acteur: 'ADMIN',
      details: JSON.stringify({ avocatId: params.id }),
    },
  })

  return NextResponse.json({ success: true })
}

