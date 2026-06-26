// src/app/api/bookings/route.ts
// POST /api/bookings — Créer un rendez-vous (parcours A ou B)

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma, trouverCreneauParcoursB } from '@/lib/db'
import { encrypt } from '@/lib/crypto'
import {
  sendSmsConfirmation,
  sendEmailAvocatNouveauRdv,
  sendEmailVictimoVisio,
} from '@/lib/notifications'
import { addDays } from 'date-fns'

const schema = z.object({
  parcours: z.enum(['A', 'B']),
  creneauId: z.string().uuid().optional(), // Requis pour parcours A
  avocatId: z.string().uuid().optional(),  // Requis pour parcours A
  victimePrenom: z.string().min(1).max(100),
  victimeNom: z.string().min(1).max(100),
  victimeTelephone: z.string().regex(/^(\+33|0)[0-9]{9}$/),
  victimeEmail: z.string().email().optional(),
  mode: z.enum(['PRESENTIEL', 'VISIO', 'TELEPHONE']),
  typeViolence: z.enum(['CONJUGALES', 'SEXUELLES', 'INTRAFAMILIALES', 'HARCELEMENT', 'AUTRE', 'NON_PRECISE']).optional(),
  consentementRgpd: z.literal(true),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = schema.parse(body)

    // E-mail obligatoire pour la visio
    if (data.mode === 'VISIO' && !data.victimeEmail) {
      return NextResponse.json(
        { error: 'L\'adresse email est requise pour une consultation en visioconférence.' },
        { status: 400 }
      )
    }

    let creneauId: string
    let avocatId: string

    // ── PARCOURS A : créneau choisi par la victime ──────────────────────────
    if (data.parcours === 'A') {
      if (!data.creneauId || !data.avocatId) {
        return NextResponse.json({ error: 'Créneau et avocat requis pour le parcours A.' }, { status: 400 })
      }
      creneauId = data.creneauId
      avocatId = data.avocatId

      // Vérifier que le créneau est toujours libre (race condition)
      const creneau = await prisma.creneau.findFirst({
        where: { id: creneauId, statut: 'LIBRE', avocatId },
      })
      if (!creneau) {
        return NextResponse.json(
          { error: 'Ce créneau n\'est plus disponible. Veuillez en choisir un autre.' },
          { status: 409 }
        )
      }

    // ── PARCOURS B : affectation automatique ────────────────────────────────
    } else {
      const resultat = await trouverCreneauParcoursB(data.mode)
      if (!resultat) {
        return NextResponse.json(
          { error: 'Aucun créneau disponible dans les 7 prochains jours. Veuillez appeler le barreau au 02 40 22 13 40.' },
          { status: 404 }
        )
      }
      creneauId = resultat.creneau.id
      avocatId = resultat.avocat.id
    }

    // ── TRANSACTION : réserver le créneau + créer le RDV ───────────────────
    const rdv = await prisma.$transaction(async (tx) => {
      // Double-check dans la transaction (protection race condition)
      const creneau = await tx.creneau.findFirst({
        where: { id: creneauId, statut: 'LIBRE' },
        include: { avocat: true },
      })
      if (!creneau) throw new Error('CRENEAU_PRIS')

      // Marquer le créneau comme réservé
      await tx.creneau.update({
        where: { id: creneauId },
        data: { statut: 'RESERVE' },
      })

      // Générer lien visio si besoin (Whereby ou Jitsi)
      const lienVisio = data.mode === 'VISIO'
        ? `https://meet.jit.si/rdv-barreau-saintnazaire-${creneauId.slice(0, 8)}`
        : undefined

      // Créer le rendez-vous (données personnelles chiffrées)
      const nouveauRdv = await tx.rendezVous.create({
        data: {
          creneauId,
          avocatId,
          victimePrenom: data.victimePrenom,
          victimeNom: data.victimeNom,
          victimeTelEncrypted: encrypt(data.victimeTelephone),
          victimeEmailEncrypted: data.victimeEmail ? encrypt(data.victimeEmail) : null,
          mode: data.mode as any,
          typeViolence: (data.typeViolence ?? 'NON_PRECISE') as any,
          parcours: data.parcours as any,
          lienVisio,
          expireAt: addDays(creneau.debut, 30),
        },
        include: { avocat: true, creneau: true },
      })

      // Incrémenter le tour de rôle de l'avocat (parcours B uniquement)
      if (data.parcours === 'B') {
        await tx.avocat.update({
          where: { id: avocatId },
          data: { tourDeRoleIndex: { increment: 1 } },
        })
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          action: 'RDV_CREE',
          acteur: 'VICTIME',
          details: JSON.stringify({
            rdvId: nouveauRdv.id,
            avocatId,
            parcours: data.parcours,
            mode: data.mode,
            typeViolence: data.typeViolence ?? 'NON_PRECISE',
          }),
        },
      })

      return nouveauRdv
    })

    // ── NOTIFICATIONS (après transaction) ──────────────────────────────────
    const { decrypt } = await import('@/lib/crypto')
    const telephone = decrypt(rdv.victimeTelEncrypted)

    // SMS à la victime
    await sendSmsConfirmation({
      telephone,
      avocatNom: rdv.avocat.nom,
      debut: rdv.creneau.debut,
      mode: rdv.mode,
      lienVisio: rdv.lienVisio ?? undefined,
      tokenSuppression: rdv.tokenSuppression,
    }).catch(console.error) // Non bloquant

    // Email à l'avocat
    await sendEmailAvocatNouveauRdv({
      emailAvocat: rdv.avocat.email,
      nomAvocat: rdv.avocat.nom,
      victimePrenom: rdv.victimePrenom,
      victimeNom: rdv.victimeNom,
      victimeTelephone: telephone,
      debut: rdv.creneau.debut,
      mode: rdv.mode,
      lienVisio: rdv.lienVisio ?? undefined,
      tokenAnnulation: rdv.tokenAnnulation,
    }).catch(console.error)

    // Email visio à la victime
    if (rdv.mode === 'VISIO' && rdv.victimeEmailEncrypted && rdv.lienVisio) {
      const email = decrypt(rdv.victimeEmailEncrypted)
      await sendEmailVictimoVisio({
        email,
        avocatNom: rdv.avocat.nom,
        debut: rdv.creneau.debut,
        lienVisio: rdv.lienVisio,
        tokenSuppression: rdv.tokenSuppression,
      }).catch(console.error)
    }

    // Mettre à jour le statut des notifications
    await prisma.rendezVous.update({
      where: { id: rdv.id },
      data: { smsConfirmationEnvoye: true, emailAvocatEnvoye: true },
    })

    // Réponse (sans données personnelles sensibles)
    return NextResponse.json({
      success: true,
      rdvId: rdv.id,
      avocat: {
        prenom: rdv.avocat.prenom,
        nom: rdv.avocat.nom,
      },
      debut: rdv.creneau.debut,
      mode: rdv.mode,
      lienVisio: rdv.lienVisio,
    })

  } catch (err: any) {
    if (err.message === 'CRENEAU_PRIS') {
      return NextResponse.json(
        { error: 'Ce créneau vient d\'être réservé. Veuillez en choisir un autre.' },
        { status: 409 }
      )
    }
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides.', details: err.errors }, { status: 400 })
    }
    console.error('Erreur création RDV:', err)
    return NextResponse.json({ error: 'Erreur serveur. Veuillez réessayer.' }, { status: 500 })
  }
}
