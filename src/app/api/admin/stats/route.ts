// src/app/api/admin/stats/route.ts
// GET /api/admin/stats — Statistiques pour le tableau de bord

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const now = new Date()
  const debutMois = startOfMonth(now)
  const finMois = endOfMonth(now)
  const debutMoisPrecedent = startOfMonth(subMonths(now, 1))
  const finMoisPrecedent = endOfMonth(subMonths(now, 1))

  const [
    rdvCeMois,
    rdvMoisPrecedent,
    annulationsCeMois,
    avocatsActifs,
    avocatsTotal,
    repartitionViolences,
    repartitionParcours,
    avocatsStats,
    creneauxLibres,
  ] = await Promise.all([
    // RDV ce mois
    prisma.rendezVous.count({
      where: { createdAt: { gte: debutMois, lte: finMois }, statut: 'CONFIRME' },
    }),
    // RDV mois précédent
    prisma.rendezVous.count({
      where: { createdAt: { gte: debutMoisPrecedent, lte: finMoisPrecedent }, statut: 'CONFIRME' },
    }),
    // Annulations ce mois
    prisma.rendezVous.count({
      where: { createdAt: { gte: debutMois, lte: finMois }, statut: 'ANNULE' },
    }),
    // Avocats actifs
    prisma.avocat.count({ where: { actif: true } }),
    // Avocats total inscrits
    prisma.avocat.count(),
    // Répartition par type de violence (données agrégées)
    prisma.rendezVous.groupBy({
      by: ['typeViolence'],
      where: { createdAt: { gte: debutMois, lte: finMois } },
      _count: { typeViolence: true },
    }),
    // Répartition parcours A / B
    prisma.rendezVous.groupBy({
      by: ['parcours'],
      where: { createdAt: { gte: debutMois, lte: finMois } },
      _count: { parcours: true },
    }),
    // Stats par avocat
    prisma.avocat.findMany({
      select: {
        id: true,
        prenom: true,
        nom: true,
        actif: true,
        _count: {
          select: {
            rendezVous: {
              where: { createdAt: { gte: debutMois, lte: finMois } },
            },
          },
        },
        creneaux: {
          where: { statut: 'LIBRE', debut: { gte: now } },
          select: { id: true },
        },
      },
      orderBy: { nom: 'asc' },
    }),
    // Créneaux libres total
    prisma.creneau.count({
      where: { statut: 'LIBRE', debut: { gte: now } },
    }),
  ])

  // Calculer le délai moyen (en jours) entre réservation et RDV
  const rdvsAvecDates = await prisma.rendezVous.findMany({
    where: { createdAt: { gte: debutMois, lte: finMois }, statut: 'CONFIRME' },
    select: { createdAt: true, creneau: { select: { debut: true } } },
  })

  const delaiMoyen = rdvsAvecDates.length > 0
    ? rdvsAvecDates.reduce((sum, rdv) => {
        const delai = (rdv.creneau.debut.getTime() - rdv.createdAt.getTime()) / (1000 * 60 * 60 * 24)
        return sum + delai
      }, 0) / rdvsAvecDates.length
    : 0

  const totalCeMois = rdvCeMois + annulationsCeMois
  const tauxAnnulation = totalCeMois > 0 ? Math.round((annulationsCeMois / totalCeMois) * 100) : 0
  const evolutionRdv = rdvMoisPrecedent > 0
    ? Math.round(((rdvCeMois - rdvMoisPrecedent) / rdvMoisPrecedent) * 100)
    : 0

  return NextResponse.json({
    rdvCeMois,
    evolutionRdv,
    delaiMoyen: Math.round(delaiMoyen * 10) / 10,
    avocatsActifs,
    avocatsTotal,
    tauxAnnulation,
    creneauxLibres,
    repartitionViolences: repartitionViolences.map(r => ({
      type: r.typeViolence,
      count: r._count.typeViolence,
    })),
    repartitionParcours: repartitionParcours.map(r => ({
      parcours: r.parcours,
      count: r._count.parcours,
    })),
    avocats: avocatsStats.map(a => ({
      id: a.id,
      nom: `Me ${a.prenom} ${a.nom}`,
      actif: a.actif,
      rdvCeMois: a._count.rendezVous,
      creneauxLibres: a.creneaux.length,
    })),
  })
}
