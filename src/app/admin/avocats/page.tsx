'use client'
// src/app/admin/avocats/page.tsx — Gestion des avocats

import { useEffect, useState } from 'react'

type Avocat = {
  id: string; prenom: string; nom: string; email: string
  telephone?: string; actif: boolean; visioOk: boolean
  specialites: string[]; tourDeRoleIndex: number; createdAt: string
}

const SPECIALITES_DISPONIBLES = [
  'Violences conjugales', 'Violences sexuelles',
  'Violences intrafamiliales', 'Harcèlement', 'Droit pénal', 'Droit de la famille',
]

const CHAMPS_VIDES = {
  prenom: '', nom: '', email: '', telephone: '',
  actif: true, visioOk: false, specialites: [] as string[],
}

export default function GestionAvocats() {
  const [avocats, setAvocats] = useState<Avocat[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState(CHAMPS_VIDES)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [recherche, setRecherche] = useState('')

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const res = await fetch('/api/admin/avocats')
    if (res.status === 401) { window.location.href = '/admin/auth'; return }
    const data = await res.json()
    setAvocats(data.avocats || [])
    setLoading(false)
  }

  function ouvririFormulaire(avocat?: Avocat) {
    if (avocat) {
      setEditId(avocat.id)
      setForm({
        prenom: avocat.prenom, nom: avocat.nom, email: avocat.email,
        telephone: avocat.telephone || '', actif: avocat.actif,
        visioOk: avocat.visioOk, specialites: avocat.specialites,
      })
    } else {
      setEditId(null)
      setForm(CHAMPS_VIDES)
    }
    setErreurs({})
    setShowForm(true)
  }

  function valider() {
    const e: Record<string, string> = {}
    if (!form.prenom.trim()) e.prenom = 'Obligatoire'
    if (!form.nom.trim()) e.nom = 'Obligatoire'
    if (!form.email.includes('@')) e.email = 'Email invalide'
    setErreurs(e)
    return Object.keys(e).length === 0
  }

  async function sauvegarder() {
    if (!valider()) return
    setSaving(true)

    const url = editId ? `/api/admin/avocats/${editId}` : '/api/admin/avocats'
    const method = editId ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setConfirmation(editId ? 'Avocat modifié avec succès.' : 'Avocat ajouté avec succès.')
      setTimeout(() => setConfirmation(''), 3000)
      charger()
    } else {
      const data = await res.json()
      setErreurs({ global: data.error || 'Erreur serveur' })
    }
  }

  async function toggleActif(id: string, actif: boolean) {
    await fetch(`/api/admin/avocats/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actif: !actif }),
    })
    charger()
  }

  async function supprimer(id: string, nom: string) {
    if (!confirm(`Supprimer Me ${nom} ? Cette action est irréversible.`)) return
    await fetch(`/api/admin/avocats/${id}`, { method: 'DELETE' })
    charger()
  }

  async function envoyerLienConnexion(email: string, nom: string) {
    const res = await fetch('/api/lawyers/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    if (res.ok) {
      setConfirmation(`Lien de connexion envoyé à Me ${nom}.`)
      setTimeout(() => setConfirmation(''), 3000)
    }
  }

  const avocatsFiltres = avocats.filter(a =>
    `${a.prenom} ${a.nom} ${a.email}`.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Topbar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <a href="/admin" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </a>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-amber-500" />
          <span className="text-sm font-medium text-gray-900">Gestion des avocats</span>
        </div>
        <span className="text-xs bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full">
          Barreau de Saint-Nazaire
        </span>
        <div className="ml-auto flex items-center gap-3">
          {/* Recherche */}
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text" placeholder="Rechercher…" value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="text-xs bg-transparent focus:outline-none w-32"
            />
          </div>
          <button
            onClick={() => ouvririFormulaire()}
            className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un avocat
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Message de confirmation */}
        {confirmation && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-800 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {confirmation}
          </div>
        )}

        {/* Stats rapides */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { val: avocats.length, label: 'Avocats inscrits' },
            { val: avocats.filter(a => a.actif).length, label: 'Actifs' },
            { val: avocats.filter(a => a.visioOk).length, label: 'Proposent la visio' },
          ].map(s => (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="text-2xl font-medium text-gray-900">{s.val}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Liste des avocats */}
        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-48 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-64" />
              </div>
            ))}
          </div>
        ) : avocatsFiltres.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center">
            <div className="text-3xl mb-2">👤</div>
            <p className="text-gray-500 text-sm">
              {recherche ? 'Aucun avocat trouvé.' : 'Aucun avocat inscrit. Ajoutez le premier !'}
            </p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Avocat</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Email</th>
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Spécialités</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-20">Visio</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-24">Statut</th>
                  <th className="text-center text-xs text-gray-400 font-medium px-4 py-3 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {avocatsFiltres.map((a, i) => (
                  <tr key={a.id} className={`border-b border-gray-50 hover:bg-gray-50/50 ${i % 2 === 1 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 text-xs flex items-center justify-center font-medium flex-shrink-0">
                          {a.prenom[0]}{a.nom[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">Me {a.prenom} {a.nom}</div>
                          {a.telephone && <div className="text-xs text-gray-400">{a.telephone}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate">{a.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {a.specialites.slice(0, 2).map(s => (
                          <span key={s} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full truncate max-w-24">
                            {s}
                          </span>
                        ))}
                        {a.specialites.length > 2 && (
                          <span className="text-xs text-gray-400">+{a.specialites.length - 2}</span>
                        )}
                      </div>
                    </td>
                    <td className="text-center px-4 py-3">
                      {a.visioOk
                        ? <span className="text-teal-500">✓</span>
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="text-center px-4 py-3">
                      <button onClick={() => toggleActif(a.id, a.actif)}
                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                          a.actif ? 'bg-teal-50 text-teal-700 hover:bg-teal-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${a.actif ? 'bg-teal-500' : 'bg-gray-400'}`} />
                        {a.actif ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="text-center px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => ouvririFormulaire(a)}
                          title="Modifier"
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => envoyerLienConnexion(a.email, a.nom)}
                          title="Envoyer lien de connexion"
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => supprimer(a.id, a.nom)}
                          title="Supprimer"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Formulaire modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-screen overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">
                {editId ? 'Modifier l\'avocat' : 'Ajouter un avocat'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              {erreurs.global && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {erreurs.global}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Prénom *</label>
                  <input type="text" value={form.prenom}
                    onChange={e => setForm(f => ({ ...f, prenom: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.prenom ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {erreurs.prenom && <p className="text-xs text-red-500 mt-1">{erreurs.prenom}</p>}
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Nom *</label>
                  <input type="text" value={form.nom}
                    onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.nom ? 'border-red-300' : 'border-gray-200'}`}
                  />
                  {erreurs.nom && <p className="text-xs text-red-500 mt-1">{erreurs.nom}</p>}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Email professionnel *</label>
                <input type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.email ? 'border-red-300' : 'border-gray-200'}`}
                />
                {erreurs.email && <p className="text-xs text-red-500 mt-1">{erreurs.email}</p>}
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Téléphone du cabinet</label>
                <input type="tel" value={form.telephone}
                  onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))}
                  placeholder="02 40 xx xx xx"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-2">Spécialités</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALITES_DISPONIBLES.map(s => (
                    <button key={s}
                      onClick={() => setForm(f => ({
                        ...f,
                        specialites: f.specialites.includes(s)
                          ? f.specialites.filter(x => x !== s)
                          : [...f.specialites, s]
                      }))}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                        form.specialites.includes(s)
                          ? 'bg-teal-50 border-teal-400 text-teal-800'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button onClick={() => setForm(f => ({ ...f, actif: !f.actif }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${form.actif ? 'bg-teal-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.actif ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-xs text-gray-600">Accepter des RDV</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <button onClick={() => setForm(f => ({ ...f, visioOk: !f.visioOk }))}
                    className={`relative w-9 h-5 rounded-full transition-colors ${form.visioOk ? 'bg-purple-500' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.visioOk ? 'translate-x-4' : 'translate-x-0.5'}`} />
                  </button>
                  <span className="text-xs text-gray-600">Visioconférence</span>
                </label>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={sauvegarder} disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-300 transition-colors">
                {saving ? 'Enregistrement…' : editId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
