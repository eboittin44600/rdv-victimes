export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const avocats = await prisma.avocat.findMany({
    select: {
      id: true, prenom: true, nom: true, email: true,
      telephone: true, actif: true, visioOk: true,
      specialites: true, tourDeRoleIndex: true, createdAt: true,
    },
    orderBy: { nom: 'asc' },
  })

  // Récupérer les champs additionnels via requête SQL directe
  const avocatsAvecDetails = await Promise.all(avocats.map(async (a) => {
    const detail = await prisma.$queryRaw<any[]>`
      SELECT numero_rue, nom_rue, code_postal, commune,
             annee_serment, certificat_specialisation, description, photo_url
      FROM avocats WHERE id = ${a.id}::uuid
    `
    const d = detail[0] || {}
    return {
      ...a,
      numeroRue: d.numero_rue,
      nomRue: d.nom_rue,
      codePostal: d.code_postal,
      commune: d.commune,
      anneeSerment: d.annee_serment,
      certificatSpecialisation: d.certificat_specialisation,
      description: d.description,
      photoUrl: d.photo_url,
    }
  }))

  return NextResponse.json({ avocats: avocatsAvecDetails })
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()

  if (!body.prenom || !body.nom || !body.email?.includes('@')) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  const existant = await prisma.avocat.findUnique({
    where: { email: body.email.toLowerCase().trim() },
  })
  if (existant) {
    return NextResponse.json({ error: 'Un avocat avec cet email existe déjà.' }, { status: 409 })
  }

  const avocat = await prisma.avocat.create({
    data: {
      prenom: body.prenom,
      nom: body.nom,
      email: body.email.toLowerCase().trim(),
      telephone: body.telephone || null,
      actif: body.actif ?? true,
      visioOk: body.visioOk ?? false,
      specialites: [],
    },
  })

  // Mettre à jour les champs additionnels
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
    WHERE id = ${avocat.id}::uuid
  `

  return NextResponse.json({ avocat })
}