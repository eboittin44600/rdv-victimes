export const dynamic = 'force-dynamic'

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

  const { decrypt } = await import('@/lib/crypto')

  const creneauxDechiffres = creneaux.map(c => ({
    ...c,
    rendezVous: c.rendezVous ? {
      ...c.rendezVous,
      victimeTelephone: c.rendezVous.victimeTelEncrypted !== '[supprimé]'
        ? decrypt(c.rendezVous.victimeTelEncrypted)
        : '[supprimé]',
      victimeEmail: c.rendezVous.victimeEmailEncrypted
        ? decrypt(c.rendezVous.victimeEmailEncrypted)
        : null,
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

  function genererCreneaux30min(dateDebut: Date, dateFin: Date, avocatId: string, mode: string, recurrent: boolean, recurrentJusquAu?: Date) {
    const creneaux = []
    let current = new Date(dateDebut)
    while (current < dateFin) {
      const finCreneau = new Date(current.getTime() + 30 * 60 * 1000)
      if (finCreneau > dateFin) break
      creneaux.push({
        avocatId,
        debut: new Date(current),
        fin: finCreneau,
        mode: mode as any,
        recurrent,
        recurrentJusquAu: recurrentJusquAu || null,
      })
      current = finCreneau
    }
    return creneaux
  }

  if (data.recurrent && data.recurrentJusquAu) {
    const fin_recurrence = parseISO(data.recurrentJusquAu)
    const creneaux = []
    let currentDate = new Date(debut)

    while (currentDate <= fin_recurrence) {
      const finDuJour = new Date(currentDate)
      finDuJour.setHours(fin.getHours(), fin.getMinutes(), 0, 0)
      const creneauxDuJour = genererCreneaux30min(currentDate, finDuJour, avocat.id, data.mode, true, fin_recurrence)
      creneaux.push(...creneauxDuJour)
      currentDate = addWeeks(currentDate, 1)
    }

    await prisma.creneau.createMany({ data: creneaux })
    return NextResponse.json({ created: creneaux.length })
  } else {
    const creneaux = genererCreneaux30min(debut, fin, avocat.id, data.mode, false)
    await prisma.creneau.createMany({ data: creneaux })
    return NextResponse.json({ created: creneaux.length })
  }
}

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
