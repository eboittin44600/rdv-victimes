// src/app/api/lawyers/auth/validate/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.redirect(new URL('/avocat/auth', req.url))
  }

  const jwt = await createSessionToken(id, 'avocat')

  const response = NextResponse.redirect(new URL('/avocat', req.url))
  response.cookies.set('avocat_session', jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
  })

  return response
}
