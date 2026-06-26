// src/lib/db.ts — Client Prisma singleton (Next.js / Vercel)

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// ─── ALGORITHME PARCOURS B ────────────────────────────────────────────────────
// Tour de rôle entre avocats, départagé par délai si égalité d'index

export async function trouverCreneauParcoursB(mode?: string) {
  // 1. Récupérer tous les avocats actifs avec au moins un créneau libre
  const avocats = await prisma.avocat.findMany({
    where: {
      actif: true,
      ...(mode === 'VISIO' ? { visioOk: true } : {}),
      creneaux: {
        some: {
          statut: 'LIBRE',
          debut: { gte: new Date() },
          ...(mode ? { mode: mode as any } : {}),
        },
      },
    },
    include: {
      creneaux: {
        where: {
          statut: 'LIBRE',
          debut: { gte: new Date() },
          ...(mode ? { mode: mode as any } : {}),
        },
        orderBy: { debut: 'asc' },
        take: 1, // On veut seulement le prochain créneau de chaque avocat
      },
    },
    orderBy: [
      { tourDeRoleIndex: 'asc' },  // Priorité 1 : tour de rôle
    ],
  })

  if (avocats.length === 0) return null

  // 2. Parmi les avocats avec le même index minimum, prendre celui
  //    dont le prochain créneau est le plus tôt (départage par délai)
  const indexMin = avocats[0].tourDeRoleIndex
  const candidats = avocats.filter(a => a.tourDeRoleIndex === indexMin && a.creneaux.length > 0)

  candidats.sort((a, b) =>
    a.creneaux[0].debut.getTime() - b.creneaux[0].debut.getTime()
  )

  const gagnant = candidats[0]
  if (!gagnant || gagnant.creneaux.length === 0) return null

  return {
    avocat: gagnant,
    creneau: gagnant.creneaux[0],
  }
}
