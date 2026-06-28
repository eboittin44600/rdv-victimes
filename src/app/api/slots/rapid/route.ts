export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addHours } from 'date-fns'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')

  const maintenant = new Date()
  const dans72h = addHours(maintenant, 72)

  // Récupérer tous les créneaux libres dans les 72h
  const creneaux = await prisma.creneau.findMany({
    where: {
      statut: 'LIBRE',
      debut: { gte: maintenant, lte: dans72h },
      avocat: { actif: true },
    },
    include: {
      avocat: {
        select: {
          id: true, prenom: true, nom: true, visioOk: true,
        },
      },
    },
    orderBy: { debut: 'asc' },
  })

  // Récupérer les modes et détails avocat
  const creneauxIds = creneaux.map(c => c.id)
  const avocatIds = [...new Set(creneaux.map(c => c.avocatId))]

  let modesMap: Record<string, string[]> = {}
  if (creneauxIds.length > 0) {
    const rows = await prisma.$queryRaw<{ id: string; modes: string[] }[]>`
      SELECT id, modes FROM creneaux WHERE id = ANY(${creneauxIds}::uuid[])
    `
    rows.forEach(r => { modesMap[r.id] = r.modes || [] })
  }

  let avocatsDetails: Record<string, any> = {}
  if (avocatIds.length > 0) {
    const details = await prisma.$queryRaw<any[]>`
      SELECT id, numero_rue, nom_rue, code_postal, commune,
             annee_serment, certificat_specialisation,
             description, photo_url, site_internet
      FROM avocats WHERE id = ANY(${avocatIds}::uuid[])
    `
    details.forEach(d => {
      avocatsDetails[d.id] = {
        numeroRue: d.numero_rue, nomRue: d.nom_rue,
        codePostal: d.code_postal, commune: d.commune,
        anneeSerment: d.annee_serment,
        certificatSpecialisation: d.certificat_specialisation,
        description: d.description, photoUrl: d.photo_url,
        siteInternet: d.site_internet,
      }
    })
  }

  // Grouper par horaire (debut)
  const groupes: Record<string, any[]> = {}
  for (const c of creneaux) {
    const modes = modesMap[c.id] || [c.mode]
    // Filtrer par mode si demandé
    if (mode && !modes.includes(mode)) continue

    const key = c.debut.toISOString()
    if (!groupes[key]) groupes[key] = []
    groupes[key].push({
      creneauId: c.id,
      avocatId: c.avocatId,
      debut: c.debut,
      fin: c.fin,
      modes,
      avocat: {
        ...c.avocat,
        ...avocatsDetails[c.avocatId],
      },
    })
  }

  // Pour chaque horaire, mélanger les avocats aléatoirement
  const resultats = Object.entries(groupes)
    .sort(([a], [b]) => new Date(a).getTime() - new Date(b).getTime())
    .map(([debut, options]) => ({
      debut,
      // Mélange aléatoire des avocats sur le même créneau
      options: options.sort(() => Math.random() - 0.5),
    }))

  return NextResponse.json({ creneaux: resultats })
}
