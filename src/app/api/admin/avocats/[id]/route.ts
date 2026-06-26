// src/app/api/admin/avocats/[id]/route.ts
// PATCH /api/admin/avocats/:id — Activer / désactiver un avocat

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const isAdmin = await verifyAdminToken(req)
  if (!isAdmin) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { actif } = await req.json()
  const avocat = await prisma.avocat.update({
    where: { id: params.id },
    data: { actif },
  })
  return NextResponse.json({ avocat })
}
