'use client'

import { useState } from 'react'

export default function AdminAuth() {
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState('')
  const [loading, setLoading] = useState(false)

  async function connexion() {
    setLoading(true)
    setErreur('')
    const res = await fetch('/api/admin/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })
    setLoading(false)
    if (res.ok) {
      window.location.href = '/admin'
    } else {
      setErreur('Mot de passe incorrect.')
    }
  }

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
          <label className="text-xs text-gray-500 block mb-2">Mot de passe administrateur</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && connexion()}
            placeholder="••••••••"
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 mb-3"
          />
          {erreur && <p className="text-xs text-red-500 mb-3">{erreur}</p>}
          <button
            onClick={connexion}
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </div>
      </div>
    </div>
  )
}
