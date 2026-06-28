export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const jwt = await createSessionToken('admin', 'admin')
  const response = NextResponse.json({ success: true })
  response.cookies.set('admin_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
