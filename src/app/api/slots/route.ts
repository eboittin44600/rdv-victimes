// src/app/api/slots/route.ts
// GET /api/slots — Récupérer les créneaux disponibles (parcours A)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { addDays, startOfDay } from 'date-fns'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const mode = searchParams.get('mode')        // PRESENTIEL | VISIO | TELEPHONE
  const specialite = searchParams.get('specialite')
  const avocatId = searchParams.get('avocatId') // Pour filtrer un avocat précis

  const maintenant = new Date()
  const dans30jours = addDays(maintenant, 30)

  const avocats = await prisma.avocat.findMany({
    where: {
      actif: true,
      ...(mode === 'VISIO' ? { visioOk: true } : {}),
      ...(specialite ? { specialites: { has: specialite } } : {}),
      ...(avocatId ? { id: avocatId } : {}),
      creneaux: {
        some: {
          statut: 'LIBRE',
          debut: { gte: maintenant, lte: dans30jours },
        },
      },
    },
    select: {
      id: true,
      prenom: true,
      nom: true,
      specialites: true,
      visioOk: true,
      creneaux: {
        where: {
          statut: 'LIBRE',
          debut: { gte: maintenant, lte: dans30jours },
          ...(mode ? { mode: mode as any } : {}),
        },
        orderBy: { debut: 'asc' },
        take: 8, // Limiter à 8 créneaux par avocat pour l'affichage
        select: {
          id: true,
          debut: true,
          fin: true,
          mode: true,
        },
      },
    },
    orderBy: { nom: 'asc' },
  })

  // Filtrer les avocats qui n'ont aucun créneau dans le mode demandé
  const avocatsFiltres = avocats.filter(a => a.creneaux.length > 0)

  return NextResponse.json({ avocats: avocatsFiltres })
}
