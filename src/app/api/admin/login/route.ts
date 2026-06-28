export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createSessionToken } from '@/lib/auth'
import { nanoid } from 'nanoid'

const ADMIN_EMAILS = (process.env.ADMIN_EMAIL || '').split(',').map(e => e.trim())

export async function POST(req: NextRequest) {
  const { email } = await req.json()

  if (!ADMIN_EMAILS.includes(email.toLowerCase().trim())) {
    return NextResponse.json({ success: true })
  }

  const token = nanoid(48)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const lien = `${appUrl}/api/admin/validate?token=${token}`

  ;(global as any).__adminTokens = (global as any).__adminTokens || {}
  ;(global as any).__adminTokens[token] = {
    email: email.toLowerCase().trim(),
    expiry: Date.now() + 5 * 60 * 1000,
  }

  const nodemailer = await import('nodemailer')
  const mailer = nodemailer.default.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  })

  await mailer.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: email,
    subject: 'Lien de connexion — Administration Barreau',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <h2 style="color:#1D3557;">Connexion à l'espace administrateur</h2>
        <p>Cliquez sur le lien ci-dessous. Valable <strong>5 minutes</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${lien}" style="background:#F59E0B;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;">
            Accéder à l'administration
          </a>
        </p>
        <p style="font-size:12px;color:#999;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
      </div>
    `,
  })

  return NextResponse.json({ success: true })
}
