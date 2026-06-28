'use client'

import { useState } from 'react'

export default function AdminAuth() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState('')

  async function demander() {
    if (!email.includes('@')) { setErreur('Email invalide'); return }
    setLoading(true); setErreur('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setLoading(false)
    if (res.ok) setSent(true)
    else setErreur('Email non autorisé.')
  }

  if (sent) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full bg-white border border-gray-200 rounded-2xl p-8 text-center">
        <div className="w-14 h-14 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <h2 className="text-lg font-medium text-gray-900 mb-2">Lien envoyé</h2>
        <p className="text-sm text-gray-500">
          Un lien de connexion a été envoyé à <strong>{email}</strong>. Vérifiez votre boîte mail.
        </p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-sm text-gray-500 mb-4">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            Barreau de Saint-Nazaire
          </div>
          <h1 className="text-xl font-medium text-gray-900">Administration</h1>
          <p className="text-sm text-gray-400 mt-1">Accès réservé au barreau</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <label className="text-xs text-gray-500 block mb-2">Votre adresse email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && demander()}
            placeholder="admin@barreau-saintnazaire.fr"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
          />
          {erreur && <p className="text-xs text-red-500 mb-3">{erreur}</p>}
          <button
            onClick={demander}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Envoi...' : 'Recevoir mon lien de connexion'}
          </button>
        </div>
      </div>
    </div>
  )
}
