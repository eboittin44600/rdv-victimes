// src/lib/notifications.ts

import twilio from 'twilio'
import nodemailer from 'nodemailer'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL

// ─── SMS ──────────────────────────────────────────────────────────────────────

export async function sendSmsConfirmation(params: {
  telephone: string
  avocatNom: string
  debut: Date
  mode: string
  adresseCabinet?: string
  lienVisio?: string
  tokenSuppression: string
}) {
  const date = format(params.debut, 'EEEE d MMMM à HH:mm', { locale: fr })
  let body = `Barreau de Saint-Nazaire : votre RDV est confirmé le ${date} avec Me ${params.avocatNom}.`

  if (params.mode === 'PRESENTIEL' && params.adresseCabinet) {
    body += ` Adresse : ${params.adresseCabinet}.`
  } else if (params.mode === 'VISIO' && params.lienVisio) {
    body += ` Lien visio envoyé par email.`
  } else if (params.mode === 'TELEPHONE') {
    body += ` L'avocat vous appellera à ce numéro.`
  }

  body += ` Supprimer mes données : ${APP_URL}/supprimer/${params.tokenSuppression}`

  await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.telephone,
  })
}

export async function sendSmsRappel(params: {
  telephone: string
  avocatNom: string
  debut: Date
  mode: string
}) {
  const date = format(params.debut, 'EEEE d MMMM à HH:mm', { locale: fr })
  const body = `Rappel Barreau de Saint-Nazaire : votre RDV avec Me ${params.avocatNom} est ${date}. Consultation gratuite.`

  await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.telephone,
  })
}

export async function sendSmsAnnulation(params: {
  telephone: string
  debut: Date
}) {
  const date = format(params.debut, 'EEEE d MMMM à HH:mm', { locale: fr })
  const body = `Barreau de Saint-Nazaire : votre RDV du ${date} a été annulé par l'avocat. Reprenez RDV sur ${APP_URL}`

  await twilioClient.messages.create({
    body,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: params.telephone,
  })
}

// ─── EMAILS ───────────────────────────────────────────────────────────────────

export async function sendEmailAvocatNouveauRdv(params: {
  emailAvocat: string
  nomAvocat: string
  victimePrenom: string
  victimeNom: string
  victimeTelephone: string
  debut: Date
  mode: string
  lienVisio?: string
  tokenAnnulation: string
}) {
  const date = format(params.debut, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })
  const lienAnnulation = `${APP_URL}/avocat/annuler/${params.tokenAnnulation}`

  await mailer.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: params.emailAvocat,
    subject: `Nouveau RDV — ${params.victimePrenom} ${params.victimeNom} — ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D3557;">Nouveau rendez-vous reçu</h2>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding:8px; color:#666;">Client</td><td style="padding:8px; font-weight:bold;">${params.victimePrenom} ${params.victimeNom}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding:8px; color:#666;">Téléphone</td><td style="padding:8px;">${params.victimeTelephone}</td></tr>
          <tr><td style="padding:8px; color:#666;">Date</td><td style="padding:8px;">${date}</td></tr>
          <tr style="background:#f5f5f5"><td style="padding:8px; color:#666;">Mode</td><td style="padding:8px;">${params.mode}</td></tr>
          ${params.lienVisio ? `<tr><td style="padding:8px; color:#666;">Lien visio</td><td style="padding:8px;"><a href="${params.lienVisio}">${params.lienVisio}</a></td></tr>` : ''}
        </table>
        <p style="margin-top:24px;">
          <a href="${lienAnnulation}" style="color:#e53e3e;">Annuler ce rendez-vous</a>
        </p>
        <hr style="margin-top:32px; border:none; border-top:1px solid #eee;">
        <p style="font-size:12px; color:#999;">Barreau de Saint-Nazaire — Commission Victimes</p>
      </div>
    `,
  })
}

export async function sendEmailVictimoVisio(params: {
  email: string
  avocatNom: string
  debut: Date
  lienVisio: string
  tokenSuppression: string
}) {
  const date = format(params.debut, "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })

  await mailer.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: params.email,
    subject: `Votre rendez-vous en visioconférence — ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D9E75;">Votre rendez-vous est confirmé</h2>
        <p>Vous avez un rendez-vous en visioconférence le <strong>${date}</strong> avec <strong>Me ${params.avocatNom}</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${params.lienVisio}" style="background:#1D9E75; color:white; padding:12px 24px; border-radius:6px; text-decoration:none;">
            Rejoindre la visioconférence
          </a>
        </p>
        <p style="color:#666; font-size:14px;">Ce lien sera actif 15 minutes avant et pendant votre rendez-vous.</p>
        <hr style="margin-top:32px; border:none; border-top:1px solid #eee;">
        <p style="font-size:12px; color:#999;">
          Consultation gratuite — Barreau de Saint-Nazaire<br>
          <a href="${APP_URL}/supprimer/${params.tokenSuppression}" style="color:#999;">Supprimer mes données personnelles</a>
        </p>
      </div>
    `,
  })
}

export async function sendEmailMagiqueAvocat(params: {
  email: string
  nom: string
  token: string
}) {
  const lien = `${APP_URL}/avocat/auth/${params.token}`

  await mailer.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM}>`,
    to: params.email,
    subject: `Votre lien de connexion — Espace avocat`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1D3557;">Bonjour Me ${params.nom},</h2>
        <p>Cliquez sur le lien ci-dessous pour accéder à votre espace avocat. Ce lien est valable <strong>30 minutes</strong>.</p>
        <p style="margin:24px 0;">
          <a href="${lien}" style="background:#1D3557; color:white; padding:12px 24px; border-radius:6px; text-decoration:none;">
            Accéder à mon espace
          </a>
        </p>
        <p style="font-size:12px; color:#999;">Si vous n'avez pas demandé ce lien, ignorez cet email.</p>
      </div>
    `,
  })
}
