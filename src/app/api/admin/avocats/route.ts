// src/app/api/admin/avocats/route.ts
// GET  /api/admin/avocats — Liste de tous les avocats
// POST /api/admin/avocats — Créer un avocat

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'
import { z } from 'zod'

const schema = z.object({
  prenom: z.string().min(1).max(100),
  nom: z.string().min(1).max(100),
  email: z.string().email(),
  telephone: z.string().optional(),
  actif: z.boolean().default(true),
  visioOk: z.boolean().default(false),
  specialites: z.array(z.string()).default([]),
})

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const avocats = await prisma.avocat.findMany({
    select: {
      id: true, prenom: true, nom: true, email: true,
      telephone: true, actif: true, visioOk: true,
      specialites: true, tourDeRoleIndex: true, createdAt: true,
    },
    orderBy: { nom: 'asc' },
  })

  return NextResponse.json({ avocats })
}

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const data = schema.parse(body)

  // Vérifier que l'email n'existe pas déjà
  const existant = await prisma.avocat.findUnique({
    where: { email: data.email.toLowerCase().trim() },
  })
  if (existant) {
    return NextResponse.json({ error: 'Un avocat avec cet email existe déjà.' }, { status: 409 })
  }

  const avocat = await prisma.avocat.create({
    data: {
      ...data,
      email: data.email.toLowerCase().trim(),
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'AVOCAT_CREE',
      acteur: 'ADMIN',
      details: JSON.stringify({ avocatId: avocat.id, email: avocat.email }),
    },
  })

  return NextResponse.json({ avocat })
}
