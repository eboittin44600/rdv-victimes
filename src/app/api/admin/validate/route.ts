export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')

  if (!token) return NextResponse.redirect(new URL('/admin/auth', req.url))

  const tokens = (global as any).__adminTokens || {}
  const entry = tokens[token]

  if (!entry || Date.now() > entry.expiry) {
    return NextResponse.redirect(new URL('/admin/auth', req.url))
  }

  delete tokens[token]

  const jwt = await createSessionToken('admin', 'admin')
  const response = NextResponse.redirect(new URL('/admin', req.url))
  response.cookies.set('admin_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })
  return response
}
