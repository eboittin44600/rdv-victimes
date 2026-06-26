// src/app/victime/confirmation/page.tsx
'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export default function Confirmation() {
  const [rdv, setRdv] = useState<any>(null)

  useEffect(() => {
    const data = sessionStorage.getItem('rdv_confirmation')
    if (data) setRdv(JSON.parse(data))
  }, [])

  if (!rdv) return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement…</div>

  const date = format(new Date(rdv.debut), "EEEE d MMMM yyyy 'à' HH:mm", { locale: fr })

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-md w-full">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-medium text-gray-900 mb-2">Rendez-vous confirmé</h1>
          <p className="text-gray-500 text-sm mb-6">Un SMS de confirmation vous a été envoyé</p>

          <div className="bg-gray-50 rounded-xl p-4 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Avocat</span>
              <span className="font-medium">Me {rdv.avocat?.prenom} {rdv.avocat?.nom}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Date</span>
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Mode</span>
              <span className="font-medium">
                {rdv.mode === 'PRESENTIEL' ? 'Présentiel' : rdv.mode === 'VISIO' ? 'Visioconférence' : 'Téléphone'}
              </span>
            </div>
            {rdv.lienVisio && (
              <div className="pt-2 border-t border-gray-200">
                <a href={rdv.lienVisio} className="text-teal-600 text-sm underline break-all">
                  Lien visioconférence
                </a>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-400 mb-4">
            Consultation gratuite — Barreau de Saint-Nazaire<br />
            Premier RDV sans engagement
          </p>

          <a href="/" className="text-sm text-gray-500 underline">Retour à l'accueil</a>
        </div>
      </div>
    </div>
  )
}
