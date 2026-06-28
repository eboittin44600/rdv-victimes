export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { actif } = await req.json()
  const avocat = await prisma.avocat.update({ where: { id: params.id }, data: { actif } })
  return NextResponse.json({ avocat })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const body = await req.json()

  await prisma.avocat.update({
    where: { id: params.id },
    data: {
      prenom: body.prenom,
      nom: body.nom,
      email: body.email.toLowerCase().trim(),
      telephone: body.telephone || null,
      actif: body.actif,
      visioOk: body.visioOk,
      specialites: [],
    },
  })

  await prisma.$executeRaw`
    UPDATE avocats SET
      numero_rue = ${body.numeroRue || null},
      nom_rue = ${body.nomRue || null},
      code_postal = ${body.codePostal || null},
      commune = ${body.commune || null},
      annee_serment = ${body.anneeSerment || null},
      certificat_specialisation = ${body.certificatSpecialisation || null},
      description = ${body.description || null},
      photo_url = ${body.photoUrl || null}
    WHERE id = ${params.id}::uuid
  `

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rdvsAVenir = await prisma.rendezVous.count({
    where: { avocatId: params.id, statut: 'CONFIRME', creneau: { debut: { gte: new Date() } } },
  })
  if (rdvsAVenir > 0) {
    return NextResponse.json(
      { error: `Impossible : ${rdvsAVenir} RDV à venir. Désactivez l'avocat à la place.` },
      { status: 409 }
    )
  }

  await prisma.avocat.delete({ where: { id: params.id } })
  return NextResponse.json({ success: true })
}