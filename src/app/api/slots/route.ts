export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addDays } from 'date-fns'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')
  const avocatId = searchParams.get('avocatId')

  const maintenant = new Date()
  const dans30jours = addDays(maintenant, 30)

  const avocats = await prisma.avocat.findMany({
    where: {
      actif: true,
      ...(mode === 'VISIO' ? { visioOk: true } : {}),
      ...(avocatId ? { id: avocatId } : {}),
      creneaux: {
        some: {
          statut: 'LIBRE',
          debut: { gte: maintenant, lte: dans30jours },
        },
      },
    },
    select: {
      id: true, prenom: true, nom: true,
      visioOk: true, specialites: true,
      creneaux: {
        where: {
          statut: 'LIBRE',
          debut: { gte: maintenant, lte: dans30jours },
          ...(mode ? { mode: mode as any } : {}),
        },
        orderBy: { debut: 'asc' },
        take: 8,
        select: { id: true, debut: true, fin: true, mode: true },
      },
    },
    orderBy: { nom: 'asc' },
  })

  const avocatsFiltres = avocats.filter(a => a.creneaux.length > 0)

  const avocatsAvecDetails = await Promise.all(avocatsFiltres.map(async (a) => {
    const detail = await prisma.$queryRaw<any[]>`
      SELECT numero_rue, nom_rue, code_postal, commune,
             annee_serment, certificat_specialisation,
             description, photo_url, site_internet
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
      siteInternet: d.site_internet,
    }
  }))

  return NextResponse.json({ avocats: avocatsAvecDetails })
}