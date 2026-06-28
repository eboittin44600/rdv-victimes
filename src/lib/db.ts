export const dynamic = 'force-dynamic'

import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({ log: process.env.NODE_ENV === 'development' ? ['query'] : [] })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function trouverCreneauParcoursB(mode?: string) {
  const maintenant = new Date()
  
  const avocats = await prisma.avocat.findMany({
    where: {
      actif: true,
      ...(mode === 'VISIO' ? { visioOk: true } : {}),
      creneaux: {
        some: {
          statut: 'LIBRE',
          debut: { gte: maintenant },
          ...(mode ? { mode: mode as any } : {}),
        },
      },
    },
    include: {
      creneaux: {
        where: {
          statut: 'LIBRE',
          debut: { gte: maintenant },
          ...(mode ? { mode: mode as any } : {}),
        },
        orderBy: { debut: 'asc' },
        take: 1,
      },
    },
    orderBy: [{ tourDeRoleIndex: 'asc' }],
  })

  if (avocats.length === 0) return null

  const indexMin = avocats[0].tourDeRoleIndex
  const candidats = avocats.filter(a => a.tourDeRoleIndex === indexMin && a.creneaux.length > 0)
  candidats.sort((a, b) => a.creneaux[0].debut.getTime() - b.creneaux[0].debut.getTime())

  const gagnant = candidats[0]
  if (!gagnant || gagnant.creneaux.length === 0) return null

  return { avocat: gagnant, creneau: gagnant.creneaux[0] }
}
