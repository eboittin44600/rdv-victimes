export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyAvocatToken } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const detail = await prisma.$queryRaw<any[]>`
SELECT id, prenom, nom, email, telephone, actif, "visioOk",
       numero_rue, nom_rue, code_postal, commune, description, photo_url, site_internet
    FROM avocats WHERE id = ${avocat.id}::uuid
  `
  const d = detail[0] || {}

  return NextResponse.json({
    id: d.id,
    prenom: d.prenom,
    nom: d.nom,
    email: d.email,
siteInternet: d.site_internet,
    telephone: d.telephone,
    actif: d.actif,
    visioOk: d.visioOk,
    numeroRue: d.numero_rue,
    nomRue: d.nom_rue,
    codePostal: d.code_postal,
    commune: d.commune,
    description: d.description,
    photoUrl: d.photo_url,
  })
}

export async function PATCH(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  // Mise à jour champs Prisma standard
  if (body.actif !== undefined || body.visioOk !== undefined) {
    await prisma.avocat.update({
      where: { id: avocat.id },
      data: {
        ...(body.actif !== undefined ? { actif: body.actif } : {}),
        ...(body.visioOk !== undefined ? { visioOk: body.visioOk } : {}),
        ...(body.email ? { email: body.email } : {}),
        ...(body.telephone !== undefined ? { telephone: body.telephone } : {}),
      },
    })
  }

  // Mise à jour champs additionnels
  if (body.fiche) {
    if (body.email) {
      await prisma.avocat.update({
        where: { id: avocat.id },
        data: { email: body.email, telephone: body.telephone || null },
      })
    }
    await prisma.$executeRaw`
UPDATE avocats SET
  numero_rue = ${body.numeroRue || null},
  nom_rue = ${body.nomRue || null},
  code_postal = ${body.codePostal || null},
  commune = ${body.commune || null},
  description = ${body.description || null},
  photo_url = ${body.photoUrl || null},
  site_internet = ${body.siteInternet || null}
WHERE id = ${avocat.id}::uuid
    `
  }

  return NextResponse.json({ success: true })
}