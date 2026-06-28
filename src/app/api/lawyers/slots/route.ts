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
    where: { avocatId: avocat.id, debut: { gte: new Date() } },
    include: {
      rendezVous: {
        select: {
          id: true, victimePrenom: true, victimeNom: true,
          victimeTelEncrypted: true, victimeEmailEncrypted: true,
          mode: true, lienVisio: true, tokenAnnulation: true,
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

  // Récupérer le champ modes[] via SQL
  const ids = creneaux.map(c => c.id)
  let modesMap: Record<string, string[]> = {}
  if (ids.length > 0) {
    const rows = await prisma.$queryRaw<{ id: string; modes: string[] }[]>`
      SELECT id, modes FROM creneaux WHERE id = ANY(${ids}::uuid[])
    `
    rows.forEach(r => { modesMap[r.id] = r.modes || [] })
  }

  const creneauxAvecModes = creneauxDechiffres.map(c => ({
    ...c,
    modes: modesMap[c.id] || [c.mode],
  }))

  return NextResponse.json({ creneaux: creneauxAvecModes })
}

const schemaAjout = z.object({
  debut: z.string().datetime(),
  fin: z.string().datetime(),
  modes: z.array(z.enum(['PRESENTIEL', 'VISIO', 'TELEPHONE'])).min(1),
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

  // Un seul créneau par horaire, avec un tableau de modes
  // Le premier mode du tableau est le mode "par défaut" stocké dans le champ mode
  const modePrincipal = data.modes[0]

  function genererCreneaux(dateDebut: Date, dateFin: Date, avocatId: string, recurrent: boolean, recurrentJusquAu?: Date) {
    const creneaux = []
    let current = new Date(dateDebut)
    while (current < dateFin) {
      const finCreneau = new Date(current.getTime() + 30 * 60 * 1000)
      if (finCreneau > dateFin) break
      creneaux.push({
        avocatId,
        debut: new Date(current),
        fin: finCreneau,
        mode: modePrincipal as any,
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
      creneaux.push(...genererCreneaux(currentDate, finDuJour, avocat.id, true, fin_recurrence))
      currentDate = addWeeks(currentDate, 1)
    }
    // Créer puis mettre à jour le champ modes[]
    const created = await prisma.creneau.createMany({ data: creneaux })
    // Récupérer les IDs créés et mettre à jour les modes
    const nouveaux = await prisma.creneau.findMany({
      where: { avocatId: avocat.id, debut: { gte: debut }, recurrent: true },
      select: { id: true },
    })
    for (const c of nouveaux) {
      await prisma.$executeRaw`
        UPDATE creneaux SET modes = ${data.modes}::text[] WHERE id = ${c.id}::uuid
      `
    }
    return NextResponse.json({ created: creneaux.length })
  } else {
    const creneaux = genererCreneaux(debut, fin, avocat.id, false)
    await prisma.creneau.createMany({ data: creneaux })
    // Récupérer les IDs et mettre à jour les modes
    const nouveaux = await prisma.creneau.findMany({
      where: {
        avocatId: avocat.id,
        debut: { gte: debut, lte: fin },
        statut: 'LIBRE',
      },
      select: { id: true },
    })
    for (const c of nouveaux) {
      await prisma.$executeRaw`
        UPDATE creneaux SET modes = ${data.modes}::text[] WHERE id = ${c.id}::uuid
      `
    }
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