// src/app/api/admin/export/route.ts
// GET /api/admin/export — Export CSV des statistiques (données agrégées, sans noms de victimes)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { format } from 'date-fns'

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const rdvs = await prisma.rendezVous.findMany({
    select: {
      createdAt: true, statut: true, parcours: true,
      mode: true, typeViolence: true,
      creneau: { select: { debut: true } },
      avocat: { select: { prenom: true, nom: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const lignes = [
    ['Date réservation', 'Date RDV', 'Statut', 'Parcours', 'Mode', 'Type violence', 'Avocat'].join(';'),
    ...rdvs.map(r => [
      format(r.createdAt, 'dd/MM/yyyy'),
      format(r.creneau.debut, 'dd/MM/yyyy HH:mm'),
      r.statut,
      r.parcours,
      r.mode,
      r.typeViolence,
      `Me ${r.avocat.prenom} ${r.avocat.nom}`,
    ].join(';')),
  ]

  const csv = lignes.join('\n')
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="rdv-victimes-${format(new Date(), 'yyyy-MM')}.csv"`,
    },
  })
}
