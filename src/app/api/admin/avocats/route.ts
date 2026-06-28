export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyAdminToken } from '@/lib/auth'

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

  if (!body.prenom || !body.nom || !body.email?.includes('@')) {
    return NextResponse.json({ error: 'Données invalides.' }, { status: 400 })
  }

  const existant = await prisma.avocat.findUnique({
    where: { email: body.email.toLowerCase().trim() },
  })
  if (existant) {
    return NextResponse.json({ error: 'Un avocat avec cet email existe déjà.' }, { status: 409 })
  }

  const avocat = await prisma.avocat.create({
    data: {
      prenom: body.prenom,
      nom: body.nom,
      email: body.email.toLowerCase().trim(),
      telephone: body.telephone || null,
      actif: body.actif ?? true,
      visioOk: body.visioOk ?? false,
      specialites: body.specialites ?? [],
    },
  })

  return NextResponse.json({ avocat })
}
