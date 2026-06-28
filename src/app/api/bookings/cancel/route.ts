import { decrypt as decryptData } from '@/lib/crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSmsAnnulation } from '@/lib/notifications'

export async function POST(req: NextRequest) {
  const { token } = await req.json()
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  const rdv = await prisma.rendezVous.findFirst({
    where: { tokenAnnulation: token, statut: 'CONFIRME' },
    include: { creneau: true },
  })

  if (!rdv) return NextResponse.json({ error: 'Rendez-vous introuvable ou déjà annulé' }, { status: 404 })

  await prisma.$transaction([
    prisma.rendezVous.update({ where: { id: rdv.id }, data: { statut: 'ANNULE' } }),
    prisma.creneau.update({ where: { id: rdv.creneauId }, data: { statut: 'LIBRE' } }),
    prisma.auditLog.create({ data: { action: 'RDV_ANNULE', acteur: `AVOCAT:${rdv.avocatId}`, details: JSON.stringify({ rdvId: rdv.id }) } }),
  ])

  try {
    const { decrypt } = await import('@/lib/crypto')
    const telephone = decrypt(rdv.victimeTelEncrypted)
    await sendSmsAnnulation({ telephone, debut: rdv.creneau.debut })
  } catch (e) {
    console.error('SMS annulation non envoyé:', e)
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token manquant' }, { status: 400 })

  const rdv = await prisma.rendezVous.findFirst({
    where: { tokenSuppression: token },
  })

  if (!rdv) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })

  await prisma.$transaction([
    prisma.rendezVous.update({
      where: { id: rdv.id },
      data: {
        victimePrenom: '[supprimé]',
        victimeNom: '[supprimé]',
        victimeTelEncrypted: '[supprimé]',
        victimeEmailEncrypted: null,
        lienVisio: null,
        tokenSuppression: `deleted_${rdv.id}`,
      },
    }),
    prisma.auditLog.create({ data: { action: 'DONNEES_SUPPRIMEES', acteur: 'VICTIME', details: JSON.stringify({ rdvId: rdv.id }) } }),
  ])

  return NextResponse.json({ success: true, message: 'Vos données personnelles ont été supprimées.' })
}
