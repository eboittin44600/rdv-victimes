// src/app/api/cron/route.ts
// CRON Vercel — s'exécute chaque jour à 8h00
// Configurer dans vercel.json : { "crons": [{ "path": "/api/cron", "schedule": "0 8 * * *" }] }
export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendSmsRappel } from '@/lib/notifications'
import { decrypt } from '@/lib/crypto'
import { addDays, isAfter, isBefore, addHours } from 'date-fns'

// Sécuriser le CRON avec un secret Vercel
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const now = new Date()
  let supprimés = 0
  let rappelsEnvoyés = 0

  // ── 1. SUPPRESSION RGPD automatique ───────────────────────────────────────
  const rdvsExpires = await prisma.rendezVous.findMany({
    where: {
      expireAt: { lte: now },
      victimePrenom: { not: '[supprimé]' },
    },
    select: { id: true },
  })

  for (const rdv of rdvsExpires) {
    await prisma.rendezVous.update({
      where: { id: rdv.id },
      data: {
        victimePrenom: '[supprimé]',
        victimeNom: '[supprimé]',
        victimeTelEncrypted: '[supprimé]',
        victimeEmailEncrypted: null,
        lienVisio: null,
      },
    })
    supprimés++
  }

  if (supprimés > 0) {
    await prisma.auditLog.create({
      data: {
        action: 'SUPPRESSION_RGPD_AUTO',
        acteur: 'SYSTEM',
        details: JSON.stringify({ count: supprimés, date: now.toISOString() }),
      },
    })
  }

  // ── 2. RAPPELS SMS J-2 ────────────────────────────────────────────────────
  const dans2jours = addDays(now, 2)
  const rdvsARappeler = await prisma.rendezVous.findMany({
    where: {
      statut: 'CONFIRME',
      smsRappelEnvoye: false,
      victimeTelEncrypted: { not: '[supprimé]' },
      creneau: {
        debut: {
          gte: addHours(dans2jours, -12),
          lte: addHours(dans2jours, 12),
        },
      },
    },
    include: {
      creneau: true,
      avocat: true,
    },
  })

  for (const rdv of rdvsARappeler) {
    try {
      const telephone = decrypt(rdv.victimeTelEncrypted)
      await sendSmsRappel({
        telephone,
        avocatNom: rdv.avocat.nom,
        debut: rdv.creneau.debut,
        mode: rdv.mode,
      })
      await prisma.rendezVous.update({
        where: { id: rdv.id },
        data: { smsRappelEnvoye: true },
      })
      rappelsEnvoyés++
    } catch (err) {
      console.error(`Erreur rappel SMS rdv ${rdv.id}:`, err)
    }
  }

  // ── 3. ALERTE ADMIN si avocats sans créneau ───────────────────────────────
  const avocatsSansCreneaux = await prisma.avocat.findMany({
    where: {
      actif: true,
      creneaux: {
        none: { statut: 'LIBRE', debut: { gte: now, lte: addDays(now, 7) } },
      },
    },
    select: { prenom: true, nom: true, email: true },
  })

  if (avocatsSansCreneaux.length >= 3) {
    // Envoyer alerte email admin (implémentation identique à sendEmailMagiqueAvocat)
    console.warn(`ALERTE: ${avocatsSansCreneaux.length} avocats sans créneaux cette semaine`)
  }

  return NextResponse.json({
    success: true,
    supprimés,
    rappelsEnvoyés,
    alerteAvocats: avocatsSansCreneaux.length,
  })
}
