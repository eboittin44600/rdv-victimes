'use client'

import { useEffect, useState, useRef } from 'react'

type Avocat = {
  id: string; prenom: string; nom: string; email: string
  telephone?: string; actif: boolean; visioOk: boolean
  numeroRue?: string; nomRue?: string; codePostal?: string; commune?: string
  anneeSerment?: number; certificatSpecialisation?: string
  description?: string; photoUrl?: string; createdAt: string
}

const CERTIFICATS = [
  '-- Aucun --',
  'Droit de la famille, des personnes et de leur patrimoine',
  'Droit pénal et sciences criminelles',
  'Droit des étrangers et de la nationalité',
  'Droit social',
  "Droit rural et de l'environnement",
  'Droit public',
  'Droit des obligations',
  'Droit commercial, des affaires et de la concurrence',
  'Droit de la propriété intellectuelle',
  'Droit immobilier et de la construction',
  'Droit du dommage corporel',
  'Droit bancaire et boursier',
  'Droit des transports',
  'Droit de la communication',
  "Droit de l'informatique et des nouvelles technologies",
  'Droit fiscal',
  'Droit de la santé',
  'Droit maritime et du littoral',
  "Droit des relations internationales et de l'Union européenne",
  "Droit de l'arbitrage",
]

const CHAMPS_VIDES = {
  prenom: '', nom: '', email: '', telephone: '',
  numeroRue: '', nomRue: '', codePostal: '', commune: '',
  anneeSerment: '', certificatSpecialisation: '', description: '',
  actif: true, visioOk: false, photoUrl: '',
}

export default function GestionAvocats() {
  const [avocats, setAvocats] = useState<Avocat[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<any>(CHAMPS_VIDES)
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [recherche, setRecherche] = useState('')
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { charger() }, [])

  async function charger() {
    setLoading(true)
    const res = await fetch('/api/admin/avocats')
    if (res.status === 401) { window.location.href = '/admin/auth'; return }
    const data = await res.json()
    setAvocats(data.avocats || [])
    setLoading(false)
  }

  function ouvrirFormulaire(avocat?: Avocat) {
    if (avocat) {
      setEditId(avocat.id)
      setForm({
        prenom: avocat.prenom, nom: avocat.nom, email: avocat.email,
        telephone: avocat.telephone || '',
        numeroRue: avocat.numeroRue || '', nomRue: avocat.nomRue || '',
        codePostal: avocat.codePostal || '', commune: avocat.commune || '',
        anneeSerment: avocat.anneeSerment?.toString() || '',
        certificatSpecialisation: avocat.certificatSpecialisation || '',
        description: avocat.description || '',
        actif: avocat.actif, visioOk: avocat.visioOk,
        photoUrl: avocat.photoUrl || '',
      })
      setPhotoPreview(avocat.photoUrl || null)
    } else {
      setEditId(null)
      setForm(CHAMPS_VIDES)
      setPhotoPreview(null)
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

  function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setErreurs(err => ({ ...err, photo: 'Photo trop lourde (max 2 Mo)' }))
      return
    }
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setPhotoPreview(result)
      setForm((f: any) => ({ ...f, photoUrl: result }))
    }
    reader.readAsDataURL(file)
  }

  async function sauvegarder() {
    if (!valider()) return
    setSaving(true)
    const url = editId ? `/api/admin/avocats/${editId}` : '/api/admin/avocats'
    const method = editId ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        anneeSerment: form.anneeSerment ? parseInt(form.anneeSerment) : null,
        specialites: [],
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setConfirmation(editId ? 'Avocat modifié.' : 'Avocat ajouté.')
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
    await fetch('/api/lawyers/auth/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    })
    setConfirmation(`Lien envoyé à Me ${nom}.`)
    setTimeout(() => setConfirmation(''), 3000)
  }

  const avocatsFiltres = avocats.filter(a =>
    `${a.prenom} ${a.nom} ${a.email} ${a.commune || ''}`.toLowerCase().includes(recherche.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-gray-50">
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
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Rechercher..." value={recherche}
              onChange={e => setRecherche(e.target.value)}
              className="text-xs bg-transparent focus:outline-none w-32" />
          </div>
          <button onClick={() => ouvrirFormulaire()}
            className="flex items-center gap-1.5 bg-teal-600 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-teal-700 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Ajouter un avocat
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {confirmation && (
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 mb-4 text-sm text-teal-800 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {confirmation}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-medium text-gray-900">{avocats.length}</div>
            <div className="text-xs text-gray-400 mt-0.5">Avocats inscrits</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-medium text-gray-900">{avocats.filter(a => a.actif).length}</div>
            <div className="text-xs text-gray-400 mt-0.5">Actifs</div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-2xl font-medium text-gray-900">{avocats.filter(a => a.visioOk).length}</div>
            <div className="text-xs text-gray-400 mt-0.5">Proposent la visio</div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1,2,3].map(i => (
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
                  <th className="text-left text-xs text-gray-400 font-medium px-4 py-3">Commune</th>
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
                        {a.photoUrl ? (
                          <img src={a.photoUrl} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 text-xs flex items-center justify-center font-medium flex-shrink-0">
                            {a.prenom[0]}{a.nom[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 text-sm">Me {a.prenom} {a.nom}</div>
                          {a.anneeSerment && <div className="text-xs text-gray-400">Serment {a.anneeSerment}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 truncate">{a.email}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{a.commune || '—'}</td>
                    <td className="text-center px-4 py-3">
                      {a.visioOk ? <span className="text-teal-500">✓</span> : <span className="text-gray-300">—</span>}
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
                        <button onClick={() => ouvrirFormulaire(a)} title="Modifier"
                          className="p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => envoyerLienConnexion(a.email, a.nom)} title="Envoyer lien"
                          className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                        <button onClick={() => supprimer(a.id, a.nom)} title="Supprimer"
                          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
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

      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-sm font-medium text-gray-900">
                {editId ? "Modifier l'avocat" : 'Ajouter un avocat'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-5">
              {erreurs.global && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
                  {erreurs.global}
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-2">Photo (médaillon)</label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0 bg-gray-50">
                    {photoPreview ? (
                      <img src={photoPreview} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div>
                    <button onClick={() => fileInputRef.current?.click()}
                      className="text-xs border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                      {photoPreview ? 'Changer la photo' : 'Ajouter une photo'}
                    </button>
                    {photoPreview && (
                      <button onClick={() => { setPhotoPreview(null); setForm((f: any) => ({ ...f, photoUrl: '' })) }}
                        className="ml-2 text-xs text-red-500 hover:text-red-700">
                        Supprimer
                      </button>
                    )}
                    <p className="text-xs text-gray-400 mt-1">JPG ou PNG, max 2 Mo</p>
                    {erreurs.photo && <p className="text-xs text-red-500 mt-1">{erreurs.photo}</p>}
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/jpeg,image/png"
                    onChange={handlePhoto} className="hidden" />
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Identité</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Prénom *</label>
                    <input type="text" value={form.prenom}
                      onChange={e => setForm((f: any) => ({ ...f, prenom: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.prenom ? 'border-red-300' : 'border-gray-200'}`} />
                    {erreurs.prenom && <p className="text-xs text-red-500 mt-1">{erreurs.prenom}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Nom *</label>
                    <input type="text" value={form.nom}
                      onChange={e => setForm((f: any) => ({ ...f, nom: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.nom ? 'border-red-300' : 'border-gray-200'}`} />
                    {erreurs.nom && <p className="text-xs text-red-500 mt-1">{erreurs.nom}</p>}
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Contact</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Email *</label>
                    <input type="email" value={form.email}
                      onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))}
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${erreurs.email ? 'border-red-300' : 'border-gray-200'}`} />
                    {erreurs.email && <p className="text-xs text-red-500 mt-1">{erreurs.email}</p>}
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Téléphone</label>
                    <input type="tel" value={form.telephone}
                      onChange={e => setForm((f: any) => ({ ...f, telephone: e.target.value }))}
                      placeholder="02 40 xx xx xx"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Adresse du cabinet</p>
                <div className="grid grid-cols-4 gap-3 mb-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">N°</label>
                    <input type="text" value={form.numeroRue}
                      onChange={e => setForm((f: any) => ({ ...f, numeroRue: e.target.value }))}
                      placeholder="12"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div className="col-span-3">
                    <label className="text-xs text-gray-500 block mb-1">Nom de rue</label>
                    <input type="text" value={form.nomRue}
                      onChange={e => setForm((f: any) => ({ ...f, nomRue: e.target.value }))}
                      placeholder="rue de la Paix"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Code postal</label>
                    <input type="text" value={form.codePostal}
                      onChange={e => setForm((f: any) => ({ ...f, codePostal: e.target.value }))}
                      placeholder="44600"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Commune</label>
                    <input type="text" value={form.commune}
                      onChange={e => setForm((f: any) => ({ ...f, commune: e.target.value }))}
                      placeholder="Saint-Nazaire"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Barreau</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Année de prestation de serment</label>
                    <input type="number" value={form.anneeSerment}
                      onChange={e => setForm((f: any) => ({ ...f, anneeSerment: e.target.value }))}
                      placeholder="2005" min="1950" max="2030"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Certificat de spécialisation CNB</label>
                    <select value={form.certificatSpecialisation}
                      onChange={e => setForm((f: any) => ({ ...f, certificatSpecialisation: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
                      {CERTIFICATS.map(c => (
                        <option key={c} value={c === '-- Aucun --' ? '' : c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-500 block mb-1">Présentation libre</label>
                <textarea value={form.description}
                  onChange={e => setForm((f: any) => ({ ...f, description: e.target.value }))}
                  placeholder="Décrivez votre parcours, vos domaines d'intervention, votre approche..."
                  rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
              </div>

              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Préférences</p>
                <div className="flex gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button onClick={() => setForm((f: any) => ({ ...f, actif: !f.actif }))}
                      className={`relative w-9 h-5 rounded-full transition-colors ${form.actif ? 'bg-teal-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.actif ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-600">Accepter des RDV</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <button onClick={() => setForm((f: any) => ({ ...f, visioOk: !f.visioOk }))}
                      className={`relative w-9 h-5 rounded-full transition-colors ${form.visioOk ? 'bg-purple-500' : 'bg-gray-300'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.visioOk ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <span className="text-xs text-gray-600">Visioconférence</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end sticky bottom-0 bg-white">
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={sauvegarder} disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:bg-teal-300 transition-colors">
                {saving ? 'Enregistrement...' : editId ? 'Modifier' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}