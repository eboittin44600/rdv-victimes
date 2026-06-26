// src/app/api/lawyers/slots/route.ts
// GET  /api/lawyers/slots  — Créneaux de l'avocat connecté
// POST /api/lawyers/slots  — Ajouter un créneau

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/db'
import { verifyAvocatToken } from '@/lib/auth'
import { addWeeks, parseISO } from 'date-fns'

export async function GET(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const creneaux = await prisma.creneau.findMany({
    where: {
      avocatId: avocat.id,
      debut: { gte: new Date() },
    },
    include: {
      rendezVous: {
        select: {
          id: true,
          victimePrenom: true,
          victimeNom: true,
          victimeTelEncrypted: true,
          victimeEmailEncrypted: true,
          mode: true,
          lienVisio: true,
          tokenAnnulation: true,
        },
      },
    },
    orderBy: { debut: 'asc' },
  })

  // Déchiffrer les données des victimes pour l'affichage à l'avocat
  const { decrypt } = await import('@/lib/crypto')
  const creneauxDechiffres = creneaux.map(c => ({
    ...c,
    rendezVous: c.rendezVous ? {
      ...c.rendezVous,
      victimeTelephone: decrypt(c.rendezVous.victimeTelEncrypted),
      victimeEmail: c.rendezVous.victimeEmailEncrypted ? decrypt(c.rendezVous.victimeEmailEncrypted) : null,
      // Ne pas exposer les tokens chiffrés dans la réponse
      victimeTelEncrypted: undefined,
      victimeEmailEncrypted: undefined,
    } : null,
  }))

  return NextResponse.json({ creneaux: creneauxDechiffres })
}

const schemaAjout = z.object({
  debut: z.string().datetime(),
  fin: z.string().datetime(),
  mode: z.enum(['PRESENTIEL', 'VISIO', 'TELEPHONE']),
  recurrent: z.boolean().default(false),
  recurrentJusquAu: z.string().date().optional(),
})

export async function POST(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const data = schemaAjout.parse(body)
  const debut = parseISO(data.debut)
  const fin = parseISO(data.fin)

  if (data.recurrent && data.recurrentJusquAu) {
    // Créer les créneaux récurrents hebdomadaires
    const creneaux = []
    let current = debut
    const fin_recurrence = parseISO(data.recurrentJusquAu)

    while (current <= fin_recurrence) {
      creneaux.push({
        avocatId: avocat.id,
        debut: current,
        fin: new Date(current.getTime() + (fin.getTime() - debut.getTime())),
        mode: data.mode as any,
        recurrent: true,
        recurrentJusquAu: fin_recurrence,
      })
      current = addWeeks(current, 1)
    }

    await prisma.creneau.createMany({ data: creneaux })
    return NextResponse.json({ created: creneaux.length })
  } else {
    const creneau = await prisma.creneau.create({
      data: {
        avocatId: avocat.id,
        debut,
        fin,
        mode: data.mode as any,
      },
    })
    return NextResponse.json({ creneau })
  }
}

// DELETE /api/lawyers/slots/:id
export async function DELETE(req: NextRequest) {
  const avocat = await verifyAvocatToken(req)
  if (!avocat) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'ID manquant' }, { status: 400 })

  const creneau = await prisma.creneau.findFirst({
    where: { id, avocatId: avocat.id, statut: 'LIBRE' },
  })
  if (!creneau) return NextResponse.json({ error: 'Créneau introuvable ou déjà réservé' }, { status: 404 })

  await prisma.creneau.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
