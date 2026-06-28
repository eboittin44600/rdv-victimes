import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'
import { addMinutes } from 'date-fns'

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) return new TextEncoder().encode('fallback-secret-for-build')
  return new TextEncoder().encode(secret)
}

export async function genererLienMagique(avocatId: string): Promise<string> {
  const token = nanoid(48)
  const expiry = addMinutes(new Date(), 30)
  await prisma.avocat.update({
    where: { id: avocatId },
    data: { authToken: token, authTokenExpiry: expiry },
  })
  return token
}

export async function verifyAvocatToken(req: NextRequest) {
  const token = req.cookies.get('avocat_session')?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (payload.role !== 'avocat') return null
    const avocat = await prisma.avocat.findUnique({
      where: { id: payload.sub as string },
    })
    return avocat
  } catch {
    return null
  }
}

export async function verifyAdminToken(req: NextRequest) {
  const token = req.cookies.get('admin_session')?.value
  if (!token) return false
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    return payload.role === 'admin'
  } catch {
    return false
  }
}

export async function createSessionToken(subject: string, role: 'avocat' | 'admin') {
  return await new SignJWT({ role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getJwtSecret())
}
